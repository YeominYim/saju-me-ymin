import { personByline } from './person'
import { supabase } from './supabaseClient'

const SHARE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function getShareIdFromPath(pathname = window.location.pathname) {
  const match = String(pathname).match(/^\/s\/([^/]+)\/?$/)
  if (!match) return null
  const id = match[1]
  return SHARE_ID_RE.test(id) ? id : ''
}

export function sharePath(id) {
  return `/s/${id}`
}

export function shareUrl(id) {
  return `${window.location.origin}${sharePath(id)}`
}

export function homeFromSharePath(genreId) {
  const params = new URLSearchParams({ from: 'share' })
  if (genreId) params.set('genre', genreId)
  return `/?${params.toString()}`
}

export function canNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export function buildShareSnapshot({ genreId, self, partner, result, chartViews }) {
  const hasPartner = Boolean(partner?.name)
  return {
    genre_id: genreId,
    self_name: self.name,
    self_byline: personByline(self),
    partner_name: hasPartner ? partner.name : null,
    partner_byline: hasPartner ? personByline(partner) : null,
    result_text: result,
    chart_views: chartViews || [],
  }
}

export async function fetchSharedReading(id) {
  if (!supabase || !SHARE_ID_RE.test(id)) return null

  const { data, error } = await supabase.rpc('get_saju_share', { p_id: id })
  if (error) throw error
  return data || null
}

export async function upsertSajuShare({ userId, readingId, snapshot }) {
  if (!supabase) {
    throw new Error('공유 기능을 쓰려면 서버 연결이 필요합니다.')
  }

  const payload = {
    ...snapshot,
    updated_at: new Date().toISOString(),
  }

  if (userId && readingId) {
    const { data: existing, error: lookupError } = await supabase
      .from('saju_shares')
      .select('id')
      .eq('reading_id', readingId)
      .eq('user_id', userId)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('saju_shares')
        .update(payload)
        .eq('id', existing.id)
        .eq('user_id', userId)

      if (updateError) throw updateError
      return existing.id
    }
  }

  const id = crypto.randomUUID()
  const { error } = await supabase.from('saju_shares').insert({
    id,
    user_id: userId || null,
    reading_id: userId ? readingId || null : null,
    ...payload,
  })

  if (error) throw error
  return id
}

export async function deleteSajuShare(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('saju_shares').delete().eq('id', id)
  if (error) throw error
}

export async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const input = document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}
