import { useEffect } from 'react'
import App from '@/app/App.jsx'
import SharePage from '@/components/share/SharePage.jsx'
import { trackEvent } from '@/lib/analytics'
import { getShareIdFromPath } from '@/lib/share'
import '@/styles/app.css'

export default function Root() {
  const shareId = getShareIdFromPath()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('from') === 'share') {
      trackEvent('share_landing', {
        genre_id: params.get('genre') || '',
      })
    }
  }, [])

  if (shareId !== null) return <SharePage shareId={shareId} />
  return <App />
}
