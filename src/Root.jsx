import App from './App.jsx'
import SharePage from './SharePage.jsx'
import { getShareIdFromPath } from './share'

export default function Root() {
  const shareId = getShareIdFromPath()
  if (shareId !== null) return <SharePage shareId={shareId} />
  return <App />
}
