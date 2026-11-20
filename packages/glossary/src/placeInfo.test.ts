import { describe, expect, it } from 'vitest';
import { findBannedCopy } from '../../../qa/src/audit/copy';
import {
  INFOFILTER_IDS,
  INFOFILTER_UI,
  INFOPANEL_UI,
  MAX_AREA_LENGTH,
  NO_INFO_FILTER,
  PLACEINFO_UI,
  PLACE_KINDS,
  UNKNOWN_CHOICE,
  anyInfo,
  areaChoiceValue,
  areaCounts,
  areaFromChoice,
  areaLabel,
  auditHtml,
  cleanArea,
  effectiveInfo,
  frenchIssues,
  infoIsUsable,
  infoKey,
  infoText,
  isNoInfoFilter,
  isPlaceKind,
  kindCounts,
  kindFromChoice,
  kindLabel,
  lintClaims,
  lintCopy,
  matchesInfoFilter,
  placesWithInfo,
  plainLanguageIssues,
  pruneInfoFilter,
  readabilityIssues,
  renderInfoFilter,
  renderInfoLine,
  renderInfoPanel,
  tidyInfo,
  unknownWord,
  withInfo,
  type Lang,
  type Place,
  type PlaceInfo,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const p = (id: string, name: string, info?: PlaceInfo): Place => (info === undefined ? { id, name, claims: [] } : { id, name, claims: [], info });

const places: Place[] = [
  p('lib', 'Library', { kind: 'library', area: 'Riverside', provenance: city }),
  p('cafe', 'Café <b>', { kind: 'cafe', area: 'riverside', provenance: transit }),
  p('pool', 'Pool', { kind: 'recreation', provenance: city }),
  p('hall', 'Hall', { area: 'Old Town', provenance: city }),
  p('shop', 'Shop', { kind: 'shop', area: 'Old Town' }),
  p('odd', 'Odd', { kind: 'castle', area: 'Hilltop', provenance: city }),
  p('bare', 'Bare'),
  p('closed', 'Closed', { kind: 'library', area: 'Riverside', provenance: { ...city, licence: 'Proprietary' } }),
];

describe('kinds of place', () => {
  it('has a name for every kind in both languages', () => {
    for (const lang of ['en', 'fr'] as const) expect(Object.keys(PLACEINFO_UI[lang].kinds)).toEqual([...PLACE_KINDS]);
    expect(new Set(PLACE_KINDS).size).toBe(PLACE_KINDS.length);
    expect(PLACE_KINDS[PLACE_KINDS.length - 1]).toBe('other');
  });
  it('knows a kind from any other value', () => {
    for (const k of PLACE_KINDS) expect(isPlaceKind(k)).toBe(true);
    for (const v of ['', 'Library', 'castle', 'unknown', 3, null, undefined]) expect(isPlaceKind(v)).toBe(false);
  });
  it('names a kind, and says unknown with the token in French', () => {
    expect(kindLabel('library', 'en')).toBe('Library');
    expect(kindLabel('library', 'fr')).toBe('Bibliothèque');
    expect(kindLabel(null, 'en')).toBe('Unknown');
    expect(kindLabel(null, 'fr')).toBe('UNKNOWN');
    expect(areaLabel('', 'fr')).toBe('UNKNOWN');
    expect(areaLabel('Old Town', 'fr')).toBe('Old Town');
    expect(unknownWord('en')).toBe('Unknown');
  });
});

describe('cleanArea and tidyInfo', () => {
  it('tidies spaces and cuts a long area', () => {
    expect(cleanArea('  Old \t Town  ')).toBe('Old Town');
    expect(Array.from(cleanArea('x'.repeat(200)))).toHaveLength(MAX_AREA_LENGTH);
    expect(cleanArea('   ')).toBe('');
  });
  it('leaves out an empty kind or area, and info that holds nothing', () => {
    expect(tidyInfo({ kind: ' library ', area: '  ', provenance: city })).toEqual({ kind: 'library', provenance: city });
    expect(tidyInfo({ kind: '', area: ' Old  Town ' })).toEqual({ area: 'Old Town' });
    expect(tidyInfo({ kind: '', area: '', provenance: city })).toBeUndefined();
    expect(tidyInfo(undefined)).toBeUndefined();
  });
  it('keeps a kind that is not in the list as written, so nothing is lost', () => {
    expect(tidyInfo({ kind: 'castle' })).toEqual({ kind: 'castle' });
  });
  it('gives the same key to the same info and another key to any difference', () => {
    const base: PlaceInfo = { kind: 'library', area: 'Riverside', provenance: city };
    expect(infoKey(base)).toBe(infoKey({ kind: ' library', area: 'Riverside ', provenance: { ...city } }));
    expect(infoKey(undefined)).toBe('');
    expect(infoKey({ kind: '', area: '' })).toBe('');
    for (const other of [{ ...base, kind: 'cafe' }, { ...base, area: 'Old Town' }, { ...base, provenance: transit }, { ...base, provenance: { ...city, date: '2026-10-02' } }, { kind: 'library', area: 'Riverside' }] as PlaceInfo[]) {
      expect(infoKey(other)).not.toBe(infoKey(base));
    }
  });
  it('sets and removes the info of a place without changing the place given', () => {
    const bare = p('a', 'A');
    const set = withInfo(bare, { kind: 'park', provenance: city });
    expect(set).toEqual({ id: 'a', name: 'A', claims: [], info: { kind: 'park', provenance: city } });
    expect(bare).toEqual({ id: 'a', name: 'A', claims: [] });
    expect(withInfo(set, undefined)).toEqual(bare);
    expect('info' in withInfo(set, { kind: '', area: '' })).toBe(false);
  });
});

describe('effectiveInfo', () => {
  it('reports a kind and an area that have a usable source', () => {
    expect(effectiveInfo(places[0] as Place)).toEqual({ kind: 'library', area: 'Riverside', provenance: city });
    expect(effectiveInfo(places[2] as Place)).toEqual({ kind: 'recreation', area: '', provenance: city });
    expect(effectiveInfo(places[3] as Place)).toEqual({ kind: null, area: 'Old Town', provenance: city });
  });
  it('reports nothing without a source, an open licence and a real date', () => {
    const nothing = { kind: null, area: '', provenance: null };
    expect(effectiveInfo(places[4] as Place)).toEqual(nothing);
    expect(effectiveInfo(places[6] as Place)).toEqual(nothing);
    expect(effectiveInfo(places[7] as Place)).toEqual(nothing);
    expect(effectiveInfo(p('x', 'X', { kind: 'library', provenance: { ...city, date: '2026-02-30' } }))).toEqual(nothing);
    expect(effectiveInfo(p('x', 'X', { kind: 'library', provenance: { ...city, source: ' ' } }))).toEqual(nothing);
  });
  it('treats a kind that is not in the list as unknown, and never maps it to a near one', () => {
    expect(effectiveInfo(places[5] as Place)).toEqual({ kind: null, area: 'Hilltop', provenance: city });
    expect(effectiveInfo(p('x', 'X', { kind: 'Library', provenance: city }))).toEqual({ kind: null, area: '', provenance: null });
  });
  it('knows whether info may be reported, and whether any place holds some', () => {
    expect(infoIsUsable((places[0] as Place).info)).toBe(true);
    expect(infoIsUsable((places[4] as Place).info)).toBe(false);
    expect(infoIsUsable(undefined)).toBe(false);
    expect(anyInfo(places)).toBe(true);
    expect(anyInfo([p('a', 'A')])).toBe(false);
    expect(placesWithInfo(places)).toBe(5);
  });
});

describe('infoText and renderInfoLine', () => {
  it('gives the kind, the area and their source', () => {
    expect(infoText(places[0] as Place, 'en')).toBe('Kind of place: Library. Area: Riverside. Source: City open data, dated 2026-10-01.');
    expect(infoText(places[3] as Place, 'en')).toBe('Kind of place: Unknown. Area: Old Town. Source: City open data, dated 2026-10-01.');
  });
  it('says unknown for a place that holds nothing', () => {
    expect(infoText(places[6] as Place, 'en')).toBe('Kind of place: Unknown. Area: Unknown.');
    expect(infoText(places[6] as Place, 'fr')).toBe('Type de lieu\u00a0: UNKNOWN. Secteur\u00a0: UNKNOWN.');
  });
  it('says why when something is held but cannot be reported', () => {
    expect(infoText(places[4] as Place, 'en')).toBe('Kind of place: Unknown. Area: Unknown. A kind or an area is held for this place, but it has no usable source. It is shown as Unknown.');
  });
  it('is French with French spacing', () => {
    const text = infoText(places[0] as Place, 'fr');
    expect(text).toBe('Type de lieu\u00a0: Bibliothèque. Secteur\u00a0: Riverside. Source\u00a0: City open data, date du 2026-10-01.');
    expect(frenchIssues(text)).toEqual([]);
  });
  it('draws one line with what is known marked for styling', () => {
    expect(renderInfoLine(places[0] as Place, 'en')).toBe('<p class="gl-note gl-placeinfo" data-kind="library" data-area="known">Kind of place: Library. Area: Riverside. Source: City open data, dated 2026-10-01.</p>');
    expect(renderInfoLine(places[6] as Place, 'en')).toContain('data-kind="unknown" data-area="unknown"');
  });
  it('escapes an area and a source', () => {
    const html = renderInfoLine(p('x', 'X', { area: '<i>Old</i>', provenance: { ...city, source: 'A & B' } }), 'en');
    expect(html).toContain('Area: &lt;i&gt;Old&lt;/i&gt;. Source: A &amp; B,');
    expect(html).not.toContain('<i>');
  });
});

describe('matchesInfoFilter', () => {
  const ids = (filter: { kind: string; area: string }): string[] => places.filter((x) => matchesInfoFilter(x, filter)).map((x) => x.id);
  it('lets every place through when nothing is chosen', () => {
    expect(ids(NO_INFO_FILTER)).toHaveLength(places.length);
    expect(isNoInfoFilter(NO_INFO_FILTER)).toBe(true);
    expect(isNoInfoFilter({ kind: 'library', area: '' })).toBe(false);
  });
  it('narrows by a kind that may be reported', () => {
    expect(ids({ kind: 'library', area: '' })).toEqual(['lib']);
    expect(ids({ kind: 'shop', area: '' })).toEqual([]);
  });
  it('narrows by an area, without regard to case', () => {
    expect(ids({ kind: '', area: 'Riverside' })).toEqual(['lib', 'cafe']);
    expect(ids({ kind: '', area: 'OLD TOWN' })).toEqual(['hall']);
  });
  it('narrows by both at once', () => {
    expect(ids({ kind: 'cafe', area: 'Riverside' })).toEqual(['cafe']);
    expect(ids({ kind: 'library', area: 'Old Town' })).toEqual([]);
  });
  it('can show only the places whose kind or area is unknown, so they are never lost', () => {
    expect(ids({ kind: UNKNOWN_CHOICE, area: '' })).toEqual(['hall', 'shop', 'odd', 'bare', 'closed']);
    expect(ids({ kind: '', area: UNKNOWN_CHOICE })).toEqual(['pool', 'shop', 'bare', 'closed']);
    expect(ids({ kind: UNKNOWN_CHOICE, area: UNKNOWN_CHOICE })).toEqual(['shop', 'bare', 'closed']);
  });
  it('puts each place under exactly one kind choice and one area choice', () => {
    for (const place of places) {
      const kinds = [...PLACE_KINDS, UNKNOWN_CHOICE].filter((k) => matchesInfoFilter(place, { kind: k, area: '' }));
      expect(kinds, place.id).toHaveLength(1);
    }
    const total = areaCounts(places).reduce((n, a) => n + a.places, 0);
    expect(total).toBe(places.length);
    expect(kindCounts(places).reduce((n, k) => n + k.places, 0)).toBe(places.length);
  });
});

describe('kindCounts and areaCounts', () => {
  it('counts the places of each kind in the order of the list of kinds, then the unknown ones', () => {
    expect(kindCounts(places)).toEqual([
      { kind: 'library', places: 1 },
      { kind: 'cafe', places: 1 },
      { kind: 'recreation', places: 1 },
      { kind: null, places: 5 },
    ]);
  });
  it('counts the places of each area in name order, joining names that differ only by case', () => {
    expect(areaCounts(places)).toEqual([
      { area: 'Hilltop', places: 1 },
      { area: 'Old Town', places: 1 },
      { area: 'Riverside', places: 2 },
      { area: '', places: 4 },
    ]);
  });
  it('has no unknown row when every place is known, and is empty for no places', () => {
    const known = [places[0] as Place];
    expect(kindCounts(known)).toEqual([{ kind: 'library', places: 1 }]);
    expect(areaCounts(known)).toEqual([{ area: 'Riverside', places: 1 }]);
    expect(kindCounts([])).toEqual([]);
    expect(areaCounts([])).toEqual([]);
  });
});

describe('choices of the two lists', () => {
  it('reads a kind only when a place has it', () => {
    expect(kindFromChoice('library', places)).toBe('library');
    expect(kindFromChoice('shop', places)).toBe('');
    expect(kindFromChoice(UNKNOWN_CHOICE, places)).toBe(UNKNOWN_CHOICE);
    expect(kindFromChoice(UNKNOWN_CHOICE, [places[0] as Place])).toBe('');
    for (const v of ['', 'castle', '0', '<x>']) expect(kindFromChoice(v, places)).toBe('');
  });
  it('reads an area from its position among the known areas', () => {
    expect(areaFromChoice('0', places)).toBe('Hilltop');
    expect(areaFromChoice('2', places)).toBe('Riverside');
    expect(areaFromChoice(UNKNOWN_CHOICE, places)).toBe(UNKNOWN_CHOICE);
    for (const v of ['', '3', '-1', 'Riverside', '1.0']) expect(areaFromChoice(v, places), v).toBe('');
    expect(areaFromChoice(UNKNOWN_CHOICE, [places[0] as Place])).toBe('');
  });
  it('writes the position back, so the two agree', () => {
    for (const a of areaCounts(places).filter((x) => x.area !== '')) expect(areaFromChoice(areaChoiceValue(a.area, places), places)).toBe(a.area);
    expect(areaChoiceValue('RIVERSIDE', places)).toBe('2');
    expect(areaChoiceValue('', places)).toBe('');
    expect(areaChoiceValue('Gone', places)).toBe('');
    expect(areaChoiceValue(UNKNOWN_CHOICE, places)).toBe(UNKNOWN_CHOICE);
  });
  it('sets a choice back to any when no place can match it any more', () => {
    const few = [places[0] as Place];
    expect(pruneInfoFilter({ kind: 'cafe', area: 'Riverside' }, few)).toEqual({ kind: '', area: 'Riverside' });
    expect(pruneInfoFilter({ kind: 'library', area: 'Old Town' }, few)).toEqual({ kind: 'library', area: '' });
    expect(pruneInfoFilter({ kind: UNKNOWN_CHOICE, area: UNKNOWN_CHOICE }, few)).toEqual(NO_INFO_FILTER);
    const same = { kind: 'library', area: 'riverside' };
    expect(pruneInfoFilter(same, places)).toBe(same);
    expect(pruneInfoFilter(NO_INFO_FILTER, [])).toBe(NO_INFO_FILTER);
  });
});

describe('renderInfoFilter', () => {
  it('draws nothing when no place holds a kind or an area', () => {
    expect(renderInfoFilter([p('a', 'A')], NO_INFO_FILTER, 'en')).toBe('');
    expect(renderInfoFilter([], NO_INFO_FILTER, 'en')).toBe('');
  });
  it('has two labelled lists, each option with its number of places', () => {
    const html = renderInfoFilter(places, NO_INFO_FILTER, 'en');
    expect(html).toContain('<fieldset class="gl-fieldset gl-infofilter"><legend>Narrow the list by kind and area</legend>');
    expect(html).toContain(`<label for="${INFOFILTER_IDS.kind}">Kind of place to show</label><select id="${INFOFILTER_IDS.kind}" class="gl-select"><option value="" selected>Any kind of place</option><option value="library">Library (1)</option>`);
    expect(html).toContain('<option value="unknown">Kind unknown (5)</option>');
    expect(html).toContain(`<select id="${INFOFILTER_IDS.area}" class="gl-select"><option value="" selected>Any area</option><option value="0">Hilltop (1)</option><option value="1">Old Town (1)</option><option value="2">Riverside (2)</option><option value="unknown">Area unknown (4)</option></select>`);
    expect(html).toContain('<p role="status" data-gl-if-status></p>');
    expect(html).not.toContain(INFOFILTER_IDS.clear);
  });
  it('marks what is chosen, says how many places are left, and offers to show everything', () => {
    const html = renderInfoFilter(places, { kind: 'cafe', area: 'Riverside' }, 'en');
    expect(html).toContain('<option value="cafe" selected>Coffee shop (1)</option>');
    expect(html).toContain('<option value="2" selected>Riverside (2)</option>');
    expect(html).toContain('<p role="status" data-gl-if-status>1 of 8 places are of this kind and in this area.</p>');
    expect(html).toContain(`id="${INFOFILTER_IDS.clear}">Show every kind and area</button>`);
    expect(renderInfoFilter(places, { kind: UNKNOWN_CHOICE, area: '' }, 'fr')).toContain('<option value="unknown" selected>Type UNKNOWN (5)</option>');
  });
  it('never puts an area name in an attribute', () => {
    const odd = [p('x', 'X', { area: '"><script>', provenance: city })];
    const html = renderInfoFilter(odd, NO_INFO_FILTER, 'en');
    expect(html).toContain('<option value="0">&quot;&gt;&lt;script&gt; (1)</option>');
    expect(html).not.toContain('<script>');
  });
  it('says that places with nothing known are kept', () => {
    expect(renderInfoFilter(places, NO_INFO_FILTER, 'en')).toContain('It is never left out.');
    expect(renderInfoFilter(places, NO_INFO_FILTER, 'fr')).toContain('est classé sous UNKNOWN. Il n’est jamais retiré.');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(auditHtml(`<div lang="${lang}">${renderInfoFilter(places, { kind: 'library', area: '' }, lang)}</div>`, 'filter')).toEqual([]);
    }
  });
});

describe('renderInfoPanel', () => {
  it('says so for no places, and when no place has a kind or an area', () => {
    expect(renderInfoPanel([], 'en')).toBe('<p class="gl-note">There are no places in the list.</p>');
    const html = renderInfoPanel([p('a', 'A')], 'en');
    expect(html).toContain('No place has a kind or an area yet.');
    expect(html).not.toContain('<table');
  });
  it('has the count and a captioned table by kind and by area', () => {
    const html = renderInfoPanel(places, 'en');
    expect(html).toContain('<p role="status">5 of 8 places have a kind or an area that can be reported.</p>');
    expect(html).toContain('<caption>How many places there are of each kind</caption>');
    expect(html).toContain('<tr data-row="library"><th scope="row">Library</th><td>1</td></tr>');
    expect(html).toContain('<tr data-row="unknown"><th scope="row">Unknown</th><td>5</td></tr>');
    expect(html).toContain('<caption>How many places there are in each area</caption>');
    expect(html).toContain('<tr data-row="known"><th scope="row">Riverside</th><td>2</td></tr>');
    expect(html.match(/<table/g)).toHaveLength(2);
  });
  it('is in French with the token', () => {
    const html = renderInfoPanel(places, 'fr');
    expect(html).toContain('<th scope="row">UNKNOWN</th><td>5</td>');
    expect(html).toContain('Sinon, il est UNKNOWN.');
    expect(html).not.toMatch(/inconnues?(?![a-zà-ÿ])/i);
  });
  it('escapes area names', () => {
    const html = renderInfoPanel([p('x', 'X', { area: '<i>Old</i>', provenance: city })], 'en');
    expect(html).toContain('&lt;i&gt;Old&lt;/i&gt;');
    expect(html).not.toContain('<i>');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(auditHtml(`<div lang="${lang}"><details><summary>${INFOPANEL_UI[lang].heading}</summary>${renderInfoPanel(places, lang)}</details></div>`, 'panel')).toEqual([]);
    }
  });
});

describe('copy', () => {
  const texts = (lang: Lang): string[] => {
    const a = PLACEINFO_UI[lang];
    const b = INFOFILTER_UI[lang];
    const c = INFOPANEL_UI[lang];
    return [
      ...Object.values(a.kinds), a.line('Library', 'Riverside'), a.from('City open data', '2026-10-01'), a.notUsable,
      b.legend, b.kind, b.area, b.anyKind, b.anyArea, b.unknownKind, b.unknownArea, b.option('Library', 3), b.showing(1, 8), b.clear, b.cleared, b.note,
      c.heading, c.intro, c.none, c.noPlaces, c.kindCaption, c.areaCaption, c.kind, c.area, c.places, c.summary(5, 8),
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(INFOFILTER_UI.fr)).toEqual(Object.keys(INFOFILTER_UI.en));
    expect(Object.keys(INFOPANEL_UI.fr)).toEqual(Object.keys(INFOPANEL_UI.en));
    expect(Object.keys(PLACEINFO_UI.fr)).toEqual(Object.keys(PLACEINFO_UI.en));
  });
  it('passes the copy rules and the shared audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of texts(lang)) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(findBannedCopy(text, 'copy'), text).toEqual([]);
        expect(plainLanguageIssues(text), text).toEqual([]);
        expect(readabilityIssues(text, lang), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
  it('names a kind of place, and gives no advice about care', () => {
    expect(PLACEINFO_UI.en.kinds['health-centre']).toBe('Health centre');
    expect(PLACEINFO_UI.fr.kinds['health-centre']).toBe('Centre de santé');
  });
});
