<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'
import { money, distance, comparableDate, COMP_STATUS } from '../lib/format'

const props = defineProps({ comparable: { type: Object, required: true } })
const c = computed(() => props.comparable)
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1)
const labels = computed(() => [c.value.propertyType, c.value.tenure].filter(Boolean).map(cap))
</script>

<template>
  <article class="cc" :class="{ 'is-used': c.usedInEstimate }">
    <div class="cc__top">
      <span class="status-pill" :class="`is-${c.status}`">{{ COMP_STATUS[c.status] || 'Listed' }}</span>
      <span v-if="c.distanceMeters != null" class="cc__distance"><Icon name="pin" :size="13" />{{ distance(c.distanceMeters) }}</span>
    </div>
    <div class="cc__price">{{ money(c.price) }}</div>
    <div v-if="c.date" class="cc__date">{{ comparableDate(c.status, c.date) }}</div>
    <h3 class="cc__address">{{ c.address }}<span v-if="c.postcode">{{ c.postcode }}</span></h3>
    <div v-if="c.bedrooms != null || c.bathrooms != null || c.floorArea" class="cc__specs">
      <span v-if="c.bedrooms != null"><Icon name="bedroom" :size="16" /> {{ c.bedrooms }} <span class="sr-only">bedrooms</span></span>
      <span v-if="c.bathrooms != null"><Icon name="bathroom" :size="16" /> {{ c.bathrooms }} <span class="sr-only">bathrooms</span></span>
      <span v-if="c.floorArea"><Icon name="area" :size="16" /> {{ Math.round(c.floorArea).toLocaleString('en-GB') }} m²</span>
    </div>
    <ul v-if="labels.length" class="cc__labels">
      <li v-for="l in labels" :key="l">{{ l }}</li>
    </ul>
    <div v-if="c.usedInEstimate" class="cc__used"><Icon name="check" :size="14" :stroke="3" /> Used in your estimate</div>
  </article>
</template>
