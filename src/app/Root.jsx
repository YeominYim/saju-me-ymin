import App from '@/app/App.jsx'
import SharePage from '@/components/share/SharePage.jsx'
import { getShareIdFromPath } from '@/lib/share'
import '@/styles/app.css'

export default function Root() {
  const shareId = getShareIdFromPath()
  if (shareId !== null) return <SharePage shareId={shareId} />
  return <App />
}
