import { describe, expect, it } from 'vitest';
import {
  COVERAGE_UI,
  TERMS,
  auditHtml,
  coverageText,
  datasetCoverage,
  frenchIssues,
  lintCopy,
  renderCoverage,
  renderFinderShell,
  EMPTY_STATE,
  type FeatureClaim,
  type Place,
} from './index';

const prov = { source: 'Survey', licence: 'CC0-1.0', date: '2026-10-01' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const no = (termId: string): FeatureClaim => ({ termId, status: 'absent', provenance: prov });
const places: Place[] = [
  { id: 'a', name: 'A', claims: [yes('ramp'), no('elevator')] },
  { id: 'b', name: 'B', claims: [yes('ramp')] },
  { id: 'c', name: 'C', claims: [{ termId: 'ramp', status: 'present' }] },
];

describe('datasetCoverage', () => {
  it('has one row per glossary feature with totals', () => {
    const rows = datasetCoverage(places, 'en');
    expect(rows).toHaveLength(TERMS.length);
    expect(rows.every((r) => r.present + r.absent + r.unknown === r.total && r.total === 3)).toBe(true);
  });

  it('counts sourced claims only; unsourced ones are unknown', () => {
    const ramp = datasetCoverage(places, 'en').find((r) => r.termId === 'ramp');
    expect(ramp).toMatchObject({ term: 'Ramp', present: 2, absent: 0, unknown: 1 });
    const lift = datasetCoverage(places, 'en').find((r) => r.termId === 'elevator');
    expect(lift).toMatchObject({ present: 0, absent: 1, unknown: 2 });
  });

  it('is zeros for no places and names rows in French', () => {
    expect(datasetCoverage([], 'fr').every((r) => r.total === 0 && r.unknown === 0)).toBe(true);
    expect(datasetCoverage(places, 'fr')[0]?.term).toBe('Entrée de plain-pied');
  });
});

describe('coverageText', () => {
  const c = { termId: 'ramp', term: 'Ramp', present: 2, absent: 0, unknown: 1, total: 3 };
  it('reads as one line in each language', () => {
    expect(coverageText(c, 'en')).toBe('Ramp: 2 reported as available, 0 reported as not available, 1 unknown.');
    expect(coverageText({ ...c, term: 'Rampe' }, 'fr')).toBe('Rampe : 2 signalé(s) comme disponible(s), 0 signalé(s) comme non disponible(s), 1 inconnu(s).');
    expect(frenchIssues(coverageText({ ...c, term: 'Rampe' }, 'fr'))).toEqual([]);
  });
});

describe('renderCoverage', () => {
  it('is empty with no places', () => {
    expect(renderCoverage([], 'en')).toBe('');
  });

  it('is a collapsed section with a labelled table', () => {
    const html = renderCoverage(places, 'en');
    expect(html.startsWith('<details class="gl-coverage"><summary>Data coverage</summary>')).toBe(true);
    expect(html).toContain('<th scope="col">Reported as not available</th>');
    expect(html).toContain('<tr><th scope="row">Ramp</th><td>2</td><td>0</td><td>1</td></tr>');
  });

  it('passes the markup audit and wording rules in both languages', () => {
    for (const l of ['en', 'fr'] as const) {
      const html = `<div lang="${l}">${renderCoverage(places, l)}</div>`;
      expect(auditHtml(html)).toEqual([]);
      expect(lintCopy(html.replace(/<[^>]+>/g, ' '))).toEqual([]);
    }
  });

  it('is part of the finder, and absent when there is no data', () => {
    expect(renderFinderShell({ lang: 'en', state: EMPTY_STATE, places, today: '2026-11-15' })).toContain('class="gl-coverage"');
    expect(renderFinderShell({ lang: 'en', state: EMPTY_STATE, places: [], today: '2026-11-15' })).not.toContain('gl-coverage');
  });

  it('keeps French strings typographically correct', () => {
    for (const s of Object.values(COVERAGE_UI.fr)) expect(frenchIssues(s), s).toEqual([]);
  });
});
