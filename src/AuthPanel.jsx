import { useState } from 'react'
import { displayUserName, signInWithGoogle, signOut } from './useAuth'

export default function AuthPanel({ user, ready, onError }) {
  const [busy, setBusy] = useState(false)

  async function handleSignIn() {
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error(err)
      setBusy(false)
      onError?.('구글 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  async function handleSignOut() {
    setBusy(true)
    try {
      await signOut()
    } catch (err) {
      console.error(err)
      onError?.('로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  if (!ready) {
    return (
      <div className="auth-panel">
        <p className="auth-hint">로그인 확인 중…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-panel">
        <button
          type="button"
          className="google-btn"
          onClick={handleSignIn}
          disabled={busy}
        >
          <GoogleMark />
          {busy ? '구글로 이동 중…' : 'Google로 로그인'}
        </button>
        <p className="auth-hint">로그인하면 사주가 계정에 저장됩니다.</p>
      </div>
    )
  }

  return (
    <div className="auth-panel auth-panel-signed">
      <p className="auth-user" title={user.email || displayUserName(user)}>
        {displayUserName(user)}
      </p>
      <button
        type="button"
        className="auth-signout"
        onClick={handleSignOut}
        disabled={busy}
      >
        {busy ? '로그아웃 중…' : '로그아웃'}
      </button>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg
      className="google-mark"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.48a5.54 5.54 0 0 1-2.4 3.64v3.02h3.88c2.27-2.09 3.53-5.17 3.53-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3.02c-1.08.72-2.47 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.26A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.55.38-2.26V6.63H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37l4-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.63l4 3.11C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  )
}
