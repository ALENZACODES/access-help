import { describe, expect, it } from 'vitest';
import {
  GLANCE_UI,
  PLAIN_TERMS,
  auditHtml,
  frenchIssues,
  glance,
  glanceLines,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  readabilityIssues,
  renderGlance,
  unknownPercent,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const N = PLAIN_TERMS.length;
const places: Place[] = [
  { id: 'a', name: 'A', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit), c('grab-bar', 'present')] },
  { id: 'b', name: 'B', claims: [c('ramp', 'present', city), c('ramp', 'absent', transit)] },
  { id: 'c', name: 'C', claims: [] },
];

describe('glance', () => {
  const g = glance(places);
  it('counts places and the records that can be reported', () => {
    expect(g.places).toBe(3);
    expect(g.records).toBe(4);
  });
  it('counts sources by name and licence', () => {
    expect(g.sources).toBe(2);
    expect(glance([{ id: 'x', name: 'X', claims: [c('ramp', 'present', city), c('elevator', 'present', { ...city, licence: 'CC-BY-4.0' })] }]).sources).toBe(2);
  });
  it('gives the newest and oldest source dates', () => {
    expect(g.newest).toBe('2026-10-01');
    expect(g.oldest).toBe('2025-03-04');
  });
  it('counts a place with no reportable record as all unknown', () => {
    expect(g.placesAllUnknown).toBe(1);
    expect(glance([{ id: 'x', name: 'X', claims: [c('ramp', 'present'), c('elevator', 'unknown', city)] }]).placesAllUnknown).toBe(1);
  });
  it('counts unknown place and feature pairs, with a disagreement counted as unknown', () => {
    expect(g.pairs).toBe(3 * N);
    expect(g.unknownPairs).toBe(N - 2 + N + N);
  });
  it('is all zero and empty with no places', () => {
    expect(glance([])).toEqual({ places: 0, placesAllUnknown: 0, records: 0, unknownPairs: 0, pairs: 0, sources: 0, newest: '', oldest: '' });
  });
  it('does not change its input', () => {
    const copy = JSON.stringify(places);
    glance(places);
    expect(JSON.stringify(places)).toBe(copy);
  });
});

describe('unknownPercent', () => {
  it('rounds to a whole percent', () => {
    expect(unknownPercent({ unknownPairs: 1, pairs: 3 })).toBe(33);
    expect(unknownPercent({ unknownPairs: 2, pairs: 3 })).toBe(67);
    expect(unknownPercent({ unknownPairs: 8, pairs: 8 })).toBe(100);
    expect(unknownPercent({ unknownPairs: 0, pairs: 8 })).toBe(0);
  });
  it('is 0 with no places', () => {
    expect(unknownPercent({ unknownPairs: 0, pairs: 0 })).toBe(0);
  });
});

describe('lines', () => {
  it('says there are no places', () => {
    expect(glanceLines(glance([]), 'en')).toEqual([GLANCE_UI.en.none]);
  });
  it('gives the counts, the unknown share and the dates', () => {
    const lines = glanceLines(glance(places), 'en');
    expect(lines[0]).toBe('3 places, 4 records that can be reported, from 2 sources.');
    expect(lines[1]).toMatch(/^\d+ percent of the features are unknown\.$/);
    expect(lines).toContain('For 1 place, every feature is unknown.');
    expect(lines).toContain('The newest source is dated 2026-10-01.');
    expect(lines).toContain('The oldest source is dated 2025-03-04.');
  });
  it('leaves out the sources and the dates when nothing can be reported', () => {
    expect(glanceLines(glance([{ id: 'x', name: 'X', claims: [] }]), 'en')).toEqual([
      '1 place, 0 records that can be reported.',
      '100 percent of the features are unknown.',
      'For 1 place, every feature is unknown.',
    ]);
  });
  it('gives one date when the newest and oldest are the same', () => {
    const lines = glanceLines(glance([{ id: 'x', name: 'X', claims: [c('ramp', 'present', city)] }]), 'en');
    expect(lines.filter((l) => l.includes('dated'))).toEqual(['The newest source is dated 2026-10-01.']);
  });
  it('is French', () => {
    expect(glanceLines(glance(places), 'fr')[0]).toBe('3 lieux, 4 fiches qui peuvent être signalées, de 2 provenances.');
  });
  it('never rates a place', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      for (const line of glanceLines(glance(places), lang)) expect(line).not.toMatch(/accessible|score|rating/i);
    }
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const p of [places, []]) expect(auditHtml(`<div lang="${lang}"><h2>x</h2>${renderGlance(p, lang)}</div>`, 'glance')).toEqual([]);
  });
  it('is a short list with the note that these are counts', () => {
    const html = renderGlance(places, 'en');
    expect(html).toContain('<h3 class="gl-note">At a glance</h3>');
    expect(html.match(/<li>/g)?.length).toBe(glanceLines(glance(places), 'en').length);
    expect(html).toContain(GLANCE_UI.en.note);
  });
  it('has no note with no places', () => {
    expect(renderGlance([], 'en')).not.toContain(GLANCE_UI.en.note);
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = GLANCE_UI[lang];
    const texts = [
      ui.heading, ui.none, ui.places(1), ui.places(3), ui.records(1), ui.records(4), ui.sources(1), ui.sources(2), ui.unknown(40), ui.allUnknown(1), ui.allUnknown(2),
      ui.newest('2026-10-01'), ui.oldest('2025-03-04'), ui.note,
    ];
    for (const text of texts) {
      expect(lintCopy(text), text).toEqual([]);
      expect(lintClaims(text), text).toEqual([]);
      expect(plainLanguageIssues(text), text).toEqual([]);
      expect(readabilityIssues(text, lang), text).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
    }
  });
});
