import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { buildSajuPrompt, cleanSajuText } from './buildSajuPrompt'
import { buildChartBundle, makeCacheKey } from './sajuChart'
import { DEFAULT_GENRE_ID, GENRES, getGenre } from './genres'
import SajuChartCard from './SajuChartCard'
import HistorySidebar from './HistorySidebar'
import { formatApiError, generateSajuText, hasGeminiKey } from './gemini'
import { fetchSajuReadings, rowToPeople, saveSajuReading, updateSajuReading, deleteSajuReading } from './sajuReadings'
import { useAuth } from './useAuth'
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

function PersonForm({ title, person, onChange, nameRef }) {
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
              ref={nameRef}
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

function toChartInput(person) {
  return {
    name: person.name,
    birthDate: person.birthDate,
    birthTime: person.timeUnknown ? '' : person.birthTime,
    gender: person.gender,
    calendarType: person.calendarType,
  }
}

function personByline(person) {
  if (!person?.name) return ''
  const gender = genderLabel[person.gender] || ''
  const calendar = calendarLabel[person.calendarType] || ''
  const birth = person.birthDate || ''
  const time = person.timeUnknown ? '시간 모름' : person.birthTime
  return [person.name, gender, [calendar, birth].filter(Boolean).join(' '), time]
    .filter(Boolean)
    .join(' · ')
}

function App() {
  const [genreId, setGenreId] = useState(DEFAULT_GENRE_ID)
  const [self, setSelf] = useState(emptyPerson)
  const [partner, setPartner] = useState(emptyPerson)
  const [chartViews, setChartViews] = useState([])
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [readings, setReadings] = useState([])
  const [activeReadingId, setActiveReadingId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [formKey, setFormKey] = useState(0)
  const nameInputRef = useRef(null)
  const { user, ready, authError } = useAuth()

  const genre = getGenre(genreId)
  const needsPartner = genre.needsPartner
  const isViewing = Boolean(activeReadingId && result && !loading)

  useEffect(() => {
    if (authError) setError(authError)
  }, [authError])

  useEffect(() => {
    let cancelled = false

    if (!user) {
      setReadings([])
      return
    }

    fetchSajuReadings(user.id)
      .then((rows) => {
        if (!cancelled) setReadings(rows)
      })
      .catch((err) => {
        console.error(err)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  function handleGenreChange(nextId) {
    if (nextId === genreId) return
    setGenreId(nextId)
    setChartViews([])
    setResult('')
    setError('')
    setActiveReadingId('')
  }

  function handleSelectReading(row) {
    if (row.id === activeReadingId) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const { self: nextSelf, partner: nextPartner } = rowToPeople(row)
    const selfInput = toChartInput(nextSelf)
    const partnerInput = nextPartner ? toChartInput(nextPartner) : null
    const charts = buildChartBundle({
      self: selfInput,
      partner: partnerInput,
    })

    setGenreId(row.genre_id)
    setSelf(nextSelf)
    setPartner(nextPartner || emptyPerson)
    setChartViews(charts.views)
    setResult(cleanSajuText(row.result_text || ''))
    setError('')
    setActiveReadingId(row.id)
    setEditingId('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNewReading() {
    setSelf({ ...emptyPerson })
    setPartner({ ...emptyPerson })
    setChartViews([])
    setResult('')
    setError('')
    setActiveReadingId('')
    setEditingId('')
    setFormKey((key) => key + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.setTimeout(() => nameInputRef.current?.focus(), 120)
  }

  function handleEditReading() {
    const targetId = activeReadingId || editingId
    if (!targetId) return
    setEditingId(targetId)
    setActiveReadingId('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.setTimeout(() => nameInputRef.current?.focus(), 120)
  }

  async function handleDeleteReading(row) {
    const id = row?.id
    if (!id) return
    const label = row.name || '이 사주'
    if (!window.confirm(`‘${label}’ 사주를 삭제할까요?`)) return

    try {
      await deleteSajuReading(id)
      setReadings((prev) => prev.filter((item) => item.id !== id))
      if (activeReadingId === id || editingId === id) {
        handleNewReading()
      }
    } catch (err) {
      console.error(err)
      setError('사주를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  async function persistReading({ genreId: nextGenreId, selfInput, partnerInput, text }) {
    if (!user) return

    try {
      const payload = {
        genreId: nextGenreId,
        userId: user.id,
        self: {
          ...selfInput,
          timeUnknown: self.timeUnknown,
        },
        partner: partnerInput
          ? {
              ...partnerInput,
              timeUnknown: partner.timeUnknown,
            }
          : null,
        resultText: text,
      }
      const saved = editingId
        ? await updateSajuReading({ id: editingId, ...payload })
        : await saveSajuReading(payload)
      if (saved) {
        setReadings((prev) => [
          saved,
          ...prev.filter((row) => row.id !== saved.id),
        ])
        setEditingId('')
        setActiveReadingId(saved.id)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err) {
      console.error(err)
      setError(
        editingId
          ? '사주를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.'
          : '사주를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
    }
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
    setActiveReadingId('')
    setLoading(true)

    const selfInput = toChartInput(self)
    const partnerInput = needsPartner ? toChartInput(partner) : null

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
        const text = cleanSajuText(cached)
        setResult(text)
        await persistReading({ genreId, selfInput, partnerInput, text })
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
      await persistReading({ genreId, selfInput, partnerInput, text })
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

      <HistorySidebar
        user={user}
        ready={ready}
        readings={readings}
        activeId={activeReadingId || editingId}
        onSelect={handleSelectReading}
        onNew={handleNewReading}
        onDelete={handleDeleteReading}
        onAuthError={setError}
      />

      <main className="shell">
        {isViewing ? (
          <div className="view-stack">
            <header className="hero hero-view">
              <p className="brand">사주미</p>
              <h1 className="headline">
                {self.name}
                {needsPartner && partner.name ? ` · ${partner.name}` : ''}
              </h1>
              <p className="sub-lead">{genre.label}</p>
              <p className="sub">{personByline(self)}</p>
              {needsPartner && partner.name ? (
                <p className="sub">{personByline(partner)}</p>
              ) : null}
              <div className="view-actions">
                <button
                  type="button"
                  className="new-reading-btn"
                  onClick={handleNewReading}
                >
                  새 사주 만들기
                </button>
                <button
                  type="button"
                  className="edit-reading-btn"
                  onClick={handleEditReading}
                >
                  다시 입력하기
                </button>
                <button
                  type="button"
                  className="delete-reading-btn"
                  onClick={() =>
                    handleDeleteReading({
                      id: activeReadingId,
                      name: self.name,
                    })
                  }
                >
                  삭제
                </button>
              </div>
            </header>

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

            <section className="reading result-reading">
              <h2 className="reading-title">{genre.label} 해석</h2>
              <p className="result-byline">
                {personByline(self)}
                {needsPartner && partner.name ? `  |  ${personByline(partner)}` : ''}
              </p>
              <div className="markdown result-md">
                <Markdown>{result}</Markdown>
              </div>
              <div className="view-actions">
                <button
                  type="button"
                  className="new-reading-btn"
                  onClick={handleNewReading}
                >
                  새 사주 만들기
                </button>
                <button
                  type="button"
                  className="edit-reading-btn"
                  onClick={handleEditReading}
                >
                  다시 입력하기
                </button>
                <button
                  type="button"
                  className="delete-reading-btn"
                  onClick={() =>
                    handleDeleteReading({
                      id: activeReadingId,
                      name: self.name,
                    })
                  }
                >
                  삭제
                </button>
              </div>
            </section>
          </div>
        ) : (
          <>
            <header className="hero">
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

            <section className="panel" key={formKey} aria-label={`${genre.label} 입력`}>
              {editingId && (
                <p className="edit-banner">저장된 사주를 수정합니다. 다시 보면 이 기록이 바뀝니다.</p>
              )}
              <PersonForm
                title={needsPartner ? '본인' : ''}
                person={self}
                onChange={setSelf}
                nameRef={nameInputRef}
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
                {loading
                  ? '명식을 읽는 중…'
                  : editingId
                    ? `${genre.label} 다시 저장`
                    : genre.buttonLabel}
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
                <p className="result-byline">
                  {personByline(self)}
                  {needsPartner && partner.name ? `  |  ${personByline(partner)}` : ''}
                </p>
                <div className="markdown result-md">
                  <Markdown>{result}</Markdown>
                </div>
                <div className="view-actions">
                  <button
                    type="button"
                    className="new-reading-btn"
                    onClick={handleNewReading}
                  >
                    새 사주 만들기
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="delete-reading-btn"
                      onClick={() =>
                        handleDeleteReading({
                          id: editingId,
                          name: self.name,
                        })
                      }
                    >
                      삭제
                    </button>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
