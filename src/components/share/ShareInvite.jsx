import SajuGirl from '@/components/ui/SajuGirl'
import { trackEvent } from '@/lib/analytics'
import { homeFromSharePath } from '@/lib/share'

export default function ShareInvite({ genreId, selfName }) {
  const href = homeFromSharePath(genreId)

  return (
    <section className="share-invite">
      <SajuGirl size="sm" />
      <p className="share-invite-kicker">친구 사주를 다 읽었다면</p>
      <h2 className="share-invite-title">나도 사주 보러가기</h2>
      <p className="share-invite-lead">
        {selfName
          ? `${selfName}의 사주를 봤다면, 내 명식도 한 번 펼쳐 보세요.`
          : '생년월일만 있으면 바로 읽어 드려요.'}
      </p>
      <a
        className="analyze-btn share-invite-btn"
        href={href}
        onClick={() =>
          trackEvent('share_cta', { placement: 'invite', genre_id: genreId || '' })
        }
      >
        나도 사주 보러가기
      </a>
    </section>
  )
}
