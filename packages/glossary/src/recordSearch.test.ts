import { describe, expect, it } from 'vitest';
import {
  MAX_RECORD_MATCHES,
  MAX_RECORD_QUERY,
  RECSEARCH_INPUT_ID,
  RECSEARCH_UI,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  parseRecordShowId,
  placeRecords,
  plainLanguageIssues,
  readabilityIssues,
  recordHaystack,
  recordShowId,
  renderRecordMatches,
  renderRecordSearch,
  searchRecords,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city)] },
  { id: 'cafe', name: 'Café Nord <i>', claims: [c('elevator', 'absent', transit), c('ramp', 'present')] },
  { id: 'pool', name: 'Pool', claims: [] },
  { id: 'hall', name: 'Hall', claims: [c('elevator', 'present', city), c('ramp', 'absent', transit), c('not-a-term', 'present', city)] },
];
const found = (query: string, lang: Lang = 'en'): string[] => searchRecords(places, query, lang).matches.map((m) => `${m.placeId}:${m.row.termId}`);

describe('searchRecords', () => {
  it('finds nothing for an empty search', () => {
    expect(searchRecords(places, '', 'en')).toEqual({ matches: [], total: 0 });
    expect(searchRecords(places, '  , . ', 'en')).toEqual({ matches: [], total: 0 });
  });
  it('finds records by place name, ignoring case and accents', () => {
    expect(found('cafe')).toEqual(['cafe:ramp', 'cafe:elevator']);
    expect(found('LIBRARY')).toEqual(['lib:ramp']);
  });
  it('finds records by feature, source, licence and date', () => {
    expect(found('elevator')).toEqual(['cafe:elevator', 'hall:elevator']);
    expect(found('transit')).toEqual(['cafe:elevator', 'hall:ramp']);
    expect(found('OGL-Canada-2.0')).toEqual(['cafe:elevator', 'hall:ramp']);
    expect(found('2026-10-01')).toEqual(['lib:ramp', 'hall:elevator']);
  });
  it('needs every word', () => {
    expect(found('hall transit')).toEqual(['hall:ramp']);
    expect(found('hall transit elevator')).toEqual([]);
  });
  it('finds records by what is reported, and unusable records as unknown', () => {
    expect(found('not available')).toEqual(['cafe:elevator', 'hall:ramp']);
    expect(found('unknown ramp cafe')).toEqual(['cafe:ramp']);
  });
  it('searches the feature names of the language asked for', () => {
    expect(found('ascenseur', 'fr')).toEqual(['cafe:elevator', 'hall:elevator']);
    expect(found('ascenseur', 'en')).toEqual([]);
  });
  it('skips records about features the glossary does not know', () => {
    expect(found('hall')).toEqual(['hall:ramp', 'hall:elevator']);
  });
  it('gives the index of each place', () => {
    expect(searchRecords(places, 'elevator', 'en').matches.map((m) => m.index)).toEqual([1, 3]);
  });
  it('keeps the first matches and counts them all', () => {
    const many: Place[] = Array.from({ length: MAX_RECORD_MATCHES + 7 }, (_, i) => ({ id: `p${i}`, name: `Place ${i}`, claims: [c('ramp', 'present', city)] }));
    const result = searchRecords(many, 'ramp', 'en');
    expect(result.matches).toHaveLength(MAX_RECORD_MATCHES);
    expect(result.total).toBe(MAX_RECORD_MATCHES + 7);
    expect(searchRecords(many, 'ramp', 'en', 2).matches.map((m) => m.placeId)).toEqual(['p0', 'p1']);
    expect(searchRecords(many, 'ramp', 'en', -3).matches).toEqual([]);
  });
  it('reads only the start of a very long search', () => {
    const long = `${'x '.repeat(MAX_RECORD_QUERY)}library`;
    expect(searchRecords(places, long, 'en').total).toBe(0);
  });
  it('does not change the places', () => {
    const before = JSON.stringify(places);
    searchRecords(places, 'ramp', 'fr');
    expect(JSON.stringify(places)).toBe(before);
  });
});

describe('recordHaystack', () => {
  it('holds the name, feature, report, source, licence, date and tier, folded', () => {
    const row = placeRecords(places[0] as Place, 'en')[0];
    expect(row && recordHaystack('Café', row, 'en')).toBe('cafe ramp reported as available city open data cc0-1.0 2026-10-01 tier 1');
  });
});

describe('show ids', () => {
  it('round-trips and rejects other ids', () => {
    expect(parseRecordShowId(recordShowId(4))).toBe(4);
    for (const id of ['gl-rshow-', 'gl-rshow-a', 'gl-dshow-1', '']) expect(parseRecordShowId(id)).toBeNull();
  });
});

describe('renderRecordMatches', () => {
  it('asks for a word when nothing is typed', () => {
    expect(renderRecordMatches(searchRecords(places, '', 'en'), '', 'en')).toBe('<p class="gl-note">Type a word to search the records.</p>');
  });
  it('says so when nothing matches', () => {
    expect(renderRecordMatches(searchRecords(places, 'zzz', 'fr'), 'zzz', 'fr')).toBe('<p class="gl-note" role="status">Aucune fiche ne contient ces mots.</p>');
  });
  it('shows the count, each record with its source, licence, date and tier, and one Show button for each place', () => {
    const html = renderRecordMatches(searchRecords(places, 'hall', 'en'), 'hall', 'en');
    expect(html).toContain('<p class="gl-note" role="status">2 records have those words.</p>');
    expect(html).toContain('<li data-status="absent">Hall. Ramp: reported as not available. Source: Transit agency. Licence: OGL-Canada-2.0. Dated: 2025-03-04. Tier unknown. <button type="button" class="gl-btn" id="gl-rshow-3" aria-label="Show Hall in the list">Show</button></li>');
    expect(html.match(/id="gl-rshow-3"/g)).toHaveLength(1);
  });
  it('shows a record that cannot be used as unknown, with what is missing as Unknown', () => {
    const html = renderRecordMatches(searchRecords(places, 'cafe ramp', 'en'), 'cafe ramp', 'en');
    expect(html).toContain('<li data-status="unknown">Café Nord &lt;i&gt;. Ramp: unknown. Source: Unknown. Licence: Unknown. Dated: Unknown. Tier unknown.');
    expect(html).not.toContain('<i>');
  });
  it('says how many more there are', () => {
    const html = renderRecordMatches(searchRecords(places, 'ramp', 'en', 1), 'ramp', 'en');
    expect(html).toContain('3 records have those words.');
    expect(html).toContain('And 2 more. Type another word to narrow the search.');
    expect(html.match(/<li /g)).toHaveLength(1);
  });
});

describe('renderRecordSearch', () => {
  it('has a labelled box with a hint and the matches region', () => {
    const html = renderRecordSearch('a "b"', '<p>x</p>', 'en');
    expect(html).toContain(`<label for="${RECSEARCH_INPUT_ID}">Words to find in the records</label>`);
    expect(html).toContain('value="a &quot;b&quot;"');
    expect(html).toContain('aria-describedby="gl-rsq-hint"');
    expect(html).toContain('<div data-gl-rsr><p>x</p></div>');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const body = renderRecordSearch('ramp', renderRecordMatches(searchRecords(places, 'ramp', lang), 'ramp', lang), lang);
      const html = `<div lang="${lang}"><details><summary>${RECSEARCH_UI[lang].heading}</summary>${body}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('RECSEARCH_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = RECSEARCH_UI[lang];
    return [ui.heading, ui.label, ui.hint, ui.prompt, ui.none, ui.count(1), ui.count(5), ui.more(1), ui.more(8), ui.line('Hall', 'Ramp.'), ui.show, ui.showLabel('Hall')];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(RECSEARCH_UI.fr)).toEqual(Object.keys(RECSEARCH_UI.en));
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
