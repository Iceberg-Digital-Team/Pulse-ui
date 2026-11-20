const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })

export const money = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? gbp.format(Number(n)) : '—')

// Short form for price bands: £325k, £1.25m
export const moneyShort = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  if (v >= 1_000_000) return `£${+(v / 1_000_000).toFixed(2)}m`
  if (v >= 1_000) return `£${Math.round(v / 1_000)}k`
  return `£${v}`
}

export const distance = (m) => {
  if (!Number.isFinite(Number(m))) return ''
  const miles = Number(m) / 1609.34
  return miles < 0.1 ? `${Math.round(Number(m))} m away` : `${miles.toFixed(1)} miles away`
}

export const monthYear = (d) => {
  const date = d ? new Date(d) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ''
}

// UK postcode, loosely: the API does the real lookup.
export const looksLikePostcode = (s) => /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(String(s || '').trim())

export const normalisePostcode = (s) => {
  const p = String(s || '').toUpperCase().replace(/\s+/g, '')
  return p.length > 3 ? `${p.slice(0, -3)} ${p.slice(-3)}` : p
}

// 15 Dec 2025
export const fullDate = (d) => {
  const date = d ? new Date(d) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

// "Sold 22 May 2026" / "Listed 15 Dec 2025"
export const comparableDate = (status, d) => {
  const when = fullDate(d)
  if (!when) return ''
  return `${status === 'sold' ? 'Sold' : status === 'sold_stc' ? 'Sold STC' : 'Listed'} ${when}`
}

export const COMP_STATUS ={ sold: 'Sold', sold_stc: 'Sold STC', for_sale: 'For sale' }

// Floor area is stored in square metres; homeowners in the UK read square feet.
export const SQFT_PER_SQM = 10.7639
export function formatArea(sqm) {
  const v = Number(sqm)
  if (!(v > 0)) return null
  return `${Math.round(v * SQFT_PER_SQM).toLocaleString('en-GB')} sq ft`
}
