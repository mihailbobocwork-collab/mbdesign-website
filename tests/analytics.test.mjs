import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {track} from '../public/assets/analytics.js';

test('Analytics is cookieless: no Google tag, no consent banner, and track() is a safe no-op', async () => {
  assert.doesNotThrow(() => track('inquiry_step', {step:'message'}));
  const build = await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
  const loader = await readFile(new URL('../public/assets/analytics.js', import.meta.url), 'utf8');
  for (const source of [build, loader]) {
    assert.doesNotMatch(source, /googletagmanager|gtag\(|G-MJ6TYXCYLQ|Allow analytics/);
  }
});
