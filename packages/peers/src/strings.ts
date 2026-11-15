import type { CoarseCity, Language, PeerTopic } from "./vocab.js";
import type { CrisisContactId } from "./types.js";

export interface Strings {
  pageTitle: string;
  intro: string;
  demoBanner: string;
  privacyNote: string;
  formLegend: string;
  ageLabel: string;
  ageHelp: string;
  topicLabel: string;
  topicChoose: string;
  languageLabel: string;
  languageChoose: string;
  cityLabel: string;
  cityNone: string;
  cityHelp: string;
  noteLabel: string;
  noteHelp: string;
  submit: string;
  topics: Record<PeerTopic, string>;
  languages: Record<Language, string>;
  cities: Record<CoarseCity, string>;
  noMatchTitle: string;
  noMatchBody: string;
  matchTitle: string;
  matchBody: string;
  matchCityPart: string;
  matchLimits: string;
  savedNote: string;
  refusedMedicalTitle: string;
  refusedMedical: string;
  refusedContactTitle: string;
  refusedContact: string;
  ageTitle: string;
  ageBody: string;
  invalidTitle: string;
  invalidBody: string;
  crisisTitle: string;
  crisisBody: string;
  crisisNotSaved: string;
  crisisContacts: Record<CrisisContactId, string>;
  partnerTitle: string;
  partnerBody: string;
  partnerNoReferral: string;
  partnerLink: string;
  partnerOfficialUnknown: string;
  noEndorsement: string;
  provenance: string;
}

const EN: Strings = {
  pageTitle: "Peer request",
  intro:
    "Ask to be matched with a peer who shares your topic and language. Matching happens on this device and uses only the topic, language and, if you choose, city you pick below.",
  demoBanner:
    "Demonstration only. No message is sent and no real person is contacted. The profiles shown are made-up demonstration data.",
  privacyNote:
    "Your request is not sent anywhere. Do not include health details, contact details or other personal information.",
  formLegend: "Your request",
  ageLabel: "I am 16 or older",
  ageHelp: "Peer requests are for people aged 16 and over.",
  topicLabel: "Topic",
  topicChoose: "Choose a topic",
  languageLabel: "Language for the peer",
  languageChoose: "Choose a language",
  cityLabel: "City (optional)",
  cityNone: "No city",
  cityHelp: "Large-area choices only. Leave on “No city” to match anywhere in Ontario.",
  noteLabel: "Short note (optional)",
  noteHelp:
    "Up to 280 characters. No health, treatment or medication questions, and no contact details.",
  submit: "Find a match",
  topics: {
    getting_around: "Getting around town",
    public_transit: "Public transit",
    travel: "Travel and trips",
    work_and_school: "Work and school",
    sport_and_recreation: "Sport and recreation",
    technology: "Everyday technology",
    community_life: "Community life",
    using_the_app: "Using the App",
  },
  languages: { en: "English", fr: "French" },
  cities: {
    toronto: "Toronto",
    ottawa: "Ottawa",
    hamilton: "Hamilton",
    london: "London",
    windsor: "Windsor",
    kingston: "Kingston",
    sudbury: "Sudbury",
    thunder_bay: "Thunder Bay",
    barrie: "Barrie",
    waterloo_region: "Waterloo Region",
  },
  noMatchTitle: "No match yet",
  noMatchBody:
    "No demonstration profile shares your topic and language right now. Nothing was sent. You can change the topic or language and try again, or use the peer-programme link below.",
  matchTitle: "A match was found (demonstration)",
  matchBody: "Demonstration profile {n} shares your topic ({topic}) and language ({language}){cityPart}.",
  matchCityPart: " and your city",
  matchLimits:
    "This is a labelled demonstration. The App sends no message, contacts no one and does not judge anyone's health or needs. A match uses topic, language and city only.",
  savedNote: "Your request is kept on this device only.",
  refusedMedicalTitle: "This request was not accepted",
  refusedMedical:
    "The App cannot take health, treatment or medication questions in a peer request, and it was not saved. Remove that part and try again. For a non-urgent health question, Health811 (811) is a public service. In an emergency, call 911.",
  refusedContactTitle: "Remove contact details",
  refusedContact:
    "A request cannot include an email, a phone number or a web address, and it was not saved. Remove it and try again.",
  ageTitle: "Peer requests are for people 16 and older",
  ageBody: "Please confirm that you are 16 or older to continue. Nothing was saved.",
  invalidTitle: "Check the form",
  invalidBody:
    "Choose a topic and a language from the lists. If you wrote a note, keep it to 280 characters. Nothing was saved.",
  crisisTitle: "Please reach out now",
  crisisBody:
    "If you are in crisis or thinking about suicide, contact one of these right away. The App cannot give support or advice itself.",
  crisisNotSaved: "What you wrote was not saved.",
  crisisContacts: {
    emergency_911: "911, in an emergency",
    crisis_988: "9-8-8, Suicide Crisis Helpline",
    connexontario: "ConnexOntario",
  },
  partnerTitle: "Peer programme at a partner SCI organisation",
  partnerBody:
    "Some SCI organisations run their own peer programmes. This is a link only. The App does not refer you and does not decide whether you can join.",
  partnerNoReferral: "A link is not a referral, a partnership or an endorsement.",
  partnerLink: "Open the peer-programme link (demonstration placeholder)",
  partnerOfficialUnknown: "Official web address: Unknown. The link above is a placeholder and will not open a real page.",
  noEndorsement: "The App is not affiliated with or endorsed by any organisation.",
  provenance: "Demonstration data. Tier {tier}, {label}. Source: {source}. Checked {date}.",
};

const FR_RAW: Strings = {
  pageTitle: "Demande de jumelage avec un pair",
  intro:
    "Demandez à être jumelé avec un pair qui partage votre sujet et votre langue. Le jumelage se fait sur cet appareil et utilise seulement le sujet, la langue et, si vous le choisissez, la ville indiqués ci-dessous.",
  demoBanner:
    "Démonstration seulement. Aucun message n'est envoyé et aucune vraie personne n'est contactée. Les profils affichés sont des données de démonstration inventées.",
  privacyNote:
    "Votre demande n'est envoyée nulle part. N'incluez pas de détails de santé, de coordonnées ni d'autres renseignements personnels.",
  formLegend: "Votre demande",
  ageLabel: "J'ai 16 ans ou plus",
  ageHelp: "Les demandes de jumelage sont réservées aux personnes de 16 ans et plus.",
  topicLabel: "Sujet",
  topicChoose: "Choisissez un sujet",
  languageLabel: "Langue du pair",
  languageChoose: "Choisissez une langue",
  cityLabel: "Ville (facultatif)",
  cityNone: "Aucune ville",
  cityHelp:
    "Grandes régions seulement. Laissez « Aucune ville » pour un jumelage n'importe où en Ontario.",
  noteLabel: "Courte note (facultatif)",
  noteHelp:
    "280 caractères au plus. Aucune question sur la santé, les traitements ou les médicaments, et aucune coordonnée.",
  submit: "Chercher un jumelage",
  topics: {
    getting_around: "Se déplacer en ville",
    public_transit: "Transport en commun",
    travel: "Voyages et déplacements",
    work_and_school: "Travail et études",
    sport_and_recreation: "Sport et loisirs",
    technology: "Technologie du quotidien",
    community_life: "Vie communautaire",
    using_the_app: "Utiliser l'application",
  },
  languages: { en: "Anglais", fr: "Français" },
  cities: {
    toronto: "Toronto",
    ottawa: "Ottawa",
    hamilton: "Hamilton",
    london: "London",
    windsor: "Windsor",
    kingston: "Kingston",
    sudbury: "Sudbury",
    thunder_bay: "Thunder Bay",
    barrie: "Barrie",
    waterloo_region: "Région de Waterloo",
  },
  noMatchTitle: "Pas encore de jumelage",
  noMatchBody:
    "Aucun profil de démonstration ne partage votre sujet et votre langue pour le moment. Rien n'a été envoyé. Vous pouvez changer le sujet ou la langue et réessayer, ou utiliser le lien vers le programme de pairs ci-dessous.",
  matchTitle: "Un jumelage a été trouvé (démonstration)",
  matchBody:
    "Le profil de démonstration {n} partage votre sujet ({topic}) et votre langue ({language}){cityPart}.",
  matchCityPart: " et votre ville",
  matchLimits:
    "Ceci est une démonstration étiquetée. L'application n'envoie aucun message, ne contacte personne et ne juge ni la santé ni les besoins de personne. Un jumelage repose seulement sur le sujet, la langue et la ville.",
  savedNote: "Votre demande reste sur cet appareil seulement.",
  refusedMedicalTitle: "Cette demande n'a pas été acceptée",
  refusedMedical:
    "L'application ne peut pas recevoir de questions sur la santé, les traitements ou les médicaments dans une demande, et celle-ci n'a pas été enregistrée. Retirez cette partie et réessayez. Pour une question de santé non urgente, Health811 (811) est un service public. En cas d'urgence, appelez le 911.",
  refusedContactTitle: "Retirez les coordonnées",
  refusedContact:
    "Une demande ne peut pas contenir de courriel, de numéro de téléphone ni d'adresse web, et celle-ci n'a pas été enregistrée. Retirez-les et réessayez.",
  ageTitle: "Les demandes sont réservées aux personnes de 16 ans et plus",
  ageBody: "Veuillez confirmer que vous avez 16 ans ou plus pour continuer. Rien n'a été enregistré.",
  invalidTitle: "Vérifiez le formulaire",
  invalidBody:
    "Choisissez un sujet et une langue dans les listes. Si vous écrivez une note, limitez-la à 280 caractères. Rien n'a été enregistré.",
  crisisTitle: "Communiquez avec quelqu'un maintenant",
  crisisBody:
    "Si vous êtes en crise ou si vous pensez au suicide, communiquez tout de suite avec l'une de ces ressources. L'application ne peut pas offrir elle-même de soutien ni de conseils.",
  crisisNotSaved: "Ce que vous avez écrit n'a pas été enregistré.",
  crisisContacts: {
    emergency_911: "Le 911, en cas d'urgence",
    crisis_988: "Le 9-8-8, Ligne d'aide en cas de crise suicidaire",
    connexontario: "ConnexOntario",
  },
  partnerTitle: "Programme de pairs d'un organisme partenaire pour les lésions médullaires",
  partnerBody:
    "Certains organismes pour les lésions médullaires offrent leur propre programme de pairs. Ceci est un lien seulement. L'application ne vous aiguille pas et ne décide pas si vous pouvez vous joindre au programme.",
  partnerNoReferral: "Un lien n'est ni une orientation, ni un partenariat, ni une recommandation.",
  partnerLink: "Ouvrir le lien vers le programme de pairs (lien provisoire de démonstration)",
  partnerOfficialUnknown:
    "Adresse web officielle : inconnue. Le lien ci-dessus est un lien provisoire et n'ouvrira pas de vraie page.",
  noEndorsement: "L'application n'est affiliée à aucun organisme et n'est recommandée par aucun organisme.",
  provenance: "Données de démonstration. Niveau {tier}, {label}. Source : {source}. Vérifié le {date}.",
};

/** French typography: U+00A0 before : ; ? ! and inside « ». Applied once, so authors write plain spaces. */
export function frenchTypography(text: string): string {
  return text
    .replace(/«\s*/g, "« ")
    .replace(/\s*»/g, " »")
    .replace(/ ([:;?!])/g, " $1");
}

function mapStrings<T>(value: T, transform: (text: string) => string): T {
  if (typeof value === "string") {
    return transform(value) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = mapStrings(item, transform);
  }
  return out as T;
}

const FR: Strings = mapStrings(FR_RAW, frenchTypography);

export const CATALOG: Record<Language, Strings> = { en: EN, fr: FR };

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}
