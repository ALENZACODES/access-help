/**
 * Strings for the observations screen (/places/mine). Every English key has a French twin.
 * French uses U+2019 for the apostrophe, U+00A0 before ":" and "%", and U+202F before ; ! ?.
 * The screen lets a person find, correct and remove their own saved observations. Everything
 * stays on the device. A correction is saved only after the person confirms it is what they saw.
 */
export const MINE_STRINGS = {
  en: {
    link: "My observations",
    title: "Look after my observations",
    lead: "Find, correct or remove the observations you saved on this device. A correction is saved only when you confirm it is what you saw yourself. Nothing is uploaded.",
    noNotes: "You have no saved observations.",
    addLink: "Add an observation",
    summaryHeading: "What you have saved",
    findHeading: "Find and sort",
    searchLabel: "Search by name, source, status, licence or date",
    sortLabel: "Sort",
    listHeading: "Your observations",
    noneFound: "No observation matches your search.",
    unnamed: "Place without a name",
    coordinates: "Coordinates: {lat}, {lon}",
    selectLabel: "Select {name}",
    editButton: "Correct {name}",
    editHeading: "Correct {name}",
    cancelButton: "Cancel",
    saveButton: "Save the correction",
    changesHeading: "What will change",
    noChanges: "Nothing is changed yet.",
    confirmLabel: "This is what I saw myself, and I release it under the licence chosen above.",
    saved: "The correction to {name} is saved on this device.",
    savedNoChange: "Nothing was changed, so nothing was saved.",
    saveFailed: "This device could not save the correction.",
    selectedCount: "Selected: {n}.",
    removeButton: "Remove the selected observations",
    removeConfirm: "Yes, remove {n} from this device",
    removeCancel: "Keep them",
    removeWarning: "This removes {n} from this device. You can take it back until you leave this page.",
    removed: "Removed from this device: {n}.",
    undoButton: "Take back my last change",
    undoFailed: "This device could not save, so the change was not taken back.",
    undoNote: "The list of changes you can take back is not stored. It is gone when you leave this page.",
  },
  fr: {
    link: "Mes observations",
    title: "Tenir mes observations à jour",
    lead: "Trouvez, corrigez ou retirez les observations enregistrées sur cet appareil. Une correction n’est enregistrée que si vous confirmez que c’est ce que vous avez vu vous-même. Rien n’est envoyé.",
    noNotes: "Vous n’avez aucune observation enregistrée.",
    addLink: "Ajouter une observation",
    summaryHeading: "Ce que vous avez enregistré",
    findHeading: "Trouver et trier",
    searchLabel: "Chercher par nom, source, état, licence ou date",
    sortLabel: "Trier",
    listHeading: "Vos observations",
    noneFound: "Aucune observation ne correspond à votre recherche.",
    unnamed: "Lieu sans nom",
    coordinates: "Coordonnées\u00a0: {lat}\u202f; {lon}",
    selectLabel: "Sélectionner {name}",
    editButton: "Corriger {name}",
    editHeading: "Corriger {name}",
    cancelButton: "Annuler",
    saveButton: "Enregistrer la correction",
    changesHeading: "Ce qui va changer",
    noChanges: "Rien n’est encore changé.",
    confirmLabel: "C’est ce que j’ai vu moi-même, et je le publie sous la licence choisie ci-dessus.",
    saved: "La correction de {name} est enregistrée sur cet appareil.",
    savedNoChange: "Rien n’a été changé, donc rien n’a été enregistré.",
    saveFailed: "Cet appareil n’a pas pu enregistrer la correction.",
    selectedCount: "Sélectionnées\u00a0: {n}.",
    removeButton: "Retirer les observations sélectionnées",
    removeConfirm: "Oui, retirer {n} de cet appareil",
    removeCancel: "Les garder",
    removeWarning: "Ceci retire {n} de cet appareil. Vous pouvez annuler tant que vous restez sur cette page.",
    removed: "Retirées de cet appareil\u00a0: {n}.",
    undoButton: "Annuler mon dernier changement",
    undoFailed: "Cet appareil n’a pas pu enregistrer, donc le changement n’a pas été annulé.",
    undoNote: "La liste des changements que vous pouvez annuler n’est pas conservée. Elle disparaît quand vous quittez cette page.",
  },
} as const;

export type MineKey = keyof (typeof MINE_STRINGS)["en"];

export function mineText(language: "en" | "fr", key: MineKey, vars: Record<string, string | number> = {}): string {
  const template: string = MINE_STRINGS[language][key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export function missingMineKeys(): string[] {
  return (Object.keys(MINE_STRINGS.en) as MineKey[]).filter((key) => !(key in MINE_STRINGS.fr) || MINE_STRINGS.fr[key].trim() === "");
}
