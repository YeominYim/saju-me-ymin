import sajuGirl from './assets/saju-girl.png'

export default function SajuGirl({
  size = 'md',
  caption,
  className = '',
}) {
  const classes = ['saju-girl', `saju-girl-${size}`]
  if (className) classes.push(className)

  return (
    <figure className={classes.join(' ')}>
      <div className="saju-girl-frame">
        <span className="saju-girl-glow" aria-hidden="true" />
        <img src={sajuGirl} alt="사주미 소녀" className="saju-girl-img" />
      </div>
      {caption ? <figcaption className="saju-girl-caption">{caption}</figcaption> : null}
    </figure>
  )
}
