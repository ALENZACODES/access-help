/**
 * A mapping-day session: a name, a date, an area, a cell size and what the person plans to look at.
 * It is the person's own plan. It is stored on their device and never sent anywhere.
 * Parsing never repairs input: a field that is wrong is reported, not changed.
 */
import { makeGrid, validateBounds, isCellSize, gridIssueText, type Bounds, type CellSizeM, type GridIssue } from './day-grid';
import { isIsoDay, type DayLang } from './day-text';

export const SESSION_VERSION = 1;
export const NAME_MAX = 80;
export const NOTES_MAX = 500;

export const FOCUS_IDS = ['entrances', 'parking', 'washrooms', 'transit-stops', 'crossings', 'indoor-routes'] as const;
export type FocusId = (typeof FOCUS_IDS)[number];

export const FOCUS_LABEL: Record<FocusId, Record<DayLang, string>> = {
  entrances: { en: 'Entrances', fr: 'Entrées' },
  parking: { en: 'Parking', fr: 'Stationnement' },
  washrooms: { en: 'Washrooms', fr: 'Toilettes' },
  'transit-stops': { en: 'Transit stops', fr: 'Arrêts de transport en commun' },
  crossings: { en: 'Street crossings', fr: 'Traverses de rue' },
  'indoor-routes': { en: 'Routes inside buildings', fr: 'Parcours à l’intérieur des bâtiments' },
};

export interface MappingDay {
  version: typeof SESSION_VERSION;
  id: string;
  name: string;
  /** The day the person plans to go out, YYYY-MM-DD. */
  date: string;
  bounds: Bounds;
  cellMetres: CellSizeM;
  focus: FocusId[];
  notes: string;
}

export type SessionIssueCode =
  | 'not-an-object'
  | 'wrong-version'
  | 'id-missing'
  | 'id-bad'
  | 'name-missing'
  | 'name-too-long'
  | 'date-bad'
  | 'focus-bad'
  | 'notes-too-long'
  | GridIssue['code'];

export interface SessionIssue {
  code: SessionIssueCode;
  field: 'session' | 'id' | 'name' | 'date' | 'focus' | 'notes' | GridIssue['field'];
}

export type SessionResult = { ok: true; session: MappingDay } | { ok: false; issues: SessionIssue[] };

export interface SessionDraft {
  id?: string;
  name: string;
  date: string;
  bounds: Bounds;
  cellMetres: number;
  focus?: readonly string[];
  notes?: string;
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,60}$/;

export function isFocusId(value: unknown): value is FocusId {
  return typeof value === 'string' && (FOCUS_IDS as readonly string[]).includes(value);
}

/** An id built from the date and the name, for example "2026-11-21-main-street". */
export function sessionIdFor(date: string, name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return `${date}-${base === '' ? 'session' : base}`;
}

/** Checks a draft and returns a session, or every problem found. Nothing is trimmed except the name and notes. */
export function createSession(draft: SessionDraft): SessionResult {
  const issues: SessionIssue[] = [];
  const name = draft.name.trim();
  const notes = (draft.notes ?? '').trim();
  if (name === '') issues.push({ code: 'name-missing', field: 'name' });
  else if (name.length > NAME_MAX) issues.push({ code: 'name-too-long', field: 'name' });
  if (!isIsoDay(draft.date)) issues.push({ code: 'date-bad', field: 'date' });
  if (notes.length > NOTES_MAX) issues.push({ code: 'notes-too-long', field: 'notes' });
  const focus = [...(draft.focus ?? [])];
  const seen = new Set<string>();
  for (const item of focus) {
    if (!isFocusId(item) || seen.has(item)) issues.push({ code: 'focus-bad', field: 'focus' });
    seen.add(item);
  }
  const grid = makeGrid(draft.bounds, draft.cellMetres);
  if (!grid.ok) for (const issue of grid.issues) issues.push({ code: issue.code, field: issue.field });
  const id = draft.id ?? sessionIdFor(draft.date, name);
  const idMatters = draft.id !== undefined || (name !== '' && isIsoDay(draft.date));
  if (idMatters && !ID_PATTERN.test(id)) issues.push({ code: 'id-bad', field: 'id' });
  if (issues.length > 0 || !grid.ok || !isCellSize(draft.cellMetres)) return { ok: false, issues: dedupe(issues) };
  return {
    ok: true,
    session: {
      version: SESSION_VERSION,
      id,
      name,
      date: draft.date,
      bounds: { ...draft.bounds },
      cellMetres: draft.cellMetres,
      focus: focus.filter(isFocusId).sort((a, b) => FOCUS_IDS.indexOf(a) - FOCUS_IDS.indexOf(b)),
      notes,
    },
  };
}

function dedupe(issues: SessionIssue[]): SessionIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.field}:${issue.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Validates unknown data, for example text read back from storage or a file. Unknown fields are dropped. */
export function parseSession(value: unknown): SessionResult {
  const root = asRecord(value);
  if (!root) return { ok: false, issues: [{ code: 'not-an-object', field: 'session' }] };
  if (root.version !== SESSION_VERSION) return { ok: false, issues: [{ code: 'wrong-version', field: 'session' }] };
  const bounds = asRecord(root.bounds);
  const num = (key: string): number => (typeof bounds?.[key] === 'number' ? (bounds[key] as number) : Number.NaN);
  const issues: SessionIssue[] = [];
  if (typeof root.id !== 'string' || root.id === '') issues.push({ code: 'id-missing', field: 'id' });
  const result = createSession({
    id: typeof root.id === 'string' ? root.id : undefined,
    name: typeof root.name === 'string' ? root.name : '',
    date: typeof root.date === 'string' ? root.date : '',
    bounds: { south: num('south'), west: num('west'), north: num('north'), east: num('east') },
    cellMetres: typeof root.cellMetres === 'number' ? root.cellMetres : Number.NaN,
    focus: Array.isArray(root.focus) ? root.focus.map((item) => (typeof item === 'string' ? item : '?')) : [],
    notes: typeof root.notes === 'string' ? root.notes : '',
  });
  if (issues.length > 0) return { ok: false, issues: result.ok ? issues : dedupe([...issues, ...result.issues]) };
  return result;
}

export function parseSessionText(text: string): SessionResult {
  try {
    return parseSession(JSON.parse(text) as unknown);
  } catch {
    return { ok: false, issues: [{ code: 'not-an-object', field: 'session' }] };
  }
}

export function serialiseSession(session: MappingDay): string {
  return JSON.stringify(session, null, 2);
}

export const SESSION_ISSUE_TEXT: Record<Exclude<SessionIssueCode, GridIssue['code']>, Record<DayLang, string>> = {
  'not-an-object': { en: 'This is not a saved mapping day.', fr: 'Ce n’est pas une journée de cartographie enregistrée.' },
  'wrong-version': { en: 'This mapping day was saved by a version this screen cannot read.', fr: 'Cette journée de cartographie a été enregistrée par une version que cet écran ne sait pas lire.' },
  'id-missing': { en: 'The saved mapping day has no identifier.', fr: 'La journée de cartographie enregistrée n’a pas d’identifiant.' },
  'id-bad': { en: 'The identifier can only use lower-case letters, digits and hyphens.', fr: 'L’identifiant ne peut contenir que des lettres minuscules, des chiffres et des traits d’union.' },
  'name-missing': { en: 'Give the mapping day a name.', fr: 'Donnez un nom à la journée de cartographie.' },
  'name-too-long': { en: 'The name is longer than 80 characters.', fr: 'Le nom dépasse 80 caractères.' },
  'date-bad': { en: 'Enter a real date as YYYY-MM-DD.', fr: 'Saisissez une vraie date sous la forme AAAA-MM-JJ.' },
  'focus-bad': { en: 'One of the things to look at is not in the list or appears twice.', fr: 'Un des éléments à observer ne figure pas dans la liste ou apparaît deux fois.' },
  'notes-too-long': { en: 'The notes are longer than 500 characters.', fr: 'Les notes dépassent 500 caractères.' },
};

export function sessionIssueText(issue: SessionIssue, lang: DayLang): string {
  if (issue.code in SESSION_ISSUE_TEXT) return SESSION_ISSUE_TEXT[issue.code as keyof typeof SESSION_ISSUE_TEXT][lang];
  return gridIssueText({ code: issue.code as GridIssue['code'], field: issue.field as GridIssue['field'] }, lang);
}

export function focusLabels(session: MappingDay, lang: DayLang): string[] {
  return session.focus.map((id) => FOCUS_LABEL[id][lang]);
}

/** Collects the bounds problems alone, for a form that checks the area before the name. */
export function areaIssues(bounds: Bounds): GridIssue[] {
  return validateBounds(bounds);
}
