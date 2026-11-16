import { describe, expect, it } from 'vitest';
import {
  PLAIN_TERMS as TERMS,
  auditHtml,
  comparePlaces,
  comparisonCaption,
  comparisonSummary,
  frenchIssues,
  lintCopy,
  renderComparison,
  type FeatureClaim,
  type Place,
} from './index';

const prov = { source: 'Survey', licence: 'CC-BY-4.0', date: '2026-10-01' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const no = (termId: string): FeatureClaim => ({ termId, status: 'absent', provenance: prov });
const a: Place = { id: 'a', name: 'Library', claims: [yes('ramp'), yes('elevator')] };
const b: Place = { id: 'b', name: 'Café <Nord>', claims: [yes('ramp'), no('elevator')] };

describe('comparePlaces', () => {
  it('has a row per chosen feature and flags differences', () => {
    const rows = comparePlaces(a, b, ['ramp', 'elevator'], 'en');
    expect(rows.map((r) => [r.termId, r.term, r.differs])).toEqual([
      ['ramp', 'Ramp', false],
      ['elevator', 'Elevator', true],
    ]);
  });

  it('compares every glossary feature when none are chosen', () => {
    expect(comparePlaces(a, b, [], 'fr')).toHaveLength(TERMS.length);
    expect(comparePlaces(a, b, [], 'fr')[0]?.term).toBe('Entrée de plain-pied');
  });

  it('treats missing features as unknown, and unknown vs unknown as no difference', () => {
    const rows = comparePlaces(a, b, ['grab-bar'], 'en');
    expect(rows[0]?.a.status).toBe('unknown');
    expect(rows[0]?.differs).toBe(false);
  });

  it('treats present vs unknown as a difference', () => {
    expect(comparePlaces(a, { ...b, claims: [] }, ['ramp'], 'en')[0]?.differs).toBe(true);
  });

  it('removes duplicate ids', () => {
    expect(comparePlaces(a, b, ['ramp', 'ramp'], 'en')).toHaveLength(1);
  });
});

describe('comparisonSummary / comparisonCaption', () => {
  it('counts differences with the right grammar', () => {
    const one = comparePlaces(a, b, ['ramp', 'elevator'], 'en');
    expect(comparisonSummary(one, 'en')).toBe('1 of 2 features differs.');
    expect(comparisonSummary(one, 'fr')).toBe('1 caractéristique sur 2 diffère.');
    const many = comparePlaces(a, { ...b, claims: [no('ramp'), no('elevator')] }, ['ramp', 'elevator'], 'en');
    expect(comparisonSummary(many, 'en')).toBe('2 of 2 features differ.');
    expect(comparisonSummary(many, 'fr')).toBe('2 caractéristiques sur 2 diffèrent.');
    expect(comparisonSummary([], 'en')).toBe('0 of 0 features differ.');
  });

  it('names both places', () => {
    expect(comparisonCaption(a, b, 'en')).toBe('Comparison of Library and Café <Nord>');
    expect(comparisonCaption(a, b, 'fr')).toBe('Comparaison de Library et de Café <Nord>');
  });
});

describe('renderComparison', () => {
  const html = `<div lang="en">${renderComparison(a, b, ['ramp', 'elevator'], 'en')}</div>`;

  it('is a labelled, scrollable region with a captioned table', () => {
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('<caption>');
    expect(html).toContain('<th scope="col">Feature</th>');
    expect(html).toContain('<th scope="row">Ramp</th>');
  });

  it('shows a short status in each cell and marks different rows', () => {
    expect(html).toContain('<td data-outcome="met">Reported as available');
    expect(html).toContain('<td data-outcome="not-met">Reported as not available');
    expect((html.match(/>Different</g) ?? []).length).toBe(1);
  });

  it('shows the source for sourced cells', () => {
    expect(html).toContain('Source: Survey. Licence: CC-BY-4.0. Date: 2026-10-01.');
  });

  it('shows unknown as unknown', () => {
    const u = renderComparison(a, b, ['grab-bar'], 'en');
    expect(u).toContain('<td data-outcome="unknown">Unknown</td>');
  });

  it('escapes place names', () => {
    expect(html).not.toContain('<Nord>');
    expect(html).toContain('Café &lt;Nord&gt;');
  });

  it('renders French with correct typography', () => {
    const fr = renderComparison(a, b, [], 'fr');
    expect(fr).toContain('Signalé comme disponible');
    expect(fr).toContain('Inconnu');
    expect(frenchIssues(fr.replace(/<[^>]+>/g, ' ').replace(/ +/g, ' '))).not.toContain('straight-apostrophe');
  });

  it('passes the markup audit in both languages', () => {
    for (const l of ['en', 'fr'] as const) {
      expect(auditHtml(`<div lang="${l}">${renderComparison(a, b, [], l)}</div>`)).toEqual([]);
    }
  });

  it('passes the wording rules', () => {
    expect(lintCopy(renderComparison(a, b, [], 'en').replace(/<[^>]+>/g, ' '))).toEqual([]);
  });
});
