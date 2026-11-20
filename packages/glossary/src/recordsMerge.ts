import type { Place, PlaceContact, PlaceInfo } from './places';
import type { Lang } from './plainTerms';
import type { FeatureClaim } from './status';
import { escapeHtml } from './text';

/**
 * Adding a loaded table to the records already held, instead of replacing them. Places are
 * matched by id. A record that is already there (same feature, status, source, licence, date,
 * tier and link) is not added twice. A place keeps the name it had. Nothing is ever removed.
 */
export const LOAD_MODES = ['replace', 'add'] as const;
export type LoadMode = (typeof LOAD_MODES)[number];

export function isLoadMode(value: unknown): value is LoadMode {
  return typeof value === 'string' && (LOAD_MODES as readonly string[]).includes(value);
}

/** Two records are the same when every part matches. */
export function recordKey(claim: FeatureClaim): string {
  const p = claim.provenance;
  return JSON.stringify([claim.termId, claim.status, p?.source ?? null, p?.licence ?? null, p?.date ?? null, p?.tier ?? null, p?.url ?? null]);
}

export interface MergeResult {
  readonly places: readonly Place[];
  readonly addedPlaces: number;
  readonly addedRecords: number;
  /** Records in the table that were already held. */
  readonly sameRecords: number;
  /** Places in the table whose name differs from the name held. The name held is kept. */
  readonly keptNames: number;
}

/**
 * The records held plus what is new in `incoming`. New places go at the end, in the order of the
 * table. The same list is returned when the table adds nothing, and neither list is changed.
 */
export function mergeRecords(existing: readonly Place[], incoming: readonly Place[]): MergeResult {
  const order = existing.map((p) => p.id);
  const byId = new Map<string, { name: string; claims: FeatureClaim[]; keys: Set<string>; touched: boolean; original: Place | null; info: PlaceInfo | undefined; contact: PlaceContact | undefined }>();
  for (const p of existing) byId.set(p.id, { name: p.name, claims: [...p.claims], keys: new Set(p.claims.map(recordKey)), touched: false, original: p, info: p.info, contact: p.contact });
  let addedPlaces = 0;
  let addedRecords = 0;
  let sameRecords = 0;
  let keptNames = 0;
  let addedInfo = 0;
  for (const p of incoming) {
    let held = byId.get(p.id);
    if (held === undefined) {
      held = { name: p.name, claims: [], keys: new Set(), touched: true, original: null, info: p.info, contact: p.contact };
      byId.set(p.id, held);
      order.push(p.id);
      addedPlaces += 1;
    } else if (held.name !== p.name && held.original !== null) {
      keptNames += 1;
    }
    // The kind and area held are kept. A place that has none takes them from the table.
    if (held.info === undefined && p.info !== undefined) {
      held.info = p.info;
      held.touched = true;
      addedInfo += 1;
    }
    // The same goes for how to reach the place.
    if (held.contact === undefined && p.contact !== undefined) {
      held.contact = p.contact;
      held.touched = true;
      addedInfo += 1;
    }
    for (const claim of p.claims) {
      const key = recordKey(claim);
      if (held.keys.has(key)) {
        sameRecords += 1;
        continue;
      }
      held.keys.add(key);
      held.claims.push(claim);
      held.touched = true;
      addedRecords += 1;
    }
  }
  if (addedPlaces === 0 && addedRecords === 0 && addedInfo === 0) return { places: existing, addedPlaces, addedRecords, sameRecords, keptNames };
  const places = order.map((id): Place => {
    const held = byId.get(id);
    if (held === undefined) return { id, name: '', claims: [] };
    if (held.original !== null && !held.touched) return held.original;
    return { id, name: held.name, claims: held.claims, ...(held.info === undefined ? {} : { info: held.info }), ...(held.contact === undefined ? {} : { contact: held.contact }) };
  });
  return { places, addedPlaces, addedRecords, sameRecords, keptNames };
}

export const MERGE_UI = {
  en: {
    legend: 'When the table is loaded',
    replace: 'Replace the records I have',
    add: 'Add to the records I have',
    added: (records: number, places: number): string => `Added ${records} records and ${places} new places.`,
    nothing: 'Nothing new was in the table.',
    same: (n: number): string => (n === 1 ? '1 record was already there.' : `${n} records were already there.`),
    keptNames: (n: number): string => (n === 1 ? '1 place kept the name it had.' : `${n} places kept the name they had.`),
  },
  fr: {
    legend: 'Quand le tableau est chargé',
    replace: 'Remplacer les fiches que j’ai',
    add: 'Ajouter aux fiches que j’ai',
    added: (records: number, places: number): string => `${records} fiches et ${places} nouveaux lieux ajoutés.`,
    nothing: 'Le tableau ne contenait rien de nouveau.',
    same: (n: number): string => (n === 1 ? '1 fiche était déjà là.' : `${n} fiches étaient déjà là.`),
    keptNames: (n: number): string => (n === 1 ? '1 lieu a gardé le nom qu’il avait.' : `${n} lieux ont gardé le nom qu’ils avaient.`),
  },
} as const;

/** What to say after a table was added to the records held. */
export function mergeMessage(result: MergeResult, lang: Lang): string {
  const ui = MERGE_UI[lang];
  const parts = [result.addedRecords === 0 && result.addedPlaces === 0 ? ui.nothing : ui.added(result.addedRecords, result.addedPlaces)];
  if (result.sameRecords > 0) parts.push(ui.same(result.sameRecords));
  if (result.keptNames > 0) parts.push(ui.keptNames(result.keptNames));
  return parts.join(' ');
}

export const LOAD_MODE_IDS: Readonly<Record<LoadMode, string>> = { replace: 'gl-records-mode-replace', add: 'gl-records-mode-add' };

/** The mode for a radio button id, or null for any other id. */
export function parseLoadModeId(id: string): LoadMode | null {
  return LOAD_MODES.find((m) => LOAD_MODE_IDS[m] === id) ?? null;
}

/** Two radio buttons in a group with a legend. */
export function renderLoadMode(mode: LoadMode, lang: Lang): string {
  const ui = MERGE_UI[lang];
  const radio = (m: LoadMode): string =>
    `<div><input type="radio" class="gl-box" name="gl-records-mode" id="${LOAD_MODE_IDS[m]}" value="${m}"${m === mode ? ' checked' : ''}> <label for="${LOAD_MODE_IDS[m]}">${escapeHtml(ui[m])}</label></div>`;
  return `<fieldset class="gl-fieldset"><legend>${escapeHtml(ui.legend)}</legend>${LOAD_MODES.map(radio).join('')}</fieldset>`;
}
