export default function ReadingCount({ count, visible }) {
  if (!visible || typeof count !== 'number' || count <= 0) return null

  return (
    <p className="reading-count">
      총 <strong>{count.toLocaleString('ko-KR')}</strong>개의 사주가 생성되었습니다
    </p>
  )
}
