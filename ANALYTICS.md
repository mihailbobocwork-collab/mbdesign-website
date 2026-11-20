# Google Analytics 4

Measurement ID: G-MJ6TYXCYLQ. Uses the direct Google tag, not the separate GTM container.

Before enabling traffic collection in the GA4 Web stream, turn OFF Enhanced measurement (including automatic form interactions, site search and browser-history page changes). The website sends explicit, filtered page views and events. Do not enable user-provided data collection, Google signals or advertising personalization for this property.

Only mihaiboboc.com and www.mihaiboboc.com collect analytics. Local previews, the pages.dev deployment and CMS do not. The new domain must serve the current deployment over HTTPS before a live Analytics check can succeed.

Google's script loads only after Allow analytics. No pre-consent funnel events are queued. No thanks records a local refusal; Analytics preferences in the footer can reopen the choice. Preferences last six months, analytics cookies are configured for 90 days. Withdrawing disables measurement and expires Analytics cookies; refusing does not affect the form. Browser blockers and refusal mean reports cannot represent every visitor.

Events:
- page_view: sanitized origin and pathname, static page title, referrer origin only.
- view_case_study: a known public project slug.
- inquiry_step: one fixed hero step label, no field values.
- generate_lead: after the server confirms a submission; lead_type is message or meeting. Local simulation does not count.

No name, email, topic, message, meeting time, Meet URL, submission identifier, URL query or fragment is included in custom analytics payloads. Google still processes standard technical usage information after consent.

Mark generate_lead as a key event in GA4. Use lead_type to distinguish booked meetings from message inquiries. In Explore, create an open funnel using inquiry_step and step; ending at generate_lead. Step counts can repeat when visitors go back. Event deduplication for repeated submission callbacks lasts for the current page instance.

Verify in Realtime after consenting on the custom domain. Check that a fresh refusal loads no googletagmanager.com script or Google Analytics collection requests; test grant, withdrawal and next-page navigation. Test conversion only with authorized real submissions. A live property/Realtime check requires access to the user's Google Analytics account.
