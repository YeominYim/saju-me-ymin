export default function ReadingActions({
  sharing,
  onShare,
  onNew,
  onEdit,
  onDelete,
  editLabel,
  showEdit = false,
  showDelete = false,
}) {
  return (
    <div className="view-actions">
      <button
        type="button"
        className="share-reading-btn"
        onClick={onShare}
        disabled={sharing}
      >
        {sharing ? '링크 만드는 중…' : '친구에게 공유'}
      </button>
      <button type="button" className="new-reading-btn" onClick={onNew}>
        새 사주 만들기
      </button>
      {showEdit && (
        <button type="button" className="edit-reading-btn" onClick={onEdit}>
          {editLabel}
        </button>
      )}
      {showDelete && (
        <button type="button" className="delete-reading-btn" onClick={onDelete}>
          삭제
        </button>
      )}
    </div>
  )
}
