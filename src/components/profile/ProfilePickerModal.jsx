import { useEffect } from 'react'
import { personByline, rowToPerson } from '@/lib/person'

export default function ProfilePickerModal({
  open,
  profiles,
  activeId,
  onSelect,
  onCreate,
  onClose,
}) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal-kicker">새 사주 만들기</p>
        <h2 id="profile-picker-title" className="modal-title">
          누구의 사주를 볼까요?
        </h2>
        <p className="modal-lead">
          등록된 프로필을 고르거나, 새 프로필을 추가해 주세요.
        </p>

        <ul className="profile-pick-list">
          {profiles.map((row) => {
            const person = rowToPerson(row)
            const selected = row.id === activeId
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={`profile-pick-item ${selected ? 'is-active' : ''}`}
                  onClick={() => onSelect(row)}
                >
                  <span className="profile-pick-name">{person.name}</span>
                  <span className="profile-pick-byline">{personByline(person)}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="analyze-btn" onClick={onCreate}>
            새 프로필 등록
          </button>
        </div>
      </div>
    </div>
  )
}
