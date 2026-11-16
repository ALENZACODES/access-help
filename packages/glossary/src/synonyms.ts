import { TERMS, type Lang } from './terms';
import { tokenise } from './text';

/** Everyday words people type for each feature. Used to suggest features, never to guess data. */
const LEXICON: Readonly<Record<string, Readonly<Record<Lang, readonly string[]>>>> = {
  'step-free-entrance': {
    en: ['step free', 'no steps', 'level entrance', 'flat entrance', 'entrance'],
    fr: ['sans marche', 'plain-pied', 'entree de plain-pied', 'entree'],
  },
  'automatic-door': {
    en: ['automatic door', 'door opener', 'push button door', 'door'],
    fr: ['porte automatique', 'ouvre-porte', 'porte'],
  },
  'clear-door-width': {
    en: ['door width', 'wide door', 'door'],
    fr: ['largeur de porte', 'porte large', 'porte'],
  },
  ramp: {
    en: ['ramp', 'wheelchair ramp', 'slope'],
    fr: ['rampe', 'rampe d’acces', 'pente'],
  },
  elevator: {
    en: ['elevator', 'lift'],
    fr: ['ascenseur', 'elevateur'],
  },
  'grab-bar': {
    en: ['grab bar', 'support bar', 'bar'],
    fr: ['barre d’appui', 'barre'],
  },
  'accessible-washroom': {
    en: ['washroom', 'bathroom', 'restroom', 'toilet', 'accessible washroom'],
    fr: ['toilettes', 'salle de bain', 'salle de bains', 'toilette'],
  },
  'accessible-parking': {
    en: ['parking', 'accessible parking', 'parking space'],
    fr: ['stationnement', 'place reservee', 'place de stationnement'],
  },
};

export const MAX_SUGGESTIONS = 4;

function phraseMatches(phrase: string, words: readonly string[]): boolean {
  return tokenise(phrase).every((p) => words.some((q) => q === p || (q.length >= 3 && p.startsWith(q))));
}

/**
 * Glossary features the typed words could mean, in glossary order. Features already
 * chosen are left out. A suggestion is only an offer to add a feature to the filters.
 */
export function suggestFeatures(query: string, lang: Lang, exclude: readonly string[] = []): readonly string[] {
  const words = tokenise(query);
  if (words.length === 0) return [];
  const out: string[] = [];
  for (const term of TERMS) {
    if (exclude.includes(term.id)) continue;
    const phrases = [term[lang].term, ...(LEXICON[term.id]?.[lang] ?? [])];
    if (phrases.some((p) => phraseMatches(p, words))) out.push(term.id);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}
