import { useEffect, useRef, useState } from 'react'
import PersonForm from './PersonForm'
import { emptyPerson, validatePerson } from './person'

const COPY = {
  required: {
    kicker: '처음 오신 것을 환영합니다',
    title: '사주에 쓸 정보를 알려 주세요',
    lead: '한 번만 입력하면, 다음부터는 바로 사주를 볼 수 있습니다.',
    submit: '저장하고 시작하기',
  },
  create: {
    kicker: '새 프로필',
    title: '새 프로필을 등록해 주세요',
    lead: '가족이나 다른 사람의 사주도 이 계정에서 볼 수 있습니다.',
    submit: '프로필 등록',
  },
  edit: {
    kicker: '프로필',
    title: '프로필 수정',
    lead: '이름과 생년월일 정보는 사주 해석에 사용됩니다.',
    submit: '프로필 저장',
  },
}

export default function ProfileModal({
  open,
  mode = 'edit',
  initialPerson,
  onSave,
  onClose,
}) {
  const copy = COPY[mode] || COPY.edit
  const required = mode === 'required'
  const [person, setPerson] = useState(initialPerson || emptyPerson)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setPerson(mode === 'create' ? { ...emptyPerson } : initialPerson || emptyPerson)
    setError('')
    setSaving(false)
    window.setTimeout(() => nameRef.current?.focus(), 80)
  }, [open, mode])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  async function handleSubmit() {
    const nextError = validatePerson(person, '프로필')
    if (nextError) {
      setError(nextError)
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave(person)
    } catch (err) {
      console.error(err)
      setError('프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      setSaving(false)
    }
  }

  function handleBackdrop() {
    if (!required && !saving) onClose?.()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal-kicker">{copy.kicker}</p>
        <h2 id="profile-modal-title" className="modal-title">
          {copy.title}
        </h2>
        <p className="modal-lead">{copy.lead}</p>

        <PersonForm person={person} onChange={setPerson} nameRef={nameRef} />

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          {!required && (
            <button
              type="button"
              className="modal-cancel"
              onClick={onClose}
              disabled={saving}
            >
              닫기
            </button>
          )}
          <button
            type="button"
            className="analyze-btn"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? '저장하는 중…' : copy.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
