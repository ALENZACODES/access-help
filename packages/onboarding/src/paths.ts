/**
 * Short onboarding paths for the help centre (EN/FR).
 *
 * Provenance: original copy written for the App. Licence: CC0-1.0.
 * Dated: 2026-11-15. No third-party data is used.
 * The copy gives navigation help only. It contains no medical or
 * eligibility advice.
 */

export type Locale = "en" | "fr";

export interface Localized {
  readonly en: string;
  readonly fr: string;
}

export interface OnboardingStep {
  readonly id: string;
  readonly title: Localized;
  readonly body: Localized;
}

export interface OnboardingPath {
  readonly id: string;
  readonly title: Localized;
  readonly summary: Localized;
  readonly steps: readonly OnboardingStep[];
}

export interface PathsMeta {
  readonly source: string;
  readonly licence: string;
  readonly date: string;
}

/** Minimum size of any interactive control rendered from these paths (px). */
export const MIN_TOUCH_TARGET_PX = 44;

export const PATHS_META: PathsMeta = {
  source: "Original copy written for the App",
  licence: "CC0-1.0",
  date: "2026-11-15",
};

const NBSP = "\u00A0";
const NNBSP = "\u202F";

export const ONBOARDING_PATHS: readonly OnboardingPath[] = [
  {
    id: "find-a-place",
    title: { en: "Find a place", fr: "Trouver un lieu" },
    summary: {
      en: "Look up a place and read what is known about it.",
      fr: "Cherchez un lieu et lisez ce qui est connu à son sujet.",
    },
    steps: [
      {
        id: "search",
        title: { en: "Search the map", fr: "Chercher sur la carte" },
        body: {
          en: "Type a place name or an address in the search box.",
          fr: "Saisissez le nom d’un lieu ou une adresse dans la zone de recherche.",
        },
      },
      {
        id: "read-details",
        title: { en: "Read the details", fr: "Lire les détails" },
        body: {
          en: "Open a result to see its details, the source and the date they were recorded.",
          fr: "Ouvrez un résultat pour voir ses détails, la source et la date de leur saisie.",
        },
      },
      {
        id: "unknown-means-unknown",
        title: { en: "Unknown means unknown", fr: "Inconnu veut dire inconnu" },
        body: {
          en: "If a detail says “unknown”, nobody has recorded it yet. Do not assume it is accessible.",
          fr:
            `Si un détail indique «${NNBSP}inconnu${NNBSP}», personne ne l’a encore saisi.` +
            ` Ne présumez pas qu’il est accessible.`,
        },
      },
    ],
  },
  {
    id: "add-a-detail",
    title: { en: "Add a detail", fr: "Ajouter un détail" },
    summary: {
      en: "Share what you have seen at a place.",
      fr: "Partagez ce que vous avez observé dans un lieu.",
    },
    steps: [
      {
        id: "pick-place",
        title: { en: "Pick the place", fr: "Choisir le lieu" },
        body: {
          en: "Search for the place, then open its page.",
          fr: "Cherchez le lieu, puis ouvrez sa page.",
        },
      },
      {
        id: "describe",
        title: { en: "Describe what you saw", fr: "Décrire ce que vous avez vu" },
        body: {
          en: "Add only what you observed yourself. Leave a field empty if you are not sure.",
          fr: "N’ajoutez que ce que vous avez observé vous-même. Laissez un champ vide en cas de doute.",
        },
      },
      {
        id: "submit",
        title: { en: "Send it", fr: "L’envoyer" },
        body: {
          en: "Submit your note. It will be shown with its date and source.",
          fr: "Envoyez votre note. Elle sera affichée avec sa date et sa source.",
        },
      },
    ],
  },
  {
    id: "get-help",
    title: { en: "Get help", fr: "Obtenir de l’aide" },
    summary: {
      en: "Find answers or contact the team.",
      fr: "Trouvez des réponses ou joignez l’équipe.",
    },
    steps: [
      {
        id: "browse-help",
        title: { en: "Browse the help centre", fr: "Parcourir le centre d’aide" },
        body: {
          en: "Choose a topic to read a short answer.",
          fr: "Choisissez un sujet pour lire une courte réponse.",
        },
      },
      {
        id: "contact",
        title: { en: "Contact the team", fr: "Joindre l’équipe" },
        body: {
          en: "If you cannot find an answer, use the contact form and describe the problem.",
          fr: "Si vous ne trouvez pas de réponse, utilisez le formulaire de contact et décrivez le problème.",
        },
      },
    ],
  },
];

export function getPath(id: string): OnboardingPath | undefined {
  return ONBOARDING_PATHS.find((p) => p.id === id);
}

export interface LocalizedStep {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

export interface LocalizedPath {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly steps: readonly LocalizedStep[];
}

export function localizePath(path: OnboardingPath, locale: Locale): LocalizedPath {
  return {
    id: path.id,
    title: path.title[locale],
    summary: path.summary[locale],
    steps: path.steps.map((s) => ({
      id: s.id,
      title: s.title[locale],
      body: s.body[locale],
    })),
  };
}

/** Every user-facing string in a path, as [label, localized] pairs. */
export function allStrings(path: OnboardingPath): Array<[string, Localized]> {
  const out: Array<[string, Localized]> = [
    [`${path.id}.title`, path.title],
    [`${path.id}.summary`, path.summary],
  ];
  for (const s of path.steps) {
    out.push([`${path.id}.${s.id}.title`, s.title]);
    out.push([`${path.id}.${s.id}.body`, s.body]);
  }
  return out;
}

/**
 * Returns a list of French typography problems (empty when clean):
 * straight apostrophes, missing U+00A0 before ":", missing U+202F before
 * ; ! ? and inside « ».
 */
export function frenchTypographyIssues(text: string): string[] {
  const issues: string[] = [];
  if (text.includes("'")) issues.push("straight apostrophe (use ’)");
  if (/(?<!\u00A0)(?<!\d):/.test(text) || /[ \u202F]:/.test(text)) {
    issues.push("':' must be preceded by U+00A0");
  }
  if (/(?<!\u202F)[;!?]/.test(text) || /[ \u00A0][;!?]/.test(text)) {
    issues.push("';', '!' and '?' must be preceded by U+202F");
  }
  if (/«(?!\u202F)/.test(text) || /(?<!\u202F)»/.test(text)) {
    issues.push("« » need U+202F inside");
  }
  return issues;
}

/** Terms that must never appear in user copy. */
export const FORBIDDEN_TERMS: readonly RegExp[] = [
  /spinal cord injury ontario/i,
  /\bscio\b/i,
  /sciontario/i,
  /\bAI\b/,
  /\bIA\b/,
  /artificial intelligence/i,
  /intelligence artificielle/i,
];

export { NBSP, NNBSP };
