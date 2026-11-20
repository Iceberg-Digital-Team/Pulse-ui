// Where pages live. Each company has its own subdomain (beercocks.property-ai.co.uk); the bare domain
// and www are the Property Pulse home page. Locally, <slug>.localhost works the same way, and any other
// host (localhost, the Railway domain) also accepts /<slug> so the app can be tried without DNS.

export const SITE_DOMAIN = (import.meta.env?.VITE_SITE_DOMAIN || 'property-ai.co.uk').toLowerCase()

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/
const NOT_COMPANIES = new Set(['www'])

export const isSiteHost = (host, domain = SITE_DOMAIN) => host === domain || host === `www.${domain}`

// The company slug in the host name, or null on the home page and other hosts.
export function slugFromHost(host, domain = SITE_DOMAIN) {
  const h = String(host || '').toLowerCase()
  for (const root of [domain, 'localhost']) {
    if (!h.endsWith(`.${root}`)) continue
    const label = h.slice(0, -(root.length + 1))
    return SLUG.test(label) && !NOT_COMPANIES.has(label) ? label : null
  }
  return null
}

// A company's page as seen from the current location.
export function companyUrl(slug, loc = globalThis.location, domain = SITE_DOMAIN) {
  const { protocol, hostname, port, origin } = loc
  if (isSiteHost(hostname, domain) || hostname.endsWith(`.${domain}`)) return `https://${slug}.${domain}/`
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return `${protocol}//${slug}.localhost${port ? `:${port}` : ''}/`
  return `${origin}/${slug}`
}
