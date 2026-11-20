<script setup>
import 'flag-icons/css/flag-icons.min.css'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { DEFAULT_COUNTRY, OTHERS, PRIORITY, country, fromE164, searchCountries, toE164 } from '../lib/phone'
import Icon from './Icon.vue'

// Country picker + number, like Neuron's NcPhoneInput. v-model is the E.164 value sent to the API.
const props = defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, default: 'phone' },
  invalid: Boolean,
  describedby: String,
})
const emit = defineEmits(['update:modelValue', 'blur'])

const code = ref(DEFAULT_COUNTRY)
const national = ref('')
const open = ref(false)
const query = ref('')
const active = ref(0)
const wrapper = ref(null)
const button = ref(null)
const search = ref(null)
const list = ref(null)
const numberInput = ref(null)

const selected = computed(() => country(code.value))
const results = computed(() => searchCountries(query.value))
// Without a search: the usual countries first, a divider, then the rest.
const options = computed(() => results.value || [...PRIORITY, ...OTHERS])
const dividerAfter = computed(() => (results.value ? -1 : PRIORITY.length - 1))
const optionId = (c) => `${props.id}-country-${c.code}`

watch(() => props.modelValue, (value) => {
  if (value === toE164(national.value, code.value)) return
  const parsed = fromE164(value)
  if (parsed) {
    code.value = parsed.code
    national.value = parsed.national
  } else if (!value) {
    national.value = ''
  }
}, { immediate: true })

const update = () => emit('update:modelValue', toE164(national.value, code.value))

async function toggle() {
  open.value = !open.value
  if (!open.value) return
  query.value = ''
  active.value = Math.max(0, options.value.findIndex((c) => c.code === code.value))
  await nextTick()
  search.value?.focus()
  scrollActive()
}
function close(focusButton = true) {
  open.value = false
  if (focusButton) button.value?.focus()
}
function choose(c) {
  code.value = c.code
  update()
  open.value = false
  nextTick(() => numberInput.value?.focus())
}
function scrollActive() {
  nextTick(() => list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }))
}
watch(query, () => { active.value = 0; scrollActive() })

function onSearchKey(e) {
  const n = options.value.length
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    if (!n) return
    active.value = (active.value + (e.key === 'ArrowDown' ? 1 : -1) + n) % n
    scrollActive()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (options.value[active.value]) choose(options.value[active.value])
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'Tab') {
    close(false)
  }
}

const onOutside = (e) => { if (open.value && wrapper.value && !wrapper.value.contains(e.target)) open.value = false }
onMounted(() => document.addEventListener('click', onOutside))
onBeforeUnmount(() => document.removeEventListener('click', onOutside))
</script>

<template>
  <div ref="wrapper" class="phone" :class="{ 'is-invalid': invalid, 'is-open': open }">
    <button
      ref="button"
      type="button"
      class="phone__country"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="`${id}-countries`"
      :aria-label="`Country code: ${selected.name} ${selected.dialCode}. Change country`"
      @click.stop="toggle"
    >
      <span :class="`fi fi-${selected.code.toLowerCase()} phone__flag`" aria-hidden="true"></span>
      <span class="phone__dial" aria-hidden="true">{{ selected.dialCode }}</span>
      <Icon name="chevron-down" :size="16" class="phone__chevron" />
    </button>
    <input
      :id="id"
      ref="numberInput"
      v-model="national"
      class="phone__number"
      type="tel"
      autocomplete="tel-national"
      :placeholder="code === 'GB' ? '07123 456789' : 'Phone number'"
      aria-required="true"
      :aria-invalid="invalid"
      :aria-describedby="describedby"
      @input="update"
      @blur="emit('blur')"
    />

    <div v-if="open" class="phone__menu" @click.stop>
      <div class="phone__search">
        <Icon name="search" :size="16" />
        <input
          ref="search"
          v-model="query"
          type="text"
          role="combobox"
          aria-label="Search countries"
          aria-autocomplete="list"
          :aria-expanded="true"
          :aria-controls="`${id}-countries`"
          :aria-activedescendant="options[active] ? optionId(options[active]) : undefined"
          placeholder="Search country or code"
          autocomplete="off"
          spellcheck="false"
          @keydown="onSearchKey"
        />
      </div>
      <ul :id="`${id}-countries`" ref="list" class="phone__list" role="listbox" aria-label="Countries">
        <template v-for="(c, i) in options" :key="c.code">
          <li
            :id="optionId(c)"
            class="phone__option"
            :class="{ 'is-active': i === active, 'is-current': c.code === code }"
            role="option"
            :aria-selected="i === active"
            @click="choose(c)"
            @mousemove="active = i"
          >
            <span :class="`fi fi-${c.code.toLowerCase()} phone__flag`" aria-hidden="true"></span>
            <span class="phone__name">{{ c.name }}</span>
            <span class="phone__code">{{ c.dialCode }}</span>
            <Icon v-if="c.code === code" name="check" :size="16" :stroke="2.5" class="phone__tick" />
          </li>
          <li v-if="i === dividerAfter" class="phone__divider" role="presentation"></li>
        </template>
        <li v-if="!options.length" class="phone__empty" role="presentation">No country matches “{{ query }}”</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.phone { position: relative; display: flex; align-items: stretch; height: 50px; border: 1px solid var(--border-strong); border-radius: var(--radius); background: #FFFFFF; transition: border-color .15s ease, box-shadow .15s ease; }
.phone:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent); }
.phone.is-invalid { border-color: var(--error); border-width: 2px; }
.phone__country { display: inline-flex; align-items: center; gap: 8px; flex: none; padding: 0 10px 0 14px; border: 0; border-right: 1px solid var(--border); border-radius: var(--radius) 0 0 var(--radius); background: var(--soft); color: var(--ink); font-size: 15px; font-weight: 600; cursor: pointer; }
.phone__country:hover { background: color-mix(in srgb, var(--accent) 8%, var(--soft)); }
.phone__country:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--accent); }
.phone__flag { width: 22px; height: 16px; flex: none; border-radius: 2px; background-size: cover; box-shadow: 0 0 0 1px rgba(0, 0, 0, .1); }
.phone__chevron { color: var(--muted); transition: transform .2s ease; }
.phone.is-open .phone__chevron { transform: rotate(180deg); }
.phone__number { flex: 1; min-width: 0; height: 100%; padding: 0 14px; border: 0; border-radius: 0 var(--radius) var(--radius) 0; background: transparent; font-size: 16px; color: var(--ink); }
.phone__number:focus-visible { outline: none; }
.phone__number::placeholder { color: var(--faint); }

.phone__menu { position: absolute; top: calc(100% + 6px); left: -1px; right: -1px; z-index: 30; overflow: hidden; border: 1px solid var(--border); border-radius: var(--radius); background: #FFFFFF; box-shadow: 0 12px 32px rgba(0, 0, 0, .16); }
.phone__search { display: flex; align-items: center; gap: 8px; padding: 0 12px; border-bottom: 1px solid var(--border); color: var(--muted); }
.phone__search input { flex: 1; min-width: 0; height: 46px; border: 0; background: transparent; font-size: 15px; color: var(--ink); }
.phone__search input:focus-visible { outline: none; }
.phone__list { max-height: 264px; overflow-y: auto; margin: 0; padding: 4px; list-style: none; overscroll-behavior: contain; }
.phone__option { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 10px; border-radius: calc(var(--radius) - 2px); font-size: 15px; color: var(--text); cursor: pointer; }
.phone__option.is-active { background: color-mix(in srgb, var(--accent) 10%, #FFFFFF); }
.phone__option.is-current { font-weight: 600; color: var(--ink); }
.phone__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.phone__code { color: var(--muted); font-variant-numeric: tabular-nums; }
.phone__tick { color: var(--accent-text); }
.phone__divider { height: 1px; margin: 4px 6px; background: var(--border); }
.phone__empty { padding: 14px 10px; color: var(--muted); font-size: 14px; }

@media (prefers-reduced-motion: reduce) { .phone__chevron { transition: none; } }
</style>
