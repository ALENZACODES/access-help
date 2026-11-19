/**
 * Plain-language notes on the two open licences the App accepts, and on the
 * "source" text a person gives with an observation. These are explanations of
 * what the licence names usually mean, not legal advice.
 */
import type { ReviewLang } from './text.js';
import { fill, pick } from './text.js';

export const ACCEPTED_LICENCES = ['CC0-1.0', 'ODbL-1.0'] as const;
export type AcceptedLicence = (typeof ACCEPTED_LICENCES)[number];

export interface LicenceNote {
  id: AcceptedLicence;
  name: string;
  summary: string;
  whatItMeans: string;
  whatYouDo: string;
}

const NOTES: Record<ReviewLang, Record<AcceptedLicence, Omit<LicenceNote, 'id'>>> = {
  en: {
    'CC0-1.0': {
      name: 'CC0 1.0 (public domain dedication)',
      summary: 'You give up your rights in your own observation as far as the law allows.',
      whatItMeans: 'Anyone may copy, change and reuse your observation for any purpose, with no need to credit you.',
      whatYouDo: 'Choose this only for facts you collected yourself, on your own visit, and that you are free to give away.',
    },
    'ODbL-1.0': {
      name: 'ODbL 1.0 (Open Database Licence)',
      summary: 'Others may use the data, if they credit it and share changes to the data under the same licence.',
      whatItMeans: 'The data stays open. A person who builds a database from it must credit the source and keep their version of the data open too.',
      whatYouDo: 'Choose this for your own observations when you want credit and an open database. Do not copy data from a source that does not allow it.',
    },
  },
  fr: {
    'CC0-1.0': {
      name: 'CC0 1.0 (dédicace au domaine public)',
      summary: 'Vous renoncez à vos droits sur votre propre observation, dans la mesure permise par la loi.',
      whatItMeans: 'Toute personne peut copier, modifier et réutiliser votre observation, à toute fin, sans avoir à vous citer.',
      whatYouDo: 'Choisissez-la seulement pour des faits recueillis par vous-même, lors de votre propre visite, et que vous êtes libre de céder.',
    },
    'ODbL-1.0': {
      name: 'ODbL 1.0 (licence ouverte de base de données)',
      summary: 'D’autres peuvent utiliser les données, à condition de les créditer et de partager leurs modifications sous la même licence.',
      whatItMeans: 'Les données restent ouvertes. Qui bâtit une base de données à partir d’elles doit citer la source et garder sa version ouverte aussi.',
      whatYouDo: 'Choisissez-la pour vos propres observations si vous voulez être cité et garder une base ouverte. Ne copiez pas de données d’une source qui ne le permet pas.',
    },
  },
};

export function isAcceptedLicence(value: string): value is AcceptedLicence {
  return (ACCEPTED_LICENCES as readonly string[]).includes(value);
}

export function licenceNote(id: AcceptedLicence, lang: ReviewLang): LicenceNote {
  return { id, ...NOTES[lang][id] };
}

export function allLicenceNotes(lang: ReviewLang): LicenceNote[] {
  return ACCEPTED_LICENCES.map((id) => licenceNote(id, lang));
}

/** A licence the App does not accept. The answer is the same for every unknown value: it is not accepted. */
export function licenceProblem(value: string, lang: ReviewLang): string | null {
  if (isAcceptedLicence(value)) return null;
  return fill(
    pick(
      lang,
      'The licence "{value}" is not one the App accepts. Use {list}.',
      'La licence «\u202f{value}\u202f» n’est pas acceptée par l’application. Utilisez {list}.',
    ),
    { value: value.trim() === '' ? '—' : value, list: ACCEPTED_LICENCES.join(pick(lang, ' or ', ' ou ')) },
  );
}

export type SourceKind = 'empty' | 'own-visit' | 'link' | 'other';

const OWN_VISIT = /\b(?:own (?:visit|survey|observation)|on[- ]site|site visit|survey|visited|i (?:saw|visited|measured|walked)|my (?:visit|own))\b|\b(?:visite|sur place|relevé|j’ai (?:vu|visité|mesuré)|mon observation|ma visite)\b/iu;
const LINK = /\b(?:https?:\/\/|www\.)\S+/i;

/** Classifies the free-text source. A link is not treated as the person's own visit. */
export function sourceKind(source: string): SourceKind {
  const text = source.trim();
  if (text === '') return 'empty';
  if (LINK.test(text)) return 'link';
  if (OWN_VISIT.test(text)) return 'own-visit';
  return 'other';
}

export function sourceAdvice(kind: SourceKind, lang: ReviewLang): string | null {
  switch (kind) {
    case 'empty':
      return pick(lang, 'Add where this observation comes from, for example "own site visit".', 'Indiquez d’où vient cette observation, par exemple «\u202fma visite sur place\u202f».');
    case 'link':
      return pick(
        lang,
        'A web address is not an observation of your own. Do not copy from other maps, listings or photos you do not own. Say what you saw yourself.',
        'Une adresse web n’est pas une observation de votre part. Ne copiez pas d’autres cartes, annonces ou photos qui ne sont pas à vous. Dites ce que vous avez vu vous-même.',
      );
    case 'other':
      return pick(
        lang,
        'The source does not say it was your own visit. If it was, say so. If it was not, make sure the licence lets you share it.',
        'La source ne dit pas qu’il s’agit de votre visite. Si c’est le cas, dites-le. Sinon, assurez-vous que la licence vous permet de la partager.',
      );
    case 'own-visit':
      return null;
  }
}
