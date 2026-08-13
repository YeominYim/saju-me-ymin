import { personByline } from '@/lib/person'

export default function ProfileSummary({ person, title, onEdit, onChangeProfile }) {
  return (
    <div className="profile-summary">
      <div className="profile-summary-top">
        {title ? <h3 className="person-title">{title}</h3> : <span />}
        <div className="profile-summary-actions">
          {onChangeProfile && (
            <button type="button" className="profile-edit-link" onClick={onChangeProfile}>
              프로필 바꾸기
            </button>
          )}
          <button type="button" className="profile-edit-link" onClick={onEdit}>
            수정
          </button>
        </div>
      </div>
      <p className="profile-summary-name">{person.name}</p>
      <p className="profile-summary-byline">{personByline(person)}</p>
    </div>
  )
}
