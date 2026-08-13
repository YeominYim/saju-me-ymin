export const genderLabel = { male: '남자', female: '여자' }
export const calendarLabel = { solar: '양력', lunar: '음력' }

export const emptyPerson = {
  name: '',
  birthDate: '',
  birthTime: '',
  timeUnknown: false,
  gender: '',
  calendarType: '',
}

export function validatePerson(person, label) {
  if (!person.name || !person.birthDate || !person.gender || !person.calendarType) {
    return `${label}의 이름, 성별, 양력/음력, 생년월일을 입력해 주세요.`
  }
  if (!person.timeUnknown && !person.birthTime) {
    return `${label}의 태어난 시간을 입력하거나, 시간 모름을 선택해 주세요.`
  }
  return ''
}

export function isPersonComplete(person) {
  return !validatePerson(person, '프로필')
}

export function toTimeInput(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

export function toTimeValue(person) {
  if (!person || person.timeUnknown || !person.birthTime) return null
  return person.birthTime
}

export function toChartInput(person) {
  return {
    name: person.name,
    birthDate: person.birthDate,
    birthTime: person.timeUnknown ? '' : person.birthTime,
    gender: person.gender,
    calendarType: person.calendarType,
  }
}

export function personByline(person) {
  if (!person?.name) return ''
  const gender = genderLabel[person.gender] || ''
  const calendar = calendarLabel[person.calendarType] || ''
  const birth = person.birthDate || ''
  const time = person.timeUnknown ? '시간 모름' : person.birthTime
  return [person.name, gender, [calendar, birth].filter(Boolean).join(' '), time]
    .filter(Boolean)
    .join(' · ')
}

export function rowToPerson(row) {
  if (!row) return { ...emptyPerson }
  return {
    name: row.name || '',
    birthDate: row.birth_date || '',
    birthTime: row.time_unknown ? '' : toTimeInput(row.birth_time),
    timeUnknown: Boolean(row.time_unknown),
    gender: row.gender || '',
    calendarType: row.calendar_type || '',
  }
}
