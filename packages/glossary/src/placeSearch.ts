import { rankPlaces, type Place, type PlaceMatch } from './places';
import type { FinderState } from './filters';
import type { Lang } from './plainTerms';
import { tokenise } from './text';

/** Every typed word must start a word in the name. Accents and case are ignored. Latin letters and digits only. */
export function matchesQuery(name: string, query: string): boolean {
  const wanted = tokenise(query);
  if (wanted.length === 0) return true;
  const words = tokenise(name);
  return wanted.every((q) => words.some((w) => w.startsWith(q)));
}

/**
 * Name search, then ranking by the chosen features. With "hide not available" on, places
 * where a chosen feature is reported as not available are left out. Unknown places stay in.
 */
export function findPlaces(places: readonly Place[], state: FinderState, lang: Lang): readonly PlaceMatch[] {
  const named = places.filter((p) => matchesQuery(p.name, state.query));
  const ranked = rankPlaces(named, state.features, lang);
  return state.hideNotAvailable ? ranked.filter((m) => m.verdict !== 'some-not-available') : ranked;
}
