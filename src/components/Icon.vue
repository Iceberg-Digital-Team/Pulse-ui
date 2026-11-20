<script setup>
// Stroke icons used across the flow. Property DNA names match the API's dna[].icon values.
defineProps({ name: { type: String, required: true }, size: { type: [Number, String], default: 24 }, stroke: { type: [Number, String], default: 2 } })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <template v-if="name === 'house' || name === 'type'"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></template>
    <template v-else-if="name === 'key'"><circle cx="7.5" cy="15.5" r="5.5" /><path d="M11.5 11.5 21 2" /><path d="m16 7 3 3" /><path d="m19 4 2 2" /></template>
    <template v-else-if="name === 'bedroom'"><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8V4" /><path d="M18 8V4" /></template>
    <template v-else-if="name === 'bathroom'"><path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z" /><path d="M6 12V4a2 2 0 0 1 2-2h3v2.25" /><path d="M4 21v-1" /><path d="M20 21v-1" /></template>
    <template v-else-if="name === 'reception'"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" /><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0z" /><path d="M4 18v2" /><path d="M20 18v2" /></template>
    <template v-else-if="name === 'ensuite'"><path d="M4 4v16" /><path d="M4 4h4a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H4" /><path d="M16 4l-2 16" /><path d="M14 12h6" /></template>
    <template v-else-if="name === 'dining'"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></template>
    <template v-else-if="name === 'conservatory'"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></template>
    <template v-else-if="name === 'style'"><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" /></template>
    <template v-else-if="name === 'tenure'"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></template>
    <template v-else-if="name === 'fuel'"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></template>
    <template v-else-if="name === 'area'"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" /><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2" /></template>
    <template v-else-if="name === 'garden'"><path d="M17 22v-2M7 22v-2M12 22v-9" /><path d="M9 18a5 5 0 0 1 5-5c.82 0 1.59.19 2.28.53" /><path d="M12 13a8 8 0 0 0 8-5 8 8 0 0 0-16 0 8 8 0 0 0 8 5z" /></template>
    <template v-else-if="name === 'built' || name === 'calendar'"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" /></template>
    <template v-else-if="name === 'parking'"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></template>
    <template v-else-if="name === 'check'"><polyline points="20 6 9 17 4 12" /></template>
    <template v-else-if="name === 'tick'"><path d="M9.55 18 3.85 12.3l1.43-1.43 4.27 4.28 9.18-9.18 1.42 1.43L9.55 18Z" fill="currentColor" stroke="none" /></template>
    <template v-else-if="name === 'sparkle'"><path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></template>
    <template v-else-if="name === 'arrow-left'"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></template>
    <template v-else-if="name === 'arrow-right'"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></template>
    <template v-else-if="name === 'chevron-left'"><polyline points="15 18 9 12 15 6" /></template>
    <template v-else-if="name === 'chevron-down'"><polyline points="6 9 12 15 18 9" /></template>
    <template v-else-if="name === 'search'"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></template>
    <template v-else-if="name === 'close'"><path d="M18 6 6 18M6 6l12 12" /></template>
    <template v-else-if="name === 'pin'"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></template>
    <template v-else-if="name === 'edit'"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></template>
    <template v-else-if="name === 'shield'"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></template>
    <template v-else-if="name === 'chart'"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></template>
    <template v-else-if="name === 'arrow-up'"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></template>
    <template v-else-if="name === 'code'"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></template>
    <template v-else-if="name === 'inbox'"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></template>
    <template v-else-if="name === 'copy'"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></template>
    <template v-else-if="name === 'palette'"><circle cx="13.5" cy="6.5" r="1.5" /><circle cx="17.5" cy="10.5" r="1.5" /><circle cx="8.5" cy="7.5" r="1.5" /><circle cx="6.5" cy="12.5" r="1.5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C21.97 6.01 17.46 2 12 2z" /></template>
    <template v-else-if="name === 'users'"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></template>
    <template v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14" /></template>
    <template v-else-if="name === 'external'"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></template>
    <template v-else-if="name === 'clock'"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></template>
    <template v-else-if="name === 'alert'"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></template>
    <template v-else-if="name === 'info'"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></template>
    <template v-else-if="name === 'circle'"><circle cx="12" cy="12" r="9" /></template>
    <template v-else><circle cx="12" cy="12" r="9" /></template>
  </svg>
</template>
