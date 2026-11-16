import { describe, expect, it } from 'vitest';
import { MAX_SUGGESTIONS, TERMS, suggestFeatures } from './index';

describe('suggestFeatures', () => {
  it('suggests a feature for an everyday word', () => {
    expect(suggestFeatures('wheelchair ramp', 'en')).toContain('ramp');
    expect(suggestFeatures('lift', 'en')).toEqual(['elevator']);
  });

  it('works in French, with and without accents', () => {
    expect(suggestFeatures('ascenseur', 'fr')).toEqual(['elevator']);
    expect(suggestFeatures('rampe d’accès', 'fr')).toContain('ramp');
    expect(suggestFeatures('entrée', 'fr')).toContain('step-free-entrance');
  });

  it('matches the start of a word being typed', () => {
    expect(suggestFeatures('elev', 'en')).toEqual(['elevator']);
  });

  it('does not match one or two letters', () => {
    expect(suggestFeatures('el', 'en')).toEqual([]);
  });

  it('leaves out features already chosen', () => {
    expect(suggestFeatures('ramp', 'en', ['ramp'])).toEqual([]);
  });

  it('returns nothing for empty, blank or unrelated text', () => {
    expect(suggestFeatures('', 'en')).toEqual([]);
    expect(suggestFeatures('   ', 'en')).toEqual([]);
    expect(suggestFeatures('zebra', 'en')).toEqual([]);
  });

  it('never suggests more than the limit, in glossary order', () => {
    const out = suggestFeatures('door entrance bar ramp lift', 'en');
    expect(out.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
    const order = TERMS.map((t) => t.id);
    expect([...out].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(out);
  });

  it('only suggests real glossary ids', () => {
    const ids = new Set(TERMS.map((t) => t.id));
    for (const q of ['door', 'bar', 'park', 'wash', 'porte', 'stationnement']) {
      for (const lang of ['en', 'fr'] as const) {
        for (const id of suggestFeatures(q, lang)) expect(ids.has(id)).toBe(true);
      }
    }
  });
});
