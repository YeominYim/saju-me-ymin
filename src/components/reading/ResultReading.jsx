import Markdown from 'react-markdown'
import { GoogleSignInButton } from '@/components/auth/AuthPanel'
import SajuGirl from '@/components/ui/SajuGirl'
import { splitPreviewText } from '@/lib/guestResult'
import { personByline } from '@/lib/person'

export default function ResultReading({
  genre,
  self,
  partner,
  needsPartner,
  result,
  locked,
  onAuthError,
  children,
}) {
  const text = locked ? splitPreviewText(result) : result

  return (
    <section className="reading result-reading">
      <div className="result-head">
        <SajuGirl size="sm" />
        <p className="result-voice">
          {locked
            ? '앞부분은 먼저 말해 줄게요! 나머지는 로그인하면 이어서 들려줄게요.'
            : '자, 다 읽었어요! 감정은 빼고, 확실한 것만 말해 줄게요.'}
        </p>
      </div>
      <h2 className="reading-title">{genre.label} 해석</h2>
      <p className="result-byline">
        {personByline(self)}
        {needsPartner && partner.name ? `  |  ${personByline(partner)}` : ''}
      </p>
      <div className={`markdown result-md ${locked ? 'is-preview' : ''}`}>
        <Markdown>{text}</Markdown>
      </div>
      {locked && (
        <div className="result-gate">
          <p className="result-gate-kicker">이어서 읽기</p>
          <p className="result-gate-title">나머지 해석은 로그인하면 열려요!</p>
          <p className="result-gate-lead">
            지금 본 흐름 다음에, 더 분명한 결이 남아 있어요.
          </p>
          <GoogleSignInButton
            label="Google로 로그인하고 이어서 보기"
            source="result_gate"
            onError={onAuthError}
          />
        </div>
      )}
      {children}
    </section>
  )
}
