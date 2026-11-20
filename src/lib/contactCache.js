// Remembers the homeowner's contact details for this browser tab, so they are not typed twice:
// the contact step and the expert valuation form are filled from here. sessionStorage, not
// localStorage: personal details are cleared when the tab is closed. Kept per company.
const key = (company) => `pulse:contact:${company}`
const FIELDS = ['firstName', 'lastName', 'email', 'phone']

export function loadContact(company) {
  try {
    const data = JSON.parse(sessionStorage.getItem(key(company)) || 'null')
    return data && typeof data === 'object' ? Object.fromEntries(FIELDS.map((f) => [f, typeof data[f] === 'string' ? data[f] : ''])) : null
  } catch {
    return null
  }
}

export function saveContact(company, contact) {
  try {
    sessionStorage.setItem(key(company), JSON.stringify(Object.fromEntries(FIELDS.map((f) => [f, String(contact[f] || '').trim()]))))
  } catch {
    // storage blocked (private mode, embedded): the form still works, it just isn't remembered
  }
}
