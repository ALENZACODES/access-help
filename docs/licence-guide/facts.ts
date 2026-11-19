/**
 * Plain-language facts about the two open licences the App accepts. Pure: no network, no
 * storage, no clock. This is a short summary to help a person find their way. It is not legal
 * advice, and the licence text itself is what counts.
 */
import { pick, type PreLang } from '../presubmit/text.js';

export const GUIDE_LICENCES = ['CC0-1.0', 'ODbL-1.0'] as const;
export type GuideLicence = (typeof GUIDE_LICENCES)[number];

export function isGuideLicence(value: string): value is GuideLicence {
  return (GUIDE_LICENCES as readonly string[]).includes(value);
}

export interface LicenceFacts {
  id: GuideLicence;
  fullName: string;
  /** One sentence on what the licence is. */
  inShort: string;
  youMay: string[];
  youMust: string[];
  goodToKnow: string[];
  creditRequired: boolean;
  shareAlike: boolean;
}

function cc0(lang: PreLang): LicenceFacts {
  return {
    id: 'CC0-1.0',
    fullName: 'Creative Commons Zero 1.0 Universal',
    inShort: pick(
      lang,
      'The person who made the data gave up their rights in it, as far as the law allows.',
      'La personne qui a produit les données a renoncé à ses droits sur celles-ci, dans la mesure où la loi le permet.',
    ),
    youMay: [
      pick(lang, 'Copy the data and share it.', 'Copier les données et les partager.'),
      pick(lang, 'Change it and mix it with other data.', 'Les modifier et les mélanger avec d’autres données.'),
      pick(lang, 'Use it for any purpose, paid or unpaid.', 'Les utiliser à toute fin, payante ou non.'),
    ],
    youMust: [],
    goodToKnow: [
      pick(lang, 'Credit is not required. The App still records the source, so people can see where a record came from.', 'La mention de la source n’est pas exigée. L’application note quand même la source, pour qu’on voie d’où vient une fiche.'),
      pick(lang, 'The data comes with no promise that it is right or complete.', 'Les données sont fournies sans promesse qu’elles soient justes ou complètes.'),
      pick(lang, 'It does not cover trademarks or patents.', 'Elle ne couvre ni les marques de commerce ni les brevets.'),
    ],
    creditRequired: false,
    shareAlike: false,
  };
}

function odbl(lang: PreLang): LicenceFacts {
  return {
    id: 'ODbL-1.0',
    fullName: 'Open Data Commons Open Database License 1.0',
    inShort: pick(
      lang,
      'An open licence for databases that asks for credit and asks that changed versions stay open.',
      'Une licence ouverte pour les bases de données, qui demande de citer la source et de garder ouvertes les versions modifiées.',
    ),
    youMay: [
      pick(lang, 'Copy the database and share it.', 'Copier la base de données et la partager.'),
      pick(lang, 'Change it and build on it.', 'La modifier et s’en servir comme base.'),
      pick(lang, 'Make things from it, such as a map or a list.', 'En tirer des productions, comme une carte ou une liste.'),
    ],
    youMust: [
      pick(lang, 'Credit the source in the way the licence describes.', 'Citer la source de la façon décrite par la licence.'),
      pick(lang, 'Share a changed database you use in public under the same licence.', 'Partager sous la même licence une base modifiée que vous utilisez publiquement.'),
      pick(lang, 'Keep it open: if you share a locked copy, also offer one without the lock.', 'La garder ouverte\u00a0: si vous partagez une copie verrouillée, offrez-en aussi une sans verrou.'),
    ],
    goodToKnow: [
      pick(lang, 'A map or list made from the data needs a notice saying where the data came from.', 'Une carte ou une liste tirée des données doit porter un avis disant d’où viennent les données.'),
      pick(lang, 'The data comes with no promise that it is right or complete.', 'Les données sont fournies sans promesse qu’elles soient justes ou complètes.'),
    ],
    creditRequired: true,
    shareAlike: true,
  };
}

export function licenceFacts(id: GuideLicence, lang: PreLang): LicenceFacts {
  return id === 'CC0-1.0' ? cc0(lang) : odbl(lang);
}

export function allLicenceFacts(lang: PreLang): LicenceFacts[] {
  return GUIDE_LICENCES.map((id) => licenceFacts(id, lang));
}

/** The line every screen and file that uses this guide should carry. */
export function notAdviceText(lang: PreLang): string {
  return pick(
    lang,
    'This is a short summary, not legal advice. Read the licence text before you share data.',
    'Ceci est un court résumé, pas un avis juridique. Lisez le texte de la licence avant de partager des données.',
  );
}
