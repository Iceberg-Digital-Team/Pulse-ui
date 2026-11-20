// Talking to the page that hosts us in an iframe:
//  - embed.js on an agency's site: we report our height so the iframe never scrolls
//  - the Property Cockpit: it sends the draft config for a live preview (no publish needed)

const COCKPIT_ORIGINS = (import.meta.env.VITE_COCKPIT_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Local development only: a cockpit on any localhost port may drive the preview, so running the
// dashboard on another port (3031, …) doesn't silently break it. Production builds use the list above.
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
const isCockpitOrigin = (origin) => COCKPIT_ORIGINS.includes(origin) || (import.meta.env.DEV && LOCAL_ORIGIN.test(origin))

export const inIframe = () => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

export function reportHeight() {
  if (!inIframe()) return () => {}
  let last = 0
  const send = () => {
    // The body's own height: documentElement.scrollHeight never drops below the iframe's current
    // height, so the frame could grow but never shrink back.
    const height = Math.ceil(document.body.getBoundingClientRect().height)
    if (height !== last) {
      last = height
      window.parent.postMessage({ type: 'pulse:height', height }, '*')
    }
  }
  const observer = new ResizeObserver(send)
  observer.observe(document.body)
  send()
  return () => observer.disconnect()
}

// Calls onConfig({ branding, content, features, name }) whenever the cockpit sends a draft.
export function listenForPreview(onConfig) {
  const handler = (event) => {
    if (!isCockpitOrigin(event.origin)) return
    if (event.data?.type === 'pulse:preview-config' && event.data.config) onConfig(event.data.config)
  }
  window.addEventListener('message', handler)
  if (inIframe()) window.parent.postMessage({ type: 'pulse:preview-ready' }, '*')
  return () => window.removeEventListener('message', handler)
}
