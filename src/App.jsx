import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import { buildSajuPrompt, cleanSajuText } from './buildSajuPrompt'
import { buildChartBundle, makeCacheKey } from './sajuChart'
import { DEFAULT_GENRE_ID, GENRES, getGenre } from './genres'
import SajuChartCard from './SajuChartCard'
import SajuGirl from './SajuGirl'
import sajuGirlLoading from './assets/saju-girl-loading.png'
import HistorySidebar from './HistorySidebar'
import PersonForm from './PersonForm'
import ProfileModal from './ProfileModal'
import ProfilePickerModal from './ProfilePickerModal'
import ShareModal from './ShareModal'
import { GoogleSignInButton } from './AuthPanel'
import { formatApiError, generateSajuText, hasGeminiKey } from './gemini'
import {
  buildShareSnapshot,
  deleteSajuShare,
  upsertSajuShare,
} from './share'
import { fetchSajuReadingCount, fetchSajuReadings, rowToPartner, saveSajuReading, updateSajuReading, deleteSajuReading } from './sajuReadings'
import { fetchProfiles, saveProfile } from './userProfile'
import { clearGuestResult, clearPendingGenre, loadGuestResult, peekPendingGenre, saveGuestResult, savePendingGenre, splitPreviewText } from './guestResult'
import { useAuth } from './useAuth'
import {
  calendarLabel,
  emptyPerson,
  genderLabel,
  isPersonComplete,
  personByline,
  rowToPerson,
  toChartInput,
  validatePerson,
} from './person'
import './App.css'

function Toast({ notice }) {
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!notice?.message) return
    setMessage(notice.message)
    const timer = window.setTimeout(() => setMessage(''), 2400)
    return () => window.clearTimeout(timer)
  }, [notice])

  if (!message) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  )
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

function InterpretingScene({ title }) {
  return (
    <section className="reading interpreting" aria-busy="true" aria-live="polite">
      <h2 className="reading-title">{title}</h2>
      <figure className="interpreting-girl">
        <img src={sajuGirlLoading} alt="사주미 소녀가 명식을 읽는 중" />
        <figcaption>조금만 기다려 주세요! 지금 명식을 읽고 있어요.</figcaption>
      </figure>
    </section>
  )
}

function ResultReading({
  genre,
  self,
  partner,
  needsPartner,
  result,
  locked,
  onAuthError,
  children,
}) {
  const text = locked ? splitPreviewText(result) : result

  return (
    <section className="reading result-reading">
      <div className="result-head">
        <SajuGirl size="sm" />
        <p className="result-voice">
          {locked
            ? '앞부분은 먼저 말해 줄게요! 나머지는 로그인하면 이어서 들려줄게요.'
            : '자, 다 읽었어요! 감정은 빼고, 확실한 것만 말해 줄게요.'}
        </p>
      </div>
      <h2 className="reading-title">{genre.label} 해석</h2>
      <p className="result-byline">
        {personByline(self)}
        {needsPartner && partner.name ? `  |  ${personByline(partner)}` : ''}
      </p>
      <div className={`markdown result-md ${locked ? 'is-preview' : ''}`}>
        <Markdown>{text}</Markdown>
      </div>
      {locked && (
        <div className="result-gate">
          <p className="result-gate-kicker">이어서 읽기</p>
          <p className="result-gate-title">나머지 해석은 로그인하면 열려요!</p>
          <p className="result-gate-lead">
            지금 본 흐름 다음에, 더 분명한 결이 남아 있어요.
          </p>
          <GoogleSignInButton
            label="Google로 로그인하고 이어서 보기"
            onError={onAuthError}
          />
        </div>
      )}
      {children}
    </section>
  )
}

function GenreLockIcon() {
  return (
    <svg className="genre-lock" viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17 8h-1V6a4 4 0 10-8 0v2H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2zM10 6a2 2 0 114 0v2h-4V6zm7 12H7v-8h10v8z"
      />
    </svg>
  )
}

function GenreNav({ genreId, user, onChange }) {
  const scrollerRef = useRef(null)
  const [overflow, setOverflow] = useState({ left: false, right: false })

  function updateOverflow() {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setOverflow({
      left: el.scrollLeft > 6,
      right: max - el.scrollLeft > 6,
    })
  }

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    updateOverflow()
    el.addEventListener('scroll', updateOverflow, { passive: true })
    const observer = new ResizeObserver(updateOverflow)
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', updateOverflow)
      observer.disconnect()
    }
  }, [user])

  useEffect(() => {
    const el = scrollerRef.current
    const active = el?.querySelector('.genre-tab.is-active')
    if (!active) return
    active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    window.setTimeout(updateOverflow, 280)
  }, [genreId])

  return (
    <nav
      className={`genre-nav ${overflow.left ? 'has-left' : ''} ${overflow.right ? 'has-right' : ''}`}
      aria-label="사주 장르"
    >
      <div className="genre-nav-inner" ref={scrollerRef}>
        {GENRES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`genre-tab ${item.id === genreId ? 'is-active' : ''} ${item.requiresAuth && !user ? 'is-locked' : ''}`}
            onClick={() => onChange(item.id)}
            aria-pressed={item.id === genreId}
          >
            {item.label}
            {item.requiresAuth && !user ? <GenreLockIcon /> : null}
          </button>
        ))}
      </div>
    </nav>
  )
}

function GenreAuthGate({ genre, onAuthError, onSeeLife }) {
  const redirectTo = `${window.location.origin}/?genre=${genre.id}`

  return (
    <div className="genre-auth-gate">
      <p className="result-gate-kicker">로그인하고 더 깊게</p>
      <p className="result-gate-title">{genre.label}은 로그인이 필요해요</p>
      <p className="result-gate-lead">
        평생운세는 바로 볼 수 있어요. {genre.label}은 Google로 로그인하면 자세히 풀어 드려요.
      </p>
      <GoogleSignInButton
        label={`Google로 로그인하고 ${genre.label} 보기`}
        redirectTo={redirectTo}
        onBeforeSignIn={() => savePendingGenre(genre.id)}
        onError={onAuthError}
      />
      {onSeeLife && (
        <button type="button" className="profile-edit-link" onClick={onSeeLife}>
          먼저 평생운세 보기
        </button>
      )}
    </div>
  )
}

function GuestUpgrade({ onAuthError }) {
  return (
    <div className="guest-upgrade">
      <p className="guest-upgrade-lead">
        재물운, 연애운, 궁합은 로그인하면 더 깊게 볼 수 있어요.
      </p>
      <GoogleSignInButton
        label="Google로 로그인하고 더 보기"
        onError={onAuthError}
      />
    </div>
  )
}

function ProfileSummary({ person, title, onEdit, onChangeProfile }) {
  return (
    <div className="profile-summary">
      <div className="profile-summary-top">
        {title ? <h3 className="person-title">{title}</h3> : <span />}
        <div className="profile-summary-actions">
          {onChangeProfile && (
            <button type="button" className="profile-edit-link" onClick={onChangeProfile}>
              프로필 바꾸기
            </button>
          )}
          <button type="button" className="profile-edit-link" onClick={onEdit}>
            수정
          </button>
        </div>
      </div>
      <p className="profile-summary-name">{person.name}</p>
      <p className="profile-summary-byline">{personByline(person)}</p>
    </div>
  )
}

function genreIdFromSearch() {
  const id = new URLSearchParams(window.location.search).get('genre') || peekPendingGenre()
  return GENRES.some((item) => item.id === id) ? id : DEFAULT_GENRE_ID
}

function App() {
  const [genreId, setGenreId] = useState(genreIdFromSearch)
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
  const [profileReady, setProfileReady] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileMode, setProfileMode] = useState('edit')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [profiles, setProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [toast, setToast] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareId, setShareId] = useState('')
  const [sharing, setSharing] = useState(false)
  const [readingCount, setReadingCount] = useState(null)
  const nameInputRef = useRef(null)
  const formPanelRef = useRef(null)
  const guestShareRef = useRef({ key: '', id: '' })
  const { user, ready, authError } = useAuth()

  const genre = getGenre(genreId)
  const needsPartner = genre.needsPartner
  const requiresAuth = Boolean(genre.requiresAuth)
  const resultLocked = Boolean(!user && requiresAuth)
  const isViewing = Boolean(activeReadingId && result && !loading)
  const profileComplete = isPersonComplete(self)
  const usesSavedProfile = Boolean(user && selectedProfileId && profileComplete)

  useEffect(() => {
    if (authError) setError(authError)
  }, [authError])

  useEffect(() => {
    let cancelled = false

    fetchSajuReadingCount()
      .then((count) => {
        if (!cancelled && count != null) setReadingCount(count)
      })
      .catch((err) => {
        console.error(err)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!user) {
      setReadings([])
      setProfiles([])
      setSelectedProfileId('')
      setProfileReady(true)
      setProfileOpen(false)
      setPickerOpen(false)
      return
    }

    setProfileReady(false)
    const guest = loadGuestResult()

    Promise.all([fetchProfiles(user.id), fetchSajuReadings(user.id)])
      .then(async ([rows, readingsRows]) => {
        if (cancelled) return
        setReadings(readingsRows)

        if (guest?.result && guest.self) {
          const guestGenreId = guest.genreId || DEFAULT_GENRE_ID
          const wantedGenreId = genreIdFromSearch()
          const jumpToWanted = wantedGenreId !== guestGenreId
          const partnerPerson = guest.partner || emptyPerson
          const selfInput = toChartInput(guest.self)
          const partnerInput = isPersonComplete(partnerPerson)
            ? toChartInput(partnerPerson)
            : null

          setSelf(guest.self)
          setPartner(partnerPerson)

          if (jumpToWanted) {
            setGenreId(wantedGenreId)
            setResult('')
            setChartViews([])
            setActiveReadingId('')
          } else {
            setGenreId(guestGenreId)
            setResult(guest.result)
            setChartViews(
              buildChartBundle({ self: selfInput, partner: partnerInput }).views,
            )
          }

          let profileRow = rows[0] || null
          if (!profileRow && isPersonComplete(guest.self)) {
            profileRow = await saveProfile(user.id, guest.self, '')
            if (cancelled) return
            setProfiles([profileRow])
          } else {
            setProfiles(rows)
          }

          if (profileRow) {
            setSelectedProfileId(profileRow.id)
            try {
              const saved = await saveSajuReading({
                genreId: guestGenreId,
                userId: user.id,
                profileId: profileRow.id,
                partner: partnerInput
                  ? {
                      ...partnerInput,
                      timeUnknown: partnerPerson.timeUnknown,
                    }
                  : null,
                resultText: guest.result,
              })
              if (saved && !cancelled) {
                setReadings((prev) => [
                  saved,
                  ...prev.filter((row) => row.id !== saved.id),
                ])
                if (!jumpToWanted) setActiveReadingId(saved.id)
                setReadingCount((prev) => (typeof prev === 'number' ? prev + 1 : prev))
              }
            } catch (err) {
              console.error(err)
            }
          }

          clearGuestResult()
          clearPendingGenre()
          setProfileOpen(false)
          return
        }

        setProfiles(rows)
        const first = rows[0] || null
        const person = rowToPerson(first)
        const suggestedName =
          person.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          ''
        const nextSelf = { ...person, name: suggestedName }
        setSelf(nextSelf)
        setSelectedProfileId(first?.id || '')
        if (!rows.length) {
          setProfileMode('required')
          setProfileOpen(true)
        }
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) {
          setError('프로필을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
          if (!loadGuestResult()) {
            setProfileMode('required')
            setProfileOpen(true)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setProfileReady(true)
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

    const nextPartner = rowToPartner(row)
    const nextSelf = row.profiles ? rowToPerson(row.profiles) : self
    const selfInput = toChartInput(nextSelf)
    const partnerInput = nextPartner ? toChartInput(nextPartner) : null
    const charts = buildChartBundle({
      self: selfInput,
      partner: partnerInput,
    })

    setGenreId(row.genre_id)
    setSelf(nextSelf)
    if (row.profile_id) setSelectedProfileId(row.profile_id)
    setPartner(nextPartner || emptyPerson)
    setChartViews(charts.views)
    setResult(cleanSajuText(row.result_text || ''))
    setError('')
    setActiveReadingId(row.id)
    setEditingId('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function showToast(message) {
    setToast({ id: Date.now(), message })
  }

  async function handleShare() {
    if (!result || sharing) return

    const snapshot = buildShareSnapshot({
      genreId,
      self,
      partner: needsPartner ? partner : null,
      result,
      chartViews,
    })
    const guestKey = `${genreId}|${self.name}|${partner.name}|${result}`

    if (!user && guestShareRef.current.key === guestKey && guestShareRef.current.id) {
      setShareId(guestShareRef.current.id)
      setShareOpen(true)
      return
    }

    setSharing(true)
    try {
      const id = await upsertSajuShare({
        userId: user?.id || '',
        readingId: activeReadingId || editingId || '',
        snapshot,
      })
      if (!user) guestShareRef.current = { key: guestKey, id }
      setShareId(id)
      setShareOpen(true)
    } catch (err) {
      console.error(err)
      showToast('공유 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSharing(false)
    }
  }

  async function handleRevokeShare() {
    if (!shareId) return
    await deleteSajuShare(shareId)
    guestShareRef.current = { key: '', id: '' }
    setShareId('')
    setShareOpen(false)
    showToast('공유를 취소했어요.')
  }

  function focusNewReadingForm() {
    window.setTimeout(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      nameInputRef.current?.focus()
    }, 80)
  }

  function resetToNewForm() {
    setPartner({ ...emptyPerson })
    setChartViews([])
    setResult('')
    setError('')
    setActiveReadingId('')
    setEditingId('')
    setFormKey((key) => key + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    focusNewReadingForm()
  }

  function applyProfile(row) {
    setSelectedProfileId(row.id)
    setSelf(rowToPerson(row))
    resetToNewForm()
  }

  function handleNewReading() {
    if (loading) {
      showToast('지금은 명식을 읽고 있어요!')
      return
    }

    if (user) {
      if (profiles.length) {
        setPickerOpen(true)
        return
      }
      setProfileMode('required')
      setProfileOpen(true)
      return
    }

    resetToNewForm()
  }

  function openCreateProfile() {
    setPickerOpen(false)
    setProfileMode(profiles.length ? 'create' : 'required')
    setProfileOpen(true)
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
    const label = row.partner_name
      ? `${self.name || '나'} · ${row.partner_name}`
      : self.name || '이 사주'
    if (!window.confirm(`‘${label}’ 사주를 삭제할까요?`)) return

    try {
      await deleteSajuReading(id)
      setReadings((prev) => prev.filter((item) => item.id !== id))
      if (activeReadingId === id || editingId === id) {
        resetToNewForm()
      }
    } catch (err) {
      console.error(err)
      setError('사주를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  async function handleSaveProfile(person) {
    if (!user) return
    const creating = profileMode === 'create' || profileMode === 'required'
    const saved = await saveProfile(
      user.id,
      person,
      creating ? '' : selectedProfileId,
    )
    const nextSelf = rowToPerson(saved)
    setSelf(nextSelf)
    setSelectedProfileId(saved.id)
    setProfiles((prev) => {
      const others = prev.filter((row) => row.id !== saved.id)
      return creating ? [...others, saved] : prev.map((row) => (row.id === saved.id ? saved : row))
    })
    setProfileOpen(false)
    setError('')
    if (creating) resetToNewForm()
  }

  async function persistReading({ genreId: nextGenreId, partnerInput, text }) {
    if (!user || !profileComplete || !selectedProfileId) return

    try {
      const payload = {
        genreId: nextGenreId,
        userId: user.id,
        profileId: selectedProfileId,
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
        if (!editingId) {
          setReadingCount((prev) => (typeof prev === 'number' ? prev + 1 : prev))
        }
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
    if (!user && requiresAuth) {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (user && !profileComplete) {
      setProfileMode(profiles.length ? 'edit' : 'required')
      setProfileOpen(true)
      return
    }

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
        if (!user) {
          saveGuestResult({
            genreId,
            self,
            partner: needsPartner ? partner : emptyPerson,
            result: text,
          })
        }
        await persistReading({ genreId, partnerInput, text })
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
      if (!user) {
        saveGuestResult({
          genreId,
          self,
          partner: needsPartner ? partner : emptyPerson,
          result: text,
        })
      }
      await persistReading({ genreId, partnerInput, text })
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

      <GenreNav genreId={genreId} user={user} onChange={handleGenreChange} />

      <HistorySidebar
        user={user}
        ready={ready}
        profileName={self.name}
        readings={readings}
        activeId={activeReadingId || editingId}
        onSelect={handleSelectReading}
        onNew={handleNewReading}
        onDelete={handleDeleteReading}
        onAuthError={setError}
        onEditProfile={() => {
          setPickerOpen(true)
        }}
      />

      <main className="shell">
        {isViewing ? (
          <div className="view-stack">
            <header className="hero hero-view">
              <div className="hero-copy">
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
              </div>
              <div className="view-actions">
                <button
                  type="button"
                  className="share-reading-btn"
                  onClick={handleShare}
                  disabled={sharing}
                >
                  {sharing ? '링크 만드는 중…' : '친구에게 공유'}
                </button>
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
                  {needsPartner ? '상대 다시 입력' : '다시 보기'}
                </button>
                <button
                  type="button"
                  className="delete-reading-btn"
                  onClick={() =>
                    handleDeleteReading({
                      id: activeReadingId,
                      partner_name: partner.name,
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

            <ResultReading
              genre={genre}
              self={self}
              partner={partner}
              needsPartner={needsPartner}
              result={result}
              locked={resultLocked}
              onAuthError={setError}
            >
              <div className="view-actions">
                <button
                  type="button"
                  className="share-reading-btn"
                  onClick={handleShare}
                  disabled={sharing}
                >
                  {sharing ? '링크 만드는 중…' : '친구에게 공유'}
                </button>
                <button
                  type="button"
                  className="new-reading-btn"
                  onClick={handleNewReading}
                >
                  새 사주 만들기
                </button>
                {user && (
                  <>
                    <button
                      type="button"
                      className="edit-reading-btn"
                      onClick={handleEditReading}
                    >
                      {needsPartner ? '상대 다시 입력' : '다시 보기'}
                    </button>
                    <button
                      type="button"
                      className="delete-reading-btn"
                      onClick={() =>
                        handleDeleteReading({
                          id: activeReadingId,
                          partner_name: partner.name,
                        })
                      }
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </ResultReading>
          </div>
        ) : (
          <>
            <header className="hero">
              <div className="hero-inner">
                <SajuGirl size="lg" />
                <div className="hero-copy">
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
                </div>
              </div>
            </header>

            <section
              ref={formPanelRef}
              className="panel"
              key={formKey}
              aria-label={`${genre.label} 입력`}
            >
              {editingId && (
                <p className="edit-banner">
                  {needsPartner
                    ? '저장된 사주를 수정합니다. 상대 정보를 바꾸면 이 기록이 바뀝니다.'
                    : '저장된 사주를 다시 봅니다. 다시 저장하면 이 기록이 바뀝니다.'}
                </p>
              )}

              {usesSavedProfile ? (
                <ProfileSummary
                  title={needsPartner ? '본인' : ''}
                  person={self}
                  onChangeProfile={() => setPickerOpen(true)}
                  onEdit={() => {
                    setProfileMode('edit')
                    setProfileOpen(true)
                  }}
                />
              ) : (
                <PersonForm
                  title={needsPartner ? '본인' : ''}
                  person={self}
                  onChange={setSelf}
                  nameRef={nameInputRef}
                />
              )}

              {needsPartner && (
                <PersonForm
                  title="상대"
                  person={partner}
                  onChange={setPartner}
                />
              )}

              {!user && requiresAuth ? (
                <GenreAuthGate
                  genre={genre}
                  onAuthError={setError}
                  onSeeLife={() => handleGenreChange(DEFAULT_GENRE_ID)}
                />
              ) : (
                <button
                  type="button"
                  className="analyze-btn"
                  onClick={handleAnalyze}
                  disabled={loading || (Boolean(user) && !profileComplete)}
                >
                  {loading
                    ? '명식을 들여다보는 중이에요!'
                    : editingId
                      ? `${genre.label} 다시 저장`
                      : genre.buttonLabel}
                </button>
              )}

              {user && !profileComplete && profileReady && (
                <p className="auth-hint">프로필을 저장하면 사주를 볼 수 있습니다.</p>
              )}

              {error && <p className="error">{error}</p>}
            </section>

            {typeof readingCount === 'number' && readingCount > 0 && !result && !loading && (
              <p className="reading-count">
                총 <strong>{readingCount.toLocaleString('ko-KR')}</strong>개의 사주가 생성되었습니다
              </p>
            )}

            {loading && chartViews.length === 0 && (
              <ReadingSkeleton
                title="사주 명식"
                lines={5}
                status="명식을 그리는 중이에요!"
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
              <InterpretingScene title={`${genre.label} 해석`} />
            )}

            {result && (
              <ResultReading
                genre={genre}
                self={self}
                partner={partner}
                needsPartner={needsPartner}
                result={result}
                locked={resultLocked}
                onAuthError={setError}
              >
                <div className="view-actions">
                  <button
                    type="button"
                    className="share-reading-btn"
                    onClick={handleShare}
                    disabled={sharing}
                  >
                    {sharing ? '링크 만드는 중…' : '친구에게 공유'}
                  </button>
                  <button
                    type="button"
                    className="new-reading-btn"
                    onClick={handleNewReading}
                  >
                    새 사주 만들기
                  </button>
                  {editingId && user && (
                    <button
                      type="button"
                      className="delete-reading-btn"
                      onClick={() =>
                        handleDeleteReading({
                          id: editingId,
                          partner_name: partner.name,
                        })
                      }
                    >
                      삭제
                    </button>
                  )}
                </div>
                {!user && !requiresAuth && <GuestUpgrade onAuthError={setError} />}
              </ResultReading>
            )}
          </>
        )}
      </main>

      <ProfilePickerModal
        open={pickerOpen && Boolean(user)}
        profiles={profiles}
        activeId={selectedProfileId}
        onSelect={(row) => {
          setPickerOpen(false)
          applyProfile(row)
        }}
        onCreate={openCreateProfile}
        onClose={() => setPickerOpen(false)}
      />

      <ProfileModal
        open={profileOpen && Boolean(user)}
        mode={profileMode}
        initialPerson={profileMode === 'create' ? emptyPerson : self}
        onSave={handleSaveProfile}
        onClose={() => {
          if (profileMode !== 'required') setProfileOpen(false)
        }}
      />

      <ShareModal
        open={shareOpen}
        shareId={shareId}
        title={`${self.name}의 ${genre.label} | 사주미`}
        onClose={() => setShareOpen(false)}
        onRevoke={user ? handleRevokeShare : undefined}
      />

      <Toast notice={toast} />
    </div>
  )
}

export default App
