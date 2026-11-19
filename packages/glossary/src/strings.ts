export const UI = {
  en: {
    skip: "Skip to main content", heading: "Glossary", lead: "Explore preferred words used by the App.",
    searchLabel: "Search terms", searchHint: "Search English, French, or notes.",
    language: "Language", english: "English", french: "French", results: "Results",
    roles: { noun: "Noun", verb: "Verb", adjective: "Adjective", label: "Label", status: "Status" },
    noResults: "No matching terms.", englishHeading: "English", frenchHeading: "French",
    role: "Role", note: "Usage note", clear: "Clear search",
    viewsLabel: "Sections", views: { terms: "Terms", places: "Places" },
    placesHeading: "Places", placesLead: "Load a table of records to see what sources report. Everything stays on this device.",
  },
  fr: {
    skip: "Aller au contenu principal", heading: "Glossaire", lead: "Consultez les termes privilégiés dans l'application.",
    searchLabel: "Rechercher des termes", searchHint: "Rechercher en anglais, en français ou dans les notes.",
    language: "Langue", english: "Anglais", french: "Français", results: "Résultats",
    roles: { noun: "Nom", verb: "Verbe", adjective: "Adjectif", label: "Libellé", status: "État" },
    noResults: "Aucun terme correspondant.", englishHeading: "Anglais", frenchHeading: "Français",
    role: "Rôle", note: "Note d'utilisation", clear: "Effacer la recherche",
    viewsLabel: "Sections du site", views: { terms: "Termes", places: "Lieux" },
    placesHeading: "Lieux", placesLead: "Chargez un tableau de fiches pour voir ce que les sources signalent. Tout reste sur cet appareil.",
  },
} as const;
export type Language = keyof typeof UI;
