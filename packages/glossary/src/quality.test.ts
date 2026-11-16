import { describe, expect, it } from 'vitest';
import {
  MAX_REVIEW_ROWS,
  QUALITY_UI,
  auditHtml,
  frenchIssues,
  lintCopy,
  renderQuality,
  reviewPlace,
  reviewPlaces,
  reviewTotals,
  type FeatureClaim,
  type Place,
} from './index';

const today = '2026-11-15';
const claim = (termId: string, status: FeatureClaim['status'], date = '2026-06-01', source = 'City open data'): FeatureClaim => ({
  termId,
  status,
  provenance: { source, licence: 'CC0-1.0', date },
});
const place = (id: string, claims: FeatureClaim[] = []): Place => ({ id, name: id.toUpperCase(), claims });

describe('reviewPlace', () => {
  it('has no flags for recent, sourced, agreeing claims', () => {
    expect(reviewPlace(place('a', [claim('ramp', 'present'), claim('elevator', 'absent')]), today).total).toBe(0);
  });

  it('does not flag a place for having nothing known', () => {
    expect(reviewPlace(place('a'), today).total).toBe(0);
  });

  it('flags disagreeing sources once per feature', () => {
    const r = reviewPlace(place('a', [claim('ramp', 'present'), claim('ramp', 'absent', '2026-06-01', 'Other')]), today);
    expect(r).toMatchObject({ conflicts: 1, unsourced: 0, old: 0, total: 1 });
  });

  it('flags present or absent claims with no valid source', () => {
    const none: FeatureClaim = { termId: 'ramp', status: 'present' };
    const badLicence: FeatureClaim = { termId: 'elevator', status: 'absent', provenance: { source: 'x', licence: 'All rights reserved', date: '2026-01-01' } };
    const badDate: FeatureClaim = { termId: 'grab-bar', status: 'present', provenance: { source: 'x', licence: 'CC0-1.0', date: '2026-02-30' } };
    expect(reviewPlace(place('a', [none, badLicence, badDate]), today).unsourced).toBe(3);
  });

  it('does not flag unknown claims as unsourced', () => {
    expect(reviewPlace(place('a', [{ termId: 'ramp', status: 'unknown' }]), today).unsourced).toBe(0);
  });

  it('flags information more than two years old, but not merely getting old', () => {
    expect(reviewPlace(place('a', [claim('ramp', 'present', '2023-01-01')]), today).old).toBe(1);
    expect(reviewPlace(place('a', [claim('ramp', 'present', '2025-03-01')]), today).old).toBe(0);
  });
});

describe('reviewPlaces and reviewTotals', () => {
  const places = [
    place('clean', [claim('ramp', 'present')]),
    place('old', [claim('ramp', 'present', '2022-01-01')]),
    place('worse', [claim('ramp', 'present', '2022-01-01'), { termId: 'elevator', status: 'present' }]),
    place('also-old', [claim('ramp', 'present', '2022-01-01')]),
  ];

  it('lists only flagged places, most flags first, then by name', () => {
    expect(reviewPlaces(places, today).map((r) => r.id)).toEqual(['worse', 'also-old', 'old']);
  });

  it('adds the counts up', () => {
    expect(reviewTotals(places, today)).toEqual({ places: 4, flagged: 3, conflicts: 0, unsourced: 1, old: 3 });
  });

  it('is all zero with no places', () => {
    expect(reviewTotals([], today)).toEqual({ places: 0, flagged: 0, conflicts: 0, unsourced: 0, old: 0 });
  });
});

describe('renderQuality', () => {
  it('is empty with no places', () => {
    expect(renderQuality([], 'en', today)).toBe('');
  });

  it('says plainly when nothing was flagged, without claiming the data is right', () => {
    const html = renderQuality([place('a', [claim('ramp', 'present')])], 'en', today);
    expect(html).toContain('These checks flagged nothing.');
    expect(html).not.toMatch(/correct|accurate|up to date/i);
    expect(html).not.toContain('<table');
  });

  it('shows a table of flagged places and says it is about the data', () => {
    const html = renderQuality([place('old', [claim('ramp', 'present', '2022-01-01')])], 'en', today);
    expect(html).toContain('1 of 1 places have a source problem. These notes are about the data, not the places.');
    expect(html).toContain('<th scope="row">OLD</th><td>0</td><td>0</td><td>1</td>');
  });

  it('limits the rows and says how many more', () => {
    const many = Array.from({ length: MAX_REVIEW_ROWS + 3 }, (_, i) => place(`p${String(i).padStart(2, '0')}`, [claim('ramp', 'present', '2020-01-01')]));
    const html = renderQuality(many, 'en', today);
    expect(html.match(/<th scope="row">/g)).toHaveLength(MAX_REVIEW_ROWS);
    expect(html).toContain('And 3 more places.');
  });

  it('escapes place names', () => {
    const p: Place = { id: 'x', name: '<script>1</script>', claims: [claim('ramp', 'present', '2020-01-01')] };
    expect(renderQuality([p], 'en', today)).not.toContain('<script>');
  });

  it('passes the HTML audit and wording checks in both languages', () => {
    const data = [place('old', [claim('ramp', 'present', '2022-01-01')]), place('fine')];
    for (const lang of ['en', 'fr'] as const) {
      for (const list of [data, [place('fine')]]) {
        const html = renderQuality(list, lang, today);
        expect(auditHtml(`<main lang="${lang === 'en' ? 'en-CA' : 'fr-CA'}">${html}</main>`, `quality.${lang}`).filter((f) => f.severity === 'error')).toEqual([]);
        expect(lintCopy(html.replace(/<[^>]+>/g, ' '))).toEqual([]);
      }
    }
  });

  it('keeps French spacing', () => {
    expect(frenchIssues(QUALITY_UI.fr.lead(2, 9))).toEqual([]);
    expect(frenchIssues(QUALITY_UI.fr.none)).toEqual([]);
  });
});
