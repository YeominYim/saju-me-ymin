const KEY = 'saju:pending-guest-result'
const PENDING_GENRE_KEY = 'saju:pending-genre'

export function saveGuestResult(payload) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / private mode
  }
}

export function loadGuestResult() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return data?.result ? data : null
  } catch {
    return null
  }
}

export function clearGuestResult() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function savePendingGenre(id) {
  try {
    if (id) sessionStorage.setItem(PENDING_GENRE_KEY, id)
  } catch {
    // ignore quota / private mode
  }
}

export function peekPendingGenre() {
  try {
    return sessionStorage.getItem(PENDING_GENRE_KEY) || ''
  } catch {
    return ''
  }
}

export function clearPendingGenre() {
  try {
    sessionStorage.removeItem(PENDING_GENRE_KEY)
  } catch {
    // ignore
  }
}

export function splitPreviewText(text) {
  if (!text) return ''

  const sections = text.split(/(?=^##\s)/m).filter((part) => part.trim())
  if (sections.length >= 2) {
    const visibleCount = Math.max(1, Math.min(sections.length - 1, Math.ceil(sections.length / 2)))
    return sections.slice(0, visibleCount).join('').trim()
  }

  const blocks = text.split(/\n{2,}/).filter(Boolean)
  if (blocks.length >= 2) {
    const visibleCount = Math.max(1, Math.min(blocks.length - 1, Math.ceil(blocks.length / 2)))
    return blocks.slice(0, visibleCount).join('\n\n').trim()
  }

  const mid = Math.max(80, Math.floor(text.length / 2))
  const cut = text.lastIndexOf(' ', mid)
  return text.slice(0, cut > 40 ? cut : mid).trim()
}
