import { getGenre } from './genres'
import { displayName } from './sajuReadings'

export default function HistorySidebar({ readings, activeId, onSelect, onNew }) {
  return (
    <aside className="history-sidebar" aria-label="저장된 사주">
      <h2 className="history-title">저장된 사주</h2>
      <button
        type="button"
        className={`history-new-btn ${activeId ? '' : 'is-active'}`}
        onClick={onNew}
      >
        새 사주 만들기
      </button>
      {readings.length === 0 ? (
        <p className="history-empty">아직 없습니다</p>
      ) : (
        <ul className="history-list">
          {readings.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={`history-item ${row.id === activeId ? 'is-active' : ''}`}
                onClick={() => onSelect(row)}
              >
                <span className="history-name">{displayName(row)}</span>
                <span className="history-genre">{getGenre(row.genre_id).label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
