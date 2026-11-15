import type { Language } from "./types.js";

export interface ProgrammeLink {
  href: { en: string; fr: string };
  label: { en: string; fr: string };
  /** Language of the page opened from each interface language. */
  pageLanguage: { en: "en"; fr: "fr" };
  retrieved: "2026-11-13";
  homepageFallback: false;
  limit: { en: string; fr: string };
}

export interface ProgrammeEntry {
  id: string;
  name: { en: string; fr: string };
  description: { en: string; fr: string };
  links: readonly ProgrammeLink[];
  unknowns: string[];
}

const CHECKED = "2026-11-13" as const;

export const NO_REPLACEMENT = {
  en: "The App does not replace any organisation's services. No organisation has endorsed the App.",
  fr: "L'application ne remplace les services d'aucune organisation. Aucune organisation n'a approuvé l'application.",
} as const;

export const NO_ENDORSEMENT = {
  en: "No endorsement is claimed. A link is not a partnership.",
  fr: "Aucune approbation n'est revendiquée. Un lien n'est pas un partenariat.",
} as const;

/**
 * Programme areas are not listed. The App does not publish a named
 * organisation's directory, audited groupings, or official contact pages.
 * Unknown stays unknown: no sample programmes are dressed up as real ones.
 */
export const PROGRAMMES: readonly ProgrammeEntry[] = [];

/**
 * No organisation contact page is shipped. The App does not speak for, or
 * link out to another organisation as if it operated or endorsed the App.
 */
export const ORGANISATION_CONTACT = {
  retrieved: CHECKED,
  pageUrl: { en: "", fr: "" },
  pageLanguage: { en: "en" as const, fr: "fr" as const },
  label: {
    en: "No organisation contact page is included.",
    fr: "Aucune page de contact d'organisation n'est incluse.",
  },
  limit: {
    en: "The App is independent. It is not operated by, and it is not affiliated with, any organisation.",
    fr: "L'application est indépendante. Elle n'est pas exploitée par une organisation, et elle n'est pas affiliée à une organisation.",
  },
} as const;

export const ATTENDANT_SERVICES_NOTE = {
  en: "Attendant services are not listed. Not listed as a current programme. Whether any organisation currently offers them was not verified.",
  fr: "Les services de préposés ne sont pas listés. On n'a pas vérifié si une organisation les offre actuellement.",
} as const;

export interface ExplainerSection {
  id: "staffing" | "safety" | "reporting" | "accessibility" | "agreement";
  title: { en: string; fr: string };
  body: { en: string; fr: string };
  notRunning: true;
}

export const MODERATION_EXPLAINER: readonly ExplainerSection[] = [
  {
    id: "staffing",
    title: { en: "Moderation staffing", fr: "Personnel de modération" },
    body: {
      en: "A live community needs trained people, a published review time, and French-speaking reviewers for French tips. The proposed time in the plan is one working day. Nobody is rostered here.",
      fr: "Une communauté en service a besoin de personnes formées, d'un délai de revue publié et de réviseurs francophones pour les conseils en français. Le délai proposé dans le plan est d'un jour ouvrable. Personne n'est inscrit ici.",
    },
    notRunning: true,
  },
  {
    id: "safety",
    title: { en: "Community safety rules", fr: "Règles de sécurité communautaire" },
    body: {
      en: "Tips may describe a place. They may not give health advice, transfer instruction, equipment recommendations, or benefits decisions. There is no mentor matching and no private messaging. Crisis text is not stored.",
      fr: "Les conseils peuvent décrire un lieu. Ils ne peuvent pas donner d'avis de santé, d'instruction de transfert, de recommandation d'équipement ou de décision de prestation. Il n'y a pas de jumelage de mentors ni de messages privés. Un texte de crise n'est pas enregistré.",
    },
    notRunning: true,
  },
  {
    id: "reporting",
    title: { en: "Reporting and response", fr: "Signalement et réponse" },
    body: {
      en: "People need a way to report advice, errors, abuse, privacy problems, and safeguarding concerns, in the App and by phone and email once a service is staffed. A person reads safety reports. Software only sorts them. The reported person does not see who reported them.",
      fr: "Les personnes ont besoin d'un moyen de signaler un avis, une erreur, un abus, un problème de vie privée et une préoccupation de protection, dans l'application et par téléphone et courriel quand un service est doté. Une personne lit les signalements de sécurité. Le logiciel ne fait que les trier. La personne visée ne voit pas qui a signalé.",
    },
    notRunning: true,
  },
  {
    id: "accessibility",
    title: { en: "Accessibility of community content", fr: "Accessibilité du contenu communautaire" },
    body: {
      en: "Reporting, posting for review, and appeals have to work by keyboard, screen reader, switch, and voice, with large targets, in English and French. Decisions need a plain-language reason and an appeal.",
      fr: "Le signalement, l'envoi pour revue et les appels doivent fonctionner au clavier, au lecteur d'écran, au contacteur et à la voix, avec de grandes cibles, en français et en anglais. Les décisions ont besoin d'un motif en langage clair et d'un appel.",
    },
    notRunning: true,
  },
  {
    id: "agreement",
    title: { en: "Agreement required before a live community", fr: "Entente requise avant une communauté en service" },
    body: {
      en: "Before any live peer feature, the organisation that runs it needs a written safeguarding agreement covering screening, training, supervision, boundaries, privacy, and liability, or an independent safeguarding lead. Neither is in place.",
      fr: "Avant toute fonction de pairs en service, l'organisation qui l'exploite doit avoir une entente écrite de protection sur la sélection, la formation, la supervision, les limites, la vie privée et la responsabilité, ou une personne responsable de la protection indépendante. Ni l'une ni l'autre n'est en place.",
    },
    notRunning: true,
  },
];

export const NOT_RUNNING = {
  en: "This is not running in the prototype.",
  fr: "Ceci ne fonctionne pas dans le prototype.",
} as const;

export type SkeletonActionKind = "link_out";

export interface SkeletonScreen {
  id: "directory" | "events" | "moderation";
  path: string;
  actions: Array<{ kind: SkeletonActionKind; href: string }>;
}

/** Day 16 surface. Actions are link-outs only. There is no post, comment, message, or register action. */
export const PROTOTYPE_SKELETON: readonly SkeletonScreen[] = [
  { id: "directory", path: "/community", actions: [] },
  { id: "events", path: "/community/events", actions: [] },
  { id: "moderation", path: "/community/safety", actions: [] },
];

export function programmeText(language: Language): string {
  return PROGRAMMES.map((entry) => `${entry.name[language]}\n${entry.description[language]}`).join("\n");
}


/** Empty when the catalogue honestly lists no named-organisation programmes. */
export function programmeLinkDefects(): string[] {
  const defects: string[] = [];
  if (PROGRAMMES.length !== 0) {
    defects.push("programme catalogue should be empty until an unbranded, licensed source is confirmed");
  }
  return defects;
}
