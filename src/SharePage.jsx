import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import SajuChartCard from './SajuChartCard'
import SajuGirl from './SajuGirl'
import { getGenre } from './genres'
import { fetchSharedReading, homeFromSharePath } from './share'
import './App.css'

function ShareInvite({ genreId, selfName }) {
  const href = homeFromSharePath(genreId)

  return (
    <section className="share-invite">
      <SajuGirl size="sm" />
      <p className="share-invite-kicker">친구 사주를 다 읽었다면</p>
      <h2 className="share-invite-title">나도 사주 보러가기</h2>
      <p className="share-invite-lead">
        {selfName
          ? `${selfName}의 사주를 봤다면, 내 명식도 한 번 펼쳐 보세요.`
          : '생년월일만 있으면 바로 읽어 드려요.'}
      </p>
      <a className="analyze-btn share-invite-btn" href={href}>
        나도 사주 보러가기
      </a>
    </section>
  )
}

export default function SharePage({ shareId }) {
  const [share, setShare] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setShare(null)

    if (!shareId) {
      setError('이 공유 링크를 찾을 수 없어요.')
      setLoading(false)
      return
    }

    fetchSharedReading(shareId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setError('이 공유 링크를 찾을 수 없어요.')
          return
        }
        setShare(row)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setError('사주를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [shareId])

  const genre = getGenre(share?.genre_id || 'life')
  const headline = share
    ? `${share.self_name}${share.partner_name ? ` · ${share.partner_name}` : ''}`
    : '사주미'
  const homeHref = homeFromSharePath(share?.genre_id)

  useEffect(() => {
    const previous = document.title
    document.title = share
      ? `${headline}의 ${genre.label} | 사주미`
      : '공유된 사주 | 사주미'
    return () => {
      document.title = previous
    }
  }, [share, headline, genre.label])

  return (
    <div className="page share-page">
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />
      <div className="mist" aria-hidden="true" />

      <header className="share-topbar">
        <a className="share-brand" href={homeHref}>
          사주미
        </a>
        <a className="share-home-link" href={homeHref}>
          나도 사주 보러가기
        </a>
      </header>

      <main className="shell">
        {loading && (
          <section className="reading skeleton-reading" aria-busy="true">
            <h2 className="reading-title">공유된 사주</h2>
            <p className="skeleton-status">명식을 펼치는 중이에요!</p>
            <div className="skeleton-lines">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={`skeleton-line ${i % 3 === 2 ? 'short' : i % 2 === 0 ? 'long' : 'mid'}`}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && error && (
          <section className="reading share-missing">
            <SajuGirl size="md" />
            <h1 className="headline">링크를 찾지 못했어요</h1>
            <p className="sub">{error}</p>
            <a className="analyze-btn share-invite-btn" href={homeFromSharePath()}>
              나도 사주 보러가기
            </a>
          </section>
        )}

        {!loading && share && (
          <div className="view-stack">
            <header className="hero hero-view">
              <div className="hero-copy">
                <p className="brand">사주미</p>
                <h1 className="headline">{headline}</h1>
                <p className="sub-lead">{genre.label}</p>
                <p className="sub">{share.self_byline}</p>
                {share.partner_byline ? <p className="sub">{share.partner_byline}</p> : null}
              </div>
            </header>

            {Array.isArray(share.chart_views) && share.chart_views.length > 0 && (
              <section className="reading chart-reading">
                <h2 className="reading-title">사주 명식</h2>
                <div className="chart-cards">
                  {share.chart_views.map((item, index) => (
                    <SajuChartCard
                      key={item.label || `chart-${index}`}
                      label={item.label}
                      view={item.view}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="reading result-reading">
              <div className="result-head">
                <SajuGirl size="sm" />
                <p className="result-voice">친구가 보낸 사주예요. 감정은 빼고, 적힌 그대로 보여 줄게요.</p>
              </div>
              <h2 className="reading-title">{genre.label} 해석</h2>
              <p className="result-byline">
                {share.self_byline}
                {share.partner_byline ? `  |  ${share.partner_byline}` : ''}
              </p>
              <div className="markdown result-md">
                <Markdown>{share.result_text}</Markdown>
              </div>
            </section>

            <ShareInvite genreId={share.genre_id} selfName={share.self_name} />
          </div>
        )}
      </main>

      {!loading && (
        <a className="share-sticky-cta" href={homeHref}>
          나도 사주 보러가기
        </a>
      )}
    </div>
  )
}
