/**
 * Shell copy. Provenance: original text written for the App. Licence:
 * CC0-1.0. Dated 2026-11-15. Navigation help only; no medical or
 * eligibility advice. French uses ’, U+00A0 before ":" and U+202F before
 * ; ! ? and inside « ».
 */
import type { Locale } from "../../switch-first/src/index";

export interface Pair {
  readonly en: string;
  readonly fr: string;
}

export const NB = "\u00A0";
export const NN = "\u202F";

export const COPY_META = {
  source: "Original copy written for the App",
  licence: "CC0-1.0",
  date: "2026-11-15",
} as const;

export const COPY = {
  appName: { en: "The App", fr: "L’App" },
  skipLink: { en: "Skip to main content", fr: "Passer au contenu principal" },
  nav: {
    label: { en: "Main sections", fr: "Sections principales" },
    setup: { en: "Setup", fr: "Configuration" },
    help: { en: "Help", fr: "Aide" },
    notes: { en: "Notes", fr: "Notes" },
    display: { en: "Display", fr: "Affichage" },
  },
  language: {
    label: { en: "Language", fr: "Langue" },
    changed: { en: "Language changed to English.", fr: "La langue est maintenant le français." },
  },
  steps: {
    title: { en: "Next steps", fr: "Prochaines étapes" },
    summary: {
      en: "Parts of the App you can try, and what is saved for each. Nothing is required.",
      fr: "Les parties de l’App que vous pouvez essayer, et ce qui est enregistré pour chacune. Rien n’est obligatoire.",
    },
    open: { en: "Next steps", fr: "Prochaines étapes" },
    intro: {
      en: "These are parts of the App you can try. The order is only a suggestion, and none of it is required. The page only reads what is saved on this device.",
      fr: "Ce sont des parties de l’App que vous pouvez essayer. L’ordre n’est qu’une suggestion et rien n’est obligatoire. La page lit seulement ce qui est enregistré sur cet appareil.",
    },
    saved: { en: "Something is saved for this.", fr: "Quelque chose est enregistré pour cela." },
    notYet: { en: "Nothing saved for this yet.", fr: "Rien d’enregistré pour cela pour l’instant." },
    unknown: { en: "Unknown. The App cannot read what is saved.", fr: "UNKNOWN. L’App ne peut pas lire ce qui est enregistré." },
    suggested: { en: "Suggested next.", fr: "Suggéré ensuite." },
    of: { en: "of", fr: "sur" },
    haveSaved: { en: "have something saved.", fr: "ont quelque chose d’enregistré." },
    someUnknown: { en: "Some are Unknown.", fr: "Certaines sont UNKNOWN." },
  },
  device: {
    title: { en: "What is saved on this device", fr: "Ce qui est enregistré sur cet appareil" },
    summary: {
      en: "See what the App keeps in this browser, how much, and clear any of it.",
      fr: "Voyez ce que l’App garde dans ce navigateur, en quelle quantité, et effacez ce que vous voulez.",
    },
    open: { en: "What is saved on this device", fr: "Ce qui est enregistré sur cet appareil" },
    intro: {
      en: "Everything the App keeps is listed here. It is saved in this browser only. Nothing is sent anywhere. You can clear any item.",
      fr: "Tout ce que l’App garde est indiqué ici. C’est enregistré dans ce navigateur seulement. Rien n’est envoyé. Vous pouvez effacer chaque élément.",
    },
    empty: { en: "Nothing saved.", fr: "Rien d’enregistré." },
    saved: { en: "Saved.", fr: "Enregistré." },
    unreadable: {
      en: "Saved, but the App cannot read it. You can clear it.",
      fr: "Enregistré, mais l’App ne peut pas le lire. Vous pouvez l’effacer.",
    },
    unavailable: {
      en: "This browser does not let the App look. Nothing was changed.",
      fr: "Ce navigateur ne permet pas à l’App de regarder. Rien n’a été modifié.",
    },
    entries: { en: "entries you can read", fr: "entrées lisibles" },
    entryOne: { en: "1 entry you can read", fr: "1 entrée lisible" },
    size: { en: "KB", fr: "Ko" },
    clearVerb: { en: "Clear", fr: "Effacer" },
    confirmQuestion: { en: "Clear this? It cannot be undone.", fr: "Effacer cet élément\u202F? C’est irréversible." },
    yes: { en: "Yes, clear", fr: "Oui, effacer" },
    no: { en: "No, keep", fr: "Non, garder" },
    clearAll: { en: "Clear everything saved here", fr: "Tout effacer ici" },
    clearAllQuestion: { en: "Clear everything listed above? It cannot be undone.", fr: "Tout effacer ce qui est indiqué ci-dessus\u202F? C’est irréversible." },
    yesAll: { en: "Yes, clear everything", fr: "Oui, tout effacer" },
    noAll: { en: "No, keep everything", fr: "Non, tout garder" },
    nothingToClear: { en: "There is nothing to clear.", fr: "Il n’y a rien à effacer." },
    total: { en: "Total saved", fr: "Total enregistré" },
    notesHint: {
      en: "Clearing your notes also clears the shortlist and plan notes, which belong to those places. Make a copy first if you want to keep them. Export is in Notes.",
      fr: "Effacer vos notes efface aussi la liste restreinte et les notes de plan, qui appartiennent à ces lieux. Faites d’abord une copie si vous voulez les garder. L’exportation se trouve dans Notes.",
    },
    prefsHint: {
      en: "Clearing removes the saved copy. This screen keeps your choices until you close the App, and saves them again if you change one.",
      fr: "L’effacement supprime la copie enregistrée. Cet écran garde vos choix jusqu’à la fermeture de l’App, et les enregistre de nouveau si vous en changez un.",
    },
    clearedOne: { en: "Cleared.", fr: "Effacé." },
    clearedAll: { en: "Everything saved here was cleared.", fr: "Tout ce qui était enregistré ici a été effacé." },
    clearFailed: { en: "Some items could not be cleared.", fr: "Certains éléments n’ont pas pu être effacés." },
    kept: { en: "Kept. Nothing was cleared.", fr: "Conservé. Rien n’a été effacé." },
  },
  help: {
    title: { en: "Help centre", fr: "Centre d’aide" },
    intro: {
      en: "Short guides. Pick one to start.",
      fr: "Courts guides. Choisissez-en un pour commencer.",
    },
    backToList: { en: "All guides", fr: "Tous les guides" },
    prev: { en: "Previous step", fr: "Étape précédente" },
    next: { en: "Next step", fr: "Étape suivante" },
    openForm: { en: "Open the form", fr: "Ouvrir le formulaire" },
  },
  helpHome: {
    searchLabel: { en: "Search help", fr: "Rechercher dans l’aide" },
    searchHint: {
      en: "Type at least two letters. Results appear below as you type.",
      fr: "Saisissez au moins deux lettres. Les résultats s’affichent plus bas pendant la saisie.",
    },
    noResults: { en: "No help page matches that search.", fr: "Aucune page d’aide ne correspond à cette recherche." },
    clear: { en: "Clear the search", fr: "Effacer la recherche" },
    articles: { en: "Articles", fr: "Articles" },
    guides: { en: "Short guides", fr: "Courts guides" },
    suggested: {
      en: "Suggested for the way you chose to move.",
      fr: "Suggéré pour la façon de vous déplacer que vous avez choisie.",
    },
    onThisPage: { en: "On this page", fr: "Sur cette page" },
    related: { en: "Related guides", fr: "Guides liés" },
    notFound: { en: "That help page was not found.", fr: "Cette page d’aide est introuvable." },
    keyHeader: { en: "Key", fr: "Touche" },
    actionHeader: { en: "What it does", fr: "Ce qu’elle fait" },
    keysCaption: { en: "Keys the App handles", fr: "Touches gérées par l’App" },
    written: { en: "Written on", fr: "Rédigé le" },
    source: { en: "Source", fr: "Source" },
    licence: { en: "Licence", fr: "Licence" },
    findOpen: { en: "Help me find the right guide", fr: "M’aider à trouver le bon guide" },
    findTitle: { en: "Find the right help", fr: "Trouver la bonne aide" },
    findIntro: {
      en: "Pick one answer on each screen. You can go back at any time.",
      fr: "Choisissez une réponse sur chaque écran. Vous pouvez revenir en arrière à tout moment.",
    },
    findBack: { en: "Previous question", fr: "Question précédente" },
    findStartOver: { en: "Start again", fr: "Recommencer" },
    findNotFound: { en: "That question was not found. Starting again.", fr: "Cette question est introuvable. On recommence." },
    readSteps: { en: "Read one section at a time", fr: "Lire une section à la fois" },
    readWhole: { en: "Show the whole article", fr: "Afficher tout l’article" },
    readStepsOn: { en: "Showing one section at a time.", fr: "Une section à la fois est affichée." },
    readWholeOn: { en: "Showing the whole article.", fr: "L’article complet est affiché." },
    prevSection: { en: "Previous section", fr: "Section précédente" },
    nextSection: { en: "Next section", fr: "Section suivante" },
    recent: { en: "Recently opened.", fr: "Ouvert récemment." },
    clearRecent: { en: "Clear recently opened", fr: "Effacer les ouvertures récentes" },
    recentCleared: { en: "Recently opened list cleared.", fr: "La liste des ouvertures récentes a été effacée." },
    saveText: { en: "Save this article as a text file", fr: "Enregistrer cet article dans un fichier texte" },
    saveTextHint: {
      en: "The file is made on this device. Nothing is sent anywhere.",
      fr: "Le fichier est créé sur cet appareil. Rien n’est envoyé ailleurs.",
    },
  },
  bundle: {
    contents: { en: "Contents", fr: "Table des matières" },
    save: { en: "Save all the help as one text file", fr: "Enregistrer toute l’aide dans un seul fichier texte" },
    hint: {
      en: "Every article and the list of words, in plain text, made on this device. Nothing is sent. About",
      fr: "Tous les articles et la liste des mots, en texte simple, créé sur cet appareil. Rien n’est envoyé. Environ",
    },
    kb: { en: "KB.", fr: "Ko." },
  },
  words: {
    title: { en: "What words mean", fr: "Le sens des mots" },
    summary: {
      en: "Plain meanings for words such as focus, switch, scanning, voice control and Unknown.",
      fr: "Le sens simple de mots comme focus, contacteur, balayage, commande vocale et UNKNOWN.",
    },
    open: { en: "What words mean", fr: "Le sens des mots" },
    intro: {
      en: "Short meanings for the words used in the App and its help. Words that belong to your device say so.",
      fr: "De courtes définitions des mots utilisés dans l’App et son aide. Les mots qui relèvent de votre appareil le disent.",
    },
    jump: { en: "Jump to a word", fr: "Aller à un mot" },
    count: { en: "words", fr: "mots" },
    save: { en: "Save the words as text", fr: "Enregistrer les mots en texte" },
    saveHint: { en: "A plain text file made on this device. Nothing is sent.", fr: "Un fichier texte simple, créé sur cet appareil. Rien n’est envoyé." },
    notFound: { en: "That word is not in the list. Here is the whole list.", fr: "Ce mot n’est pas dans la liste. Voici toute la liste." },
  },
  names: {
    title: { en: "Names on this screen", fr: "Noms sur cet écran" },
    summary: {
      en: "See the name of every button, link and field on a screen, for voice control or a list of names.",
      fr: "Voyez le nom de chaque bouton, lien et champ d’un écran, pour la commande vocale ou une liste de noms.",
    },
    open: { en: "See the names on a screen", fr: "Voir les noms sur un écran" },
    intro: {
      en: "These are the names this page gives its controls. Your device’s own voice control may let you say them. The App does not listen.",
      fr: "Voici les noms que cette page donne à ses contrôles. La commande vocale de votre appareil peut vous permettre de les dire. L’App n’écoute pas.",
    },
    pick: { en: "Choose a screen", fr: "Choisissez un écran" },
    pickHint: { en: "The list shows everything on that screen, including the menu at the top.", fr: "La liste montre tout ce qui se trouve sur cet écran, y compris le menu du haut." },
    nameHeader: { en: "Name", fr: "Nom" },
    kindHeader: { en: "What it is", fr: "Ce que c’est" },
    noteHeader: { en: "Check", fr: "À contrôler" },
    caption: { en: "Names of the controls on this screen", fr: "Noms des contrôles sur cet écran" },
    sameName: { en: "Another control has this name.", fr: "Un autre contrôle porte ce nom." },
    differs: { en: "The name does not include the words written on it.", fr: "Le nom ne comprend pas les mots écrits dessus." },
    longName: { en: "Long name. You may only need to say part of it.", fr: "Nom long. Il suffit peut-être d’en dire une partie." },
    fine: { en: "Nothing to check.", fr: "Rien à contrôler." },
    kinds: {
      button: { en: "Button", fr: "Bouton" },
      link: { en: "Link", fr: "Lien" },
      field: { en: "Field", fr: "Champ" },
      choice: { en: "Choice", fr: "Choix" },
    },
    sections: {
      setup: { en: "Set up", fr: "Configuration" },
      notes: { en: "Notes and places", fr: "Notes et lieux" },
      help: { en: "Help", fr: "Aide" },
      display: { en: "Display", fr: "Affichage" },
    },
    countOne: { en: "1 control on this screen.", fr: "1 contrôle sur cet écran." },
    countMany: { en: "controls on this screen.", fr: "contrôles sur cet écran." },
    allClear: { en: "No name is repeated, and every name includes its visible words.", fr: "Aucun nom n’est répété, et chaque nom comprend ses mots visibles." },
    needCheck: { en: "Some names need a look. See the Check column.", fr: "Certains noms demandent un coup d’œil. Voir la colonne À contrôler." },
    save: { en: "Save these names as text", fr: "Enregistrer ces noms en texte" },
    saveHint: { en: "A plain text file made on this device. Nothing is sent.", fr: "Un fichier texte simple, créé sur cet appareil. Rien n’est envoyé." },
  },
  practice: {
    title: { en: "Try the keyboard", fr: "Essayer le clavier" },
    summary: {
      en: "Practice Tab, the arrow keys, Enter and Space on buttons that do nothing.",
      fr: "Exercez-vous avec Tab, les flèches, Entrée et Espace sur des boutons qui ne font rien.",
    },
    open: { en: "Try the keyboard practice", fr: "Essayer l’exercice au clavier" },
    intro: {
      en: "These buttons do not change anything. Use them to practice. Nothing is saved or sent.",
      fr: "Ces boutons ne changent rien. Servez-vous-en pour vous exercer. Rien n’est enregistré ni envoyé.",
    },
    note: {
      en: "The App only sees keys and presses. It cannot tell which device sent them.",
      fr: "L’App voit seulement les touches et les activations. Elle ne peut pas savoir quel appareil les a envoyées.",
    },
    groupLabel: { en: "Practice buttons", fr: "Boutons d’essai" },
    logLabel: { en: "What the App received", fr: "Ce que l’App a reçu" },
    empty: { en: "Nothing yet. Press a key or a button.", fr: "Rien pour l’instant. Appuyez sur une touche ou un bouton." },
    clear: { en: "Clear the log", fr: "Effacer le journal" },
    cleared: { en: "Log cleared.", fr: "Journal effacé." },
    total: { en: "Presses so far", fr: "Activations jusqu’ici" },
  },
  card: {
    title: { en: "Reading a place card", fr: "Lire une fiche de lieu" },
    summary: {
      en: "See how sources and unknown details are shown.",
      fr: "Voyez comment les sources et les détails UNKNOWN sont présentés.",
    },
    notice: {
      en: "Example only. This is not a real place.",
      fr: "Exemple seulement. Ce n’est pas un lieu réel.",
    },
    explain: {
      en: "Each detail shows its source, licence and date. A detail with no record says “Unknown”, and unknown does not mean no.",
      fr: `Chaque détail indique sa source, sa licence et sa date. Un détail sans enregistrement indique «${NN}UNKNOWN${NN}», et UNKNOWN ne veut pas dire non.`,
    },
  },
  facts: {
    "step-free-entry": { en: "Step-free entrance", fr: "Entrée sans marche" },
    "accessible-washroom": { en: "Accessible washroom", fr: "Toilettes accessibles" },
    "automatic-door": { en: "Automatic door", fr: "Porte automatique" },
    elevator: { en: "Elevator", fr: "Ascenseur" },
  },
  values: {
    yes: { en: "Yes", fr: "Oui" },
    no: { en: "No", fr: "Non" },
    unknown: { en: "Unknown", fr: "UNKNOWN" },
  },
  offline: {
    registered: {
      en: "Offline use is set up on this device. Some pages may still need a connection.",
      fr: "L’utilisation hors ligne est configurée sur cet appareil. Certaines pages peuvent tout de même demander une connexion.",
    },
    unsupported: {
      en: "Offline use is not available in this browser.",
      fr: "L’utilisation hors ligne n’est pas offerte dans ce navigateur.",
    },
    failed: {
      en: "Offline use could not be set up.",
      fr: "L’utilisation hors ligne n’a pas pu être configurée.",
    },
    pending: {
      en: "Preparing offline use.",
      fr: "Préparation de l’utilisation hors ligne.",
    },
  },
  display: {
    title: { en: "Display settings", fr: "Réglages d’affichage" },
    intro: {
      en: "Change how the App looks. Your choices are saved on this device only.",
      fr: "Changez l’apparence de l’App. Vos choix sont enregistrés sur cet appareil seulement.",
    },
    scale: { en: "Text size", fr: "Taille du texte" },
    spacing: { en: "Text spacing", fr: "Espacement du texte" },
    contrast: { en: "Contrast", fr: "Contraste" },
    motion: { en: "Motion", fr: "Animations" },
    normal: { en: "Normal", fr: "Normal" },
    wide: { en: "Wide", fr: "Espacé" },
    auto: { en: "Automatic", fr: "Automatique" },
    more: { en: "More contrast", fr: "Contraste accru" },
    reduce: { en: "Reduce motion", fr: "Réduire les animations" },
    changed: { en: "Display settings updated.", fr: "Réglages d’affichage mis à jour." },
  },
  notes: {
    title: { en: "My notes", fr: "Mes notes" },
    intro: {
      en: "Notes you add are kept on this device only. Nothing is sent anywhere.",
      fr: "Les notes que vous ajoutez restent sur cet appareil seulement. Rien n’est envoyé.",
    },
    add: { en: "Add a note", fr: "Ajouter une note" },
    empty: { en: "No notes yet.", fr: "Aucune note pour le moment." },
    all: { en: "All notes", fr: "Toutes les notes" },
    filterTitle: { en: "Filter by detail", fr: "Filtrer par détail" },
    any: { en: "Any", fr: "Peu importe" },
    searchLabel: { en: "Search by place name", fr: "Chercher par nom de lieu" },
    matches: { en: "Matches", fr: "Correspondances" },
    unknown: { en: "Unknown for this filter", fr: "UNKNOWN pour ce filtre" },
    excluded: { en: "Does not match", fr: "Ne correspond pas" },
    unknownExplain: {
      en: "These notes have no record for a detail you asked about. They may or may not match.",
      fr: "Ces notes n’ont aucun enregistrement pour un détail demandé. Elles peuvent correspondre ou non.",
    },
    noResults: { en: "No notes in this group.", fr: "Aucune note dans ce groupe." },
    remove: { en: "Remove", fr: "Retirer" },
    confirmRemove: { en: "Confirm removal", fr: "Confirmer le retrait" },
    cancel: { en: "Cancel", fr: "Annuler" },
    removed: { en: "Note removed.", fr: "Note retirée." },
    added: { en: "Note saved on this device.", fr: "Note enregistrée sur cet appareil." },
    dropped: {
      en: "Some saved notes could not be read and were left out.",
      fr: "Certaines notes enregistrées n’ont pas pu être lues et ont été laissées de côté.",
    },
    full: {
      en: "You have reached the limit of 200 notes. Remove one to add another.",
      fr: "Vous avez atteint la limite de 200 notes. Retirez-en une pour en ajouter une autre.",
    },
    export: { en: "Export notes", fr: "Exporter les notes" },
    exportHint: {
      en: "Copy this text or download it as a file. Keep it to move your notes to another device.",
      fr: "Copiez ce texte ou téléchargez-le en fichier. Conservez-le pour déplacer vos notes vers un autre appareil.",
    },
    exportLabel: { en: "Exported notes", fr: "Notes exportées" },
    download: { en: "Download file", fr: "Télécharger le fichier" },
    import: { en: "Import notes", fr: "Importer des notes" },
    importLabel: { en: "Paste exported notes here", fr: "Collez ici les notes exportées" },
    importButton: { en: "Import", fr: "Importer" },
    importErrors: {
      empty: { en: "Paste the exported text first.", fr: "Collez d’abord le texte exporté." },
      tooLarge: { en: "That text is too large to import.", fr: "Ce texte est trop volumineux pour être importé." },
      notJson: { en: "That text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
      wrongFormat: { en: "That text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
      wrongVersion: {
        en: "That export comes from a different version and cannot be imported.",
        fr: "Cette exportation provient d’une autre version et ne peut pas être importée.",
      },
    },
    importFailedSave: {
      en: "The notes could not be saved on this device.",
      fr: "Les notes n’ont pas pu être enregistrées sur cet appareil.",
    },
  },
  form: {
    title: { en: "Add a note", fr: "Ajouter une note" },
    intro: {
      en: "Share what you saw at a place. Leave a detail as Unknown if you did not see it.",
      fr: "Dites ce que vous avez vu dans un lieu. Laissez un détail à UNKNOWN si vous ne l’avez pas vu.",
    },
    sourceNote: {
      en: "Details you answer are recorded as a contributor report, with your date and licence.",
      fr: "Les détails auxquels vous répondez sont consignés comme rapport d’un contributeur, avec votre date et votre licence.",
    },
    noteHint: {
      en: "Do not include names, phone numbers or email addresses.",
      fr: "N’indiquez ni noms, ni numéros de téléphone, ni adresses courriel.",
    },
    licenceHint: {
      en: "Pick an open licence. Your note carries it when you export it.",
      fr: "Choisissez une licence ouverte. Votre note la conserve lorsque vous l’exportez.",
    },
    choose: { en: "Choose a licence", fr: "Choisissez une licence" },
    submit: { en: "Save note", fr: "Enregistrer la note" },
    cancel: { en: "Cancel", fr: "Annuler" },
    summaryTitle: { en: "Please fix these problems:", fr: `Veuillez corriger ces problèmes${NB}:` },
    restored: { en: "Your unsaved draft was restored.", fr: "Votre brouillon non enregistré a été restauré." },
  },
  places: {
    title: { en: "Places", fr: "Lieux" },
    intro: {
      en: "Notes about the same place are combined. When reports disagree, the App shows all of them and does not pick one.",
      fr: "Les notes sur un même lieu sont regroupées. Quand les rapports divergent, l’App les montre tous et n’en choisit aucun.",
    },
    viewPlaces: { en: "View by place", fr: "Voir par lieu" },
    viewNotes: { en: "View notes", fr: "Voir les notes" },
    open: { en: "Open", fr: "Ouvrir" },
    plan: { en: "Plan a visit", fr: "Planifier une visite" },
    back: { en: "All places", fr: "Tous les lieux" },
    empty: { en: "No places yet. Add a note to start.", fr: "Aucun lieu pour le moment. Ajoutez une note pour commencer." },
    notFound: { en: "That place was not found on this device.", fr: "Ce lieu est introuvable sur cet appareil." },
    differ: { en: "Reports differ", fr: "Rapports divergents" },
    reportsTitle: { en: "Reports", fr: "Rapports" },
    notesTitle: { en: "Notes about this place", fr: "Notes sur ce lieu" },
    viewSources: { en: "Where details come from", fr: "D’où viennent les détails" },
    viewSummary: { en: "What your notes say", fr: "Ce que disent vos notes" },
    viewSimilar: { en: "Possible matches", fr: "Lieux peut-être identiques" },
    viewReview: { en: "Details to ask about again", fr: "Détails à redemander" },
    viewHistory: { en: "Record history", fr: "Historique des données" },
    viewLatest: { en: "Latest records", fr: "Dernières données" },
    viewAges: { en: "How old the records are", fr: "Âge des données" },
    viewRepeats: { en: "Records saved more than once", fr: "Données enregistrées plusieurs fois" },
    viewGaps: { en: "Details with no record", fr: "Détails UNKNOWN (sans donnée)" },
    viewByDetail: { en: "One detail across places", fr: "Un détail dans tous les lieux" },
    viewRoundup: { en: "Shortlist round-up", fr: "Bilan de la liste courte" },
    viewMustHaves: { en: "My must-haves", fr: "Mes incontournables" },
  },
  sources: {
    title: { en: "Where details come from", fr: "D’où viennent les détails" },
    intro: {
      en: "Every Yes or No in your notes is saved with a source, an open licence and a date. This page adds them up.",
      fr: "Chaque Oui ou Non de vos notes est enregistré avec une source, une licence ouverte et une date. Cette page les additionne.",
    },
    notACheck: {
      en: "It shows where details were recorded from. It does not say that any source is right.",
      fr: "Elle montre d’où viennent les détails enregistrés. Elle ne dit pas qu’une source a raison.",
    },
    empty: {
      en: "No details are recorded yet. Details with no record stay Unknown and have no source.",
      fr: "Aucun détail n’est enregistré pour le moment. Les détails sans donnée restent UNKNOWN et n’ont pas de source.",
    },
    caption: {
      en: "One row for each source, with how many Yes and No details it recorded.",
      fr: "Une ligne par source, avec le nombre de détails Oui et Non qu’elle a enregistrés.",
    },
    source: { en: "Source", fr: "Source" },
    details: { en: "Details", fr: "Détails" },
    licences: { en: "Open licences", fr: "Licences ouvertes" },
    old: { en: "Over a year old", fr: "De plus d’un an" },
    range: { en: "Dates recorded", fr: "Dates de saisie" },
    recorded: { en: "Details with a record", fr: "Détails avec donnée" },
    unknown: { en: "Details with no record", fr: "Détails sans donnée" },
    placeTitle: { en: "Where this place’s details come from", fr: "D’où viennent les détails de ce lieu" },
    placeNone: { en: "No details are recorded for this place.", fr: "Aucun détail n’est enregistré pour ce lieu." },
  },
  summary: {
    title: { en: "What your notes say", fr: "Ce que disent vos notes" },
    intro: {
      en: "For each detail, how many places have a Yes, a No, reports that differ, or no record. Nothing is scored.",
      fr: "Pour chaque détail, le nombre de lieux avec un Oui, un Non, des rapports divergents ou aucune donnée. Rien n’est noté.",
    },
    empty: { en: "No places yet. Add a note to start.", fr: "Aucun lieu pour le moment. Ajoutez une note pour commencer." },
    caption: {
      en: "One row for each detail. Each row adds up to the number of places.",
      fr: "Une ligne par détail. Chaque ligne totalise le nombre de lieux.",
    },
    detail: { en: "Detail", fr: "Détail" },
    places: { en: "Places", fr: "Lieux" },
    oldTitle: { en: "Places with records over a year old", fr: "Lieux dont les données ont plus d’un an" },
    oldIntro: {
      en: "The newest record for these details is over a year old. They may be out of date.",
      fr: "La donnée la plus récente de ces détails a plus d’un an. Ils peuvent être périmés.",
    },
    differTitle: { en: "Places where reports differ", fr: "Lieux aux rapports divergents" },
    differIntro: {
      en: "The App shows every report for these places and does not pick one.",
      fr: "L’App montre tous les rapports de ces lieux et n’en choisit aucun.",
    },
    noneDiffer: { en: "No place has reports that differ.", fr: "Aucun lieu n’a de rapports divergents." },
    noneOld: { en: "No place has records over a year old.", fr: "Aucun lieu n’a de données de plus d’un an." },
    filterTitle: { en: "Count details from one source", fr: "Compter les détails d’une seule source" },
    all: { en: "All sources", fr: "Toutes les sources" },
    onlyNote: {
      en: "Counting only details from this source. Details from other sources count as Unknown here.",
      fr: "Seuls les détails de cette source sont comptés. Ceux des autres sources comptent comme UNKNOWN ici.",
    },
  },
  textExport: {
    download: { en: "Download as text", fr: "Télécharger en texte" },
    placeIntro: {
      en: "Details about this place, as recorded in your notes on this device. Details with no record stay Unknown.",
      fr: "Détails sur ce lieu, tels qu’enregistrés dans vos notes sur cet appareil. Les détails sans donnée restent UNKNOWN.",
    },
    compareIntro: {
      en: "What your notes say about these places. Details with no record stay Unknown. Nothing is scored or ranked.",
      fr: "Ce que disent vos notes sur ces lieux. Les détails sans donnée restent UNKNOWN. Rien n’est noté ni classé.",
    },
    madeOn: { en: "Made on", fr: "Créé le" },
    shortlistTitle: { en: "Shortlist", fr: "Liste courte" },
    downloadShortlist: { en: "Download shortlist as text", fr: "Télécharger la liste courte en texte" },
    keepNote: {
      en: "The file is made on this device. Nothing is sent anywhere.",
      fr: "Le fichier est créé sur cet appareil. Rien n’est envoyé ailleurs.",
    },
  },
  preview: {
    button: { en: "Preview first", fr: "Voir un aperçu d’abord" },
    title: { en: "Preview of the import", fr: "Aperçu de l’importation" },
    intro: {
      en: "Nothing has been added yet. Look at the numbers, then add the notes or cancel.",
      fr: "Rien n’a encore été ajouté. Regardez les chiffres, puis ajoutez les notes ou annulez.",
    },
    inText: { en: "Notes in the text", fr: "Notes dans le texte" },
    added: { en: "New notes", fr: "Nouvelles notes" },
    alreadyHere: { en: "Already on this device", fr: "Déjà sur cet appareil" },
    overLimit: { en: "Left out, no room", fr: "Laissées de côté, plus de place" },
    rejected: { en: "Not valid", fr: "Non valides" },
    newPlaces: { en: "New places", fr: "Nouveaux lieux" },
    morePlaces: { en: "Places that get more notes", fr: "Lieux qui reçoivent d’autres notes" },
    sources: { en: "Sources in the new notes", fr: "Sources des nouvelles notes" },
    nothing: { en: "There is nothing new to add.", fr: "Il n’y a rien de nouveau à ajouter." },
    cancel: { en: "Cancel", fr: "Annuler" },
    close: { en: "Close preview", fr: "Fermer l’aperçu" },
    closed: { en: "Preview closed. Nothing was added.", fr: "Aperçu fermé. Rien n’a été ajouté." },
    changed: { en: "The text changed. Look at the new preview before adding.", fr: "Le texte a changé. Regardez le nouvel aperçu avant d’ajouter." },
  },
  restorePreview: {
    button: { en: "Preview first", fr: "Voir un aperçu d’abord" },
    title: { en: "Preview of the restore", fr: "Aperçu de la restauration" },
    intro: {
      en: "Nothing has been restored yet. What is already on this device stays as it is.",
      fr: "Rien n’a encore été restauré. Ce qui est déjà sur cet appareil reste tel quel.",
    },
    needsInFile: { en: "Must-haves in the backup", fr: "Incontournables dans la sauvegarde" },
    needsTaken: { en: "Must-haves that would be added", fr: "Incontournables qui seraient ajoutés" },
    needsKept: { en: "This device already has must-haves, so they are kept as they are.", fr: "Cet appareil a déjà des incontournables, ils restent tels quels." },
    shortlistInFile: { en: "Shortlist places in the backup", fr: "Lieux de la liste courte dans la sauvegarde" },
    shortlistAdded: { en: "Shortlist places that would be added", fr: "Lieux de la liste courte qui seraient ajoutés" },
    shortlistNoPlace: { en: "Left out, the place is not on this device", fr: "Laissés de côté, le lieu n’est pas sur cet appareil" },
    notesInFile: { en: "Notes from “what I asked” in the backup", fr: "Notes de «\u202Fce que j’ai demandé\u202F» dans la sauvegarde" },
    notesAdded: { en: "Notes that would be added", fr: "Notes qui seraient ajoutées" },
    notesNoPlace: { en: "Left out, the place is not on this device", fr: "Laissées de côté, le lieu n’est pas sur cet appareil" },
    restore: { en: "Restore", fr: "Restaurer" },
    cancel: { en: "Cancel", fr: "Annuler" },
    close: { en: "Close preview", fr: "Fermer l’aperçu" },
    nothing: { en: "Restoring would not change anything.", fr: "La restauration ne changerait rien." },
    closed: { en: "Preview closed. Nothing was restored.", fr: "Aperçu fermé. Rien n’a été restauré." },
    changed: { en: "The text changed. Look at the new preview before restoring.", fr: "Le texte a changé. Regardez le nouvel aperçu avant de restaurer." },
  },
  similar: {
    title: { en: "Possible matches", fr: "Lieux peut-être identiques" },
    intro: {
      en: "Notes about one place are sometimes saved under two spellings, so it shows up twice. These pairs may be the same place. The App only suggests: it does not merge anything and does not change your notes.",
      fr: "Les notes sur un même lieu sont parfois enregistrées sous deux orthographes, et le lieu apparaît alors deux fois. Ces paires sont peut-être le même lieu. L’App ne fait que suggérer\u00A0: elle ne fusionne rien et ne modifie pas vos notes.",
    },
    none: { en: "No pairs to look at.", fr: "Aucune paire à examiner." },
    reasonAddress: { en: "Same address, different names.", fr: "Même adresse, noms différents." },
    reasonName: { en: "Same name, and at least one has no address.", fr: "Même nom, et au moins un lieu sans adresse." },
    reasonSimilar: { en: "Names that differ by a letter or two.", fr: "Noms qui diffèrent d’une lettre ou deux." },
    compare: { en: "Compare these two", fr: "Comparer ces deux lieux" },
    notSame: { en: "Not the same place", fr: "Ce ne sont pas les mêmes lieux" },
    marked: { en: "Marked as different places. The pair is hidden.", fr: "Marqués comme lieux différents. La paire est masquée." },
    full: { en: "Too many pairs are hidden. Show them again first.", fr: "Trop de paires sont masquées. Affichez-les d’abord de nouveau." },
    showAgain: { en: "Show them again", fr: "Les afficher de nouveau" },
    shownAgain: { en: "Hidden pairs are suggested again.", fr: "Les paires masquées sont de nouveau suggérées." },
    noAddress: { en: "No address", fr: "Aucune adresse" },
    noAddressTitle: { en: "Places with no address", fr: "Lieux sans adresse" },
    noAddressIntro: {
      en: "A place with no address cannot be told apart from another place with the same name. A note with an address helps.",
      fr: "Un lieu sans adresse ne se distingue pas d’un autre lieu du même nom. Une note avec adresse aide.",
    },
    pair: { en: "Pair", fr: "Paire" },
    saveFailed: { en: "That could not be saved on this device.", fr: "Impossible d’enregistrer cela sur cet appareil." },
  },
  tier: {
    label: { en: "Tier 0, not reviewed", fr: "Niveau 0, non examiné" },
    column: { en: "Tier", fr: "Niveau" },
    kind: { en: "Kind of record", fr: "Type de donnée" },
    person: { en: "Report by a person", fr: "Rapport d’une personne" },
    namedSource: { en: "Named source", fr: "Source nommée" },
    contributor: { en: "Contributor report", fr: "Rapport d’un contributeur" },
    explain: {
      en: "Tier 0 means nobody has reviewed the record. Every record kept on this device is tier 0.",
      fr: "Le niveau 0 signifie que personne n’a examiné la donnée. Toutes les données gardées sur cet appareil sont de niveau 0.",
    },
  },
  history: {
    title: { en: "Record history", fr: "Historique des données" },
    intro: {
      en: "Every Yes or No recorded for this place, newest first, with its source, licence, date and tier.",
      fr: "Chaque Oui ou Non enregistré pour ce lieu, du plus récent au plus ancien, avec sa source, sa licence, sa date et son niveau.",
    },
    noPick: {
      en: "The App does not pick an answer and does not say which record is right.",
      fr: "L’App ne choisit pas de réponse et ne dit pas quelle donnée a raison.",
    },
    none: { en: "Nothing has been recorded for this detail.", fr: "Rien n’a été enregistré pour ce détail." },
    noRecords: {
      en: "Nothing has been recorded for this place yet. Every detail stays Unknown.",
      fr: "Rien n’a encore été enregistré pour ce lieu. Chaque détail reste UNKNOWN.",
    },
    caption: { en: "Records for", fr: "Données pour" },
    answer: { en: "Answer", fr: "Réponse" },
    date: { en: "Date recorded", fr: "Date de saisie" },
    change: { en: "Compared with the record before", fr: "Par rapport à la donnée précédente" },
    first: { en: "First record", fr: "Première donnée" },
    same: { en: "Same answer", fr: "Même réponse" },
    different: { en: "Different answer", fr: "Réponse différente" },
    records: { en: "Records for this place", fr: "Données pour ce lieu" },
    distinct: { en: "Different records", fr: "Données différentes" },
    repeated: {
      en: "Some records here are saved more than once. Each one is still one record.",
      fr: "Certaines données sont enregistrées plusieurs fois ici. Chacune reste une seule donnée.",
    },
    backToPlace: { en: "Back to the place", fr: "Retour au lieu" },
    download: { en: "Download the history as text", fr: "Télécharger l’historique en texte" },
  },
  review: {
    title: { en: "Details to ask about again", fr: "Détails à redemander" },
    intro: {
      en: "Details where reports differ, where the newest record is a year old or more, or where nothing is recorded.",
      fr: "Les détails dont les rapports divergent, dont la donnée la plus récente a un an ou plus, ou pour lesquels rien n’est enregistré.",
    },
    notWrong: {
      en: "This is a list of questions to ask. It does not say that a record is wrong, and it changes nothing in your notes.",
      fr: "C’est une liste de questions à poser. Elle ne dit pas qu’une donnée est fausse et ne change rien à vos notes.",
    },
    none: { en: "Nothing to ask about.", fr: "Rien à redemander." },
    noPlaces: { en: "No places yet. Add a note to start.", fr: "Aucun lieu pour le moment. Ajoutez une note pour commencer." },
    filterLabel: { en: "Show", fr: "Afficher" },
    all: { en: "Everything", fr: "Tout" },
    differ: { en: "Reports differ", fr: "Rapports divergents" },
    old: { en: "Record a year old or more", fr: "Donnée d’un an ou plus" },
    unknown: { en: "No record", fr: "Aucune donnée" },
    whyUnknown: { en: "Nothing is recorded, so it stays Unknown.", fr: "Rien n’est enregistré, le détail reste donc UNKNOWN." },
    showing: { en: "Showing only", fr: "Affichage limité à" },
    ask: { en: "Ask", fr: "À demander" },
    more: { en: "Show more places", fr: "Afficher plus de lieux" },
    openPlan: { en: "Visit plan", fr: "Plan de visite" },
    openHistory: { en: "Record history", fr: "Historique des données" },
    download: { en: "Download this list as text", fr: "Télécharger cette liste en texte" },
  },
  latest: {
    title: { en: "Latest records", fr: "Dernières données" },
    intro: {
      en: "Every Yes or No recorded on this device, newest first, with its source, licence, date and tier.",
      fr: "Chaque Oui ou Non enregistré sur cet appareil, du plus récent au plus ancien, avec sa source, sa licence, sa date et son niveau.",
    },
    noRank: {
      en: "The list is in date order only. It does not rank places or sources.",
      fr: "La liste suit seulement l’ordre des dates. Elle ne classe ni les lieux ni les sources.",
    },
    none: { en: "No records to show.", fr: "Aucune donnée à afficher." },
    noPlaces: { en: "No places yet. Add a note to start.", fr: "Aucun lieu pour le moment. Ajoutez une note pour commencer." },
    filterLabel: { en: "Show records from", fr: "Afficher les données de" },
    all: { en: "Every kind", fr: "Tous les types" },
    showing: { en: "Showing only", fr: "Affichage limité à" },
    more: { en: "Show more records", fr: "Afficher plus de données" },
    download: { en: "Download these records as text", fr: "Télécharger ces données en texte" },
  },
  ages: {
    title: { en: "How old the records are", fr: "Âge des données" },
    intro: {
      en: "For each detail, how many records fall in each age band, counted from the day each was recorded.",
      fr: "Pour chaque détail, le nombre de données dans chaque tranche d’âge, à partir du jour de leur saisie.",
    },
    notWrong: {
      en: "An old record is not shown as wrong. It may be worth asking again.",
      fr: "Une donnée ancienne n’est pas présentée comme fausse. Il peut être utile de redemander.",
    },
    empty: { en: "No details are recorded yet.", fr: "Aucun détail n’est enregistré pour le moment." },
    caption: {
      en: "One row for each detail. The four age bands add up to the number of records.",
      fr: "Une ligne par détail. Les quatre tranches d’âge totalisent le nombre de données.",
    },
    detail: { en: "Detail", fr: "Détail" },
    under3: { en: "Under 3 months", fr: "Moins de 3 mois" },
    under12: { en: "3 to 11 months", fr: "De 3 à 11 mois" },
    under24: { en: "1 year to under 2", fr: "De 1 an à moins de 2" },
    over24: { en: "2 years or more", fr: "2 ans ou plus" },
    total: { en: "Records", fr: "Données" },
    noRecord: { en: "Places with no record", fr: "Lieux UNKNOWN (sans donnée)" },
    range: { en: "Dates recorded", fr: "Dates de saisie" },
    records: { en: "Records on this device", fr: "Données sur cet appareil" },
    oldRecords: { en: "Records a year old or more", fr: "Données d’un an ou plus" },
    download: { en: "Download these counts as text", fr: "Télécharger ces chiffres en texte" },
  },
  repeats: {
    title: { en: "Records saved more than once", fr: "Données enregistrées plusieurs fois" },
    intro: {
      en: "Two notes about one place sometimes hold exactly the same record: the same answer, source, licence and date.",
      fr: "Deux notes sur un même lieu contiennent parfois exactement la même donnée\u00A0: même réponse, même source, même licence et même date.",
    },
    oneRecord: {
      en: "It is still one record. Saving it twice does not make the answer more sure. The App removes nothing for you.",
      fr: "C’est toujours une seule donnée. L’enregistrer deux fois ne rend pas la réponse plus sûre. L’App ne supprime rien à votre place.",
    },
    none: { en: "No record is saved more than once.", fr: "Aucune donnée n’est enregistrée plusieurs fois." },
    noPlaces: { en: "No places yet. Add a note to start.", fr: "Aucun lieu pour le moment. Ajoutez une note pour commencer." },
    extra: { en: "Extra copies", fr: "Copies en trop" },
    groups: { en: "Records saved more than once", fr: "Données enregistrées plusieurs fois" },
    openPlace: { en: "Open the place", fr: "Ouvrir le lieu" },
    openHistory: { en: "Record history", fr: "Historique des données" },
    download: { en: "Download this list as text", fr: "Télécharger cette liste en texte" },
  },
  gaps: {
    title: { en: "Details with no record", fr: "Détails UNKNOWN (sans donnée)" },
    intro: {
      en: "For each detail, the places where no note gives a Yes or a No. The detail stays Unknown there.",
      fr: "Pour chaque détail, les lieux où aucune note ne donne Oui ou Non. Le détail y reste UNKNOWN.",
    },
    notNo: {
      en: "Unknown does not mean No. Ask the place before you go. The App does not guess the answer.",
      fr: "UNKNOWN ne veut pas dire Non. Renseignez-vous auprès du lieu avant de partir. L’App ne devine pas la réponse.",
    },
    noPlaces: { en: "No places yet. Add a note to start.", fr: "Aucun lieu pour le moment. Ajoutez une note pour commencer." },
    none: {
      en: "Every place has at least one record for every detail.",
      fr: "Chaque lieu a au moins une donnée pour chaque détail.",
    },
    allRecorded: {
      en: "Every place has at least one record for this detail.",
      fr: "Chaque lieu a au moins une donnée pour ce détail.",
    },
    placesMissing: { en: "Places with at least one detail Unknown", fr: "Lieux avec au moins un détail UNKNOWN" },
    filterLabel: { en: "Details to show", fr: "Détails à afficher" },
    all: { en: "Every detail", fr: "Tous les détails" },
    onlyNeeds: { en: "Only my must-haves", fr: "Seulement mes incontournables" },
    showingNeeds: { en: "Showing only the details in your must-haves.", fr: "Affichage limité aux détails de vos incontournables." },
    ask: { en: "Ask the place", fr: "Question à poser au lieu" },
    openPlace: { en: "Open the place", fr: "Ouvrir le lieu" },
    download: { en: "Download this list as text", fr: "Télécharger cette liste en texte" },
  },
  mustHaves: {
    title: { en: "My must-haves", fr: "Mes incontournables" },
    notPeople: {
      en: "Must-haves describe places, not you. The App does not ask about your health and gives no advice.",
      fr: "Les incontournables décrivent des lieux, pas vous. L’App ne pose aucune question sur votre santé et ne donne aucun conseil.",
    },
    chooseTitle: { en: "Choose for each detail", fr: "Choisissez pour chaque détail" },
    savedAtOnce: { en: "Each choice is saved on this device as soon as you make it.", fr: "Chaque choix est enregistré sur cet appareil dès que vous le faites." },
    choices: {
      yes: { en: "Must be Yes", fr: "Doit être Oui" },
      no: { en: "Must be No", fr: "Doit être Non" },
      none: { en: "Not a must-have", fr: "Pas un incontournable" },
    },
    savedOne: { en: "Saved", fr: "Enregistré" },
    yours: { en: "Your must-haves", fr: "Vos incontournables" },
    none: { en: "No must-have is saved yet.", fr: "Aucun incontournable n’est encore enregistré." },
    noPlaces: { en: "No places yet. Add a note to start.", fr: "Aucun lieu pour le moment. Ajoutez une note pour commencer." },
    standingTitle: { en: "Where your places stand", fr: "Où en sont vos lieux" },
    standingIntro: {
      en: "From your notes on this device. Each place is counted once. Nothing is ranked, and a match does not mean a place suits you.",
      fr: "D’après vos notes sur cet appareil. Chaque lieu est compté une fois. Rien n’est classé, et une correspondance ne veut pas dire qu’un lieu vous convient.",
    },
    groups: {
      allMatch: { en: "Every must-have matches", fr: "Tous les incontournables correspondent" },
      open: { en: "Some must-haves to ask about", fr: "Des incontournables à demander" },
      notMet: { en: "A must-have does not match", fr: "Un incontournable ne correspond pas" },
    },
    emptyGroup: { en: "No place in this group.", fr: "Aucun lieu dans ce groupe." },
    download: { en: "Download my must-haves as text", fr: "Télécharger mes incontournables en texte" },
  },
  roundup: {
    title: { en: "Shortlist round-up", fr: "Bilan de la liste courte" },
    intro: {
      en: "Each place on your shortlist, in the order you added it, checked against your saved must-haves, with the questions still to ask.",
      fr: "Chaque lieu de votre liste courte, dans l’ordre d’ajout, comparé à vos incontournables enregistrés, avec les questions qui restent à poser.",
    },
    empty: { en: "Your shortlist is empty. Add places from the places screen.", fr: "Votre liste courte est vide. Ajoutez des lieux depuis l’écran des lieux." },
    noNeeds: {
      en: "No must-haves are saved yet. Choose them on the My must-haves page.",
      fr: "Aucun incontournable n’est encore enregistré. Choisissez-les sur la page Mes incontournables.",
    },
    missing: {
      en: "Some shortlisted places are no longer in your notes, so they are left out.",
      fr: "Certains lieux de la liste courte ne sont plus dans vos notes, ils sont donc laissés de côté.",
    },
    placesLabel: { en: "Places on the shortlist", fr: "Lieux de la liste courte" },
    questionsLabel: { en: "Questions", fr: "Questions à poser" },
    allAskedLabel: { en: "Places with every question asked", fr: "Lieux dont toutes les questions sont posées" },
    noQuestions: { en: "No question to ask about your must-haves here.", fr: "Aucune question à poser ici sur vos incontournables." },
    progressFor: { en: "Questions for this place", fr: "Questions pour ce lieu" },
    filterLabel: { en: "Places to show", fr: "Lieux à afficher" },
    allPlaces: { en: "Every shortlisted place", fr: "Tous les lieux de la liste courte" },
    onlyLeft: { en: "Only places with questions left", fr: "Seulement les lieux avec des questions à poser" },
    showingLeft: {
      en: "Showing only places with a question not yet ticked as asked.",
      fr: "Affichage limité aux lieux avec une question pas encore cochée comme posée.",
    },
    noneLeft: { en: "Every question on your shortlist is ticked as asked.", fr: "Toutes les questions de votre liste courte sont cochées comme posées." },
    openPlan: { en: "Open the visit plan", fr: "Ouvrir le plan de visite" },
    download: { en: "Download the round-up as text", fr: "Télécharger le bilan en texte" },
  },
  byDetail: {
    title: { en: "One detail across places", fr: "Un détail dans tous les lieux" },
    intro: {
      en: "For one detail, what your notes say at each place: Yes, No, reports that differ, or no record.",
      fr: "Pour un détail, ce que disent vos notes pour chaque lieu\u00A0: Oui, Non, rapports divergents ou aucune donnée.",
    },
    noRank: {
      en: "Places are grouped by what the notes say, then listed by name. Nothing is ranked, and a Yes does not mean a place suits you.",
      fr: "Les lieux sont regroupés selon ce que disent les notes, puis listés par nom. Rien n’est classé, et un Oui ne veut pas dire qu’un lieu vous convient.",
    },
    choose: { en: "Choose a detail", fr: "Choisissez un détail" },
    another: { en: "Choose another detail", fr: "Choisir un autre détail" },
    noPlaces: { en: "No places yet. Add a note to start.", fr: "Aucun lieu pour le moment. Ajoutez une note pour commencer." },
    emptyGroup: { en: "No place in this group.", fr: "Aucun lieu dans ce groupe." },
    newest: { en: "Newest record", fr: "Donnée la plus récente" },
    differNote: {
      en: "The reports for these places do not agree. The App does not pick one. Open the record history to see each report.",
      fr: "Les rapports sur ces lieux ne concordent pas. L’App n’en choisit aucun. Ouvrez l’historique des données pour voir chaque rapport.",
    },
    openPlace: { en: "Open the place", fr: "Ouvrir le lieu" },
    openHistory: { en: "See each report", fr: "Voir chaque rapport" },
    download: { en: "Download this detail as text", fr: "Télécharger ce détail en texte" },
  },
  plan: {
    title: { en: "Visit plan", fr: "Plan de visite" },
    whatMatters: { en: "What matters to you", fr: "Ce qui compte pour vous" },
    usingNeeds: { en: "Using your saved must-haves.", fr: "Selon vos incontournables enregistrés." },
    usingFilter: { en: "Using the current filter.", fr: "Selon le filtre actuel." },
    none: {
      en: "Choose the details that matter to you in the filter first, then come back.",
      fr: "Choisissez d’abord dans le filtre les détails qui comptent pour vous, puis revenez.",
    },
    goFilter: { en: "Go to the filter", fr: "Aller au filtre" },
    matches: { en: "Matches", fr: "Correspond" },
    notMet: { en: "Does not match", fr: "Ne correspond pas" },
    unknown: { en: "Unknown", fr: "UNKNOWN" },
    questionsTitle: { en: "Questions to ask the place", fr: "Questions à poser au lieu" },
    noQuestions: {
      en: "Everything you asked about has a recorded answer.",
      fr: "Tout ce que vous avez demandé a une réponse enregistrée.",
    },
    shareTitle: { en: "Text to copy", fr: "Texte à copier" },
    select: { en: "Select text", fr: "Sélectionner le texte" },
    footer: {
      en: "This plan only shows what is recorded in notes on this device. Unknown means there is no record. Check with the place before you go.",
      fr: "Ce plan montre seulement ce qui est consigné dans les notes de cet appareil. UNKNOWN veut dire qu’il n’y a aucune donnée. Renseignez-vous auprès du lieu avant de partir.",
    },
  },
  needs: {
    save: { en: "Save as my must-haves", fr: "Enregistrer comme incontournables" },
    use: { en: "Use my must-haves", fr: "Utiliser mes incontournables" },
    clear: { en: "Clear my must-haves", fr: "Effacer mes incontournables" },
    saved: { en: "Must-haves saved on this device.", fr: "Incontournables enregistrés sur cet appareil." },
    cleared: { en: "Must-haves cleared.", fr: "Incontournables effacés." },
    applied: { en: "Your must-haves are now the filter.", fr: "Vos incontournables servent maintenant de filtre." },
    intro: {
      en: "Must-haves are details a place needs to have. They are kept on this device only.",
      fr: "Les incontournables sont des détails qu’un lieu doit avoir. Ils restent sur cet appareil seulement.",
    },
  },
  shortlist: {
    add: { en: "Add to shortlist", fr: "Ajouter à la liste courte" },
    remove: { en: "Remove from shortlist", fr: "Retirer de la liste courte" },
    only: { en: "Show shortlist only", fr: "Afficher la liste courte seulement" },
    added: { en: "Added to your shortlist.", fr: "Ajouté à votre liste courte." },
    removed: { en: "Removed from your shortlist.", fr: "Retiré de votre liste courte." },
    full: { en: "Your shortlist is full. Remove a place first.", fr: "Votre liste courte est pleine. Retirez d’abord un lieu." },
    empty: { en: "Your shortlist is empty.", fr: "Votre liste courte est vide." },
    intro: {
      en: "A shortlist only keeps places handy on this device. It does not rank them.",
      fr: "La liste courte garde seulement des lieux à portée de main sur cet appareil. Elle ne les classe pas.",
    },
  },
  sort: {
    label: { en: "Order places by", fr: "Ordre des lieux" },
    name: { en: "Name", fr: "Nom" },
    newest: { en: "Newest note", fr: "Note la plus récente" },
    reports: { en: "Most reports", fr: "Plus de rapports" },
    hint: {
      en: "This is only an order. It does not say which place is more accessible.",
      fr: "C’est seulement un ordre. Il n’indique pas quel lieu est le plus accessible.",
    },
  },
  compare: {
    title: { en: "Compare places", fr: "Comparer des lieux" },
    add: { en: "Compare", fr: "Comparer" },
    remove: { en: "Stop comparing", fr: "Ne plus comparer" },
    open: { en: "Compare selected", fr: "Comparer la sélection" },
    clear: { en: "Clear selection", fr: "Effacer la sélection" },
    choose: { en: "Choose two or three places to compare.", fr: "Choisissez deux ou trois lieux à comparer." },
    full: { en: "You can compare up to three places.", fr: "Vous pouvez comparer jusqu’à trois lieux." },
    selected: { en: "Selected for comparison", fr: "Sélectionnés pour la comparaison" },
    caption: {
      en: "Each cell shows what the notes say. Nothing is scored or ranked.",
      fr: "Chaque cellule montre ce que disent les notes. Rien n’est noté ni classé.",
    },
    detail: { en: "Detail", fr: "Détail" },
    missing: {
      en: "One of these places is no longer on this device.",
      fr: "L’un de ces lieux n’est plus sur cet appareil.",
    },
    wanted: { en: "You asked for", fr: "Vous avez demandé" },
  },
  checklist: {
    asked: { en: "I asked this", fr: "J’ai posé cette question" },
    said: { en: "What the place said", fr: "Ce que le lieu a répondu" },
    saidLabel: { en: "What the place said", fr: "Ce que le lieu a répondu" },
    saved: { en: "Your note was saved on this device.", fr: "Votre note est enregistrée sur cet appareil." },
    notReports: {
      en: "These are your own notes. A detail stays Unknown until a report is added.",
      fr: "Ce sont vos propres notes. Un détail reste UNKNOWN tant qu’un rapport n’est pas ajouté.",
    },
    addReport: { en: "Add a report for this place", fr: "Ajouter un rapport pour ce lieu" },
    clear: { en: "Clear my notes for this place", fr: "Effacer mes notes pour ce lieu" },
    confirmClear: { en: "Clear them", fr: "Les effacer" },
    cancelClear: { en: "Keep them", fr: "Les garder" },
    cleared: { en: "Your notes for this place were cleared.", fr: "Vos notes pour ce lieu ont été effacées." },
    confirmText: {
      en: "Clear the notes you wrote for this place? This cannot be undone.",
      fr: "Effacer les notes que vous avez écrites pour ce lieu\u202F? Cette action est irréversible.",
    },
    reasonOld: { en: "Recorded answer is a year old or more", fr: "La réponse enregistrée date d’un an ou plus" },
    reasonUnknown: { en: "No recorded answer", fr: "Aucune réponse enregistrée" },
    reasonDiffer: { en: "Reports differ", fr: "Rapports divergents" },
    error: {
      "too-long": { en: "Keep it to 300 characters or fewer.", fr: "Utilisez 300 caractères ou moins." },
      "control-chars": { en: "Remove the special characters.", fr: "Retirez les caractères spéciaux." },
      "personal-email": {
        en: "Leave out email addresses. Notes here should not hold personal contact details.",
        fr: "Retirez les adresses courriel. Ces notes ne doivent pas contenir de coordonnées personnelles.",
      },
      "personal-phone": {
        en: "Leave out phone numbers. Notes here should not hold personal contact details.",
        fr: "Retirez les numéros de téléphone. Ces notes ne doivent pas contenir de coordonnées personnelles.",
      },
    },
  },
  copy: {
    button: { en: "Copy plan", fr: "Copier le plan" },
    done: { en: "Plan copied.", fr: "Plan copié." },
    failed: {
      en: "Could not copy. The text is selected, so you can copy it yourself.",
      fr: "Copie impossible. Le texte est sélectionné, vous pouvez le copier vous-même.",
    },
  },
  lists: {
    title: { en: "My lists", fr: "Mes listes" },
    intro: {
      en: "Back up your must-haves, shortlist and notes as text, or restore them from text. Nothing leaves this device unless you copy it.",
      fr: "Sauvegardez vos incontournables, votre liste courte et vos notes sous forme de texte, ou restaurez-les à partir d’un texte. Rien ne quitte cet appareil sans que vous le copiiez.",
    },
    export: { en: "Show backup text", fr: "Afficher le texte de sauvegarde" },
    exportLabel: { en: "Backup text", fr: "Texte de sauvegarde" },
    importLabel: { en: "Paste backup text to restore", fr: "Collez le texte de sauvegarde à restaurer" },
    restore: { en: "Restore from text", fr: "Restaurer à partir du texte" },
    hide: { en: "Hide backup text", fr: "Masquer le texte de sauvegarde" },
    keepNote: {
      en: "Restoring keeps what is already on this device and only adds what is missing.",
      fr: "La restauration conserve ce qui est déjà sur cet appareil et n’ajoute que ce qui manque.",
    },
    errors: {
      empty: { en: "Paste the backup text first.", fr: "Collez d’abord le texte de sauvegarde." },
      tooLarge: { en: "That text is too long to be a backup.", fr: "Ce texte est trop long pour être une sauvegarde." },
      notJson: { en: "That text is not a backup. It could not be read.", fr: "Ce texte n’est pas une sauvegarde. Il n’a pas pu être lu." },
      wrongFormat: { en: "That is not a backup of lists.", fr: "Ce n’est pas une sauvegarde de listes." },
      wrongVersion: { en: "That backup is from a version this page cannot read.", fr: "Cette sauvegarde provient d’une version que cette page ne peut pas lire." },
    },
  },
  save: {
    saved: {
      en: "Your choices are saved on this device only.",
      fr: "Vos choix sont enregistrés sur cet appareil seulement.",
    },
    unavailable: {
      en: "Your choices could not be saved. They will be lost when you close this page.",
      fr: "Vos choix n’ont pas pu être enregistrés. Ils seront perdus à la fermeture de cette page.",
    },
  },
} as const;

export function t(p: Pair, locale: Locale): string {
  return p[locale];
}

export function stepOf(n: number, total: number, locale: Locale): string {
  return locale === "fr" ? `Étape ${n} sur ${total}` : `Step ${n} of ${total}`;
}

/** Walks COPY and returns every EN/FR pair with its path, for tests and tooling. */
export function allPairs(): Array<[string, Pair]> {
  const out: Array<[string, Pair]> = [];
  const walk = (path: string, v: unknown): void => {
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o["en"] === "string" && typeof o["fr"] === "string") {
      out.push([path, { en: o["en"], fr: o["fr"] }]);
      return;
    }
    for (const [k, c] of Object.entries(o)) walk(`${path}.${k}`, c);
  };
  walk("COPY", COPY);
  return out;
}

export function groupHeading(label: string, n: number): string {
  return `${label} (${n})`;
}

export function importDone(added: number, skipped: number, rejected: number, locale: Locale): string {
  if (locale === "fr") {
    return `${added} note(s) importée(s), ${skipped} déjà présente(s) ou en trop, ${rejected} non valide(s).`;
  }
  return `${added} note(s) imported, ${skipped} already present or over the limit, ${rejected} not valid.`;
}

export function restoreDone(added: { needs: number; shortlist: number; notes: number }, locale: Locale): string {
  if (locale === "fr") {
    return `Restauré${NB}: ${added.needs} incontournable(s), ${added.shortlist} lieu(x) ajouté(s) à la liste courte, ${added.notes} note(s).`;
  }
  return `Restored: ${added.needs} must-have(s), ${added.shortlist} place(s) added to the shortlist, ${added.notes} note(s).`;
}

export function resultsCount(n: number, locale: Locale): string {
  if (locale === "fr") return n === 1 ? "1 résultat" : `${n} résultats`;
  return n === 1 ? "1 result" : `${n} results`;
}

/** "Question 2" — where the person is in the find-help questions. */
export function questionNumber(n: number, locale: Locale): string {
  void locale;
  return `Question ${n}`;
}

/** "Section 2 of 4". */
export function sectionOf(n: number, total: number, locale: Locale): string {
  return locale === "fr" ? `Section ${n} sur ${total}` : `Section ${n} of ${total}`;
}
