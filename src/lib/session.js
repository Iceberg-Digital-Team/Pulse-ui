// What survives a refresh, as on Neuron:
// - the wizard (step, sale/lettings, picked address) per company, so a refresh doesn't start over;
// - who made a valuation, and their personalise answers so far.
// The result itself lives at its own URL (/<valuation id>) and is loaded from the API, with the
// estimate the homeowner chose for it (estimateChoice).
// Contact details are kept separately, for the tab only (contactCache.js).
// Storage can be blocked (private mode, some embeds): then nothing is remembered and the page still works.

const WIZARD = (company) => `pulse:wizard:${company}`
const STEPS = ['postcode', 'contact']

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}
function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage blocked
  }
}

export function loadWizard(company) {
  const w = read(WIZARD(company))
  if (!w || typeof w !== 'object' || !STEPS.includes(w.step)) return null
  const address = w.address && typeof w.address === 'object' && w.address.uprn ? w.address : null
  return {
    // the contact step needs an address; without one the homeowner is back at the postcode
    step: w.step === 'contact' && !address ? 'postcode' : w.step,
    valuationType: w.valuationType === 'lettings' ? 'lettings' : 'selling',
    typeChosen: !!w.typeChosen,
    address,
  }
}

export function saveWizard(company, { step, valuationType, typeChosen, address }) {
  const blank = step === 'postcode' && !typeChosen && !address
  write(WIZARD(company), blank ? null : { step, valuationType, typeChosen, address: address || null })
}

export const clearWizard = (company) => write(WIZARD(company), null)

// The browser that made a valuation owns it: only there can the answers be given or changed.
// Someone opening a shared result sees the estimates but can't overwrite the homeowner's answers.
const OWNER = (valuationId) => `pulse:own:${valuationId}`
export const markOwner = (valuationId) => valuationId && write(OWNER(valuationId), true)
export const isOwner = (valuationId) => !!valuationId && read(OWNER(valuationId)) === true

// Personalise answers given so far, so a refresh mid-way continues where the homeowner was.
const DRAFT = (valuationId) => `pulse:draft:${valuationId}`
export function loadDraft(valuationId) {
  const d = valuationId ? read(DRAFT(valuationId)) : null
  if (!d || typeof d !== 'object' || typeof d.answers !== 'object' || !Array.isArray(d.confirmed)) return null
  return { answers: d.answers || {}, confirmed: d.confirmed.filter((k) => typeof k === 'string'), currentKey: d.currentKey || null, band: d.band || null }
}
export const saveDraft = (valuationId, draft) => valuationId && write(DRAFT(valuationId), draft)
export const clearDraft = (valuationId) => valuationId && write(DRAFT(valuationId), null)
