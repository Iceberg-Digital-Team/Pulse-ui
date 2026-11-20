<script setup>
// "How your personalised estimate is built": the three steps before the homeowner starts, then where
// they are once an estimate exists (ready to compare, or the one they chose).
import Icon from './Icon.vue'
import { money } from '../lib/format'

defineProps({
  answered: { type: Number, default: 0 }, // questions confirmed so far
  completed: Boolean, // an estimate exists
  pending: Boolean, // a new estimate waits for the homeowner's choice
  selected: { type: Object, default: null }, // { kind: 'instant' | 'personalised', estimate }
  editable: { type: Boolean, default: true }, // false on a result someone shared with you
})
const emit = defineEmits(['start', 'view', 'edit'])

const STEPS = [
  { title: 'Tell us more about your home', text: 'Answer one question at a time about your home and any recent improvements. Relevant follow-up questions appear as you go.' },
  { title: 'See how nearby homes compare', text: 'Compare the homes shown with yours. You can keep the starting price band or explore another one.' },
  { title: 'Put the two estimates side by side', text: 'Review your instant and personalised estimates, then choose which one to use in your report. You can change your choice later.' },
]
</script>

<template>
  <section class="journey" :class="{ 'journey--done': completed }" aria-labelledby="journey-title">
    <template v-if="!completed">
      <header class="journey__head">
        <h2 id="journey-title" class="journey__title">How your personalised estimate is built</h2>
        <p>Your instant estimate is a starting point. Check your property details and compare nearby homes to build your personalised estimate.</p>
      </header>

      <ol class="journey__steps" aria-label="How personalisation works">
        <li v-for="(s, i) in STEPS" :key="s.title" class="journey__step">
          <span class="journey__num" aria-hidden="true">{{ i + 1 }}</span>
          <h3>{{ s.title }}</h3>
          <p>{{ s.text }}</p>
          <!-- fragments of each step's screen (v35 layout), drawn in HTML so they take the company colours; decorative -->
          <div class="journey__art" aria-hidden="true">
            <figure v-if="i === 0" class="frag">
              <span class="frag__option frag__property-back"><i class="frag__radio"></i>Detached</span>
              <span class="frag__option frag__property-selected is-on"><i class="frag__radio"></i>Terraced</span>
              <div class="frag__counter"><small>Bedrooms</small><span class="frag__stepper"><b>−</b><strong>3</strong><b>+</b></span></div>
            </figure>
            <figure v-else-if="i === 1" class="frag">
              <span class="frag__price-band">£350k – £375k (6 homes)<Icon name="chevron-down" :size="11" :stroke="2" /></span>
              <div class="frag__home">
                <strong class="frag__home-price">£360,000</strong>
                <span class="frag__home-text"><b>12 Pownall Crescent</b>3 bedrooms · 110 m² · Terraced</span>
                <em class="frag__home-badge">SOLD</em>
              </div>
            </figure>
            <figure v-else class="frag">
              <div class="frag__estimate frag__instant">
                <span class="frag__estimate-label"><i class="frag__radio"></i>Instant estimate</span>
                <strong>£351,000</strong><small>Based on available data</small>
              </div>
              <div class="frag__estimate frag__personalised">
                <span class="frag__estimate-label"><i class="frag__radio is-on"></i>Personalised estimate</span>
                <strong>£368,000</strong><small>Informed by your answers</small>
              </div>
            </figure>
          </div>
        </li>
      </ol>

      <footer class="journey__foot">
        <p>{{ answered ? `In progress · ${answered} ${answered === 1 ? 'question' : 'questions'} confirmed` : 'Your report is not yet personalised' }}</p>
        <button type="button" class="btn btn--primary" @click="emit('start')">
          {{ answered ? 'Continue personalising' : 'Personalise my valuation' }} <Icon class="arrow" name="arrow-right" :size="18" :stroke="2.5" />
        </button>
      </footer>
    </template>

    <div v-else class="journey__done">
      <div>
        <h2 id="journey-title" class="journey__title">{{ pending ? 'Your estimates are ready to compare' : 'Your selected valuation is in your report' }}</h2>
        <p>{{ editable ? 'Review your estimates or update the details you shared.' : 'Review the instant and personalised estimates for this home.' }}</p>
      </div>
      <div class="journey__actions">
        <button type="button" class="btn btn--primary" @click="emit('view')">
          {{ pending || selected?.kind !== 'personalised' ? 'Compare your estimates' : 'View selected valuation' }} <Icon class="arrow" name="arrow-right" :size="18" :stroke="2.5" />
        </button>
        <button v-if="editable" type="button" class="text-btn" @click="emit('edit')"><Icon name="edit" :size="16" /> Update answers</button>
        <p v-if="selected">{{ selected.kind === 'personalised' ? 'Personalised' : 'Instant' }} estimate selected · {{ money(selected.estimate) }}</p>
      </div>
    </div>
  </section>
</template>
