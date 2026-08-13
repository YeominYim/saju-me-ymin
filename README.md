# 사주미

생년월일로 만세력 명식을 계산하고, 평생운세·재물·건강·연애·궁합·학업·취업을 풀어 주는 사주 서비스입니다.

**서비스:** [saju-me-ymin.vercel.app](https://saju-me-ymin.vercel.app/)

## 기능

- **평생운세**는 로그인 없이 바로 볼 수 있습니다. 재물운, 건강운, 연애운, 궁합, 학업운, 취업운은 Google 로그인 후 열립니다.
- 이름, 생년월일, 출생 시각(모르면 미상), 양력/음력, 성별을 입력하면 `ssaju`로 사주 명식을 그리고 Gemini가 해석합니다.
- 로그인하면 프로필을 여러 개 두고, 본인·가족 사주를 저장해 다시 볼 수 있습니다.
- 결과 링크를 만들어 친구에게 공유할 수 있습니다. 링크를 받은 사람은 생년월일과 해석을 보고, 자기 사주도 보러 올 수 있습니다.
- 궁합은 본인과 상대 정보를 함께 넣습니다.

## 스택

- React 19 + Vite
- Supabase (Google 로그인, 프로필·사주 기록·공유 링크)
- Gemini (`@google/genai`)
- `ssaju` (만세력 명식)
- Google Analytics 4

## 로컬 실행

```bash
npm install
cp .env.example .env
npm run dev
```

`.env`에 아래 값을 채웁니다.

```
VITE_GEMINI_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | Oxlint |

공유 페이지(`/s/:id`)는 `vercel.json`에서 SPA로 라우팅됩니다.

## 구조

```
src/
  app/           앱 엔트리, 공유 경로 분기
  components/    장르, 입력, 결과, 로그인, 공유 UI
  hooks/         인증, 사주 흐름
  lib/           명식, Gemini, Supabase, 분석
```
