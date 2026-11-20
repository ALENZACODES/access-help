/**
 * Strings for the place cards page (/places/cards). Every English key has a French twin.
 * French uses U+2019 for the apostrophe, U+00A0 before ":" and "%", U+202F before ; ! ? and
 * inside « ». The page makes a small file from one of a person's own observations to hand to
 * someone else, and keeps the cards other people handed to them apart from their own facts.
 * The App sends nothing.
 */
export const CARDS_STRINGS = {
  en: {
    link: "Place cards",
    title: "Place cards",
    lead: "Put one of your observations and what you measured into a small card to hand to someone, and keep the cards other people hand to you. Everything stays on this device until you pass a file on yourself.",
    makeHeading: "Make a card",
    noNotes: "You have no saved observations to make a card from.",
    addLink: "Add an observation",
    chooseLabel: "Observation",
    unnamed: "Place without a name",
    optionLabel: "{name}, {day}",
    withPoint: "Put the map point in the card",
    withTold: "Put what the place told me in the card",
    fromLabel: "A label for you (optional)",
    fromHelp: "A first name or a nickname, if you want one on the card. It is not kept on this device.",
    previewLabel: "The card as text",
    previewHelp: "Select the text and copy it, or download a file.",
    downloadCard: "Download the card file (.json)",
    downloadText: "Download the card as text (.txt)",
    madeNote: "The card file can be read by the App on another device. The text can be read by anyone.",
    receivedHeading: "Cards I received",
    fileLabel: "Card file (.json)",
    fileHelp: "Choose a card file someone gave you. It is read on this device and nothing is uploaded.",
    cardAdded: "Card added: {name}.",
    cardRemoved: "Card removed: {name}.",
    notSaved: "The card could not be saved on this device.",
    notesHeading: "About the card you just added",
    noCards: "You have no received card.",
    receivedOn: "Received on {day}.",
    measuredHeading: "What the sender measured",
    nothingMeasured: "Nothing was measured. Every fact is UNKNOWN.",
    toldHeading: "What the place told the sender",
    besideCaption: "This card beside what you measured at {name}.",
    colFact: "Fact",
    colYours: "You measured",
    colTheirs: "The card",
    colNote: "Side by side",
    downloadAgain: "Download card {n} again",
    remove: "Remove card {n}",
    filesNote: "No file is sent anywhere.",
  },
  fr: {
    link: "Fiches de lieu",
    title: "Fiches de lieu",
    lead: "Mettez une de vos observations et ce que vous avez mesuré dans une petite fiche à remettre à quelqu’un, et gardez les fiches que d’autres personnes vous remettent. Tout reste sur cet appareil jusqu’à ce que vous transmettiez vous-même un fichier.",
    makeHeading: "Faire une fiche",
    noNotes: "Vous n’avez aucune observation enregistrée pour faire une fiche.",
    addLink: "Ajouter une observation",
    chooseLabel: "Observation",
    unnamed: "Lieu sans nom",
    optionLabel: "{name}, {day}",
    withPoint: "Mettre le point sur la carte dans la fiche",
    withTold: "Mettre dans la fiche ce que le lieu m’a dit",
    fromLabel: "Une étiquette pour vous (facultatif)",
    fromHelp: "Un prénom ou un surnom, si vous en voulez un sur la fiche. Il n’est pas gardé sur cet appareil.",
    previewLabel: "La fiche en texte",
    previewHelp: "Sélectionnez le texte et copiez-le, ou téléchargez un fichier.",
    downloadCard: "Télécharger le fichier de la fiche (.json)",
    downloadText: "Télécharger la fiche en texte (.txt)",
    madeNote: "Le fichier de la fiche peut être lu par l’application sur un autre appareil. Le texte peut être lu par tout le monde.",
    receivedHeading: "Fiches que j’ai reçues",
    fileLabel: "Fichier de fiche (.json)",
    fileHelp: "Choisissez un fichier de fiche qu’on vous a donné. Il est lu sur cet appareil et rien n’est envoyé.",
    cardAdded: "Fiche ajoutée\u00a0: {name}.",
    cardRemoved: "Fiche retirée\u00a0: {name}.",
    notSaved: "La fiche n’a pas pu être enregistrée sur cet appareil.",
    notesHeading: "À propos de la fiche que vous venez d’ajouter",
    noCards: "Vous n’avez aucune fiche reçue.",
    receivedOn: "Reçue le {day}.",
    measuredHeading: "Ce que la personne qui envoie a mesuré",
    nothingMeasured: "Rien n’a été mesuré. Chaque fait est UNKNOWN.",
    toldHeading: "Ce que le lieu a dit à la personne qui envoie",
    besideCaption: "Cette fiche à côté de ce que vous avez mesuré à {name}.",
    colFact: "Élément",
    colYours: "Vous avez mesuré",
    colTheirs: "La fiche",
    colNote: "Côte à côte",
    downloadAgain: "Télécharger de nouveau la fiche {n}",
    remove: "Retirer la fiche {n}",
    filesNote: "Aucun fichier n’est envoyé où que ce soit.",
  },
} as const;

export type CardsKey = keyof (typeof CARDS_STRINGS)["en"];

export function cardsText(language: "en" | "fr", key: CardsKey, vars: Record<string, string | number> = {}): string {
  const template: string = CARDS_STRINGS[language][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function missingCardsKeys(): string[] {
  return (Object.keys(CARDS_STRINGS.en) as CardsKey[]).filter((key) => !(key in CARDS_STRINGS.fr) || CARDS_STRINGS.fr[key].trim() === "");
}
