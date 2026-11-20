import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import ValuationPage from './views/ValuationPage.vue'
import NotAvailable from './views/NotAvailable.vue'
import HomePage from './views/HomePage.vue'
import { companyUrl, isSiteHost, slugFromHost } from './lib/site'
import './styles/base.css'

// <slug>.property-ai.co.uk is that company's page; property-ai.co.uk is the home page.
// A result has its own shareable URL: <slug>.property-ai.co.uk/<valuation id>.
const hostSlug = slugFromHost(location.hostname)
const VALUATION_ID = '[a-f0-9]{24}'

const routes = hostSlug
  ? [
      { path: '/', component: ValuationPage, props: { slug: hostSlug } },
      { path: `/:valuationId(${VALUATION_ID})`, component: ValuationPage, props: (r) => ({ slug: hostSlug, valuationId: r.params.valuationId }) },
      { path: '/:pathMatch(.*)*', component: NotAvailable },
    ]
  : [
      { path: '/', component: HomePage },
      {
        path: `/:slug([a-z0-9-]+)/:valuationId(${VALUATION_ID})?`,
        component: ValuationPage,
        props: true,
        // On the real site a company page always lives on its subdomain
        beforeEnter: (to) => {
          if (!isSiteHost(location.hostname)) return true
          location.replace(companyUrl(to.params.slug).replace(/\/$/, '') + (to.params.valuationId ? `/${to.params.valuationId}` : '/') + location.search)
          return false
        },
      },
      { path: '/:pathMatch(.*)*', component: NotAvailable },
    ]

const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes })

createApp(App).use(router).mount('#app')
