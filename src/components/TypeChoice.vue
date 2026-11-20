<script setup>
import Icon from './Icon.vue'

const emit = defineEmits(['select'])
const options = [
  { value: 'selling', icon: 'house', title: 'Selling', text: 'Find out what your home could sell for' },
  { value: 'lettings', icon: 'key', title: 'Lettings', text: 'Find out what your home could rent for' },
]
</script>

<template>
  <div class="type-choice">
    <button v-for="o in options" :key="o.value" type="button" class="type-card" @click="emit('select', o.value)">
      <span class="type-card__icon"><Icon :name="o.icon" :size="28" /></span>
      <span class="type-card__title">{{ o.title }}</span>
      <span class="type-card__text">{{ o.text }}</span>
    </button>
  </div>
</template>
