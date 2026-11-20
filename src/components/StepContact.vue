<script setup>
import { nextTick, reactive, ref } from 'vue'
import { api } from '../lib/api'
import Icon from './Icon.vue'
import PhoneInput from './PhoneInput.vue'
import { isValidPhone } from '../lib/phone'
import { loadContact, saveContact } from '../lib/contactCache'

const props = defineProps({
  company: String,
  companyName: String,
  address: Object,
  valuationType: String,
  privacyPolicyUrl: String,
})
const emit = defineEmits(['created', 'back'])

const form = reactive({ firstName: '', lastName: '', email: '', phone: '', ...loadContact(props.company) })
const errors = reactive({})
const touched = reactive({})
const error = ref('')
const busy = ref(false)
const formEl = ref(null)

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELDS = ['firstName', 'lastName', 'email', 'phone']

const rules = {
  firstName: (v) => (v.trim() ? '' : 'Enter your first name.'),
  lastName: (v) => (v.trim() ? '' : 'Enter your last name.'),
  email: (v) => (EMAIL.test(v.trim()) ? '' : 'Enter an email address like name@example.com.'),
  // v is E.164 from PhoneInput, checked against the chosen country's numbering plan (as Neuron does)
  phone: (v) => (!v ? 'Enter your phone number.' : isValidPhone(v) ? '' : 'Enter a valid phone number for the country you chose.'),
}

function check(key) {
  const message = rules[key](form[key])
  if (message) errors[key] = message
  else delete errors[key]
}

// Validate a field once the user leaves it, then keep it live so the error clears as they fix it.
function onBlur(key) {
  if (!form[key] && !touched[key]) return
  touched[key] = true
  check(key)
}
function onInput(key) {
  if (touched[key]) check(key)
}

async function submit() {
  error.value = ''
  FIELDS.forEach((k) => { touched[k] = true; check(k) })
  const firstInvalid = FIELDS.find((k) => errors[k])
  if (firstInvalid) {
    await nextTick()
    formEl.value?.querySelector(`#${firstInvalid}`)?.focus()
    return
  }
  busy.value = true
  try {
    const lead = await api.createLead(props.company, {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      selectedPropertyUPRN: props.address.uprn,
      valuationType: props.valuationType,
    })
    saveContact(props.company, form)
    // The result page prefills the expert valuation form with these, as Neuron does.
    emit('created', {
      ...lead,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    })
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

const describedBy = (key) => (errors[key] ? `${key}-error` : undefined)
</script>

<template>
  <form ref="formEl" novalidate style="display: flex; flex-direction: column; gap: 16px" @submit.prevent="submit">
    <div class="selected-value">
      <Icon name="pin" :size="18" />
      <span class="selected-value__text" :title="address.full"><span class="sr-only">Valuing: </span>{{ address.full }}</span>
      <button type="button" class="link-btn" :disabled="busy" @click="emit('back')">Change<span class="sr-only"> address</span></button>
    </div>

    <div class="actions">
      <div class="field">
        <label class="label" for="firstName">First name<span class="req" aria-hidden="true">*</span></label>
        <input id="firstName" v-model="form.firstName" class="input" autocomplete="given-name" aria-required="true" :aria-invalid="!!errors.firstName" :aria-describedby="describedBy('firstName')" @blur="onBlur('firstName')" @input="onInput('firstName')" />
        <span v-if="errors.firstName" id="firstName-error" class="field-error"><Icon name="alert" :size="16" />{{ errors.firstName }}</span>
      </div>
      <div class="field">
        <label class="label" for="lastName">Last name<span class="req" aria-hidden="true">*</span></label>
        <input id="lastName" v-model="form.lastName" class="input" autocomplete="family-name" aria-required="true" :aria-invalid="!!errors.lastName" :aria-describedby="describedBy('lastName')" @blur="onBlur('lastName')" @input="onInput('lastName')" />
        <span v-if="errors.lastName" id="lastName-error" class="field-error"><Icon name="alert" :size="16" />{{ errors.lastName }}</span>
      </div>
    </div>

    <div class="field">
      <label class="label" for="email">Email address<span class="req" aria-hidden="true">*</span></label>
      <input id="email" v-model="form.email" class="input" type="email" inputmode="email" spellcheck="false" placeholder="name@example.com" autocomplete="email" aria-required="true" :aria-invalid="!!errors.email" :aria-describedby="describedBy('email')" @blur="onBlur('email')" @input="onInput('email')" />
      <span v-if="errors.email" id="email-error" class="field-error"><Icon name="alert" :size="16" />{{ errors.email }}</span>
    </div>

    <div class="field">
      <label class="label" for="phone">Phone number<span class="req" aria-hidden="true">*</span></label>
      <PhoneInput id="phone" :model-value="form.phone" :invalid="!!errors.phone" :describedby="describedBy('phone')" @blur="onBlur('phone')" @update:model-value="(v) => { form.phone = v; onInput('phone') }" />
      <span v-if="errors.phone" id="phone-error" class="field-error"><Icon name="alert" :size="16" />{{ errors.phone }}</span>
    </div>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>

    <button type="submit" class="btn btn--primary btn--block btn--tall" :disabled="busy">
      <span v-if="busy" class="spinner" aria-hidden="true"></span>
      <span :class="{ 'sr-only': busy }">{{ busy ? 'Working out your valuation' : 'Show my valuation' }}</span>
      <Icon v-if="!busy" name="arrow-right" class="arrow" :size="18" :stroke="2.5" />
    </button>
    <p v-if="busy" class="sr-only" role="status">Working out your valuation</p>

    <p class="consent">
      By clicking 'Show my valuation' you agree to be contacted by {{ companyName }} about your property valuation.
      Your details will be kept confidential and will not be shared with third parties.
      <template v-if="privacyPolicyUrl"> <a :href="privacyPolicyUrl" target="_blank" rel="noopener">Privacy policy<span class="sr-only"> (opens in a new tab)</span></a>.</template>
    </p>
  </form>
</template>
