export const GA_MEASUREMENT_ID = 'G-ZZT3X1JPXL'

function canTrack() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

export function trackEvent(name, params = {}) {
  if (!canTrack() || !name) return
  window.gtag('event', name, params)
}

export function trackPageView({ path, title } = {}) {
  if (!canTrack()) return
  const pagePath = path || `${window.location.pathname}${window.location.search}`
  window.gtag('event', 'page_view', {
    page_title: title || document.title,
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
  })
}
