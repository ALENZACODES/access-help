import { describe, expect, it } from 'vitest';
import {
  SOURCECOMPARE_IDS,
  SOURCECOMPARE_UI,
  auditHtml,
  canCompare,
  compareCounts,
  compareRowText,
  compareSourceFromValue,
  compareSources,
  compareSummary,
  frenchIssues,
  lintClaims,
  lintCopy,
  mergeClaims,
  plainLanguageIssues,
  readabilityIssues,
  renderCompareTable,
  renderSourceCompare,
  sideLabel,
  sourceCompareFilename,
  sourceCompareText,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const third: Provenance = { source: 'A & B <i>', licence: 'CC0-1.0', date: '2024-01-01' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const A = 'City open data';
const B = 'Transit agency';

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('elevator', 'absent', city), c('elevator', 'absent', transit), c('ramp', 'present', city)] },
  { id: 'cafe', name: 'Café <b>', claims: [c('ramp', 'absent', transit), c('ramp', 'present', third), c('elevator', 'present')] },
  { id: 'pool', name: 'Pool', claims: [c('ramp', 'present', third)] },
  {
    id: 'hall',
    name: 'Hall',
    claims: [
      c('ramp', 'present', city),
      c('ramp', 'absent', transit),
      c('grab-bar', 'present', city),
      c('grab-bar', 'absent', { ...city, date: '2025-01-01' }),
      c('grab-bar', 'present', transit),
      c('automatic-door', 'present', { ...transit, licence: 'Proprietary' }),
      c('automatic-door', 'present', city),
      c('not-a-term', 'present', city),
    ],
  },
];

describe('canCompare', () => {
  it('needs two different named sources', () => {
    expect(canCompare(A, B)).toBe(true);
    expect(canCompare(A, A)).toBe(false);
    expect(canCompare(A, ` ${A} `)).toBe(false);
    expect(canCompare('', B)).toBe(false);
    expect(canCompare(A, '  ')).toBe(false);
  });
});

describe('compareSources', () => {
  const rows = compareSources(places, A, B, 'en');
  it('has a row for each place and feature either source reports on, places in order then glossary order', () => {
    expect(rows.map((r) => `${r.index}:${r.placeId}:${r.termId}:${r.outcome}`)).toEqual([
      '0:lib:ramp:only-a',
      '0:lib:elevator:agree',
      '1:cafe:ramp:only-b',
      '3:hall:automatic-door:only-a',
      '3:hall:ramp:differ',
      '3:hall:grab-bar:differ',
    ]);
  });
  it('gives what each source reports', () => {
    expect(rows[1]).toMatchObject({ a: 'absent', b: 'absent', feature: 'Elevator' });
    expect(rows[4]).toMatchObject({ a: 'present', b: 'absent' });
    expect(rows[0]).toMatchObject({ a: 'present', b: null });
    expect(rows[2]).toMatchObject({ a: null, b: 'absent' });
  });
  it('marks a source whose own records disagree as mixed, and that never counts as agreeing', () => {
    expect(rows[5]).toMatchObject({ a: 'mixed', b: 'present', outcome: 'differ' });
  });
  it('gives no part to a record that cannot be reported, or to a third source', () => {
    expect(rows[3]).toMatchObject({ termId: 'automatic-door', a: 'present', b: null });
    expect(rows.some((r) => r.placeId === 'pool')).toBe(false);
    expect(rows.some((r) => r.termId === 'not-a-term')).toBe(false);
  });
  it('swaps the sides when the sources are swapped', () => {
    const back = compareSources(places, B, A, 'en');
    expect(back.map((r) => r.outcome)).toEqual(['only-b', 'agree', 'only-a', 'only-b', 'differ', 'differ']);
    expect(back[5]).toMatchObject({ a: 'present', b: 'mixed' });
  });
  it('names features in the language asked for', () => {
    expect(compareSources(places, A, B, 'fr')[1]?.feature).toBe('Ascenseur');
  });
  it('is empty for the same source twice, a missing name, or a source with no record', () => {
    expect(compareSources(places, A, A, 'en')).toEqual([]);
    expect(compareSources(places, A, '', 'en')).toEqual([]);
    expect(compareSources(places, 'Nobody', 'No one', 'en')).toEqual([]);
    expect(compareSources([], A, B, 'en')).toEqual([]);
  });
  it('differs exactly where the merge of the two sources alone is a conflict', () => {
    for (const place of places) {
      const two = place.claims.filter((x) => x.provenance?.source === A || x.provenance?.source === B);
      for (const row of rows.filter((r) => r.placeId === place.id)) {
        expect(mergeClaims([row.termId], two)[0]?.conflict, `${place.id} ${row.termId}`).toBe(row.outcome === 'differ');
      }
    }
  });
  it('does not change the places', () => {
    const before = JSON.stringify(places);
    compareSources(places, A, B, 'fr');
    expect(JSON.stringify(places)).toBe(before);
  });
});

describe('compareCounts and compareSummary', () => {
  const counts = compareCounts(compareSources(places, A, B, 'en'));
  it('counts the outcomes', () => {
    expect(counts).toEqual({ both: 3, agree: 1, differ: 2, onlyA: 2, onlyB: 1 });
    expect(compareCounts([])).toEqual({ both: 0, agree: 0, differ: 0, onlyA: 0, onlyB: 0 });
  });
  it('writes the counts as sentences', () => {
    expect(compareSummary(counts, A, B, 'en')).toEqual([
      'Both sources report on the same feature in 3 cases.',
      'They agree in 1 case.',
      'They differ in 2 cases.',
      '2 features are reported only by City open data.',
      '1 feature is reported only by Transit agency.',
    ]);
  });
  it('leaves out kinds with nothing, but always says how often both report', () => {
    expect(compareSummary({ both: 0, agree: 0, differ: 0, onlyA: 0, onlyB: 4 }, A, B, 'fr')).toEqual([
      'Les deux sources parlent de la même caractéristique dans 0 cas.',
      '4 caractéristiques sont signalées seulement par Transit agency.',
    ]);
  });
});

describe('compareSourceFromValue', () => {
  it('reads a position in the list of names and nothing else', () => {
    expect(compareSourceFromValue(places, '1')).toBe('City open data');
    for (const v of ['', '9', '-1', 'x', '1.0', 'City open data']) expect(compareSourceFromValue(places, v), v).toBe('');
  });
});

describe('texts', () => {
  const rows = compareSources(places, A, B, 'en');
  it('labels each side', () => {
    expect(sideLabel('present', 'en')).toBe('reported as available');
    expect(sideLabel('absent', 'fr')).toBe('signalé comme non disponible');
    expect(sideLabel('mixed', 'en')).toBe('gives both answers');
    expect(sideLabel(null, 'fr')).toBe('aucune fiche');
  });
  it('writes a row as one line', () => {
    expect(compareRowText(rows[4] as (typeof rows)[number], A, B, 'en')).toBe('Hall, Ramp: They differ. City open data: reported as available. Transit agency: reported as not available.');
    expect(compareRowText(rows[0] as (typeof rows)[number], A, B, 'en')).toBe('Library, Ramp: Only the first source. City open data: reported as available. Transit agency: no record.');
  });
  it('is French with French spacing', () => {
    const fr = compareSources(places, A, B, 'fr');
    const text = compareRowText(fr[5] as (typeof fr)[number], A, B, 'fr');
    expect(text).toBe('Hall, Barre d’appui\u00a0: Elles diffèrent. City open data\u00a0: donne les deux réponses. Transit agency\u00a0: signalé comme disponible.');
    expect(frenchIssues(text)).toEqual([]);
  });
  it('gives the whole comparison as text', () => {
    const text = sourceCompareText(places, A, B, 'en', today);
    expect(text.startsWith('Two sources compared: City open data, Transit agency\nMade on 2026-11-19.\n\nBoth sources report on the same feature in 3 cases.\nThey agree in 1 case.\n')).toBe(true);
    expect(text).toContain('This table does not say which source is right.\n\n- Library, Ramp: Only the first source.');
    expect(text.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(6);
  });
  it('is empty when there is nothing to compare, and names the file by language', () => {
    expect(sourceCompareText(places, A, A, 'en', today)).toBe('');
    expect(sourceCompareText(places, '', B, 'fr', today)).toBe('');
    expect(sourceCompareFilename('en')).toBe('two-sources-en.txt');
    expect(sourceCompareFilename('fr')).toBe('two-sources-fr.txt');
  });
});

describe('renderCompareTable', () => {
  it('says two sources are needed when fewer are held', () => {
    expect(renderCompareTable([places[2] as Place], '', '', 'en', true)).toBe('<p class="gl-note">You need records from two sources to compare them.</p>');
    expect(renderCompareTable([], '', '', 'fr', true)).toBe('<p class="gl-note">Il faut des fiches de deux sources pour les comparer.</p>');
  });
  it('asks for two different sources', () => {
    const prompt = '<p class="gl-note">Choose two different sources to see where they agree and where they differ.</p>';
    expect(renderCompareTable(places, '', '', 'en', true)).toBe(prompt);
    expect(renderCompareTable(places, A, '', 'en', true)).toBe(prompt);
    expect(renderCompareTable(places, A, A, 'en', true)).toBe(prompt);
    expect(renderCompareTable(places, A, 'Gone', 'en', true)).toBe(prompt);
  });
  it('has the counts, the note and a captioned table named by the two sources', () => {
    const html = renderCompareTable(places, A, B, 'en', false);
    expect(html).toContain('<p role="status">Both sources report on the same feature in 3 cases. They agree in 1 case. They differ in 2 cases. 2 features are reported only by City open data. 1 feature is reported only by Transit agency.</p>');
    expect(html).toContain('<caption>Where these two sources agree and differ: City open data, Transit agency</caption>');
    expect(html).toContain('<th scope="col">Place</th><th scope="col">Feature</th><th scope="col">City open data</th><th scope="col">Transit agency</th><th scope="col">Result</th>');
    expect(html).toContain('<tr data-outcome="differ"><th scope="row">Hall</th><td>Ramp</td><td data-side="present">reported as available</td><td data-side="absent">reported as not available</td><td>They differ</td></tr>');
    expect(html).toContain('<td data-side="mixed">gives both answers</td>');
    expect(html).toContain('<td data-side="none">no record</td>');
    expect(html.match(/<tr data-outcome=/g)).toHaveLength(6);
    expect(html).not.toContain(SOURCECOMPARE_IDS.export);
  });
  it('escapes source and place names', () => {
    const html = renderCompareTable(places, 'A & B <i>', B, 'en', false);
    expect(html).toContain('<th scope="col">A &amp; B &lt;i&gt;</th>');
    expect(html).toContain('Café &lt;b&gt;');
    expect(html).not.toMatch(/<i>|<b>/);
  });
  it('has the save button when the host takes files', () => {
    expect(renderCompareTable(places, A, B, 'fr', true)).toContain(`id="${SOURCECOMPARE_IDS.export}">Enregistrer ce tableau en texte</button>`);
  });
  it('never says which source is right', () => {
    for (const lang of ['en', 'fr'] as const) expect(renderCompareTable(places, A, B, lang, true)).not.toMatch(/is wrong|is correct|more reliable|plus fiable|verif|vérif|inconnue/i);
  });
});

describe('renderSourceCompare', () => {
  it('has two labelled lists and the region', () => {
    const html = renderSourceCompare(places, '', '', 'en', false);
    expect(html).toContain('<label for="gl-sca">First source</label><select id="gl-sca" class="gl-select"><option value="" selected>Choose a source</option><option value="0">A &amp; B &lt;i&gt;</option>');
    expect(html).toContain('<label for="gl-scb">Second source</label><select id="gl-scb" class="gl-select">');
    expect(html).toContain('<div data-gl-sc><p class="gl-note">Choose two different sources');
  });
  it('marks the chosen sources', () => {
    const html = renderSourceCompare(places, A, B, 'fr', false);
    expect(html).toContain('<select id="gl-sca" class="gl-select"><option value="">Choisissez une source</option><option value="0">A &amp; B &lt;i&gt;</option><option value="1" selected>City open data</option>');
    expect(html).toContain('<option value="2" selected>Transit agency</option></select><div data-gl-sc>');
    expect(html).toContain('<caption>Où ces deux sources concordent et diffèrent\u00a0: City open data, Transit agency</caption>');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><details><summary>${SOURCECOMPARE_UI[lang].heading}</summary>${renderSourceCompare(places, A, B, lang, true)}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('SOURCECOMPARE_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = SOURCECOMPARE_UI[lang];
    return [
      ui.heading, ui.labelA, ui.labelB, ui.choose, ui.prompt, ui.fewSources, ui.both(1), ui.both(3), ui.agree(1), ui.agree(3), ui.differ(1), ui.differ(3), ui.only('City open data', 1), ui.only('City open data', 3),
      ui.note, ui.caption('City open data', 'Transit agency'), ui.place, ui.feature, ui.result, ui.outcomes.agree, ui.outcomes.differ, ui.outcomes['only-a'], ui.outcomes['only-b'], ui.mixed, ui.nothing,
      ui.exportList, ui.title('City open data', 'Transit agency'), ui.made(today), ui.line('Hall', 'Ramp', 'They differ'), ui.sides('City open data', 'no record', 'Transit agency', 'no record'),
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(SOURCECOMPARE_UI.fr)).toEqual(Object.keys(SOURCECOMPARE_UI.en));
    expect(Object.keys(SOURCECOMPARE_UI.fr.outcomes)).toEqual(Object.keys(SOURCECOMPARE_UI.en.outcomes));
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
