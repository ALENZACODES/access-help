export type Role = "noun" | "verb" | "adjective" | "label" | "status";
export interface Term {
  id: string;
  en: string;
  fr: string;
  note: string;
  noteFr: string;
  role: Role;
}

// IDs are stable catalog references. Notes are editorial guidance, not service claims.
export const TERMS: readonly Term[] = [
  { id: "app", en: "the App", fr: "l'application", role: "noun", note: "Unbranded product name; no sponsor implied.", noteFr: "Nom de produit sans marque ; aucun commanditaire n’est sous-entendu." },
  { id: "unknown", en: "Unknown", fr: "Inconnu", role: "status", note: "Keep missing evidence unknown; never infer a feature.", noteFr: "Laissez les preuves manquantes à l’état inconnu ; n’inférez jamais une caractéristique." },
  { id: "source", en: "Source", fr: "Source", role: "label", note: "Show provenance for a factual record.", noteFr: "Affichez la provenance d’un enregistrement factuel." },
  { id: "licence", en: "Licence", fr: "Licence", role: "label", note: "Show the dataset licence.", noteFr: "Affichez la licence du jeu de données." },
  { id: "date", en: "Date", fr: "Date", role: "label", note: "Show the date of the recorded information.", noteFr: "Affichez la date de l’information consignée." },
  { id: "verification-tier", en: "Verification tier", fr: "Niveau de vérification", role: "label", note: "A label, not a guarantee of accessibility.", noteFr: "Une étiquette, et non une garantie d’accessibilité." },
  { id: "step-free", en: "Step-free", fr: "Sans marches", role: "adjective", note: "Only use when supported by a sourced record.", noteFr: "À utiliser seulement lorsqu’un enregistrement sourcé le confirme." },
  { id: "van-accessible", en: "Van-accessible", fr: "Accessible aux véhicules adaptés", role: "adjective", note: "Do not assume dimensions or suitability.", noteFr: "Ne présumez ni les dimensions ni la convenance." },
  { id: "washroom", en: "Washroom", fr: "Toilettes", role: "noun", note: "Do not assume accessibility from presence alone.", noteFr: "Ne présumez pas l’accessibilité à partir de la seule présence." },
  { id: "adult-change-table", en: "Adult change table", fr: "Table à langer pour adultes", role: "noun", note: "Presence is unknown without evidence.", noteFr: "La présence est inconnue en l’absence de preuve." },
  { id: "door-to-door", en: "Door-to-door", fr: "Porte à porte", role: "adjective", note: "Describe the service model, not eligibility.", noteFr: "Décrivez le modèle de service, et non l’admissibilité." },
  { id: "live-status", en: "Live status", fr: "État en direct", role: "noun", note: "Do not use for cached or demonstration records.", noteFr: "Ne l’utilisez pas pour les enregistrements en cache ou de démonstration." },
  { id: "demonstration-data", en: "Demonstration data", fr: "Données de démonstration", role: "noun", note: "Explicitly mark synthetic example records.", noteFr: "Marquez explicitement les enregistrements d’exemple synthétiques." },
  { id: "as-of", en: "As of", fr: "En date du", role: "label", note: "Show the point in time to which the record applies.", noteFr: "Indiquez le moment auquel l’enregistrement s’applique." },
  { id: "tier-0", en: "Tier 0", fr: "Niveau 0", role: "status", note: "Canonical tier identifier; evidence may be absent.", noteFr: "Identifiant de niveau canonique ; les preuves peuvent être absentes." },
  { id: "tier-1", en: "Tier 1", fr: "Niveau 1", role: "status", note: "Canonical tier identifier; do not imply validation.", noteFr: "Identifiant de niveau canonique ; n’impliquez aucune validation." },
  { id: "tier-2", en: "Tier 2", fr: "Niveau 2", role: "status", note: "Canonical tier identifier; evidence requirements apply.", noteFr: "Identifiant de niveau canonique ; des exigences de preuve s’appliquent." },
  { id: "tier-3", en: "Tier 3", fr: "Niveau 3", role: "status", note: "Requires a supporting evidence block; not emitted by this prototype.", noteFr: "Exige un bloc de preuves à l’appui ; ce prototype n’en produit pas." },
  { id: "tier-4", en: "Tier 4", fr: "Niveau 4", role: "status", note: "Canonical tier identifier; never claim without evidence.", noteFr: "Identifiant de niveau canonique ; ne l’affirmez jamais sans preuve." },
  { id: "tier-e", en: "Tier E", fr: "Niveau E", role: "status", note: "Canonical exceptional tier identifier.", noteFr: "Identifiant de niveau exceptionnel canonique." },
  { id: "prototype-unverified", en: "PROTOTYPE-UNVERIFIED", fr: "PROTOTYPE-UNVERIFIED", role: "status", note: "Allowed prototype label; not verified.", noteFr: "Étiquette de prototype autorisée ; non vérifiée." },
  { id: "seeded-open-data", en: "SEEDED-OPEN-DATA", fr: "SEEDED-OPEN-DATA", role: "status", note: "Allowed prototype label; provenance is still required.", noteFr: "Étiquette de prototype autorisée ; la provenance demeure obligatoire." },
  { id: "search", en: "Search", fr: "Rechercher", role: "verb", note: "Action label for searching content.", noteFr: "Libellé d’action pour la recherche de contenu." },
  { id: "results", en: "Results", fr: "Résultats", role: "noun", note: "Count actual matches only.", noteFr: "Comptez uniquement les correspondances réelles." },
  { id: "filter", en: "Filter", fr: "Filtrer", role: "verb", note: "Refines the results; does not validate records.", noteFr: "Affine les résultats ; ne valide pas les enregistrements." },
  { id: "clear", en: "Clear", fr: "Effacer", role: "verb", note: "Resets current input.", noteFr: "Réinitialise la saisie en cours." },
  { id: "language", en: "Language", fr: "Langue", role: "noun", note: "Always name the active language.", noteFr: "Nommez toujours la langue active." },
  { id: "english", en: "English", fr: "Anglais", role: "noun", note: "Language option.", noteFr: "Option de langue." },
  { id: "french", en: "French", fr: "Français", role: "noun", note: "Language option.", noteFr: "Option de langue." },
  { id: "offline", en: "Offline", fr: "Hors ligne", role: "status", note: "Avoid claiming data is current while offline.", noteFr: "Évitez d’affirmer que les données sont à jour hors ligne." },
  { id: "saved", en: "Saved", fr: "Enregistré", role: "status", note: "Use only when persistence succeeds.", noteFr: "À utiliser seulement lorsque l’enregistrement réussit." },
  { id: "back", en: "Back", fr: "Retour", role: "label", note: "Navigation, not a destructive action.", noteFr: "Navigation, et non une action destructive." },
  { id: "next", en: "Next", fr: "Suivant", role: "label", note: "Navigation within a sequence.", noteFr: "Navigation dans une séquence." },
  { id: "help", en: "Help", fr: "Aide", role: "noun", note: "General information, not medical advice.", noteFr: "Renseignements généraux, et non un avis médical." },
  { id: "community", en: "Community", fr: "Communauté", role: "noun", note: "Do not imply a live peer service in a prototype.", noteFr: "N’impliquez pas un service de pair à pair en direct dans un prototype." },
  { id: "events", en: "Events", fr: "Événements", role: "noun", note: "Do not invent event details.", noteFr: "N’inventez pas les détails d’un événement." },
  { id: "safety", en: "Safety", fr: "Sécurité", role: "noun", note: "Never imply an emergency or triage service.", noteFr: "N’impliquez jamais un service d’urgence ou de triage." },
  { id: "about", en: "About", fr: "À propos", role: "label", note: "Descriptive information about the App.", noteFr: "Renseignements descriptifs sur l’application." },
  { id: "route", en: "Route", fr: "Itinéraire", role: "noun", note: "Route facts require source and date.", noteFr: "Les faits d’itinéraire exigent une source et une date." },
  { id: "entrance", en: "Entrance", fr: "Entrée", role: "noun", note: "Distinguish each entrance; unknown until checked.", noteFr: "Distinguez chaque entrée ; inconnue jusqu’à vérification." },
  { id: "elevator", en: "Elevator", fr: "Ascenseur", role: "noun", note: "Availability may change.", noteFr: "La disponibilité peut changer." },
  { id: "ramp", en: "Ramp", fr: "Rampe", role: "noun", note: "Do not infer grade or dimensions.", noteFr: "N’inférez pas la pente ni les dimensions." },
  { id: "parking", en: "Parking", fr: "Stationnement", role: "noun", note: "Distinguish presence from accessible spaces.", noteFr: "Distinguez la simple présence des places accessibles." },
  { id: "accessible-parking", en: "Accessible parking", fr: "Stationnement accessible", role: "noun", note: "Source the designation and date.", noteFr: "Indiquez la source de la désignation et la date." },
  { id: "service", en: "Service", fr: "Service", role: "noun", note: "A directory entry is not a recommendation.", noteFr: "Une entrée de répertoire n’est pas une recommandation." },
  { id: "directory", en: "Directory", fr: "Répertoire", role: "noun", note: "Links only; does not assess eligibility.", noteFr: "Liens seulement ; n’évalue pas l’admissibilité." },
  { id: "contact", en: "Contact", fr: "Coordonnées", role: "noun", note: "Only display publicly provided contacts.", noteFr: "N’affichez que les coordonnées fournies publiquement." },
  { id: "last-checked", en: "Last checked", fr: "Dernière vérification", role: "label", note: "Include the actual check date.", noteFr: "Incluez la date réelle de vérification." },
  { id: "not-available", en: "Unavailable", fr: "Indisponible", role: "status", note: "Different from Unknown; requires observed evidence.", noteFr: "Différent d’Inconnu ; exige une preuve observée." },
  { id: "details", en: "Details", fr: "Détails", role: "noun", note: "Open the selected record's additional information.", noteFr: "Ouvre les renseignements supplémentaires de l’enregistrement sélectionné." },
  { id: "accessibility", en: "Accessibility", fr: "Accessibilité", role: "noun", note: "Avoid unsupported compliance claims.", noteFr: "Évitez les affirmations de conformité non étayées." },
] as const;

export const TERM_BY_ID: ReadonlyMap<string, Term> = new Map(TERMS.map((term) => [term.id, term]));
