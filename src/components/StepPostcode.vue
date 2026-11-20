<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '../lib/api'
import { looksLikePostcode, normalisePostcode } from '../lib/format'
import Icon from './Icon.vue'

// autoSearch: list the addresses for initialPostcode straight away (coming back from a result, as on Neuron)
const props = defineProps({ company: String, initialPostcode: String, ctaLabel: String, autoSearch: Boolean })
const emit = defineEmits(['pick'])

const postcode = ref(props.initialPostcode || '')
const addresses = ref([])
const open = ref(false)
const busy = ref(false)
const error = ref('')
const status = ref('')
const wrapper = ref(null)
const list = ref(null)
const input = ref(null)

// Format as the user types: "en91ab" → "EN9 1AB"
watch(postcode, (v) => {
  const formatted = normalisePostcode(v)
  if (formatted !== v) postcode.value = formatted
})

async function find() {
  error.value = ''
  status.value = ''
  if (!postcode.value.trim()) {
    error.value = 'Enter your postcode to find your address.'
    input.value?.focus()
    return
  }
  if (!looksLikePostcode(postcode.value)) {
    error.value = 'Enter a full UK postcode, like SW1A 1AA.'
    input.value?.focus()
    return
  }
  busy.value = true
  try {
    const result = await api.searchAddresses(props.company, postcode.value)
    addresses.value = result || []
    if (!addresses.value.length) error.value = `We couldn't find any addresses for ${postcode.value}. Check the postcode and try again.`
    open.value = addresses.value.length > 0
    if (open.value) {
      status.value = `${addresses.value.length} ${addresses.value.length === 1 ? 'address' : 'addresses'} found. Choose yours from the list.`
      requestAnimationFrame(() => list.value?.querySelector('button')?.focus())
    }
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

function pick(a) {
  open.value = false
  emit('pick', {
    uprn: a.uprn || a.sourceId,
    full: a.address?.full,
    postcode: a.address?.postcode || postcode.value,
    coordinates: a.address?.coordinates || null,
  })
}

// Arrow keys move through the address list; Escape returns to the postcode field.
function onListKey(e) {
  const items = [...(list.value?.querySelectorAll('button') || [])]
  const i = items.indexOf(document.activeElement)
  const move = { ArrowDown: 1, ArrowUp: -1 }[e.key]
  if (move) {
    e.preventDefault()
    items[(i + move + items.length) % items.length]?.focus()
  } else if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault()
    items[e.key === 'Home' ? 0 : items.length - 1]?.focus()
  }
}

const onOutside = (e) => { if (wrapper.value && !wrapper.value.contains(e.target)) open.value = false }
const onKey = (e) => {
  if (e.key !== 'Escape' || !open.value) return
  open.value = false
  input.value?.focus()
}
onMounted(() => {
  document.addEventListener('click', onOutside)
  document.addEventListener('keydown', onKey)
  if (props.autoSearch && postcode.value) find()
})
onBeforeUnmount(() => { document.removeEventListener('click', onOutside); document.removeEventListener('keydown', onKey) })
</script>

<template>
  <form novalidate style="display: flex; flex-direction: column; gap: 16px" @submit.prevent="find">
    <div ref="wrapper" class="combo">
      <div class="field">
        <label class="label" for="postcode">Enter your postcode</label>
        <input
          id="postcode"
          ref="input"
          v-model="postcode"
          class="input"
          type="text"
          autocomplete="postal-code"
          autocapitalize="characters"
          spellcheck="false"
          placeholder="e.g. CO2 7RG"
          aria-required="true"
          :aria-invalid="!!error"
          :aria-describedby="error ? 'postcode-error' : undefined"
          @focus="open = addresses.length > 0"
        />
      </div>
      <div v-if="open" class="dropdown">
        <div id="address-list-label" class="dropdown__label">Select your address</div>
        <ul id="address-list" ref="list" class="dropdown__list" aria-labelledby="address-list-label" @keydown="onListKey">
          <li v-for="a in addresses" :key="a.uprn || a.sourceId">
            <button type="button" class="dropdown__item" @click="pick(a)"><Icon name="pin" :size="16" />{{ a.address?.full }}</button>
          </li>
        </ul>
      </div>
    </div>

    <p v-if="error" id="postcode-error" class="field-error" role="alert" style="margin: 0"><Icon name="alert" :size="16" />{{ error }}</p>
    <p class="sr-only" role="status">{{ status }}</p>

    <button class="btn btn--primary btn--block btn--tall" type="submit" :disabled="busy">
      <span v-if="busy" class="spinner" aria-hidden="true"></span>
      <span :class="{ 'sr-only': busy }">{{ busy ? 'Finding addresses' : ctaLabel || 'Find my address' }}</span>
      <Icon v-if="!busy" name="arrow-right" class="arrow" :size="18" :stroke="2.5" />
    </button>
  </form>
</template>
