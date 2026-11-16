import type { Lang } from './terms';

/** UI strings for the place finder. FR follows the typography rules (the audit checks both). */
export const FINDER_UI = {
  en: {
    title: 'Find places',
    featuresLegend: 'Features that matter to you',
    featuresHint: 'Choose any number. Places are ranked by what their sources report.',
    searchLabel: 'Search places by name',
    hideLabel: 'Hide places with a feature reported as not available',
    clear: 'Clear choices',
    compare: 'Compare',
    compareLabel: (name: string): string => `Compare ${name}`,
    compareTitle: 'Comparison',
    pickTwo: 'Choose two places to compare.',
    none: 'No places match.',
    one: '1 place shown',
    many: (n: number): string => `${n} places shown`,
    dataHeading: 'Data',
    noData: 'No place data loaded.',
  },
  fr: {
    title: 'Trouver des lieux',
    featuresLegend: 'Caractéristiques importantes pour vous',
    featuresHint: 'Choisissez-en autant que vous voulez. Les lieux sont classés selon ce que leurs sources indiquent.',
    searchLabel: 'Rechercher un lieu par nom',
    hideLabel: 'Masquer les lieux où une caractéristique est signalée comme non disponible',
    clear: 'Effacer les choix',
    compare: 'Comparer',
    compareLabel: (name: string): string => `Comparer ${name}`,
    compareTitle: 'Comparaison',
    pickTwo: 'Choisissez deux lieux à comparer.',
    none: 'Aucun lieu ne correspond.',
    one: '1 lieu affiché',
    many: (n: number): string => `${n} lieux affichés`,
    dataHeading: 'Données',
    noData: 'Aucune donnée de lieu chargée.',
  },
} as const;

export function placeCountText(lang: Lang, n: number): string {
  const ui = FINDER_UI[lang];
  if (n === 0) return ui.none;
  return n === 1 ? ui.one : ui.many(n);
}
