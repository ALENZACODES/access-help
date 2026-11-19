import { describe, expect, it } from 'vitest';
import {
  DIFF_KINDS,
  DIFF_UI,
  MAX_DIFFS_SHOWN,
  auditHtml,
  diffCounts,
  diffRecords,
  diffRowText,
  diffSummary,
  diffToText,
  frenchIssues,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  readabilityIssues,
  recordsFromCsv,
  recordsToCsv,
  renderDiff,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };

const before: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit)] },
  { id: 'cafe', name: 'Café <b>', claims: [c('ramp', 'present')] },
  { id: 'pool', name: 'Pool', claims: [c('ramp', 'absent', transit)] },
  { id: 'hall', name: 'Hall', claims: [c('ramp', 'present', city), c('grab-bar', 'present', city)] },
];
const after: Place[] = [
  { id: 'hall', name: 'Town Hall', claims: [c('grab-bar', 'present', city), c('ramp', 'absent', { ...city, date: '2026-11-01' })] },
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit), c('automatic-door', 'present', city)] },
  { id: 'cafe', name: 'Café <b>', claims: [] },
  { id: 'depot', name: 'Depot', claims: [c('ramp', 'present', transit)] },
];
const kinds = (a: readonly Place[], b: readonly Place[]): string[] => diffRecords(a, b, 'en').map((r) => `${r.kind}:${r.placeId}`);

describe('diffRecords', () => {
  it('finds nothing between a set and itself, or a copy of it', () => {
    expect(diffRecords(before, before, 'en')).toEqual([]);
    expect(diffRecords(before, JSON.parse(JSON.stringify(before)) as Place[], 'fr')).toEqual([]);
    expect(diffRecords([], [], 'en')).toEqual([]);
  });
  it('ignores the order of places and of records', () => {
    const shuffled: Place[] = [...before].reverse().map((p) => ({ ...p, claims: [...p.claims].reverse() }));
    expect(diffRecords(before, shuffled, 'en')).toEqual([]);
  });
  it('lists removed places first, then each place of the new set in order', () => {
    expect(kinds(before, after)).toEqual([
      'place-removed:pool',
      'record-removed:pool',
      'place-renamed:hall',
      'record-changed:hall',
      'record-added:lib',
      'record-removed:cafe',
      'place-added:depot',
      'record-added:depot',
    ]);
  });
  it('gives the old and new name of a renamed place', () => {
    const row = diffRecords(before, after, 'en').find((r) => r.kind === 'place-renamed');
    expect(row).toMatchObject({ name: 'Town Hall', oldName: 'Hall' });
  });
  it('treats a new version of a record from the same source as a change, with before and after', () => {
    const row = diffRecords(before, after, 'en').find((r) => r.kind === 'record-changed');
    expect(row?.before).toMatchObject({ termId: 'ramp', status: 'present', date: '2026-10-01' });
    expect(row?.after).toMatchObject({ termId: 'ramp', status: 'absent', date: '2026-11-01' });
  });
  it('treats a record from another source as added, never as a change', () => {
    const a: Place[] = [{ id: 'x', name: 'X', claims: [c('ramp', 'present', city)] }];
    const b: Place[] = [{ id: 'x', name: 'X', claims: [c('ramp', 'present', transit)] }];
    expect(kinds(a, b)).toEqual(['record-removed:x', 'record-added:x']);
  });
  it('sees a change in the licence, the tier or the link of a record', () => {
    const base: Place[] = [{ id: 'x', name: 'X', claims: [c('ramp', 'present', city)] }];
    for (const changed of [{ ...city, licence: 'CC-BY-4.0' }, { ...city, tier: 'tier-0' }, { ...city, url: 'https://example.org/a' }] as Provenance[]) {
      expect(kinds(base, [{ id: 'x', name: 'X', claims: [c('ramp', 'present', changed)] }])).toEqual(['record-changed:x']);
    }
  });
  it('sees a record that gains a source as one removed and one added', () => {
    const a: Place[] = [{ id: 'x', name: 'X', claims: [c('ramp', 'present')] }];
    const b: Place[] = [{ id: 'x', name: 'X', claims: [c('ramp', 'present', city)] }];
    expect(kinds(a, b)).toEqual(['record-removed:x', 'record-added:x']);
  });
  it('pairs off the same record held twice, and counts the extra one', () => {
    const a: Place[] = [{ id: 'x', name: 'X', claims: [c('ramp', 'present', city), c('ramp', 'present', city)] }];
    const b: Place[] = [{ id: 'x', name: 'X', claims: [c('ramp', 'present', city)] }];
    expect(kinds(a, b)).toEqual(['record-removed:x']);
    expect(kinds(b, a)).toEqual(['record-added:x']);
  });
  it('leaves out records about features the glossary does not know', () => {
    const a: Place[] = [{ id: 'x', name: 'X', claims: [c('not-a-term', 'present', city)] }];
    expect(diffRecords(a, [{ id: 'x', name: 'X', claims: [] }], 'en')).toEqual([]);
  });
  it('is the mirror image when the two sets are swapped', () => {
    const forward = diffCounts(diffRecords(before, after, 'en'));
    const back = diffCounts(diffRecords(after, before, 'en'));
    expect(back['record-added']).toBe(forward['record-removed']);
    expect(back['record-removed']).toBe(forward['record-added']);
    expect(back['place-added']).toBe(forward['place-removed']);
    expect(back['record-changed']).toBe(forward['record-changed']);
    expect(back['place-renamed']).toBe(forward['place-renamed']);
  });
  it('finds nothing after a table is saved and read back', () => {
    const back = recordsFromCsv(recordsToCsv(after)).places;
    expect(diffRecords(after, back, 'en')).toEqual([]);
  });
  it('does not change either set', () => {
    const a = JSON.stringify(before);
    const b = JSON.stringify(after);
    diffRecords(before, after, 'fr');
    expect(JSON.stringify(before)).toBe(a);
    expect(JSON.stringify(after)).toBe(b);
  });
});

describe('diffCounts and diffSummary', () => {
  const counts = diffCounts(diffRecords(before, after, 'en'));
  it('counts each kind', () => {
    expect(counts).toEqual({ 'place-added': 1, 'place-removed': 1, 'place-renamed': 1, 'record-added': 2, 'record-removed': 2, 'record-changed': 1 });
    expect(Object.values(diffCounts([])).every((n) => n === 0)).toBe(true);
  });
  it('has a sentence for each kind found, in a fixed order', () => {
    expect(diffSummary(counts, 'en')).toEqual(['1 place added.', '1 place removed.', '1 place renamed.', '2 records added.', '2 records removed.', '1 record changed.']);
    expect(diffSummary(diffCounts([]), 'en')).toEqual([]);
    expect(diffSummary({ ...diffCounts([]), 'record-changed': 3 }, 'fr')).toEqual(['3 fiches modifiées.']);
  });
});

describe('diffRowText', () => {
  const rows = diffRecords(before, after, 'en');
  const text = (kind: string, lang: Lang = 'en'): string => {
    const row = diffRecords(before, after, lang).find((r) => r.kind === kind);
    return row === undefined ? '' : diffRowText(row, lang);
  };
  it('names places that were added, removed or renamed', () => {
    expect(text('place-added')).toBe('Place added: Depot.');
    expect(text('place-removed')).toBe('Place removed: Pool.');
    expect(text('place-renamed')).toBe('Place renamed: Hall is now Town Hall.');
  });
  it('gives an added or removed record with its source, licence, date and tier', () => {
    expect(text('record-added')).toBe('Record added for Library. Automatic door: reported as available. Source: City open data. Licence: CC0-1.0. Dated: 2026-10-01. Tier 1.');
    expect(diffRowText(rows[1] as (typeof rows)[number], 'en')).toBe('Record removed from Pool. Ramp: reported as not available. Source: Transit agency. Licence: OGL-Canada-2.0. Dated: 2025-03-04. Tier unknown.');
  });
  it('gives a changed record before and now', () => {
    expect(text('record-changed')).toBe(
      'Record changed for Town Hall. Before: Ramp: reported as available. Source: City open data. Licence: CC0-1.0. Dated: 2026-10-01. Tier 1. Now: Ramp: reported as not available. Source: City open data. Licence: CC0-1.0. Dated: 2026-11-01. Tier 1.',
    );
  });
  it('shows a record that cannot be reported as unknown, never as available', () => {
    const row = rows.find((r) => r.kind === 'record-removed' && r.placeId === 'cafe');
    expect(row && diffRowText(row, 'en')).toBe('Record removed from Café <b>. Ramp: unknown. Source: Unknown. Licence: Unknown. Dated: Unknown. Tier unknown.');
  });
  it('is French with French spacing', () => {
    for (const kind of DIFF_KINDS) {
      const t = text(kind, 'fr');
      expect(t, kind).not.toBe('');
      expect(frenchIssues(t), t).toEqual([]);
    }
    expect(text('place-renamed', 'fr')).toBe('Lieu renommé\u00a0: Hall s’appelle maintenant Town Hall.');
    expect(text('record-changed', 'fr')).toContain('Avant\u00a0: Rampe\u00a0: signalé comme disponible.');
  });
});

describe('diffToText', () => {
  it('gives the counts, then one line for each difference', () => {
    const text = diffToText(diffRecords(before, after, 'en'), 'en');
    expect(text.startsWith('1 place added.\n1 place removed.\n1 place renamed.\n2 records added.\n2 records removed.\n1 record changed.\n\n- Place removed: Pool.\n')).toBe(true);
    expect(text.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(8);
    expect(text.endsWith('\n')).toBe(true);
  });
  it('says so when nothing differs', () => {
    expect(diffToText([], 'en')).toBe('Nothing differs. The two sets of records are the same.\n');
    expect(diffToText([], 'fr')).toBe('Rien ne diffère. Les deux ensembles de fiches sont les mêmes.\n');
  });
});

describe('renderDiff', () => {
  it('says so when nothing differs', () => {
    expect(renderDiff([], 'en')).toBe('<p role="status">Nothing differs. The two sets of records are the same.</p>');
  });
  it('has the counts and an item for each difference', () => {
    const html = renderDiff(diffRecords(before, after, 'en'), 'en');
    expect(html).toContain('<p role="status">1 place added. 1 place removed. 1 place renamed. 2 records added. 2 records removed. 1 record changed.</p>');
    expect(html).toContain('<li data-diff="place-removed">Place removed: Pool.</li>');
    expect(html.match(/<li data-diff=/g)).toHaveLength(8);
  });
  it('escapes names', () => {
    const html = renderDiff(diffRecords(before, after, 'en'), 'en');
    expect(html).toContain('Record removed from Café &lt;b&gt;.');
    expect(html).not.toContain('<b>');
  });
  it('shows at most the limit and counts the rest', () => {
    const rows = diffRecords(before, after, 'en');
    const html = renderDiff(rows, 'en', 3);
    expect(html.match(/<li data-diff=/g)).toHaveLength(3);
    expect(html).toContain('And 5 more differences.');
    expect(html).toContain('2 records removed.');
    const many: Place[] = Array.from({ length: MAX_DIFFS_SHOWN + 1 }, (_, i) => ({ id: `p${i}`, name: `Place ${i}`, claims: [] }));
    expect(renderDiff(diffRecords([], many, 'fr'), 'fr')).toContain('Et 1 autre différence.');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(auditHtml(`<div lang="${lang}">${renderDiff(diffRecords(before, after, lang), lang)}</div>`, 'diff')).toEqual([]);
    }
  });
});

describe('DIFF_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = DIFF_UI[lang];
    return [
      ui.same, ...DIFF_KINDS.flatMap((k) => [ui.counts[k](1), ui.counts[k](4)]), ui.placeAdded('Hall'), ui.placeRemoved('Hall'), ui.placeRenamed('Hall', 'Town Hall'),
      ui.recordAdded('Hall', 'Ramp.'), ui.recordRemoved('Hall', 'Ramp.'), ui.recordChanged('Hall'), ui.was('Ramp.'), ui.now('Ramp.'), ui.more(1), ui.more(5),
    ];
  };
  it('has the same keys in both languages, and a count sentence for every kind', () => {
    expect(Object.keys(DIFF_UI.fr)).toEqual(Object.keys(DIFF_UI.en));
    expect(Object.keys(DIFF_UI.en.counts)).toEqual([...DIFF_KINDS]);
    expect(Object.keys(DIFF_UI.fr.counts)).toEqual([...DIFF_KINDS]);
  });
  it('passes the copy rules in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of samples(lang)) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(plainLanguageIssues(text), text).toEqual([]);
        expect(readabilityIssues(text, lang), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
});
