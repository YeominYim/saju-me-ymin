import { useState } from 'react'
import Markdown from 'react-markdown'
import { GoogleGenAI } from '@google/genai'
import { buildSajuPrompt } from './buildSajuPrompt'
import { calculateChart, makeCacheKey } from './sajuChart'
import './App.css'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-3.6-flash'
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

const genderLabel = { male: '남자', female: '여자' }
const calendarLabel = { solar: '양력', lunar: '음력' }

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

function App() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('')
  const [chartText, setChartText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAnalyze() {
    if (!name || !birthDate || !birthTime || !gender || !calendarType) {
      setError('모든 항목을 입력해 주세요.')
      return
    }

    if (!GEMINI_API_KEY) {
      setError('API 키가 없습니다. .env의 VITE_GEMINI_API_KEY를 확인하세요.')
      return
    }

    setError('')
    setResult('')
    setChartText('')
    setLoading(true)

    try {
      const chart = calculateChart({
        birthDate,
        birthTime,
        gender,
        calendarType,
      })
      setChartText(chart)

      const cacheKey = makeCacheKey({
        name,
        birthDate,
        birthTime,
        gender,
        calendarType,
      })
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setResult(cached)
        return
      }

      const prompt = buildSajuPrompt({
        name,
        birth: birthDate,
        time: birthTime,
        gender: genderLabel[gender] || gender,
        calendar: calendarLabel[calendarType] || calendarType,
        chartText: chart,
      })

      const interaction = await ai.interactions.create({
        model: GEMINI_MODEL,
        input: prompt,
        store: false,
      })

      const text = interaction.output_text || '결과를 받지 못했습니다.'
      localStorage.setItem(cacheKey, text)
      setResult(text)
    } catch (err) {
      console.error(err)
      setError('사주 해석 요청에 실패했습니다. API 키와 네트워크를 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />
      <div className="mist" aria-hidden="true" />

      <main className="shell">
        <header className="hero">
          <p className="brand">사주미</p>
          <h1 className="headline">당신의 사주를 읽습니다</h1>
          <p className="sub">
            만세력으로 명식을 확정한 뒤, 차분하고 직설적으로 해석합니다.
          </p>
        </header>

        <section className="panel" aria-label="사주 입력">
          <div className="form-grid">
            <div className="form-row form-row-identity">
              <label className="field field-name">
                <span>이름</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력하세요"
                />
              </label>

              <label className="field field-gender">
                <span>성별</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
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
                  value={calendarType}
                  onChange={(e) => setCalendarType(e.target.value)}
                >
                  <option value="">선택하세요</option>
                  <option value="solar">양력</option>
                  <option value="lunar">음력</option>
                </select>
              </label>

              <label className="field field-date">
                <span>생년월일</span>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </label>

              <label className="field">
                <span>태어난 시간</span>
                <input
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? '명식을 읽는 중…' : '사주 해석 받기'}
          </button>

          {error && <p className="error">{error}</p>}
        </section>

        {loading && !chartText && (
          <ReadingSkeleton
            title="확정 명식"
            lines={5}
            status="만세력으로 명식을 계산하는 중…"
          />
        )}

        {chartText && (
          <section className="reading chart-reading">
            <h2 className="reading-title">확정 명식</h2>
            <div className="markdown chart-md">
              <Markdown>{chartText}</Markdown>
            </div>
          </section>
        )}

        {loading && !result && (
          <ReadingSkeleton
            title="해석"
            lines={8}
            status="사주를 읽고 해석을 작성하는 중…"
          />
        )}

        {result && (
          <section className="reading result-reading">
            <h2 className="reading-title">해석</h2>
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
