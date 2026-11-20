// One question at a time for the personalise dialog. The API decides which questions exist (and their
// options, defaults and showIf rules); this file decides the order they are asked in and the wording
// around them. Unknown questions from the API still work: they fall back to the API's own label.
import { isVisible, isAnswered } from './questions.js'

// Facts about the home first, then improvements, then the homeowner's plans.
const SCREEN_ORDER = ['details', 'improvements', 'reason', 'agent']

// Follow-ups asked on their parent's step, in a box right under the answer that opens them
// ("Yes" → "What figure were you given?"), rather than as a step of their own.
const INLINE = new Set(['agentValuationAmount', 'improvementsOther'])
export const isInline = (q) => INLINE.has(q.key) && !!q.showIf?.key
export const followUps = (questions = [], parent, answers = {}) =>
  parent ? questions.filter((q) => isInline(q) && q.showIf.key === parent.key && isVisible(q, answers)) : []

export function questionSequence(screens = [], questions = [], answers = {}) {
  const keys = screens.map((s) => s.key)
  const order = [...SCREEN_ORDER.filter((k) => keys.includes(k)), ...keys.filter((k) => !SCREEN_ORDER.includes(k))]
  return order.flatMap((screen) => questions.filter((q) => q.screen === screen && !isInline(q) && isVisible(q, answers)))
}

const CATEGORY = { details: 'Property details', improvements: 'Recent improvements', reason: 'Your plans', agent: 'Your plans' }

const COPY = {
  propertyType: { title: 'What type of property is it?', hint: 'Choose the type that best describes your home.', error: 'Choose a property type to continue.' },
  bedrooms: { title: 'How many bedrooms does it have?', hint: 'Count every room used as a bedroom.', error: 'Choose how many bedrooms your home has.' },
  tenure: { title: 'What is the property’s tenure?', hint: 'Check the ownership type in your property documents.', error: 'Choose the property’s tenure to continue.' },
  leaseYearsRemaining: { title: 'How many years are left on the lease?', hint: 'Enter the remaining term from your lease documents.', suffix: 'years' },
  improvements: { title: 'What’s changed in the last 5 years?', hint: 'Select all the improvements made to your home, or choose “None of these”.', error: 'Select any improvements, or choose “None of these”.' },
  reason: { title: 'What brings you here?', hint: 'Tell us the context for your valuation so an adviser can understand your plans.', error: 'Choose what brings you here to continue.' },
  agentValuation: { title: 'Has an estate agent valued it in the last 3 months?', hint: 'Let an adviser know whether you already have a recent valuation to discuss.', error: 'Let us know whether an estate agent has valued the property recently.' },
  improvementsOther: { title: 'What else has been done?', hint: 'Tell us in a few words, for example a new driveway or solar panels.', placeholder: 'e.g. Solar panels', error: 'Tell us what else has been done, or untick “Other”.' },
  agentValuationAmount: { title: 'What figure were you given?', hint: 'This is shared with the agent and does not change your estimate.', prefix: '£', error: 'Enter the figure the estate agent gave you.' },
}

// A line under an option's label, where the label alone may not be enough.
const OPTION_HINTS = {
  tenure: {
    freehold: 'Ownership of the property and land.',
    leasehold: 'Ownership for the period set out in a lease.',
    share_of_freehold: 'A share in the freehold of the building.',
  },
}
export const optionHint = (q, value) => OPTION_HINTS[q.key]?.[value] || ''

const optionLabel = (q, value) => q.options?.find((o) => o.value === value)?.label

// What the property record says, phrased for the homeowner. Only shown while the answer still matches it.
function recordHint(q) {
  if (q.key === 'propertyType') {
    const label = optionLabel(q, q.default)
    return label ? `Our records show ${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label.toLowerCase()} property. Confirm this or choose another type.` : ''
  }
  if (q.key === 'bedrooms') return `Our records show ${q.default} ${q.default === 1 ? 'bedroom' : 'bedrooms'}. Change this if your home is different.`
  const label = optionLabel(q, q.default)
  return label ? `Our records show ${label.toLowerCase()}. Confirm this or choose another.` : ''
}

export function questionCopy(q, answers = {}) {
  const copy = COPY[q.key] || {}
  const matchesDefault = q.default !== null && q.default !== undefined && answers[q.key] === q.default
  let hint = copy.hint || ''
  if (matchesDefault && q.defaultSource === 'record') hint = recordHint(q) || hint
  return {
    category: CATEGORY[q.screen] || 'About your home',
    title: copy.title || q.label,
    hint,
    previous: matchesDefault && q.defaultSource === 'answer',
    prefix: copy.prefix || '',
    suffix: copy.suffix || '',
    placeholder: copy.placeholder || '',
    error: copy.error || 'Choose an answer to continue.',
  }
}

// '' when the answer can be accepted, otherwise the message to show.
export function questionError(q, value, answers = {}) {
  const copy = questionCopy(q, answers)
  if (q.type === 'multi') return Array.isArray(value) ? '' : copy.error
  if (q.type === 'number') {
    if (value === null || value === undefined || value === '') return q.optional ? '' : copy.error
    const n = Number(value)
    const min = q.min ?? 0
    const max = q.max ?? Infinity
    if (!Number.isFinite(n) || (q.integer && !Number.isInteger(n)) || n < min || n > max) {
      return max === Infinity ? `Enter a whole number of at least ${min}.` : `Enter a whole number from ${min} to ${max.toLocaleString('en-GB')}.`
    }
    return ''
  }
  if (q.type === 'text') return isAnswered(q, value) || q.optional ? '' : copy.error
  return isAnswered(q, value) || q.optional ? '' : copy.error
}

// The answer as the homeowner sees it in the review list; '' when not answered.
export function answerText(q, value) {
  if (value === null || value === undefined || value === '') return ''
  if (q.type === 'multi') return Array.isArray(value) ? (value.length ? value.map((v) => optionLabel(q, v) || v).join(', ') : 'None of these') : ''
  if (q.type === 'single') return optionLabel(q, value) || String(value)
  if (q.type === 'text') return String(value).trim()
  const copy = COPY[q.key] || {}
  const n = Number(value).toLocaleString('en-GB')
  return `${copy.prefix || ''}${n}${copy.suffix ? ` ${copy.suffix}` : ''}`
}

// "Question 2 · up to 9" while later questions may still appear or drop out, "Question 6 of 8" once
// every answer that decides that is in, "Final question" on the last step. total includes the band.
export function progressLabel({ number, total, questions = [], confirmed = new Set() }) {
  if (number >= total) return 'Final question'
  const steps = questions.filter((q) => !isInline(q))
  const deciders = new Set(steps.map((q) => q.showIf?.key).filter(Boolean))
  const known = [...deciders].every((k) => confirmed.has(k))
  return known ? `Question ${number} of ${total}` : `Question ${number} · up to ${steps.length + 1}`
}
