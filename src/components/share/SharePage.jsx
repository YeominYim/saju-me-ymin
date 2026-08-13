import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import PageBackdrop from '@/components/ui/PageBackdrop'
import SajuGirl from '@/components/ui/SajuGirl'
import ChartSection from '@/components/reading/ChartSection'
import ReadingSkeleton from '@/components/reading/ReadingSkeleton'
import ShareInvite from '@/components/share/ShareInvite'
import { trackEvent } from '@/lib/analytics'
import { getGenre } from '@/lib/genres'
import { fetchSharedReading, homeFromSharePath } from '@/lib/share'

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
        trackEvent('view_share', {
          genre_id: row.genre_id || '',
        })
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
      <PageBackdrop />

      <header className="share-topbar">
        <a className="share-brand" href={homeHref}>
          사주미
        </a>
        <a
          className="share-home-link"
          href={homeHref}
          onClick={() => trackEvent('share_cta', { placement: 'topbar' })}
        >
          나도 사주 보러가기
        </a>
      </header>

      <main className="shell">
        {loading && (
          <ReadingSkeleton
            title="공유된 사주"
            lines={6}
            status="명식을 펼치는 중이에요!"
          />
        )}

        {!loading && error && (
          <section className="reading share-missing">
            <SajuGirl size="md" />
            <h1 className="headline">링크를 찾지 못했어요</h1>
            <p className="sub">{error}</p>
            <a
              className="analyze-btn share-invite-btn"
              href={homeFromSharePath()}
              onClick={() => trackEvent('share_cta', { placement: 'missing' })}
            >
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

            <ChartSection chartViews={share.chart_views} />

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
        <a
          className="share-sticky-cta"
          href={homeHref}
          onClick={() =>
            trackEvent('share_cta', {
              placement: 'sticky',
              genre_id: share?.genre_id || '',
            })
          }
        >
          나도 사주 보러가기
        </a>
      )}
    </div>
  )
}
