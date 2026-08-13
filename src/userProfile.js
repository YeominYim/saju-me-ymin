import { supabase } from './supabaseClient'
import { isPersonComplete, rowToPerson, toTimeValue } from './person'

export { isPersonComplete, rowToPerson }

export async function ensureUserRow(userId) {
  if (!supabase || !userId) return null

  const { data, error } = await supabase
    .from('users')
    .upsert({ id: userId, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select('id')
    .single()

  if (error) throw error
  return data
}

export async function fetchProfiles(userId) {
  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function saveProfile(userId, person, profileId) {
  if (!supabase || !userId) return null

  await ensureUserRow(userId)

  const payload = {
    user_id: userId,
    name: person.name,
    birth_date: person.birthDate,
    birth_time: toTimeValue(person),
    time_unknown: Boolean(person.timeUnknown),
    gender: person.gender,
    calendar_type: person.calendarType,
    updated_at: new Date().toISOString(),
  }

  const query = profileId
    ? supabase.from('profiles').update(payload).eq('id', profileId).eq('user_id', userId)
    : supabase.from('profiles').insert(payload)

  const { data, error } = await query.select().single()
  if (error) throw error
  return data
}
