<script setup>
// Where the home is: a Google map with one pin. Renders nothing without a maps key or coordinates,
// and removes itself if Google Maps can't load, so the page never shows an empty box.
//   variant 'card'  framed, with the place written under the map (property report)
//   variant 'fill'  fills its container, with the place on a chip over the map (personalised valuation)
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from './Icon.vue'
import { mapsEnabled, mapsRejected, loadGoogleMaps, googleMapsLink } from '../lib/googleMaps'

const props = defineProps({
  coordinates: Object, // { lat, lng }
  place: String, // e.g. the postcode
  address: String, // for the map's accessible name
  variant: { type: String, default: 'card' },
  logo: String, // company image for the pin (favicon or logo); without it the pin has a plain dot
})

const point = computed(() => {
  const lat = Number(props.coordinates?.lat)
  const lng = Number(props.coordinates?.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng) ? { lat, lng } : null
})
const failed = ref(false)
const show = computed(() => mapsEnabled && point.value && !failed.value && !mapsRejected.value)
const canvas = ref(null)
let map = null

// The pin takes the company's accent colour.
const accentColour = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1E3A8A'
function pinIcon(maps) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52"><path d="M20 1C9.5 1 1 9.4 1 19.8 1 33.7 20 51 20 51s19-17.3 19-31.2C39 9.4 30.5 1 20 1z" fill="${accentColour()}" stroke="#fff" stroke-width="2"/><circle cx="20" cy="19.5" r="7" fill="#fff"/></svg>`
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new maps.Size(40, 52), anchor: new maps.Point(20, 51) }
}

// With a company image the pin is drawn in HTML (an SVG icon can't load an outside image): the same
// pin, larger, with the image in a white circle. If the image fails, the plain dot shows instead.
function logoPin(maps, position, logo, title) {
  class LogoPin extends maps.OverlayView {
    onAdd() {
      const el = document.createElement('div')
      el.className = 'pmap-pin'
      el.title = title
      el.innerHTML = `<svg width="52" height="66" viewBox="0 0 52 66" aria-hidden="true"><path d="M26 1.5C12.5 1.5 1.5 12.3 1.5 25.7 1.5 43.4 26 64.5 26 64.5s24.5-21.1 24.5-38.8C50.5 12.3 39.5 1.5 26 1.5z" fill="${accentColour()}" stroke="#fff" stroke-width="2.5"/></svg><span class="pmap-pin__badge"></span>`
      const img = new Image()
      img.alt = ''
      img.referrerPolicy = 'no-referrer'
      img.onerror = () => el.classList.add('pmap-pin--plain')
      img.src = logo
      el.lastChild.appendChild(img)
      this.el = el
      this.getPanes().overlayMouseTarget.appendChild(el)
    }
    draw() {
      const p = this.getProjection()?.fromLatLngToDivPixel(new maps.LatLng(position))
      if (p && this.el) Object.assign(this.el.style, { left: `${p.x}px`, top: `${p.y}px` })
    }
    onRemove() {
      this.el?.remove()
      this.el = null
    }
  }
  return new LogoPin()
}

onMounted(async () => {
  if (!show.value) return
  try {
    const maps = await loadGoogleMaps()
    if (!canvas.value) return
    map = new maps.Map(canvas.value, {
      center: point.value,
      zoom: 16,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: 'cooperative',
      keyboardShortcuts: false,
    })
    if (props.logo) logoPin(maps, point.value, props.logo, props.address || '').setMap(map)
    else new maps.Marker({ map, position: point.value, icon: pinIcon(maps), title: props.address || '' })
  } catch (e) {
    console.warn(e.message)
    failed.value = true
  }
})
onBeforeUnmount(() => { map = null })
</script>

<template>
  <figure v-if="show" class="pmap" :class="`pmap--${variant}`">
    <div class="pmap__frame">
      <div ref="canvas" class="pmap__canvas" role="region" :aria-label="`Map showing ${address || 'the property'}`"></div>
      <a class="pmap__open" :href="googleMapsLink(point)" target="_blank" rel="noopener noreferrer" aria-label="Open the location in Google Maps (opens in a new tab)">
        <Icon name="external" :size="16" :stroke="2.25" />
      </a>
      <figcaption v-if="variant === 'fill'" class="pmap__chip"><Icon name="pin" :size="15" /><span>{{ place }} · Approximate location</span></figcaption>
    </div>
    <figcaption v-if="variant === 'card'" class="pmap__caption">
      <Icon name="pin" :size="18" />
      <span><strong>{{ place }}</strong>Approximate location</span>
    </figcaption>
  </figure>
</template>
