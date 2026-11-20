<script setup>
// property-ai.co.uk (no company subdomain): the page that sells Property Pulse to estate and letting agents.
// Layout follows the familiar SaaS landing pattern: centred hero with the product, a few short tiles,
// a dark closing panel. Deliberately brief: it should leave agents wanting a demo, not explain everything. Lifesycle colours (indigo, magenta) on white; Inter throughout.
// The screenshots in /public/home are the real product with an example agency and address.
import { computed, onMounted, ref } from 'vue'
import Icon from '../components/Icon.vue'
import { applyTheme } from '../lib/theme'
import { SITE_DOMAIN, companyUrl } from '../lib/site'

const demoSlug = import.meta.env.VITE_DEMO_SLUG || ''
const demoUrl = demoSlug ? companyUrl(demoSlug) : ''
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || `hello@${SITE_DOMAIN}`
const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent('Property Pulse demo')}`
const img = (name) => `${import.meta.env.BASE_URL}home/${name}.jpg`

// "Your page, your brand": the real landing page in three example agencies' branding.
const agencies = [
  { id: 'hartley', name: 'Hartley & Webb', slug: 'hartley-and-webb', colour: '#2A2974', note: 'Sales' },
  { id: 'fenwick', name: 'Fenwick & Rowe', slug: 'fenwick-and-rowe', colour: '#1F5C46', note: 'Sales' },
  { id: 'ashby', name: 'Ashby Lettings', slug: 'ashby-lettings', colour: '#8A1C3B', note: 'Lettings' },
]
const current = ref(agencies[0].id)
const shown = computed(() => agencies.find((a) => a.id === current.value))

const tiles = [
  { image: 'question', alt: 'A personalise question: what type of property is it', title: 'Personalised estimates', text: 'Homeowners refine the figure with their own details.' },
  { image: 'compare', alt: 'The instant and the personalised estimate side by side', title: 'Two estimates, side by side', text: 'A clear comparison, with every adjustment explained.' },
  { image: 'rent', alt: 'A monthly rent estimate of £875', title: 'Sales and lettings', text: 'Rent estimates for landlords on the same page.' },
]


onMounted(() =>
  applyTheme({
    name: 'Property Pulse',
    branding: { primaryColor: '#2A2974', accentColor: '#AC005F' },
    content: { pageTitle: 'Property Pulse · Valuation pages for estate and letting agents' },
  }),
)
</script>

<template>
  <div class="lp">
    <a class="lp-skip" href="#main">Skip to content</a>

    <header class="lp-nav">
      <div class="lp-wrap lp-nav__inner">
        <a class="lp-logo" href="/" aria-label="Property Pulse home">
          <span class="lp-logo__mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 28 28"><path d="M3 15h5l3-7 5 13 3-6h6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
          Property Pulse
        </a>
        <a class="lp-btn lp-btn--dark lp-btn--sm lp-nav__cta" :href="mailto">Request a demo</a>
      </div>
    </header>

    <main id="main">
      <!-- hero -->
      <section class="lp-hero" aria-labelledby="hero-title">
        <div class="lp-hero__glow" aria-hidden="true"></div>
        <div class="lp-wrap lp-hero__grid">
          <div class="lp-hero__copy">
            <h1 id="hero-title" class="lp-hero__title">Instant valuations under your agency’s name</h1>
            <p class="lp-hero__sub">
              Give homeowners a clear answer to “what’s my home worth?” in about a minute, on a page with your name,
              logo and colours.
            </p>
            <div class="lp-hero__actions">
              <a class="lp-btn lp-btn--primary" :href="mailto">Request a demo</a>
              <a v-if="demoSlug" class="lp-btn lp-btn--light" :href="demoUrl">Try a live page</a>
              <a v-else class="lp-btn lp-btn--light" href="#features">Take a closer look</a>
            </div>
          </div>

          <div class="lp-stage">
            <div class="lp-window">
              <div class="lp-window__bar" aria-hidden="true">
                <span class="lp-window__dots"><i></i><i></i><i></i></span>
                <span class="lp-window__url">hartley-and-webb.{{ SITE_DOMAIN }}</span>
              </div>
              <img :src="img('brand-hartley')" width="1920" height="1200" alt="Hartley & Webb’s valuation page: “What is your home worth?” with a postcode search over a photo of a house" />
            </div>
            <div class="lp-estimate" aria-hidden="true">
              <span class="lp-estimate__label">Estimated market value</span>
              <span class="lp-estimate__price">£425,000</span>
              <span class="lp-estimate__bar"><i></i><b></b></span>
              <span class="lp-estimate__ends"><span>£405,000</span><span>£450,000</span></span>
            </div>
          </div>
        </div>
      </section>

      <!-- a closer look -->
      <section id="features" class="lp-section" aria-labelledby="features-title">
        <div class="lp-wrap">
          <div class="lp-head">
            <h2 id="features-title" class="lp-h2">More than a number</h2>
          </div>
          <ul class="lp-tiles">
            <li v-for="t in tiles" :key="t.title" class="lp-tile">
              <div class="lp-tile__media"><img :src="img(t.image)" :alt="t.alt" loading="lazy" /></div>
              <h3 class="lp-h4">{{ t.title }}</h3>
              <p>{{ t.text }}</p>
            </li>
          </ul>
        </div>
      </section>

      <!-- your brand -->
      <section class="lp-section lp-section--tint" aria-labelledby="brand-title">
        <div class="lp-wrap lp-brand">
          <div class="lp-brand__copy">
            <h2 id="brand-title" class="lp-h2">Your page, your brand</h2>
            <p class="lp-lead">Every agency gets its own address, with your logo, colours, photo and wording. Link to it from your website, emails, social posts and ads.</p>
            <div class="lp-agencies" role="tablist" aria-label="Example agencies">
              <button
                v-for="a in agencies"
                :id="`tab-${a.id}`"
                :key="a.id"
                type="button"
                role="tab"
                class="lp-agency"
                :aria-selected="current === a.id"
                aria-controls="brand-panel"
                :style="{ '--sw': a.colour }"
                @click="current = a.id"
              >
                <span class="lp-agency__dot" aria-hidden="true"></span>
                <span class="lp-agency__name">{{ a.name }}</span>
                <span class="lp-agency__note">{{ a.note }}</span>
              </button>
            </div>
          </div>
          <div id="brand-panel" class="lp-window lp-window--brand" role="tabpanel" :aria-labelledby="`tab-${current}`">
            <div class="lp-window__bar" aria-hidden="true">
              <span class="lp-window__dots"><i></i><i></i><i></i></span>
              <span class="lp-window__url"><b>{{ shown.slug }}</b>.{{ SITE_DOMAIN }}</span>
            </div>
            <div class="lp-window__frames">
              <img
                v-for="a in agencies"
                :key="a.id"
                :src="img(`brand-${a.id}`)"
                width="1920"
                height="1200"
                :alt="current === a.id ? `${a.name}’s valuation page in its own colours and photo` : ''"
                :class="{ 'is-on': current === a.id }"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- closing -->
      <section class="lp-section lp-section--last" aria-labelledby="close-title">
        <div class="lp-wrap">
          <div class="lp-close">
            <h2 id="close-title" class="lp-close__title">See it with your own branding</h2>
            <p>Tell us about your agency and we’ll show you your page.</p>
            <div class="lp-hero__actions">
              <a class="lp-btn lp-btn--white" :href="mailto">Request a demo</a>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="lp-foot">
      <div class="lp-wrap lp-foot__inner">
        <span class="lp-logo lp-logo--sm"><span class="lp-logo__mark" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 28 28"><path d="M3 15h5l3-7 5 13 3-6h6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg></span>Property Pulse</span>
        <a :href="mailto">{{ contactEmail }}</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.lp {
  --indigo: #2A2974;
  --indigo-dark: #1C1B52;
  --magenta: #AC005F; /* Lifesycle magenta, deep enough for text on white */
  --ink: #0F172A;
  --text: #475569;
  --line: #E2E8F0;
  --tint: #F6F6FB;
  --max: 1140px;
  background: #FFFFFF;
  color: var(--text);
  font-family: var(--font);
  font-size: 17px;
  line-height: 1.6;
}
.lp-wrap { width: 100%; max-width: var(--max); margin: 0 auto; padding: 0 20px; }
@media (min-width: 720px) { .lp-wrap { padding: 0 32px; } }
.lp-skip { position: absolute; left: 16px; top: -48px; z-index: 20; padding: 10px 16px; border-radius: 8px; background: #FFFFFF; color: var(--ink); font-weight: 600; }
.lp-skip:focus { top: 12px; }
.lp a:focus-visible, .lp button:focus-visible, .lp input:focus-visible { outline: 3px solid color-mix(in srgb, var(--indigo) 45%, transparent); outline-offset: 3px; }

/* type */
.lp-h2 { font-size: clamp(30px, 4vw, 44px); font-weight: 800; line-height: 1.12; letter-spacing: -.03em; color: var(--ink); }
.lp-h3 { font-size: clamp(24px, 2.6vw, 30px); font-weight: 800; line-height: 1.2; letter-spacing: -.02em; color: var(--ink); }
.lp-h4 { font-size: 18px; font-weight: 700; color: var(--ink); }
.lp-lead { margin: 16px auto 0; max-width: 58ch; font-size: 19px; color: var(--text); }
.lp-head { text-align: center; max-width: 760px; margin: 0 auto; }

/* buttons */
.lp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 0 26px; border-radius: 10px; font-weight: 650; font-size: 16px; text-decoration: none; white-space: nowrap; transition: background-color .15s ease, box-shadow .15s ease; }
.lp-btn--sm { min-height: 42px; padding: 0 18px; font-size: 15px; }
.lp-btn--primary { background: var(--indigo); color: #FFFFFF; box-shadow: 0 8px 20px -8px rgba(42, 41, 116, .6); }
.lp-btn--primary:hover { background: var(--indigo-dark); }
.lp-btn--dark { background: var(--ink); color: #FFFFFF; }
.lp-btn--dark:hover { background: var(--indigo); }
.lp-btn--light { background: #FFFFFF; color: var(--ink); box-shadow: 0 0 0 1px var(--line), 0 1px 2px rgba(15, 23, 42, .06); }
.lp-btn--light:hover { box-shadow: 0 0 0 1px #CBD5E1, 0 4px 12px -4px rgba(15, 23, 42, .15); }
.lp-btn--white { background: #FFFFFF; color: var(--indigo); }
.lp-btn--white:hover { background: #EEEEF8; }

/* nav */
.lp-nav { position: sticky; top: 0; z-index: 10; background: rgba(255, 255, 255, .85); backdrop-filter: saturate(180%) blur(12px); border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent); }
.lp-nav__inner { display: flex; align-items: center; gap: 32px; min-height: 68px; }
.lp-logo { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; letter-spacing: -.02em; color: var(--ink); text-decoration: none; }
.lp-logo__mark { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; background: linear-gradient(135deg, var(--indigo), var(--magenta)); color: #FFFFFF; }
.lp-logo--sm { font-size: 15px; }
.lp-logo--sm .lp-logo__mark { width: 26px; height: 26px; border-radius: 7px; }
.lp-nav__cta { margin-left: auto; }
.lp-logo { white-space: nowrap; }
@media (max-width: 420px) { .lp-nav__inner { gap: 12px; } .lp-nav__cta { padding: 0 14px; font-size: 14px; } }

/* hero */
.lp-hero { position: relative; overflow: hidden; padding: clamp(56px, 9vw, 112px) 0 clamp(48px, 7vw, 88px); }
.lp-hero__glow { position: absolute; inset: -30% -10% auto; height: 640px; background: radial-gradient(closest-side at 50% 50%, rgba(42, 41, 116, .12), transparent), radial-gradient(closest-side at 70% 30%, rgba(231, 39, 135, .08), transparent); pointer-events: none; }
.lp-hero__grid { position: relative; display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: clamp(40px, 5vw, 72px); align-items: center; }
@media (max-width: 960px) { .lp-hero__grid { grid-template-columns: minmax(0, 1fr); } }
.lp-hero__title { max-width: 14ch; font-size: clamp(38px, 4.6vw, 58px); font-weight: 800; line-height: 1.05; letter-spacing: -.035em; color: var(--ink); }
.lp-hero__sub { max-width: 44ch; margin: 22px 0 0; font-size: clamp(18px, 1.8vw, 20px); color: var(--text); }
.lp-hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
.lp-close .lp-hero__actions { justify-content: center; }

.lp-stage { position: relative; padding: 0 0 40px 40px; }
@media (max-width: 960px) { .lp-stage { padding: 0 0 32px 16px; } }
.lp-window { border-radius: 14px; overflow: hidden; background: #FFFFFF; box-shadow: 0 0 0 1px rgba(15, 23, 42, .08), 0 40px 80px -28px rgba(42, 41, 116, .4); }
.lp-window__bar { display: flex; align-items: center; gap: 14px; padding: 10px 14px; border-bottom: 1px solid var(--line); background: #FFFFFF; }
.lp-window__dots { display: flex; gap: 6px; }
.lp-window__dots i { width: 10px; height: 10px; border-radius: 50%; background: #E2E8F0; }
.lp-window__url { flex: 1; max-width: 320px; margin: 0 auto; padding: 4px 12px; border-radius: 6px; background: #F1F5F9; font-size: 12px; color: var(--text); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lp-window__url b { color: var(--ink); font-weight: 650; }
.lp-window img { display: block; width: 100%; height: auto; }
.lp-estimate { position: absolute; left: 0; bottom: 0; width: min(260px, 62%); display: grid; gap: 2px; padding: 16px 18px; border-radius: 14px; background: #FFFFFF; box-shadow: 0 0 0 1px rgba(15, 23, 42, .06), 0 24px 48px -16px rgba(15, 23, 42, .35); }
.lp-estimate__label { font-size: 12px; font-weight: 600; color: var(--text); }
.lp-estimate__price { font-size: clamp(24px, 2.6vw, 30px); font-weight: 800; letter-spacing: -.02em; color: var(--magenta); }
.lp-estimate__bar { position: relative; height: 6px; margin: 8px 0 4px; border-radius: 3px; background: #E8EBF0; }
.lp-estimate__bar i { position: absolute; inset: 0 48% 0 0; border-radius: 3px; background: var(--magenta); }
.lp-estimate__bar b { position: absolute; left: 52%; top: 50%; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; background: #FFFFFF; border: 3px solid var(--magenta); }
.lp-estimate__ends { display: flex; justify-content: space-between; font-size: 12px; font-weight: 650; color: var(--ink); }

/* sections */
.lp-section { padding: clamp(64px, 9vw, 112px) 0; }
.lp-section--tint { background: var(--tint); }

.lp-tiles { list-style: none; margin: clamp(40px, 6vw, 64px) 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
@media (max-width: 900px) { .lp-tiles { grid-template-columns: minmax(0, 1fr); max-width: 520px; margin-left: auto; margin-right: auto; } }
.lp-tile p { margin: 6px 0 0; font-size: 16px; }
.lp-tile__media { aspect-ratio: 4 / 3; margin-bottom: 20px; padding: 20px; border-radius: 18px; background: linear-gradient(160deg, #EEEEF8, #F8F1F6); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.lp-tile__media img { display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; border-radius: 10px; box-shadow: 0 0 0 1px rgba(15, 23, 42, .06), 0 18px 36px -18px rgba(42, 41, 116, .35); }


/* your brand */
.lp-brand { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 7fr); gap: clamp(32px, 6vw, 80px); align-items: center; }
.lp-brand .lp-lead { margin-left: 0; }
@media (max-width: 860px) { .lp-brand { grid-template-columns: minmax(0, 1fr); } }
.lp-agencies { display: grid; gap: 10px; margin-top: 32px; max-width: 420px; }
.lp-agency { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 18px; border: 1px solid var(--line); border-radius: 12px; background: #FFFFFF; font: inherit; text-align: left; cursor: pointer; transition: border-color .15s ease, box-shadow .15s ease; }
.lp-agency:hover { border-color: #CBD5E1; }
.lp-agency[aria-selected='true'] { border-color: var(--sw); box-shadow: 0 0 0 1px var(--sw), 0 10px 24px -14px rgba(15, 23, 42, .35); }
.lp-agency__dot { flex: none; width: 14px; height: 14px; border-radius: 50%; background: var(--sw); }
.lp-agency__name { flex: 1; font-weight: 650; color: var(--ink); }
.lp-agency__note { font-size: 14px; color: var(--text); }
.lp-window--brand { position: relative; }
.lp-window__frames { display: grid; }
.lp-window__frames img { grid-area: 1 / 1; opacity: 0; transition: opacity .35s ease; }
.lp-window__frames img.is-on { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .lp * { transition: none !important; } }

/* closing */
.lp-close { position: relative; overflow: hidden; padding: clamp(48px, 7vw, 80px) clamp(24px, 5vw, 64px); border-radius: 24px; background: radial-gradient(circle at 85% 0%, rgba(231, 39, 135, .45), transparent 45%), linear-gradient(135deg, var(--indigo-dark), var(--indigo)); color: #FFFFFF; text-align: center; }
.lp-close__title { font-size: clamp(30px, 4vw, 44px); font-weight: 800; letter-spacing: -.03em; line-height: 1.12; }
.lp-close p { max-width: 50ch; margin: 14px auto 0; color: #D9DAF0; font-size: 18px; }
.lp-close .lp-btn--white { white-space: normal; text-align: center; }
.lp-close a:focus-visible { outline-color: #FFFFFF; }

.lp-foot { padding: 32px 0 40px; border-top: 1px solid var(--line); font-size: 14px; }
.lp-foot a { color: var(--text); }
.lp-foot__inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 24px; }
</style>
