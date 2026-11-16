import { TERMS } from './plainTerms';

/** What a person has chosen in the place finder. Kept on the device; never sent anywhere. */
export interface FinderState {
  readonly features: readonly string[];
  readonly query: string;
  readonly hideNotAvailable: boolean;
}

export const EMPTY_STATE: FinderState = { features: [], query: '', hideNotAvailable: false };
export const MAX_QUERY_LENGTH = 100;

/** Known feature ids only, in glossary order, no duplicates; query capped; flag is strictly boolean. */
export function normaliseState(input: Partial<FinderState>): FinderState {
  const wanted = new Set(input.features ?? []);
  return {
    features: TERMS.map((t) => t.id).filter((id) => wanted.has(id)),
    query: (input.query ?? '').slice(0, MAX_QUERY_LENGTH),
    hideNotAvailable: input.hideNotAvailable === true,
  };
}

export function isEmptyState(state: FinderState): boolean {
  return state.features.length === 0 && state.query.trim() === '' && !state.hideNotAvailable;
}

export function toggleFeature(state: FinderState, id: string): FinderState {
  const has = state.features.includes(id);
  return normaliseState({
    ...state,
    features: has ? state.features.filter((f) => f !== id) : [...state.features, id],
  });
}

/** URL-hash form without the leading "#", for example "f=ramp,elevator&q=caf%C3%A9&h=1". */
export function encodeState(state: FinderState): string {
  const parts: string[] = [];
  if (state.features.length > 0) parts.push(`f=${state.features.join(',')}`);
  if (state.query.trim() !== '') parts.push(`q=${encodeURIComponent(state.query.trim())}`);
  if (state.hideNotAvailable) parts.push('h=1');
  return parts.join('&');
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return '';
  }
}

/** Accepts "#...", "?..." or a bare string. Unknown keys and unknown feature ids are dropped. */
export function decodeState(raw: string): FinderState {
  const out: { features?: string[]; query?: string; hideNotAvailable?: boolean } = {};
  for (const part of raw.replace(/^[#?]/, '').split('&')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === 'f') out.features = safeDecode(value).split(',').filter((v) => v !== '');
    else if (key === 'q') out.query = safeDecode(value);
    else if (key === 'h') out.hideNotAvailable = value === '1';
  }
  return normaliseState(out);
}

export function serialiseState(state: FinderState): string {
  return JSON.stringify(state);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Null for anything that is not a state we wrote. */
export function parseStoredState(json: string): FinderState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(raw)) return null;
  const { features, query, hideNotAvailable } = raw;
  if (!Array.isArray(features) || !features.every((f) => typeof f === 'string')) return null;
  if (typeof query !== 'string' || typeof hideNotAvailable !== 'boolean') return null;
  return normaliseState({ features, query, hideNotAvailable });
}
