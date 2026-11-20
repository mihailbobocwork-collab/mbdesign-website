# Launch handoff

Current intended contact and Google owner: **mihailboboc.work@gmail.com**. This is a configuration target, not a connected account. Nothing has been deployed or sent. The existing domain has not been changed.

## Built and available locally

- Hero introduction → editable topic → name/email/company → meeting preference → separate message → calendar if meeting → final review → explicit confirmation.
- A short topic such as “app” cannot replace the detailed message: the description requires 20–3,000 characters. Topic supports up to 200 characters. Multiline/long hero introductions are retained in the description instead of being silently cut off.
- Switching between meeting and message keeps the topic and description. Edit actions and Back revisit the appropriate steps.
- Contact form has the same separate topic/description, calendar, review and confirmation. Public email link points to the confirmed Gmail address. Private-case requests keep their context.
- Google event titles/descriptions and inquiry emails include the topic and full message. Production delivery waits for the Google connection and verified confirmation; no success is fabricated.
- Pricing and all Playground pages are omitted from the public build and navigation. Source templates, offers and experiments remain for a later return. Their old URLs temporarily redirect home. Public offers data is empty while pricing is paused.
- Local preview uses visibly labelled sample availability while Google is unconnected. Samples cannot create meetings or messages.

## Required before a working public launch

1. **Choose the initial URL.** Use a private staging setup or an approved Cloudflare Pages address to test first. Replace mihailboboc.com only after approval and checking the existing DNS/email records. Do not change Gmail/domain mail records as part of a website cutover.
2. **Connect the Google owner.** Enable Calendar API and Gmail API, configure the owner OAuth client and consent setup, then use the private helper in GOOGLE-SETUP.md. Sign in as mihailboboc.work@gmail.com. Never paste passwords, client secrets or refresh tokens into chat. A Google external Testing refresh token generally expires after seven days for these scopes; complete the appropriate production/personal-use setup rather than relying on a temporary test connection.
3. **Confirm meeting rules.** Currently 30 minutes, Mon–Fri 10:00–17:00 Europe/Chisinau, 24-hour notice, 15-minute buffers, 60 days ahead. Confirm these and any conflicting calendars or blocked dates.
4. **Prepare GitHub and Cloudflare Pages.** Put this source at a GitHub repository root. Build command `npm run build`, output `dist`, Node 24. Include functions/, lib/, content/ and migrations/; a static-only upload does not include mail/calendar handlers. Configure the HTTPS site URL and repository in content/site.json.
5. **Bind the booking database and secrets.** Create the Cloudflare D1 database, apply its migrations, bind BOOKING_DB, and store Google credentials as encrypted Pages secrets. Follow GOOGLE-SETUP.md. The production API fails closed if Google, the database or anti-spam verification is missing.
6. **Enable anti-spam.** Create a Cloudflare Turnstile widget for the real hostname. Set its public site key in Site settings and its secret privately in Cloudflare. Do not enable local preview/bypass flags in production.
7. **Connect content editing.** Configure the existing Decap CMS GitHub OAuth app, exact final-domain callback and permitted GitHub owner. Use a repository/auth scope that supports the chosen repository visibility. The CMS is not an email inbox and does not manage Google events.
8. **Run a real acceptance test.** After permission to send, test one message-only inquiry, one meeting invitation and Meet link, owner/visitor inboxes, duplicate prevention, unavailable times, mobile editing/Back, and Google Calendar cancellation/rescheduling notifications. Delete test events after testing. Check that live pages never show sample times.
9. **Finish public content and switch over.** Review About/career details and privacy/contact information, remove the remaining “More work, soon” placeholder if not wanted, confirm project claims, switch draft mode off only when ready for indexing, and approve the final domain cutover. Verify HTTPS, redirects, social sharing and CMS sign-in on that domain.

## Managing inquiries for the first launch

- Reply to inquiries in Gmail, using the visitor’s Reply-To address.
- Change or cancel meetings in Google Calendar and send the corresponding guest updates. Google Calendar and the guest invitation are the authoritative meeting record.
- A custom private inbox with Reply/Decline/Propose another time inside the site CMS is **not implemented**. It is a separate authenticated admin feature and would require additional permissions, storage/retention decisions and testing. It is not needed to operate the first launch through Gmail and Calendar.

## Remaining access and verification

No .dev.vars Google credentials file or production wrangler.toml database configuration was present during this update. GitHub/Cloudflare accounts and the final deployment target have not been connected here. Browser-control tools were unavailable for this change, so the updated flow has automated checks but has not received a new interactive browser test or real email/calendar delivery test.

Sources: [Google refresh-token expiration](https://developers.google.com/identity/protocols/oauth2), [Google production OAuth requirements](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance), [Cloudflare Pages bindings and secrets](https://developers.cloudflare.com/pages/functions/bindings/).


## GitHub target

Owner supplied: mihailbobocwork-collab. Prepared repository target: mihailbobocwork-collab/mbdesign-website, branch main. The owner-created repository exists. Initial source transfer is being prepared; Cloudflare deployment remains separate. Configure GITHUB_ALLOWED_USERS to mihailbobocwork-collab and GITHUB_REPO to the same owner/repository when connecting CMS authentication.
