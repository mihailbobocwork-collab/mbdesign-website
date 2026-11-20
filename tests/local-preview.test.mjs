import test from 'node:test';
import assert from 'node:assert/strict';
import {localPreviewHTML} from '../lib/local-preview.js';
const page='<html><body class="hero-page"><main>Portfolio</main></body></html>';
test('The unconnected local server enables an explicitly marked simulation without changing published HTML',()=>{assert.match(localPreviewHTML(page,{}),/<body class="hero-page" data-local-booking-preview="true">/);assert.ok(!page.includes('data-local-booking-preview'));});
test('Connecting Google restores real local booking and no credential is exposed in HTML',()=>{const env={GOOGLE_CLIENT_ID:'mock-client',GOOGLE_CLIENT_SECRET:'mock-secret',GOOGLE_REFRESH_TOKEN:'mock-token',BOOKING_HOST_EMAIL:'owner@example.com'};assert.equal(localPreviewHTML(page,env),page);for(const value of Object.values(env))assert.ok(!localPreviewHTML(page,env).includes(value));});
