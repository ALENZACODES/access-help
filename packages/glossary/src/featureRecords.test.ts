import { describe, expect, it } from 'vitest';
import {
  FEATUREVIEW_EXPORT_ID,
  FEATUREVIEW_SELECT_ID,
  FEATUREVIEW_UI,
  PLAIN_TERMS as TERMS,
  auditHtml,
  featureCounts,
  featureRowText,
  featureRows,
  featureViewFilename,
  featureViewText,
  frenchIssues,
  isFeatureId,
  lintClaims,
  lintCopy,
  mergeClaims,
  plainLanguageIssues,
  readabilityIssues,
  renderFeatureTable,
  renderFeatureView,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('ramp', 'present', transit), c('elevator', 'absent', transit)] },
  { id: 'cafe', name: 'Café <b>', claims: [c('ramp', 'absent', transit)] },
  { id: 'pool', name: 'Pool', claims: [c('ramp', 'present'), c('ramp', 'unknown', city)] },
  { id: 'hall', name: 'Hall', claims: [c('ramp', 'present', city), c('ramp', 'absent', transit)] },
  { id: 'park', name: 'Park', claims: [] },
];

describe('isFeatureId', () => {
  it('knows the glossary features and nothing else', () => {
    expect(isFeatureId('ramp')).toBe(true);
    for (const v of ['', 'not-a-term', 'RAMP', 3, null, undefined, '__proto__']) expect(isFeatureId(v)).toBe(false);
  });
});

describe('featureRows', () => {
  const rows = featureRows(places, 'ramp');
  it('has one row for each place, in the order given', () => {
    expect(rows.map((r) => `${r.index}:${r.placeId}`)).toEqual(['0:lib', '1:cafe', '2:pool', '3:hall', '4:park']);
  });
  it('gives what is reported, the usable records and the newest date', () => {
    expect(rows[0]).toEqual({ placeId: 'lib', name: 'Library', index: 0, status: 'present', conflict: false, records: 2, newest: '2026-10-01' });
    expect(rows[1]).toMatchObject({ status: 'absent', conflict: false, records: 1, newest: '2025-03-04' });
  });
  it('lists a place with no usable record as unknown, with no date', () => {
    expect(rows[2]).toMatchObject({ status: 'unknown', conflict: false, records: 0, newest: '' });
    expect(rows[4]).toMatchObject({ status: 'unknown', conflict: false, records: 0, newest: '' });
  });
  it('lists a place whose sources disagree as unknown, and says they disagree', () => {
    expect(rows[3]).toMatchObject({ status: 'unknown', conflict: true, records: 2, newest: '2026-10-01' });
  });
  it('agrees with the merge used everywhere else, for every feature', () => {
    for (const term of TERMS) {
      featureRows(places, term.id).forEach((row, i) => {
        const merged = mergeClaims([term.id], (places[i] as Place).claims)[0];
        expect(row.status, `${term.id} ${row.placeId}`).toBe(merged?.status);
        expect(row.conflict, `${term.id} ${row.placeId}`).toBe(merged?.conflict);
      });
    }
  });
  it('is empty for a feature the glossary does not know, and for no places', () => {
    expect(featureRows(places, 'not-a-term')).toEqual([]);
    expect(featureRows(places, '')).toEqual([]);
    expect(featureRows([], 'ramp')).toEqual([]);
  });
  it('does not change the places', () => {
    const before = JSON.stringify(places);
    featureRows(places, 'ramp');
    expect(JSON.stringify(places)).toBe(before);
  });
});

describe('featureCounts', () => {
  it('counts the places by what is reported', () => {
    expect(featureCounts(featureRows(places, 'ramp'))).toEqual({ present: 1, absent: 1, unknown: 3 });
    expect(featureCounts(featureRows(places, 'elevator'))).toEqual({ present: 0, absent: 1, unknown: 4 });
    expect(featureCounts([])).toEqual({ present: 0, absent: 0, unknown: 0 });
  });
});

describe('featureRowText', () => {
  const rows = featureRows(places, 'ramp');
  it('writes a row as one line', () => {
    expect(featureRowText(rows[0] as (typeof rows)[number], 'en')).toBe('Library: reported as available. 2 records, the newest dated 2026-10-01.');
    expect(featureRowText(rows[1] as (typeof rows)[number], 'en')).toBe('Café <b>: reported as not available. 1 record, dated 2025-03-04.');
    expect(featureRowText(rows[2] as (typeof rows)[number], 'en')).toBe('Pool: unknown.');
    expect(featureRowText(rows[3] as (typeof rows)[number], 'en')).toBe('Hall: sources disagree. 2 records, the newest dated 2026-10-01.');
  });
  it('is French with French spacing', () => {
    const text = featureRowText(rows[3] as (typeof rows)[number], 'fr');
    expect(text).toBe('Hall\u00a0: les sources ne concordent pas. 2 fiches, la plus récente date du 2026-10-01.');
    expect(frenchIssues(text)).toEqual([]);
  });
});

describe('featureViewText', () => {
  it('gives the counts, the note and a line for each place', () => {
    const text = featureViewText(places, 'ramp', 'en', today);
    expect(text.startsWith('One feature in every place: Ramp\nMade on 2026-11-19.\n\nPlaces where it is reported as available: 1. Reported as not available: 1. Where it is unknown: 3.\n')).toBe(true);
    expect(text).toContain('It does not mean the feature is missing.');
    expect(text).toContain('- Hall: sources disagree. 2 records, the newest dated 2026-10-01.\n- Park: unknown.\n');
  });
  it('uses the token in French', () => {
    const text = featureViewText(places, 'ramp', 'fr', today);
    expect(text).toContain('Où elle est UNKNOWN\u00a0: 3.');
    expect(text).not.toMatch(/inconnues?(?![a-zà-ÿ])/i);
  });
  it('is empty for an unknown feature, and says so for no places', () => {
    expect(featureViewText(places, 'nope', 'en', today)).toBe('');
    expect(featureViewText([], 'ramp', 'en', today)).toBe('One feature in every place: Ramp\nMade on 2026-11-19.\n\nThere are no places in the list.\n');
  });
  it('names the file by feature and language', () => {
    expect(featureViewFilename('ramp', 'en')).toBe('feature-ramp-en.txt');
    expect(featureViewFilename('grab-bar', 'fr')).toBe('feature-grab-bar-fr.txt');
    expect(featureViewFilename('../x', 'en')).toBe('feature-none-en.txt');
  });
});

describe('renderFeatureTable', () => {
  it('asks for a feature when none is chosen', () => {
    expect(renderFeatureTable(places, '', 'en', true)).toBe('<p class="gl-note">Choose a feature to see what is reported for it in each place.</p>');
    expect(renderFeatureTable(places, 'nope', 'en', true)).toContain('Choose a feature');
  });
  it('says so when there are no places', () => {
    expect(renderFeatureTable([], 'ramp', 'fr', true)).toBe('<p class="gl-note" role="status">Il n’y a aucun lieu dans la liste.</p>');
  });
  it('has a captioned table with a row header for each place', () => {
    const html = renderFeatureTable(places, 'ramp', 'en', false);
    expect(html).toContain('<p role="status">Places where it is reported as available: 1. Reported as not available: 1. Where it is unknown: 3.</p>');
    expect(html).toContain('<caption>What is reported for this feature in each place: Ramp</caption>');
    expect(html).toContain('<tr><th scope="row">Library</th><td data-status="present">reported as available</td><td>2</td><td>2026-10-01</td></tr>');
    expect(html).toContain('<tr><th scope="row">Hall</th><td data-status="conflict">sources disagree</td><td>2</td><td>2026-10-01</td></tr>');
    expect(html).toContain('<tr><th scope="row">Park</th><td data-status="unknown">unknown</td><td>0</td><td>No record</td></tr>');
    expect(html.match(/<th scope="col">/g)).toHaveLength(4);
    expect(html).not.toContain(FEATUREVIEW_EXPORT_ID);
  });
  it('escapes names', () => {
    const html = renderFeatureTable(places, 'ramp', 'en', false);
    expect(html).toContain('Café &lt;b&gt;');
    expect(html).not.toContain('<b>');
  });
  it('has the save button when the host takes files', () => {
    expect(renderFeatureTable(places, 'ramp', 'fr', true)).toContain(`id="${FEATUREVIEW_EXPORT_ID}">Enregistrer ce tableau en texte</button>`);
  });
  it('never fills in an unknown or says a place is accessible', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const term of TERMS) {
        const html = renderFeatureTable(places, term.id, lang, true);
        expect(html.match(/data-status="(present|absent)"/g)?.length ?? 0, term.id).toBeLessThanOrEqual(2);
        expect(html).not.toMatch(/verif|vérif|inconnue/i);
      }
    }
  });
});

describe('renderFeatureView', () => {
  it('has a labelled list with every feature and the table region', () => {
    const html = renderFeatureView(places, '', 'en', false);
    expect(html).toContain(`<label for="${FEATUREVIEW_SELECT_ID}">Feature to look at</label>`);
    expect(html).toContain('<option value="" selected>Choose a feature</option>');
    expect(html.match(/<option /g)).toHaveLength(TERMS.length + 1);
    expect(html).toContain('<div data-gl-fview><p class="gl-note">Choose a feature');
  });
  it('marks the chosen feature and shows its table', () => {
    const html = renderFeatureView(places, 'elevator', 'fr', false);
    expect(html).toContain('<option value="elevator" selected>Ascenseur</option>');
    expect(html).toContain('<option value="">Choisissez une caractéristique</option>');
    expect(html).toContain('<caption>Ce qui est signalé pour cette caractéristique dans chaque lieu\u00a0: Ascenseur</caption>');
  });
  it('treats an unknown choice as none', () => {
    expect(renderFeatureView(places, 'nope', 'en', false)).toContain('<option value="" selected>');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><details><summary>${FEATUREVIEW_UI[lang].heading}</summary>${renderFeatureView(places, 'ramp', lang, true)}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('FEATUREVIEW_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = FEATUREVIEW_UI[lang];
    return [
      ui.heading, ui.label, ui.choose, ui.prompt, ui.noPlaces, ui.caption('Ramp'), ui.place, ui.reported, ui.records, ui.newest, ui.noDate, ui.counts(1, 2, 3), ui.counts(0, 0, 12),
      ui.note, ui.exportList, ui.title('Ramp'), ui.made(today), ui.line('Hall', 'unknown'), ui.detail(1, '2026-10-01'), ui.detail(3, '2026-10-01'),
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(FEATUREVIEW_UI.fr)).toEqual(Object.keys(FEATUREVIEW_UI.en));
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
