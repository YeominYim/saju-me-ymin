import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = String(import.meta.env.VITE_GEMINI_API_KEY || '')
  .replace(/[^\x21-\x7E]/g, '')
  .trim()

// 우선 모델 → 권한/미지원 시 폴백
export const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
]

export const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null

export function hasGeminiKey() {
  return Boolean(GEMINI_API_KEY && ai)
}

function isModelUnavailable(err) {
  const msg = err?.message || String(err)
  const status = err?.status || err?.code
  if (status === 404) return true
  return /NOT_FOUND|not found|is not found|not supported|unknown model|invalid model/i.test(
    msg,
  )
}

export async function generateSajuText(prompt) {
  if (!ai) {
    throw new Error('API 키가 없습니다.')
  }

  let lastError

  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      })

      const text = (response.text || '').trim()
      if (!text) {
        throw new Error('모델이 빈 응답을 반환했습니다.')
      }
      return { text, model }
    } catch (err) {
      lastError = err
      if (isModelUnavailable(err)) continue
      throw err
    }
  }

  throw lastError || new Error('사용 가능한 Gemini 모델이 없습니다.')
}

export function formatApiError(err) {
  const msg = err?.message || String(err)
  const status = err?.status || err?.code

  if (/ByteString|greater than 255|non-ascii/i.test(msg)) {
    return 'API 키에 잘못된 문자가 섞여 있습니다. .env의 VITE_GEMINI_API_KEY를 다시 붙여넣어 주세요.'
  }
  if (
    status === 401 ||
    status === 403 ||
    /API[_ ]?key|UNAUTHENTICATED|PERMISSION_DENIED|invalid.*key/i.test(msg)
  ) {
    return 'API 키가 유효하지 않습니다. Google AI Studio에서 키를 확인해 주세요.'
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(msg)) {
    return '요청이 너무 많거나 할당량이 부족합니다. 잠시 후 다시 시도해 주세요.'
  }
  if (/fetch failed|Failed to fetch|NetworkError|ECONN|ENOTFOUND/i.test(msg)) {
    return '네트워크 연결에 실패했습니다. 인터넷 상태를 확인해 주세요.'
  }
  if (isModelUnavailable(err)) {
    return '사용 가능한 Gemini 모델을 찾지 못했습니다. API 키 권한 또는 모델 접근을 확인해 주세요.'
  }
  return '사주 해석 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.'
}
