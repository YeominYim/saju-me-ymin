import { calculateSaju } from 'ssaju'

const PILLAR_ORDER = [
  { key: 'hour', label: '시주' },
  { key: 'day', label: '일주' },
  { key: 'month', label: '월주' },
  { key: 'year', label: '연주' },
]

function personKey(person) {
  const timeKey = person.birthTime || 'unknown'
  return `${person.name}|${person.birthDate}|${timeKey}|${person.gender}|${person.calendarType}`
}

function toCompact(result, timeUnknown) {
  let chart = result
    .toCompact()
    .replace(/\s*Asia\/Seoul\s*/gi, ' ')
    .replace(/[ \t]{2,}/g, ' ')

  if (timeUnknown) {
    chart +=
      '\n\n[시간 미상] 출생 시각을 모름. 시주는 정오(12:00) 기준 참고값이며 확정 명식이 아님.'
  }

  return chart
}

function toView(result, { timeUnknown = false, name = '' } = {}) {
  const pillars = PILLAR_ORDER.map(({ key, label }) => {
    const detail = result.pillarDetails[key]
    const gods = result.tenGods[key]
    return {
      key,
      label,
      stem: detail.stem,
      stemKo: detail.stemKo,
      branch: detail.branch,
      branchKo: detail.branchKo,
      stemElement: detail.element.stem,
      branchElement: detail.element.branch,
      stemGod: key === 'day' ? '일간' : gods.stem.replace(/[()]/g, ''),
      branchGod: gods.branch,
      stage: result.stages12.bong[key],
    }
  })

  const dominantElement = Object.entries(result.fiveElements).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0]

  return {
    name,
    timeUnknown,
    dayStem: result.dayStem,
    dayBranch: result.dayBranch,
    dayStemKo: result.pillarDetails.day.stemKo,
    dayBranchKo: result.pillarDetails.day.branchKo,
    dayElement: result.pillarDetails.day.element.stem,
    dominantElement,
    fiveElements: result.fiveElements,
    geukguk: result.advanced?.geukguk || '',
    dayStrength: result.advanced?.dayStrength || null,
    pillars,
  }
}

// 폼 입력 → 사주 명식 계산 (같은 입력이면 항상 같은 결과)
export function calculateChart({
  birthDate,
  birthTime,
  gender,
  calendarType,
  name = '',
}) {
  const [year, month, day] = birthDate.split('-').map(Number)
  const timeUnknown = !birthTime
  const input = {
    year,
    month,
    day,
    gender: gender === 'female' ? '여' : '남',
    calendar: calendarType === 'lunar' ? 'lunar' : 'solar',
  }

  if (!timeUnknown) {
    const [hour, minute] = birthTime.split(':').map(Number)
    input.hour = hour
    input.minute = minute
  }

  const result = calculateSaju(input)
  const compact = toCompact(result, timeUnknown)
  const view = toView(result, { timeUnknown, name })

  return { compact, view }
}

export function buildChartBundle({ self, partner = null }) {
  const selfResult = calculateChart(self)
  if (!partner) {
    return {
      views: [{ label: '', view: selfResult.view }],
      selfChart: selfResult.compact,
      partnerChart: '',
      displayCompact: selfResult.compact,
    }
  }

  const partnerResult = calculateChart(partner)
  return {
    views: [
      { label: `본인 · ${self.name || '본인'}`, view: selfResult.view },
      { label: `상대 · ${partner.name || '상대'}`, view: partnerResult.view },
    ],
    selfChart: selfResult.compact,
    partnerChart: partnerResult.compact,
    displayCompact: [
      `## 본인 (${self.name || '본인'})`,
      selfResult.compact,
      '',
      `## 상대 (${partner.name || '상대'})`,
      partnerResult.compact,
    ].join('\n'),
  }
}

export function makeCacheKey({
  genreId = 'life',
  self,
  partner = null,
}) {
  // v6: 평생요약 + 딥장르, 궁합(상대) 지원
  const base = `saju:v6:${genreId}|self:${personKey(self)}`
  if (!partner) return base
  return `${base}|partner:${personKey(partner)}`
}
