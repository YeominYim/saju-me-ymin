import { useEffect, useRef, useState } from 'react'
import { GENRES } from '@/lib/genres'

function GenreLockIcon() {
  return (
    <svg className="genre-lock" viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17 8h-1V6a4 4 0 10-8 0v2H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2zM10 6a2 2 0 114 0v2h-4V6zm7 12H7v-8h10v8z"
      />
    </svg>
  )
}

export default function GenreNav({ genreId, user, onChange }) {
  const scrollerRef = useRef(null)
  const [overflow, setOverflow] = useState({ left: false, right: false })

  function updateOverflow() {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setOverflow({
      left: el.scrollLeft > 6,
      right: max - el.scrollLeft > 6,
    })
  }

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    updateOverflow()
    el.addEventListener('scroll', updateOverflow, { passive: true })
    const observer = new ResizeObserver(updateOverflow)
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', updateOverflow)
      observer.disconnect()
    }
  }, [user])

  useEffect(() => {
    const el = scrollerRef.current
    const active = el?.querySelector('.genre-tab.is-active')
    if (!active) return
    active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    window.setTimeout(updateOverflow, 280)
  }, [genreId])

  return (
    <nav
      className={`genre-nav ${overflow.left ? 'has-left' : ''} ${overflow.right ? 'has-right' : ''}`}
      aria-label="사주 장르"
    >
      <div className="genre-nav-inner" ref={scrollerRef}>
        {GENRES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`genre-tab ${item.id === genreId ? 'is-active' : ''} ${item.requiresAuth && !user ? 'is-locked' : ''}`}
            onClick={() => onChange(item.id)}
            aria-pressed={item.id === genreId}
          >
            {item.label}
            {item.requiresAuth && !user ? <GenreLockIcon /> : null}
          </button>
        ))}
      </div>
    </nav>
  )
}
