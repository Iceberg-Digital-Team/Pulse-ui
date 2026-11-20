<script setup>
// Personalise dialog: one question per step, then the price band, then the personalised estimate.
// Stays mounted while the page is open, so closing it keeps the answers and reopening continues.
// Reopened after an estimate, it starts on a review of the answers; any one can be edited.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '../lib/api'
import { money, moneyShort, COMP_STATUS, comparableDate } from '../lib/format'
import { buildAnswers, initialAnswers } from '../lib/questions'
import { loadDraft, saveDraft, clearDraft } from '../lib/session'
import { questionSequence, questionCopy, questionError, optionHint, answerText, progressLabel, followUps, isInline } from '../lib/personalise'
import Icon from './Icon.vue'

const props = defineProps({ company: String, valuationId: String, address: String, open: Boolean })
const emit = defineEmits(['close', 'completed', 'progress'])

const phase = ref('idle') // idle | loading | questions | bands-loading | bands | computing | done | review | error
const failure = ref('')
let retry = null
const screens = ref([])
const questions = ref([])
const answers = ref({})
const currentKey = ref(null)
const confirmed = ref(new Set())
const stepError = ref('')
const followError = ref('') // the box under the answer (e.g. the agent's figure)
const bands = ref(null)
const band = ref(null)
const dialog = ref(null)
const scroller = ref(null)
const editing = ref(false) // one answer opened from the review
let opener = null

const sequence = computed(() => questionSequence(screens.value, questions.value, answers.value))
const current = computed(() => sequence.value.find((q) => q.key === currentKey.value) || sequence.value[0] || null)
const index = computed(() => Math.max(0, sequence.value.indexOf(current.value)))
const copy = computed(() => (current.value ? questionCopy(current.value, answers.value) : null))
const totalSteps = computed(() => sequence.value.length + 1) // + price band
const stepNumber = computed(() => (phase.value === 'bands' ? totalSteps.value : index.value + 1))
const stepLabel = computed(() => progressLabel({ number: stepNumber.value, total: totalSteps.value, questions: questions.value, confirmed: confirmed.value }))
const progress = computed(() => Math.round((stepNumber.value / totalSteps.value) * 100))
const busy = computed(() => ['loading', 'bands-loading', 'computing'].includes(phase.value))
const selectedBand = computed(() => bands.value?.bands.find((b) => b.id === band.value) || null)
const bandHomes = computed(() => selectedBand.value?.comparables || [])

watch(() => confirmed.value.size, (n) => emit('progress', n))

// Answers given so far survive a refresh (kept in this browser per valuation, cleared once the
// estimate is made). The report shows "n answers kept" before the dialog is even opened.
const draft = loadDraft(props.valuationId)
onMounted(() => { if (draft?.confirmed.length) emit('progress', draft.confirmed.length) })
watch([answers, confirmed, currentKey, band, phase], () => {
  if (!['questions', 'bands-loading', 'bands'].includes(phase.value)) return
  saveDraft(props.valuationId, { answers: answers.value, confirmed: [...confirmed.value], currentKey: currentKey.value, band: band.value })
}, { deep: true })

// ---------- open / close ----------
function setPageInert(on) {
  const app = document.getElementById('app')
  if (app) app.inert = on
  document.body.style.overflow = on ? 'hidden' : ''
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      opener = document.activeElement
      setPageInert(true)
      if (phase.value === 'idle' || (phase.value === 'error' && !questions.value.length)) load()
      else if (phase.value === 'done' || phase.value === 'review' || (phase.value === 'error' && bands.value)) showReview()
      else if (phase.value === 'questions') currentKey.value = sequence.value.find((q) => !confirmed.value.has(q.key))?.key || currentKey.value
      focusTitle()
    } else {
      setPageInert(false)
      stepError.value = ''
      await nextTick()
      if (opener?.isConnected) opener.focus()
    }
  },
)
onBeforeUnmount(() => setPageInert(false))

const close = () => emit('close')

async function focusTitle() {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = 0
  dialog.value?.querySelector('[data-title]')?.focus()
}

// Keep Tab inside the dialog.
function trapFocus(e) {
  const nodes = [...dialog.value.querySelectorAll('button, input, select, [tabindex="0"]')].filter((el) => !el.disabled && el.getClientRects().length)
  if (!nodes.length) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

// ---------- loading ----------
function fail(e, again) {
  failure.value = e.status === 404 ? "We don't have enough local sales data to personalise this valuation yet." : e.message
  retry = again
  phase.value = 'error'
  focusTitle()
}

async function load() {
  phase.value = 'loading'
  try {
    const data = await api.personaliseQuestions(props.company, props.valuationId)
    screens.value = data.screens || []
    questions.value = data.questions || []
    answers.value = initialAnswers(questions.value)
    currentKey.value = sequence.value[0]?.key
    if (draft) restoreDraft(draft)
    phase.value = 'questions'
    focusTitle()
  } catch (e) {
    fail(e, load)
  }
}

function restoreDraft(d) {
  const known = new Set(questions.value.map((q) => q.key))
  answers.value = { ...answers.value, ...Object.fromEntries(Object.entries(d.answers).filter(([k]) => known.has(k))) }
  confirmed.value = new Set(d.confirmed.filter((k) => known.has(k)))
  band.value = d.band
  const seq = sequence.value
  currentKey.value = seq.find((q) => q.key === d.currentKey)?.key || seq.find((q) => !confirmed.value.has(q.key))?.key || seq[0]?.key
}

// ---------- answers ----------
const set = (key, value) => {
  answers.value = { ...answers.value, [key]: value }
  stepError.value = ''
  followError.value = ''
}
const extras = computed(() => followUps(questions.value, current.value, answers.value))
// The box opens as soon as the answer that needs it is picked; focus moves into it.
watch(() => extras.value.map((f) => f.key).join(), async (keys, before) => {
  if (!keys || keys === before || phase.value !== 'questions') return
  await nextTick()
  dialog.value?.querySelector(`#pd-${extras.value[0].key}`)?.focus()
})
// Whole pounds, shown with separators as they type: "450000" → "450,000".
const followDescribedBy = (f) => [questionCopy(f, answers.value).hint ? `pd-${f.key}-hint` : '', followError.value ? `pd-${f.key}-error` : ''].filter(Boolean).join(' ') || undefined
const moneyValue = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toLocaleString('en-GB'))
function setMoney(key, e) {
  const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
  set(key, digits ? Number(digits) : null)
  e.target.value = moneyValue(answers.value[key])
}
const isOn = (key, value) => Array.isArray(answers.value[key]) && answers.value[key].includes(value)
function toggle(key, value) {
  const list = Array.isArray(answers.value[key]) ? answers.value[key].filter((v) => v !== value) : []
  if (!isOn(key, value)) list.push(value)
  set(key, list)
}
const noneChosen = (key) => Array.isArray(answers.value[key]) && answers.value[key].length === 0
const chooseNone = (key) => set(key, noneChosen(key) ? undefined : [])

const isStepper = (q) => q.type === 'number' && q.integer && (q.max ?? 999) <= 20
function step(q, d) {
  const cur = answers.value[q.key]
  const next = cur === null || cur === undefined ? Math.max(q.min ?? 0, 1) : Number(cur) + d
  set(q.key, Math.min(q.max ?? 99, Math.max(q.min ?? 0, next)))
}
const isYesNo = (q) => q.options?.length === 2 && q.options.every((o) => ['yes', 'no'].includes(o.value))
// Yes before No, as people expect to read them.
const options = (q) => (isYesNo(q) ? [...q.options].sort((a, b) => (a.value === 'yes' ? -1 : b.value === 'yes' ? 1 : 0)) : q.options)

// ---------- navigation ----------
async function next() {
  const q = current.value
  const message = questionError(q, answers.value[q.key], answers.value)
  if (message) {
    stepError.value = message
    return
  }
  for (const f of extras.value) {
    const m = questionError(f, answers.value[f.key], answers.value)
    if (m) {
      followError.value = m
      dialog.value?.querySelector(`#pd-${f.key}`)?.focus()
      return
    }
  }
  stepError.value = ''
  const done = new Set(confirmed.value).add(q.key)
  extras.value.forEach((f) => done.add(f.key))
  confirmed.value = done
  if (editing.value) return showReview()
  const seq = sequence.value
  const i = seq.indexOf(q)
  if (i < seq.length - 1) {
    currentKey.value = seq[i + 1].key
    focusTitle()
    return
  }
  loadBands()
}

async function loadBands() {
  phase.value = 'bands-loading'
  try {
    const data = await api.priceBands(props.company, props.valuationId, buildAnswers(questions.value, answers.value))
    if (!data?.bands?.length) return compute(null)
    const keep = data.bands.some((b) => b.id === band.value)
    bands.value = data
    if (!keep) band.value = data.defaultBand
    phase.value = 'bands'
    focusTitle()
  } catch (e) {
    fail(e, loadBands)
  }
}

function back() {
  stepError.value = ''
  if (editing.value) return showReview()
  if (phase.value === 'bands') {
    phase.value = 'questions'
    currentKey.value = sequence.value.at(-1)?.key
  } else if (index.value > 0) {
    currentKey.value = sequence.value[index.value - 1].key
  } else {
    return close()
  }
  focusTitle()
}

async function compute(bandId) {
  phase.value = 'computing'
  if (scroller.value) scroller.value.scrollTop = 0
  try {
    const data = await api.personalise(props.company, props.valuationId, buildAnswers(questions.value, answers.value), bandId)
    phase.value = 'done'
    clearDraft(props.valuationId)
    emit('completed', data.personalisation)
  } catch (e) {
    fail(e, () => compute(bandId))
  }
}

// ---------- review (after an estimate) ----------
function showReview() {
  editing.value = false
  stepError.value = ''
  phase.value = 'review'
  focusTitle()
}
function editAnswer(key) {
  editing.value = true
  if (key === 'band') return loadBands()
  const q = questions.value.find((x) => x.key === key)
  currentKey.value = q && isInline(q) ? q.showIf.key : key
  phase.value = 'questions'
  focusTitle()
}
const invalid = (q) => !!questionError(q, answers.value[q.key], answers.value)
const reviewRows = computed(() =>
  sequence.value
    .flatMap((q) => [q, ...followUps(questions.value, q, answers.value)])
    .map((q) => ({ q, text: answerText(q, answers.value[q.key]), missing: invalid(q) })),
)
const bandText = computed(() => (selectedBand.value ? `${moneyShort(selectedBand.value.min)} – ${moneyShort(selectedBand.value.max)}` : ''))

// The bands depend on the answers, so they are fetched again; the chosen one is kept while it exists.
async function reviewEstimates() {
  const missing = reviewRows.value.find((r) => r.missing)?.q
  if (missing) return editAnswer(missing.key)
  phase.value = 'computing'
  try {
    const data = await api.priceBands(props.company, props.valuationId, buildAnswers(questions.value, answers.value))
    if (data?.bands?.length) {
      bands.value = data
      if (!data.bands.some((b) => b.id === band.value)) band.value = data.defaultBand
    }
    await compute(data?.bands?.length ? band.value : null)
  } catch (e) {
    fail(e, reviewEstimates)
  }
}

const bandOption = (b) => `${moneyShort(b.min)} – ${moneyShort(b.max)} (${b.count} ${b.count === 1 ? 'home' : 'homes'})`
const homeSub = (h) => [h.bedrooms != null ? `${h.bedrooms} ${h.bedrooms === 1 ? 'bedroom' : 'bedrooms'}` : '', h.floorArea ? `${Math.round(h.floorArea)} m²` : '', h.propertyType || ''].filter(Boolean).join(' · ')
</script>

<template>
  <Teleport to="body">
    <div v-show="open" class="pd-backdrop" @click.self="close">
      <section
        ref="dialog"
        class="pd"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pd-heading"
        aria-describedby="pd-address"
        @keydown.esc.stop.prevent="close"
        @keydown.tab="trapFocus"
      >
        <header class="pd__header">
          <div class="pd__head-row">
            <div>
              <p id="pd-heading" class="pd__heading">Personalise your valuation</p>
              <p id="pd-address" class="pd__address">{{ address }}</p>
            </div>
            <button type="button" class="pd__close" aria-label="Close personalisation" @click="close"><Icon name="close" :size="22" :stroke="2.5" /></button>
          </div>
          <div v-if="(phase === 'questions' || phase === 'bands') && !editing" class="pd__progress">
            <div class="pd__progress-row">
              <span>{{ phase === 'bands' ? 'Similar homes' : copy?.category }}</span>
              <span>{{ stepLabel }}</span>
            </div>
            <div class="pd__track" role="progressbar" aria-label="Personalisation progress" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="progress">
              <span :style="{ width: `${progress}%` }"></span>
            </div>
          </div>
        </header>

        <div ref="scroller" class="pd__body">
          <!-- loading / working -->
          <div v-if="busy" class="pd-state" role="status" aria-live="polite">
            <span class="pd-state__icon" aria-hidden="true"><Icon :name="phase === 'loading' ? 'sparkle' : 'search'" :size="28" /></span>
            <h2 class="pd-state__title" tabindex="-1" data-title>
              {{ phase === 'loading' ? 'Getting your questions ready' : 'Checking similar homes' }}
            </h2>
            <p class="pd-state__text">
              {{ phase === 'computing' ? 'Bringing your property details and nearby comparisons together.' : 'Looking at recent sales and listings near you.' }}
            </p>
            <div class="pd-state__line" aria-hidden="true"><span></span></div>
          </div>

          <!-- error -->
          <div v-else-if="phase === 'error'" class="pd-state">
            <span class="pd-state__icon pd-state__icon--error" aria-hidden="true"><Icon name="alert" :size="28" /></span>
            <h2 class="pd-state__title" tabindex="-1" data-title>We couldn't finish that</h2>
            <p class="pd-state__text" role="alert">{{ failure }}</p>
            <button type="button" class="btn btn--primary" @click="retry && retry()">Try again</button>
          </div>

          <!-- price band -->
          <template v-else-if="phase === 'bands'">
            <div class="pd__intro">
              <h2 class="pd__title" tabindex="-1" data-title>See how nearby homes compare</h2>
              <p class="pd__hint">Look at bedrooms, size and property type. You can continue with the band already shown.</p>
            </div>
            <div class="pd-band">
              <div class="field">
                <label class="label" for="pd-band">Compare a price band</label>
                <div class="select">
                  <select id="pd-band" v-model="band" class="input" aria-describedby="pd-band-help">
                    <option v-for="b in bands.bands" :key="b.id" :value="b.id">{{ bandOption(b) }}</option>
                  </select>
                  <Icon name="chevron-down" :size="18" />
                </div>
              </div>
              <p id="pd-band-help">Keep this band to continue. You can explore other bands if the homes look different from yours.</p>
            </div>
            <div class="pd-homes__head">
              <strong>Homes in this band <span>({{ bandHomes.length }})</span></strong>
              <span v-if="band === bands.defaultBand" class="pd-homes__badge">Starting band</span>
            </div>
            <ul v-if="bandHomes.length" class="pd-homes">
              <li v-for="(h, i) in bandHomes" :key="h.uprn || `${h.address}-${i}`" class="pd-home">
                <div class="pd-home__price">{{ money(h.price) }}</div>
                <div class="pd-home__body">
                  <div class="pd-home__address">{{ h.address }}</div>
                  <div class="pd-home__sub">{{ homeSub(h) }}</div>
                </div>
                <div class="pd-home__meta">
                  <span class="status-pill" :class="`is-${h.status}`">{{ COMP_STATUS[h.status] || 'Listed' }}</span>
                  <span v-if="h.date">{{ comparableDate(h.status, h.date) }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="pd__empty">There are no homes to show in this band.</p>
            <p class="pd__note">“For sale” shows an asking price; “Sold” shows a recorded sale.</p>
          </template>

          <!-- review of the answers -->
          <section v-else-if="phase === 'review'" class="pd-review" aria-labelledby="pd-review-title">
            <div class="pd__intro">
              <h2 id="pd-review-title" class="pd__title" tabindex="-1" data-title>Review your answers</h2>
              <p class="pd__hint">Change any answer directly. Your current report stays the same until you confirm your estimate.</p>
            </div>
            <dl class="pd-review__list">
              <div v-for="r in reviewRows" :key="r.q.key">
                <dt>{{ questionCopy(r.q, answers).title }}</dt>
                <dd>
                  <span>{{ r.text || 'Not answered' }}</span>
                  <span v-if="r.missing" class="pd-review__missing">Needs an answer</span>
                </dd>
                <button type="button" class="text-btn" :aria-label="`Edit: ${questionCopy(r.q, answers).title}`" @click="editAnswer(r.q.key)">Edit <Icon name="edit" :size="16" /></button>
              </div>
              <div v-if="bandText">
                <dt>Price band</dt>
                <dd><span>{{ bandText }}</span></dd>
                <button type="button" class="text-btn" aria-label="Edit: price band" @click="editAnswer('band')">Edit <Icon name="edit" :size="16" /></button>
              </div>
            </dl>
          </section>

          <!-- one question -->
          <template v-else-if="phase === 'questions' && current">
            <div class="pd__intro">
              <h2 id="pd-q-title" class="pd__title" tabindex="-1" data-title>{{ copy.title }}</h2>
              <p v-if="copy.hint" id="pd-q-hint" class="pd__hint">{{ copy.hint }}</p>
              <p v-if="copy.previous" class="pd__previous"><Icon name="check" :size="14" :stroke="3" /> Your previous answer</p>
            </div>

            <div :key="current.key" class="pd__panel" role="group" aria-labelledby="pd-q-title" :aria-describedby="copy.hint ? 'pd-q-hint' : undefined">
              <div v-if="current.type === 'single'" class="pd-options" :class="{ 'pd-options--yesno': isYesNo(current) }">
                <label v-for="o in options(current)" :key="o.value" class="pd-option" :class="{ 'pd-option--hinted': optionHint(current, o.value) }">
                  <input type="radio" :name="current.key" :value="o.value" :checked="answers[current.key] === o.value" @change="set(current.key, o.value)" />
                  <span class="pd-indicator pd-indicator--radio" aria-hidden="true"></span>
                  <span v-if="optionHint(current, o.value)" class="pd-option__text">{{ o.label }}<small>{{ optionHint(current, o.value) }}</small></span>
                  <span v-else>{{ o.label }}</span>
                </label>
              </div>


              <template v-else-if="current.type === 'multi'">
                <div class="pd-options">
                  <label v-for="o in current.options" :key="o.value" class="pd-option">
                    <input type="checkbox" :checked="isOn(current.key, o.value)" @change="toggle(current.key, o.value)" />
                    <span class="pd-indicator" aria-hidden="true"><Icon name="check" :size="13" :stroke="3.5" /></span>
                    <span>{{ o.label }}</span>
                  </label>
                </div>
                <label class="pd-option pd-option--none">
                  <input type="checkbox" :checked="noneChosen(current.key)" @change="chooseNone(current.key)" />
                  <span class="pd-indicator" aria-hidden="true"><Icon name="check" :size="13" :stroke="3.5" /></span>
                  <span>None of these</span>
                </label>
              </template>

              <div v-else-if="isStepper(current)" class="pd-counter">
                <button type="button" :aria-label="`Fewer ${current.label.toLowerCase()}`" :disabled="(answers[current.key] ?? 0) <= (current.min ?? 0)" @click="step(current, -1)"><span aria-hidden="true">−</span></button>
                <output aria-live="polite" :aria-label="current.label">{{ answers[current.key] ?? '–' }}</output>
                <button type="button" :aria-label="`More ${current.label.toLowerCase()}`" :disabled="(answers[current.key] ?? 0) >= (current.max ?? 99)" @click="step(current, 1)"><span aria-hidden="true">+</span></button>
              </div>

              <div v-else class="pd-number">
                <span v-if="copy.prefix" class="pd-number__affix" aria-hidden="true">{{ copy.prefix }}</span>
                <input
                  class="input"
                  type="number"
                  inputmode="numeric"
                  :aria-labelledby="'pd-q-title'"
                  :aria-invalid="!!stepError"
                  :min="current.min"
                  :max="current.max"
                  :placeholder="copy.suffix === 'years' ? 'e.g. 125' : ''"
                  :value="answers[current.key] ?? ''"
                  @input="set(current.key, $event.target.value === '' ? null : Number($event.target.value))"
                  @keydown.enter.prevent="next"
                />
                <span v-if="copy.suffix" class="pd-number__affix" aria-hidden="true">{{ copy.suffix }}</span>
              </div>
            </div>

            <p v-if="stepError" class="field-error pd__error" role="alert"><Icon name="alert" :size="16" />{{ stepError }}</p>

            <div v-for="f in extras" :key="f.key" class="pd-follow">
              <label class="label" :for="`pd-${f.key}`">{{ questionCopy(f, answers).title }}</label>
              <p v-if="questionCopy(f, answers).hint" :id="`pd-${f.key}-hint`" class="pd-follow__hint">{{ questionCopy(f, answers).hint }}</p>
              <div v-if="f.currency" class="pd-money" :class="{ 'is-invalid': followError }">
                <span aria-hidden="true">£</span>
                <input
                  :id="`pd-${f.key}`"
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  placeholder="e.g. 450,000"
                  :aria-describedby="followDescribedBy(f)"
                  :aria-invalid="!!followError"
                  :value="moneyValue(answers[f.key])"
                  @input="setMoney(f.key, $event)"
                  @keydown.enter.prevent="next"
                />
              </div>
              <input
                v-else
                :id="`pd-${f.key}`"
                class="input pd-text"
                :class="{ 'is-invalid': followError }"
                type="text"
                autocomplete="off"
                :maxlength="f.maxLength || 200"
                :placeholder="questionCopy(f, answers).placeholder"
                :aria-describedby="followDescribedBy(f)"
                :aria-invalid="!!followError"
                :value="answers[f.key] ?? ''"
                @input="set(f.key, $event.target.value)"
                @keydown.enter.prevent="next"
              />
              <p v-if="followError" :id="`pd-${f.key}-error`" class="field-error pd__error" role="alert"><Icon name="alert" :size="16" />{{ followError }}</p>
            </div>
          </template>
        </div>

        <footer v-if="phase === 'review'" class="pd__footer">
          <button type="button" class="btn btn--secondary" @click="close">Close</button>
          <button type="button" class="btn btn--primary" @click="reviewEstimates">
            Review my estimates <Icon class="arrow" name="arrow-right" :size="18" :stroke="2.5" />
          </button>
        </footer>
        <footer v-else-if="phase === 'questions' || phase === 'bands'" class="pd__footer">
          <button type="button" class="btn btn--secondary" @click="back">
            <Icon v-if="!editing && (phase === 'bands' || index > 0)" name="chevron-left" :size="18" :stroke="2.5" />
            {{ editing ? 'All answers' : phase === 'questions' && index === 0 ? 'Cancel' : 'Back' }}
          </button>
          <button v-if="phase === 'bands'" type="button" class="btn btn--primary" :disabled="!bandHomes.length" @click="editing ? showReview() : compute(band)">
            {{ editing ? 'Save answer' : 'Use this band and compare' }} <Icon class="arrow" name="arrow-right" :size="18" :stroke="2.5" />
          </button>
          <button v-else type="button" class="btn btn--primary" @click="next">
            {{ editing ? 'Save answer' : 'Continue' }} <Icon class="arrow" name="arrow-right" :size="18" :stroke="2.5" />
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
