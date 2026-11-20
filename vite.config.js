import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Served at <company-slug>.property-ai.co.uk (and the home page at property-ai.co.uk).
// Locally: http://<company-slug>.localhost:5174
export default defineConfig({
  base: '/',
  plugins: [vue()],
  server: { port: 5174 },
})
