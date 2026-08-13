import { GoogleSignInButton } from '@/components/auth/AuthPanel'

export default function GuestUpgrade({ onAuthError }) {
  return (
    <div className="guest-upgrade">
      <p className="guest-upgrade-lead">
        재물운, 연애운, 궁합은 로그인하면 더 깊게 볼 수 있어요.
      </p>
      <GoogleSignInButton
        label="Google로 로그인하고 더 보기"
        onError={onAuthError}
      />
    </div>
  )
}
