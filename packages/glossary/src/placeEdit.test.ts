import { describe, expect, it } from 'vitest';
import {
  MAX_PLACE_NAME,
  PLACEEDIT_UI,
  auditHtml,
  cleanPlaceName,
  duplicateGroups,
  frenchIssues,
  joinId,
  joinPlaces,
  lintClaims,
  lintCopy,
  parseJoinId,
  parseRenameButtonId,
  plainLanguageIssues,
  readabilityIssues,
  renameButtonId,
  renameInputId,
  renameMessage,
  renamePlace,
  renderDuplicates,
  renderRename,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const town: Provenance = { source: 'Town list', licence: 'CC-BY-4.0', date: '2026-01-01' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city)] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
  { id: 'lib-2', name: 'library', claims: [c('ramp', 'present', city), c('elevator', 'absent', town)] },
  { id: 'cafe-2', name: 'Cafe nord', claims: [c('ramp', 'present', town)] },
  { id: 'lib-3', name: ' LIBRARY ', claims: [c('grab-bar', 'unknown')] },
  { id: 'pool', name: 'Pool', claims: [] },
];

describe('renamePlace', () => {
  it('gives a place another name and leaves the rest as they were', () => {
    const r = renamePlace(places, 5, '  Aquatic   Centre ');
    expect(r.outcome).toBe('renamed');
    expect(r.name).toBe('Aquatic Centre');
    expect(r.places[5]).toEqual({ id: 'pool', name: 'Aquatic Centre', claims: [] });
    expect(r.places[0]).toBe(places[0]);
  });
  it('keeps the id and the records', () => {
    const r = renamePlace(places, 0, 'Main Library');
    expect(r.places[0]?.id).toBe('lib');
    expect(r.places[0]?.claims).toBe(places[0]?.claims);
  });
  it('lets a place change only the case or accents of its own name', () => {
    expect(renamePlace([{ id: 'p', name: 'cafe', claims: [] }], 0, 'Café').outcome).toBe('renamed');
  });
  it('refuses an empty or too long name', () => {
    expect(renamePlace(places, 5, '   ').outcome).toBe('empty');
    expect(renamePlace(places, 5, 'x'.repeat(MAX_PLACE_NAME + 1)).outcome).toBe('too-long');
    expect(renamePlace(places, 5, 'x'.repeat(MAX_PLACE_NAME)).outcome).toBe('renamed');
  });
  it('says so when the name is the one it has', () => {
    const r = renamePlace(places, 5, 'Pool');
    expect(r.outcome).toBe('same');
    expect(r.places).toBe(places);
  });
  it('refuses a name another place has, whatever the case or accents', () => {
    for (const name of ['Café Nord', 'cafe nord', 'CAFÉ NORD']) expect(renamePlace(places, 5, name).outcome, name).toBe('taken');
  });
  it('says so for a place that is not there', () => {
    expect(renamePlace(places, 99, 'X')).toEqual({ outcome: 'missing', places, name: 'X' });
  });
  it('does not change the list it was given', () => {
    const copy = JSON.stringify(places);
    renamePlace(places, 5, 'New');
    expect(JSON.stringify(places)).toBe(copy);
  });
  it('cleans names', () => {
    expect(cleanPlaceName(' a \n b ')).toBe('a b');
  });
});

describe('duplicateGroups', () => {
  it('groups entries with the same name, whatever the case, accents or outer spaces', () => {
    expect(duplicateGroups(places)).toEqual([
      { name: 'Library', indexes: [0, 2, 4] },
      { name: 'Café Nord', indexes: [1, 3] },
    ]);
  });
  it('is empty when every name is listed once', () => {
    expect(duplicateGroups([places[0] as Place, places[5] as Place])).toEqual([]);
    expect(duplicateGroups([])).toEqual([]);
  });
  it('ignores places with an empty name', () => {
    expect(duplicateGroups([{ id: 'a', name: '', claims: [] }, { id: 'b', name: ' ', claims: [] }])).toEqual([]);
  });
});

describe('joinPlaces', () => {
  it('joins the entries into the first, keeping every record once', () => {
    const r = joinPlaces(places, [0, 2, 4]);
    expect(r).toMatchObject({ joined: 2, moved: 2, same: 1 });
    expect(r.places.map((p) => p.id)).toEqual(['lib', 'cafe', 'cafe-2', 'pool']);
    expect(r.places[0]?.name).toBe('Library');
    expect(r.places[0]?.claims).toEqual([c('ramp', 'present', city), c('elevator', 'absent', town), c('grab-bar', 'unknown')]);
  });
  it('drops no record that a source reported', () => {
    const r = joinPlaces(places, [1, 3]);
    const all = r.places.flatMap((p) => p.claims);
    for (const p of places) for (const claim of p.claims) expect(all).toContainEqual(claim);
  });
  it('keeps the first entry whatever the order given, and ignores repeats', () => {
    const r = joinPlaces(places, [4, 0, 4, 2]);
    expect(r.places[0]?.id).toBe('lib');
    expect(r.joined).toBe(2);
  });
  it('leaves other places as the same objects', () => {
    const r = joinPlaces(places, [0, 2]);
    expect(r.places[1]).toBe(places[1]);
  });
  it('returns the same list when there is nothing to join', () => {
    for (const idx of [[], [0], [0, 99], [99, 98], [0, 0], [1.5, 2]]) expect(joinPlaces(places, idx).places, String(idx)).toBe(places);
  });
  it('does not change the list it was given', () => {
    const copy = JSON.stringify(places);
    joinPlaces(places, [0, 2, 4]);
    expect(JSON.stringify(places)).toBe(copy);
  });
  it('leaves no name listed twice after every group is joined', () => {
    let list: readonly Place[] = places;
    for (let guard = 0; guard < 5 && duplicateGroups(list).length > 0; guard += 1) list = joinPlaces(list, duplicateGroups(list)[0]?.indexes ?? []).places;
    expect(duplicateGroups(list)).toEqual([]);
    expect(list).toHaveLength(3);
  });
});

describe('messages and ids', () => {
  it('says what happened to a rename', () => {
    expect(renameMessage(renamePlace(places, 5, 'Aquatic Centre'), 'Pool', 'en')).toBe('Renamed Pool to Aquatic Centre.');
    expect(renameMessage(renamePlace(places, 5, 'Café Nord'), 'Pool', 'en')).toBe(PLACEEDIT_UI.en.outcomes.taken);
    expect(renameMessage(renamePlace(places, 5, ''), 'Pool', 'fr')).toBe(PLACEEDIT_UI.fr.outcomes.empty);
    expect(renameMessage(renamePlace(places, 5, 'Piscine'), 'Pool', 'fr')).toBe('Pool a été renommé Piscine.');
  });
  it('round-trips its ids', () => {
    expect(parseRenameButtonId(renameButtonId(7))).toBe(7);
    expect(parseJoinId(joinId(3))).toBe(3);
    for (const id of ['', 'gl-rename-1', 'gl-renamebtn-', 'gl-renamebtn-x']) expect(parseRenameButtonId(id), id).toBeNull();
    for (const id of ['', 'gl-join-', 'gl-join-x', 'gl-rrm-1-2']) expect(parseJoinId(id), id).toBeNull();
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const html of [renderRename(2, 'Café <Nord>', lang), renderDuplicates(places, lang, true), renderDuplicates(places, lang, false), renderDuplicates([], lang, true)]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'edit')).toEqual([]);
    }
  });
  it('has a closed block with a labelled box holding the name, and a named button', () => {
    const html = renderRename(2, 'Library', 'en');
    expect(html.startsWith('<details class="gl-rename"><summary>Change the name</summary>')).toBe(true);
    expect(html).toContain(`<label for="${renameInputId(2)}">New name for Library</label>`);
    expect(html).toContain(`maxlength="${MAX_PLACE_NAME}" autocomplete="off" value="Library"`);
    expect(html).toContain('id="gl-renamebtn-2" aria-label="Rename place: Library">Rename place</button>');
  });
  it('escapes the name', () => {
    expect(renderRename(0, '"><script>', 'en')).not.toContain('<script>');
    expect(renderDuplicates([{ id: 'a', name: '<b>x</b>', claims: [] }, { id: 'b', name: '<b>X</b>', claims: [] }], 'en', true)).not.toContain('<b>x');
  });
  it('lists each name that is there more than once, with how many entries', () => {
    const html = renderDuplicates(places, 'en', false);
    expect(html).toContain('<li>Library: 3 entries</li><li>Café Nord: 2 entries</li>');
    expect(html).not.toContain('gl-join-');
  });
  it('has a Join button for each group when the host keeps records', () => {
    const html = renderDuplicates(places, 'en', true);
    expect(html).toContain('id="gl-join-0" aria-label="Join the entries for Library">Join the entries</button>');
    expect(html).toContain('id="gl-join-1"');
  });
  it('says so when no name is listed twice', () => {
    expect(renderDuplicates([], 'en', true)).toContain(PLACEEDIT_UI.en.dupNone);
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = PLACEEDIT_UI[lang];
    const texts = [
      ui.renameSummary, ui.renameLabel('Library'), ui.rename, ui.renameButton('Library'), ui.renamed('Pool', 'Library'), ...Object.values(ui.outcomes),
      ui.dupHeading, ui.dupIntro, ui.dupNone, ui.dupLine('Library', 3), ui.join, ui.joinLabel('Library'), ui.joined('Library', 2),
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
