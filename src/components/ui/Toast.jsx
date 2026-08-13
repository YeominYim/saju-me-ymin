import { useEffect, useState } from 'react'

export default function Toast({ notice }) {
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!notice?.message) return
    setMessage(notice.message)
    const timer = window.setTimeout(() => setMessage(''), 2400)
    return () => window.clearTimeout(timer)
  }, [notice])

  if (!message) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
