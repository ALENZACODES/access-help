import { describe, expect, it } from 'vitest';
import {
  MAX_OLD_RECORDS_SHOWN,
  RECORDAGES_EXPORT_ID,
  RECORDAGES_UI,
  ageCountLines,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  oldRecordRows,
  oldRecordShowId,
  oldRecordText,
  oldRecordsFilename,
  oldRecordsToText,
  parseOldRecordShowId,
  plainLanguageIssues,
  readabilityIssues,
  recordAgeCounts,
  renderRecordAges,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const today = '2026-11-19';
const at = (date: string, source = 'City open data'): Provenance => ({ source, licence: 'CC0-1.0', date, tier: 'tier-1' });
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', at('2026-10-01')), c('elevator', 'present', at('2025-06-01'))] },
  { id: 'cafe', name: 'Café <b>', claims: [c('ramp', 'absent', at('2023-01-15', 'Transit agency')), c('elevator', 'present'), c('grab-bar', 'unknown', at('2020-01-01'))] },
  { id: 'pool', name: 'Pool', claims: [] },
  {
    id: 'hall',
    name: 'Hall',
    claims: [
      c('ramp', 'present', at('2024-12-01')),
      c('elevator', 'absent', at('2021-05-05')),
      c('grab-bar', 'present', { ...at('2020-01-01'), licence: 'Proprietary' }),
      c('automatic-door', 'present', at('2027-01-01')),
      c('not-a-term', 'present', at('2019-01-01')),
      c('accessible-parking', 'present', at('2025-11-19')),
    ],
  },
];

describe('recordAgeCounts', () => {
  it('counts usable records by age band', () => {
    expect(recordAgeCounts(places, today)).toEqual({ current: 2, aging: 2, old: 2, total: 6 });
  });
  it('counts a record dated exactly one year ago as from the last year', () => {
    const one: Place[] = [{ id: 'a', name: 'A', claims: [c('ramp', 'present', at('2025-11-19'))] }];
    expect(recordAgeCounts(one, today)).toEqual({ current: 1, aging: 0, old: 0, total: 1 });
  });
  it('leaves out records that cannot be reported, future dates and unknown features', () => {
    const only: Place[] = [{ id: 'a', name: 'A', claims: [c('ramp', 'present'), c('elevator', 'present', at('2030-01-01')), c('not-a-term', 'present', at('2020-01-01')), c('grab-bar', 'unknown', at('2020-01-01'))] }];
    expect(recordAgeCounts(only, today)).toEqual({ current: 0, aging: 0, old: 0, total: 0 });
  });
  it('is all zero for no places', () => {
    expect(recordAgeCounts([], today)).toEqual({ current: 0, aging: 0, old: 0, total: 0 });
  });
});

describe('oldRecordRows', () => {
  const rows = oldRecordRows(places, 'en', today);
  it('lists usable records more than a year old, oldest first', () => {
    expect(rows.map((r) => `${r.placeId}:${r.termId}:${r.date}:${r.age}`)).toEqual([
      'hall:elevator:2021-05-05:old',
      'cafe:ramp:2023-01-15:old',
      'hall:ramp:2024-12-01:aging',
      'lib:elevator:2025-06-01:aging',
    ]);
  });
  it('gives the place index, feature name, report, source and days', () => {
    expect(rows[1]).toEqual({ placeId: 'cafe', name: 'Café <b>', index: 1, termId: 'ramp', feature: 'Ramp', status: 'absent', source: 'Transit agency', date: '2023-01-15', days: 1404, age: 'old' });
    expect(oldRecordRows(places, 'fr', today)[1]?.feature).toBe('Rampe');
  });
  it('keeps the order held for records of the same date', () => {
    const same: Place[] = [
      { id: 'b', name: 'B', claims: [c('elevator', 'present', at('2024-01-01')), c('ramp', 'present', at('2024-01-01'))] },
      { id: 'a', name: 'A', claims: [c('ramp', 'present', at('2024-01-01'))] },
    ];
    expect(oldRecordRows(same, 'en', today).map((r) => `${r.placeId}:${r.termId}`)).toEqual(['b:elevator', 'b:ramp', 'a:ramp']);
  });
  it('is empty when every record is from the last year', () => {
    expect(oldRecordRows([places[2] as Place, { id: 'n', name: 'N', claims: [c('ramp', 'present', at('2026-11-19'))] }], 'en', today)).toEqual([]);
  });
  it('does not change the places', () => {
    const before = JSON.stringify(places);
    oldRecordRows(places, 'fr', today);
    expect(JSON.stringify(places)).toBe(before);
  });
});

describe('oldRecordText and ageCountLines', () => {
  it('writes a record as one line', () => {
    const row = oldRecordRows(places, 'en', today)[0];
    expect(row && oldRecordText(row, 'en')).toBe('Hall, Elevator: reported as not available. City open data, dated 2021-05-05.');
  });
  it('is French with French spacing', () => {
    const row = oldRecordRows(places, 'fr', today)[0];
    const text = row === undefined ? '' : oldRecordText(row, 'fr');
    expect(text).toBe('Hall, Ascenseur\u00a0: signalé comme non disponible. City open data, date du 2021-05-05.');
    expect(frenchIssues(text)).toEqual([]);
  });
  it('has a sentence for each band that holds a record', () => {
    expect(ageCountLines({ current: 2, aging: 1, old: 3, total: 6 }, 'en')).toEqual(['2 records are from the last year.', '1 record is between one and two years old.', '3 records are more than two years old.']);
    expect(ageCountLines({ current: 0, aging: 0, old: 1, total: 1 }, 'fr')).toEqual(['1 fiche date de plus de deux ans.']);
    expect(ageCountLines({ current: 0, aging: 0, old: 0, total: 0 }, 'en')).toEqual([]);
  });
});

describe('show ids', () => {
  it('round-trips and rejects other ids', () => {
    expect(parseOldRecordShowId(oldRecordShowId(8))).toBe(8);
    for (const id of ['gl-ageshow-', 'gl-ageshow-x', 'gl-dshow-1', 'gl-ageshow-1x', '']) expect(parseOldRecordShowId(id)).toBeNull();
  });
});

describe('oldRecordsToText', () => {
  it('gives the counts and every older record', () => {
    const text = oldRecordsToText(places, 'en', today);
    expect(text.startsWith('Older records\nMade on 2026-11-19.\n\nThese records are more than a year old.')).toBe(true);
    expect(text).toContain('2 records are from the last year.\n2 records are between one and two years old.\n2 records are more than two years old.\n\n- Hall, Elevator');
    expect(text).toContain('- Café <b>, Ramp: reported as not available. Transit agency, dated 2023-01-15.');
    expect(text.endsWith('\n')).toBe(true);
  });
  it('says so when no record can be reported', () => {
    expect(oldRecordsToText([], 'fr', today)).toBe('Fiches plus anciennes\nFait le 2026-11-19.\n\nIl n’y a aucune fiche qui peut être signalée.\n');
  });
  it('says so when every record is from the last year', () => {
    expect(oldRecordsToText([{ id: 'n', name: 'N', claims: [c('ramp', 'present', at('2026-10-01'))] }], 'en', today)).toBe(
      'Older records\nMade on 2026-11-19.\n\n1 record is from the last year.\nNo record that can be reported is more than a year old.\n',
    );
  });
  it('is not cut short, and names the file by language', () => {
    const many: Place[] = Array.from({ length: MAX_OLD_RECORDS_SHOWN + 4 }, (_, i) => ({ id: `p${i}`, name: `Place ${i}`, claims: [c('ramp', 'present', at('2024-01-01'))] }));
    expect(oldRecordsToText(many, 'en', today)).toContain(`- Place ${MAX_OLD_RECORDS_SHOWN + 3}, Ramp`);
    expect(oldRecordsFilename('en')).toBe('older-records-en.txt');
    expect(oldRecordsFilename('fr')).toBe('older-records-fr.txt');
  });
});

describe('renderRecordAges', () => {
  it('says so when no record can be reported', () => {
    expect(renderRecordAges([], 'en', today, true)).toBe('<p class="gl-note">There are no records that can be reported.</p>');
  });
  it('gives only the counts when every record is from the last year', () => {
    const html = renderRecordAges([{ id: 'n', name: 'N', claims: [c('ramp', 'present', at('2026-10-01'))] }], 'en', today, true);
    expect(html).toBe('<ul class="gl-agecounts"><li>1 record is from the last year.</li></ul><p class="gl-note">No record that can be reported is more than a year old.</p>');
  });
  it('lists the older records, oldest first, with one Show button for each place', () => {
    const html = renderRecordAges(places, 'en', today, false);
    expect(html).toContain('<li>2 records are more than two years old.</li>');
    expect(html.indexOf('Hall, Elevator')).toBeLessThan(html.indexOf('Hall, Ramp'));
    expect(html).toContain('<li data-age="old">Hall, Elevator: reported as not available. City open data, dated 2021-05-05. <button type="button" class="gl-btn" id="gl-ageshow-3" aria-label="Show Hall in the list">Show</button></li>');
    expect(html.match(/id="gl-ageshow-3"/g)).toHaveLength(1);
    expect(html).toContain('<li data-age="aging">Hall, Ramp: reported as available. City open data, dated 2024-12-01.</li>');
    expect(html).not.toContain(RECORDAGES_EXPORT_ID);
  });
  it('escapes names', () => {
    const html = renderRecordAges(places, 'fr', today, false);
    expect(html).toContain('Café &lt;b&gt;, Rampe');
    expect(html).not.toContain('<b>');
  });
  it('has the save button when the host takes files', () => {
    expect(renderRecordAges(places, 'fr', today, true)).toContain(`id="${RECORDAGES_EXPORT_ID}">Enregistrer cette liste en texte</button>`);
  });
  it('shows at most the limit and says how many more', () => {
    const html = renderRecordAges(places, 'en', today, false, 3);
    expect(html.match(/<li data-age/g)).toHaveLength(3);
    expect(html).toContain('And 1 more.');
  });
  it('never says what a place is like today', () => {
    for (const lang of ['en', 'fr'] as const) expect(renderRecordAges(places, lang, today, true)).not.toMatch(/accessible|verif|vérif|wrong|inconnue/i);
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><details><summary>${RECORDAGES_UI[lang].heading}</summary>${renderRecordAges(places, lang, today, true)}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('RECORDAGES_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = RECORDAGES_UI[lang];
    return [
      ui.heading, ui.intro, ui.none, ui.empty, ui.current(1), ui.current(4), ui.aging(1), ui.aging(4), ui.old(1), ui.old(4),
      ui.line('Hall', 'Ramp', 'reported as available'), ui.from('City open data', '2026-10-01'), ui.more(1), ui.more(5), ui.show, ui.showLabel('Hall'), ui.exportList, ui.title, ui.made(today),
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(RECORDAGES_UI.fr)).toEqual(Object.keys(RECORDAGES_UI.en));
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
