import { HELP_ARTICLES } from "./content/articles.js";
import type { HelpArticle } from "./types.js";

// App-authored integration guides. These are editorial explanations, not on-site verification.
const newArticles: HelpArticle[] = [
  {
    id: "reading-record",
    topics: ["records"],
    safetyCritical: false,
    does: { en: ["Understand where a field comes from and what is unknown."], fr: ["Comprendre la provenance d’un champ et les données inconnues."] },
    doesNot: { en: ["Unknown means there is no supported value in the record. It does not mean no or inaccessible. Check the source before relying on the information."], fr: ["Inconnu signifie qu’aucune valeur documentée n’est présente. Cela ne signifie pas non ou inaccessible. Consultez la source avant de vous fier aux renseignements."] },
    dataUses: { en: ["Public source notes and local app settings."], fr: ["Notes de sources publiques et réglages locaux de l’App."] },
    synonyms: { en: [], fr: [] },
    translation: {
      en: { state: "draft_plain_language", translator: "App editorial", reviewer: null, reviewed: null },
      fr: { state: "draft_awaiting_franco_ontarian_review", translator: "App editorial", reviewer: null, reviewed: null },
    },
    machineTranslated: false,
    sources: [{
      title: { en: "App-authored feature guide", fr: "Guide de fonction rédigé par l’App" },
      retrieved: "2026-11-15",
      limit: { en: "Describes the interface, not external verification.", fr: "Décrit l’interface, sans vérification externe." },
    }],
    en: { title: "How to read a record", summary: "Understand where a field comes from and what is unknown.", sections: [
      { heading: "Read the evidence", paragraphs: ["A record shows the source, licence, retrieval date and verification tier for each known field. Tier E means a desk check, not an on-site visit."] },
      { heading: "When a value is unknown", paragraphs: ["Unknown means there is no supported value in the record. It does not mean no or inaccessible. Check the source before relying on the information."] },
    ] },
    fr: { title: "Lire une fiche", summary: "Comprendre la provenance d’un champ et les données inconnues.", sections: [
      { heading: "Lire les éléments de preuve", paragraphs: ["Une fiche montre la source, la licence, la date de récupération et le niveau de vérification de chaque champ connu. Le niveau E indique une vérification documentaire, pas une visite sur place."] },
      { heading: "Quand une valeur est inconnue", paragraphs: ["Inconnu signifie qu’aucune valeur documentée n’est présente. Cela ne signifie pas non ou inaccessible. Consultez la source avant de vous fier aux renseignements."] },
    ] },
  },
  {
    id: "map-input",
    topics: ["map"],
    safetyCritical: false,
    does: { en: ["Use the list and controls when map gestures are difficult."], fr: ["Utilisez la liste et les commandes lorsque les gestes sur la carte sont difficiles."] },
    doesNot: { en: ["Use your screen reader or switch navigation with labelled controls. If a map gesture is unavailable, use the corresponding list action."], fr: ["Utilisez les commandes étiquetées avec votre lecteur d’écran ou votre contacteur. Si un geste est impossible, utilisez l’action correspondante dans la liste."] },
    dataUses: { en: ["Public source notes and local app settings."], fr: ["Notes de sources publiques et réglages locaux de l’App."] },
    synonyms: { en: [], fr: [] },
    translation: {
      en: { state: "draft_plain_language", translator: "App editorial", reviewer: null, reviewed: null },
      fr: { state: "draft_awaiting_franco_ontarian_review", translator: "App editorial", reviewer: null, reviewed: null },
    },
    machineTranslated: false,
    sources: [{
      title: { en: "App-authored feature guide", fr: "Guide de fonction rédigé par l’App" },
      retrieved: "2026-11-15",
      limit: { en: "Describes the interface, not external verification.", fr: "Décrit l’interface, sans vérification externe." },
    }],
    en: { title: "Using the map with a keyboard, screen reader or switch", summary: "Use the list and controls when map gestures are difficult.", sections: [
      { heading: "Use the list", paragraphs: ["Move through controls with Tab and Shift+Tab. Open a place from the results list instead of selecting a map pin."] },
      { heading: "Assistive input", paragraphs: ["Use your screen reader or switch navigation with labelled controls. If a map gesture is unavailable, use the corresponding list action."] },
    ] },
    fr: { title: "Utiliser la carte avec un clavier, un lecteur d’écran ou un contacteur", summary: "Utilisez la liste et les commandes lorsque les gestes sur la carte sont difficiles.", sections: [
      { heading: "Utiliser la liste", paragraphs: ["Parcourez les commandes avec Tab et Maj+Tab. Ouvrez un lieu depuis la liste de résultats plutôt qu’avec une épingle."] },
      { heading: "Commandes adaptées", paragraphs: ["Utilisez les commandes étiquetées avec votre lecteur d’écran ou votre contacteur. Si un geste est impossible, utilisez l’action correspondante dans la liste."] },
    ] },
  },
  {
    id: "offline-region",
    topics: ["offline"],
    safetyCritical: false,
    does: { en: ["Save a region before leaving a connection."], fr: ["Enregistrez une région avant de perdre la connexion."] },
    doesNot: { en: ["Saved records reflect their last download. New corrections and live conditions are not available without a connection."], fr: ["Les fiches enregistrées reflètent le dernier téléchargement. Les corrections récentes et les conditions en direct ne sont pas accessibles sans connexion."] },
    dataUses: { en: ["Public source notes and local app settings."], fr: ["Notes de sources publiques et réglages locaux de l’App."] },
    synonyms: { en: [], fr: [] },
    translation: {
      en: { state: "draft_plain_language", translator: "App editorial", reviewer: null, reviewed: null },
      fr: { state: "draft_awaiting_franco_ontarian_review", translator: "App editorial", reviewer: null, reviewed: null },
    },
    machineTranslated: false,
    sources: [{
      title: { en: "App-authored feature guide", fr: "Guide de fonction rédigé par l’App" },
      retrieved: "2026-11-15",
      limit: { en: "Describes the interface, not external verification.", fr: "Décrit l’interface, sans vérification externe." },
    }],
    en: { title: "Downloading a region for offline use", summary: "Save a region before leaving a connection.", sections: [
      { heading: "Before you go", paragraphs: ["Open Offline, choose a listed region and start its download while connected. Check its displayed status before departing."] },
      { heading: "Limits offline", paragraphs: ["Saved records reflect their last download. New corrections and live conditions are not available without a connection."] },
    ] },
    fr: { title: "Télécharger une région pour un usage hors ligne", summary: "Enregistrez une région avant de perdre la connexion.", sections: [
      { heading: "Avant le départ", paragraphs: ["Ouvrez Hors ligne, choisissez une région proposée et lancez son téléchargement avec une connexion. Vérifiez son état affiché avant de partir."] },
      { heading: "Limites hors ligne", paragraphs: ["Les fiches enregistrées reflètent le dernier téléchargement. Les corrections récentes et les conditions en direct ne sont pas accessibles sans connexion."] },
    ] },
  },
  {
    id: "trip-planning",
    topics: ["journey"],
    safetyCritical: false,
    does: { en: ["Review known route information and gaps before travelling."], fr: ["Examinez les données connues et les lacunes avant de vous déplacer."] },
    doesNot: { en: ["A proposed route is not a guarantee of step-free access, current lift operation, vehicle availability or safe conditions. Confirm critical details with the operator."], fr: ["Un trajet proposé ne garantit ni l’accès sans marches, ni le fonctionnement actuel d’un ascenseur, ni la disponibilité d’un véhicule, ni des conditions sûres. Confirmez les détails essentiels auprès de l’exploitant."] },
    dataUses: { en: ["Public source notes and local app settings."], fr: ["Notes de sources publiques et réglages locaux de l’App."] },
    synonyms: { en: [], fr: [] },
    translation: {
      en: { state: "draft_plain_language", translator: "App editorial", reviewer: null, reviewed: null },
      fr: { state: "draft_awaiting_franco_ontarian_review", translator: "App editorial", reviewer: null, reviewed: null },
    },
    machineTranslated: false,
    sources: [{
      title: { en: "App-authored feature guide", fr: "Guide de fonction rédigé par l’App" },
      retrieved: "2026-11-15",
      limit: { en: "Describes the interface, not external verification.", fr: "Décrit l’interface, sans vérification externe." },
    }],
    en: { title: "Planning a trip: checks and limits", summary: "Review known route information and gaps before travelling.", sections: [
      { heading: "What is checked", paragraphs: ["The App compares available route and place fields from its stored sources. Each fact retains its source and date."] },
      { heading: "What is not checked", paragraphs: ["A proposed route is not a guarantee of step-free access, current lift operation, vehicle availability or safe conditions. Confirm critical details with the operator."] },
    ] },
    fr: { title: "Planifier un trajet : vérifications et limites", summary: "Examinez les données connues et les lacunes avant de vous déplacer.", sections: [
      { heading: "Ce qui est vérifié", paragraphs: ["L’App compare les champs disponibles sur les trajets et les lieux selon ses sources enregistrées. Chaque fait conserve sa source et sa date."] },
      { heading: "Ce qui n’est pas vérifié", paragraphs: ["Un trajet proposé ne garantit ni l’accès sans marches, ni le fonctionnement actuel d’un ascenseur, ni la disponibilité d’un véhicule, ni des conditions sûres. Confirmez les détails essentiels auprès de l’exploitant."] },
    ] },
  },
  {
    id: "report-correction",
    topics: ["contribute"],
    safetyCritical: false,
    does: { en: ["Share a public-data correction without creating an account."], fr: ["Proposez une correction aux données publiques sans créer de compte."] },
    doesNot: { en: ["Do not include personal medical details, contact information about other people or private access codes. A submission is not automatically verified or published."], fr: ["Ne transmettez pas de renseignements médicaux personnels, de coordonnées de tiers ni de codes d’accès privés. Un signalement n’est pas automatiquement vérifié ni publié."] },
    dataUses: { en: ["Public source notes and local app settings."], fr: ["Notes de sources publiques et réglages locaux de l’App."] },
    synonyms: { en: [], fr: [] },
    translation: {
      en: { state: "draft_plain_language", translator: "App editorial", reviewer: null, reviewed: null },
      fr: { state: "draft_awaiting_franco_ontarian_review", translator: "App editorial", reviewer: null, reviewed: null },
    },
    machineTranslated: false,
    sources: [{
      title: { en: "App-authored feature guide", fr: "Guide de fonction rédigé par l’App" },
      retrieved: "2026-11-15",
      limit: { en: "Describes the interface, not external verification.", fr: "Décrit l’interface, sans vérification externe." },
    }],
    en: { title: "Reporting a correction or adding a place", summary: "Share a public-data correction without creating an account.", sections: [
      { heading: "Submit a report", paragraphs: ["Open Contribute, select a correction or new place and provide the public facts and source you want checked. No account is required."] },
      { heading: "Protect privacy", paragraphs: ["Do not include personal medical details, contact information about other people or private access codes. A submission is not automatically verified or published."] },
    ] },
    fr: { title: "Signaler une correction ou ajouter un lieu", summary: "Proposez une correction aux données publiques sans créer de compte.", sections: [
      { heading: "Envoyer un signalement", paragraphs: ["Ouvrez Contribuer, choisissez une correction ou un nouveau lieu, puis indiquez les faits publics et la source à vérifier. Aucun compte n’est requis."] },
      { heading: "Protéger la vie privée", paragraphs: ["Ne transmettez pas de renseignements médicaux personnels, de coordonnées de tiers ni de codes d’accès privés. Un signalement n’est pas automatiquement vérifié ni publié."] },
    ] },
  },
  {
    id: "data-licences",
    topics: ["sources"],
    safetyCritical: false,
    does: { en: ["Understand the origins and reuse limits of public datasets."], fr: ["Comprenez l’origine et les limites de réutilisation des jeux de données publics."] },
    doesNot: { en: ["A dataset is included only when its terms permit that use. Some feeds are withheld; their absence must not be interpreted as a service being unavailable. OpenStreetMap attribution is © OpenStreetMap contributors, ODbL."], fr: ["Un jeu de données est inclus seulement si ses conditions le permettent. Certains flux sont exclus ; leur absence ne signifie pas qu’un service est indisponible. Attribution OpenStreetMap : © contributeurs OpenStreetMap, ODbL."] },
    dataUses: { en: ["Public source notes and local app settings."], fr: ["Notes de sources publiques et réglages locaux de l’App."] },
    synonyms: { en: [], fr: [] },
    translation: {
      en: { state: "draft_plain_language", translator: "App editorial", reviewer: null, reviewed: null },
      fr: { state: "draft_awaiting_franco_ontarian_review", translator: "App editorial", reviewer: null, reviewed: null },
    },
    machineTranslated: false,
    sources: [{
      title: { en: "App-authored feature guide", fr: "Guide de fonction rédigé par l’App" },
      retrieved: "2026-11-15",
      limit: { en: "Describes the interface, not external verification.", fr: "Décrit l’interface, sans vérification externe." },
    }],
    en: { title: "Where the data comes from and its licences", summary: "Understand the origins and reuse limits of public datasets.", sections: [
      { heading: "Sources and attribution", paragraphs: ["The App may use OpenStreetMap data under ODbL, municipal open-data sets under their own licences and public transit feeds under their applicable terms. See each record for its actual source."] },
      { heading: "Licence limits", paragraphs: ["A dataset is included only when its terms permit that use. Some feeds are withheld; their absence must not be interpreted as a service being unavailable. OpenStreetMap attribution is © OpenStreetMap contributors, ODbL."] },
    ] },
    fr: { title: "Provenance des données et licences", summary: "Comprenez l’origine et les limites de réutilisation des jeux de données publics.", sections: [
      { heading: "Sources et attribution", paragraphs: ["L’App peut utiliser des données OpenStreetMap sous ODbL, des jeux de données municipaux sous leurs propres licences et des flux de transport public selon leurs conditions. Consultez chaque fiche pour connaître sa source réelle."] },
      { heading: "Limites des licences", paragraphs: ["Un jeu de données est inclus seulement si ses conditions le permettent. Certains flux sont exclus ; leur absence ne signifie pas qu’un service est indisponible. Attribution OpenStreetMap : © contributeurs OpenStreetMap, ODbL."] },
    ] },
  },
  {
    id: "device-privacy",
    topics: ["privacy"],
    safetyCritical: false,
    does: { en: ["Understand local saved settings and optional submissions."], fr: ["Comprenez les réglages locaux et les signalements facultatifs."] },
    doesNot: { en: ["Opening online maps or downloading a region requires network requests. Sending a correction shares the content you choose to submit; avoid personal details."], fr: ["L’ouverture de cartes en ligne ou le téléchargement d’une région nécessite des requêtes réseau. Envoyer une correction transmet le contenu choisi ; évitez les données personnelles."] },
    dataUses: { en: ["Public source notes and local app settings."], fr: ["Notes de sources publiques et réglages locaux de l’App."] },
    synonyms: { en: [], fr: [] },
    translation: {
      en: { state: "draft_plain_language", translator: "App editorial", reviewer: null, reviewed: null },
      fr: { state: "draft_awaiting_franco_ontarian_review", translator: "App editorial", reviewer: null, reviewed: null },
    },
    machineTranslated: false,
    sources: [{
      title: { en: "App-authored feature guide", fr: "Guide de fonction rédigé par l’App" },
      retrieved: "2026-11-15",
      limit: { en: "Describes the interface, not external verification.", fr: "Décrit l’interface, sans vérification externe." },
    }],
    en: { title: "Privacy: what stays on your device", summary: "Understand local saved settings and optional submissions.", sections: [
      { heading: "On-device information", paragraphs: ["Downloaded regions and local preferences can remain on this device until you remove them or clear its storage."] },
      { heading: "Network use", paragraphs: ["Opening online maps or downloading a region requires network requests. Sending a correction shares the content you choose to submit; avoid personal details."] },
    ] },
    fr: { title: "Confidentialité : ce qui reste sur votre appareil", summary: "Comprenez les réglages locaux et les signalements facultatifs.", sections: [
      { heading: "Renseignements sur l’appareil", paragraphs: ["Les régions téléchargées et les préférences locales peuvent rester sur cet appareil jusqu’à leur suppression ou à l’effacement du stockage."] },
      { heading: "Utilisation du réseau", paragraphs: ["L’ouverture de cartes en ligne ou le téléchargement d’une région nécessite des requêtes réseau. Envoyer une correction transmet le contenu choisi ; évitez les données personnelles."] },
    ] },
  },
];

export const ALL_HELP_ARTICLES: readonly HelpArticle[] = [...HELP_ARTICLES, ...newArticles];
