// Google Maps JavaScript API, loaded once and only when a map is shown. The key is a browser key
// (it ships in the page); restrict it to the site's referrers in Google Cloud.
import { ref } from 'vue'

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''

export const mapsEnabled = !!KEY
// Set when Google rejects the key (wrong key, referrer not allowed, billing off); maps then hide
// themselves instead of showing Google's error box.
export const mapsRejected = ref(false)

let loading = null

export function loadGoogleMaps() {
  if (!KEY) return Promise.reject(new Error('VITE_GOOGLE_MAPS_KEY is not set'))
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps)
  if (!loading) {
    window.gm_authFailure = () => {
      mapsRejected.value = true
      console.warn('Google Maps rejected the key (check VITE_GOOGLE_MAPS_KEY and its allowed referrers)')
    }
    loading = new Promise((resolve, reject) => {
      const callback = '__propertyPulseMapsReady'
      window[callback] = () => {
        delete window[callback]
        resolve(window.google.maps)
      }
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&loading=async&callback=${callback}`
      script.async = true
      script.onerror = () => {
        loading = null
        script.remove()
        reject(new Error('Google Maps failed to load'))
      }
      document.head.appendChild(script)
    })
  }
  return loading
}

export const googleMapsLink = ({ lat, lng }) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
