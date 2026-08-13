import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { canNativeShare, copyText, shareUrl } from '@/lib/share'

export default function ShareModal({
  open,
  shareId,
  title,
  onClose,
  onRevoke,
}) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const url = shareId ? shareUrl(shareId) : ''

  useEffect(() => {
    if (!open) return
    setCopied(false)
    setBusy(false)
    setError('')
  }, [open, shareId])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open || !shareId) return null

  async function handleCopy() {
    try {
      await copyText(url)
      setCopied(true)
      setError('')
      trackEvent('share_copy', { method: 'copy' })
    } catch (err) {
      console.error(err)
      setError('링크를 복사하지 못했습니다. 직접 복사해 주세요.')
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({
        title: title || '사주미',
        text: '내 사주 결과를 보내 줄게. 너도 한 번 읽어 봐!',
        url,
      })
      trackEvent('share', { method: 'native', content_type: 'reading' })
      onClose?.()
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.error(err)
      setError('공유 창을 열지 못했습니다. 링크를 복사해 주세요.')
    }
  }

  async function handleRevoke() {
    if (!onRevoke) return
    if (!window.confirm('이 공유 링크를 막을까요? 이미 받은 친구는 더 이상 볼 수 없습니다.')) {
      return
    }

    setBusy(true)
    setError('')
    try {
      await onRevoke()
    } catch (err) {
      console.error(err)
      setError('공유를 취소하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose?.()}>
      <div
        className="modal-card share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal-kicker">공유</p>
        <h2 id="share-modal-title" className="modal-title">
          친구에게 보내기
        </h2>
        <p className="modal-lead">
          링크를 받은 친구가 이 사주를 보고, 자기 사주도 보러 올 수 있어요.
          생년월일 정보도 함께 보입니다.
        </p>

        <label className="share-link-field">
          <span className="share-link-label">공유 링크</span>
          <input
            className="share-link-input"
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          {onRevoke && (
            <button
              type="button"
              className="modal-cancel"
              onClick={handleRevoke}
              disabled={busy}
            >
              공유 취소
            </button>
          )}
          <button
            type="button"
            className="edit-reading-btn"
            onClick={handleCopy}
            disabled={busy}
          >
            {copied ? '복사했어요' : '링크 복사'}
          </button>
          {canNativeShare() && (
            <button
              type="button"
              className="new-reading-btn"
              onClick={handleNativeShare}
              disabled={busy}
            >
              친구에게 보내기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
