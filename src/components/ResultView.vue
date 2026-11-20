<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import ExpertCard from './ExpertCard.vue'
import PersonaliseWizard from './PersonaliseWizard.vue'
import PersonalisedResult from './PersonalisedResult.vue'
import PersonaliseJourney from './PersonaliseJourney.vue'
import EstimateChoice from './EstimateChoice.vue'
import BuyerDemandCard from './BuyerDemandCard.vue'
import NextSteps from './NextSteps.vue'
import PropertyMap from './PropertyMap.vue'
import { money, formatArea } from '../lib/format'
import { api } from '../lib/api'
import { markOwner } from '../lib/session'

const props = defineProps({
  company: String,
  companyName: String,
  content: Object,
  lead: Object,
  savedPersonalisation: Object, // the report's personalised estimate when it is reopened from its URL
  savedChoice: Object, // and the estimate chosen for it (the report's estimateChoice)
  address: Object,
  property: Object,
  canPersonalise: Boolean,
  owner: Boolean, // this browser made the valuation; a shared result is view-only
  embed: Boolean,
  openingHours: Object,
  markerLogo: String, // company image on the map pin
})
const emit = defineEmits(['restart', 'back'])

const lettings = computed(() => props.lead.valuationType === 'lettings')
const instantFigure = computed(() => (lettings.value ? props.lead.rentalValuation : props.lead.valuation) || {})

// Personalise: the latest personalised estimate, and the estimate the homeowner chose for the report.
// The report keeps the chosen one until a new choice is confirmed.
const personalisation = ref(null)
const selected = ref(null) // { kind: 'instant' | 'personalised', estimate, min, max, subject }
const pending = ref(false) // a new personalised estimate waits for a choice
const expertSent = ref(null) // the expert form is on two views; sending from one completes both
// Only the browser that made the valuation can personalise it; others see what was done.
// Whoever opens a report that isn't personalised yet can personalise it (there is nothing to overwrite)
// and then owns it; once answered, only the browser that owns it can change the answers.
const owns = ref(props.owner)
const canEdit = computed(() => owns.value || !personalisation.value)
const showPersonalise = computed(() => props.canPersonalise)
const figure = computed(() => (selected.value?.kind === 'personalised' ? selected.value : instantFigure.value))
const hasFigure = computed(() => figure.value.estimate > 0)
const hasRange = computed(() => !lettings.value && figure.value.min > 0 && figure.value.max > figure.value.min)

const specs = computed(() => props.property?.specs || {})
// With the personalised estimate chosen, the facts follow the homeowner's answers.
const confirmedBedrooms = computed(() => (selected.value?.kind === 'personalised' ? selected.value.subject?.bedrooms : null))
const tags = computed(() =>
  [
    { icon: 'house', text: specs.value.property_type2 || specs.value.property_type1, label: 'Property style' },
    { icon: 'bedroom', text: confirmedBedrooms.value > 0 ? confirmedBedrooms.value : specs.value.bedrooms_mod > 0 ? specs.value.bedrooms_mod : null, label: 'Bedrooms' },
    { icon: 'reception', text: specs.value.receptions_mod > 0 ? specs.value.receptions_mod : null, label: 'Receptions' },
    { icon: 'bathroom', text: specs.value.bathrooms_mod > 0 ? specs.value.bathrooms_mod : null, label: 'Bathrooms' },
  ].filter((t) => t.text),
)
const dna = computed(() => (props.property?.dna || []).filter((d) => d.value !== null && d.value !== '' && d.value !== undefined))
// floor_area is stored in square metres
const dnaValue = (d) => (d.key === 'floor_area' ? formatArea(Number(d.value)) || d.value : d.value)

// "How we estimated" popover next to the label: hover or focus shows it, a click pins it.
const infoOpen = ref(false)
const infoPinned = ref(false)
const showInfo = () => { infoOpen.value = true }
const hideInfo = () => { if (!infoPinned.value) infoOpen.value = false }
const toggleInfo = () => { infoPinned.value = !infoPinned.value; infoOpen.value = infoPinned.value }
const closeInfo = () => { infoOpen.value = false; infoPinned.value = false }
const onDocClick = (e) => { if (!e.target.closest?.('.value-help')) closeInfo() }

// Count-up and range animation, as on the Neuron result page.
const shown = ref(0)
const thumb = ref(0)
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const target = computed(() => (hasRange.value ? ((figure.value.estimate - figure.value.min) / (figure.value.max - figure.value.min)) * 100 : 50))
let raf = 0
onMounted(() => {
  document.addEventListener('click', onDocClick)
  if (!hasFigure.value) return
  if (reduceMotion) {
    shown.value = figure.value.estimate
    thumb.value = target.value
    return
  }
  const start = performance.now()
  const duration = 1400
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration)
    shown.value = Math.round(figure.value.estimate * (1 - (1 - t) ** 3))
    if (t < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  requestAnimationFrame(() => { thumb.value = Math.min(100, Math.max(0, target.value)) })
})
// A new choice swaps the figure straight away; only the first one counts up.
watch(figure, (f) => {
  cancelAnimationFrame(raf)
  shown.value = f.estimate || 0
  thumb.value = Math.min(100, Math.max(0, target.value))
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  document.removeEventListener('click', onDocClick)
})

// Questions in a dialog; the choice and the personalised valuation are their own views. The report
// stays mounted so the expert form keeps what the homeowner has typed when they switch views.
const view = ref('report') // report | choice | personalised
const dialogOpen = ref(false)
const confirmedCount = ref(0)
const reportRoot = ref(null)

const figureLabel = computed(() => {
  if (lettings.value) return 'Estimated monthly rent'
  if (selected.value) return `Your selected ${selected.value.kind} estimate`
  return 'Estimated market value'
})
const figureBasis = computed(() => {
  if (!props.canPersonalise) return ''
  if (selected.value?.kind === 'personalised') return 'Based on your confirmed answers and nearby comparisons'
  if (selected.value) return 'Based on the original property records'
  // answered but not chosen yet: the details are checked, only the choice is open
  if (personalisation.value) return 'Instant estimate · Your personalised estimate is ready to compare'
  return 'Instant estimate · Your property details are not yet checked'
})
// "View selected valuation" opens the personalised valuation; with the instant one chosen (or a new
// estimate waiting) the comparison is the useful page.
const viewLabel = computed(() => (pending.value || selected.value?.kind !== 'personalised' ? 'Compare your estimates' : 'View selected valuation'))
const openSelected = () => (viewLabel.value === 'View selected valuation' ? showView('personalised', '#pv-title') : showView('choice', '#choice-title'))

async function showView(name, focusSelector) {
  view.value = name
  window.scrollTo({ top: 0, behavior: 'instant' })
  await nextTick()
  document.querySelector(focusSelector)?.focus({ preventScroll: true })
}
function onCompleted(result) {
  if (!owns.value) { owns.value = true; markOwner(props.lead.valuation_id) }
  personalisation.value = result
  pending.value = true
  dialogOpen.value = false
  // Wait a frame so the dialog returns focus first; the new view's heading then takes it.
  requestAnimationFrame(() => showView('choice', '#choice-title'))
}
function select(kind) {
  const p = personalisation.value
  selected.value = kind === 'personalised'
    ? { kind, estimate: p.estimate, min: p.min, max: p.max, subject: p.subject }
    : { kind, estimate: instantFigure.value.estimate, min: instantFigure.value.min, max: instantFigure.value.max }
  pending.value = false
}
// Reopened report: its personalised estimate and the choice saved on it. A choice made against an
// earlier personalisation no longer counts: the estimates wait to be compared again.
const sameTime = (a, b) => !!a && !!b && new Date(a).getTime() === new Date(b).getTime()
if (props.canPersonalise && props.savedPersonalisation?.estimate > 0) {
  personalisation.value = props.savedPersonalisation
  const c = props.savedChoice
  if (c?.kind && sameTime(c.personalisedAt, props.savedPersonalisation.computedAt)) select(c.kind)
  else pending.value = true
}
function confirmChoice(kind) {
  select(kind)
  // Only the homeowner's choice is saved; someone with a shared link can look at either estimate.
  // The page moves on at once; a failed save only means the comparison is offered again next time.
  if (owns.value) api.chooseEstimate(props.company, props.lead.valuation_id, kind).catch(() => {})
  if (kind === 'personalised') showView('personalised', '#pv-title')
  else showView('report', '#result-title')
}

</script>

<template>
  <div>
    <main v-show="view === 'report'" ref="reportRoot" class="result-page" :class="{ 'result-page--embed': embed }">
      <div class="result">
        <div class="result__bar">
          <button type="button" class="back-btn" @click="emit('back')"><Icon name="chevron-left" :size="18" :stroke="2.5" /> Back</button>
          <button type="button" class="back-btn" @click="emit('restart')">Value another property</button>
        </div>

        <div class="result__grid" :class="{ 'result__grid--journey': showPersonalise }">
          <!-- valuation -->
          <section class="tile report" :class="{ 'report--centred': lettings }" aria-labelledby="result-title">
            <header class="report__head">
              <h1 id="result-title" class="result-address" tabindex="-1" data-step-heading>{{ address.full }}</h1>
              <ul v-if="tags.length" class="facts" aria-label="About this property">
                <li v-for="t in tags" :key="t.icon" class="fact"><Icon :name="t.icon" :size="16" /><span class="sr-only">{{ t.label }}:</span> {{ t.text }}</li>
              </ul>
            </header>

            <template v-if="hasFigure">
              <div class="estimate">
                <div class="estimate__label">
                  <span>{{ figureLabel }}</span>
                  <span class="value-help" @mouseenter="showInfo" @mouseleave="hideInfo" @focusin="showInfo" @focusout="hideInfo" @keydown.esc="closeInfo">
                    <button type="button" class="icon-btn" :aria-label="lettings ? 'How we estimated your rental valuation' : 'How we estimated the market value'" aria-describedby="value-tip" :aria-expanded="infoOpen" @click="toggleInfo">
                      <Icon name="info" :size="18" />
                    </button>
                    <span v-show="infoOpen" id="value-tip" class="value-tip" role="tooltip">
                      <strong>{{ lettings ? 'How we estimated your rental valuation' : 'How we estimated the market value' }}</strong>
                      <span class="value-tip__list">
                        <span><Icon name="check" :size="14" :stroke="3" />{{ lettings ? 'Recent rental prices for similar properties' : 'Recent sales of similar homes' }}</span>
                        <span><Icon name="check" :size="14" :stroke="3" />{{ lettings ? 'Current tenant demand in your area' : 'Current buyer demand in your area' }}</span>
                        <span><Icon name="check" :size="14" :stroke="3" />Your property details</span>
                      </span>
                    </span>
                  </span>
                </div>
                <div class="estimate__price" aria-live="polite">
                  <span aria-hidden="true">{{ money(shown) }}</span>
                  <span class="sr-only">{{ money(figure.estimate) }}</span>
                  <small v-if="lettings"> pcm</small>
                </div>
                <p v-if="figureBasis" class="estimate__basis">{{ figureBasis }}</p>
              </div>

              <div v-if="hasRange" class="range" aria-label="Likely range">
                <div class="meter meter--animated" aria-hidden="true"><span :style="{ width: `${thumb}%` }"></span><i :style="{ left: `${thumb}%` }"></i></div>
                <div class="range__labels">
                  <span><span class="sr-only">From </span>{{ money(figure.min) }}</span>
                  <span><span class="sr-only">to </span>{{ money(figure.max) }}</span>
                </div>
              </div>
            </template>

            <div v-else class="unique">
              Your property appears to be <span>unique!</span> Even our valuation model couldn't price it automatically.
              A local expert can give you an accurate figure.
            </div>

            <!-- personalise entry -->
            <div v-if="canPersonalise && !personalisation" class="entry">
              <div class="entry__copy">
                <h2 class="entry__title">Make this estimate reflect your home</h2>
                <p class="entry__text">An extra bedroom or recent improvements may be missing. Check your details and compare nearby homes.</p>
              </div>
              <button id="personalise-start" type="button" class="btn btn--primary" @click="dialogOpen = true">
                {{ confirmedCount ? 'Continue personalising' : 'Personalise my valuation' }}
                <Icon class="arrow" name="arrow-right" :size="18" :stroke="2.5" />
              </button>
              <p class="entry__status">{{ confirmedCount ? `${confirmedCount} ${confirmedCount === 1 ? 'answer' : 'answers'} kept · Continue where you left off` : 'Compare with your instant estimate before choosing.' }}</p>
            </div>
            <div v-else-if="showPersonalise && personalisation" class="entry entry--done">
              <div class="entry__actions">
                <button id="personalise-start" type="button" class="btn btn--primary" @click="openSelected">{{ viewLabel }}</button>
                <button v-if="canEdit" type="button" class="text-btn" @click="dialogOpen = true"><Icon name="edit" :size="16" /> Update answers</button>
              </div>
              <p v-if="pending && selected" class="entry__status">Your previous selection stays in this report until you confirm a new one.</p>
            </div>

            <PropertyMap class="report__map" :logo="markerLogo" :coordinates="address.coordinates" :place="address.postcode" :address="address.full" />
          </section>

          <!-- how personalising works, then where the homeowner is with it -->
          <PersonaliseJourney
            v-if="showPersonalise"
            :editable="canEdit"
            :answered="confirmedCount"
            :completed="!!personalisation"
            :pending="pending"
            :selected="selected"
            @start="dialogOpen = true"
            @view="openSelected"
            @edit="dialogOpen = true"
          />

          <!-- expert valuation; what a request leads to sits at the foot of the card -->
          <ExpertCard
            id="expert"
            :company="company"
            :valuation-id="lead.valuation_id"
            :company-name="companyName"
            :first-name="lead.firstName"
            :last-name="lead.lastName"
            :email="lead.email"
            :phone="lead.phone"
            :thank-you-message="content.thankYouMessage"
            :opening-hours="openingHours"
            :sent="expertSent"
            @sent="expertSent = $event"
          >
            <template #foot><NextSteps :company-name="companyName" :sent="!!expertSent" /></template>
          </ExpertCard>
        </div>

        <!-- the agency's applicants looking for a home like this (agencies on Lifesycle only) -->
        <BuyerDemandCard :company="company" :valuation-id="lead.valuation_id" />

        <div class="banner" aria-hidden="true">{{ address.full }}</div>

        <section v-if="dna.length" aria-labelledby="dna-title">
          <h2 id="dna-title" class="dna__title">Property DNA</h2>
          <ul class="dna">
            <li v-for="d in dna" :key="d.key" class="dna__card">
              <span class="dna__icon"><Icon :name="d.icon" :size="28" :stroke="1.5" /></span>
              <span class="dna__label">{{ d.label }}</span>
              <span class="dna__value">{{ dnaValue(d) }}</span>
            </li>
          </ul>
        </section>
      </div>
    </main>

    <EstimateChoice
      v-if="personalisation && view === 'choice'"
      :instant="instantFigure"
      :personalisation="personalisation"
      :address="address.full"
      :choice="pending ? 'personalised' : selected?.kind || 'personalised'"
      :editable="canEdit"
      @back="showView('report', '#personalise-start')"
      @edit="dialogOpen = true"
      @confirm="confirmChoice"
    />

    <PersonalisedResult
      v-if="personalisation"
      v-show="view === 'personalised'"
      :personalisation="personalisation"
      :address="address.full"
      :tags="tags"
      :coordinates="address.coordinates"
      :postcode="address.postcode"
      :company-name="companyName"
      :marker-logo="markerLogo"
      :editable="canEdit"
      :company="company"
      :valuation-id="lead.valuation_id"
      :contact="{ firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone }"
      :thank-you-message="content.thankYouMessage"
      :opening-hours="openingHours"
      :expert-sent="expertSent"
      @back="showView('report', '#personalise-start')"
      @edit="dialogOpen = true"
      @change="showView('choice', '#choice-title')"
      @expert-sent="expertSent = $event"
    />

    <PersonaliseWizard
      v-if="canPersonalise && canEdit"
      :open="dialogOpen"
      :company="company"
      :valuation-id="lead.valuation_id"
      :address="address.full"
      @close="dialogOpen = false"
      @completed="onCompleted"
      @progress="confirmedCount = $event"
    />
  </div>
</template>
