import sajuGirlLoading from '@/assets/saju-girl-loading.png'

export default function InterpretingScene({ title }) {
  return (
    <section className="reading interpreting" aria-busy="true" aria-live="polite">
      <h2 className="reading-title">{title}</h2>
      <figure className="interpreting-girl">
        <img src={sajuGirlLoading} alt="사주미 소녀가 명식을 읽는 중" />
        <figcaption>조금만 기다려 주세요! 지금 명식을 읽고 있어요.</figcaption>
      </figure>
    </section>
  )
}
