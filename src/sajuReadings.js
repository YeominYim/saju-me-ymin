import { supabase } from './supabaseClient'

function toTimeInput(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function toTimeValue(person) {
  if (!person || person.timeUnknown || !person.birthTime) return null
  return person.birthTime
}

export function displayName(row) {
  if (row.partner_name) return `${row.name} · ${row.partner_name}`
  return row.name
}

export function rowToPeople(row) {
  const self = {
    name: row.name || '',
    birthDate: row.birth_date || '',
    birthTime: row.time_unknown ? '' : toTimeInput(row.birth_time),
    timeUnknown: Boolean(row.time_unknown),
    gender: row.gender || '',
    calendarType: row.calendar_type || '',
  }

  const partner = row.partner_name
    ? {
        name: row.partner_name,
        birthDate: row.partner_birth_date || '',
        birthTime: row.partner_time_unknown
          ? ''
          : toTimeInput(row.partner_birth_time),
        timeUnknown: Boolean(row.partner_time_unknown),
        gender: row.partner_gender || '',
        calendarType: row.partner_calendar_type || '',
      }
    : null

  return { self, partner }
}

function toReadingPayload({ genreId, self, partner, resultText, userId }) {
  return {
    user_id: userId,
    genre_id: genreId,
    name: self.name,
    birth_date: self.birthDate,
    birth_time: toTimeValue(self),
    time_unknown: Boolean(self.timeUnknown),
    gender: self.gender,
    calendar_type: self.calendarType,
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
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function saveSajuReading({
  genreId,
  self,
  partner,
  resultText,
  userId,
}) {
  if (!supabase || !userId) return null

  const { data, error } = await supabase
    .from('saju_readings')
    .insert(toReadingPayload({ genreId, self, partner, resultText, userId }))
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSajuReading({
  id,
  genreId,
  self,
  partner,
  resultText,
  userId,
}) {
  if (!supabase || !id || !userId) return null

  const { data, error } = await supabase
    .from('saju_readings')
    .update(toReadingPayload({ genreId, self, partner, resultText, userId }))
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSajuReading(id) {
  if (!supabase || !id) return

  const { error } = await supabase.from('saju_readings').delete().eq('id', id)
  if (error) throw error
}
