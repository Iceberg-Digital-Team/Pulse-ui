<script setup>
// Preferred day & time picker, adapted from Neuron's PreferredDayTimePicker: a summary button opens
// a dialog with the office's open days; each day expands to its hourly slots.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { availableDays, dayHours, slotsForDay, toggleSlot, orderedSelection, hasSelection } from '../lib/schedule'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) }, // { Monday: ['09:00 - 10:00', …] }
  openingHours: { type: Object, default: null },
  required: Boolean,
  invalid: Boolean,
  describedBy: String,
})
const emit = defineEmits(['update:modelValue'])

const uid = `dtp-${Math.random().toString(36).slice(2, 8)}`
const open = ref(false)
const expanded = ref(null)
const trigger = ref(null)
const panel = ref(null)

const days = computed(() => availableDays(props.openingHours))
const selection = computed(() => orderedSelection(props.modelValue))
const selected = computed(() => hasSelection(props.modelValue))
const slotCount = computed(() => selection.value.reduce((n, d) => n + d.slots.length, 0))

const chosen = (day) => props.modelValue[day] || []
const toggle = (day, slot) => emit('update:modelValue', toggleSlot(props.modelValue, day, slot))
function clearDay(day) {
  const next = { ...props.modelValue }
  delete next[day]
  emit('update:modelValue', next)
}

// As in Neuron, the dialog opens with every day collapsed.
function show() {
  expanded.value = null
  open.value = true
}
function close() {
  open.value = false
  nextTick(() => trigger.value?.focus())
}
const onKey = (e) => {
  if (e.key === 'Escape') { e.stopPropagation(); close() }
}

const setPageInert = (on) => {
  const app = document.getElementById('app')
  if (app) app.inert = on
}
watch(open, async (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
  setPageInert(isOpen)
  if (isOpen) {
    await nextTick()
    panel.value?.querySelector('[data-autofocus]')?.focus()
  }
})
onBeforeUnmount(() => {
  if (open.value) { document.body.style.overflow = ''; setPageInert(false) }
})
</script>


<template>
  <div class="dtp">
    <button
      :id="`${uid}-trigger`"
      ref="trigger"
      type="button"
      class="dtp-trigger"
      :class="{ 'is-invalid': invalid }"
      aria-haspopup="dialog"
      :aria-labelledby="`${uid}-label ${uid}-trigger`"
      :aria-describedby="describedBy"
      @click="show"
    >
      <span v-if="selected" class="dtp-trigger__summary">
        <span v-for="s in selection" :key="s.day" class="dtp-trigger__row"><span class="dtp-trigger__day">{{ s.day }}:</span> {{ s.slots.join(', ') }}</span>
      </span>
      <span v-else class="dtp-trigger__placeholder">Click to select preferred days &amp; times</span>
      <Icon name="edit" :size="18" class="dtp-trigger__icon" />
    </button>
    <span :id="`${uid}-label`" class="sr-only">Preferred day and time{{ required ? ', required' : '' }}</span>

    <Teleport to="body">
      <div v-if="open" class="dtp-overlay" @click.self="close" @keydown="onKey">
        <div ref="panel" class="dtp-modal" role="dialog" aria-modal="true" :aria-labelledby="`${uid}-title`">
          <div class="dtp-modal__head">
            <h2 :id="`${uid}-title`" class="dtp-modal__title" tabindex="-1" data-autofocus>Preferred day &amp; time</h2>
            <button type="button" class="dtp-modal__close" aria-label="Close" @click="close"><Icon name="close" :size="20" /></button>
          </div>

          <div class="dtp-modal__body">
            <p class="dtp-modal__sub">Click a day to choose your preferred time slots.</p>

            <ul class="dtp-days">
              <li v-for="day in days" :key="day" class="dtp-day">
                <button
                  type="button"
                  class="dtp-day__btn"
                  :class="{ 'is-active': chosen(day).length, 'is-open': expanded === day }"
                  :aria-expanded="expanded === day"
                  :aria-controls="`${uid}-${day}`"
                  @click="expanded = expanded === day ? null : day"
                >
                  <span class="dtp-day__left">
                    <span class="dtp-day__name">{{ day }}</span>
                    <span v-if="dayHours(openingHours, day)" class="dtp-day__hours">{{ dayHours(openingHours, day) }}</span>
                  </span>
                  <span class="dtp-day__right">
                    <span v-if="chosen(day).length" class="dtp-day__count">{{ chosen(day).length }} selected</span>
                    <Icon name="chevron-down" :size="18" class="dtp-day__chevron" />
                  </span>
                </button>

                <div v-if="expanded === day" :id="`${uid}-${day}`" class="dtp-slots" role="group" :aria-label="`${day} times`">
                  <button
                    v-for="slot in slotsForDay(openingHours, day)"
                    :key="slot"
                    type="button"
                    class="dtp-pill"
                    :aria-pressed="chosen(day).includes(slot)"
                    @click="toggle(day, slot)"
                  >{{ slot }}</button>
                </div>
              </li>
            </ul>

            <div v-if="selected" class="dtp-summary">
              <h3 class="dtp-summary__label">Selected Date</h3>
              <ul class="dtp-summary__list">
                <li v-for="s in selection" :key="s.day" class="dtp-chip">
                  <span><strong>{{ s.day }}:</strong> {{ s.slots.join(', ') }}</span>
                  <button type="button" class="dtp-chip__remove" :aria-label="`Remove ${s.day}`" @click="clearDay(s.day)"><Icon name="close" :size="14" /></button>
                </li>
              </ul>
            </div>
          </div>

          <div class="dtp-modal__foot">
            <p class="sr-only" role="status">{{ slotCount ? `${slotCount} ${slotCount === 1 ? 'time' : 'times'} selected` : '' }}</p>
            <button type="button" class="dtp-done" @click="close">Done</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
/* Mirrors Neuron's PreferredDayTimePicker. Not scoped: the dialog is teleported to <body>. */
.dtp-trigger {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 50px; padding: 12px 16px;
  border: 1px solid var(--border-strong); border-radius: var(--radius); background: #FFFFFF; color: var(--ink);
  text-align: left; cursor: pointer; transition: border-color .15s ease;
}
.dtp-trigger:hover { border-color: var(--brand); }
.dtp-trigger.is-invalid { border: 2px solid var(--error); padding: 11px 15px; }
.dtp-trigger__summary { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 13px; line-height: 1.4; }
.dtp-trigger__day { font-weight: 600; margin-right: 4px; }
.dtp-trigger__placeholder { flex: 1; font-size: 14px; color: var(--muted); }
.dtp-trigger__icon { flex: none; color: var(--muted); }

.dtp-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0, 0, 0, .5); }
.dtp-modal {
  width: 100%; max-width: 480px; max-height: 90vh; max-height: 90svh; display: flex; flex-direction: column;
  background: #F9FAFB; border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, .2); overflow: hidden;
}
.dtp-modal__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 12px 12px 24px; border-bottom: 1px solid var(--border); flex: none; }
.dtp-modal__title { font-size: 16px; font-weight: 600; color: var(--ink); font-family: var(--font); }
.dtp-modal__close { flex: none; width: 44px; height: 44px; display: grid; place-items: center; border: 0; border-radius: 50%; background: none; color: var(--muted); cursor: pointer; transition: color .15s ease; }
.dtp-modal__close:hover { color: var(--ink); }
.dtp-modal__body { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
.dtp-modal__sub { margin: 0; font-size: 13px; color: var(--muted); }
.dtp-modal__foot { padding: 16px 24px; border-top: 1px solid var(--border); flex: none; }
.dtp-done {
  width: 100%; min-height: 48px; padding: 12px; border: 0; border-radius: var(--radius);
  background: var(--brand); color: var(--brand-ink); font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity .15s ease;
}
.dtp-done:hover { opacity: .85; }

.dtp-days { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.dtp-day { display: flex; flex-direction: column; gap: 8px; }
.dtp-day__btn {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 48px; padding: 12px 16px;
  border: 1.5px solid var(--border-strong); border-radius: 10px; background: #FFFFFF; color: var(--ink); text-align: left; cursor: pointer;
  transition: background-color .15s ease, border-color .15s ease, color .15s ease;
}
.dtp-day__btn:hover, .dtp-day__btn.is-open { border-color: var(--brand); }
.dtp-day__btn.is-active { background: var(--brand); border-color: var(--brand); color: var(--brand-ink); }
.dtp-day__left { display: flex; flex-direction: column; gap: 2px; }
.dtp-day__name { font-size: 14px; font-weight: 600; }
.dtp-day__hours { font-size: 12px; opacity: .75; }
.dtp-day__right { display: flex; align-items: center; gap: 10px; font-size: 12px; }
.dtp-day__count { opacity: .9; }
.dtp-day__chevron { transition: transform .2s ease; }
.dtp-day__btn.is-open .dtp-day__chevron { transform: rotate(180deg); }

.dtp-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; padding: 0 4px 4px; }
.dtp-pill {
  display: flex; align-items: center; justify-content: center; width: 100%; min-height: 44px; padding: 10px 12px;
  border: 1.5px solid var(--border-strong); border-radius: 999px; background: #FFFFFF; color: var(--ink);
  font-size: 13px; font-variant-numeric: tabular-nums; white-space: nowrap; cursor: pointer;
  transition: background-color .15s ease, border-color .15s ease, color .15s ease;
}
/* Hover fill only where hover exists, so a tapped-off slot doesn't stay looking selected on touch. */
@media (hover: hover) { .dtp-pill:hover { background: var(--brand); border-color: var(--brand); color: var(--brand-ink); } }
.dtp-pill[aria-pressed='true'] { background: var(--brand); border-color: var(--brand); color: var(--brand-ink); }

.dtp-summary__label { margin: 0 0 6px; font-size: 12px; font-weight: 600; color: var(--brand-text); }
.dtp-summary__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.dtp-chip { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 4px 4px 14px; border: 2.5px solid var(--border); border-radius: var(--radius); background: #FFFFFF; font-size: 14px; color: var(--ink); }
.dtp-chip__remove { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 50%; background: none; color: var(--muted); cursor: pointer; transition: color .15s ease; }
.dtp-chip__remove:hover { color: var(--ink); }

@media (prefers-reduced-motion: reduce) { .dtp-day__chevron { transition: none; } }
</style>
