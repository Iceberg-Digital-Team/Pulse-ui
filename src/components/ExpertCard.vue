<script setup>
// Confirm valuation, as on the Neuron result page: the contact details from the previous step come
// prefilled, the homeowner checks them, picks a preferred day and time and books the expert visit.
import { nextTick, reactive, ref, watch } from 'vue'
import { api } from '../lib/api'
import { hasSelection, toPreferredDate } from '../lib/schedule'
import { isValidPhone } from '../lib/phone'
import Icon from './Icon.vue'
import DayTimePicker from './DayTimePicker.vue'
import PhoneInput from './PhoneInput.vue'
import { saveContact } from '../lib/contactCache'

const props = defineProps({
  company: String,
  valuationId: String,
  companyName: String,
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  thankYouMessage: String,
  title: String,
  description: String,
  openingHours: Object,
  idPrefix: { type: String, default: 'expert' }, // unique ids when the form is on two views
  sent: Object, // { firstName } once a request was sent from any copy of the form
})
const emit = defineEmits(['sent'])

const form = reactive({ firstName: props.firstName || '', lastName: props.lastName || '', email: props.email || '', phone: props.phone || '' })
const dayTimeSlots = ref({})
const errors = reactive({})
const touched = reactive({})
const error = ref('')
const busy = ref(false)
const done = ref(!!props.sent)
watch(() => props.sent, (v) => { if (v) done.value = true })
const formEl = ref(null)
const successHeading = ref(null)

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELDS = ['firstName', 'lastName', 'email', 'phone', 'when']
const rules = {
  firstName: () => (form.firstName.trim() ? '' : 'Enter your first name.'),
  lastName: () => (form.lastName.trim() ? '' : 'Enter your last name.'),
  email: () => (EMAIL.test(form.email.trim()) ? '' : 'Enter an email address like name@example.com.'),
  phone: () => (!form.phone ? 'Enter your phone number.' : isValidPhone(form.phone) ? '' : 'Enter a valid phone number for the country you chose.'),
  when: () => (hasSelection(dayTimeSlots.value) ? '' : 'Choose at least one day and time that suits you.'),
}

function check(key) {
  const message = rules[key]()
  if (message) errors[key] = message
  else delete errors[key]
}
function onBlur(key) {
  if (!form[key] && !touched[key]) return
  touched[key] = true
  check(key)
}
const onInput = (key) => { if (touched[key]) check(key) }
const describedBy = (key) => (errors[key] ? `${props.idPrefix}-${key}-error` : undefined)

function onPick(value) {
  dayTimeSlots.value = value
  touched.when = true
  check('when')
}

async function submit() {
  error.value = ''
  FIELDS.forEach((k) => { touched[k] = true; check(k) })
  const firstInvalid = FIELDS.find((k) => errors[k])
  if (firstInvalid) {
    await nextTick()
    const target = firstInvalid === 'when' ? '.dtp-trigger' : `#${props.idPrefix}-${firstInvalid}`
    formEl.value?.querySelector(target)?.focus()
    return
  }
  busy.value = true
  try {
    await api.confirm(props.company, props.valuationId, toPreferredDate(dayTimeSlots.value), {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    })
    saveContact(props.company, form)
    done.value = true
    emit('sent', { firstName: form.firstName.trim() })
    await nextTick()
    successHeading.value?.focus()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="tile tile--compact expert-card" :aria-labelledby="`${idPrefix}-title`">
    <div v-if="done" class="success" role="status">
      <span class="success__icon"><Icon name="check" :size="28" :stroke="3" /></span>
      <h2 :id="`${idPrefix}-title`" ref="successHeading" class="expert__title" style="margin: 0" tabindex="-1">Thank you{{ (form.firstName || sent?.firstName) ? `, ${(form.firstName || sent.firstName).trim()}` : '' }}!</h2>
      <p class="success__text">
        {{ thankYouMessage || `We've received your request for a face-to-face valuation. ${companyName} is reviewing your preferred day and time and will be in touch shortly by phone or email to confirm everything.` }}
      </p>
    </div>

    <form v-else ref="formEl" class="expert" novalidate @submit.prevent="submit">
      <h2 :id="`${idPrefix}-title`" class="expert__title">{{ title || 'Every home is unique' }}</h2>
      <p class="expert__text">{{ description || 'For the most accurate assessment, we recommend a face-to-face valuation with one of our experts.' }}</p>

      <div class="actions">
        <div class="field">
          <label class="label" :for="`${idPrefix}-firstName`">First name<span class="req" aria-hidden="true">*</span></label>
          <input :id="`${idPrefix}-firstName`" v-model="form.firstName" class="input" autocomplete="given-name" aria-required="true" :aria-invalid="!!errors.firstName" :aria-describedby="describedBy('firstName')" @blur="onBlur('firstName')" @input="onInput('firstName')" />
          <span v-if="errors.firstName" :id="`${idPrefix}-firstName-error`" class="field-error"><Icon name="alert" :size="16" />{{ errors.firstName }}</span>
        </div>
        <div class="field">
          <label class="label" :for="`${idPrefix}-lastName`">Last name<span class="req" aria-hidden="true">*</span></label>
          <input :id="`${idPrefix}-lastName`" v-model="form.lastName" class="input" autocomplete="family-name" aria-required="true" :aria-invalid="!!errors.lastName" :aria-describedby="describedBy('lastName')" @blur="onBlur('lastName')" @input="onInput('lastName')" />
          <span v-if="errors.lastName" :id="`${idPrefix}-lastName-error`" class="field-error"><Icon name="alert" :size="16" />{{ errors.lastName }}</span>
        </div>
      </div>

      <div class="field">
        <label class="label" :for="`${idPrefix}-email`">Email address<span class="req" aria-hidden="true">*</span></label>
        <input :id="`${idPrefix}-email`" v-model="form.email" class="input" type="email" inputmode="email" spellcheck="false" placeholder="name@example.com" autocomplete="email" aria-required="true" :aria-invalid="!!errors.email" :aria-describedby="describedBy('email')" @blur="onBlur('email')" @input="onInput('email')" />
        <span v-if="errors.email" :id="`${idPrefix}-email-error`" class="field-error"><Icon name="alert" :size="16" />{{ errors.email }}</span>
      </div>

      <div class="field">
        <label class="label" :for="`${idPrefix}-phone`">Phone number<span class="req" aria-hidden="true">*</span></label>
        <PhoneInput :id="`${idPrefix}-phone`" :model-value="form.phone" :invalid="!!errors.phone" :describedby="describedBy('phone')" @blur="onBlur('phone')" @update:model-value="(v) => { form.phone = v; onInput('phone') }" />
        <span v-if="errors.phone" :id="`${idPrefix}-phone-error`" class="field-error"><Icon name="alert" :size="16" />{{ errors.phone }}</span>
      </div>

      <div class="field">
        <span class="label" aria-hidden="true">Preferred day &amp; time<span class="req">*</span></span>
        <DayTimePicker
          :model-value="dayTimeSlots"
          :opening-hours="openingHours"
          required
          :invalid="!!errors.when"
          :described-by="describedBy('when')"
          @update:model-value="onPick"
        />
        <span v-if="errors.when" :id="`${idPrefix}-when-error`" class="field-error"><Icon name="alert" :size="16" />{{ errors.when }}</span>
      </div>

      <p class="consent consent--left">
        By clicking 'Get free expert valuation' you agree to be contacted by {{ companyName }} about your property valuation.
        Your details will be kept confidential and will not be shared with third parties.
      </p>

      <p v-if="error" class="alert" role="alert">{{ error }}</p>

      <button class="btn btn--primary btn--block btn--tall" type="submit" :disabled="busy">
        <span v-if="busy" class="spinner" aria-hidden="true"></span>
        <span :class="{ 'sr-only': busy }">{{ busy ? 'Sending your request' : 'Get free expert valuation' }}</span>
      </button>
      <p v-if="busy" class="sr-only" role="status">Sending your request</p>
    </form>
    <!-- optional extra at the foot of the card (the report puts "What happens next" here) -->
    <slot name="foot" />
  </section>
</template>
