import { describe, expect, it } from 'vitest';
import {
  CONNECTION_STRINGS,
  buildManifest,
  cacheName,
  connectionText,
  decideStrategy,
  frenchIssues,
  lintCopy,
  planCacheUpdate,
  type CacheManifest,
} from './index';

const manifest: CacheManifest = { version: '2', paths: ['/', '/app.js', '/glossary-en.json'] };
const origin = 'https://app.example.org';

describe('buildManifest', () => {
  it('sorts and de-duplicates same-origin paths', () => {
    const r = buildManifest('1.0.0', ['/b.js', '/a.js', '/b.js']);
    expect(r.problems).toEqual([]);
    expect(r.manifest).toEqual({ version: '1.0.0', paths: ['/a.js', '/b.js'] });
  });

  it('rejects a bad version', () => {
    for (const v of ['', 'a b', 'x/y', 'v'.repeat(65)]) {
      expect(buildManifest(v, ['/a']).problems).toContain('bad-version');
    }
  });

  it('rejects anything that is not a plain same-origin path', () => {
    const bad = ['https://tiles.example.org/1.png', '//cdn.example.org/x.js', '/a/../b', 'rel/path', '/a b', '/a?x=1', '/a#x', '/a\\b'];
    const r = buildManifest('1', ['/ok', ...bad]);
    expect(r.manifest).toBeNull();
    expect(r.problems).toEqual(bad.map((b) => `bad-path:${b}`));
  });
});

describe('cacheName / planCacheUpdate', () => {
  it('joins prefix and version', () => {
    expect(cacheName('glossary', '2')).toBe('glossary-2');
  });

  it('keeps the current cache and removes only older ones with our prefix', () => {
    const plan = planCacheUpdate(['glossary-1', 'glossary-2', 'other-1'], manifest, 'glossary');
    expect(plan).toEqual({ name: 'glossary-2', needsPrecache: false, remove: ['glossary-1'] });
  });

  it('asks for precaching on a new version', () => {
    const plan = planCacheUpdate(['glossary-1', 'glossary-2'], { ...manifest, version: '3' }, 'glossary');
    expect(plan).toEqual({ name: 'glossary-3', needsPrecache: true, remove: ['glossary-1', 'glossary-2'] });
  });

  it('works with no caches yet', () => {
    expect(planCacheUpdate([], manifest, 'glossary')).toEqual({ name: 'glossary-2', needsPrecache: true, remove: [] });
  });
});

describe('decideStrategy', () => {
  const get = (url: string, mode?: string) => ({ url, method: 'GET', ...(mode !== undefined ? { mode } : {}) });

  it('serves listed files from the cache', () => {
    expect(decideStrategy(get('/app.js'), manifest, origin)).toBe('cache-first');
    expect(decideStrategy(get('https://app.example.org/app.js?v=1#x'), manifest, origin)).toBe('cache-first');
  });

  it('tries the network first for pages and other same-origin requests', () => {
    expect(decideStrategy(get('/help', 'navigate'), manifest, origin)).toBe('network-first');
    expect(decideStrategy(get('/other.json'), manifest, origin)).toBe('network-first');
  });

  it('leaves non-GET and cross-origin requests alone, including tile servers', () => {
    expect(decideStrategy({ url: '/app.js', method: 'POST' }, manifest, origin)).toBe('bypass');
    expect(decideStrategy(get('https://tiles.example.net/1/2/3.png'), manifest, origin)).toBe('bypass');
    expect(decideStrategy(get('//cdn.example.net/app.js'), manifest, origin)).toBe('bypass');
  });

  it('bypasses what it cannot parse', () => {
    expect(decideStrategy(get('app.js'), manifest, origin)).toBe('bypass');
    expect(decideStrategy(get('/app.js'), manifest, 'not an origin')).toBe('bypass');
  });

  it('treats the method case-insensitively', () => {
    expect(decideStrategy({ url: '/app.js', method: 'get' }, manifest, origin)).toBe('cache-first');
  });
});

describe('connectionText', () => {
  it('is null online and a banner offline', () => {
    expect(connectionText(true, 'en')).toBeNull();
    expect(connectionText(false, 'en')).toBe('You are offline. Showing saved information.');
    expect(connectionText(false, 'fr')).toBe('Vous êtes hors ligne. Affichage des données enregistrées.');
  });

  it('follows the wording and typography rules', () => {
    for (const s of Object.values(CONNECTION_STRINGS)) expect(lintCopy(s)).toEqual([]);
    expect(frenchIssues(CONNECTION_STRINGS.fr)).toEqual([]);
  });
});
