import { calculateSaju } from 'ssaju'

// 폼 입력 → 사주 명식 계산 (같은 입력이면 항상 같은 결과)
export function calculateChart({ birthDate, birthTime, gender, calendarType }) {
  const [year, month, day] = birthDate.split('-').map(Number)
  const [hour, minute] = birthTime.split(':').map(Number)

  const result = calculateSaju({
    year,
    month,
    day,
    hour,
    minute,
    gender: gender === 'female' ? '여' : '남',
    calendar: calendarType === 'lunar' ? 'lunar' : 'solar',
  })

  // LLM/화면에 넣을 압축 명식 (타임존 표기는 사용자에게 불필요해서 제거)
  return result
    .toCompact()
    .replace(/\s*Asia\/Seoul\s*/gi, ' ')
    .replace(/[ \t]{2,}/g, ' ')
}

// 같은 입력인지 구분하는 캐시 키
export function makeCacheKey({ name, birthDate, birthTime, gender, calendarType }) {
  // v2: 강조/괄호 정리 프롬프트 변경으로 캐시 구분
  return `saju:v2:${name}|${birthDate}|${birthTime}|${gender}|${calendarType}`
}
