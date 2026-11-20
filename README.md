# Property Pulse – Valuation UI

The shared instant valuation page used by every company, LS customer or not. Each company has its
own subdomain; the bare domain is the Property Pulse home page:

```
https://<company-slug>.property-ai.co.uk     company page
https://property-ai.co.uk                    home page (www too)
```

There is **one build for all companies**. On load the page reads the company's config from the API
and styles itself, so changing a company's look never needs a deploy:

```
GET /api/public/companies/<slug>/config   →  branding, texts, enabled services
```

Everything is edited in the Property Cockpit (`/api/admin/companies/...` in the valuation API) as a
draft and goes live on publish.

## What a company can change (no deploy)

| Config | Effect |
|---|---|
| `branding.logoUrl`, `faviconUrl` | Logo in the header, browser tab icon |
| `branding.primaryColor`, `accentColor` | Buttons, selected states, highlights. Button text colour is picked automatically for contrast |
| `branding.backgroundColor`, `backgroundImageUrl`, `backgroundOverlay` | Page background; the overlay darkens the image so text stays readable |
| `branding.fontFamily` | One of Inter, Space Grotesk, DM Sans, Manrope, Lora, Playfair Display |
| `branding.borderRadius` | Corner roundness of cards, inputs, buttons |
| `content.*` | Headline, subtext, button labels, thank-you message, disclaimer, privacy link, phone, page title |
| `features.sales / lettings / personalise` | Which services appear (the API enforces them too) |
| `openingHours.monday … sunday` | Optional, e.g. `"9:00 - 17:30"` or `"Closed"`. Limits the days and hourly slots offered for the expert visit; without it Monday–Saturday 08:00–18:00 is offered. Sunday is never offered |

The form itself always sits on a white card so it is readable on any background.

## Flow

postcode → address → contact details → instant valuation (sale or rent) → optional
"Personalise my valuation" (questions from the API, price range, comparables) → book a visit → thank you.

Every API call sends `X-Company: <slug>`; the API works out the company from it, so the page never
sends a `company_id`.

## Embedding on an agency's own site

```html
<script src="https://harbour-co.property-ai.co.uk/embed.js" async></script>
```

It adds an iframe that resizes to fit and shows the company whose subdomain the script comes from
(`data-company="<slug>"` picks one explicitly). `data-target="#some-id"` places it inside an element.

## Live preview in the cockpit

Load `https://<slug>.property-ai.co.uk/?preview=1` in an iframe and post the draft:

```js
iframe.contentWindow.postMessage({ type: 'pulse:preview-config', config: { name, features, branding, content } }, uiOrigin)
```

The page announces `{ type: 'pulse:preview-ready' }` when it is listening. Only origins in
`VITE_COCKPIT_ORIGINS` are accepted.

## Development

```bash
cp .env.example .env    # set VITE_API_URL and VITE_API_KEY
npm install
npm run dev             # http://<slug>.localhost:5174 (or http://localhost:5174/<slug>)
npm test                # theme, question and format helpers
npm run build
```

The API must have the company endpoints (branch `feature/multi-tenant` of ls-instant-valuation-api
until it is merged) and a company with that slug must be published.

## Deploy

Docker image (nginx) serves the build at the root. Build args: `VITE_API_URL`,
`VITE_API_KEY`, `VITE_COCKPIT_ORIGINS`, `VITE_GOOGLE_MAPS_KEY` (optional; without it the property maps are hidden).

The app reads the company from the host name, so these domains all point at this one service:

| Domain | DNS |
|---|---|
| `property-ai.co.uk` | apex: ALIAS/ANAME (or A) to the Railway target |
| `www.property-ai.co.uk` | CNAME to the Railway target |
| `*.property-ai.co.uk` | wildcard CNAME to the Railway target (plus the `_acme-challenge` CNAME Railway asks for, for the certificate) |

Records that already exist (e.g. `ls-instant-valuation-api`) win over the wildcard. Names the site
uses are reserved as slugs in the API. On any other host (the Railway domain, localhost) `/<slug>`
also opens a company page; on property-ai.co.uk it redirects to the subdomain.

`VITE_SITE_DOMAIN` (optional, default `property-ai.co.uk`) changes the domain. The API needs CORS for
the subdomains (it currently allows all origins).
