import { GoogleSignInButton } from '@/components/auth/AuthPanel'
import { savePendingGenre } from '@/lib/guestResult'

export default function GenreAuthGate({ genre, onAuthError, onSeeLife }) {
  const redirectTo = `${window.location.origin}/?genre=${genre.id}`

  return (
    <div className="genre-auth-gate">
      <p className="result-gate-kicker">로그인하고 더 깊게</p>
      <p className="result-gate-title">{genre.label}은 로그인이 필요해요</p>
      <p className="result-gate-lead">
        평생운세는 바로 볼 수 있어요. {genre.label}은 Google로 로그인하면 자세히 풀어 드려요.
      </p>
      <GoogleSignInButton
        label={`Google로 로그인하고 ${genre.label} 보기`}
        redirectTo={redirectTo}
        onBeforeSignIn={() => savePendingGenre(genre.id)}
        onError={onAuthError}
      />
      {onSeeLife && (
        <button type="button" className="profile-edit-link" onClick={onSeeLife}>
          먼저 평생운세 보기
        </button>
      )}
    </div>
  )
}
