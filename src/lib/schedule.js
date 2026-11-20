// Preferred day & time for the expert visit. Same model as Neuron's PreferredDayTimePicker:
// a company's opening hours decide which days and hourly slots are offered, and the choice is sent
// as `preferredDate: [{ monday: [{ start_hour: '09.00', end_hour: '10.00' }] }]` so leads look the
// same in Lifesycle whichever page they came from.

// Visits are never offered on Sunday, even if a company's opening hours list it.
export const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const ALL_SLOTS = [
  '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '12:00 - 13:00',
  '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00', '17:00 - 18:00',
]

const minutes = (time) => {
  const [h, m] = String(time).trim().split(':').map(Number)
  return h * 60 + (m || 0)
}
const range = (s) => {
  const parts = String(s || '').split('-').map((x) => x.trim())
  return parts.length === 2 && parts.every((p) => /^\d{1,2}(:\d{2})?$/.test(p)) ? parts.map(minutes) : null
}

const hoursFor = (openingHours, day) => openingHours?.[day.toLowerCase()]

// "Closed", empty or missing means the office is shut that day.
export const isWorkingDay = (hours) => typeof hours === 'string' && hours.trim() !== '' && hours.trim().toLowerCase() !== 'closed'

// Without opening hours every day is offered.
export const availableDays = (openingHours) =>
  openingHours ? ALL_DAYS.filter((d) => isWorkingDay(hoursFor(openingHours, d))) : ALL_DAYS

export const dayHours = (openingHours, day) => {
  const h = hoursFor(openingHours, day)
  return isWorkingDay(h) ? h.trim() : ''
}

const pad = (n) => String(n).padStart(2, '0')
const clock = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`

// The company's own hours, in one-hour slots from opening time; the last slot ends at closing time.
//   09:00 - 17:30 → 09:00 - 10:00 … 16:00 - 17:00, 17:00 - 17:30
//   09:30 - 13:00 → 09:30 - 10:30, 10:30 - 11:30, 11:30 - 12:30, 12:30 - 13:00
// Without hours (the default for every company) or with unreadable hours: ALL_SLOTS, 08:00–18:00.
export function slotsForDay(openingHours, day) {
  const open = range(dayHours(openingHours, day))
  if (!open || open[1] <= open[0]) return ALL_SLOTS
  const slots = []
  for (let start = open[0]; start < open[1]; start += 60) {
    slots.push(`${clock(start)} - ${clock(Math.min(start + 60, open[1]))}`)
  }
  return slots
}

const startOf = (slot) => range(slot)?.[0] ?? 0

export const hasSelection = (dayTimeSlots = {}) => Object.values(dayTimeSlots).some((s) => s.length > 0)

// Toggle one slot; a day with no slots left is removed. Slots stay in time order.
export function toggleSlot(dayTimeSlots, day, slot) {
  const current = dayTimeSlots[day] || []
  const next = current.includes(slot) ? current.filter((s) => s !== slot) : [...current, slot]
  const out = { ...dayTimeSlots, [day]: [...next].sort((a, b) => startOf(a) - startOf(b)) }
  if (!out[day].length) delete out[day]
  return out
}

// Selected days in week order, for summaries.
export const orderedSelection = (dayTimeSlots = {}) =>
  ALL_DAYS.filter((d) => dayTimeSlots[d]?.length).map((d) => ({ day: d, slots: dayTimeSlots[d] }))

// "09:00 - 10:00" → { start_hour: '09.00', end_hour: '10.00' }, keyed by lower-case day.
export function toPreferredDate(dayTimeSlots = {}) {
  const obj = {}
  for (const { day, slots } of orderedSelection(dayTimeSlots)) {
    obj[day.toLowerCase()] = slots.map((slot) => {
      const [start, end] = slot.split('-').map((s) => s.trim().replace(':', '.'))
      return { start_hour: start, end_hour: end }
    })
  }
  return Object.keys(obj).length ? [obj] : null
}
