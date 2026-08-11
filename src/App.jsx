import { useState } from 'react'
import Markdown from 'react-markdown'
import { buildSajuPrompt, cleanSajuText } from './buildSajuPrompt'
import { buildChartBundle, makeCacheKey } from './sajuChart'
import { DEFAULT_GENRE_ID, GENRES, getGenre } from './genres'
import SajuChartCard from './SajuChartCard'
import { formatApiError, generateSajuText, hasGeminiKey } from './gemini'
import './App.css'

const genderLabel = { male: '남자', female: '여자' }
const calendarLabel = { solar: '양력', lunar: '음력' }

const emptyPerson = {
  name: '',
  birthDate: '',
  birthTime: '',
  timeUnknown: false,
  gender: '',
  calendarType: '',
}

function validatePerson(person, label) {
  if (!person.name || !person.birthDate || !person.gender || !person.calendarType) {
    return `${label}의 이름, 성별, 양력/음력, 생년월일을 입력해 주세요.`
  }
  if (!person.timeUnknown && !person.birthTime) {
    return `${label}의 태어난 시간을 입력하거나, 시간 모름을 선택해 주세요.`
  }
  return ''
}

function ReadingSkeleton({ title, lines = 6, status = '잠시만 기다려 주세요…' }) {
  return (
    <section className="reading skeleton-reading" aria-busy="true" aria-live="polite">
      <h2 className="reading-title">{title}</h2>
      <p className="skeleton-status">{status}</p>
      <div className="skeleton-lines">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`skeleton-line ${i % 3 === 2 ? 'short' : i % 2 === 0 ? 'long' : 'mid'}`}
          />
        ))}
      </div>
    </section>
  )
}

function PersonForm({ title, person, onChange }) {
  function patch(partial) {
    onChange({ ...person, ...partial })
  }

  function handleTimeChange(value) {
    patch({ birthTime: value, timeUnknown: value ? false : person.timeUnknown })
  }

  function handleTimeUnknown() {
    const next = !person.timeUnknown
    patch({
      timeUnknown: next,
      birthTime: next ? '' : person.birthTime,
    })
  }

  return (
    <div className="person-block">
      {title && <h3 className="person-title">{title}</h3>}
      <div className="form-grid">
        <div className="form-row form-row-identity">
          <label className="field field-name">
            <span>이름</span>
            <input
              type="text"
              value={person.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="이름을 입력하세요"
            />
          </label>

          <label className="field field-gender">
            <span>성별</span>
            <select
              value={person.gender}
              onChange={(e) => patch({ gender: e.target.value })}
            >
              <option value="">선택하세요</option>
              <option value="male">남자</option>
              <option value="female">여자</option>
            </select>
          </label>
        </div>

        <div className="form-row form-row-birth">
          <label className="field">
            <span>양력 / 음력</span>
            <select
              value={person.calendarType}
              onChange={(e) => patch({ calendarType: e.target.value })}
            >
              <option value="">선택하세요</option>
              <option value="solar">양력</option>
              <option value="lunar">음력</option>
            </select>
          </label>

          <label className="field field-date">
            <span>생년월일</span>
            <div className="control">
              <input
                type="date"
                value={person.birthDate}
                onChange={(e) => patch({ birthDate: e.target.value })}
              />
            </div>
          </label>

          <div className="field field-time">
            <span>태어난 시간</span>
            <div className="time-group">
              <div className={`control ${person.timeUnknown ? 'is-disabled' : ''}`}>
                <input
                  type="time"
                  value={person.birthTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={person.timeUnknown}
                  aria-label={`${title || '본인'} 태어난 시간`}
                />
              </div>
              <button
                type="button"
                className={`time-unknown-btn ${person.timeUnknown ? 'is-active' : ''}`}
                onClick={handleTimeUnknown}
                aria-pressed={person.timeUnknown}
              >
                시간 모름
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [genreId, setGenreId] = useState(DEFAULT_GENRE_ID)
  const [self, setSelf] = useState(emptyPerson)
  const [partner, setPartner] = useState(emptyPerson)
  const [chartViews, setChartViews] = useState([])
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const genre = getGenre(genreId)
  const needsPartner = genre.needsPartner

  function handleGenreChange(nextId) {
    if (nextId === genreId) return
    setGenreId(nextId)
    setChartViews([])
    setResult('')
    setError('')
  }

  async function handleAnalyze() {
    const selfError = validatePerson(self, '본인')
    if (selfError) {
      setError(selfError)
      return
    }

    if (needsPartner) {
      const partnerError = validatePerson(partner, '상대')
      if (partnerError) {
        setError(partnerError)
        return
      }
    }

    if (!hasGeminiKey()) {
      setError('API 키가 없습니다. .env의 VITE_GEMINI_API_KEY를 확인하세요.')
      return
    }

    setError('')
    setResult('')
    setChartViews([])
    setLoading(true)

    const selfInput = {
      name: self.name,
      birthDate: self.birthDate,
      birthTime: self.timeUnknown ? '' : self.birthTime,
      gender: self.gender,
      calendarType: self.calendarType,
    }
    const partnerInput = needsPartner
      ? {
          name: partner.name,
          birthDate: partner.birthDate,
          birthTime: partner.timeUnknown ? '' : partner.birthTime,
          gender: partner.gender,
          calendarType: partner.calendarType,
        }
      : null

    try {
      const charts = buildChartBundle({
        self: selfInput,
        partner: partnerInput,
      })
      setChartViews(charts.views)

      const cacheKey = makeCacheKey({
        genreId,
        self: selfInput,
        partner: partnerInput,
      })
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setResult(cleanSajuText(cached))
        return
      }

      const prompt = buildSajuPrompt({
        genreId,
        self: {
          name: self.name,
          birth: self.birthDate,
          time: selfInput.birthTime,
          gender: genderLabel[self.gender] || self.gender,
          calendar: calendarLabel[self.calendarType] || self.calendarType,
          timeUnknown: self.timeUnknown,
          chartText: charts.selfChart,
        },
        partner: partnerInput
          ? {
              name: partner.name,
              birth: partner.birthDate,
              time: partnerInput.birthTime,
              gender: genderLabel[partner.gender] || partner.gender,
              calendar: calendarLabel[partner.calendarType] || partner.calendarType,
              timeUnknown: partner.timeUnknown,
              chartText: charts.partnerChart,
            }
          : null,
        chartText: charts.displayCompact,
      })

      const { text: rawText } = await generateSajuText(prompt)
      const text = cleanSajuText(rawText || '결과를 받지 못했습니다.')
      localStorage.setItem(cacheKey, text)
      setResult(text)
    } catch (err) {
      console.error(err)
      setError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />
      <div className="mist" aria-hidden="true" />

      <nav className="genre-nav" aria-label="사주 장르">
        <div className="genre-nav-inner">
          {GENRES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`genre-tab ${item.id === genreId ? 'is-active' : ''}`}
              onClick={() => handleGenreChange(item.id)}
              aria-pressed={item.id === genreId}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="shell">
        <header className="hero" key={genreId}>
          <p className="brand">사주미</p>
          <h1 className="headline">{genre.label}</h1>
          <p className="sub-lead">{genre.headline}</p>
          <p className="sub">{genre.description}</p>
          <div className="genre-tags" aria-label="장르 태그">
            {genre.tags.map((tag) => (
              <span key={tag} className="genre-tag">
                {tag}
              </span>
            ))}
          </div>
        </header>

        <section className="panel" aria-label={`${genre.label} 입력`}>
          <PersonForm
            title={needsPartner ? '본인' : ''}
            person={self}
            onChange={setSelf}
          />

          {needsPartner && (
            <PersonForm
              title="상대"
              person={partner}
              onChange={setPartner}
            />
          )}

          <button
            type="button"
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? '명식을 읽는 중…' : genre.buttonLabel}
          </button>

          {error && <p className="error">{error}</p>}
        </section>

        {loading && chartViews.length === 0 && (
          <ReadingSkeleton
            title="사주 명식"
            lines={5}
            status="만세력으로 명식을 계산하는 중…"
          />
        )}

        {chartViews.length > 0 && (
          <section className="reading chart-reading">
            <h2 className="reading-title">사주 명식</h2>
            <div className="chart-cards">
              {chartViews.map((item) => (
                <SajuChartCard
                  key={item.label || 'self'}
                  label={item.label}
                  view={item.view}
                />
              ))}
            </div>
          </section>
        )}

        {loading && !result && (
          <ReadingSkeleton
            title={`${genre.label} 해석`}
            lines={8}
            status={`${genre.label} 해석을 작성하는 중…`}
          />
        )}

        {result && (
          <section className="reading result-reading">
            <h2 className="reading-title">{genre.label} 해석</h2>
            <div className="markdown result-md">
              <Markdown>{result}</Markdown>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
