<script setup>
// "What happens next", at the foot of the expert form: what a request leads to, so sending it isn't a
// leap in the dark. Beside the report it only shows when there is room for it under the form (base.css).
// No promises on timings: every agency works differently.
import { computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  companyName: String,
  sent: Boolean, // the expert form has been sent: the first step is done
})

const steps = computed(() => [
  props.sent ? `Request sent to ${props.companyName || 'the agency'}` : `${props.companyName || 'The agency'} gets your request`,
  'They call or email to agree a time',
  'A local expert visits your home',
  'You get your formal valuation',
])
</script>

<template>
  <div class="next">
    <div class="next__inner" role="group" aria-labelledby="next-title">
      <h3 id="next-title" class="next__title">What happens next</h3>
      <ol class="next__steps">
        <li v-for="(s, i) in steps" :key="i" class="next__step" :class="{ 'is-done': sent && i === 0 }">
          <span class="next__num" aria-hidden="true">
            <Icon v-if="sent && i === 0" name="check" :size="13" :stroke="3.5" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span>{{ s }}<span v-if="sent && i === 0" class="sr-only"> (done)</span></span>
        </li>
      </ol>
    </div>
  </div>
</template>
