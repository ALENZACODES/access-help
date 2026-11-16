import { describe, expect, it } from 'vitest';
import {
  MUST_UI,
  auditHtml,
  mustCountsText,
  featureName,
  frenchIssues,
  lintClaims,
  lintCopy,
  mustFor,
  mustId,
  mustLineText,
  mustLines,
  normaliseMust,
  parseMust,
  parseMustId,
  parseMustShowId,
  plainLanguageIssues,
  readabilityIssues,
  renderMustCard,
  renderMustPanel,
  serialiseMust,
  toggleMust,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' };
const c = (termId: string, status: FeatureClaim['status']): FeatureClaim => ({ termId, status, provenance: prov });
const places: Place[] = [
  { id: 'a', name: 'Library', claims: [c('ramp', 'present'), c('elevator', 'absent')] },
  { id: 'b', name: 'Café Nord', claims: [c('ramp', 'present'), c('elevator', 'present')] },
  { id: 'c', name: 'Pool', claims: [] },
];

describe('choosing', () => {
  it('keeps known features once each, in glossary order', () => {
    expect(normaliseMust(['elevator', 'ramp', 'ramp', 'nope', ''])).toEqual(['ramp', 'elevator']);
    expect(normaliseMust([])).toEqual([]);
  });
  it('adds and removes a feature', () => {
    const one = toggleMust([], 'ramp');
    expect(one).toEqual(['ramp']);
    expect(toggleMust(one, 'elevator')).toEqual(['ramp', 'elevator']);
    expect(toggleMust(one, 'ramp')).toEqual([]);
  });
  it('ignores an unknown feature, returning the same list', () => {
    const m = ['ramp'];
    expect(toggleMust(m, 'nope')).toBe(m);
  });
  it('is safe with prototype names', () => {
    expect(toggleMust([], 'constructor')).toEqual([]);
    expect(toggleMust([], '__proto__')).toEqual([]);
  });
  it('does not change its input', () => {
    const m = ['ramp'];
    toggleMust(m, 'elevator');
    expect(m).toEqual(['ramp']);
  });
});

describe('storage', () => {
  it('round-trips', () => {
    expect(parseMust(serialiseMust(['ramp', 'elevator']))).toEqual(['ramp', 'elevator']);
  });
  it('is null for text that is not a list', () => {
    for (const bad of ['', 'x', '{}', 'null', '3']) expect(parseMust(bad), bad).toBeNull();
  });
  it('drops anything that is not a known feature', () => {
    expect(parseMust(JSON.stringify(['elevator', 5, null, 'nope', 'ramp']))).toEqual(['ramp', 'elevator']);
  });
});

describe('counting', () => {
  it('is empty with no must-haves', () => {
    expect(mustLines(places, [], 'en')).toEqual([]);
    expect(mustFor(places[0] as Place, [])).toBeNull();
  });
  it('counts what is reported, not reported and unknown', () => {
    expect(mustFor(places[0] as Place, ['ramp', 'elevator', 'grab-bar'])).toEqual({ total: 3, met: 1, notMet: 1, unknown: 1 });
  });
  it('never counts a place with no claims as available', () => {
    expect(mustFor(places[2] as Place, ['ramp'])).toEqual({ total: 1, met: 0, notMet: 0, unknown: 1 });
  });
  it('does not count a claim without a source', () => {
    const p: Place = { id: 'x', name: 'X', claims: [{ termId: 'ramp', status: 'present' }] };
    expect(mustFor(p, ['ramp'])).toEqual({ total: 1, met: 0, notMet: 0, unknown: 1 });
  });
  it('orders places best first and keeps each index', () => {
    const lines = mustLines(places, ['ramp', 'elevator'], 'en');
    expect(lines.map((l) => l.name)).toEqual(['Café Nord', 'Pool', 'Library']);
    expect(lines.map((l) => l.index)).toEqual([1, 2, 0]);
  });
  it('has a line for every loaded place', () => {
    expect(mustLines(places, ['ramp'], 'en')).toHaveLength(3);
  });
});

describe('texts', () => {
  it('leaves out the parts that are zero, except the first', () => {
    expect(mustCountsText({ total: 2, met: 2, notMet: 0, unknown: 0 }, 'en')).toBe('2 of 2 reported as available.');
    expect(mustCountsText({ total: 3, met: 0, notMet: 1, unknown: 2 }, 'en')).toBe('0 of 3 reported as available, 1 reported as not available, 2 unknown.');
  });
  it('agrees in French', () => {
    expect(mustCountsText({ total: 1, met: 1, notMet: 0, unknown: 0 }, 'fr')).toBe('1 sur 1 signalée comme disponible.');
    expect(mustCountsText({ total: 4, met: 2, notMet: 1, unknown: 1 }, 'fr')).toBe('2 sur 4 signalées comme disponibles, 1 signalée comme non disponible, 1 inconnue.');
    expect(mustCountsText({ total: 3, met: 0, notMet: 0, unknown: 3 }, 'fr')).toBe('0 sur 3 signalée comme disponible, 3 inconnues.');
  });
  it('names the place, with a spaced colon in French', () => {
    const line = mustLines(places, ['ramp'], 'en')[0];
    expect(line).toBeDefined();
    if (line === undefined) return;
    expect(mustLineText(line, 'en')).toBe('Café Nord: 1 of 1 reported as available.');
    expect(mustLineText(line, 'fr')).toBe('Café Nord\u00a0: 1 sur 1 signalée comme disponible.');
  });
  it('never says a place is accessible or verified', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      for (const l of mustLines(places, ['ramp', 'elevator'], lang)) expect(mustLineText(l, lang)).not.toMatch(/accessible|verified|vérifi/i);
    }
  });
  it('names a feature in each language, and falls back to the id', () => {
    expect(featureName('ramp', 'en')).toBe('Ramp');
    expect(featureName('ramp', 'fr')).toBe('Rampe');
    expect(featureName('zzz', 'en')).toBe('zzz');
  });
});

describe('ids', () => {
  it('round-trips a feature id', () => {
    expect(parseMustId(mustId('ramp'))).toBe('ramp');
    expect(parseMustShowId('gl-mshow-4')).toBe(4);
  });
  it('rejects other ids and unknown features', () => {
    for (const id of ['', 'gl-must-', 'gl-must-nope', 'gl-must-constructor', 'gl-f-ramp']) expect(parseMustId(id), id).toBeNull();
    for (const id of ['', 'gl-mshow-', 'gl-tshow-1']) expect(parseMustShowId(id), id).toBeNull();
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    const lines = mustLines(places, ['ramp', 'elevator'], lang);
    for (const html of [
      renderMustPanel([], [], lang),
      renderMustPanel(['ramp'], mustLines(places, ['ramp'], lang), lang),
      renderMustPanel(['ramp', 'elevator'], lines, lang),
      renderMustCard(places[0] as Place, ['ramp'], lang),
    ]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'must')).toEqual([]);
    }
  });
  it('has a labelled check box for every feature, checked for the chosen ones', () => {
    const html = renderMustPanel(['ramp'], mustLines(places, ['ramp'], 'en'), 'en');
    expect(html).toContain('<input type="checkbox" id="gl-must-ramp" checked> <label for="gl-must-ramp">Ramp</label>');
    expect(html).toContain('<input type="checkbox" id="gl-must-elevator"> <label for="gl-must-elevator">Elevator</label>');
    expect(html).toContain('<legend>Features you cannot do without</legend>');
  });
  it('asks for a choice before it lists places', () => {
    const html = renderMustPanel([], [], 'en');
    expect(html).toContain(MUST_UI.en.prompt);
    expect(html).not.toContain('gl-mshow-');
  });
  it('lists the places in order with a Show button for each', () => {
    const html = renderMustPanel(['ramp'], mustLines(places, ['ramp'], 'en'), 'en');
    expect(html).toContain('3 places, best match first.');
    expect(html).toContain('<ol><li>Café Nord: 1 of 1 reported as available.');
    expect(html).toContain('id="gl-mshow-1" aria-label="Show Café Nord in the list"');
  });
  it('has a card line only with must-haves', () => {
    expect(renderMustCard(places[0] as Place, [], 'en')).toBe('');
    expect(renderMustCard(places[0] as Place, ['ramp', 'elevator'], 'en')).toContain('Your must-haves: 1 of 2 reported as available, 1 reported as not available.');
  });
  it('escapes names', () => {
    const html = renderMustPanel(['ramp'], [{ placeId: 'x', name: '<b>x</b>', index: 0, total: 1, met: 0, notMet: 0, unknown: 1 }], 'en');
    expect(html).not.toContain('<b>x');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = MUST_UI[lang];
    const texts = [
      ui.heading, ui.legend, ui.intro, ui.prompt, ui.card('1 sur 2 signalée comme disponible.'), ui.count(1), ui.count(4),
      ui.show, ui.showLabel('Library'), ui.on('Ramp'), ui.off('Ramp'),
    ];
    for (const t of texts) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      expect(readabilityIssues(t, lang), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});
