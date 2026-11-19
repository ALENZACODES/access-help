/**
 * Matches the first line of a sheet to the fields of an observation. English and French
 * column names are both accepted. A column the App does not keep is listed, never guessed at.
 */
export const FIELDS = ['id', 'name', 'status', 'latitude', 'longitude', 'source', 'licence', 'observedOn'] as const;
export type Field = (typeof FIELDS)[number];

export const REQUIRED_FIELDS: readonly Field[] = ['latitude', 'longitude', 'source', 'licence', 'observedOn'];

const ALIASES: Record<Field, readonly string[]> = {
  id: ['id', 'identifiant', 'identifier'],
  name: ['name', 'nom', 'place', 'lieu'],
  status: ['status', 'wheelchair', 'etat', 'statut', 'fauteuil', 'fauteuil roulant', 'acces'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lon', 'lng', 'long'],
  source: ['source'],
  licence: ['licence', 'license'],
  observedOn: ['observed on', 'observedon', 'observed', 'date', 'seen on', 'observe le', 'vu le', 'date d observation'],
};

/** Columns people often add that an observation does not carry. They are named so the screen can say so. */
const KNOWN_UNKEPT: readonly string[] = ['note', 'notes', 'tier', 'niveau', 'comment', 'commentaire'];

/** Lower case, accents removed, punctuation and underscores turned into single spaces. */
export function normaliseHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function fieldForHeader(header: string): Field | null {
  const key = normaliseHeader(header);
  if (key === '') return null;
  for (const field of FIELDS) if (ALIASES[field].includes(key)) return field;
  return null;
}

export interface HeaderMap {
  /** Column index for each field that was found. */
  columns: Partial<Record<Field, number>>;
  missing: Field[];
  /** Headers that matched a field already taken by an earlier column. */
  repeated: string[];
  /** Headers the App does not keep, as written. */
  unkept: string[];
  /** True when the sheet has a tier column. A saved observation carries no tier, so it is not kept. */
  hasTier: boolean;
}

export function mapHeaders(header: readonly string[]): HeaderMap {
  const columns: Partial<Record<Field, number>> = {};
  const repeated: string[] = [];
  const unkept: string[] = [];
  let hasTier = false;
  header.forEach((cell, index) => {
    const field = fieldForHeader(cell);
    if (field === null) {
      if (cell.trim() !== '') unkept.push(cell.trim());
      const key = normaliseHeader(cell);
      if (key === 'tier' || key === 'niveau') hasTier = true;
      return;
    }
    if (columns[field] !== undefined) repeated.push(cell.trim());
    else columns[field] = index;
  });
  const missing = REQUIRED_FIELDS.filter((field) => columns[field] === undefined);
  return { columns, missing, repeated, unkept, hasTier };
}

export function isKnownUnkept(header: string): boolean {
  return KNOWN_UNKEPT.includes(normaliseHeader(header));
}

export function headersUsable(map: HeaderMap): boolean {
  return map.missing.length === 0;
}
