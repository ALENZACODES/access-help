import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RECORD_VIEW,
  INFO_COLUMNS,
  RECORD_COLUMNS,
  addSnapshot,
  applyRecordView,
  countsInfo,
  creditsText,
  diffCounts,
  diffRecords,
  diffRowText,
  effectiveInfo,
  frenchIssues,
  guideText,
  joinPlaces,
  matchesSnapshot,
  mergeRecords,
  recordsFromCsv,
  recordsToCsv,
  renamePlace,
  snapshotPlaces,
  sourceGroups,
  tidyPlan,
  type FeatureClaim,
  type Place,
  type Provenance,
  type RecordSnapshot,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const town: Provenance = { source: 'Town list', licence: 'CC-BY-4.0', date: '2026-09-01', tier: 'tier-0', url: 'https://example.org/list' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const HEAD = RECORD_COLUMNS.join(',');
const WIDE = [...RECORD_COLUMNS, ...INFO_COLUMNS].join(',');

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city)], info: { kind: 'library', area: 'Riverside', provenance: town } },
  { id: 'cafe', name: 'Café, "Nord"', claims: [], info: { area: 'Old Town' } },
  { id: 'pool', name: 'Pool', claims: [c('elevator', 'absent', city)] },
  { id: 'hall', name: 'Hall', claims: [] },
];

describe('the table of records with a kind and an area', () => {
  it('keeps the old header when no place has a kind or an area', () => {
    const plain = places.slice(2);
    expect(recordsToCsv(plain).split('\r\n')[0]).toBe(HEAD);
    expect(recordsToCsv(plain)).not.toContain('place_kind');
  });
  it('adds two columns when a place has one, and fills them on the place’s own row', () => {
    const lines = recordsToCsv(places).split('\r\n');
    expect(lines[0]).toBe(WIDE);
    expect(lines[1]).toBe('lib,Library,,,Town list,CC-BY-4.0,2026-09-01,tier-0,https://example.org/list,library,Riverside');
    expect(lines[2]).toBe('lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,,,');
    expect(lines[3]).toBe('"Café, ""Nord""",,,,,,,,,Old Town'.replace('"Café', 'cafe,"Café'));
    expect(lines[4]).toBe('pool,Pool,elevator,absent,City open data,CC0-1.0,2026-10-01,tier-1,,,');
    expect(lines[5]).toBe('hall,Hall,,,,,,,,,');
  });
  it('reads the table back to the same places, records, kinds and areas', () => {
    const back = recordsFromCsv(recordsToCsv(places));
    expect(back.problems).toEqual([]);
    expect(back.rejected).toEqual([]);
    expect(back.places).toEqual(places);
    expect(back.records).toBe(2);
  });
  it('reads a table without the two columns exactly as before', () => {
    const back = recordsFromCsv(`${HEAD}\nlib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,\nhall,Hall,,,,,,,\n`);
    expect(back.places).toEqual([{ id: 'lib', name: 'Library', claims: [c('ramp', 'present', city)] }, { id: 'hall', name: 'Hall', claims: [] }]);
    expect(back.places.some((p) => 'info' in p)).toBe(false);
  });
  it('takes the source of a kind and area from the place’s own row, never from a record’s row', () => {
    const csv = [WIDE, 'lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,,library,Riverside', 'lib,Library,,,,,,,,,'].join('\n');
    const back = recordsFromCsv(csv);
    expect(back.places[0]?.info).toBeUndefined();
    expect(back.places[0]?.claims).toHaveLength(1);
  });
  it('keeps a kind and area with no usable source, and reports them as unknown', () => {
    const back = recordsFromCsv([WIDE, 'cafe,Café,,,,,,,,cafe,Old Town'].join('\n'));
    expect(back.places[0]?.info).toEqual({ kind: 'cafe', area: 'Old Town' });
    expect(effectiveInfo(back.places[0] as Place)).toEqual({ kind: null, area: '', provenance: null });
  });
  it('keeps a kind that is not in the list as written, and reports it as unknown', () => {
    const back = recordsFromCsv([WIDE, 'x,X,,,City open data,CC0-1.0,2026-10-01,tier-1,,castle,Hilltop'].join('\n'));
    expect(back.places[0]?.info?.kind).toBe('castle');
    expect(effectiveInfo(back.places[0] as Place)).toEqual({ kind: null, area: 'Hilltop', provenance: city });
    expect(recordsToCsv(back.places)).toContain(',castle,Hilltop');
  });
  it('leaves out a second row that gives the place another kind or area, and accepts the same one twice', () => {
    const row = 'lib,Library,,,City open data,CC0-1.0,2026-10-01,tier-1,,library,Riverside';
    const back = recordsFromCsv([WIDE, row, row, 'lib,Library,,,City open data,CC0-1.0,2026-10-01,tier-1,,cafe,Riverside'].join('\n'));
    expect(back.rejected).toEqual([{ line: 4, reason: 'info-conflict' }]);
    expect(back.places[0]?.info?.kind).toBe('library');
  });
  it('accepts either column on its own', () => {
    const back = recordsFromCsv([`${HEAD},place_area`, 'lib,Library,,,City open data,CC0-1.0,2026-10-01,tier-1,,Riverside'].join('\n'));
    expect(back.places[0]?.info).toEqual({ area: 'Riverside', provenance: city });
  });
  it('guards a kind or an area that a spreadsheet could run, and reads it back', () => {
    const risky: Place[] = [{ id: 'x', name: 'X', claims: [], info: { area: '=SUM(A1)', provenance: city } }];
    const csv = recordsToCsv(risky);
    expect(csv).toContain(",'=SUM(A1)");
    expect(recordsFromCsv(csv).places).toEqual(risky);
  });
  it('explains the two columns and lists the kinds in the guide', () => {
    const text = guideText('en');
    expect(text).toContain('- place_kind (optional): The id of a kind of place from the list below. Fill it on a row with no feature.');
    expect(text).toContain('- place_area (optional): The town or neighbourhood of the place.');
    expect(text).toContain('Kinds of place:\n- library (Library)\n');
    const fr = guideText('fr');
    expect(fr).toContain('- place_kind (facultatif)\u00a0: L’identifiant d’un type de lieu');
    expect(fr).toContain('Types de lieu\u00a0:\n- library (Bibliothèque)\n');
  });
});

describe('copies of the records keep the kind and area', () => {
  const snapshot = addSnapshot([], 'Before', places, today).snapshots[0] as RecordSnapshot;
  it('gives them back', () => {
    expect(snapshotPlaces(snapshot)).toEqual(places);
    expect(matchesSnapshot(snapshot, places)).toBe(true);
  });
  it('sees a changed kind or area as a difference', () => {
    const changed = places.map((p) => (p.id === 'lib' ? { ...p, info: { ...p.info, kind: 'cafe' } } : p));
    expect(matchesSnapshot(snapshot, changed)).toBe(false);
    const without = places.map(({ info: _info, ...rest }) => rest);
    expect(matchesSnapshot(snapshot, without)).toBe(false);
  });
});

describe('differences in kind and area', () => {
  const after: Place[] = places.map((p) => {
    if (p.id === 'lib') return { ...p, info: { kind: 'community-centre', area: 'Riverside', provenance: town } };
    if (p.id === 'hall') return { ...p, info: { kind: 'government', provenance: city } };
    if (p.id === 'cafe') return { id: p.id, name: p.name, claims: p.claims };
    return p;
  });
  const rows = diffRecords(places, after, 'en');
  it('finds a kind or area that was changed, added or removed', () => {
    expect(rows.map((r) => `${r.kind}:${r.placeId}`)).toEqual(['place-info:lib', 'place-info:cafe', 'place-info:hall']);
    expect(diffCounts(rows)['place-info']).toBe(3);
  });
  it('gives the kind and area before and now', () => {
    expect(diffRowText(rows[0] as (typeof rows)[number], 'en')).toBe(
      'Kind or area changed for Library. Before: Kind of place: Library. Area: Riverside. Source: Town list, dated 2026-09-01. Now: Kind of place: Community centre. Area: Riverside. Source: Town list, dated 2026-09-01.',
    );
    expect(diffRowText(rows[2] as (typeof rows)[number], 'en')).toContain('Before: Kind of place: Unknown. Area: Unknown. Now: Kind of place: Government office. Area: Unknown.');
  });
  it('is French with French spacing', () => {
    const fr = diffRecords(places, after, 'fr');
    const text = diffRowText(fr[0] as (typeof fr)[number], 'fr');
    expect(text).toContain('Type ou secteur modifié pour Library. Avant\u00a0: Type de lieu\u00a0: Bibliothèque.');
    expect(frenchIssues(text)).toEqual([]);
  });
  it('finds nothing when only the spacing of an area differs', () => {
    const spaced = places.map((p) => (p.id === 'lib' ? { ...p, info: { ...p.info, area: ' Riverside ' } } : p));
    expect(diffRecords(places, spaced, 'en')).toEqual([]);
  });
});

describe('other changes to places keep the kind and area', () => {
  it('keeps them when a place is renamed', () => {
    const result = renamePlace(places, 0, 'Main Library');
    expect(result.places[0]?.info).toEqual((places[0] as Place).info);
  });
  it('keeps those of the entry that stays when two entries are joined', () => {
    const two: Place[] = [places[0] as Place, { id: 'lib2', name: 'Library', claims: [c('elevator', 'present', city)], info: { kind: 'cafe', provenance: city } }];
    const joined = joinPlaces(two, [0, 1]);
    expect(joined.places).toHaveLength(1);
    expect(joined.places[0]?.info).toEqual((places[0] as Place).info);
    expect(joined.places[0]?.claims).toHaveLength(2);
  });
  it('takes those of the joined entry when the entry that stays has none', () => {
    const two: Place[] = [{ id: 'a', name: 'Hall', claims: [] }, { id: 'b', name: 'Hall', claims: [], info: { kind: 'government', provenance: city } }];
    expect(joinPlaces(two, [0, 1]).places[0]?.info).toEqual({ kind: 'government', provenance: city });
    const none: Place[] = [{ id: 'a', name: 'Hall', claims: [c('ramp', 'present', city)] }, { id: 'b', name: 'Hall', claims: [c('elevator', 'present', city)] }];
    expect('info' in (joinPlaces(none, [0, 1]).places[0] as Place)).toBe(false);
  });
  it('keeps those held when a table is added, and takes them from the table for a place that has none', () => {
    const incoming: Place[] = [
      { id: 'lib', name: 'Library', claims: [], info: { kind: 'cafe', provenance: city } },
      { id: 'hall', name: 'Hall', claims: [], info: { kind: 'government', provenance: city } },
      { id: 'new', name: 'New', claims: [], info: { area: 'Hilltop', provenance: city } },
    ];
    const merged = mergeRecords(places, incoming);
    const byId = new Map(merged.places.map((p) => [p.id, p] as const));
    expect(byId.get('lib')?.info?.kind).toBe('library');
    expect(byId.get('hall')?.info).toEqual({ kind: 'government', provenance: city });
    expect(byId.get('new')?.info).toEqual({ area: 'Hilltop', provenance: city });
    expect(byId.get('pool')).toBe(places[2]);
    expect(merged.addedPlaces).toBe(1);
  });
  it('gives back the same list when a table adds nothing, kind and area included', () => {
    expect(mergeRecords(places, [places[0] as Place]).places).toBe(places);
  });
  it('keeps them when records are tidied away', () => {
    const plan = tidyPlan(places, 'source', today, 'City open data');
    expect(plan.places.find((p) => p.id === 'lib')?.info).toEqual((places[0] as Place).info);
    expect(plan.places.find((p) => p.id === 'lib')?.claims).toEqual([]);
  });
});

describe('the kind and area follow the choices about which records count', () => {
  it('counts them under the default view', () => {
    expect(applyRecordView(places, DEFAULT_RECORD_VIEW)).toBe(places);
    expect(countsInfo({ kind: 'library', provenance: town }, DEFAULT_RECORD_VIEW)).toBe(true);
  });
  it('leaves them out when their source is left out, and keeps the place', () => {
    const view = { tier: 'all' as const, hiddenSources: ['Town list'] };
    const shown = applyRecordView(places, view);
    expect(shown).toHaveLength(places.length);
    expect('info' in (shown[0] as Place)).toBe(false);
    expect(shown[0]?.claims).toEqual((places[0] as Place).claims);
    expect(effectiveInfo(shown[0] as Place).kind).toBeNull();
    expect((places[0] as Place).info?.kind).toBe('library');
  });
  it('leaves them out when their tier is', () => {
    const shown = applyRecordView(places, { tier: 'tier-1', hiddenSources: [] });
    expect('info' in (shown[0] as Place)).toBe(false);
    expect(countsInfo({ kind: 'library', provenance: city }, { tier: 'tier-1', hiddenSources: [] })).toBe(true);
    expect(countsInfo({ area: 'Old Town' }, { tier: 'shown', hiddenSources: [] })).toBe(false);
  });
  it('keeps a place that loses nothing as the same object', () => {
    const shown = applyRecordView(places, { tier: 'all', hiddenSources: ['Nobody'] });
    expect(shown).toBe(places);
  });
});

describe('credits', () => {
  it('credit the source of a kind and area, also when it gave no record about a feature', () => {
    const groups = sourceGroups(places);
    const townGroup = groups.find((g) => g.source === 'Town list');
    expect(townGroup).toMatchObject({ licence: 'CC-BY-4.0', records: 0, places: 1, newest: '2026-09-01' });
    expect(creditsText(groups, 'en', today)).toContain('Town list');
  });
  it('do not credit a kind and area that cannot be reported', () => {
    const only: Place[] = [{ id: 'x', name: 'X', claims: [], info: { kind: 'library', provenance: { ...town, licence: 'Proprietary' } } }];
    expect(sourceGroups(only)).toEqual([]);
    expect(sourceGroups([places[1] as Place])).toEqual([]);
  });
  it('count a place once when the same source gave both a record and the kind', () => {
    const both: Place[] = [{ id: 'x', name: 'X', claims: [c('ramp', 'present', city)], info: { kind: 'library', provenance: city } }];
    expect(sourceGroups(both)[0]).toMatchObject({ source: 'City open data', records: 1, places: 1 });
  });
});
