// Personalise questions come from the API (GET /personalise/questions). This decides which are
// shown and shapes the answers the API expects: { property: {...}, lead: {...} }.

export const isVisible = (question, answers) => {
  const rule = question.showIf
  if (!rule) return true
  const value = answers[rule.key]
  // A multi answer matches when any of its choices does (e.g. improvements including "other").
  const hits = (list) => (Array.isArray(value) ? value.some((v) => list.includes(v)) : list.includes(value))
  if (rule.in) return hits(rule.in)
  if (rule.notIn) return !hits(rule.notIn)
  return true
}

export const isAnswered = (question, value) => {
  if (question.type === 'multi') return Array.isArray(value)
  if (question.type === 'text') return typeof value === 'string' && value.trim() !== ''
  return value !== undefined && value !== null && value !== ''
}

// Screens that have at least one visible question, each with its visible questions.
export function visibleScreens(screens, questions, answers) {
  return screens
    .map((screen) => ({ ...screen, questions: questions.filter((q) => q.screen === screen.key && isVisible(q, answers)) }))
    .filter((s) => s.questions.length)
}

export const screenComplete = (screen, answers) =>
  screen.questions.every((q) => q.optional || isAnswered(q, answers[q.key]))

// Hidden questions are dropped, so an answer to a question that no longer applies isn't sent.
export function buildAnswers(questions, answers) {
  const out = { property: {}, lead: {} }
  for (const q of questions) {
    if (!isVisible(q, answers)) continue
    let value = answers[q.key]
    if (!isAnswered(q, value)) continue
    if (q.type === 'number') {
      value = Number(value)
      if (!Number.isFinite(value)) continue
      if (q.integer) value = Math.round(value)
    }
    if (q.type === 'text') value = value.trim()
    out[q.target][q.key] = value
  }
  return out
}

// The API sends each question's default (earlier answer or the property record).
export const initialAnswers = (questions) =>
  Object.fromEntries(questions.filter((q) => q.default !== null && q.default !== undefined).map((q) => [q.key, q.default]))
