# Connect your Google account

The local design and sample calendar work now. Real availability, invitations and messages require this one-time private setup. No account has been connected yet. Do not paste credentials into chat or commit them.

## 1. Create the owner connection

1. In [Google Cloud Console](https://console.cloud.google.com/), create/select a project and enable **Google Calendar API** and **Gmail API**. Use the Google account that will host meetings and receive inquiries; it must support Gmail and Google Meet.
2. Configure **Google Auth Platform → Branding, Audience and Data Access** for this owner-operated website. Add the owner as a test user while testing. Request only `openid`, `email`, `calendar.events.owned`, `calendar.freebusy`, and `gmail.send` (the last three use the `https://www.googleapis.com/auth/` prefix). The app sends inquiry mail to the owner; it does not read mail.
3. Create an OAuth client of type **Web application**. Register this exact authorised redirect URI: `http://localhost:4180/google/callback`.
4. Copy `.dev.vars.example` to `.dev.vars`. Privately enter `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Keep the other connection fields blank initially.
5. From the project folder, run `npm run connect:google`. Open its Google consent link in your own browser, review the permissions, and authorise your account. The helper verifies the returned identity, then saves the refresh token, owner email and calendar ID directly to `.dev.vars` with owner-only file permissions. It prints no tokens. The helper listens locally for at most ten minutes.
6. Restart `npm run dev`. The local server bypasses Turnstile only on localhost, but still requires the private Google connection. Try a real booking only when you are ready to create an event and send an invitation. Use an email address you control for the test.

Google's external **Testing** mode may issue refresh tokens that expire after seven days for these scopes. Before launch, complete the appropriate production audience/consent setup and any verification Google requires. A Workspace administrator may need to approve the app. Do not rely on a testing token as a permanent connection. Revoke access in Google Account settings if the integration is retired.

## 2. Set your meeting rules

Edit **Booking availability** in the Git-backed CMS, or `content/booking.json` directly. Draft defaults: 30-minute meetings, weekdays 10:00–17:00 Europe/Chisinau, 30-minute start intervals, 15-minute buffers, 24-hour notice, and 60 days ahead. Add `blockedDates` in YYYY-MM-DD format. Time rules belong to the owner zone; visitors can view them in their own zone.

`GOOGLE_CALENDAR_ID` defaults to the connected owner's primary calendar. If you select another one, it must be owned by that account and support Meet creation. Optional `GOOGLE_CHECK_CALENDARS` is a comma-separated list of additional calendars to check for conflicts. Any failed calendar check blocks availability rather than treating the calendar as empty.

## 3. Prepare Cloudflare privately

The repository and CMS deployment instructions are in README.md. Publication still requires the owner's go-ahead.

1. Create a Cloudflare D1 database for booking records. Copy `wrangler.example.toml` to `wrangler.toml`, replacing its database ID with the real ID. Keep the `BOOKING_DB` binding and `migrations` directory.
2. Apply the schema to that database with `npx wrangler d1 migrations apply mihail-bookings --remote`. This creates the reservation and request-limit tables. Run against a separate database for staging if used.
3. In the Pages project's runtime settings, ensure **D1 database binding `BOOKING_DB`** points to this database. Add the Google values from `.dev.vars` as encrypted runtime secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `BOOKING_HOST_EMAIL`. Add `GOOGLE_CALENDAR_ID` and optional `GOOGLE_CHECK_CALENDARS` as runtime configuration. Never put these in CMS content.
4. Create a Turnstile widget for the final site hostname. Set its public site key in `content/site.json` → `turnstileSiteKey` (or CMS Site settings). Save its secret as `TURNSTILE_SECRET` in Pages runtime settings. The server validates success, hostname and action; do not set `BOOKING_LOCAL` in production.
5. When publication is authorised, deploy the full repository including `functions/`, `lib/`, `content/booking.json` and `migrations/`. Uploading only `dist/` does not include the booking endpoints. `_routes.json` includes both API routes.
6. Check live availability, a meeting confirmation, the owner's event, the visitor's invitation/Meet link, and one message-only inquiry. Confirm delivery in the inbox, then remove the test meeting. No live Google test has been performed as part of this build.

## 4. Approving meetings (admin)

Meetings are **requests until the owner approves them** (owner, 2026-11-24). Messages are unchanged.

- Visitor confirms a time → the server holds it privately in the owner's calendar ("Pending approval: …", private, no guest, no Meet, `sendUpdates=none`) and stores the answers in D1 (status `requested`). The visitor sees "Your request is in" and gets a "request received" email; the owner gets a "Meeting request" email linking to `/admin/`.
- `/admin/` lists requests (Waiting / Upcoming / Past & declined). **Approve & send invite** patches the held event with the guest, a Meet conference and `sendUpdates=all`, then sends the existing confirmation email. **Decline** deletes the hold (no Google notification) and emails the guest a short note (optional personal note). A requested time stays unavailable to others until answered; past times can only be declined.
- API: `functions/api/admin/bookings.js` → `lib/booking-admin.js` (GET list, POST `{id, action: approve|decline, note}`), same-origin only, one decision per request (atomic claim).
- Sign-in: **Cloudflare Access**. In Cloudflare Zero Trust → Access → Applications, add a self-hosted application for the site hostname(s) with paths `/admin/*` and `/api/admin/*`, policy "Allow → Emails → your email" (one-time PIN login is fine). Then set Pages runtime variables `ACCESS_TEAM_DOMAIN` (e.g. `yourteam.cloudflareaccess.com`) and `ACCESS_AUD` (the application's Audience tag), and optionally `ADMIN_EMAILS` (comma-separated). `lib/admin-auth.js` verifies the Access JWT (signature, audience, issuer, expiry, email) on every API call. Without these variables the admin API answers "Admin sign-in isn't set up yet".
- No D1 migration is needed: the new statuses and the stored answers live in the existing `booking_requests` table (`status`, `result_json`).
- Local review: `npm run dev`, open `/admin/?sample` for labelled sample requests (nothing is sent). Loopback with `BOOKING_LOCAL` skips Access.

## What happens for visitors

Editable topic from the hero → contact details → meeting preference → separate detailed message → time selection if meeting → final review of topic, message, details and chosen time → explicit confirmation. The current intended owner is mihailboboc.work@gmail.com; the helper checks this account when BOOKING_HOST_EMAIL is set. The server rechecks Google availability, reserves against simultaneous website bookings, and requests an event with a unique Meet conference and guest notifications. The final review includes the selected time and offers a Change time action. The confirmation page shows the Meet link when Google has generated it; if generation is still pending, the invitation is the follow-up source. Nothing is sent merely by entering text, choosing a day or reviewing.

Message-only inquiries go through Gmail from the connected owner account to itself, with the visitor's address as Reply-To. A successful Gmail API response confirms acceptance, not guaranteed inbox delivery; filters and provider policy still apply.

## Operations and limits

- The database stores request IDs, payload hashes, times, event IDs and receipts. Meeting requests also store the answers and email (needed to approve or decline); they are pruned ~90 days after the meeting. Message and failed records are pruned after 30 days. Google retains event/message data under its own account settings.
- Completed/failed records older than 30 days are pruned during subsequent submissions. Request-rate buckets expire after an hour. Confirmed temporary reservations expire after two minutes, then Google busy periods remain the availability source so cancellations unblock naturally.
- A request with an unknown provider outcome remains held to prevent an automatic duplicate. Meeting status checks recover through its fixed event ID. Unknown mail delivery requires owner review in Gmail; there is deliberately no mail-reading permission. Review `uncertain` database records before resolving one manually; never delete a hold without checking Google first.
- Website bookings are reserved atomically in D1. A direct Google Calendar edit can still race the final Google event creation. This integration does not claim a transaction spanning Google and Cloudflare.
- Approve or decline requests in `/admin/`. Reschedule or cancel already-confirmed meetings through Google Calendar.
- Cloudflare and Google quotas apply; this removes the Calendly subscription but is not a promise of unlimited free usage.

Sources: [Google event creation and conference data](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), [Google OAuth offline access](https://developers.google.com/identity/protocols/oauth2/web-server), [Gmail send scope](https://developers.google.com/workspace/gmail/api/auth/scopes), [Cloudflare D1](https://developers.cloudflare.com/d1/), [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).


### Local preview before connecting

With no Google credentials, the local server enables clearly labelled sample bookings on the ordinary homepage and contact page, including final review and a no-send confirmation. This local-only flag is never written into published HTML. After the connection helper saves the Google account, restart the server to test real availability. Published availability continues to require the real Google/D1/Turnstile configuration.
