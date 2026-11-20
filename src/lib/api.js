const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const API_KEY = import.meta.env.VITE_API_KEY || ''

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// Messages a homeowner can act on; the API's own text is for developers.
const friendly = (status, fallback) => {
  if (status === 429) return 'Lots of people are valuing homes right now. Please wait a minute and try again.'
  if (status === 403) return fallback || 'This service is not available right now.'
  if (status >= 500 || !status) return 'Something went wrong on our side. Please try again.'
  return fallback || 'Something went wrong. Please try again.'
}

async function request(path, { method = 'GET', body, company, headers = {} } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
        // The API works out the company from this; we never send company_id ourselves.
        ...(company ? { 'X-Company': company } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('We could not reach the valuation service. Check your connection and try again.', 0)
  }

  const json = await res.json().catch(() => null)
  if (!res.ok || json?.success === false) {
    throw new ApiError(friendly(res.status, json?.error), res.status)
  }
  return json?.data
}

export const api = {
  config: (slug) => request(`/api/public/companies/${encodeURIComponent(slug)}/config`),

  searchAddresses: (company, postcode) =>
    request(`/api/addresses?postcode=${encodeURIComponent(postcode)}`, { company }),

  property: (company, uprn) => request(`/api/addresses/${encodeURIComponent(uprn)}`, { company }),

  // Fire and forget: warms the valuation while the homeowner fills in the contact form.
  prewarm: (company, uprn, valuationType) =>
    request('/api/valuations/compute', {
      method: 'POST',
      company,
      body: { selectedPropertyUPRN: uprn, valuationType },
    }).catch(() => null),

  createLead: (company, lead) => request('/api/valuations', { method: 'POST', company, body: lead }),

  // A saved report, for the shareable /<valuation id> page. The API never returns contact details here.
  report: (company, valuationId) => request(`/api/valuations/${encodeURIComponent(valuationId)}`, { company }),

  // preferredDate: [{ monday: [{ start_hour: '09.00', end_hour: '10.00' }] }], as Neuron sends it.
  // contact: the details confirmed on the expert form ({ firstName, lastName, email, phone }).
  confirm: (company, valuationId, preferredDate, contact = {}) =>
    request(`/api/valuations/${valuationId}/confirm`, {
      method: 'PATCH',
      company,
      body: { valuationConfirmed: true, preferredDate, ...contact },
    }),

  // How many of the agency's LS applicants match this home: { available, count, searchType, bedroom, price }.
  // Never throws: null (or available: false) just means the card is not shown.
  applicantMatches: (company, valuationId) =>
    request(`/api/valuations/${valuationId}/applicant-matches`, { company }).catch(() => null),

  personaliseQuestions: (company, valuationId) =>
    request(`/api/valuations/${valuationId}/personalise/questions`, { company }),

  priceBands: (company, valuationId, answers) =>
    request(`/api/valuations/${valuationId}/personalise/price-bands`, { method: 'POST', company, body: { answers } }),

  personalise: (company, valuationId, answers, priceBand) =>
    request(`/api/valuations/${valuationId}/personalise`, {
      method: 'POST',
      company,
      body: { answers, priceBand: priceBand || null },
    }),

  // The estimate the homeowner keeps for their report ('instant' | 'personalised'). Saved on the
  // report only; it is not sent to the agency's CRM.
  chooseEstimate: (company, valuationId, kind) =>
    request(`/api/valuations/${valuationId}/estimate-choice`, { method: 'PATCH', company, body: { kind } }),
}
