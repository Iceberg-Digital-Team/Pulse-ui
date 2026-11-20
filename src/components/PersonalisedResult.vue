<script setup>
// The personalised valuation as its own view, reached from the property report.
import { computed, nextTick, ref, watch } from 'vue'
import Icon from './Icon.vue'
import ComparableCard from './ComparableCard.vue'
import ExpertCard from './ExpertCard.vue'
import PropertyMap from './PropertyMap.vue'
import { mapsEnabled, mapsRejected } from '../lib/googleMaps'
import { money, moneyShort } from '../lib/format'

const props = defineProps({
  personalisation: { type: Object, required: true },
  address: String,
  tags: { type: Array, default: () => [] },
  coordinates: Object,
  postcode: String,
  companyName: String,
  markerLogo: String,
  editable: { type: Boolean, default: true }, // false on a result someone shared with you
  // the expert valuation form, as on the report
  company: String,
  valuationId: String,
  contact: { type: Object, default: () => ({}) },
  thankYouMessage: String,
  openingHours: Object,
  expertSent: Object,
})
const emit = defineEmits(['back', 'edit', 'change', 'expert-sent'])

// The booking form stays folded until asked for (or once sent, to show the thank-you).
const bookOpen = ref(!!props.expertSent)
watch(() => props.expertSent, (v) => { if (v) bookOpen.value = true })
async function openBooking() {
  bookOpen.value = true
  await nextTick()
  document.getElementById('pv-book-form')?.querySelector('input, button')?.focus({ preventScroll: true })
}
async function goToForm() {
  await openBooking()
  document.getElementById('pv-book')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const p = computed(() => props.personalisation)
const signed = (n) => `${n >= 0 ? '+' : '−'}${money(Math.abs(n))}`

const showInfo = ref(false)
// The map sits beside the figure (as in the design); without one, the expert prompt takes its place.
const withMap = computed(() => mapsEnabled && !mapsRejected.value && Number.isFinite(Number(props.coordinates?.lat)) && Number.isFinite(Number(props.coordinates?.lng)))

// Like the Neuron result, the range only shows when we are reasonably confident.
const showRange = computed(() => p.value.confidence >= 40 && p.value.min > 0 && p.value.max > p.value.min)
const thumb = computed(() => Math.min(100, Math.max(0, ((p.value.estimate - p.value.min) / (p.value.max - p.value.min)) * 100)))
const hasConfidence = computed(() => typeof p.value.confidence === 'number')
const confidenceLabel = computed(() => (p.value.confidence >= 70 ? 'High' : p.value.confidence >= 40 ? 'Medium' : 'Low'))

const startingPoint = computed(() => {
  if (!(p.value.baseEstimate > 0)) return null
  return p.value.basis === 'comparables'
    ? { label: `Average of ${p.value.comparablesUsed} similar ${p.value.comparablesUsed === 1 ? 'home' : 'homes'}${p.value.priceBand ? ' in your price band' : ''}`, amount: p.value.baseEstimate }
    : { label: 'Instant estimate for your home', amount: p.value.baseEstimate }
})
const bandLabel = computed(() => (p.value.priceBand ? `${moneyShort(p.value.priceBand.min)} – ${moneyShort(p.value.priceBand.max)}` : ''))
const basisText = computed(() =>
  p.value.basis === 'comparables'
    ? `Based on ${p.value.comparablesUsed} recent sales and listings of similar homes nearby, adjusted for your answers.`
    : "There weren't enough recent sales of similar homes nearby, so this starts from your instant estimate and adjusts it for your answers.",
)
const showMarket = computed(() => p.value.priceBand && p.value.marketEstimate > 0 && p.value.marketEstimate !== p.value.estimate)
const correctionsText = computed(() => {
  const c = p.value.subject?.corrections || []
  if (!c.length) return ''
  const names = c.map((k) => (k === 'propertyType' ? 'property type' : k === 'bedrooms' ? 'number of bedrooms' : k))
  return `We used the ${names.join(' and ')} you gave us instead of our records.`
})
const summaryText = computed(() =>
  [p.value.basis === 'comparables' ? 'Similar homes' : 'Your instant estimate', bandLabel.value ? 'your selected band' : '', p.value.adjustments?.length ? 'your recent improvements' : '']
    .filter(Boolean)
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1'),
)

// Similar homes: the ones used first; six at a time.
const comparables = computed(() => p.value.comparables || [])
const used = computed(() => comparables.value.filter((c) => c.usedInEstimate))
const filter = ref('used')
const limit = ref(6)
const filtered = computed(() => (filter.value === 'used' && used.value.length ? used.value : comparables.value))
const visible = computed(() => filtered.value.slice(0, limit.value))
function setFilter(f) {
  filter.value = f
  limit.value = 6
}
</script>

<template>
  <main class="result-page">
    <div class="result">
      <div class="result__bar">
        <button type="button" class="text-btn back-link" @click="emit('back')"><Icon name="arrow-left" :size="18" :stroke="2.5" /> Back to property report</button>
      </div>

      <header class="pv-head">
        <div class="pv-head__main">
          <h1 id="pv-title" class="pv-head__title" tabindex="-1">Your personalised valuation</h1>
          <div class="pv-head__sub">
            <p class="pv-head__address">{{ address }}</p>
            <ul v-if="tags.length" class="facts" aria-label="About this property">
              <li v-for="t in tags.slice(0, 2)" :key="t.icon" class="fact"><Icon :name="t.icon" :size="16" /><span class="sr-only">{{ t.label }}:</span> {{ t.text }}</li>
            </ul>
          </div>
        </div>
        <div class="pv-head__actions">
          <button type="button" class="btn btn--secondary" @click="emit('change')">Change estimate</button>
          <button v-if="editable" type="button" class="text-btn" @click="emit('edit')"><Icon name="edit" :size="16" /> Update answers</button>
        </div>
      </header>

      <article class="pv-hero">
        <div class="pv-hero__value">
          <div class="pv-label">
            Estimated market value
            <button type="button" class="icon-btn" aria-label="How this estimate is calculated" :aria-expanded="showInfo" aria-controls="pv-info" @click="showInfo = !showInfo">
              <Icon name="info" :size="18" />
            </button>
          </div>
          <p v-show="showInfo" id="pv-info" class="pv-info">
            This estimate uses similar homes nearby{{ bandLabel ? ' in your selected price band' : '' }} and the details you gave us. It is an automated estimate, not a formal valuation.
          </p>
          <div class="pv-price">{{ money(p.estimate) }}</div>
          <p class="pv-caption">Your selected personalised estimate</p>

          <div v-if="showRange" class="pv-range">
            <div class="meter" aria-hidden="true"><span :style="{ width: `${thumb}%` }"></span><i :style="{ left: `${thumb}%` }"></i></div>
            <div class="pv-range__labels">
              <div><span>Lower estimate</span><strong>{{ money(p.min) }}</strong></div>
              <div><span>Upper estimate</span><strong>{{ money(p.max) }}</strong></div>
            </div>
          </div>

          <div v-if="hasConfidence" class="pv-confidence">
            <div class="pv-confidence__row"><span>Confidence</span><strong>{{ confidenceLabel }}</strong></div>
            <div class="meter meter--thin" role="meter" :aria-valuenow="p.confidence" aria-valuemin="0" aria-valuemax="100" :aria-valuetext="confidenceLabel" aria-label="Confidence">
              <span :style="{ width: `${p.confidence}%` }"></span>
            </div>
            <p>A guide to what your home could be worth. An expert visit can give you a more detailed assessment.</p>
          </div>
        </div>

        <PropertyMap v-if="withMap" class="pv-hero__map" variant="fill" :logo="markerLogo" :coordinates="coordinates" :place="postcode" :address="address" />
        <aside v-else class="pv-hero__expert" aria-labelledby="pv-hero-expert-title">
          <span class="pv-hero__expert-icon" aria-hidden="true"><Icon name="house" :size="24" /></span>
          <h2 id="pv-hero-expert-title">Want an exact figure?</h2>
          <p>A local expert{{ companyName ? ` from ${companyName}` : '' }} can visit your home and give you a formal valuation. It's free and there's no obligation.</p>
          <button type="button" class="btn btn--accent btn--block" @click="goToForm">
            Book a free expert valuation <Icon class="arrow" name="arrow-right" :size="18" :stroke="2.5" />
          </button>
        </aside>
      </article>

      <p class="pv-footnote">This is an automated estimate, not a formal valuation. For an accurate professional opinion, we recommend a free expert valuation.</p>

      <details class="pv-calc">
        <summary>
          <div>
            <h2 class="pv-calc__title">How we calculated your estimate</h2>
            <span>{{ summaryText }}</span>
          </div>
          <Icon class="pv-calc__chevron" name="chevron-down" :size="22" :stroke="2.5" />
        </summary>
        <div class="pv-calc__body">
          <ul class="pv-calc__lines">
            <li v-if="startingPoint"><span>{{ startingPoint.label }}</span><strong>{{ money(startingPoint.amount) }}</strong></li>
            <li v-for="a in p.adjustments || []" :key="a.key">
              <span>{{ a.label }}<template v-if="a.pct"> ({{ a.pct > 0 ? '+' : '' }}{{ Math.round(a.pct * 100) }}%)</template></span>
              <strong :class="a.amount >= 0 ? 'is-up' : 'is-down'">{{ signed(a.amount) }}</strong>
            </li>
            <li class="is-total"><span>Personalised estimate</span><strong>{{ money(p.estimate) }}</strong></li>
          </ul>
          <div v-if="bandLabel" class="pv-calc__band"><span>Your selected price band</span><strong>{{ bandLabel }}</strong></div>
          <p>{{ basisText }}</p>
          <p v-if="showMarket">The average for similar homes across the area is {{ money(p.marketEstimate) }}.</p>
          <p v-if="correctionsText">{{ correctionsText }}</p>
        </div>
      </details>

      <!-- expert valuation, as on the report: one compact row; the form opens under it -->
      <section id="pv-book" class="pv-book" :class="{ 'is-open': bookOpen }" aria-labelledby="pv-book-title">
        <div class="pv-book__row">
          <span class="pv-book__icon" aria-hidden="true"><Icon name="calendar" :size="22" /></span>
          <div class="pv-book__copy">
            <h2 id="pv-book-title" class="pv-book__title">Turn this estimate into a formal valuation</h2>
            <p>An expert{{ companyName ? ` from ${companyName}` : '' }} visits your home and checks what an online estimate can't see. Free, with no obligation.</p>
          </div>
          <button v-if="!bookOpen" type="button" class="btn btn--primary" aria-controls="pv-book-form" :aria-expanded="false" @click="openBooking">
            Book a free expert valuation <Icon class="arrow" name="arrow-right" :size="18" :stroke="2.5" />
          </button>
        </div>
        <div v-if="bookOpen" id="pv-book-form" class="pv-book__form">
          <ExpertCard
            id-prefix="pv-expert"
            :company="company"
            :valuation-id="valuationId"
            :company-name="companyName"
            :first-name="contact.firstName"
            :last-name="contact.lastName"
            :email="contact.email"
            :phone="contact.phone"
            :thank-you-message="thankYouMessage"
            :opening-hours="openingHours"
            :sent="expertSent"
            title="Book your free expert valuation"
            description="Check your details and choose when suits you."
            @sent="emit('expert-sent', $event)"
          />
        </div>
      </section>

      <section v-if="comparables.length" class="pv-homes" aria-labelledby="pv-homes-title">
        <div class="pv-homes__head">
          <div>
            <h2 id="pv-homes-title" class="pv-homes__title">Similar homes nearby</h2>
            <p>Compare property details and recent asking or sale prices.</p>
          </div>
          <div v-if="used.length" class="segmented" role="group" aria-label="Which homes to show">
            <button type="button" :aria-pressed="filter === 'used'" @click="setFilter('used')">Used in estimate <span>{{ used.length }}</span></button>
            <button type="button" :aria-pressed="filter === 'all'" @click="setFilter('all')">All <span>{{ comparables.length }}</span></button>
          </div>
        </div>
        <div class="comps-grid">
          <ComparableCard v-for="(c, i) in visible" :key="c.uprn || `${c.address}-${i}`" :comparable="c" />
        </div>
        <div v-if="filtered.length > limit" class="pv-homes__more">
          <button type="button" class="btn btn--secondary" @click="limit = filtered.length">
            Show {{ filtered.length - limit }} more <Icon name="chevron-down" :size="18" :stroke="2.5" />
          </button>
        </div>
      </section>
    </div>
  </main>
</template>
