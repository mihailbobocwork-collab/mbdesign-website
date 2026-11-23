# Analytics

**Cloudflare Web Analytics** (cookieless). Chosen by the owner on 2026-11-24 so visitors are never asked for analytics consent.

- No cookies, no fingerprinting, no consent banner. It counts page views, visits, referrers, countries, browsers and Core Web Vitals.
- Turn it on once in the Cloudflare dashboard: **Workers & Pages → mbdesign-website → Metrics → Web Analytics → Enable**. Cloudflare then injects its beacon (`static.cloudflareinsights.com`) into every deployment, including pages.dev and any custom domain. No code or token is needed in this repo.
- Inquiry text, contact details and URL fragments are never sent anywhere for analytics.
- `public/assets/analytics.js` only exports a no-op `track()`, so components that used to report inquiry steps keep working. Funnel events (inquiry steps, leads) are no longer measured.

## Removed: Google Analytics 4
GA4 (`G-MJ6TYXCYLQ`), its consent banner, the footer "Analytics preferences" control and the prepared GTM container (`GTM-PM9CSLRQ`) were removed on 2026-11-24. Google Analytics sets cookies, which require consent from EU visitors; the owner preferred not to ask. Restoring GA would need the consent banner back.
