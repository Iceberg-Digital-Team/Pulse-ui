// Phone numbers with a country, as on Neuron (NcPhoneInput): the homeowner picks a country and types
// the number the way they know it; the API receives E.164 (+447123456789).
import { getCountries, getCountryCallingCode, isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js'

export const DEFAULT_COUNTRY = 'GB'
// Shown first, in this order, then every other country A–Z (same list as Neuron).
export const PRIORITY_COUNTRIES = ['GB', 'IE', 'US', 'AU', 'CA', 'NZ', 'ZA', 'FR', 'DE', 'ES', 'IT']

const regionName = (() => {
  try {
    const names = new Intl.DisplayNames(['en-GB'], { type: 'region' })
    return (code) => names.of(code) || code
  } catch {
    return (code) => code
  }
})()

const ALL = getCountries()
  .map((code) => ({ code, name: regionName(code), dialCode: `+${getCountryCallingCode(code)}` }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'))
const BY_CODE = new Map(ALL.map((c) => [c.code, c]))

export const country = (code) => BY_CODE.get(code) || BY_CODE.get(DEFAULT_COUNTRY)
export const PRIORITY = PRIORITY_COUNTRIES.map(country)
export const OTHERS = ALL.filter((c) => !PRIORITY_COUNTRIES.includes(c.code))

// Matches the name, the dial code or the ISO code; "turkey"/"turkiye" both find Türkiye.
export function searchCountries(query) {
  const q = query.trim().toLowerCase().replace(/^\+/, '')
  if (!q) return null
  return ALL.filter((c) =>
    c.name.toLowerCase().includes(q) ||
    c.dialCode.slice(1).startsWith(q) ||
    c.code.toLowerCase() === q ||
    (c.code === 'TR' && ('turkiye'.startsWith(q) || 'turkey'.startsWith(q))))
}

// What we send: E.164 when the number is valid for the country, else the dial code + digits typed
// (so validation can still explain what's wrong).
export function toE164(national, code) {
  const typed = String(national || '').trim()
  if (!typed) return ''
  const parsed = parsePhoneNumberFromString(typed, code)
  if (parsed?.isValid()) return parsed.format('E.164')
  return `${country(code).dialCode}${typed.replace(/\D/g, '').replace(/^0+/, '')}`
}

// A stored E.164 value back into country + national number (for when the form is shown again).
export function fromE164(value) {
  const parsed = value?.startsWith('+') ? parsePhoneNumberFromString(value) : null
  return parsed?.country ? { code: parsed.country, national: parsed.formatNational() } : null
}

export const isValidPhone = (value) => !!value && isValidPhoneNumber(value)
