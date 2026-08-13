import { useEffect, useRef, useState } from 'react'
import { buildSajuPrompt, cleanSajuText } from '@/lib/buildSajuPrompt'
import { formatApiError, generateSajuText, hasGeminiKey } from '@/lib/gemini'
import { DEFAULT_GENRE_ID, GENRES, getGenre } from '@/lib/genres'
import {
  clearGuestResult,
  clearPendingGenre,
  loadGuestResult,
  peekPendingGenre,
  saveGuestResult,
} from '@/lib/guestResult'
import {
  calendarLabel,
  emptyPerson,
  genderLabel,
  isPersonComplete,
  rowToPerson,
  toChartInput,
  validatePerson,
} from '@/lib/person'
import { buildChartBundle, makeCacheKey } from '@/lib/sajuChart'
import {
  deleteSajuReading,
  fetchSajuReadingCount,
  fetchSajuReadings,
  rowToPartner,
  saveSajuReading,
  updateSajuReading,
} from '@/lib/sajuReadings'
import {
  buildShareSnapshot,
  deleteSajuShare,
  upsertSajuShare,
} from '@/lib/share'
import { fetchProfiles, saveProfile } from '@/lib/userProfile'
import { useAuth } from '@/hooks/useAuth'

function genreIdFromSearch() {
  const id = new URLSearchParams(window.location.search).get('genre') || peekPendingGenre()
  return GENRES.some((item) => item.id === id) ? id : DEFAULT_GENRE_ID
}

export function useSajuApp() {
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

  return {
    user,
    ready,
    genre,
    genreId,
    self,
    partner,
    needsPartner,
    requiresAuth,
    resultLocked,
    isViewing,
    profileComplete,
    usesSavedProfile,
    chartViews,
    result,
    loading,
    error,
    readings,
    activeReadingId,
    editingId,
    formKey,
    profileReady,
    profileOpen,
    profileMode,
    pickerOpen,
    profiles,
    selectedProfileId,
    toast,
    shareOpen,
    shareId,
    setShareOpen,
    sharing,
    readingCount,
    nameInputRef,
    formPanelRef,
    setSelf,
    setPartner,
    setError,
    setPickerOpen,
    setProfileOpen,
    setProfileMode,
    handleGenreChange,
    handleSelectReading,
    handleShare,
    handleRevokeShare,
    handleNewReading,
    openCreateProfile,
    handleEditReading,
    handleDeleteReading,
    handleSaveProfile,
    handleAnalyze,
    applyProfile,
  }
}
