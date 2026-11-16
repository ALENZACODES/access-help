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
  },
  card: {
    title: { en: "Reading a place card", fr: "Lire une fiche de lieu" },
    summary: {
      en: "See how sources and unknown details are shown.",
      fr: "Voyez comment les sources et les détails inconnus sont présentés.",
    },
    notice: {
      en: "Example only. This is not a real place.",
      fr: "Exemple seulement. Ce n’est pas un lieu réel.",
    },
    explain: {
      en: "Each detail shows its source, licence and date. A detail with no record says “Unknown”, and unknown does not mean no.",
      fr: `Chaque détail indique sa source, sa licence et sa date. Un détail sans enregistrement indique «${NN}inconnu${NN}», et inconnu ne veut pas dire non.`,
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
    unknown: { en: "Unknown", fr: "Inconnu" },
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
    unknown: { en: "Unknown for this filter", fr: "Inconnu pour ce filtre" },
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
      fr: "Dites ce que vous avez vu dans un lieu. Laissez un détail à Inconnu si vous ne l’avez pas vu.",
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
    viewSimilar: { en: "Possible matches", fr: "Lieux peut-être identiques" },
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
    unknown: { en: "Unknown", fr: "Inconnu" },
    questionsTitle: { en: "Questions to ask the place", fr: "Questions à poser au lieu" },
    noQuestions: {
      en: "Everything you asked about has a recorded answer.",
      fr: "Tout ce que vous avez demandé a une réponse enregistrée.",
    },
    shareTitle: { en: "Text to copy", fr: "Texte à copier" },
    select: { en: "Select text", fr: "Sélectionner le texte" },
    footer: {
      en: "This plan only shows what is recorded in notes on this device. Unknown means there is no record. Check with the place before you go.",
      fr: "Ce plan montre seulement ce qui est consigné dans les notes de cet appareil. Inconnu veut dire qu’il n’y a aucune donnée. Renseignez-vous auprès du lieu avant de partir.",
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
      fr: "Ce sont vos propres notes. Un détail reste Inconnu tant qu’un rapport n’est pas ajouté.",
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
