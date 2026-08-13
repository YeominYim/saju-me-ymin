export default function ReadingSkeleton({
  title,
  lines = 6,
  status = '잠시만 기다려 주세요…',
}) {
  return (
    <section className="reading skeleton-reading" aria-busy="true" aria-live="polite">
      <h2 className="reading-title">{title}</h2>
      <p className="skeleton-status">{status}</p>
      <div className="skeleton-lines">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`skeleton-line ${i % 3 === 2 ? 'short' : i % 2 === 0 ? 'long' : 'mid'}`}
          />
        ))}
      </div>
    </section>
  )
}
