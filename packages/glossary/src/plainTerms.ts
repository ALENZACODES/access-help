/**
 * Plain-language accessibility terms, EN + FR.
 * Source: written for the App by the project team (original wording).
 * Licence: same as this repository. Date: 2026-11-15.
 * Descriptions say what a feature is. They never say who may use it.
 */

export type Lang = 'en' | 'fr';

export interface LocalisedText {
  readonly term: string;
  readonly plain: string;
}

export interface GlossaryTerm {
  readonly id: string;
  readonly en: LocalisedText;
  readonly fr: LocalisedText;
}

export const GLOSSARY_META = {
  source: 'Written for the App by the project team',
  licence: 'Same as this repository',
  date: '2026-11-15',
} as const;

export const UNKNOWN_ID = 'unknown';

/** Shown whenever we have no information. Never implies present or absent. */
export const UNKNOWN_TERM: GlossaryTerm = {
  id: UNKNOWN_ID,
  en: {
    term: 'Unknown',
    plain:
      'We do not have information about this. It does not mean the feature is there, and it does not mean it is missing.',
  },
  fr: {
    term: 'Inconnu',
    plain:
      'Nous n’avons pas d’information à ce sujet. Cela ne veut pas dire que la fonction est présente, ni qu’elle est absente.',
  },
};

export const TERMS: readonly GlossaryTerm[] = [
  {
    id: 'step-free-entrance',
    en: {
      term: 'Step-free entrance',
      plain: 'An entrance with no steps between the outside and the inside.',
    },
    fr: {
      term: 'Entrée de plain-pied',
      plain: 'Une entrée sans marche entre l’extérieur et l’intérieur.',
    },
  },
  {
    id: 'automatic-door',
    en: {
      term: 'Automatic door',
      plain: 'A door that opens by itself or at the push of a button.',
    },
    fr: {
      term: 'Porte automatique',
      plain: 'Une porte qui s’ouvre toute seule ou en appuyant sur un bouton.',
    },
  },
  {
    id: 'clear-door-width',
    en: {
      term: 'Clear door width',
      plain: 'The space you can actually pass through when the door is open.',
    },
    fr: {
      term: 'Largeur libre de porte',
      plain: 'L’espace réel pour passer quand la porte est ouverte.',
    },
  },
  {
    id: 'ramp',
    en: { term: 'Ramp', plain: 'A gently sloped surface used instead of steps.' },
    fr: { term: 'Rampe', plain: 'Une surface en pente douce qui remplace les marches.' },
  },
  {
    id: 'elevator',
    en: { term: 'Elevator', plain: 'A lift that carries people between floors.' },
    fr: {
      term: 'Ascenseur',
      plain: 'Une cabine qui transporte les personnes d’un étage à l’autre.',
    },
  },
  {
    id: 'grab-bar',
    en: { term: 'Grab bar', plain: 'A sturdy bar fixed to a wall to hold onto.' },
    fr: { term: 'Barre d’appui', plain: 'Une barre solide fixée au mur pour s’y tenir.' },
  },
  {
    id: 'accessible-washroom',
    en: {
      term: 'Accessible washroom',
      plain: 'A washroom with extra room to move and grab bars, as described by the place.',
    },
    fr: {
      term: 'Toilettes accessibles',
      plain:
        'Des toilettes avec plus d’espace pour se déplacer et des barres d’appui, selon ce que le lieu indique.',
    },
  },
  {
    id: 'accessible-parking',
    en: {
      term: 'Accessible parking',
      plain: 'A parking space the place marks as accessible.',
    },
    fr: {
      term: 'Stationnement accessible',
      plain: 'Une place de stationnement que le lieu indique comme accessible.',
    },
  },
];
