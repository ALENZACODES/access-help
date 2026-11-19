import { describe, expect, it } from 'vitest';
import {
  DISAGREE_EXPORT_ID,
  DISAGREE_UI,
  MAX_DISAGREEMENTS_SHOWN,
  auditHtml,
  disagreeShowId,
  disagreementRows,
  disagreementTotals,
  disagreementsFilename,
  disagreementsToText,
  frenchIssues,
  lintClaims,
  lintCopy,
  mergeClaims,
  parseDisagreeShowId,
  plainLanguageIssues,
  readabilityIssues,
  renderDisagreements,
  sideText,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const today = '2026-11-19';

const places: Place[] = [
  { id: 'ok', name: 'Fine Place', claims: [c('ramp', 'present', city), c('ramp', 'present', transit), c('elevator', 'unknown')] },
  {
    id: 'hall',
    name: 'Hall',
    claims: [
      c('elevator', 'absent', transit),
      c('ramp', 'absent', transit),
      c('elevator', 'present', city),
      c('ramp', 'present', city),
      c('ramp', 'absent', { ...transit, source: 'Third source', date: '2026-10-01' }),
      c('grab-bar', 'present', city),
      c('grab-bar', 'absent'),
      c('automatic-door', 'present', city),
      c('automatic-door', 'absent', { ...transit, licence: 'Proprietary' }),
    ],
  },
  { id: 'pool', name: 'Pool <b>', claims: [c('ramp', 'absent', city), c('ramp', 'present', transit), c('not-a-term', 'present', city), c('not-a-term', 'absent', transit)] },
];

describe('disagreementRows', () => {
  const rows = disagreementRows(places, 'en');
  it('lists each feature where usable records disagree, in place then glossary order', () => {
    expect(rows.map((r) => `${r.placeId}:${r.termId}`)).toEqual(['hall:ramp', 'hall:elevator', 'pool:ramp']);
    expect(rows.map((r) => r.index)).toEqual([1, 1, 2]);
    expect(rows[0]?.feature).toBe('Ramp');
    expect(disagreementRows(places, 'fr')[0]?.feature).toBe('Rampe');
  });
  it('skips features whose records agree', () => {
    expect(rows.some((r) => r.placeId === 'ok')).toBe(false);
  });
  it('gives no part to a record that cannot be used', () => {
    expect(rows.some((r) => r.termId === 'grab-bar')).toBe(false);
    expect(rows.some((r) => r.termId === 'automatic-door')).toBe(false);
  });
  it('skips features the glossary does not know', () => {
    expect(rows.some((r) => r.termId === 'not-a-term')).toBe(false);
  });
  it('holds both sides, newest first, then in the order held', () => {
    const ramp = rows[0];
    expect(ramp?.records.map((r) => `${r.date} ${r.source} ${r.status}`)).toEqual([
      '2026-10-01 City open data present',
      '2026-10-01 Third source absent',
      '2025-03-04 Transit agency absent',
    ]);
    expect(ramp?.present).toBe(1);
    expect(ramp?.absent).toBe(2);
    expect(ramp?.records[0]?.tier).toBe('tier-1');
    expect(ramp?.records[2]?.tier).toBeNull();
  });
  it('matches the features that the merge marks as a conflict', () => {
    for (const place of places) {
      const merged = mergeClaims(['ramp', 'elevator', 'grab-bar', 'automatic-door'], place.claims).filter((m) => m.conflict).map((m) => m.termId);
      expect(rows.filter((r) => r.placeId === place.id).map((r) => r.termId).sort()).toEqual([...merged].sort());
    }
  });
  it('is empty for no places and for places with no records', () => {
    expect(disagreementRows([], 'en')).toEqual([]);
    expect(disagreementRows([{ id: 'a', name: 'A', claims: [] }], 'en')).toEqual([]);
  });
  it('does not change the places', () => {
    const before = JSON.stringify(places);
    disagreementRows(places, 'fr');
    expect(JSON.stringify(places)).toBe(before);
  });
});

describe('disagreementTotals', () => {
  it('counts rows, places and records', () => {
    expect(disagreementTotals(disagreementRows(places, 'en'))).toEqual({ rows: 3, places: 2, records: 7 });
    expect(disagreementTotals([])).toEqual({ rows: 0, places: 0, records: 0 });
  });
});

describe('sideText', () => {
  it('gives the source, date, report, licence and tier', () => {
    const [first, , last] = disagreementRows(places, 'en')[0]?.records ?? [];
    expect(first && sideText(first, 'en')).toBe('City open data, dated 2026-10-01: reported as available. Licence: CC0-1.0. Tier 1.');
    expect(last && sideText(last, 'en')).toBe('Transit agency, dated 2025-03-04: reported as not available. Licence: OGL-Canada-2.0. Tier unknown.');
  });
  it('is French with French spacing', () => {
    const last = disagreementRows(places, 'fr')[0]?.records[2];
    const text = last === undefined ? '' : sideText(last, 'fr');
    expect(text).toContain('Transit agency, date du 2025-03-04\u00a0: signalé comme non disponible.');
    expect(text).toContain('Licence\u00a0: OGL-Canada-2.0.');
    expect(frenchIssues(text)).toEqual([]);
  });
});

describe('show ids', () => {
  it('round-trips and rejects other ids', () => {
    expect(parseDisagreeShowId(disagreeShowId(12))).toBe(12);
    for (const id of ['gl-disshow-', 'gl-disshow-x', 'gl-pshow-1', 'gl-dshow-1', 'gl-disshow-1 ', '']) expect(parseDisagreeShowId(id)).toBeNull();
  });
});

describe('disagreementsToText', () => {
  it('lists every disagreement with both sides', () => {
    const text = disagreementsToText(disagreementRows(places, 'en'), 'en', today);
    expect(text.startsWith('Where sources disagree\nMade on 2026-11-19.\n')).toBe(true);
    expect(text).toContain('Sources disagree about 3 features. They are in 2 places.');
    expect(text).toContain('Hall, Ramp\n- City open data, dated 2026-10-01: reported as available. Licence: CC0-1.0. Tier 1.\n- Third source');
    expect(text).toContain('Pool <b>, Ramp\n');
    expect(text).toContain('A newer record is not always the right one.');
    expect(text.endsWith('\n')).toBe(true);
  });
  it('says so when nothing disagrees', () => {
    expect(disagreementsToText([], 'fr', today)).toBe('Là où les sources ne concordent pas\nFait le 2026-11-19.\n\nAucune source ne contredit une autre dans les fiches.\n');
  });
  it('is not cut short', () => {
    const many: Place[] = Array.from({ length: MAX_DISAGREEMENTS_SHOWN + 5 }, (_, i) => ({ id: `p${i}`, name: `Place ${i}`, claims: [c('ramp', 'present', city), c('ramp', 'absent', transit)] }));
    const text = disagreementsToText(disagreementRows(many, 'en'), 'en', today);
    expect(text).toContain(`Place ${MAX_DISAGREEMENTS_SHOWN + 4}, Ramp`);
  });
  it('names the file by language', () => {
    expect(disagreementsFilename('en')).toBe('sources-disagree-en.txt');
    expect(disagreementsFilename('fr')).toBe('sources-disagree-fr.txt');
  });
});

describe('renderDisagreements', () => {
  it('says so when nothing disagrees, with no list and no button', () => {
    const html = renderDisagreements([], 'en', true);
    expect(html).toContain('No sources disagree in the records.');
    expect(html).not.toContain('<ul');
    expect(html).not.toContain('<button');
  });
  it('shows the count, both sides and one Show button for each place', () => {
    const html = renderDisagreements(disagreementRows(places, 'en'), 'en', false);
    expect(html).toContain('<p role="status">Sources disagree about 3 features. They are in 2 places.</p>');
    expect(html).toContain('<strong>Hall, Ramp</strong> <button type="button" class="gl-btn" id="gl-disshow-1" aria-label="Show Hall in the list">Show</button>');
    expect(html.match(/id="gl-disshow-1"/g)).toHaveLength(1);
    expect(html).toContain('<li data-status="absent">Transit agency, dated 2025-03-04: reported as not available. Licence: OGL-Canada-2.0. Tier unknown.</li>');
    expect(html).toContain('<li data-status="present">City open data');
    expect(html).not.toContain(DISAGREE_EXPORT_ID);
  });
  it('escapes names', () => {
    const html = renderDisagreements(disagreementRows(places, 'en'), 'en', false);
    expect(html).toContain('Pool &lt;b&gt;, Ramp');
    expect(html).not.toContain('<b>');
  });
  it('has the save button when the host takes files', () => {
    expect(renderDisagreements(disagreementRows(places, 'fr'), 'fr', true)).toContain(`id="${DISAGREE_EXPORT_ID}">Enregistrer cette liste en texte</button>`);
  });
  it('shows at most the limit and says how many more', () => {
    const rows = disagreementRows(places, 'en');
    const html = renderDisagreements(rows, 'en', false, 2);
    expect(html.match(/<strong>/g)).toHaveLength(2);
    expect(html).toContain('And 1 more.');
    expect(html).toContain('Sources disagree about 3 features.');
    expect(renderDisagreements(rows, 'en', false, -1)).toContain('And 3 more.');
  });
  it('never picks a side or says a place is accessible', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = renderDisagreements(disagreementRows(places, lang), lang, true);
      expect(html).not.toMatch(/accessible|verif|vérif|correct|inconnue/i);
    }
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><details><summary>${DISAGREE_UI[lang].heading}</summary>${renderDisagreements(disagreementRows(places, lang), lang, true)}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('DISAGREE_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = DISAGREE_UI[lang];
    return [
      ui.heading, ui.intro, ui.order, ui.none, ui.count(1), ui.count(4), ui.inPlaces(1), ui.inPlaces(3), ui.line('Hall', 'Ramp'),
      ui.record('reported as available', 'City open data', '2026-10-01'), ui.licence('CC0-1.0', 'Tier 1'), ui.more(1), ui.more(6), ui.show, ui.showLabel('Hall'), ui.exportList, ui.title, ui.made(today),
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(DISAGREE_UI.fr)).toEqual(Object.keys(DISAGREE_UI.en));
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
