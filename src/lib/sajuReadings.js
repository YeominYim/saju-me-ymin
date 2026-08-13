import { supabase } from './supabaseClient'
import { toTimeInput, toTimeValue } from './person'

export function displayName(row, fallbackName = '') {
  const selfName = row.profiles?.name || fallbackName || '나'
  if (row.partner_name) return `${selfName} · ${row.partner_name}`
  return selfName
}

export function rowToPartner(row) {
  if (!row?.partner_name) return null
  return {
    name: row.partner_name,
    birthDate: row.partner_birth_date || '',
    birthTime: row.partner_time_unknown ? '' : toTimeInput(row.partner_birth_time),
    timeUnknown: Boolean(row.partner_time_unknown),
    gender: row.partner_gender || '',
    calendarType: row.partner_calendar_type || '',
  }
}

const PROFILE_SELECT =
  '*, profiles(name, birth_date, birth_time, time_unknown, gender, calendar_type)'

function toReadingPayload({ genreId, partner, resultText, userId, profileId }) {
  return {
    user_id: userId,
    profile_id: profileId || null,
    genre_id: genreId,
    partner_name: partner?.name || null,
    partner_birth_date: partner?.birthDate || null,
    partner_birth_time: toTimeValue(partner),
    partner_time_unknown: partner ? Boolean(partner.timeUnknown) : null,
    partner_gender: partner?.gender || null,
    partner_calendar_type: partner?.calendarType || null,
    result_text: resultText,
    updated_at: new Date().toISOString(),
  }
}

export async function fetchSajuReadings(userId) {
  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from('saju_readings')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchSajuReadingCount() {
  if (!supabase) return null

  const { data, error } = await supabase.rpc('count_saju_readings')
  if (error) throw error

  const count = Number(data)
  return Number.isFinite(count) ? count : null
}

export async function saveSajuReading({
  genreId,
  partner,
  resultText,
  userId,
  profileId,
}) {
  if (!supabase || !userId) return null

  const { data, error } = await supabase
    .from('saju_readings')
    .insert(toReadingPayload({ genreId, partner, resultText, userId, profileId }))
    .select(PROFILE_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function updateSajuReading({
  id,
  genreId,
  partner,
  resultText,
  userId,
  profileId,
}) {
  if (!supabase || !id || !userId) return null

  const { data, error } = await supabase
    .from('saju_readings')
    .update(toReadingPayload({ genreId, partner, resultText, userId, profileId }))
    .eq('id', id)
    .eq('user_id', userId)
    .select(PROFILE_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function deleteSajuReading(id) {
  if (!supabase || !id) return

  const { error } = await supabase.from('saju_readings').delete().eq('id', id)
  if (error) throw error
}
