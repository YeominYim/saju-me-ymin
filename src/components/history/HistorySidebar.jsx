import AuthPanel from '@/components/auth/AuthPanel'
import { getGenre } from '@/lib/genres'
import { displayName } from '@/lib/sajuReadings'

export default function HistorySidebar({
  user,
  ready,
  profileName,
  readings,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onAuthError,
  onEditProfile,
}) {
  return (
    <aside className="history-sidebar" aria-label="저장된 사주">
      <h2 className="history-title">저장된 사주</h2>
      <AuthPanel
        user={user}
        ready={ready}
        profileName={profileName}
        onError={onAuthError}
        onEditProfile={onEditProfile}
      />
      <button
        type="button"
        className={`history-new-btn ${activeId ? '' : 'is-active'}`}
        onClick={onNew}
      >
        새 사주 만들기
      </button>
      {!ready ? (
        <p className="history-empty">불러오는 중…</p>
      ) : !user ? (
        <p className="history-empty">로그인하면 기록이 여기에 쌓여요</p>
      ) : readings.length === 0 ? (
        <p className="history-empty">아직 없습니다</p>
      ) : (
        <ul className="history-list">
          {readings.map((row) => (
            <li key={row.id} className="history-row">
              <button
                type="button"
                className={`history-item ${row.id === activeId ? 'is-active' : ''}`}
                onClick={() => onSelect(row)}
              >
                <span className="history-name">{displayName(row, profileName)}</span>
                <span className="history-genre">{getGenre(row.genre_id).label}</span>
              </button>
              <button
                type="button"
                className="history-delete"
                onClick={() => onDelete(row)}
                aria-label={`${displayName(row, profileName)} 삭제`}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
