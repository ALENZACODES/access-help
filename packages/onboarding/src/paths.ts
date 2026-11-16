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
  /** In-app path where this step actually happens, when the help centre has one. */
  readonly href?: string;
  readonly linkLabel?: Localized;
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
      en: "Use the map in the App to look up a place. This help centre has articles, not place pages.",
      fr: "Utilisez la carte dans l’App pour consulter un lieu. Ce centre d’aide contient des articles, pas des pages de lieu.",
    },
    steps: [
      {
        id: "search",
        title: { en: "Search help", fr: "Chercher dans l’aide" },
        body: {
          en: "On the help home page, type a word in the search box to find articles. This help centre has no map. Places from other parts of the App are not loaded here.",
          fr: "Sur la page d’accueil de l’aide, saisissez un mot dans la zone de recherche pour trouver des articles. Ce centre d’aide n’a pas de carte. Les lieux des autres parties de l’application ne sont pas chargés ici.",
        },
        href: "/",
        linkLabel: { en: "Open help search", fr: "Ouvrir la recherche d’aide" },
      },
      {
        id: "read-details",
        title: { en: "Read the details", fr: "Lire les détails" },
        body: {
          en: "Open a help article to read it. To see the recorded details for a place, open that place on the map in the App.",
          fr: "Ouvrez un article d’aide pour le lire. Pour voir les détails consignés d’un lieu, ouvrez ce lieu sur la carte dans l’App.",
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
          en: "Open the map in the App to choose the place, or export a note file to share. This help centre has no place pages.",
          fr: "Ouvrez la carte dans l’App pour choisir le lieu, ou exportez un fichier de note pour le partager. Ce centre d’aide n’a pas de pages de lieu.",
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
        title: { en: "Export the note", fr: "Exporter la note" },
        body: {
          en: "Export a note file to share. The help centre does not publish it or show it to others. You review the file and submit it yourself.",
          fr: "Exportez un fichier de note pour le partager. Le centre d’aide ne le publie pas et ne l’affiche pas à d’autres personnes. Vous examinez le fichier et le transmettez vous-même.",
        },
      },
    ],
  },
  {
    id: "get-help",
    title: { en: "Get help", fr: "Obtenir de l’aide" },
    summary: {
      en: "Find answers in the help articles.",
      fr: "Trouvez des réponses dans les articles d’aide.",
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
        title: { en: "If an article is not enough", fr: "Si un article ne suffit pas" },
        body: {
          en: "This help centre has no contact form. Search or browse the articles on the help home page, or open About for sources.",
          fr: "Le centre d’aide n’a pas de formulaire de contact. Cherchez ou parcourez les articles sur la page d’accueil de l’aide, ou ouvrez À propos pour les sources.",
        },
        href: "/about",
        linkLabel: { en: "Open About", fr: "Ouvrir À propos" },
      },
    ],
  },
  {
    id: "move-with-keyboard",
    title: { en: "Use a keyboard", fr: "Utiliser un clavier" },
    summary: {
      en: "Move around the App with Tab, the arrow keys and Enter.",
      fr: "Déplacez-vous dans l’App avec Tab, les flèches et Entrée.",
    },
    steps: [
      {
        id: "tab",
        title: { en: "Move with Tab", fr: "Se déplacer avec Tab" },
        body: {
          en: "Press Tab to go to the next control. Press Shift and Tab together to go back. The first stop is a link that skips to the main content.",
          fr: "Appuyez sur Tab pour passer au contrôle suivant. Appuyez sur Maj et Tab ensemble pour revenir en arrière. Le premier arrêt est un lien qui mène au contenu principal.",
        },
      },
      {
        id: "arrows",
        title: { en: "Use arrow keys in a group", fr: "Utiliser les flèches dans un groupe" },
        body: {
          en: "When options are shown as a group, the arrow keys, Home and End move between them. Tab leaves the group.",
          fr: "Quand des options forment un groupe, les flèches, Début et Fin permettent de passer de l’une à l’autre. Tab permet de quitter le groupe.",
        },
      },
      {
        id: "activate",
        title: { en: "Press Enter or Space", fr: "Appuyer sur Entrée ou Espace" },
        body: {
          en: "Press Enter or Space to use the control you are on. Moving to a control does not use it.",
          fr: "Appuyez sur Entrée ou Espace pour utiliser le contrôle où vous êtes. Se déplacer vers un contrôle ne l’utilise pas.",
        },
      },
    ],
  },
  {
    id: "move-with-switch",
    title: { en: "Use one switch", fr: "Utiliser un contacteur" },
    summary: {
      en: "Save how you move, and know what the App does and does not do.",
      fr: "Enregistrez votre façon de vous déplacer et sachez ce que l’App fait ou ne fait pas.",
    },
    steps: [
      {
        id: "choose",
        title: { en: "Choose the switch option", fr: "Choisir l’option contacteur" },
        body: {
          en: "In Setup, choose the single switch option. This only saves a preference on this device.",
          fr: "Dans la configuration, choisissez l’option contacteur unique. Cela enregistre seulement une préférence sur cet appareil.",
        },
      },
      {
        id: "timing",
        title: { en: "Timing is optional", fr: "Le délai est facultatif" },
        body: {
          en: "You may also save a preferred highlight interval. If you skip it, it stays unknown. The App does not run a scanner, so nothing moves by itself.",
          fr: "Vous pouvez aussi enregistrer un intervalle de surbrillance préféré. Si vous l’ignorez, il reste inconnu. L’App n’exécute pas de balayage, donc rien ne bouge tout seul.",
        },
      },
      {
        id: "device",
        title: { en: "Use your device’s switch software", fr: "Utiliser le logiciel de contacteur de votre appareil" },
        body: {
          en: "To move through the App with a switch, use the switch control on your device or your own switch software. It can press the App’s buttons for you. This depends on your device.",
          fr: "Pour parcourir l’App avec un contacteur, utilisez la commande par contacteur de votre appareil ou votre propre logiciel. Il peut appuyer sur les boutons de l’App à votre place. Cela dépend de votre appareil.",
        },
      },
    ],
  },
  {
    id: "use-voice-control",
    title: { en: "Use voice control", fr: "Utiliser la commande vocale" },
    summary: {
      en: "Use your device’s voice control or dictation with the App.",
      fr: "Utilisez la commande vocale ou la dictée de votre appareil avec l’App.",
    },
    steps: [
      {
        id: "device",
        title: { en: "Start with your device", fr: "Commencer avec votre appareil" },
        body: {
          en: "The App does not listen and has no voice commands of its own. If your device has voice control, it can press the App’s buttons for you.",
          fr: "L’App n’écoute pas et n’a pas de commandes vocales à elle. Si votre appareil offre la commande vocale, elle peut appuyer sur les boutons de l’App à votre place.",
        },
      },
      {
        id: "say-the-name",
        title: { en: "Say the name you see", fr: "Dire le nom que vous voyez" },
        body: {
          en: "Each button has the same name on the screen and for assistive tools. Say the name shown on the button. In the help pages every name is different.",
          fr: "Chaque bouton a le même nom à l’écran et pour les outils d’assistance. Dites le nom affiché sur le bouton. Dans les pages d’aide, chaque nom est différent.",
        },
      },
      {
        id: "dictate",
        title: { en: "Dictate into a field", fr: "Dicter dans un champ" },
        body: {
          en: "To fill in a field by voice, use your device’s dictation. Read the text before you save the note.",
          fr: "Pour remplir un champ à la voix, utilisez la dictée de votre appareil. Relisez le texte avant d’enregistrer la note.",
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
  readonly href?: string;
  readonly linkLabel?: string;
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
      ...(s.href ? { href: s.href } : {}),
      ...(s.linkLabel ? { linkLabel: s.linkLabel[locale] } : {}),
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
    if (s.linkLabel) out.push([`${path.id}.${s.id}.linkLabel`, s.linkLabel]);
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
  // Organisation names are built from parts so the names never appear as plain text in the source.
  new RegExp(["spin", "al c", "ord inj", "ury ", "ont", "ario"].join(""), "i"),
  new RegExp(["\\bsc", "io\\b"].join(""), "i"),
  new RegExp(["sci", "ontario"].join(""), "i"),
  /\bAI\b/,
  /\bIA\b/,
  /artificial intelligence/i,
  /intelligence artificielle/i,
];

export { NBSP, NNBSP };
