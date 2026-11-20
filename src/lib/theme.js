// Turns the company's branding from the Property Cockpit into CSS variables.
// Everything visual a company can change goes through here, so changing it never needs a deploy.
//
// Same model as the Neuron IV screens:
//   primaryColor → hero background, headings, main buttons      (Neuron --c-primary)
//   accentColor  → price, icons, progress, selected options      (Neuron --c-secondary)
//
// The font is the same for every company (Inter): companies change their logo, background and colours, not the font.
// Any fontFamily / headingFontFamily still stored on a company is ignored.

const FONT_STACK = "'Inter', system-ui, sans-serif"
export const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'

const HEX = /^#[0-9a-f]{6}$/i
const INK = '#14171F'

const RADIUS = 8

export const DEFAULT_BRANDING = {
  primaryColor: '#1E3A8A',
  accentColor: null,
  backgroundColor: null,
  backgroundImageUrl: null,
  backgroundOverlay: 0.5,
  logoUrl: null,
  faviconUrl: null,
}

// WCAG relative luminance
export function luminance(hex) {
  const h = HEX.test(hex || '') ? hex.slice(1) : 'FFFFFF'
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

// Text colour that reads on a given background.
export const inkOn = (bg) => (contrast(bg, '#FFFFFF') >= contrast(bg, INK) ? '#FFFFFF' : INK)

// A brand colour used as text on white: kept when readable (large text, 3:1), else dark ink.
export const textOnWhite = (color) => (contrast(color, '#FFFFFF') >= 3 ? color : INK)

const API_BASE = (import.meta.env?.VITE_API_URL || '').replace(/\/+$/, '')
const ASSET_PATH = /^\/api\/public\/assets\/[0-9a-f]{24}$/

// Images are either https URLs or uploaded through the cockpit (stored as a path on the API).
export const resolveAsset = (url, apiBase = API_BASE) => {
  if (typeof url !== 'string') return null
  if (ASSET_PATH.test(url)) return `${apiBase}${url}`
  try {
    return new URL(url).protocol === 'https:' ? url : null
  } catch {
    return null
  }
}
const safeUrl = (url) => resolveAsset(url)

export function themeVars(branding = {}) {
  const b = { ...DEFAULT_BRANDING, ...Object.fromEntries(Object.entries(branding).filter(([, v]) => v !== null && v !== undefined)) }
  const primary = HEX.test(b.primaryColor) ? b.primaryColor : DEFAULT_BRANDING.primaryColor
  const accent = HEX.test(b.accentColor || '') ? b.accentColor : primary
  const heroBg = HEX.test(b.backgroundColor || '') ? b.backgroundColor : primary
  const image = safeUrl(b.backgroundImageUrl)
  const overlay = Math.min(Math.max(Number(b.backgroundOverlay) || 0, 0), 0.8)

  // On an image the text sits on the darkened photo, so it is white unless the overlay is weak.
  const heroInk = image ? (overlay >= 0.25 ? '#FFFFFF' : inkOn(heroBg)) : inkOn(heroBg)

  return {
    '--brand': primary,
    '--brand-ink': inkOn(primary),
    '--brand-text': textOnWhite(primary),
    '--accent': accent,
    '--accent-ink': inkOn(accent),
    '--accent-text': textOnWhite(accent),
    '--hero-bg': heroBg,
    '--hero-ink': heroInk,
    '--hero-image': image ? `url("${image.replace(/"/g, '%22')}")` : 'none',
    '--hero-overlay': image ? String(overlay) : '0',
    '--font': FONT_STACK,
    '--font-heading': FONT_STACK,
    '--radius': `${RADIUS}px`, // same corners for every company (not a branding setting)
  }
}

// Applies the theme to the document: variables, font, title and favicon.
export function applyTheme(config) {
  const root = document.documentElement
  for (const [k, v] of Object.entries(themeVars(config?.branding))) root.style.setProperty(k, v)

  let fontLink = document.getElementById('pulse-font')
  if (!fontLink) {
    fontLink = Object.assign(document.createElement('link'), { id: 'pulse-font', rel: 'stylesheet' })
    document.head.appendChild(fontLink)
  }
  if (fontLink.href !== FONT_HREF) fontLink.href = FONT_HREF

  document.title = config?.content?.pageTitle || (config?.name ? `${config.name} · Instant valuation` : 'Instant valuation')

  const favicon = safeUrl(config?.branding?.faviconUrl)
  let icon = document.getElementById('pulse-favicon')
  if (favicon) {
    if (!icon) {
      icon = Object.assign(document.createElement('link'), { id: 'pulse-favicon', rel: 'icon' })
      document.head.appendChild(icon)
    }
    icon.href = favicon
  } else if (icon) {
    icon.remove()
  }
}
