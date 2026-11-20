import { MAX_AREA_LENGTH, isPlaceKind } from './placeInfo';
import type { Place, PlaceInfo } from './places';
import { isIsoDate, type Provenance } from './provenance';
import { MAX_PLACE_NAME } from './recordForm';
import type { FeatureClaim, FeatureStatus } from './status';

/**
 * Open map data, read on the device. A person pastes data exported from OpenStreetMap, and this
 * turns a small, careful set of tags into records. Each record keeps OpenStreetMap contributors
 * as its source, the ODbL-1.0 licence, the date of the element, and a link to it.
 *
 * The general `wheelchair` tag is never turned into a record: it does not say which feature is
 * there, and this app does not call a place accessible. Nothing here goes online.
 */
export const OSM_SOURCE = 'OpenStreetMap contributors';
export const OSM_LICENCE = 'ODbL-1.0';
export const MAX_OSM_CHARS = 2_000_000;
export const MAX_OSM_ELEMENTS = 5000;

export const OSM_TYPES = ['node', 'way', 'relation'] as const;
export type OsmType = (typeof OSM_TYPES)[number];

export interface OsmElement {
  readonly type: OsmType;
  readonly id: number;
  readonly tags: Readonly<Record<string, string>>;
  /** YYYY-MM-DD of the last change to the element, when the data gives one. */
  readonly date?: string;
}

export type OsmProblem = 'empty' | 'too-large' | 'not-json' | 'not-map-data' | 'too-many-elements';
export type OsmFormat = 'overpass' | 'geojson' | 'xml';

export interface OsmRead {
  readonly elements: readonly OsmElement[];
  readonly problems: readonly OsmProblem[];
  readonly format: OsmFormat | null;
  /** YYYY-MM-DD the data as a whole is from, when the export says so. */
  readonly baseDate?: string;
  /** Entries that were not map elements, or that came a second time. */
  readonly skipped: number;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** The day of a timestamp such as 2026-10-01T12:00:00Z, or of a plain date. Null for anything else. */
export function osmDay(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const day = value.slice(0, 10);
  if (!isIsoDate(day)) return null;
  return value.length === 10 || /^T\d{2}:\d{2}/.test(value.slice(10)) ? day : null;
}

function isOsmType(value: unknown): value is OsmType {
  return typeof value === 'string' && (OSM_TYPES as readonly string[]).includes(value);
}

function validId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Only tags whose value is text are kept. Keys and values are trimmed; empty ones are dropped. */
export function cleanTags(raw: unknown): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!isRecord(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'string') continue;
    const k = key.trim();
    const v = value.replace(/\s+/g, ' ').trim();
    if (k === '' || v === '' || k.startsWith('@')) continue;
    out[k] = v;
  }
  return out;
}

function overpassElement(raw: unknown): OsmElement | null {
  if (!isRecord(raw) || !isOsmType(raw.type) || !validId(raw.id)) return null;
  const date = osmDay(raw.timestamp);
  return { type: raw.type, id: raw.id, tags: cleanTags(raw.tags), ...(date === null ? {} : { date }) };
}

/** A GeoJSON feature made from map data carries its element as "node/123", in `@id` or in `id`. */
function geojsonElement(raw: unknown): OsmElement | null {
  if (!isRecord(raw) || raw.type !== 'Feature' || !isRecord(raw.properties)) return null;
  const props = raw.properties;
  const ref = typeof props['@id'] === 'string' ? props['@id'] : typeof raw.id === 'string' ? raw.id : typeof props.id === 'string' ? props.id : '';
  const m = /^(node|way|relation)\/(\d{1,17})$/.exec(ref);
  if (m === null) return null;
  const id = Number(m[2]);
  if (!validId(id)) return null;
  const meta = isRecord(props.meta) ? props.meta : {};
  const date = osmDay(props['@timestamp']) ?? osmDay(meta.timestamp) ?? osmDay(props.timestamp);
  const tags = isRecord(props.tags) ? cleanTags(props.tags) : cleanTags(props);
  return { type: m[1] as OsmType, id, tags, ...(date === null ? {} : { date }) };
}

const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Turns the five named entities and numbered ones back into characters. Anything else is left as written. */
export function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]{1,6}|#\d{1,7}|[a-z]+);/g, (whole, body: string) => {
    if (body.startsWith('#')) {
      const code = body[1] === 'x' ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : whole;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, body) ? (ENTITIES[body] as string) : whole;
  });
}

/** The attributes of one opening tag, decoded. A name written twice keeps its first value. */
export function xmlAttributes(source: string): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const name = m[1] as string;
    if (!Object.prototype.hasOwnProperty.call(out, name)) out[name] = decodeXml(m[2] ?? m[3] ?? '');
  }
  return out;
}

/**
 * Reads the XML that the OpenStreetMap site and Overpass export. Only what this app needs is
 * read: each node, way and relation, its number, the day it last changed, and its tags. The
 * text is read as text, so nothing in it is run and nothing is fetched.
 */
export function readOsmXml(text: string): OsmRead {
  const root = /<osm\b([^>]*)>/.exec(text);
  if (root === null) return { elements: [], problems: ['not-map-data'], format: null, skipped: 0 };
  const found = [...text.matchAll(/<(node|way|relation)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1\s*>)/g)];
  if (found.length > MAX_OSM_ELEMENTS) return { elements: [], problems: ['too-many-elements'], format: null, skipped: 0 };
  const elements: OsmElement[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const m of found) {
    const attrs = xmlAttributes(m[2] ?? '');
    const id = /^\d{1,17}$/.test(attrs.id ?? '') ? Number(attrs.id) : 0;
    const key = `${m[1]}/${id}`;
    if (!validId(id) || seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    const tags: Record<string, unknown> = {};
    for (const t of (m[3] ?? '').matchAll(/<tag\b([^>]*?)\/?>/g)) {
      const pair = xmlAttributes(t[1] ?? '');
      if (pair.k !== undefined && pair.v !== undefined && !Object.prototype.hasOwnProperty.call(tags, pair.k)) tags[pair.k] = pair.v;
    }
    const date = osmDay(attrs.timestamp);
    elements.push({ type: m[1] as OsmType, id, tags: cleanTags(tags), ...(date === null ? {} : { date }) });
  }
  const meta = /<meta\b([^>]*?)\/?>/.exec(text);
  const baseDate = osmDay(xmlAttributes(meta?.[1] ?? '').osm_base) ?? osmDay(xmlAttributes(root[1] ?? '').timestamp);
  return { elements, problems: [], format: 'xml', skipped, ...(baseDate === null ? {} : { baseDate }) };
}

/**
 * Reads pasted map data: the export of the OpenStreetMap site (XML), the JSON that Overpass
 * gives, or GeoJSON made from it. Other text reads as nothing, with the reason. An element that
 * comes twice is read once.
 */
export function readOsm(text: string): OsmRead {
  const none = (problem: OsmProblem): OsmRead => ({ elements: [], problems: [problem], format: null, skipped: 0 });
  if (text.trim() === '') return none('empty');
  if (text.length > MAX_OSM_CHARS) return none('too-large');
  if (text.trimStart().startsWith('<')) return readOsmXml(text);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return none('not-json');
  }
  if (!isRecord(raw)) return none('not-map-data');
  let format: OsmFormat;
  let list: readonly unknown[];
  let read: (item: unknown) => OsmElement | null;
  if (Array.isArray(raw.elements)) {
    format = 'overpass';
    list = raw.elements;
    read = overpassElement;
  } else if (raw.type === 'FeatureCollection' && Array.isArray(raw.features)) {
    format = 'geojson';
    list = raw.features;
    read = geojsonElement;
  } else {
    return none('not-map-data');
  }
  if (list.length > MAX_OSM_ELEMENTS) return none('too-many-elements');
  const elements: OsmElement[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const item of list) {
    const element = read(item);
    const key = element === null ? '' : `${element.type}/${element.id}`;
    if (element === null || seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    elements.push(element);
  }
  const osm3s = isRecord(raw.osm3s) ? raw.osm3s : {};
  const baseDate = osmDay(osm3s.timestamp_osm_base) ?? osmDay(raw.timestamp);
  return { elements, problems: [], format, skipped, ...(baseDate === null ? {} : { baseDate }) };
}

const YES_NO = (value: string): FeatureStatus | null => (value === 'yes' ? 'present' : value === 'no' ? 'absent' : null);
const DOOR_OPENERS: ReadonlySet<string> = new Set(['yes', 'button', 'motion', 'floor', 'continuous', 'slowdown_button']);

function count(value: string): number | null {
  return /^\d{1,4}$/.test(value) ? Number(value) : null;
}

export interface TagRule {
  readonly termId: string;
  /** The tags this rule reads, in the order they are tried. Shown to the person as they are written in the data. */
  readonly keys: readonly string[];
  /** What one tag says about the feature, or null when it says nothing this app can report. */
  readonly read: (key: string, value: string, tags: Readonly<Record<string, string>>) => FeatureStatus | null;
}

/**
 * The tags that are read, and what each one means. Anything not listed is left alone. A value
 * that is not a plain yes or no (such as "limited") makes no record: the feature stays unknown.
 * No tag is read for the clear width of a door or for grab bars.
 */
export const TAG_RULES: readonly TagRule[] = [
  {
    termId: 'step-free-entrance',
    keys: ['step_count'],
    // A count of steps only says something about the way in when the element is an entrance.
    read: (_key, value, tags) => {
      const n = count(value);
      if (tags.entrance === undefined || n === null) return null;
      return n === 0 ? 'present' : 'absent';
    },
  },
  { termId: 'automatic-door', keys: ['automatic_door'], read: (_key, value) => (value === 'no' ? 'absent' : DOOR_OPENERS.has(value) ? 'present' : null) },
  { termId: 'ramp', keys: ['ramp', 'ramp:wheelchair'], read: (_key, value) => YES_NO(value) },
  { termId: 'elevator', keys: ['elevator'], read: (_key, value) => YES_NO(value) },
  {
    termId: 'accessible-washroom',
    keys: ['toilets:wheelchair', 'wheelchair'],
    // The general tag is read only on an element that is itself a washroom.
    read: (key, value, tags) => (key === 'wheelchair' && tags.amenity !== 'toilets' ? null : YES_NO(value)),
  },
  {
    termId: 'accessible-parking',
    keys: ['capacity:disabled', 'parking_space'],
    read: (key, value) => {
      if (key === 'parking_space') return value === 'disabled' ? 'present' : null;
      const n = count(value);
      if (n !== null) return n > 0 ? 'present' : 'absent';
      return YES_NO(value);
    },
  },
];

export interface TagReading {
  readonly claims: readonly { readonly termId: string; readonly status: FeatureStatus }[];
  /** Features where two tags of the element gave different answers. No record is made for them. */
  readonly conflicts: number;
}

/** What the tags of one element say, one answer at most for each feature. */
export function readTags(tags: Readonly<Record<string, string>>): TagReading {
  const claims: { termId: string; status: FeatureStatus }[] = [];
  let conflicts = 0;
  for (const rule of TAG_RULES) {
    const answers = new Set<FeatureStatus>();
    for (const key of rule.keys) {
      const value = tags[key];
      if (value === undefined) continue;
      const status = rule.read(key, value.toLowerCase(), tags);
      if (status !== null) answers.add(status);
    }
    if (answers.size > 1) conflicts += 1;
    else if (answers.size === 1) claims.push({ termId: rule.termId, status: [...answers][0] as FeatureStatus });
  }
  return { claims, conflicts };
}

const AMENITY_KINDS: Readonly<Record<string, string>> = {
  library: 'library',
  community_centre: 'community-centre',
  cafe: 'cafe',
  restaurant: 'restaurant',
  fast_food: 'restaurant',
  pub: 'restaurant',
  pharmacy: 'pharmacy',
  bank: 'bank',
  school: 'school',
  college: 'school',
  university: 'school',
  townhall: 'government',
  courthouse: 'government',
  post_office: 'government',
  clinic: 'health-centre',
  doctors: 'health-centre',
  hospital: 'health-centre',
  theatre: 'theatre',
  cinema: 'theatre',
  place_of_worship: 'worship',
  bus_station: 'transit',
};
const SHOP_GROCERY: ReadonlySet<string> = new Set(['supermarket', 'convenience', 'greengrocer']);
const LEISURE_KINDS: Readonly<Record<string, string>> = { park: 'park', sports_centre: 'recreation', swimming_pool: 'recreation', ice_rink: 'recreation', fitness_centre: 'recreation' };
const TOURISM_HOTEL: ReadonlySet<string> = new Set(['hotel', 'motel', 'guest_house']);

function own(table: Readonly<Record<string, string>>, key: string | undefined): string | undefined {
  return key !== undefined && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

/** The kind of place the tags name, from this app's list, or null. A place is never called "other" by a guess. */
export function kindFromTags(tags: Readonly<Record<string, string>>): string | null {
  const kind =
    own(AMENITY_KINDS, tags.amenity) ??
    (tags.shop === undefined ? undefined : SHOP_GROCERY.has(tags.shop) ? 'grocery' : tags.shop === 'no' || tags.shop === 'vacant' ? undefined : 'shop') ??
    own(LEISURE_KINDS, tags.leisure) ??
    (tags.tourism !== undefined && TOURISM_HOTEL.has(tags.tourism) ? 'hotel' : undefined) ??
    (tags.railway === 'station' || tags.public_transport === 'station' ? 'transit' : undefined);
  return kind !== undefined && isPlaceKind(kind) ? kind : null;
}

/** The town from the address tags, when it fits. A longer value is left out, never cut. */
export function areaFromTags(tags: Readonly<Record<string, string>>): string {
  const city = (tags['addr:city'] ?? '').replace(/\s+/g, ' ').trim();
  return Array.from(city).length <= MAX_AREA_LENGTH ? city : '';
}

/** The name of the element: `name`, then the English or French name. Empty when there is none or it is too long. */
export function nameFromTags(tags: Readonly<Record<string, string>>): string {
  const name = (tags.name ?? tags['name:en'] ?? tags['name:fr'] ?? '').replace(/\s+/g, ' ').trim();
  return name.length <= MAX_PLACE_NAME ? name : '';
}

export function osmPlaceId(element: Pick<OsmElement, 'type' | 'id'>): string {
  return `osm-${element.type}-${element.id}`;
}

export function osmUrl(element: Pick<OsmElement, 'type' | 'id'>): string {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

export interface OsmCounts {
  /** Elements read from the data. */
  readonly elements: number;
  readonly places: number;
  readonly records: number;
  /** Left out: no tag is about a feature this app reads. */
  readonly noFeatureTags: number;
  /** Of those, elements whose only word on the subject is the general wheelchair tag. */
  readonly generalOnly: number;
  /** Left out: a tag is about a feature, and the element has no name. */
  readonly noName: number;
  /** Left out: neither the element nor the export gives a date up to today. */
  readonly noDate: number;
  /** Features left without a record because two tags of one element disagree. */
  readonly conflicts: number;
}

export interface OsmConversion {
  readonly places: readonly Place[];
  readonly counts: OsmCounts;
}

/**
 * Turns the elements into places with records. An element becomes a place only when a tag says
 * something about a feature, it has a name, and a date up to today is known for it: its own
 * date, or else the date of the export. Its kind and town are kept with the same source.
 */
export function convertOsm(read: Pick<OsmRead, 'elements' | 'baseDate'>, today: string): OsmConversion {
  const places: Place[] = [];
  let records = 0;
  let noFeatureTags = 0;
  let generalOnly = 0;
  let noName = 0;
  let noDate = 0;
  let conflicts = 0;
  for (const element of read.elements) {
    const reading = readTags(element.tags);
    conflicts += reading.conflicts;
    if (reading.claims.length === 0) {
      noFeatureTags += 1;
      if (element.tags.wheelchair !== undefined && reading.conflicts === 0) generalOnly += 1;
      continue;
    }
    const name = nameFromTags(element.tags);
    if (name === '') {
      noName += 1;
      continue;
    }
    const date = element.date ?? read.baseDate;
    if (date === undefined || date > today) {
      noDate += 1;
      continue;
    }
    const provenance: Provenance = { source: OSM_SOURCE, licence: OSM_LICENCE, date, url: osmUrl(element) };
    const claims: FeatureClaim[] = reading.claims.map((c) => ({ termId: c.termId, status: c.status, provenance }));
    const kind = kindFromTags(element.tags);
    const area = areaFromTags(element.tags);
    const info: PlaceInfo | undefined = kind === null && area === '' ? undefined : { ...(kind === null ? {} : { kind }), ...(area === '' ? {} : { area }), provenance };
    places.push({ id: osmPlaceId(element), name, claims, ...(info === undefined ? {} : { info }) });
    records += claims.length;
  }
  return { places, counts: { elements: read.elements.length, places: places.length, records, noFeatureTags, generalOnly, noName, noDate, conflicts } };
}

export interface OsmFeatureTally {
  readonly termId: string;
  readonly available: number;
  readonly notAvailable: number;
}

/** How many records were made for each feature that has a tag rule, in the order of the rules. */
export function tallyByFeature(places: readonly Place[]): readonly OsmFeatureTally[] {
  return TAG_RULES.map((rule) => {
    let available = 0;
    let notAvailable = 0;
    for (const place of places) {
      for (const claim of place.claims) {
        if (claim.termId !== rule.termId) continue;
        if (claim.status === 'present') available += 1;
        else if (claim.status === 'absent') notAvailable += 1;
      }
    }
    return { termId: rule.termId, available, notAvailable };
  });
}

export interface DateSpan {
  readonly oldest: string;
  readonly newest: string;
}

/** The oldest and the newest date among the records, or null when there are none. */
export function recordDateSpan(places: readonly Place[]): DateSpan | null {
  let oldest = '';
  let newest = '';
  for (const place of places) {
    for (const claim of place.claims) {
      const date = claim.provenance?.date;
      if (date === undefined || !isIsoDate(date)) continue;
      if (oldest === '' || date < oldest) oldest = date;
      if (date > newest) newest = date;
    }
  }
  return oldest === '' ? null : { oldest, newest };
}

export interface OsmRefresh {
  readonly places: readonly Place[];
  /** Records taken out because the data now has a newer one for the same element and feature. */
  readonly replaced: number;
}

/**
 * Before map data is added: takes out the records held that came from the same map element,
 * for the same feature, and that the new data gives again with a later date. Without this, an
 * element whose tag changed would leave an old record beside the new one. Records from any
 * other source are never touched, and the same list is returned when nothing is replaced.
 */
export function dropSuperseded(existing: readonly Place[], incoming: readonly Place[]): OsmRefresh {
  const newer = new Map<string, string>();
  for (const place of incoming) {
    for (const claim of place.claims) {
      const p = claim.provenance;
      if (p === undefined || p.source !== OSM_SOURCE || p.url === undefined) continue;
      const key = JSON.stringify([place.id, claim.termId, p.url]);
      if ((newer.get(key) ?? '') < p.date) newer.set(key, p.date);
    }
  }
  let replaced = 0;
  const places = existing.map((place) => {
    const claims = place.claims.filter((claim) => {
      const p = claim.provenance;
      if (p === undefined || p.source !== OSM_SOURCE || p.url === undefined) return true;
      const date = newer.get(JSON.stringify([place.id, claim.termId, p.url]));
      return date === undefined || date <= p.date;
    });
    if (claims.length === place.claims.length) return place;
    replaced += place.claims.length - claims.length;
    return { ...place, claims };
  });
  return replaced === 0 ? { places: existing, replaced: 0 } : { places, replaced };
}

export interface OsmResult extends OsmConversion {
  readonly problems: readonly OsmProblem[];
  readonly format: OsmFormat | null;
  readonly skipped: number;
}

const NO_COUNTS: OsmCounts = { elements: 0, places: 0, records: 0, noFeatureTags: 0, generalOnly: 0, noName: 0, noDate: 0, conflicts: 0 };

/** Reads pasted map data and turns it into places with records, in one step. */
export function osmToPlaces(text: string, today: string): OsmResult {
  const read = readOsm(text);
  if (read.problems.length > 0) return { places: [], counts: NO_COUNTS, problems: read.problems, format: null, skipped: 0 };
  return { ...convertOsm(read, today), problems: [], format: read.format, skipped: read.skipped };
}
