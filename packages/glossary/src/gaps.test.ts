import { describe, expect, it } from 'vitest';
import {
  GAPS_EXPORT_ID,
  GAPS_UI,
  MAX_GAP_PLACES_SHOWN,
  PLAIN_TERMS,
  auditHtml,
  frenchIssues,
  gapHeadText,
  gapRows,
  gapScope,
  gapShowId,
  gapText,
  gapTotals,
  gapsFilename,
  gapsToText,
  lintClaims,
  lintCopy,
  mergeClaims,
  parseGapShowId,
  placeGaps,
  plainLanguageIssues,
  readabilityIssues,
  renderGaps,
  scopeText,
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
const ALL = PLAIN_TERMS.map((t) => t.id);
const full: Place = { id: 'full', name: 'Full', claims: ALL.map((id) => c(id, 'present', city)) };

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit)] },
  full,
  { id: 'cafe', name: 'Café <b>', claims: [] },
  { id: 'hall', name: 'Hall', claims: [c('ramp', 'present', city), c('ramp', 'absent', transit), c('elevator', 'present'), c('grab-bar', 'unknown', city)] },
];
const three = ['ramp', 'elevator', 'grab-bar'];

describe('gapScope', () => {
  it('is every feature when none is chosen', () => {
    expect(gapScope([])).toEqual(ALL);
    expect(gapScope(['not-a-term'])).toEqual(ALL);
  });
  it('is the chosen features the glossary knows, in glossary order, once each', () => {
    expect(gapScope(['grab-bar', 'ramp', 'nope', 'ramp'])).toEqual(['ramp', 'grab-bar']);
  });
});

describe('placeGaps', () => {
  it('lists the unknown features in glossary order with the reason', () => {
    const hall = places[3] as Place;
    expect(placeGaps(hall, three, 'en')).toEqual([
      { termId: 'ramp', feature: 'Ramp', reason: 'disagree' },
      { termId: 'elevator', feature: 'Elevator', reason: 'not-usable' },
      { termId: 'grab-bar', feature: 'Grab bar', reason: 'no-record' },
    ]);
  });
  it('leaves out features with something reported, available or not', () => {
    expect(placeGaps(places[0] as Place, three, 'en').map((g) => g.termId)).toEqual(['grab-bar']);
    expect(placeGaps(full, ALL, 'en')).toEqual([]);
  });
  it('treats a record that says unknown as no record', () => {
    expect(placeGaps({ id: 'a', name: 'A', claims: [c('ramp', 'unknown', city)] }, ['ramp'], 'en')[0]?.reason).toBe('no-record');
  });
  it('names features in the language asked for and skips unknown ids', () => {
    expect(placeGaps(places[2] as Place, ['ramp', 'nope'], 'fr')).toEqual([{ termId: 'ramp', feature: 'Rampe', reason: 'no-record' }]);
  });
  it('agrees with the merge used everywhere else', () => {
    for (const place of places) {
      const unknown = mergeClaims(ALL, place.claims).filter((m) => m.status === 'unknown').map((m) => m.termId);
      expect(placeGaps(place, ALL, 'en').map((g) => g.termId), place.id).toEqual(unknown);
    }
  });
});

describe('gapRows', () => {
  it('lists places with something unknown, most unknown first, then in the order given', () => {
    const rows = gapRows(places, three, 'en');
    expect(rows.map((r) => `${r.index}:${r.placeId}:${r.gaps.length}/${r.total}`)).toEqual(['2:cafe:3/3', '3:hall:3/3', '0:lib:1/3']);
  });
  it('leaves out places with nothing unknown', () => {
    expect(gapRows(places, [], 'en').some((r) => r.placeId === 'full')).toBe(false);
    expect(gapRows([full], [], 'en')).toEqual([]);
  });
  it('looks at every feature when none is chosen', () => {
    const rows = gapRows(places, [], 'en');
    expect(rows[0]).toMatchObject({ placeId: 'cafe', total: ALL.length });
    expect(rows[0]?.gaps).toHaveLength(ALL.length);
  });
  it('does not change the places', () => {
    const before = JSON.stringify(places);
    gapRows(places, three, 'fr');
    expect(JSON.stringify(places)).toBe(before);
  });
});

describe('gapTotals', () => {
  it('counts places, unknown features and reasons', () => {
    expect(gapTotals(gapRows(places, three, 'en'))).toEqual({ places: 3, gaps: 7, byReason: { 'no-record': 5, 'not-usable': 1, disagree: 1 } });
    expect(gapTotals([])).toEqual({ places: 0, gaps: 0, byReason: { 'no-record': 0, 'not-usable': 0, disagree: 0 } });
  });
});

describe('texts', () => {
  const rows = gapRows(places, three, 'en');
  it('writes a feature with its reason', () => {
    const hall = rows[1];
    expect(hall?.gaps.map((g) => gapText(g, 'en'))).toEqual(['Ramp (sources disagree)', 'Elevator (a record that cannot be used)', 'Grab bar (no record)']);
  });
  it('writes the place line in both languages', () => {
    expect(gapHeadText(rows[1] as (typeof rows)[number], 'en')).toBe('Hall: 3 of 3 unknown');
    const text = gapHeadText(gapRows(places, three, 'fr')[1] as (typeof rows)[number], 'fr');
    expect(text).toBe('Hall\u00a0: 3 sur 3 UNKNOWN');
    expect(frenchIssues(text)).toEqual([]);
  });
  it('says what is looked at', () => {
    expect(scopeText([], 'en')).toBe('This looks at every feature.');
    expect(scopeText(ALL, 'en')).toBe('This looks at every feature.');
    expect(scopeText(['ramp'], 'en')).toBe('This looks at the 1 feature you chose.');
    expect(scopeText(three, 'fr')).toBe('Cette liste examine les 3 caractéristiques choisies.');
  });
});

describe('show ids', () => {
  it('round-trips and rejects other ids', () => {
    expect(parseGapShowId(gapShowId(5))).toBe(5);
    for (const id of ['gl-gapshow-', 'gl-gapshow-x', 'gl-ageshow-1', '']) expect(parseGapShowId(id)).toBeNull();
  });
});

describe('gapsToText', () => {
  it('lists each place with its unknown features', () => {
    const text = gapsToText(places, three, 'en', today);
    expect(text.startsWith('What is still unknown\nMade on 2026-11-19.\n\nFor each place, these are the features with nothing to report.')).toBe(true);
    expect(text).toContain('This looks at the 3 features you chose.\n7 features are unknown, in 3 places.\n\nCafé <b>: 3 of 3 unknown\n- Ramp (no record)');
    expect(text).toContain('Hall: 3 of 3 unknown\n- Ramp (sources disagree)\n- Elevator (a record that cannot be used)\n- Grab bar (no record)');
    expect(text.endsWith('\n')).toBe(true);
  });
  it('says so for no places, and when nothing is unknown', () => {
    expect(gapsToText([], [], 'en', today)).toBe('What is still unknown\nMade on 2026-11-19.\n\nThere are no places in the list.\n');
    expect(gapsToText([full], [], 'fr', today)).toBe('Ce qui est encore UNKNOWN\nFait le 2026-11-19.\n\nCette liste examine chaque caractéristique.\nChaque lieu a quelque chose de signalé pour chacune de ces caractéristiques.\n');
  });
  it('is not cut short, and names the file by language', () => {
    const many: Place[] = Array.from({ length: MAX_GAP_PLACES_SHOWN + 3 }, (_, i) => ({ id: `p${i}`, name: `Place ${i}`, claims: [] }));
    expect(gapsToText(many, ['ramp'], 'en', today)).toContain(`Place ${MAX_GAP_PLACES_SHOWN + 2}: 1 of 1 unknown`);
    expect(gapsFilename('en')).toBe('still-unknown-en.txt');
    expect(gapsFilename('fr')).toBe('still-unknown-fr.txt');
  });
});

describe('renderGaps', () => {
  it('says so for no places', () => {
    expect(renderGaps([], [], 'en', true)).toBe('<p class="gl-note">There are no places in the list.</p>');
  });
  it('says so when nothing is unknown, with no list and no button', () => {
    const html = renderGaps([full], [], 'en', true);
    expect(html).toBe('<p class="gl-note">This looks at every feature.</p><p role="status">Every place has something reported for each of these features.</p>');
  });
  it('shows the count, each place with a Show button, and each unknown feature with its reason', () => {
    const html = renderGaps(places, three, 'en', false);
    expect(html).toContain('<p role="status">7 features are unknown, in 3 places.</p>');
    expect(html).toContain('<li><strong>Hall: 3 of 3 unknown</strong> <button type="button" class="gl-btn" id="gl-gapshow-3" aria-label="Show Hall in the list">Show</button><ul><li data-reason="disagree">Ramp (sources disagree)</li>');
    expect(html).toContain('<li data-reason="not-usable">Elevator (a record that cannot be used)</li>');
    expect(html.indexOf('Café')).toBeLessThan(html.indexOf('Library'));
    expect(html).not.toContain('Full');
    expect(html).not.toContain(GAPS_EXPORT_ID);
  });
  it('uses the singular for one', () => {
    expect(renderGaps([places[0] as Place], three, 'en', false)).toContain('1 feature is unknown, in 1 place.');
    expect(renderGaps([places[0] as Place], three, 'fr', false)).toContain('1 caractéristique est UNKNOWN, dans 1 lieu.');
  });
  it('escapes names', () => {
    const html = renderGaps(places, three, 'en', false);
    expect(html).toContain('Café &lt;b&gt;: 3 of 3 unknown');
    expect(html).not.toContain('<b>');
  });
  it('has the save button when the host takes files', () => {
    expect(renderGaps(places, three, 'fr', true)).toContain(`id="${GAPS_EXPORT_ID}">Enregistrer cette liste en texte</button>`);
  });
  it('shows at most the limit and says how many more places', () => {
    const html = renderGaps(places, three, 'en', false, 1);
    expect(html.match(/<strong>/g)).toHaveLength(1);
    expect(html).toContain('And 2 more places.');
    expect(html).toContain('7 features are unknown, in 3 places.');
  });
  it('never says a feature is missing or a place is accessible, and uses the token in French', () => {
    const en = renderGaps(places, three, 'en', true);
    expect(en).not.toMatch(/accessible|verif|not available/i);
    const fr = renderGaps(places, three, 'fr', true);
    expect(fr).not.toMatch(/vérif|inconnues?(?![a-zà-ÿ])|non disponible/i);
    expect(fr).toContain('UNKNOWN');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><details><summary>${GAPS_UI[lang].heading}</summary>${renderGaps(places, three, lang, true)}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('GAPS_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = GAPS_UI[lang];
    return [
      ui.heading, ui.intro, ui.scopeAll, ui.scopeChosen(1), ui.scopeChosen(4), ui.noPlaces, ui.none, ui.count(1, 1), ui.count(7, 3), ui.place('Hall', 3, 8),
      ui.reasons['no-record'], ui.reasons['not-usable'], ui.reasons.disagree, ui.gap('Ramp', 'no record'), ui.more(1), ui.more(4), ui.show, ui.showLabel('Hall'), ui.exportList, ui.title, ui.made(today),
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(GAPS_UI.fr)).toEqual(Object.keys(GAPS_UI.en));
    expect(Object.keys(GAPS_UI.fr.reasons)).toEqual(Object.keys(GAPS_UI.en.reasons));
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
