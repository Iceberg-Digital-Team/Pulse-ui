<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../lib/api'
import { slugFromHost } from '../lib/site'
import { loadWizard, saveWizard, clearWizard, markOwner, isOwner } from '../lib/session'
import { loadContact } from '../lib/contactCache'
import { applyTheme, resolveAsset } from '../lib/theme'
import { listenForPreview, reportHeight } from '../lib/bridge'
import Icon from '../components/Icon.vue'
import TypeChoice from '../components/TypeChoice.vue'
import StepPostcode from '../components/StepPostcode.vue'
import StepContact from '../components/StepContact.vue'
import ResultView from '../components/ResultView.vue'
import NotAvailable from './NotAvailable.vue'

const props = defineProps({
  slug: { type: String, required: true },
  valuationId: { type: String, default: '' }, // set on a result's own page: /<valuation id>
})
const route = useRoute()
const router = useRouter()
const embed = route.query.embed === '1'
const preview = route.query.preview === '1'

const config = ref(null)
const state = ref('loading') // loading | ready | missing

// type → postcode → contact → result
const step = ref('postcode')
const valuationType = ref('selling')
const typeChosen = ref(false)
const address = ref(null)
const property = ref(null)
const lead = ref(null)
const savedPersonalisation = ref(null) // a loaded report's personalised estimate
const savedChoice = ref(null) // and the estimate the homeowner chose for it
const reportState = ref('') // '' | loading | missing (a result URL that can't be loaded)
const stepRoot = ref(null)

// The page's own URLs: the wizard, and each result at /<valuation id> so it can be reopened and shared.
// On a company subdomain the wizard is '/'; elsewhere (localhost, the Railway domain) it is '/<slug>'.
const onSubdomain = slugFromHost(location.hostname) === props.slug
const wizardPath = onSubdomain ? '/' : `/${props.slug}`
const resultPath = (id) => (onSubdomain ? `/${id}` : `/${props.slug}/${id}`)
const keptQuery = () => ({ ...(embed ? { embed: '1' } : {}), ...(preview ? { preview: '1' } : {}) })
// The cockpit preview shares the page's storage; it must not leave a half-filled form behind.
const remember = !preview

const features = computed(() => ({ sales: true, lettings: true, personalise: true, ...(config.value?.features || {}) }))
const content = computed(() => config.value?.content || {})
const branding = computed(() => config.value?.branding || {})
// The map pin shows the company: a square favicon reads best that small, else the logo.
const markerLogo = computed(() => resolveAsset(branding.value.faviconUrl) || resolveAsset(branding.value.logoUrl) || '')
const bothServices = computed(() => features.value.sales && features.value.lettings)
const initials = computed(() =>
  (config.value?.name || '?').replace(/&/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase(),
)

const wizardStep = computed(() => (step.value === 'postcode' && bothServices.value && !typeChosen.value ? 'type' : step.value))
const title = computed(() => {
  if (wizardStep.value === 'type') return 'What would you like a valuation for?'
  if (wizardStep.value === 'contact') return 'Almost finished'
  return content.value.headline || 'Get an instant home valuation'
})
// Visible progress through the short wizard (type step only when both services are on).
const wizardSteps = computed(() => [
  ...(bothServices.value ? [{ key: 'type', label: 'Valuation type' }] : []),
  { key: 'postcode', label: 'Your address' },
  { key: 'contact', label: 'Your details' },
])
const stepIndex = computed(() => wizardSteps.value.findIndex((s) => s.key === wizardStep.value))

// Each wizard step has its own URL hash (#1, #2, #3), as on Neuron, so the browser's back and forward
// buttons move between steps. The cockpit preview replaces instead, so it never fills the cockpit's history.
const stepHash = (key) => `#${wizardSteps.value.findIndex((s) => s.key === key) + 1}`
const keyFromHash = (hash) => wizardSteps.value[Number(String(hash).replace('#', '')) - 1]?.key || null
let replaceNext = true // the first hash (page load, restored step) replaces the entry it lands on

// Move the wizard to a step; false when that step can't be shown yet (the details step needs an address).
function applyStep(key) {
  if (key === 'contact' && !address.value) return false
  if (key === 'type') typeChosen.value = false
  else typeChosen.value = true
  step.value = key === 'type' ? 'postcode' : key
  return true
}

watch([wizardStep, () => state.value, () => props.valuationId], () => {
  if (state.value !== 'ready' || step.value === 'result' || props.valuationId) return
  const hash = stepHash(wizardStep.value)
  if (route.hash === hash) return
  const to = { path: route.path, query: route.query, hash }
  if (replaceNext || preview) router.replace(to)
  else router.push(to)
  replaceNext = false
}, { flush: 'post' })

// Browser back / forward (or a typed hash).
watch(() => route.hash, (hash) => {
  if (state.value !== 'ready' || step.value === 'result' || props.valuationId) return
  const key = keyFromHash(hash)
  if (key === wizardStep.value) return
  if (!key || !applyStep(key)) {
    replaceNext = true // put the hash back to the step actually shown
    router.replace({ path: route.path, query: route.query, hash: stepHash(wizardStep.value) })
  }
})

// The Back button: the browser's own back when the previous entry is the step before, so the history and
// the button never disagree; otherwise (a refresh, a link) just show the step before.
function stepBack() {
  const prev = wizardSteps.value[stepIndex.value - 1]?.key
  if (!prev) return
  if (window.history.state?.back?.endsWith(stepHash(prev))) router.back()
  else { replaceNext = true; applyStep(prev) }
}

const typeLabel = computed(() => (valuationType.value === 'lettings' ? 'Lettings valuation' : 'Selling valuation'))

function useConfig(next) {
  config.value = next
  applyTheme(next)
  if (!features.value.sales && features.value.lettings) valuationType.value = 'lettings'
  if (!features.value.lettings) valuationType.value = 'selling'
  state.value = 'ready'
}

let stopHeight = () => {}
let stopPreview = () => {}
onMounted(async () => {
  stopHeight = reportHeight()
  if (preview) stopPreview = listenForPreview((draft) => useConfig({ ...config.value, ...draft, slug: props.slug }))
  try {
    useConfig(await api.config(props.slug))
  } catch (e) {
    // In preview the cockpit sends the draft, so a page that was never published is fine.
    if (!preview || e.status !== 404) state.value = 'missing'
  }
  if (!props.valuationId && remember) restoreWizard()
  // A step in the URL wins over the remembered one (e.g. a refresh on #2 after going back from #3).
  const fromHash = !props.valuationId && keyFromHash(route.hash)
  if (fromHash) applyStep(fromHash)
})

// A refresh brings the homeowner back to the step they were on, as on Neuron.
function restoreWizard() {
  const w = loadWizard(props.slug)
  if (!w) return
  if ((w.valuationType === 'lettings' && !features.value.lettings) || (w.valuationType === 'selling' && !features.value.sales)) return
  valuationType.value = w.valuationType
  typeChosen.value = w.typeChosen
  address.value = w.address
  step.value = w.step
  if (w.address) api.property(props.slug, w.address.uprn).then((p) => { property.value = p }).catch(() => {})
}
watch([step, valuationType, typeChosen, address], () => {
  if (remember && step.value !== 'result') saveWizard(props.slug, { step: step.value, valuationType: valuationType.value, typeChosen: typeChosen.value, address: address.value })
})

// The result page: opened right after the contact step, or straight from its URL (refresh, shared link).
watch(() => props.valuationId, (id) => {
  if (id && lead.value?.valuation_id !== id) loadReport(id)
  else if (!id && step.value === 'result') goBack() // browser back from a result: same as its Back button
}, { immediate: true })

async function loadReport(id) {
  reportState.value = 'loading'
  try {
    const r = await api.report(props.slug, id)
    const a = r.addressSnapshot || {}
    address.value = { uprn: r.propertyUPRN, full: a.full, postcode: a.postcode, coordinates: a.coordinates || null }
    // Contact details are never in a report; this browser may still have them for the expert form.
    lead.value = {
      ...(loadContact(props.slug) || {}),
      valuation_id: r._id,
      valuationType: r.valuationType || 'selling',
      valuation: r.valuationSnapshot || null,
      rentalValuation: r.rentalValuationSnapshot || null,
    }
    savedPersonalisation.value = r.personalisation || null
    savedChoice.value = r.estimateChoice || null
    property.value = null
    api.property(props.slug, r.propertyUPRN).then((p) => { property.value = p }).catch(() => {})
    step.value = 'result'
    reportState.value = ''
  } catch {
    reportState.value = 'missing'
  }
}

function showResult(l) {
  markOwner(l.valuation_id)
  lead.value = l
  savedPersonalisation.value = null
  savedChoice.value = null
  step.value = 'result'
  if (remember) clearWizard(props.slug)
  router.push({ path: resultPath(l.valuation_id), query: keptQuery() })
}
onBeforeUnmount(() => { stopHeight(); stopPreview() })

watch(wizardStep, async () => {
  await nextTick()
  const root = stepRoot.value
  ;(root?.querySelector('input') || root?.querySelector('button'))?.focus({ preventScroll: true })
})
watch(step, async (s) => {
  if (!embed) window.scrollTo({ top: 0, behavior: 'auto' })
  if (s === 'result') {
    await nextTick()
    document.querySelector('[data-step-heading]')?.focus({ preventScroll: true })
  }
})

function chooseType(type) {
  valuationType.value = type
  typeChosen.value = true
}

function pickAddress(a) {
  address.value = a
  property.value = null
  step.value = 'contact'
  // Warm the (slow) valuation while the contact form is filled in, and load the property facts
  // shown on the result page.
  api.prewarm(props.slug, a.uprn, valuationType.value)
  api.property(props.slug, a.uprn).then((p) => { property.value = p }).catch(() => {})
}

// Back from a result, as on Neuron: the address step again, with the same type and the address list
// for the same postcode, so another flat in the building or a typo is one click away.
const backToAddress = ref(false)
function goBack() {
  const kind = lead.value?.valuationType
  restart()
  if (kind) valuationType.value = kind
  typeChosen.value = true
  address.value = lastAddress
  backToAddress.value = true
}
let lastAddress = null
watch(address, (a) => { if (a) lastAddress = a })

function restart() {
  replaceNext = true
  backToAddress.value = false
  step.value = 'postcode'
  typeChosen.value = false
  address.value = null
  property.value = null
  lead.value = null
  savedPersonalisation.value = null
  savedChoice.value = null
  reportState.value = ''
  if (props.valuationId) router.push({ path: wizardPath, query: keptQuery() })
}
</script>

<template>
  <NotAvailable v-if="state === 'missing'" />

  <div v-else-if="state === 'loading' || reportState === 'loading'" class="loading-screen" aria-busy="true">
    <span class="spinner spinner--lg" style="color: #FFFFFF" aria-hidden="true"></span>
    <span class="sr-only">Loading</span>
  </div>

  <main v-else-if="reportState === 'missing'" class="hero" :class="{ 'hero--embed': embed }">
    <div class="hero__inner hero__inner--narrow">
      <h1 class="hero__title">We couldn't load this valuation</h1>
      <p class="hero__sub">Please check the link and try again, or start a new valuation.</p>
      <button type="button" class="btn btn--primary" @click="restart">Start a new valuation <Icon class="arrow" name="arrow-right" :size="18" :stroke="2.5" /></button>
    </div>
  </main>

  <ResultView
    v-else-if="step === 'result' && lead"
    :company="slug"
    :company-name="config.name"
    :content="content"
    :key="lead.valuation_id"
    :owner="isOwner(lead.valuation_id)"
    :lead="lead"
    :saved-personalisation="savedPersonalisation"
    :saved-choice="savedChoice"
    :address="address"
    :property="property"
    :can-personalise="features.personalise && lead.valuationType === 'selling'"
    :embed="embed"
    :opening-hours="config.openingHours || null"
    :marker-logo="markerLogo"
    @restart="restart"
    @back="goBack"
  />

  <main v-else class="hero" :class="{ 'hero--embed': embed }">
    <div class="hero__inner" :class="{ 'hero__inner--narrow': wizardStep === 'contact' }">
      <header class="brand">
        <img v-if="resolveAsset(branding.logoUrl)" class="brand__logo" :src="resolveAsset(branding.logoUrl)" :alt="config.name" />
        <template v-else>
          <span class="brand__mark" aria-hidden="true">{{ initials }}</span>
          <span class="brand__name">{{ config.name }}</span>
        </template>
      </header>

      <h1 class="hero__title">{{ title }}</h1>
      <p class="hero__sub">{{ content.subtext || "Find out what your home is worth in today's market." }}</p>

      <div ref="stepRoot" class="wizard-card">
        <button v-if="stepIndex > 0" type="button" class="step-back" @click="stepBack">
          <Icon name="arrow-left" :size="16" :stroke="2.25" /> Back
        </button>
        <ol class="steps" aria-label="Progress">
          <li
            v-for="(s, i) in wizardSteps"
            :key="s.key"
            :class="{ 'is-done': i < stepIndex, 'is-current': i === stepIndex }"
            :aria-current="i === stepIndex ? 'step' : undefined"
          >
            <span>{{ s.label }}<span class="sr-only">{{ i < stepIndex ? ' (completed)' : '' }}</span></span>
          </li>
        </ol>
        <Transition name="fade" mode="out-in">
          <TypeChoice v-if="wizardStep === 'type'" key="type" @select="chooseType" />

          <div v-else-if="wizardStep === 'postcode'" key="postcode">
            <div v-if="bothServices" class="type-summary">
              <span>{{ typeLabel }}</span>
              <button type="button" class="link-btn" @click="stepBack">Change</button>
            </div>
            <StepPostcode
              :company="slug"
              :initial-postcode="address?.postcode"
              :auto-search="backToAddress"
              :cta-label="valuationType === 'lettings' ? content.lettingCtaLabel : content.saleCtaLabel"
              @pick="pickAddress"
            />
          </div>

          <StepContact
            v-else-if="wizardStep === 'contact'"
            key="contact"
            :company="slug"
            :company-name="config.name"
            :address="address"
            :valuation-type="valuationType"
            :privacy-policy-url="content.privacyPolicyUrl"
            @created="showResult"
            @back="stepBack"
          />
        </Transition>
      </div>

      <p v-if="wizardStep === 'contact'" class="hero__foot"><Icon name="shield" :size="16" /> We don't share your details with third parties</p>
      <ul v-else class="trust">
        <li><Icon name="clock" :size="16" /> About 60 seconds</li>
        <li><Icon name="check" :size="16" :stroke="2.5" /> Free, no obligation</li>
        <li><Icon name="chart" :size="16" /> Based on recent local sales</li>
      </ul>
    </div>
  </main>
</template>
