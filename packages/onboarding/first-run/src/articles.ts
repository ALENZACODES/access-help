import type { Localized } from "../../src/paths";

/**
 * Help-centre articles (EN/FR). Provenance: original text written for the App,
 * licence CC0-1.0, dated 2026-11-15. Navigation help only: no medical or
 * eligibility advice. Every claim about the App describes something it does
 * today and that a test checks. The App does not run a scanner and does not
 * listen to speech, and the articles say so.
 * French uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const ARTICLES_META = {
  source: "Original copy written for the App",
  licence: "CC0-1.0",
  date: "2026-11-15",
} as const;

export type ArticleMode = "keyboard" | "switch";

export interface ArticleSection {
  readonly id: string;
  readonly heading: Localized;
  readonly paragraphs?: readonly Localized[];
  /** Numbered steps, shown as an ordered list. */
  readonly steps?: readonly Localized[];
  /** Shows the table of keys from keys.ts in this section. */
  readonly keys?: true;
}

export interface Article {
  readonly id: string;
  readonly title: Localized;
  readonly summary: Localized;
  /** The way of moving this article is written for, when it is for one. */
  readonly mode?: ArticleMode;
  readonly sections: readonly ArticleSection[];
  readonly relatedPaths: readonly string[];
  readonly relatedArticles: readonly string[];
}

export const ARTICLES: readonly Article[] = [
  {
    id: "keyboard",
    title: { en: "Using the App with a keyboard", fr: "Utiliser l’App avec un clavier" },
    summary: {
      en: "Every control can be reached with Tab. These are the keys the App handles.",
      fr: "Chaque contrôle est accessible avec Tab. Voici les touches que l’App gère.",
    },
    mode: "keyboard",
    sections: [
      {
        id: "keys",
        heading: { en: "Keys that work", fr: "Touches qui fonctionnent" },
        paragraphs: [
          {
            en: "Controls are ordinary buttons, links and fields, so your browser’s own keys also work.",
            fr: "Les contrôles sont des boutons, des liens et des champs ordinaires, donc les touches de votre navigateur fonctionnent aussi.",
          },
        ],
        keys: true,
      },
      {
        id: "focus",
        heading: { en: "Where focus goes", fr: "Où va le focus" },
        paragraphs: [
          {
            en: "When a new screen opens, focus moves to its main heading, so a screen reader reads it first. Press Tab to reach the first control.",
            fr: "Quand un nouvel écran s’ouvre, le focus passe à son titre principal, donc un lecteur d’écran le lit en premier. Appuyez sur Tab pour atteindre le premier contrôle.",
          },
          {
            en: "After you press a choice, such as a filter button, focus stays on that button. In the help centre, going back to the list returns focus to the guide you opened.",
            fr: "Après un choix, par exemple un bouton de filtre, le focus reste sur ce bouton. Dans le centre d’aide, revenir à la liste remet le focus sur le guide que vous avez ouvert.",
          },
        ],
      },
      {
        id: "skip",
        heading: { en: "Skipping the menu", fr: "Passer le menu" },
        paragraphs: [
          {
            en: "The first Tab stop on every screen is a link named Skip to main content. Press Enter on it to jump past the menu.",
            fr: "Le premier arrêt de Tab sur chaque écran est un lien nommé Passer au contenu principal. Appuyez sur Entrée pour sauter le menu.",
          },
        ],
      },
      {
        id: "no-traps",
        heading: { en: "No traps and no letter shortcuts", fr: "Pas de piège ni de raccourcis par lettre" },
        paragraphs: [
          {
            en: "Tab is never taken over, so you can always leave a group of options. The App adds no shortcuts that use a single letter key, so they cannot clash with your assistive technology.",
            fr: "Tab n’est jamais détourné, donc vous pouvez toujours quitter un groupe d’options. L’App n’ajoute aucun raccourci à une seule lettre, ce qui évite les conflits avec votre technologie d’assistance.",
          },
        ],
      },
    ],
    relatedPaths: ["move-with-keyboard"],
    relatedArticles: ["voice", "display"],
  },
  {
    id: "switch",
    title: { en: "Using the App with one switch", fr: "Utiliser l’App avec un contacteur" },
    summary: {
      en: "What the App saves for switch users, and what it leaves to your device.",
      fr: "Ce que l’App enregistre pour les utilisateurs de contacteur, et ce qu’elle laisse à votre appareil.",
    },
    mode: "switch",
    sections: [
      {
        id: "no-scanner",
        heading: { en: "The App does not run a scanner", fr: "L’App n’exécute pas de balayage" },
        paragraphs: [
          {
            en: "The App does not highlight items one after another by itself. Nothing moves unless your device or your switch software moves it.",
            fr: "L’App ne met pas les éléments en surbrillance l’un après l’autre toute seule. Rien ne bouge, sauf si votre appareil ou votre logiciel de contacteur le fait bouger.",
          },
        ],
      },
      {
        id: "setup",
        heading: { en: "What Setup saves", fr: "Ce que la configuration enregistre" },
        paragraphs: [
          {
            en: "In Setup you can choose the single switch option and a preferred highlight interval. Both are only saved on this device.",
            fr: "Dans la configuration, vous pouvez choisir l’option contacteur unique et un intervalle de surbrillance préféré. Les deux sont enregistrés seulement sur cet appareil.",
          },
          {
            en: "If you skip a choice, it stays unknown. The App never guesses it for you.",
            fr: "Si vous ignorez un choix, il reste UNKNOWN. L’App ne le devine jamais à votre place.",
          },
        ],
      },
      {
        id: "device",
        heading: { en: "Moving with your own software", fr: "Se déplacer avec votre propre logiciel" },
        paragraphs: [
          {
            en: "Use the switch control on your device or your own switch software. It can move through the App’s buttons and press them for you.",
            fr: "Utilisez la commande par contacteur de votre appareil ou votre propre logiciel. Il peut parcourir les boutons de l’App et appuyer dessus à votre place.",
          },
          {
            en: "This depends on your device. The App cannot tell you whether it will work with a given switch.",
            fr: "Cela dépend de votre appareil. L’App ne peut pas vous dire si cela fonctionnera avec un contacteur donné.",
          },
        ],
      },
      {
        id: "fewer-presses",
        heading: { en: "Fewer presses", fr: "Moins d’appuis" },
        paragraphs: [
          {
            en: "Each help step has one Next button and one Previous button. Going back to the list returns focus to the guide you opened, so you do not start again from the top.",
            fr: "Chaque étape d’aide a un bouton Suivant et un bouton Précédent. Revenir à la liste remet le focus sur le guide ouvert, donc vous ne repartez pas du début.",
          },
        ],
      },
    ],
    relatedPaths: ["move-with-switch"],
    relatedArticles: ["keyboard", "voice"],
  },
  {
    id: "voice",
    title: { en: "Using voice control and dictation", fr: "Utiliser la commande vocale et la dictée" },
    summary: {
      en: "The App does not listen. Your device’s voice tools can press its buttons.",
      fr: "L’App n’écoute pas. Les outils vocaux de votre appareil peuvent appuyer sur ses boutons.",
    },
    sections: [
      {
        id: "no-listening",
        heading: { en: "The App does not listen", fr: "L’App n’écoute pas" },
        paragraphs: [
          {
            en: "The App has no microphone use, no voice commands and no speech features of its own.",
            fr: "L’App n’utilise pas le microphone et n’a ni commandes vocales ni fonctions de parole à elle.",
          },
        ],
      },
      {
        id: "device",
        heading: { en: "Your device’s voice control", fr: "La commande vocale de votre appareil" },
        paragraphs: [
          {
            en: "Many devices let you say the name of a button to press it. Whether this works depends on your device and its settings.",
            fr: "Beaucoup d’appareils permettent de dire le nom d’un bouton pour appuyer dessus. Le résultat dépend de votre appareil et de ses réglages.",
          },
        ],
      },
      {
        id: "names",
        heading: { en: "Button names", fr: "Noms des boutons" },
        paragraphs: [
          {
            en: "The name each button has for assistive tools always contains the text you see on it. So you can say what you read.",
            fr: "Le nom de chaque bouton pour les outils d’assistance contient toujours le texte que vous voyez dessus. Vous pouvez donc dire ce que vous lisez.",
          },
          {
            en: "On help pages, no two buttons share a name, so a spoken name picks only one. On other pages, buttons such as Open can repeat, and your device may ask which one you mean.",
            fr: "Dans les pages d’aide, deux boutons n’ont jamais le même nom, donc un nom prononcé n’en désigne qu’un. Ailleurs, des boutons comme Ouvrir peuvent se répéter, et votre appareil peut demander lequel vous voulez.",
          },
        ],
      },
      {
        id: "dictation",
        heading: { en: "Dictating into a field", fr: "Dicter dans un champ" },
        paragraphs: [
          {
            en: "To type by voice, use your device’s dictation in a text field. Read the text before you save a note.",
            fr: "Pour saisir à la voix, utilisez la dictée de votre appareil dans un champ de texte. Relisez le texte avant d’enregistrer une note.",
          },
        ],
      },
    ],
    relatedPaths: ["use-voice-control"],
    relatedArticles: ["keyboard", "switch"],
  },
  {
    id: "unknown",
    title: { en: "What Unknown means", fr: "Ce que veut dire UNKNOWN" },
    summary: {
      en: "Unknown means nobody has recorded the detail. It does not mean yes or no.",
      fr: "UNKNOWN veut dire que personne n’a saisi le détail. Cela ne veut dire ni oui ni non.",
    },
    sections: [
      {
        id: "meaning",
        heading: { en: "The meaning", fr: "Le sens" },
        paragraphs: [
          {
            en: "Unknown means there is no record. It does not mean yes. It does not mean no. Do not assume a place is accessible.",
            fr: "UNKNOWN veut dire qu’il n’y a aucune donnée. Cela ne veut pas dire oui. Cela ne veut pas dire non. Ne présumez pas qu’un lieu est accessible.",
          },
        ],
      },
      {
        id: "never-guess",
        heading: { en: "The App never fills it in", fr: "L’App ne le remplit jamais" },
        paragraphs: [
          {
            en: "A detail stays unknown until a note gives a Yes or a No with a source, a licence and a date.",
            fr: "Un détail reste UNKNOWN jusqu’à ce qu’une note donne Oui ou Non avec une source, une licence et une date.",
          },
        ],
      },
      {
        id: "filters",
        heading: { en: "Unknown in filters", fr: "UNKNOWN dans les filtres" },
        paragraphs: [
          {
            en: "When you filter places, unknown places are listed apart. They are not matches and they are not ruled out. Ask the place.",
            fr: "Quand vous filtrez des lieux, les lieux UNKNOWN sont listés à part. Ce ne sont pas des correspondances et ils ne sont pas exclus. Renseignez-vous auprès du lieu.",
          },
        ],
      },
      {
        id: "differ",
        heading: { en: "When notes disagree", fr: "Quand les notes divergent" },
        paragraphs: [
          {
            en: "If two notes disagree, the App says Reports differ and shows both. It does not pick the newest one.",
            fr: "Si deux notes divergent, l’App affiche Rapports divergents et montre les deux. Elle ne choisit pas la plus récente.",
          },
          {
            en: "An answer that is a year old or more may have changed. A visit plan suggests asking again.",
            fr: "Une réponse qui date d’un an ou plus a peut-être changé. Un plan de visite suggère de poser à nouveau la question.",
          },
        ],
      },
    ],
    relatedPaths: ["find-a-place"],
    relatedArticles: ["plan", "add-note"],
  },
  {
    id: "add-note",
    title: { en: "Adding a note about a place", fr: "Ajouter une note sur un lieu" },
    summary: {
      en: "Record only what you saw yourself, with a licence and a date.",
      fr: "Ne saisissez que ce que vous avez vu vous-même, avec une licence et une date.",
    },
    sections: [
      {
        id: "before",
        heading: { en: "Before you start", fr: "Avant de commencer" },
        paragraphs: [
          {
            en: "Add only what you saw yourself. When you are not sure, leave the detail on Unknown.",
            fr: "N’ajoutez que ce que vous avez vu vous-même. En cas de doute, laissez le détail sur UNKNOWN.",
          },
        ],
      },
      {
        id: "steps",
        heading: { en: "The steps", fr: "Les étapes" },
        steps: [
          { en: "Open Notes, then choose Add a note.", fr: "Ouvrez Notes, puis choisissez Ajouter une note." },
          {
            en: "Enter the place name. An address helps tell places with the same name apart.",
            fr: "Saisissez le nom du lieu. Une adresse aide à distinguer des lieux qui portent le même nom.",
          },
          { en: "For each detail, choose Yes, No or Unknown.", fr: "Pour chaque détail, choisissez Oui, Non ou UNKNOWN." },
          { en: "Choose a licence and the date you saw it.", fr: "Choisissez une licence et la date où vous l’avez vu." },
          { en: "Save the note.", fr: "Enregistrez la note." },
        ],
      },
      {
        id: "privacy",
        heading: { en: "Keep it about the place", fr: "Parlez du lieu seulement" },
        paragraphs: [
          {
            en: "Do not put phone numbers or email addresses in a note. The form refuses them.",
            fr: "Ne mettez pas de numéros de téléphone ni d’adresses courriel dans une note. Le formulaire les refuse.",
          },
        ],
      },
      {
        id: "drafts",
        heading: { en: "Drafts and copies", fr: "Brouillons et copies" },
        paragraphs: [
          {
            en: "If you leave the form half done, the App keeps a draft on this device and offers it back next time. You can export your notes as text to keep a copy.",
            fr: "Si vous quittez le formulaire en cours de route, l’App garde un brouillon sur cet appareil et vous le propose la fois suivante. Vous pouvez exporter vos notes en texte pour en garder une copie.",
          },
        ],
      },
    ],
    relatedPaths: ["add-a-detail"],
    relatedArticles: ["unknown", "data"],
  },
  {
    id: "plan",
    title: { en: "Planning a visit", fr: "Planifier une visite" },
    summary: {
      en: "Filter places, plan a visit, ask the right questions and compare places.",
      fr: "Filtrez des lieux, planifiez une visite, posez les bonnes questions et comparez des lieux.",
    },
    sections: [
      {
        id: "filter",
        heading: { en: "Filter places", fr: "Filtrer les lieux" },
        paragraphs: [
          {
            en: "In Places, choose the details that matter to you. Places are sorted into matches, unknown and does not match.",
            fr: "Dans Lieux, choisissez les détails qui comptent pour vous. Les lieux sont classés en correspondances, UNKNOWN et sans correspondance.",
          },
        ],
      },
      {
        id: "plan",
        heading: { en: "Plan a visit", fr: "Planifier une visite" },
        paragraphs: [
          {
            en: "Choose Plan a visit on a place. Each detail shows as Matches, Does not match, Unknown or Reports differ.",
            fr: "Choisissez Planifier une visite sur un lieu. Chaque détail apparaît comme Correspond, Ne correspond pas, UNKNOWN ou Rapports divergents.",
          },
        ],
      },
      {
        id: "questions",
        heading: { en: "Questions to ask", fr: "Questions à poser" },
        paragraphs: [
          {
            en: "Unknown and differing details come with a question for the place. You can tick when you asked and write what they said.",
            fr: "Les détails UNKNOWN ou divergents sont accompagnés d’une question à poser au lieu. Vous pouvez cocher quand vous l’avez posée et noter la réponse.",
          },
          {
            en: "Your notes do not change what the App records. A detail stays unknown until a report is added.",
            fr: "Vos notes ne changent pas ce que l’App enregistre. Un détail reste UNKNOWN tant qu’un rapport n’est pas ajouté.",
          },
        ],
      },
      {
        id: "compare",
        heading: { en: "Compare places", fr: "Comparer des lieux" },
        paragraphs: [
          {
            en: "Select two or three places and choose Compare selected. The table shows what the notes say. It does not score or rank places.",
            fr: "Sélectionnez deux ou trois lieux et choisissez Comparer la sélection. Le tableau montre ce que disent les notes. Il ne note ni ne classe les lieux.",
          },
          {
            en: "A plan only shows notes on this device. Check with the place before you go.",
            fr: "Un plan montre seulement les notes de cet appareil. Renseignez-vous auprès du lieu avant de partir.",
          },
        ],
      },
      {
        id: "roundup",
        heading: { en: "Shortlist round-up", fr: "Bilan de la liste courte" },
        paragraphs: [
          {
            en: "Shortlist round-up shows each place on your shortlist against your saved must-haves. It lists the questions still to ask.",
            fr: "Le bilan de la liste courte montre chaque lieu de votre liste courte face à vos incontournables enregistrés. Il liste les questions qui restent à poser.",
          },
          {
            en: "You can tick a question there. It is the same tick as on the visit plan.",
            fr: "Vous pouvez y cocher une question. C’est la même case que sur le plan de visite.",
          },
        ],
      },
      {
        id: "one-detail",
        heading: { en: "One detail across places", fr: "Un détail dans tous les lieux" },
        paragraphs: [
          {
            en: "Choose one detail to see every place sorted into Yes, No, Reports differ and Unknown. Places are listed by name.",
            fr: "Choisissez un détail pour voir chaque lieu rangé dans Oui, Non, Rapports divergents et UNKNOWN. Les lieux sont listés par nom.",
          },
        ],
      },
      {
        id: "no-record",
        heading: { en: "Details with no record", fr: "Détails sans donnée" },
        paragraphs: [
          {
            en: "Details with no record lists, detail by detail, the places where nothing is recorded. You can show only your must-haves.",
            fr: "La page des détails UNKNOWN liste, détail par détail, les lieux sans donnée. Vous pouvez n’afficher que vos incontournables.",
          },
        ],
      },
    ],
    relatedPaths: ["find-a-place"],
    relatedArticles: ["unknown", "data"],
  },
  {
    id: "display",
    title: { en: "Display and reading comfort", fr: "Affichage et confort de lecture" },
    summary: {
      en: "Change text size, spacing, contrast and motion.",
      fr: "Changez la taille du texte, l’espacement, le contraste et le mouvement.",
    },
    sections: [
      {
        id: "settings",
        heading: { en: "Display settings", fr: "Réglages d’affichage" },
        paragraphs: [
          {
            en: "In Display you can change text size, spacing, contrast and motion. Each choice applies at once and is saved on this device.",
            fr: "Dans Affichage, vous pouvez changer la taille du texte, l’espacement, le contraste et le mouvement. Chaque choix s’applique tout de suite et est enregistré sur cet appareil.",
          },
          {
            en: "After you press a choice, focus stays on it, so you can try the next one.",
            fr: "Après un choix, le focus reste dessus, ce qui permet d’essayer le suivant.",
          },
        ],
      },
      {
        id: "zoom",
        heading: { en: "Zoom and motion", fr: "Zoom et mouvement" },
        paragraphs: [
          {
            en: "The page allows your browser’s zoom. If your device asks for reduced motion, the App turns animation off.",
            fr: "La page permet le zoom de votre navigateur. Si votre appareil demande moins de mouvement, l’App désactive les animations.",
          },
        ],
      },
    ],
    relatedPaths: [],
    relatedArticles: ["keyboard"],
  },
  {
    id: "data",
    title: { en: "Your data stays on this device", fr: "Vos données restent sur cet appareil" },
    summary: {
      en: "Where your notes are kept, how offline use works and how to keep a copy.",
      fr: "Où vos notes sont conservées, comment fonctionne l’usage hors ligne et comment garder une copie.",
    },
    sections: [
      {
        id: "local",
        heading: { en: "Saved here only", fr: "Enregistré ici seulement" },
        paragraphs: [
          {
            en: "Your notes, must-haves, shortlist and your own plan notes are saved in this browser on this device. The App does not send them anywhere.",
            fr: "Vos notes, incontournables, liste courte et notes de plan sont enregistrés dans ce navigateur, sur cet appareil. L’App ne les envoie nulle part.",
          },
          {
            en: "Two small help choices are saved the same way: whether you read articles one section at a time, and the last few articles you opened. You can clear the list of opened articles from the help page.",
            fr: "Deux petits choix d’aide sont enregistrés de la même façon\u00A0: lire les articles une section à la fois, et les derniers articles ouverts. Vous pouvez effacer la liste des articles ouverts depuis la page d’aide.",
          },
          {
            en: "The help list has a page called What is saved on this device. It shows each item and its size, and lets you clear any of them.",
            fr: "La liste d’aide a une page intitulée Ce qui est enregistré sur cet appareil. Elle montre chaque élément et sa taille, et vous laisse effacer ce que vous voulez.",
          },
        ],
      },
      {
        id: "offline",
        heading: { en: "Without a connection", fr: "Sans connexion" },
        paragraphs: [
          {
            en: "After the first visit, the pages can open without a connection when your browser allows it. A line at the bottom of each page says what is ready.",
            fr: "Après la première visite, les pages peuvent s’ouvrir sans connexion si votre navigateur le permet. Une ligne au bas de chaque page indique ce qui est prêt.",
          },
        ],
      },
      {
        id: "copies",
        heading: { en: "Keeping a copy", fr: "Garder une copie" },
        paragraphs: [
          {
            en: "To keep a copy or move to another device, use the export in Notes and the backup text in Places.",
            fr: "Pour garder une copie ou changer d’appareil, utilisez l’exportation dans Notes et le texte de sauvegarde dans Lieux.",
          },
          {
            en: "Clearing your browser data removes your notes. Keep a copy first.",
            fr: "Effacer les données de votre navigateur supprime vos notes. Gardez d’abord une copie.",
          },
        ],
      },
    ],
    relatedPaths: [],
    relatedArticles: ["add-note", "plan"],
  },
];

export function getArticle(id: string): Article | undefined {
  return ARTICLES.find((a) => a.id === id);
}

/** The article written for a way of moving, or undefined when the way is unknown or has none. */
export function articleForMode(mode: string | undefined): Article | undefined {
  return mode === undefined ? undefined : ARTICLES.find((a) => a.mode === mode);
}

/** Ids safe for use in addresses and anchors. */
export const ARTICLE_ID = /^[a-z0-9-]{1,40}$/;

/** Every string in an article, as [label, localized] pairs, for the copy audit. */
export function articleStrings(a: Article): Array<[string, Localized]> {
  const out: Array<[string, Localized]> = [
    [`articles.${a.id}.title`, a.title],
    [`articles.${a.id}.summary`, a.summary],
  ];
  for (const s of a.sections) {
    out.push([`articles.${a.id}.${s.id}.heading`, s.heading]);
    (s.paragraphs ?? []).forEach((p, i) => out.push([`articles.${a.id}.${s.id}.p${i + 1}`, p]));
    (s.steps ?? []).forEach((p, i) => out.push([`articles.${a.id}.${s.id}.step${i + 1}`, p]));
  }
  return out;
}
