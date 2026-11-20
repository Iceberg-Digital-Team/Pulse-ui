<script setup>
// Matching buyers: the agency's Lifesycle applicants that fit this home (bedrooms, price, location).
// The total and the best five, names masked by the API ("Jo** Sm***"). Hidden when the agency is not
// on Lifesycle, nothing matches, or the search fails.
import { computed, onMounted, ref } from 'vue'
import Icon from './Icon.vue'
import { api } from '../lib/api'
import { money } from '../lib/format'

const props = defineProps({
  company: String,
  valuationId: String,
})

const match = ref(null)
onMounted(async () => {
  if (props.valuationId) match.value = await api.applicantMatches(props.company, props.valuationId)
})

const show = computed(() => match.value?.available && match.value.total > 0)
const lettings = computed(() => match.value?.searchType === 'lettings')
const rows = computed(() => match.value?.applicants || [])
const more = computed(() => Math.max(0, (match.value?.total || 0) - rows.value.length))
const word = (n) => (lettings.value ? (n === 1 ? 'tenant' : 'tenants') : (n === 1 ? 'buyer' : 'buyers'))

// One number, not the applicant's range: this home's bedrooms when the range takes them (it usually
// does, the search matched on them), else the nearest end of the range.
// { count, word }: the word is hidden on narrow screens, where the bed icon carries it.
const bedrooms = ({ min, max } = {}) => {
  let n = Number(match.value?.bedroom) || null
  if (n == null) n = min || max || null
  else if (min && n < min) n = min
  else if (max && n > max) n = max
  if (!n) return { count: 'Any', word: '' }
  return { count: `${n}`, word: n === 1 ? 'bedroom' : 'bedrooms' }
}
const budget = ({ min, max } = {}) => {
  const pcm = lettings.value ? ' pcm' : ''
  if (max) return `${money(max)}${pcm}`
  if (min) return `From ${money(min)}${pcm}`
  return 'Not given'
}
</script>

<template>
  <Transition name="demand">
    <section v-if="show" class="tile demand" aria-labelledby="demand-title">
      <div class="demand__summary">
        <p class="demand__count" aria-hidden="true">{{ match.total }}</p>
        <div>
          <h2 id="demand-title" class="demand__title"><span class="sr-only">{{ match.total }} </span>Matching {{ word(2) }}</h2>
          <p class="demand__text">Looking for homes like yours.</p>
        </div>
      </div>

      <div class="demand__list">
        <table class="demand__table" :aria-label="`Matching ${word(2)}' requirements`">
          <colgroup><col class="demand__col-name"><col class="demand__col-match"><col class="demand__col-beds"><col class="demand__col-budget"></colgroup>
          <thead>
            <tr>
              <th scope="col">{{ lettings ? 'Tenant' : 'Buyer' }}</th>
              <th scope="col">Match</th>
              <th scope="col">Bedrooms</th>
              <th scope="col" class="num">Budget</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(a, i) in rows" :key="i">
              <th scope="row" class="demand__name">{{ a.name || 'Applicant' }}</th>
              <td class="demand__match">{{ a.match != null ? `${a.match}%` : '—' }}</td>
              <td>
                <span class="demand__beds">
                  <Icon name="bedroom" :size="15" />
                  <span>{{ bedrooms(a.bedrooms).count }}<span v-if="bedrooms(a.bedrooms).word" class="demand__beds-word"> {{ bedrooms(a.bedrooms).word }}</span></span>
                </span>
              </td>
              <td class="num demand__budget">{{ budget(a.budget) }}</td>
            </tr>
          </tbody>
          <tfoot v-if="more">
            <tr>
              <td colspan="4"><span class="demand__more"><Icon name="plus" :size="12" :stroke="3" /><span>and <strong>{{ more }}</strong> {{ word(more) }}</span></span></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  </Transition>
</template>
