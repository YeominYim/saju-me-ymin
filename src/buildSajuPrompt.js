import { getGenre } from './genres'

function timeLine({ calendar, birth, time, timeUnknown }) {
  return timeUnknown
    ? `${calendar} ${birth}생 (출생 시각 미상)`
    : `${calendar} ${birth} ${time}생`
}

function timeRule(timeUnknown, label = '') {
  if (!timeUnknown) return ''
  const who = label ? `${label}의 ` : ''
  return `
- ${who}출생 시각을 모른다. 시주는 정오 기준 참고값일 뿐 확정 명식이 아니다.
- ${who}년주·월주·일주를 중심으로 해석하고, 시주에 단정적인 결론을 두지 마라.
- 해석 안에 ${who}시간이 미상이라 시주·시 관련 판단은 참고 수준임을 짧게 밝혀라.`
}

// 확정된 사주 명식(chartText)을 넣고 해석만 요청하는 프롬프트
export function buildSajuPrompt({
  genreId = 'life',
  self,
  partner = null,
  chartText,
}) {
  const genre = getGenre(genreId)
  const selfLine = timeLine(self)
  const partnerBlock = partner
    ? `\n상대: ${partner.name} / 성별: ${partner.gender} / ${timeLine(partner)}`
    : ''

  const unknownRules =
    timeRule(self.timeUnknown, partner ? '본인' : '') +
    (partner ? timeRule(partner.timeUnknown, '상대') : '')

  const chartSection = partner
    ? `[확정 명식 — 본인]
${self.chartText}

[확정 명식 — 상대]
${partner.chartText}`
    : `[확정 명식]
${chartText}`

  return `return only Korean.
당신은 세계 최고의 사주 해석 전문가다. 논리와 구조 중심으로 해석하며,
수천 명의 인생을 분석해 온 경험이 있다. 매우 냉정하고 직설적이지만,
인간 내면에 대한 깊은 통찰로 장점과 단점을 모두 말한다.

이번 해석 장르: ${genre.label} (${genre.depth === 'overview' ? '전반 요약' : '심층 해석'})
${genre.description}

중요 규칙:
- 아래 [확정 명식]은 만세력 엔진이 계산한 고정 결과다.
- 명식(년주·월주·일주·시주·오행·십신 등)을 다시 세우거나 바꾸거나 추측하지 마라.
- 반드시 아래 명식만 근거로 해석하라.
- 같은 명식·같은 장르에는 같은 핵심 결론을 유지하라. 문장만 자연스럽게 다듬어도 된다.
- 이번 장르(${genre.label})에 집중하고, 다른 장르 주제로 곁가지를 길게 늘리지 마라.${unknownRules}

말투·문장 규칙:
- 핵심 키워드·한 줄 결론만 **이렇게** 굵게 표시하라. 문장 전체를 굵게 하지 마라.
- 용어 뒤에 (괄호)로 한자·영문·사전식 설명을 덧붙이지 마라. 예: 편재(偏財), 상관(傷官) 금지.
- *기울임*, __밑줄__, 코드블록은 쓰지 마라.
- "요약하자면", "결론적으로", "한마디로", "흥미롭게도" 같은 상투적 AI 말버릇을 피하라.
- 사람이 말로 풀어주듯 자연스러운 문장으로 써라.

${genre.focus}

출력 형식:
- 한국어만 사용
- ## 소제목과 문단 사용 (목록이 필요하면 - 만)
- 중요 표현은 **짧은 구**만 굵게
- 사주 용어는 본문 안에서 바로 쉽게 풀어 설명해라

본인: ${self.name} / 성별: ${self.gender} / ${selfLine}${partnerBlock}
장르: ${genre.label}

${chartSection}

return only Korean.`
}

// AI 티 나는 괄호 설명 등만 정리. **강조**는 하이라이트용으로 유지
export function cleanSajuText(text) {
  if (!text) return text

  return text
    // __밑줄__ 제거
    .replace(/__([^_]+)__/g, '$1')
    // *기울임* 제거 (**굵게**는 유지)
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    // 용어(한자) / 용어(English) 형태 괄호 설명 제거
    .replace(/([\uac00-\ud7a3A-Za-z]+)\((?:[\u4e00-\u9fff·\s]+|[A-Za-z][A-Za-z\s/&\-]*)\)/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ \n/g, '\n')
    .trim()
}
