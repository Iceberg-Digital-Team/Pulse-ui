import test from 'node:test'
import assert from 'node:assert/strict'
import { themeVars, inkOn, contrast, resolveAsset } from './theme.js'
import { visibleScreens, screenComplete, buildAnswers, initialAnswers } from './questions.js'
import { looksLikePostcode, normalisePostcode, moneyShort, formatArea } from './format.js'
import { slugFromHost, isSiteHost, companyUrl } from './site.js'

test('theme: defaults when branding is empty (hero and accent fall back to the primary colour)', () => {
  const v = themeVars({})
  assert.equal(v['--brand'], '#1E3A8A')
  assert.equal(v['--brand-ink'], '#FFFFFF')
  assert.equal(v['--accent'], '#1E3A8A')
  assert.equal(v['--hero-bg'], '#1E3A8A')
  assert.equal(v['--hero-ink'], '#FFFFFF')
  assert.equal(v['--hero-image'], 'none')
  assert.match(v['--font'], /Inter/)
  assert.equal(v['--font-heading'], v['--font'])
})

test('theme: light brand colours are not used as text on white', () => {
  const v = themeVars({ primaryColor: '#13294B', accentColor: '#FDE047' })
  assert.equal(v['--brand-text'], '#13294B')
  assert.equal(v['--accent-text'], '#14171F') // yellow price text would be unreadable
  assert.equal(v['--accent-ink'], '#14171F')
})

test('assets: uploaded paths are served from the API, other values must be https', () => {
  const id = 'a'.repeat(24)
  assert.equal(resolveAsset(`/api/public/assets/${id}`, 'https://api.example'), `https://api.example/api/public/assets/${id}`)
  assert.equal(resolveAsset('https://cdn.example/x.jpg'), 'https://cdn.example/x.jpg')
  assert.equal(resolveAsset('http://cdn.example/x.jpg'), null)
  assert.equal(resolveAsset('/api/public/assets/../secret'), null)
  assert.equal(resolveAsset(null), null)
})

test('theme: the font is the same for every company; stored font choices are ignored', () => {
  const v = themeVars({ fontFamily: 'DM Sans', headingFontFamily: 'Playfair Display' })
  assert.match(v['--font'], /Inter/)
  assert.equal(v['--font-heading'], v['--font'])
})

test('theme: button text stays readable on light and dark brand colours', () => {
  assert.equal(inkOn('#FDE047'), '#14171F') // yellow → dark text
  assert.equal(inkOn('#0F766E'), '#FFFFFF') // teal → white text
  for (const c of ['#FDE047', '#0F766E', '#B45309', '#FFFFFF', '#000000', '#7C3AED']) {
    assert.ok(contrast(c, inkOn(c)) >= 4.5, `${c} needs readable text`)
  }
})

test('theme: background image with overlay forces light text; unsafe values are ignored', () => {
  const v = themeVars({ backgroundColor: '#FFFFFF', backgroundImageUrl: 'https://cdn.example/a.jpg', backgroundOverlay: 0.4 })
  assert.equal(v['--hero-image'], 'url("https://cdn.example/a.jpg")')
  assert.equal(v['--hero-ink'], '#FFFFFF')
  assert.equal(v['--hero-overlay'], '0.4')

  const light = themeVars({ backgroundColor: '#FFFFFF' })
  assert.equal(light['--hero-ink'], '#14171F')
  assert.equal(light['--hero-overlay'], '0') // no image, no darkening

  const bad = themeVars({ backgroundImageUrl: 'javascript:alert(1)', primaryColor: 'red', fontFamily: 'Comic Sans', backgroundOverlay: 5 })
  assert.equal(bad['--hero-image'], 'none')
  assert.equal(bad['--brand'], '#1E3A8A')
  assert.match(bad['--font'], /Inter/)

  const strong = themeVars({ backgroundImageUrl: 'https://cdn.example/a.jpg', backgroundOverlay: 5 })
  assert.equal(strong['--hero-overlay'], '0.8')
})

const SCREENS = [{ key: 'reason', label: 'Why' }, { key: 'details', label: 'Details' }, { key: 'agent', label: 'Agent' }]
const QUESTIONS = [
  { key: 'reason', screen: 'reason', target: 'lead', type: 'single' },
  { key: 'alsoBuying', screen: 'reason', target: 'lead', type: 'single', showIf: { key: 'reason', in: ['selling'] } },
  { key: 'bedrooms', screen: 'details', target: 'property', type: 'number', integer: true, default: 3 },
  { key: 'improvements', screen: 'details', target: 'property', type: 'multi', optional: true },
  { key: 'agentValuation', screen: 'agent', target: 'lead', type: 'single', showIf: { key: 'reason', in: ['selling'] } },
]

test('questions: conditional questions and whole screens hide', () => {
  const curious = visibleScreens(SCREENS, QUESTIONS, { reason: 'curious' })
  assert.deepEqual(curious.map((s) => s.key), ['reason', 'details'])
  assert.deepEqual(curious[0].questions.map((q) => q.key), ['reason'])

  const selling = visibleScreens(SCREENS, QUESTIONS, { reason: 'selling' })
  assert.deepEqual(selling.map((s) => s.key), ['reason', 'details', 'agent'])
})

test('questions: optional questions do not block, required ones do', () => {
  const [, details] = visibleScreens(SCREENS, QUESTIONS, { reason: 'curious', bedrooms: 3 })
  assert.equal(screenComplete(details, { bedrooms: 3 }), true)
  assert.equal(screenComplete(details, {}), false)
})

test('questions: answers are split by target and hidden ones are dropped', () => {
  const answers = { ...initialAnswers(QUESTIONS), reason: 'curious', alsoBuying: 'yes', improvements: ['kitchen'], bedrooms: '4' }
  assert.deepEqual(buildAnswers(QUESTIONS, answers), {
    property: { bedrooms: 4, improvements: ['kitchen'] },
    lead: { reason: 'curious' },
  })
})

test('format: postcodes and short money', () => {
  assert.ok(looksLikePostcode('en91ab'))
  assert.ok(looksLikePostcode('SW1A 1AA'))
  assert.ok(!looksLikePostcode('hello'))
  assert.equal(normalisePostcode('sw1a1aa'), 'SW1A 1AA')
  assert.equal(moneyShort(325000), '£325k')
  assert.equal(moneyShort(1250000), '£1.25m')
})

import { availableDays, slotsForDay, toggleSlot, toPreferredDate, orderedSelection, ALL_DAYS, ALL_SLOTS } from './schedule.js'

test('schedule: without opening hours every day and slot is offered', () => {
  assert.deepEqual(availableDays(null), ALL_DAYS)
  assert.deepEqual(slotsForDay(null, 'Monday'), ALL_SLOTS)
})

test('schedule: closed days are hidden and slots are exactly the company\'s own hours', () => {
  const hours = { monday: '9:00 - 17:30', tuesday: '09:30 - 13:00', saturday: '9:00 - 12:30', sunday: 'Closed' }
  assert.deepEqual(availableDays(hours), ['Monday', 'Tuesday', 'Saturday'])
  assert.equal(slotsForDay(hours, 'Monday')[0], '09:00 - 10:00')
  assert.equal(slotsForDay(hours, 'Monday').at(-1), '17:00 - 17:30') // ends at closing time, not 18:00
  assert.deepEqual(slotsForDay(hours, 'Tuesday'), ['09:30 - 10:30', '10:30 - 11:30', '11:30 - 12:30', '12:30 - 13:00'])
  assert.deepEqual(slotsForDay(hours, 'Saturday'), ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '12:00 - 12:30'])
  assert.deepEqual(slotsForDay({ monday: 'by appointment' }, 'Monday'), ALL_SLOTS)
  assert.deepEqual(slotsForDay({ monday: '18:00 - 09:00' }, 'Monday'), ALL_SLOTS) // unreadable → default
})

test('schedule: Sunday is never offered', () => {
  assert.ok(!availableDays(null).includes('Sunday'))
  assert.ok(!availableDays({ saturday: '9:00 - 13:00', sunday: '10:00 - 14:00' }).includes('Sunday'))
})

test('schedule: toggling keeps time order and drops empty days', () => {
  let s = toggleSlot({}, 'Friday', '14:00 - 15:00')
  s = toggleSlot(s, 'Friday', '09:00 - 10:00')
  s = toggleSlot(s, 'Monday', '10:00 - 11:00')
  assert.deepEqual(s.Friday, ['09:00 - 10:00', '14:00 - 15:00'])
  assert.deepEqual(orderedSelection(s).map((x) => x.day), ['Monday', 'Friday'])
  assert.equal(toggleSlot(s, 'Monday', '10:00 - 11:00').Monday, undefined)
  // half-hour slots from a company's own hours keep their place too
  let h = toggleSlot({}, 'Monday', '17:00 - 17:30')
  h = toggleSlot(h, 'Monday', '09:30 - 10:30')
  assert.deepEqual(h.Monday, ['09:30 - 10:30', '17:00 - 17:30'])
  assert.deepEqual(toPreferredDate(h), [{ monday: [{ start_hour: '09.30', end_hour: '10.30' }, { start_hour: '17.00', end_hour: '17.30' }] }])
})

test('schedule: preferredDate uses the Neuron format', () => {
  assert.equal(toPreferredDate({}), null)
  assert.deepEqual(toPreferredDate({ Tuesday: ['09:00 - 10:00', '13:00 - 14:00'] }), [
    { tuesday: [{ start_hour: '09.00', end_hour: '10.00' }, { start_hour: '13.00', end_hour: '14.00' }] },
  ])
})

test('format: floor area is stored in square metres and shown in square feet', () => {
  assert.equal(formatArea(80), '861 sq ft')
  assert.equal(formatArea(150), '1,615 sq ft')
  assert.equal(formatArea(null), null)
  assert.equal(formatArea('x'), null)
})

test('phone: numbers are sent as E.164 for the chosen country', async () => {
  const { toE164, fromE164, isValidPhone, PRIORITY, searchCountries } = await import('./phone.js')
  assert.equal(toE164('07123 456789', 'GB'), '+447123456789')
  assert.equal(toE164('(201) 555-0123', 'US'), '+12015550123')
  assert.equal(toE164('0532 123 45 67', 'TR'), '+905321234567')
  assert.equal(toE164('', 'GB'), '')
  assert.equal(isValidPhone('+447123456789'), true)
  assert.equal(isValidPhone(toE164('0712', 'GB')), false)
  assert.equal(isValidPhone(toE164('12345', 'FR')), false)
  assert.deepEqual(fromE164('+447123456789'), { code: 'GB', national: '07123 456789' })
  assert.equal(PRIORITY[0].code, 'GB')
  assert.equal(PRIORITY[0].dialCode, '+44')
  assert.ok(searchCountries('turk').some((c) => c.code === 'TR'))
  assert.ok(searchCountries('+353').some((c) => c.code === 'IE'))
  assert.equal(searchCountries('  '), null)
})

import { questionSequence, questionCopy, questionError } from './personalise.js'

const P_SCREENS = [{ key: 'reason' }, { key: 'details' }, { key: 'improvements' }, { key: 'agent' }]
const P_QUESTIONS = [
  { key: 'reason', screen: 'reason', type: 'single', options: [{ value: 'selling', label: "I'm thinking of selling" }] },
  { key: 'propertyType', screen: 'details', type: 'single', options: [{ value: 'end-terrace', label: 'End of terrace' }], default: 'end-terrace', defaultSource: 'record' },
  { key: 'bedrooms', screen: 'details', type: 'number', integer: true, min: 0, max: 10, default: 3, defaultSource: 'record' },
  { key: 'tenure', screen: 'details', type: 'single', options: [] },
  { key: 'leaseYearsRemaining', screen: 'details', type: 'number', integer: true, min: 0, max: 999, optional: true, showIf: { key: 'tenure', in: ['leasehold'] } },
  { key: 'improvements', screen: 'improvements', type: 'multi', optional: true },
  { key: 'agentValuation', screen: 'agent', type: 'single', showIf: { key: 'reason', in: ['selling'] } },
]

test('personalise: property facts are asked first, one question at a time, follow-ups only when they apply', () => {
  assert.deepEqual(questionSequence(P_SCREENS, P_QUESTIONS, {}).map((q) => q.key), ['propertyType', 'bedrooms', 'tenure', 'improvements', 'reason'])
  assert.deepEqual(
    questionSequence(P_SCREENS, P_QUESTIONS, { tenure: 'leasehold', reason: 'selling' }).map((q) => q.key),
    ['propertyType', 'bedrooms', 'tenure', 'leaseYearsRemaining', 'improvements', 'reason', 'agentValuation'],
  )
})

test('personalise: the hint mentions our records only while the answer still matches them', () => {
  const type = P_QUESTIONS[1]
  assert.equal(questionCopy(type, { propertyType: 'end-terrace' }).hint, 'Our records show an end of terrace property. Confirm this or choose another type.')
  assert.equal(questionCopy(type, { propertyType: 'flat' }).hint, 'Choose the type that best describes your home.')
  assert.match(questionCopy(P_QUESTIONS[2], { bedrooms: 3 }).hint, /3 bedrooms/)
  assert.equal(questionCopy(P_QUESTIONS[2], { bedrooms: 3 }).category, 'Property details')
})

test('personalise: each step must be answered; "None of these" and blank optional numbers are accepted', () => {
  const [, type, beds, , lease, improvements] = P_QUESTIONS
  assert.ok(questionError(type, undefined))
  assert.equal(questionError(type, 'flat'), '')
  assert.ok(questionError(beds, 11))
  assert.equal(questionError(beds, 0), '')
  assert.equal(questionError(lease, null), '')
  assert.ok(questionError(lease, 2.5))
  assert.ok(questionError(improvements, undefined))
  assert.equal(questionError(improvements, []), '')
})

test('site: the company comes from the subdomain', () => {
  assert.equal(slugFromHost('beercocks.property-ai.co.uk'), 'beercocks')
  assert.equal(slugFromHost('Harbour-Co.Property-AI.co.uk'), 'harbour-co')
  assert.equal(slugFromHost('beercocks.localhost'), 'beercocks')
  assert.equal(slugFromHost('property-ai.co.uk'), null)
  assert.equal(slugFromHost('www.property-ai.co.uk'), null)
  assert.equal(slugFromHost('localhost'), null)
  assert.equal(slugFromHost('a.b.property-ai.co.uk'), null)
  assert.equal(slugFromHost('-bad.property-ai.co.uk'), null)
  assert.equal(slugFromHost('valuation-ui.up.railway.app'), null)
  assert.equal(slugFromHost('beercocks.property-ai.co.uk.evil.com'), null)
  assert.ok(isSiteHost('property-ai.co.uk') && isSiteHost('www.property-ai.co.uk') && !isSiteHost('x.property-ai.co.uk'))
})

test('site: company links follow the host they are opened from', () => {
  const at = (url) => new URL(url)
  assert.equal(companyUrl('beercocks', at('https://property-ai.co.uk/')), 'https://beercocks.property-ai.co.uk/')
  assert.equal(companyUrl('beercocks', at('https://other.property-ai.co.uk/')), 'https://beercocks.property-ai.co.uk/')
  assert.equal(companyUrl('beercocks', at('http://localhost:5174/')), 'http://beercocks.localhost:5174/')
  assert.equal(companyUrl('beercocks', at('https://valuation-ui.up.railway.app/')), 'https://valuation-ui.up.railway.app/beercocks')
})
