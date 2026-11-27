# Analytics

**Cloudflare Web Analytics** (cookieless). Chosen by the owner on 2026-11-24 so visitors are never asked for analytics consent.

- No cookies, no fingerprinting, no consent banner. It counts page views, visits, referrers, countries, browsers and Core Web Vitals.
- Turn it on once in the Cloudflare dashboard: **Workers & Pages → mbdesign-website → Metrics → Web Analytics → Enable**. Cloudflare then injects its beacon (`static.cloudflareinsights.com`) into every deployment, including pages.dev and any custom domain. No code or token is needed in this repo.
- Inquiry text, contact details and URL fragments are never sent anywhere for analytics.
- `public/assets/analytics.js` only exports a no-op `track()`, so components that used to report inquiry steps keep working. Funnel events (inquiry steps, leads) are no longer measured.

## Removed: Google Analytics 4
GA4 (`G-MJ6TYXCYLQ`), its consent banner, the footer "Analytics preferences" control and the prepared GTM container (`GTM-PM9CSLRQ`) were removed on 2026-11-24. Google Analytics sets cookies, which require consent from EU visitors; the owner preferred not to ask. Restoring GA would need the consent banner back.

## Visitors page in the admin (`/admin/analytics/`, 2026-11-27)

The admin shows the Cloudflare Web Analytics numbers (visitors, page views, visitors per day, top pages, where visitors came from, countries, devices; 7/30/90 days). `lib/analytics-admin.js` reads them from Cloudflare's GraphQL API (`rumPageloadEventsAdaptiveGroups`), caches them for 5 minutes and needs the admin sign-in. `/admin/analytics/?sample` on the local preview shows made-up numbers.

One-time setup (owner, in the Cloudflare dashboard):
1. **Turn on Web Analytics**: Workers & Pages → mbdesign-website → Metrics → Web Analytics → Enable. This also starts counting visits (Cloudflare adds its beacon to every page).
2. **Site tag**: Analytics & Logs → Web Analytics → the mihaiboboc.com site → Manage site / Edit; the `siteTag` (a 32-character id) is in the JS snippet (`"token"` is not it — use the site tag shown in the site's settings or URL).
3. **Account ID**: on the account's home page (right column, "Account ID").
4. **API token**: My Profile → API Tokens → Create Token → Custom token → Permissions: *Account* · *Account Analytics* · *Read*, limited to this account. Copy it once.
5. Workers & Pages → mbdesign-website → Settings → Variables and Secrets (Production) → add as **Secrets**: `CF_ANALYTICS_TOKEN`, `CF_ACCOUNT_ID`, `CF_WEB_ANALYTICS_SITE_TAG`. Then redeploy (any push, or Deployments → Retry).

Until all three are set the page says the numbers aren't connected and lists these steps. Cloudflare keeps about 6 months of Web Analytics data; the page asks for up to 90 days.
