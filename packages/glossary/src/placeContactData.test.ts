import { describe, expect, it } from 'vitest';
import {
  CONTACT_COLUMNS,
  DEFAULT_RECORD_VIEW,
  INFO_COLUMNS,
  RECORD_COLUMNS,
  addSnapshot,
  applyRecordView,
  contactFromTags,
  convertOsm,
  creditsText,
  diffCounts,
  diffRecords,
  diffRowText,
  effectiveContact,
  guideText,
  joinPlaces,
  matchesSnapshot,
  mergeRecords,
  osmToPlaces,
  recordsFromCsv,
  rejectText,
  recordsToCsv,
  renamePlace,
  snapshotPlaces,
  sourceGroups,
  tidyPlan,
  type FeatureClaim,
  type OsmElement,
  type Place,
  type PlaceContact,
  type Provenance,
  type RecordSnapshot,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const town: Provenance = { source: 'Town list', licence: 'CC-BY-4.0', date: '2026-09-01', tier: 'tier-0', url: 'https://example.org/list' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const reach: PlaceContact = { address: '1 Main Street, Riverside', phone: '416 555 0100', website: 'https://library.example.org', email: 'info@library.example.org', provenance: town };
const HEAD = RECORD_COLUMNS.join(',');
const WIDE = [...RECORD_COLUMNS, ...INFO_COLUMNS, ...CONTACT_COLUMNS].join(',');

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city)], info: { kind: 'library', area: 'Riverside', provenance: town }, contact: reach },
  { id: 'cafe', name: 'Café, "Nord"', claims: [], contact: { phone: '+1 416 555 0199' } },
  { id: 'pool', name: 'Pool', claims: [c('elevator', 'absent', city)], info: { kind: 'recreation', provenance: city }, contact: { website: 'https://pool.example.org', provenance: town } },
  { id: 'hall', name: 'Hall', claims: [] },
];

describe('the table of records with contact details', () => {
  it('keeps the header it had when no place has contact details', () => {
    expect(recordsToCsv([places[3] as Place]).split('\r\n')[0]).toBe(HEAD);
    const infoOnly = [{ ...(places[0] as Place), contact: undefined }].map(({ contact: _c, ...rest }) => rest);
    expect(recordsToCsv(infoOnly).split('\r\n')[0]).toBe([...RECORD_COLUMNS, ...INFO_COLUMNS].join(','));
  });
  it('adds four columns when a place has some, without the kind and area columns when no place has those', () => {
    const lines = recordsToCsv([places[1] as Place]).split('\r\n');
    expect(lines[0]).toBe([...RECORD_COLUMNS, ...CONTACT_COLUMNS].join(','));
    // A number that starts with + is guarded like any cell a spreadsheet could run, and reads back as written.
    expect(lines[1]).toBe('cafe,"Café, ""Nord""",,,,,,,,,\'+1 416 555 0199,,');
    expect(recordsFromCsv(recordsToCsv([places[1] as Place])).places).toEqual([places[1]]);
  });
  it('puts the kind, area and contact on one row when they share a source', () => {
    const lines = recordsToCsv(places).split('\r\n');
    expect(lines[0]).toBe(WIDE);
    expect(lines[1]).toBe('lib,Library,,,Town list,CC-BY-4.0,2026-09-01,tier-0,https://example.org/list,library,Riverside,"1 Main Street, Riverside",416 555 0100,https://library.example.org,info@library.example.org');
    expect(lines[2]).toBe('lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,,,,,,,');
  });
  it('gives the contact a row of its own when its source is another one', () => {
    const lines = recordsToCsv(places).split('\r\n');
    expect(lines[4]).toBe('pool,Pool,,,City open data,CC0-1.0,2026-10-01,tier-1,,recreation,,,,,');
    expect(lines[5]).toBe('pool,Pool,,,Town list,CC-BY-4.0,2026-09-01,tier-0,https://example.org/list,,,,,https://pool.example.org,');
    expect(lines[6]).toBe('pool,Pool,elevator,absent,City open data,CC0-1.0,2026-10-01,tier-1,,,,,,,');
    expect(lines[7]).toBe('hall,Hall,,,,,,,,,,,,,');
  });
  it('reads the table back to the same places, records, kinds, areas and contact details', () => {
    const back = recordsFromCsv(recordsToCsv(places));
    expect(back.problems).toEqual([]);
    expect(back.rejected).toEqual([]);
    expect(back.places).toEqual(places);
    expect(back.records).toBe(2);
  });
  it('reads a table without the four columns exactly as before', () => {
    const back = recordsFromCsv(`${HEAD}\nlib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,\n`);
    expect(back.places.some((p) => 'contact' in p)).toBe(false);
  });
  it('takes the source of contact details from the place’s own row, never from a record’s row', () => {
    const csv = [WIDE, 'lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,,,,1 Main Street,416 555 0100,,'].join('\n');
    const back = recordsFromCsv(csv);
    expect(back.places[0]?.contact).toBeUndefined();
    expect(back.places[0]?.claims).toHaveLength(1);
  });
  it('keeps contact details with no usable source, or not well formed, as written, and shows them as unknown', () => {
    const back = recordsFromCsv([WIDE, 'cafe,Café,,,,,,,,,,,call us,www.cafe.example,'].join('\n'));
    expect(back.places[0]?.contact).toEqual({ phone: 'call us', website: 'www.cafe.example' });
    expect(effectiveContact(back.places[0] as Place).provenance).toBeNull();
    const sourced = recordsFromCsv([WIDE, 'cafe,Café,,,City open data,CC0-1.0,2026-10-01,,,,,,call us,https://cafe.example.org,'].join('\n'));
    expect(effectiveContact(sourced.places[0] as Place)).toMatchObject({ phone: '', website: 'https://cafe.example.org' });
    expect(recordsToCsv(sourced.places)).toContain(',call us,https://cafe.example.org,');
  });
  it('leaves out a later row that gives the place other contact details, and accepts the same ones twice', () => {
    const row = 'lib,Library,,,City open data,CC0-1.0,2026-10-01,tier-1,,,,1 Main Street,416 555 0100,,';
    const back = recordsFromCsv([WIDE, row, row, 'lib,Library,,,City open data,CC0-1.0,2026-10-01,tier-1,,,,2 Other Street,,,'].join('\n'));
    expect(back.rejected).toEqual([{ line: 4, reason: 'contact-conflict' }]);
    expect(back.places[0]?.contact?.address).toBe('1 Main Street');
  });
  it('reads the kind on one row and the contact on another without a conflict', () => {
    const back = recordsFromCsv([WIDE, 'pool,Pool,,,City open data,CC0-1.0,2026-10-01,tier-1,,recreation,,,,,', 'pool,Pool,,,Town list,CC-BY-4.0,2026-09-01,tier-0,https://example.org/list,,,,,https://pool.example.org,'].join('\n'));
    expect(back.rejected).toEqual([]);
    expect(back.places[0]).toEqual({ id: 'pool', name: 'Pool', claims: [], info: { kind: 'recreation', provenance: city }, contact: { website: 'https://pool.example.org', provenance: town } });
  });
  it('guards a detail a spreadsheet could run, and reads it back', () => {
    const risky: Place[] = [{ id: 'x', name: 'X', claims: [], contact: { phone: '+1 416 555 0100', address: '=SUM(A1)', provenance: city } }];
    const csv = recordsToCsv(risky);
    expect(csv).toContain(",'=SUM(A1),'+1 416 555 0100,");
    expect(recordsFromCsv(csv).places).toEqual(risky);
  });
  it('has words for a row left out over contact details, in both languages', () => {
    expect(rejectText('contact-conflict', 'en')).toBe('The place already has other contact details on an earlier row.');
    expect(rejectText('contact-conflict', 'fr')).toBe('Le lieu a déjà d’autres coordonnées sur une ligne précédente.');
    expect(rejectText('contact-conflict', 'en')).not.toBe(rejectText('info-conflict', 'en'));
  });
  it('counts contact details among what a table adds, so a table that only brings them is not ignored', () => {
    const held: Place[] = [{ id: 'hall', name: 'Hall', claims: [] }];
    const merged = mergeRecords(held, [{ id: 'hall', name: 'Hall', claims: [], contact: { phone: '416 555 0100', provenance: city } }]);
    expect(merged.places).not.toBe(held);
    expect(merged.places[0]?.contact?.phone).toBe('416 555 0100');
    expect(merged.addedRecords).toBe(0);
  });
  it('explains the four columns in the guide', () => {
    const text = guideText('en');
    expect(text).toContain('- place_address (optional): The street address of the place. Fill it on a row with no feature.');
    expect(text).toContain('- place_website (optional): The website of the place, as a full address that starts with https.');
    expect(guideText('fr')).toContain('- place_email (facultatif)\u00a0: L’adresse de courriel du lieu.');
  });
});

describe('copies of the records keep the contact details', () => {
  const snapshot = addSnapshot([], 'Before', places, today).snapshots[0] as RecordSnapshot;
  it('gives them back, and sees a change as a difference', () => {
    expect(snapshotPlaces(snapshot)).toEqual(places);
    expect(matchesSnapshot(snapshot, places)).toBe(true);
    const changed = places.map((p) => (p.id === 'lib' ? { ...p, contact: { ...reach, phone: '416 555 0101' } } : p));
    expect(matchesSnapshot(snapshot, changed)).toBe(false);
  });
});

describe('differences in contact details', () => {
  const after: Place[] = places.map((p) => {
    if (p.id === 'lib') return { ...p, contact: { ...reach, phone: '416 555 0101' } };
    if (p.id === 'hall') return { ...p, contact: { email: 'hall@example.org', provenance: city } };
    if (p.id === 'pool') {
      const { contact: _c, ...rest } = p;
      return rest;
    }
    return p;
  });
  const rows = diffRecords(places, after, 'en');
  it('finds contact details that were changed, added or removed', () => {
    expect(rows.map((r) => `${r.kind}:${r.placeId}`)).toEqual(['place-contact:lib', 'place-contact:pool', 'place-contact:hall']);
    expect(diffCounts(rows)['place-contact']).toBe(3);
  });
  it('gives the details before and now, with Unknown where there are none', () => {
    const text = diffRowText(rows[0] as (typeof rows)[number], 'en');
    expect(text.startsWith('Contact details changed for Library. Before: Address: 1 Main Street, Riverside. Phone: 416 555 0100.')).toBe(true);
    expect(text).toContain(' Now: Address: 1 Main Street, Riverside. Phone: 416 555 0101.');
    expect(diffRowText(rows[2] as (typeof rows)[number], 'en')).toBe(
      'Contact details changed for Hall. Before: Address: Unknown. Phone: Unknown. Website: Unknown. Email: Unknown. Now: Address: Unknown. Phone: Unknown. Website: Unknown. Email: hall@example.org. Source: City open data, dated 2026-10-01.',
    );
  });
  it('is French, and leaves a web address as it is written', () => {
    const fr = diffRecords(places, after, 'fr');
    const text = diffRowText(fr[1] as (typeof fr)[number], 'fr');
    expect(text.startsWith('Coordonnées modifiées pour Pool. Avant\u00a0: Adresse\u00a0: UNKNOWN. Téléphone\u00a0: UNKNOWN. Site Web\u00a0: https://pool.example.org.')).toBe(true);
    expect(text).toContain('Maintenant\u00a0: Adresse\u00a0: UNKNOWN.');
  });
  it('finds nothing when only the spacing differs', () => {
    const spaced = places.map((p) => (p.id === 'lib' ? { ...p, contact: { ...reach, address: ' 1 Main  Street, Riverside ' } } : p));
    expect(diffRecords(places, spaced, 'en')).toEqual([]);
  });
});

describe('other changes to places keep the contact details', () => {
  it('keeps them when a place is renamed', () => {
    expect(renamePlace(places, 0, 'Main Library').places[0]?.contact).toEqual(reach);
  });
  it('keeps those of the entry that stays when two entries are joined, with its kind and area', () => {
    const two: Place[] = [places[0] as Place, { id: 'lib2', name: 'Library', claims: [c('elevator', 'present', city)], contact: { phone: '416 555 0199', provenance: city } }];
    const joined = joinPlaces(two, [0, 1]);
    expect(joined.places).toHaveLength(1);
    expect(joined.places[0]?.contact).toEqual(reach);
    expect(joined.places[0]?.info).toEqual((places[0] as Place).info);
    expect(joined.places[0]?.claims).toHaveLength(2);
  });
  it('takes those of the joined entry when the entry that stays has none', () => {
    const two: Place[] = [{ id: 'a', name: 'Hall', claims: [] }, { id: 'b', name: 'Hall', claims: [], contact: { phone: '416 555 0199', provenance: city } }];
    expect(joinPlaces(two, [0, 1]).places[0]).toEqual({ id: 'a', name: 'Hall', claims: [], contact: { phone: '416 555 0199', provenance: city } });
    const none: Place[] = [{ id: 'a', name: 'Hall', claims: [c('ramp', 'present', city)] }, { id: 'b', name: 'Hall', claims: [c('elevator', 'present', city)] }];
    expect('contact' in (joinPlaces(none, [0, 1]).places[0] as Place)).toBe(false);
  });
  it('keeps those held when a table is added, and takes them from the table for a place that has none', () => {
    const incoming: Place[] = [
      { id: 'lib', name: 'Library', claims: [], contact: { phone: '000 000 0000', provenance: city } },
      { id: 'hall', name: 'Hall', claims: [], contact: { email: 'hall@example.org', provenance: city } },
      { id: 'new', name: 'New', claims: [], contact: { phone: '416 555 0123', provenance: city } },
    ];
    const merged = mergeRecords(places, incoming);
    const byId = new Map(merged.places.map((p) => [p.id, p] as const));
    expect(byId.get('lib')?.contact).toEqual(reach);
    expect(byId.get('lib')?.info).toEqual((places[0] as Place).info);
    expect(byId.get('hall')?.contact).toEqual({ email: 'hall@example.org', provenance: city });
    expect(byId.get('new')?.contact?.phone).toBe('416 555 0123');
    expect(byId.get('pool')).toBe(places[2]);
  });
  it('gives back the same list when a table adds nothing, contact included', () => {
    expect(mergeRecords(places, [places[0] as Place]).places).toBe(places);
  });
  it('keeps them when records are tidied away', () => {
    const plan = tidyPlan(places, 'source', today, 'City open data');
    expect(plan.places.find((p) => p.id === 'lib')?.contact).toEqual(reach);
  });
});

describe('the contact details follow the choices about which records count', () => {
  it('counts them under the default view', () => {
    expect(applyRecordView(places, DEFAULT_RECORD_VIEW)).toBe(places);
  });
  it('leaves them out when their source is left out, and keeps the place and what other sources gave', () => {
    const shown = applyRecordView(places, { tier: 'all', hiddenSources: ['Town list'] });
    expect(shown).toHaveLength(places.length);
    expect('contact' in (shown[0] as Place)).toBe(false);
    expect('info' in (shown[0] as Place)).toBe(false);
    expect(shown[0]?.claims).toEqual((places[0] as Place).claims);
    expect('contact' in (shown[2] as Place)).toBe(false);
    expect(shown[2]?.info).toEqual({ kind: 'recreation', provenance: city });
    expect((places[0] as Place).contact).toEqual(reach);
  });
  it('leaves them out when their tier is, and keeps a place that loses nothing as the same object', () => {
    const shown = applyRecordView(places, { tier: 'tier-1', hiddenSources: [] });
    expect('contact' in (shown[0] as Place)).toBe(false);
    expect(shown[3]).toBe(places[3]);
    expect(applyRecordView(places, { tier: 'all', hiddenSources: ['Nobody'] })).toBe(places);
  });
});

describe('credits', () => {
  it('credit the source of contact details that are shown, also when it gave nothing else', () => {
    const only: Place[] = [{ id: 'x', name: 'X', claims: [], contact: { phone: '416 555 0100', provenance: town } }];
    const groups = sourceGroups(only);
    expect(groups[0]).toMatchObject({ source: 'Town list', licence: 'CC-BY-4.0', records: 0, places: 1 });
    expect(creditsText(groups, 'en', today)).toContain('Town list');
  });
  it('do not credit contact details that cannot be shown', () => {
    expect(sourceGroups([places[1] as Place])).toEqual([]);
    expect(sourceGroups([{ id: 'x', name: 'X', claims: [], contact: { phone: 'call us', provenance: town } }])).toEqual([]);
  });
  it('count a place once when one source gave its kind and its contact', () => {
    const lib = { ...(places[0] as Place), claims: [] };
    expect(sourceGroups([lib])).toHaveLength(1);
    expect(sourceGroups([lib])[0]).toMatchObject({ source: 'Town list', places: 1 });
  });
});

describe('contact details from open map data', () => {
  const el = (tags: Record<string, string>): OsmElement => ({ type: 'node', id: 1, tags: { name: 'Library', ramp: 'yes', ...tags }, date: '2026-10-01' });
  it('builds a street address from the house number and the street, with the town and the postal code', () => {
    expect(contactFromTags({ 'addr:housenumber': '1', 'addr:street': 'Main Street', 'addr:city': 'Riverside', 'addr:postcode': 'L4C 1A1' })).toEqual({ address: '1 Main Street, Riverside, L4C 1A1' });
    expect(contactFromTags({ 'addr:housenumber': '1', 'addr:street': 'Main Street' })).toEqual({ address: '1 Main Street' });
    expect(contactFromTags({ 'addr:street': 'Main Street', 'addr:city': 'Riverside' })).toEqual({});
    expect(contactFromTags({ 'addr:housenumber': '1', 'addr:street': 'x'.repeat(200) })).toEqual({});
  });
  it('takes a phone, a website and an email from either of their tags', () => {
    expect(contactFromTags({ phone: '+1 416 555 0100', website: 'https://library.example.org', email: 'info@library.example.org' })).toEqual({ phone: '+1 416 555 0100', website: 'https://library.example.org', email: 'info@library.example.org' });
    expect(contactFromTags({ 'contact:phone': '416-555-0100', 'contact:website': 'https://library.example.org', 'contact:email': 'info@library.example.org' })).toEqual({ phone: '416-555-0100', website: 'https://library.example.org', email: 'info@library.example.org' });
    expect(contactFromTags({ phone: '416 555 0100', 'contact:phone': '416 555 0199' }).phone).toBe('416 555 0100');
  });
  it('leaves out a value that is not well formed, and never repairs it', () => {
    expect(contactFromTags({ phone: '416 555 0100;416 555 0101', website: 'http://library.example.org', email: 'info@library' })).toEqual({});
    expect(contactFromTags({ website: 'library.example.org', phone: '416 555 0100' })).toEqual({ phone: '416 555 0100' });
    expect(contactFromTags({})).toEqual({});
  });
  it('comes with the place, under the same source, date and link as its records', () => {
    const place = convertOsm({ elements: [el({ phone: '416 555 0100', 'addr:housenumber': '1', 'addr:street': 'Main Street' })] }, today).places[0] as Place;
    expect(place.contact).toEqual({ address: '1 Main Street', phone: '416 555 0100', provenance: { source: 'OpenStreetMap contributors', licence: 'ODbL-1.0', date: '2026-10-01', url: 'https://www.openstreetmap.org/node/1' } });
    expect(effectiveContact(place).phone).toBe('416 555 0100');
  });
  it('leaves a place without contact tags free of contact details', () => {
    expect('contact' in (convertOsm({ elements: [el({})] }, today).places[0] as Place)).toBe(false);
  });
  it('survives the table of records', () => {
    const result = osmToPlaces(JSON.stringify({ elements: [{ type: 'node', id: 7, timestamp: '2026-10-01T00:00:00Z', tags: { name: 'Library', amenity: 'library', ramp: 'yes', phone: '416 555 0100', website: 'https://library.example.org' } }] }), today);
    const back = recordsFromCsv(recordsToCsv(result.places));
    expect(back.rejected).toEqual([]);
    expect(back.places).toEqual(result.places);
  });
});
