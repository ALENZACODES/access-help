import type { Locale } from "../../switch-first/src/index";
import type { Pair } from "./copy";

/**
 * Plain-word meanings of the words used in the App and its help. Provenance:
 * original text written for the App, licence CC0-1.0, dated 2026-11-16.
 * Navigation help only: no medical or eligibility advice. Each meaning says
 * what the word means in the App. Where a word names something that belongs to
 * the person's device (a switch, scanning, voice control, a screen reader) the
 * meaning says so. The App does not run a scanner and does not listen.
 * French uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const GLOSSARY_META = {
  source: "Original copy written for the App",
  licence: "CC0-1.0",
  date: "2026-11-16",
} as const;

export interface Word {
  readonly id: string;
  readonly term: Pair;
  readonly meaning: Pair;
  /** Other words a person might type to look for this one. Used by search only. */
  readonly also: Pair;
}

export const GLOSSARY: readonly Word[] = [
  {
    id: "control",
    term: { en: "Control", fr: "Contrôle" },
    meaning: {
      en: "Anything you can use on a page: a button, a link, a field or a choice.",
      fr: "Tout ce que vous pouvez utiliser sur une page\u00A0: un bouton, un lien, un champ ou un choix.",
    },
    also: { en: "button link field widget", fr: "bouton lien champ" },
  },
  {
    id: "focus",
    term: { en: "Focus", fr: "Point de focalisation" },
    meaning: {
      en: "The control you are on right now. Keys such as Enter act on the control that has focus.",
      fr: "Le contrôle où vous êtes en ce moment. Des touches comme Entrée agissent sur le contrôle actif.",
    },
    also: { en: "cursor current where am i", fr: "curseur courant où suis-je focus" },
  },
  {
    id: "focus-ring",
    term: { en: "Focus ring", fr: "Contour de focalisation" },
    meaning: {
      en: "The outline drawn around the control that has focus, so you can see where you are.",
      fr: "Le contour tracé autour du contrôle qui a le focus, pour que vous voyiez où vous êtes.",
    },
    also: { en: "outline highlight", fr: "encadré surbrillance" },
  },
  {
    id: "tab",
    term: { en: "Tab key", fr: "Touche Tab" },
    meaning: {
      en: "A key that moves focus to the next control. Shift and Tab together move back to the one before.",
      fr: "Une touche qui déplace le focus vers le contrôle suivant. Maj et Tab ensemble reviennent au contrôle précédent.",
    },
    also: { en: "keyboard next previous", fr: "clavier suivant précédent" },
  },
  {
    id: "use",
    term: { en: "Use a control", fr: "Utiliser un contrôle" },
    meaning: {
      en: "Press Enter or Space on a button or link, or click or tap it. Moving to a control does not use it.",
      fr: "Appuyer sur Entrée ou Espace sur un bouton ou un lien, ou cliquer ou toucher. Se déplacer vers un contrôle ne l’utilise pas.",
    },
    also: { en: "press click tap activate select", fr: "appuyer cliquer toucher activer choisir" },
  },
  {
    id: "group",
    term: { en: "Group", fr: "Groupe" },
    meaning: {
      en: "A set of related options, such as Any, Yes and No. The arrow keys move between the options in a group.",
      fr: "Un ensemble d’options liées, comme Peu importe, Oui et Non. Les flèches passent d’une option à l’autre dans un groupe.",
    },
    also: { en: "options arrows radio", fr: "options flèches" },
  },
  {
    id: "heading",
    term: { en: "Heading", fr: "Titre" },
    meaning: {
      en: "A title that starts a part of a page. Software such as a screen reader can jump from heading to heading.",
      fr: "Un titre qui ouvre une partie de la page. Un logiciel comme un lecteur d’écran peut passer d’un titre à l’autre.",
    },
    also: { en: "title section", fr: "section" },
  },
  {
    id: "name",
    term: { en: "Name of a control", fr: "Nom d’un contrôle" },
    meaning: {
      en: "What a control is called to software such as a screen reader or voice control. It should include the words written on it.",
      fr: "Comment un contrôle s’appelle pour un logiciel comme un lecteur d’écran ou la commande vocale. Il doit inclure les mots écrits dessus.",
    },
    also: { en: "label accessible name say", fr: "étiquette dire" },
  },
  {
    id: "switch",
    term: { en: "Switch", fr: "Contacteur" },
    meaning: {
      en: "A button that a person presses in the way that suits them, in place of a mouse or keyboard. It belongs to your device, not to the App.",
      fr: "Un bouton qu’une personne actionne de la façon qui lui convient, au lieu d’une souris ou d’un clavier. Il appartient à votre appareil, pas à l’App.",
    },
    also: { en: "single switch access button", fr: "bouton unique accès" },
  },
  {
    id: "scanning",
    term: { en: "Scanning", fr: "Balayage" },
    meaning: {
      en: "A feature of some devices that picks out controls one after another so a switch can choose one. It comes from your device. The App does not run a scanner.",
      fr: "Une fonction de certains appareils qui désigne les contrôles un à un pour qu’un contacteur puisse en choisir un. Elle vient de votre appareil. L’App n’exécute aucun balayage.",
    },
    also: { en: "step scan highlight interval", fr: "défilement intervalle" },
  },
  {
    id: "voice-control",
    term: { en: "Voice control", fr: "Commande vocale" },
    meaning: {
      en: "A feature of some devices that lets you say the name of a control to use it. It comes from your device. The App does not listen.",
      fr: "Une fonction de certains appareils qui permet de dire le nom d’un contrôle pour l’utiliser. Elle vient de votre appareil. L’App n’écoute pas.",
    },
    also: { en: "speech speak dictation", fr: "parole parler dictée" },
  },
  {
    id: "screen-reader",
    term: { en: "Screen reader", fr: "Lecteur d’écran" },
    meaning: {
      en: "Software that reads the screen aloud or sends it to a braille display. It relies on the names and headings a page gives its parts.",
      fr: "Un logiciel qui lit l’écran à voix haute ou l’envoie à un afficheur braille. Il s’appuie sur les noms et les titres que la page donne à ses parties.",
    },
    also: { en: "braille speech reader", fr: "braille synthèse vocale" },
  },
  {
    id: "unknown",
    term: { en: "Unknown", fr: "UNKNOWN" },
    meaning: {
      en: "The App has no record for this detail. Unknown is not the same as No, and the App never turns Unknown into Yes or No.",
      fr: "L’App n’a aucun enregistrement pour ce détail. UNKNOWN n’est pas la même chose que Non, et l’App ne transforme jamais UNKNOWN en Oui ou en Non.",
    },
    also: { en: "no record missing not sure", fr: "aucun enregistrement manquant" },
  },
  {
    id: "on-device",
    term: { en: "Kept on this device", fr: "Gardé sur cet appareil" },
    meaning: {
      en: "Saved in this browser on this device only. It is not sent anywhere, and your other devices cannot see it.",
      fr: "Enregistré dans ce navigateur, sur cet appareil seulement. Rien n’est envoyé, et vos autres appareils ne peuvent pas le voir.",
    },
    also: { en: "local storage private saved privacy", fr: "stockage local privé" },
  },
  {
    id: "export",
    term: { en: "Export", fr: "Exporter" },
    meaning: {
      en: "Make a copy of your notes as text that you can keep or move to another device.",
      fr: "Faire une copie de vos notes en texte que vous pouvez garder ou déplacer vers un autre appareil.",
    },
    also: { en: "backup copy download", fr: "sauvegarde copie télécharger" },
  },
  {
    id: "draft",
    term: { en: "Draft", fr: "Brouillon" },
    meaning: {
      en: "A note you have not finished. The App keeps it on this device so you can finish it later.",
      fr: "Une note que vous n’avez pas terminée. L’App la garde sur cet appareil pour que vous la terminiez plus tard.",
    },
    also: { en: "unfinished half done restore", fr: "inachevé restaurer" },
  },
  {
    id: "filter",
    term: { en: "Filter", fr: "Filtre" },
    meaning: {
      en: "A way to show only the notes that match the details you choose. Notes with no record for a detail are shown as Unknown for that filter.",
      fr: "Une façon de n’afficher que les notes qui correspondent aux détails choisis. Les notes sans enregistrement pour un détail sont indiquées comme UNKNOWN pour ce filtre.",
    },
    also: { en: "narrow search needs", fr: "restreindre besoins" },
  },
  {
    id: "shortlist",
    term: { en: "Shortlist", fr: "Liste restreinte" },
    meaning: {
      en: "A short list of places you chose to look at again. You can put them side by side to compare.",
      fr: "Une courte liste de lieux que vous avez choisis de revoir. Vous pouvez les mettre côte à côte pour les comparer.",
    },
    also: { en: "compare saved favourites", fr: "comparer favoris" },
  },
  {
    id: "text-spacing",
    term: { en: "Text spacing", fr: "Espacement du texte" },
    meaning: {
      en: "The room between letters, words and lines. You can make it wider in Display.",
      fr: "L’espace entre les lettres, les mots et les lignes. Vous pouvez l’élargir dans Affichage.",
    },
    also: { en: "line height letter space", fr: "interligne" },
  },
  {
    id: "contrast",
    term: { en: "Contrast", fr: "Contraste" },
    meaning: {
      en: "How different text is from the colour behind it. You can ask for more contrast in Display.",
      fr: "À quel point le texte se distingue de la couleur derrière lui. Vous pouvez demander plus de contraste dans Affichage.",
    },
    also: { en: "colour dark light", fr: "couleur sombre clair" },
  },
  {
    id: "reduce-motion",
    term: { en: "Reduce motion", fr: "Réduire les animations" },
    meaning: {
      en: "A setting that cuts down movement on the page. You can choose it in Display.",
      fr: "Un réglage qui réduit les mouvements sur la page. Vous pouvez le choisir dans Affichage.",
    },
    also: { en: "animation movement", fr: "mouvement" },
  },
];

export const WORD_ID = /^[a-z0-9-]{1,40}$/;

export function getWord(id: string | undefined): Word | undefined {
  return id === undefined ? undefined : GLOSSARY.find((w) => w.id === id);
}

/** The glossary in the order a person reads it: alphabetical in their language, ignoring case and accents. */
export function sortedGlossary(locale: Locale): Word[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", ignorePunctuation: true });
  return [...GLOSSARY].sort((a, b) => collator.compare(a.term[locale], b.term[locale]) || a.id.localeCompare(b.id));
}

/** Anchor id of a word on the glossary page. */
export function wordAnchor(id: string): string {
  return `word-${id}`;
}

/** Copy checked by the copy audit, keyed like the articles. */
export function glossaryStrings(): Array<[string, Pair]> {
  return GLOSSARY.flatMap((w): Array<[string, Pair]> => [
    [`glossary.${w.id}.term`, w.term],
    [`glossary.${w.id}.meaning`, w.meaning],
  ]);
}

export function glossaryToText(locale: Locale, title: string, intro: string): string {
  const colon = locale === "fr" ? "\u00A0:" : ":";
  const lines = [title, "=".repeat(Math.min(title.length, 60)), "", intro, ""];
  for (const w of sortedGlossary(locale)) lines.push(`${w.term[locale]}${colon} ${w.meaning[locale]}`, "");
  return lines.join("\n");
}

export function glossaryFilename(locale: Locale): string {
  return `words-${locale}.txt`;
}
