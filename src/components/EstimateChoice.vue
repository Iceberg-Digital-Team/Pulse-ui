<script setup>
// "Two estimates. Your choice.": the instant and the personalised estimate side by side; the homeowner
// picks the one their report uses. Nothing changes until they confirm.
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { money } from '../lib/format'

const props = defineProps({
  instant: { type: Object, required: true }, // { estimate, min, max }
  personalisation: { type: Object, required: true },
  address: String,
  editable: { type: Boolean, default: true }, // false on a result someone shared with you
  choice: { type: String, default: 'personalised' }, // what is selected when the page opens
})
const emit = defineEmits(['back', 'edit', 'confirm'])

const picked = ref(props.choice)
watch(() => props.choice, (c) => { picked.value = c })

const p = computed(() => props.personalisation)
const signed = (n) => `${n >= 0 ? '+' : '−'}${money(Math.abs(n))}`
const homes = (n) => `${n} similar ${n === 1 ? 'home' : 'homes'}`

const improvements = computed(() => (p.value.subject?.upgrades || []).length > 0)
const corrected = computed(() => (p.value.subject?.corrections || []).length > 0)
const rows = computed(() => [
  { label: 'Property details', instant: 'Existing records', personalised: corrected.value ? 'Checked and updated by you' : 'Checked by you' },
  { label: 'Recent improvements', instant: 'Not included', personalised: improvements.value ? 'Your answers included' : 'None reported' },
  { label: 'Local comparisons', instant: 'Local market data', personalised: p.value.priceBand ? 'Homes in your selected price band' : 'Similar homes nearby' },
])

// The steps from the starting figure to the personalised estimate.
const lines = computed(() => {
  const out = []
  if (p.value.baseEstimate > 0) {
    out.push({
      label: p.value.basis === 'comparables' ? `Average of ${homes(p.value.comparablesUsed)}` : 'Your instant estimate',
      amount: money(p.value.baseEstimate),
    })
  }
  for (const a of p.value.adjustments || []) out.push({ label: a.label, amount: signed(a.amount) })
  return out
})
const explain = computed(() =>
  p.value.basis === 'comparables'
    ? `The personalised estimate uses ${homes(p.value.comparablesUsed)} nearby${p.value.priceBand ? ' in your selected price band' : ''}${p.value.adjustments?.length ? ' and adjusts for your answers' : ''}.`
    : `There weren't enough recent sales of similar homes nearby, so the personalised estimate starts from your instant estimate${p.value.adjustments?.length ? ' and adjusts it for your answers' : ''}.`,
)
const difference = computed(() => (p.value.estimate > 0 && props.instant.estimate > 0 ? p.value.estimate - props.instant.estimate : 0))

const pickedLabel = computed(() => (picked.value === 'personalised' ? 'Personalised estimate' : 'Instant estimate'))
const pickedValue = computed(() => (picked.value === 'personalised' ? p.value.estimate : props.instant.estimate))
</script>

<template>
  <main class="result-page">
    <div class="result choice">
      <div class="result__bar">
        <button type="button" class="text-btn back-link" @click="emit('back')"><Icon name="arrow-left" :size="18" :stroke="2.5" /> Back to property report</button>
      </div>

      <header class="choice__head">
        <div>
          <h1 id="choice-title" class="pv-head__title" tabindex="-1">Two estimates. Your choice.</h1>
          <p class="choice__lead">Your personalised estimate is ready. See what each estimate considers and choose the one to use in your report.</p>
          <p class="choice__address">{{ address }}</p>
        </div>
        <button v-if="editable" type="button" class="btn btn--secondary" @click="emit('edit')"><Icon name="edit" :size="18" /> Update answers</button>
      </header>

      <fieldset class="choice__table" :class="`is-${picked}`">
        <legend class="sr-only">Choose the estimate for your report</legend>
        <div class="choice__row choice__row--head">
          <span class="choice__label">Compare your estimates</span>
          <label class="choice__pick" :class="{ 'is-on': picked === 'instant' }">
            <input v-model="picked" type="radio" name="estimate" value="instant" />
            <span class="pd-indicator pd-indicator--radio" aria-hidden="true"></span>
            Instant estimate
          </label>
          <label class="choice__pick" :class="{ 'is-on': picked === 'personalised' }">
            <input v-model="picked" type="radio" name="estimate" value="personalised" />
            <span class="pd-indicator pd-indicator--radio" aria-hidden="true"></span>
            Personalised estimate
          </label>
        </div>
        <div class="choice__row choice__row--value">
          <span class="choice__label">Estimated value</span>
          <span class="choice__cell" :class="{ 'is-on': picked === 'instant' }"><strong>{{ money(instant.estimate) }}</strong><small>Based on available data</small></span>
          <span class="choice__cell" :class="{ 'is-on': picked === 'personalised' }"><strong>{{ money(p.estimate) }}</strong><small>Informed by your answers</small></span>
        </div>
        <div v-for="r in rows" :key="r.label" class="choice__row">
          <span class="choice__label">{{ r.label }}</span>
          <span class="choice__cell" :class="{ 'is-on': picked === 'instant' }">{{ r.instant }}</span>
          <span class="choice__cell" :class="{ 'is-on': picked === 'personalised' }">{{ r.personalised }}</span>
        </div>
      </fieldset>

      <section class="choice__why" aria-labelledby="choice-why-title">
        <div>
          <h2 id="choice-why-title">What makes the estimates different?</h2>
          <p>The instant estimate is {{ money(instant.estimate) }}. {{ explain }}</p>
        </div>
        <ul class="pv-calc__lines">
          <li v-for="l in lines" :key="l.label"><span>{{ l.label }}</span><strong>{{ l.amount }}</strong></li>
          <li class="is-total"><span>Personalised estimate</span><strong>{{ money(p.estimate) }}</strong></li>
        </ul>
        <p v-if="difference" class="choice__note">
          The {{ money(Math.abs(difference)) }} difference is not a guaranteed {{ difference > 0 ? 'increase' : 'decrease' }} in your home’s value.
        </p>
      </section>

      <footer class="choice__foot">
        <div aria-live="polite">
          <span>Your selection</span>
          <strong>{{ pickedLabel }} · {{ money(pickedValue) }}</strong>
          <small>You can change this later.</small>
        </div>
        <button type="button" class="btn btn--primary" @click="emit('confirm', picked)">
          Confirm selection <Icon class="arrow" name="arrow-right" :size="18" :stroke="2.5" />
        </button>
      </footer>
    </div>
  </main>
</template>
