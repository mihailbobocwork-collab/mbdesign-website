// Analytics: the site uses Cloudflare Web Analytics, which is cookieless and needs no consent banner.
// It is switched on in the Cloudflare dashboard (Workers & Pages → mbdesign-website → Metrics → Web Analytics),
// which injects its own beacon; nothing is loaded from here. Google Analytics and its consent banner were removed
// at the owner's request on 2026-11-24. `track()` stays as a no-op so components that report inquiry steps keep working.
export function track() {}
