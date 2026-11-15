export type Role = "noun" | "verb" | "adjective" | "label" | "status";
export interface Term {
  id: string;
  en: string;
  fr: string;
  note: string;
  role: Role;
}

// IDs are stable catalog references. Notes are editorial guidance, not service claims.
export const TERMS: readonly Term[] = [
  { id: "app", en: "the App", fr: "l'application", role: "noun", note: "Unbranded product name; no sponsor implied." },
  { id: "unknown", en: "Unknown", fr: "Inconnu", role: "status", note: "Keep missing evidence unknown; never infer a feature." },
  { id: "source", en: "Source", fr: "Source", role: "label", note: "Show provenance for a factual record." },
  { id: "licence", en: "Licence", fr: "Licence", role: "label", note: "Show the dataset licence." },
  { id: "date", en: "Date", fr: "Date", role: "label", note: "Show the date of the recorded information." },
  { id: "verification-tier", en: "Verification tier", fr: "Niveau de vérification", role: "label", note: "A label, not a guarantee of accessibility." },
  { id: "step-free", en: "Step-free", fr: "Sans marches", role: "adjective", note: "Only use when supported by a sourced record." },
  { id: "van-accessible", en: "Van-accessible", fr: "Accessible aux véhicules adaptés", role: "adjective", note: "Do not assume dimensions or suitability." },
  { id: "washroom", en: "Washroom", fr: "Toilettes", role: "noun", note: "Do not assume accessibility from presence alone." },
  { id: "adult-change-table", en: "Adult change table", fr: "Table à langer pour adultes", role: "noun", note: "Presence is unknown without evidence." },
  { id: "door-to-door", en: "Door-to-door", fr: "Porte à porte", role: "adjective", note: "Describe the service model, not eligibility." },
  { id: "live-status", en: "Live status", fr: "État en direct", role: "noun", note: "Do not use for cached or demonstration records." },
  { id: "demonstration-data", en: "Demonstration data", fr: "Données de démonstration", role: "noun", note: "Explicitly mark synthetic example records." },
  { id: "as-of", en: "As of", fr: "En date du", role: "label", note: "Show the point in time to which the record applies." },
  { id: "tier-0", en: "Tier 0", fr: "Niveau 0", role: "status", note: "Canonical tier identifier; evidence may be absent." },
  { id: "tier-1", en: "Tier 1", fr: "Niveau 1", role: "status", note: "Canonical tier identifier; do not imply validation." },
  { id: "tier-2", en: "Tier 2", fr: "Niveau 2", role: "status", note: "Canonical tier identifier; evidence requirements apply." },
  { id: "tier-3", en: "Tier 3", fr: "Niveau 3", role: "status", note: "Requires a supporting evidence block; not emitted by this prototype." },
  { id: "tier-4", en: "Tier 4", fr: "Niveau 4", role: "status", note: "Canonical tier identifier; never claim without evidence." },
  { id: "tier-e", en: "Tier E", fr: "Niveau E", role: "status", note: "Canonical exceptional tier identifier." },
  { id: "prototype-unverified", en: "PROTOTYPE-UNVERIFIED", fr: "PROTOTYPE-UNVERIFIED", role: "status", note: "Allowed prototype label; not verified." },
  { id: "seeded-open-data", en: "SEEDED-OPEN-DATA", fr: "SEEDED-OPEN-DATA", role: "status", note: "Allowed prototype label; provenance is still required." },
  { id: "search", en: "Search", fr: "Rechercher", role: "verb", note: "Action label for searching content." },
  { id: "results", en: "Results", fr: "Résultats", role: "noun", note: "Count actual matches only." },
  { id: "filter", en: "Filter", fr: "Filtrer", role: "verb", note: "Refines the results; does not validate records." },
  { id: "clear", en: "Clear", fr: "Effacer", role: "verb", note: "Resets current input." },
  { id: "language", en: "Language", fr: "Langue", role: "noun", note: "Always name the active language." },
  { id: "english", en: "English", fr: "Anglais", role: "noun", note: "Language option." },
  { id: "french", en: "French", fr: "Français", role: "noun", note: "Language option." },
  { id: "offline", en: "Offline", fr: "Hors ligne", role: "status", note: "Avoid claiming data is current while offline." },
  { id: "saved", en: "Saved", fr: "Enregistré", role: "status", note: "Use only when persistence succeeds." },
  { id: "back", en: "Back", fr: "Retour", role: "label", note: "Navigation, not a destructive action." },
  { id: "next", en: "Next", fr: "Suivant", role: "label", note: "Navigation within a sequence." },
  { id: "help", en: "Help", fr: "Aide", role: "noun", note: "General information, not medical advice." },
  { id: "community", en: "Community", fr: "Communauté", role: "noun", note: "Do not imply a live peer service in a prototype." },
  { id: "events", en: "Events", fr: "Événements", role: "noun", note: "Do not invent event details." },
  { id: "safety", en: "Safety", fr: "Sécurité", role: "noun", note: "Never imply an emergency or triage service." },
  { id: "about", en: "About", fr: "À propos", role: "label", note: "Descriptive information about the App." },
  { id: "route", en: "Route", fr: "Itinéraire", role: "noun", note: "Route facts require source and date." },
  { id: "entrance", en: "Entrance", fr: "Entrée", role: "noun", note: "Distinguish each entrance; unknown until checked." },
  { id: "elevator", en: "Elevator", fr: "Ascenseur", role: "noun", note: "Availability may change." },
  { id: "ramp", en: "Ramp", fr: "Rampe", role: "noun", note: "Do not infer grade or dimensions." },
  { id: "parking", en: "Parking", fr: "Stationnement", role: "noun", note: "Distinguish presence from accessible spaces." },
  { id: "accessible-parking", en: "Accessible parking", fr: "Stationnement accessible", role: "noun", note: "Source the designation and date." },
  { id: "service", en: "Service", fr: "Service", role: "noun", note: "A directory entry is not a recommendation." },
  { id: "directory", en: "Directory", fr: "Répertoire", role: "noun", note: "Links only; does not assess eligibility." },
  { id: "contact", en: "Contact", fr: "Coordonnées", role: "noun", note: "Only display publicly provided contacts." },
  { id: "last-checked", en: "Last checked", fr: "Dernière vérification", role: "label", note: "Include the actual check date." },
  { id: "not-available", en: "Unavailable", fr: "Indisponible", role: "status", note: "Different from Unknown; requires observed evidence." },
  { id: "details", en: "Details", fr: "Détails", role: "noun", note: "Open the selected record's additional information." },
  { id: "accessibility", en: "Accessibility", fr: "Accessibilité", role: "noun", note: "Avoid unsupported compliance claims." },
] as const;

export const TERM_BY_ID: ReadonlyMap<string, Term> = new Map(TERMS.map((term) => [term.id, term]));
