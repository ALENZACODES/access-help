import { describe, expect, it } from 'vitest';
import {
  MAX_RECORD_ROWS,
  RECORDSCSV_IDS,
  RECORDSCSV_UI,
  RECORD_COLUMNS,
  auditHtml,
  recordCell,
  recordUncell,
  effectiveStatus,
  effectiveTier,
  frenchIssues,
  importMessage,
  lintClaims,
  lintCopy,
  parseCsv,
  plainLanguageIssues,
  readabilityIssues,
  recordsFilename,
  recordsFromCsv,
  recordsToCsv,
  renderRecordsCsv,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit, "north" line', licence: 'OGL-Canada-2.0', date: '2026-05-06', url: 'https://example.org/data' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit), c('grab-bar', 'unknown')] },
  { id: 'cafe', name: 'Café Nord, 2nd floor', claims: [] },
  { id: '=1+1', name: '-Pool', claims: [c('ramp', 'present')] },
];
const HEAD = RECORD_COLUMNS.join(',');

describe('cells', () => {
  it('leaves plain text alone', () => {
    expect(recordCell('Library')).toBe('Library');
    expect(recordCell('')).toBe('');
  });
  it('quotes commas, quotes, new lines and outer spaces', () => {
    expect(recordCell('a,b')).toBe('"a,b"');
    expect(recordCell('say "hi"')).toBe('"say ""hi"""');
    expect(recordCell('a\nb')).toBe('"a\nb"');
    expect(recordCell(' a')).toBe('" a"');
  });
  it('stops a spreadsheet from running a cell as a formula', () => {
    for (const bad of ['=1+1', '+1', '-1', '@x', '\tx']) expect(recordCell(bad).replace(/^"/, '').startsWith("'"), bad).toBe(true);
  });
  it('can always be undone', () => {
    for (const v of ['Library', '=1+1', "'=1+1", "''=1+1", "'quoted", '-5', '@home', "it's", "'", '']) expect(recordUncell(recordCell(v).replace(/^"|"$/g, '')), v).toBe(v);
  });
});

describe('recordsToCsv', () => {
  const csv = recordsToCsv(places);
  it('starts with the column names and uses CRLF', () => {
    expect(csv.startsWith(`${HEAD}\r\n`)).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
  });
  it('has a row for each record, and one for a place with none', () => {
    expect(parseCsv(csv).rows).toHaveLength(1 + 3 + 1 + 1);
  });
  it('puts source, licence, date and tier on each row', () => {
    expect(csv).toContain('lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,\r\n');
    expect(csv).toContain('lib,Library,elevator,absent,"Transit, ""north"" line",OGL-Canada-2.0,2026-05-06,,https://example.org/data\r\n');
  });
  it('writes nothing for what a record does not have', () => {
    expect(csv).toContain('lib,Library,grab-bar,unknown,,,,,\r\n');
    expect(csv).toContain('cafe,"Café Nord, 2nd floor",,,,,,,\r\n');
  });
  it('writes the tier in its canonical form, and keeps a tier it does not know', () => {
    const odd = recordsToCsv([{ id: 'x', name: 'X', claims: [c('ramp', 'present', { ...city, tier: 'Tier 1' }), c('elevator', 'present', { ...city, tier: 'gold' })] }]);
    expect(odd).toContain(',tier-1,');
    expect(odd).toContain(',gold,');
  });
  it('is only the header with no places', () => {
    expect(recordsToCsv([])).toBe(`${HEAD}\r\n`);
  });
  it('names the file by language', () => {
    expect(recordsFilename('en')).toBe('records-en.csv');
    expect(recordsFilename('fr')).toBe('records-fr.csv');
  });
});

describe('recordsFromCsv', () => {
  it('reads back exactly what was written', () => {
    const back = recordsFromCsv(recordsToCsv(places));
    expect(back.problems).toEqual([]);
    expect(back.rejected).toEqual([]);
    expect(back.places).toEqual(places);
    expect(back.records).toBe(4);
  });
  it('keeps the source, licence, date and tier of each row', () => {
    const back = recordsFromCsv(recordsToCsv(places));
    const ramp = back.places[0]?.claims[0];
    expect(ramp?.provenance).toEqual(city);
    expect(effectiveTier(ramp?.provenance)).toBe('tier-1');
    expect(back.places[0]?.claims[1]?.provenance?.url).toBe('https://example.org/data');
  });
  it('keeps a record with no usable source, as unknown, and counts it', () => {
    const back = recordsFromCsv(recordsToCsv(places));
    expect(back.notUsable).toBe(1);
    const claim = back.places[2]?.claims[0];
    expect(claim?.status).toBe('present');
    expect(claim === undefined ? '' : effectiveStatus(claim)).toBe('unknown');
  });
  it('reads a hand-made table: any column order, any case, optional columns left out, a byte-order mark', () => {
    const csv = '\ufeffStatus,Feature,PLACE_NAME,place_id\npresent,ramp,Library,lib\n';
    const back = recordsFromCsv(csv);
    expect(back.problems).toEqual([]);
    expect(back.places).toEqual([{ id: 'lib', name: 'Library', claims: [{ termId: 'ramp', status: 'present' }] }]);
  });
  it('reads tiers in the forms found in files, and keeps one it does not know as it is', () => {
    const csv = `${HEAD}\na,A,ramp,present,S,CC0-1.0,2026-01-01,Tier 1,\na,A,elevator,present,S,CC0-1.0,2026-01-01,gold,\n`;
    const claims = recordsFromCsv(csv).places[0]?.claims ?? [];
    expect(claims[0]?.provenance?.tier).toBe('tier-1');
    expect(claims[1]?.provenance?.tier).toBe('gold');
    expect(effectiveTier(claims[1]?.provenance)).toBeNull();
  });
  it('keeps only https links', () => {
    const csv = `${HEAD}\na,A,ramp,present,S,CC0-1.0,2026-01-01,,http://example.org\na,A,elevator,present,S,CC0-1.0,2026-01-01,,javascript:alert(1)\n`;
    for (const claim of recordsFromCsv(csv).places[0]?.claims ?? []) expect(claim.provenance).not.toHaveProperty('url');
  });
  it('treats an empty status as unknown and never guesses a status word', () => {
    const csv = `${HEAD}\na,A,ramp,,,,,,\na,A,elevator,yes,,,,,\na,A,grab-bar,PRESENT,,,,,\na,A,automatic-door,constructor,,,,,\n`;
    const back = recordsFromCsv(csv);
    expect(back.places[0]?.claims).toEqual([{ termId: 'ramp', status: 'unknown' }, { termId: 'grab-bar', status: 'present' }]);
    expect(back.rejected).toEqual([{ line: 3, reason: 'status-not-known' }, { line: 5, reason: 'status-not-known' }]);
  });
  it('leaves out rows it cannot use, with the line and the reason', () => {
    const csv = `${HEAD}\n,A,ramp,present,,,,,\na,,ramp,present,,,,,\na,A,teleporter,present,,,,,\na,A,ramp\na,A,ramp,present,,,,,\na,Other,ramp,present,,,,,\n`;
    const back = recordsFromCsv(csv);
    expect(back.rejected).toEqual([
      { line: 2, reason: 'missing-id' },
      { line: 3, reason: 'missing-name' },
      { line: 4, reason: 'unknown-feature' },
      { line: 5, reason: 'wrong-column-count' },
      { line: 7, reason: 'name-conflict' },
    ]);
    expect(back.places).toHaveLength(1);
    expect(back.records).toBe(1);
  });
  it('does not make a place from a row that was left out', () => {
    const back = recordsFromCsv(`${HEAD}\nb,B,teleporter,present,,,,,\n`);
    expect(back.places).toEqual([]);
  });
  it('keeps places in the order they first appear, with records for one place joined', () => {
    const csv = `${HEAD}\nb,B,ramp,present,,,,,\na,A,ramp,present,,,,,\nb,B,elevator,absent,,,,,\n`;
    const back = recordsFromCsv(csv);
    expect(back.places.map((p) => p.id)).toEqual(['b', 'a']);
    expect(back.places[0]?.claims).toHaveLength(2);
  });
  it('reads nothing when the table itself is wrong', () => {
    expect(recordsFromCsv('').problems).toEqual(['empty-file']);
    expect(recordsFromCsv('place_id,feature\na,ramp\n').problems).toEqual(['missing-column:place_name', 'missing-column:status']);
    const open = recordsFromCsv(`${HEAD}\na,"A,ramp,present,,,,,\n`);
    expect(open.problems).toContain('unterminated-quote');
    expect(open.places).toEqual([]);
  });
  it('refuses a table that is too long', () => {
    const rows = Array.from({ length: MAX_RECORD_ROWS + 1 }, (_, i) => `p${i},P,,,,,,,`).join('\n');
    expect(recordsFromCsv(`${HEAD}\n${rows}\n`).problems).toEqual(['too-many-rows']);
  });
  it('is safe with prototype names as ids', () => {
    const back = recordsFromCsv(`${HEAD}\n__proto__,P,ramp,present,,,,,\nconstructor,C,,,,,,,\n`);
    expect(back.places.map((p) => p.id)).toEqual(['__proto__', 'constructor']);
  });
});

describe('messages', () => {
  it('says what was loaded, what was left out and what cannot be used', () => {
    const csv = `${HEAD}\na,A,ramp,present,,,,,\na,A,teleporter,present,,,,,\n`;
    expect(importMessage(recordsFromCsv(csv), 'en')).toBe('Loaded 1 records for 1 places. 1 row was left out. 1 record has no usable source. It is shown as unknown.');
  });
  it('says why nothing was read', () => {
    expect(importMessage(recordsFromCsv(''), 'en')).toBe('The table could not be read. Nothing was changed. The table is empty.');
    expect(importMessage(recordsFromCsv('a,b\n1,2\n'), 'fr')).toBe('Le tableau n’a pas pu être lu. Rien n’a été changé. Il manque une colonne.');
  });
  it('is short when all is well', () => {
    expect(importMessage(recordsFromCsv(recordsToCsv([{ id: 'a', name: 'A', claims: [c('ramp', 'present', city)] }])), 'fr')).toBe('1 fiches chargées pour 1 lieux.');
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const html of [renderRecordsCsv(lang, true, true, 'Done.'), renderRecordsCsv(lang, true, false), renderRecordsCsv(lang, false, true)]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'csv')).toEqual([]);
    }
  });
  it('is empty when the host takes neither files nor records', () => {
    expect(renderRecordsCsv('en', false, false)).toBe('');
  });
  it('has the save button only with a host that takes files', () => {
    expect(renderRecordsCsv('en', true, false)).toContain(`id="${RECORDSCSV_IDS.export}"`);
    expect(renderRecordsCsv('en', false, true)).not.toContain(RECORDSCSV_IDS.export);
  });
  it('has a labelled box with a hint and a load button only with a host that takes records', () => {
    const html = renderRecordsCsv('en', false, true);
    expect(html).toContain(`<label for="${RECORDSCSV_IDS.text}">`);
    expect(html).toContain(`aria-describedby="${RECORDSCSV_IDS.text}-hint"`);
    expect(html).toContain(`id="${RECORDSCSV_IDS.load}"`);
    expect(renderRecordsCsv('en', true, false)).not.toContain(RECORDSCSV_IDS.text);
  });
  it('shows the message in a status region and escapes it', () => {
    expect(renderRecordsCsv('en', true, true, '<b>x</b>')).toContain('<p role="status" data-gl-records-msg>&lt;b&gt;x&lt;/b&gt;</p>');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = RECORDSCSV_UI[lang];
    const texts = [
      ui.heading, ui.intro, ui.exportCsv, ui.label, ui.hint, ui.load, ui.loaded(3, 12), ui.rejected(1), ui.rejected(4), ui.notUsable(1), ui.notUsable(5),
      ui.failed, ...Object.values(ui.problems),
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
