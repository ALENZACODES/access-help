import { frenchTypography, mapStrings } from "../strings.js";
import type { Language } from "../vocab.js";
import type { ConsentItem } from "./consent.js";
import type { ConnectHoldCode } from "./health-screen.js";
import type { Actor, AuditAction, AuditReason, ModerationTier, RequestState } from "./moderation.js";
import type { ConnectionRejectCode } from "./request.js";
import type { UnknownReason } from "./routing.js";
import type { ForWhom, LifeContext, Region } from "./vocab.js";

export interface ConnectStrings {
  pageTitle: string;
  intro: string;
  notSentBanner: string;
  noPromise: string;
  formLegend: string;
  forWhomLegend: string;
  forWhom: Record<ForWhom, string>;
  forWhomHelp: string;
  contextsLegend: string;
  contextsHelp: string;
  contexts: Record<LifeContext, string>;
  regionLabel: string;
  regionNone: string;
  regionHelp: string;
  regions: Record<Region, string>;
  languageLabel: string;
  languageChoose: string;
  languages: Record<Language, string>;
  noteLabel: string;
  noteHelp: string;
  noteCount: string;
  ageLabel: string;
  ageHelp: string;
  consentLegend: string;
  consentIntro: string;
  consentItems: Record<ConsentItem, string>;
  consentRequiredMark: string;
  consentOptionalMark: string;
  consentRevocable: string;
  submit: string;
  errorTitle: string;
  rejected: Record<ConnectionRejectCode, string>;
  nothingSaved: string;
  refusedTitle: string;
  refused: Record<ConnectHoldCode, string>;
  crisisSignpostOnly: string;
  crisisBack: string;
  resultTitle: string;
  resultSaved: string;
  stateLabel: string;
  states: Record<RequestState, string>;
  stateHelp: Record<RequestState, string>;
  tierLabel: string;
  tiers: Record<ModerationTier, string>;
  streamLabel: string;
  streamUnknown: string;
  unknownReasons: Record<UnknownReason, string>;
  streamSample: string;
  streamPendingReview: string;
  summaryLabel: string;
  summaryHelp: string;
  copy: string;
  copied: string;
  copyFailed: string;
  download: string;
  downloaded: string;
  downloadFileName: string;
  withdrawConsent: string;
  withdrawn: string;
  closeRequest: string;
  closed: string;
  summaryUnavailable: string;
  historyTitle: string;
  historyEmpty: string;
  historyItem: string;
  historyShow: string;
  auditTitle: string;
  auditEntry: string;
  auditActions: Record<AuditAction, string>;
  auditReasons: Record<AuditReason, string>;
  actors: Record<Actor, string>;
  deleteOne: string;
  deletedOne: string;
  deleteAll: string;
  deleteAllConfirm: string;
  deleteAllYes: string;
  deleteAllNo: string;
  deletedAll: string;
  provenance: string;
  summary: {
    title: string;
    prepared: string;
    notSent: string;
    forWhom: string;
    contexts: string;
    region: string;
    language: string;
    note: string;
    notShared: string;
    stream: string;
    state: string;
    age: string;
    onBehalf: string;
    notReferral: string;
    noHealth: string;
    reference: string;
    listSeparator: string;
  };
}

const EN: ConnectStrings = {
  pageTitle: "Ask for a peer connection",
  intro:
    "Say what part of life you would like to talk about with a peer. The App turns your choices into a short summary on this device. You decide whether to share that summary with a partner organisation's peer programme.",
  notSentBanner:
    "The App sends nothing. Your request stays on this device until you copy or download the summary and share it yourself.",
  noPromise:
    "The App cannot promise that a peer will reply, or how long a reply could take. A peer programme decides that, under its own training and safeguarding rules.",
  formLegend: "Your request",
  forWhomLegend: "Who is this request for?",
  forWhom: { myself: "Myself", someone_i_support: "Someone I support" },
  forWhomHelp:
    "A request made for someone else is marked as needing review, because a programme would need to hear from that person directly.",
  contextsLegend: "What would you like to talk about?",
  contextsHelp:
    "Choose one to three. These are parts of life, not health information. The App does not ask for a diagnosis or an injury level.",
  contexts: {
    new_injury: "Life soon after an injury",
    returning_home: "Returning home",
    parenting: "Parenting",
    work: "Work",
    school: "School and study",
    sport_recreation: "Sport and recreation",
    family_or_caregiver: "Being a family member or caregiver",
    community_life: "Community and social life",
  },
  regionLabel: "Part of Ontario (optional)",
  regionNone: "Prefer not to say",
  regionHelp: "Broad regions only. No city, address or postal code is asked for.",
  regions: {
    greater_toronto_area: "Greater Toronto Area",
    central_ontario: "Central Ontario",
    eastern_ontario: "Eastern Ontario",
    southwestern_ontario: "Southwestern Ontario",
    northern_ontario: "Northern Ontario",
  },
  languageLabel: "Language you would like to use with a peer",
  languageChoose: "Choose a language",
  languages: { en: "English", fr: "French" },
  noteLabel: "Short note (optional)",
  noteHelp:
    "Up to {max} characters. Do not write health details, a diagnosis, an injury level, names or contact details. A note with those will not be kept.",
  noteCount: "{used} of {max} characters used",
  ageLabel: "I am 16 or older",
  ageHelp: "Peer requests are for people aged 16 and over.",
  consentLegend: "Your consent, item by item",
  consentIntro:
    "Nothing is ticked for you. The summary holds only the items you tick here. You can withdraw consent later from the request itself.",
  consentItems: {
    prepare_summary: "Prepare a summary of this request on this device",
    include_contexts: "Put the parts of life I chose in the summary",
    include_region: "Put my part of Ontario in the summary and use it to look up a programme stream",
    include_language: "Put my language choice in the summary",
    include_note: "Put my short note in the summary",
  },
  consentRequiredMark: "(needed to prepare a summary)",
  consentOptionalMark: "(optional)",
  consentRevocable:
    "Withdrawing consent closes the request and removes its summary from the App. The App cannot take back a copy you have already shared yourself.",
  submit: "Prepare my request summary",
  errorTitle: "Check the form",
  rejected: {
    age_out_of_scope: "Please confirm that you are 16 or older to continue.",
    invalid_for_whom: "Choose who this request is for.",
    no_context: "Choose at least one part of life to talk about.",
    too_many_contexts: "Choose no more than three parts of life.",
    invalid_context: "Choose parts of life from the list.",
    invalid_region: "Choose a part of Ontario from the list, or “Prefer not to say”.",
    invalid_language: "Choose a language from the list.",
    note_too_long: "Keep the note to {max} characters.",
    consent_required:
      "To prepare a summary, tick the two consent items marked as needed. Without them the App prepares nothing.",
  },
  nothingSaved: "Nothing was saved.",
  refusedTitle: "The note was not kept",
  refused: {
    medical_advice:
      "The note reads like a health, treatment or medication question. The App cannot take those in a peer request. Remove that part and try again. In an emergency, call 911.",
    personal_data: "The note has an email, a phone number or a web address in it. Remove it and try again.",
    health_detail:
      "The note seems to name a diagnosis, an injury level or another health detail. The App does not collect those. Remove that part and try again. You can tell a peer programme what you choose, in your own way, when you contact it.",
  },
  crisisSignpostOnly:
    "These are services run by others. The App only points to them. It does not offer counselling and does not contact anyone for you.",
  crisisBack: "Go back to the request form",
  resultTitle: "Your request summary is ready",
  resultSaved: "The request is kept on this device only. The App has not sent it to anyone.",
  stateLabel: "Status on this device",
  states: {
    received: "Received",
    needs_review: "Needs review",
    routed: "Programme stream recorded",
    closed: "Closed",
  },
  stateHelp: {
    received: "The request is saved on this device. No programme has seen it.",
    needs_review:
      "The request is marked as needing review by a peer programme. Nobody reviews requests inside the App, so the summary carries this mark for the programme you share it with.",
    routed:
      "A programme stream is recorded for this request. This is a note in the summary only. No programme has seen the request.",
    closed: "The request is closed. No summary can be prepared from it.",
  },
  tierLabel: "Level of review",
  tiers: {
    device_screen: "Checked on this device only",
    programme_review: "Marked for review by a peer programme",
    safeguarding: "Marked as a safeguarding concern",
  },
  streamLabel: "Programme stream",
  streamUnknown: "Unknown",
  unknownReasons: {
    no_streams_recorded: "No programme stream has been recorded in the App yet.",
    no_stream_for_context: "No programme stream is recorded for the parts of life you chose.",
    no_stream_for_region: "No programme stream is recorded for this region.",
  },
  streamSample: "Sample data, not a real programme",
  streamPendingReview: "Not recorded while the request needs review",
  summaryLabel: "Summary to share yourself",
  summaryHelp:
    "Copy or download this text, then share it with a partner organisation's peer programme in the way that programme asks for. The App does not know any programme's address and sends nothing.",
  copy: "Copy the summary",
  copied: "The summary was copied. Nothing was sent.",
  copyFailed: "The summary could not be copied. Select the text above and copy it yourself.",
  download: "Download the summary as a text file",
  downloaded: "The summary was downloaded to this device. Nothing was sent.",
  downloadFileName: "peer-request-summary",
  withdrawConsent: "Withdraw consent and close this request",
  withdrawn: "Consent was withdrawn. The request is closed and its summary is no longer available in the App.",
  closeRequest: "Close this request",
  closed: "The request was closed.",
  summaryUnavailable: "No summary is available for this request.",
  historyTitle: "Requests kept on this device",
  historyEmpty: "No requests are kept on this device.",
  historyItem: "Request of {date}: {contexts}",
  historyShow: "Show this request",
  auditTitle: "What happened to this request",
  auditEntry: "{at}: {action} ({actor}). {reason}",
  auditActions: {
    created: "Request created",
    flagged_for_review: "Marked as needing review",
    escalated: "Raised as a safeguarding concern",
    review_cleared: "Review finished",
    routed: "Programme stream recorded",
    closed: "Request closed",
  },
  auditReasons: {
    request_created: "The request was saved on this device.",
    on_behalf_of_another_person: "The request was made for someone else.",
    review_requested: "A review was asked for.",
    safeguarding_concern: "A safeguarding concern was recorded.",
    review_complete: "The review was finished.",
    stream_recorded: "A routing rule gave a programme stream.",
    consent_withdrawn: "Consent was withdrawn.",
    withdrawn_by_person: "The person closed the request.",
    closed_after_review: "The request was closed after review.",
  },
  actors: { person: "you", device: "this device", reviewer: "a reviewer" },
  deleteOne: "Delete this request",
  deletedOne: "The request was deleted from this device.",
  deleteAll: "Delete everything",
  deleteAllConfirm:
    "Delete every peer request kept on this device, with its history? This cannot be undone.",
  deleteAllYes: "Yes, delete everything",
  deleteAllNo: "No, keep my requests",
  deletedAll: "Every peer request was deleted from this device.",
  provenance: "Tier {tier}, {label}. Source: {source}. Recorded {date}.",
  summary: {
    title: "Peer connection request: summary",
    prepared: "Prepared on the person's own device on {date}.",
    notSent: "The App has not sent this summary to anyone. The person chose to share it.",
    forWhom: "Request for: {value}",
    contexts: "Would like to talk about: {value}",
    region: "Part of Ontario: {value}",
    language: "Preferred language: {value}",
    note: "Note: {value}",
    notShared: "not shared",
    stream: "Programme stream: {value}",
    state: "Status on the device: {value}",
    age: "Aged 16 or older: confirmed by the person",
    onBehalf:
      "This request was made for someone else. It needs review, and that person has not been asked by the App.",
    notReferral:
      "This is not a referral. No programme has seen this request before now, and no reply or reply time has been promised.",
    noHealth: "By design it holds no diagnosis, injury level or other health information.",
    reference: "Reference on the device: {value}",
    listSeparator: "; ",
  },
};

const FR_RAW: ConnectStrings = {
  pageTitle: "Demander à parler avec un pair",
  intro:
    "Indiquez de quel aspect de la vie vous aimeriez parler avec un pair. L'application transforme vos choix en un court résumé sur cet appareil. Vous décidez de transmettre ou non ce résumé au programme de pairs d'un organisme partenaire.",
  notSentBanner:
    "L'application n'envoie rien. Votre demande reste sur cet appareil jusqu'à ce que vous copiiez ou téléchargiez le résumé et le transmettiez vous-même.",
  noPromise:
    "L'application ne peut pas promettre qu'un pair répondra, ni dans quel délai. C'est un programme de pairs qui en décide, selon ses propres règles de formation et de protection.",
  formLegend: "Votre demande",
  forWhomLegend: "Pour qui est cette demande ?",
  forWhom: { myself: "Pour moi", someone_i_support: "Pour une personne que j'accompagne" },
  forWhomHelp:
    "Une demande faite pour quelqu'un d'autre est marquée « à examiner », car un programme devrait entendre cette personne directement.",
  contextsLegend: "De quoi aimeriez-vous parler ?",
  contextsHelp:
    "Choisissez de un à trois aspects. Ce sont des aspects de la vie, pas des renseignements sur la santé. L'application ne demande ni diagnostic ni niveau de blessure.",
  contexts: {
    new_injury: "La vie peu après une blessure",
    returning_home: "Le retour à la maison",
    parenting: "Être parent",
    work: "Le travail",
    school: "L'école et les études",
    sport_recreation: "Le sport et les loisirs",
    family_or_caregiver: "Être un proche ou une personne aidante",
    community_life: "La vie communautaire et sociale",
  },
  regionLabel: "Région de l'Ontario (facultatif)",
  regionNone: "Je préfère ne pas le dire",
  regionHelp: "Grandes régions seulement. Aucune ville, adresse ni code postal n'est demandé.",
  regions: {
    greater_toronto_area: "Région du Grand Toronto",
    central_ontario: "Centre de l'Ontario",
    eastern_ontario: "Est de l'Ontario",
    southwestern_ontario: "Sud-Ouest de l'Ontario",
    northern_ontario: "Nord de l'Ontario",
  },
  languageLabel: "Langue que vous aimeriez utiliser avec un pair",
  languageChoose: "Choisissez une langue",
  languages: { en: "Anglais", fr: "Français" },
  noteLabel: "Courte note (facultatif)",
  noteHelp:
    "{max} caractères au plus. N'écrivez pas de détails de santé, de diagnostic, de niveau de blessure, de noms ni de coordonnées. Une note qui en contient ne sera pas conservée.",
  noteCount: "{used} caractères utilisés sur {max}",
  ageLabel: "J'ai 16 ans ou plus",
  ageHelp: "Les demandes sont réservées aux personnes de 16 ans et plus.",
  consentLegend: "Votre consentement, élément par élément",
  consentIntro:
    "Rien n'est coché à votre place. Le résumé contient seulement les éléments que vous cochez ici. Vous pouvez retirer votre consentement plus tard à partir de la demande.",
  consentItems: {
    prepare_summary: "Préparer un résumé de cette demande sur cet appareil",
    include_contexts: "Inscrire dans le résumé les aspects de la vie que j'ai choisis",
    include_region:
      "Inscrire ma région de l'Ontario dans le résumé et l'utiliser pour chercher un volet de programme",
    include_language: "Inscrire mon choix de langue dans le résumé",
    include_note: "Inscrire ma courte note dans le résumé",
  },
  consentRequiredMark: "(nécessaire pour préparer un résumé)",
  consentOptionalMark: "(facultatif)",
  consentRevocable:
    "Le retrait du consentement ferme la demande et retire son résumé de l'application. L'application ne peut pas reprendre une copie que vous avez déjà transmise vous-même.",
  submit: "Préparer le résumé de ma demande",
  errorTitle: "Vérifiez le formulaire",
  rejected: {
    age_out_of_scope: "Veuillez confirmer que vous avez 16 ans ou plus pour continuer.",
    invalid_for_whom: "Indiquez pour qui est cette demande.",
    no_context: "Choisissez au moins un aspect de la vie dont vous aimeriez parler.",
    too_many_contexts: "Choisissez trois aspects de la vie au plus.",
    invalid_context: "Choisissez des aspects de la vie dans la liste.",
    invalid_region: "Choisissez une région de l'Ontario dans la liste, ou « Je préfère ne pas le dire ».",
    invalid_language: "Choisissez une langue dans la liste.",
    note_too_long: "Limitez la note à {max} caractères.",
    consent_required:
      "Pour préparer un résumé, cochez les deux éléments de consentement marqués comme nécessaires. Sans eux, l'application ne prépare rien.",
  },
  nothingSaved: "Rien n'a été enregistré.",
  refusedTitle: "La note n'a pas été conservée",
  refused: {
    medical_advice:
      "La note ressemble à une question sur la santé, les traitements ou les médicaments. L'application ne peut pas en recevoir dans une demande. Retirez cette partie et réessayez. En cas d'urgence, appelez le 911.",
    personal_data:
      "La note contient un courriel, un numéro de téléphone ou une adresse web. Retirez-les et réessayez.",
    health_detail:
      "La note semble nommer un diagnostic, un niveau de blessure ou un autre détail de santé. L'application ne recueille pas ces renseignements. Retirez cette partie et réessayez. Vous pourrez dire ce que vous voulez à un programme de pairs, à votre façon, quand vous communiquerez avec lui.",
  },
  crisisSignpostOnly:
    "Ces services sont offerts par d'autres. L'application ne fait que les indiquer. Elle n'offre pas de counseling et ne communique avec personne à votre place.",
  crisisBack: "Revenir au formulaire de demande",
  resultTitle: "Le résumé de votre demande est prêt",
  resultSaved: "La demande reste sur cet appareil seulement. L'application ne l'a envoyée à personne.",
  stateLabel: "État sur cet appareil",
  states: {
    received: "Reçue",
    needs_review: "À examiner",
    routed: "Volet de programme inscrit",
    closed: "Fermée",
  },
  stateHelp: {
    received: "La demande est enregistrée sur cet appareil. Aucun programme ne l'a vue.",
    needs_review:
      "La demande est marquée comme devant être examinée par un programme de pairs. Personne n'examine les demandes dans l'application ; le résumé porte donc cette mention pour le programme à qui vous le transmettez.",
    routed:
      "Un volet de programme est inscrit pour cette demande. C'est une mention dans le résumé seulement. Aucun programme n'a vu la demande.",
    closed: "La demande est fermée. Aucun résumé ne peut en être tiré.",
  },
  tierLabel: "Niveau d'examen",
  tiers: {
    device_screen: "Vérifiée sur cet appareil seulement",
    programme_review: "Marquée pour examen par un programme de pairs",
    safeguarding: "Marquée comme préoccupation de protection",
  },
  streamLabel: "Volet de programme",
  streamUnknown: "Inconnu",
  unknownReasons: {
    no_streams_recorded: "Aucun volet de programme n'est encore inscrit dans l'application.",
    no_stream_for_context: "Aucun volet de programme n'est inscrit pour les aspects de la vie choisis.",
    no_stream_for_region: "Aucun volet de programme n'est inscrit pour cette région.",
  },
  streamSample: "Données d'exemple, pas un vrai programme",
  streamPendingReview: "Non inscrit tant que la demande est à examiner",
  summaryLabel: "Résumé à transmettre vous-même",
  summaryHelp:
    "Copiez ou téléchargez ce texte, puis transmettez-le au programme de pairs d'un organisme partenaire de la façon que ce programme demande. L'application ne connaît l'adresse d'aucun programme et n'envoie rien.",
  copy: "Copier le résumé",
  copied: "Le résumé a été copié. Rien n'a été envoyé.",
  copyFailed: "Le résumé n'a pas pu être copié. Sélectionnez le texte ci-dessus et copiez-le vous-même.",
  download: "Télécharger le résumé en fichier texte",
  downloaded: "Le résumé a été téléchargé sur cet appareil. Rien n'a été envoyé.",
  downloadFileName: "resume-demande-pair",
  withdrawConsent: "Retirer mon consentement et fermer cette demande",
  withdrawn:
    "Le consentement a été retiré. La demande est fermée et son résumé n'est plus offert dans l'application.",
  closeRequest: "Fermer cette demande",
  closed: "La demande a été fermée.",
  summaryUnavailable: "Aucun résumé n'est offert pour cette demande.",
  historyTitle: "Demandes conservées sur cet appareil",
  historyEmpty: "Aucune demande n'est conservée sur cet appareil.",
  historyItem: "Demande du {date} : {contexts}",
  historyShow: "Afficher cette demande",
  auditTitle: "Ce qui est arrivé à cette demande",
  auditEntry: "{at} : {action} ({actor}). {reason}",
  auditActions: {
    created: "Demande créée",
    flagged_for_review: "Marquée « à examiner »",
    escalated: "Signalée comme préoccupation de protection",
    review_cleared: "Examen terminé",
    routed: "Volet de programme inscrit",
    closed: "Demande fermée",
  },
  auditReasons: {
    request_created: "La demande a été enregistrée sur cet appareil.",
    on_behalf_of_another_person: "La demande a été faite pour quelqu'un d'autre.",
    review_requested: "Un examen a été demandé.",
    safeguarding_concern: "Une préoccupation de protection a été notée.",
    review_complete: "L'examen est terminé.",
    stream_recorded: "Une règle d'acheminement a donné un volet de programme.",
    consent_withdrawn: "Le consentement a été retiré.",
    withdrawn_by_person: "La personne a fermé la demande.",
    closed_after_review: "La demande a été fermée après examen.",
  },
  actors: { person: "vous", device: "cet appareil", reviewer: "une personne chargée de l'examen" },
  deleteOne: "Supprimer cette demande",
  deletedOne: "La demande a été supprimée de cet appareil.",
  deleteAll: "Tout supprimer",
  deleteAllConfirm:
    "Supprimer toutes les demandes conservées sur cet appareil, avec leur historique ? Cette action est définitive.",
  deleteAllYes: "Oui, tout supprimer",
  deleteAllNo: "Non, garder mes demandes",
  deletedAll: "Toutes les demandes ont été supprimées de cet appareil.",
  provenance: "Niveau {tier}, {label}. Source : {source}. Inscrit le {date}.",
  summary: {
    title: "Demande pour parler avec un pair : résumé",
    prepared: "Préparé sur l'appareil de la personne le {date}.",
    notSent: "L'application n'a envoyé ce résumé à personne. La personne a choisi de le transmettre.",
    forWhom: "Demande pour : {value}",
    contexts: "Aimerait parler de : {value}",
    region: "Région de l'Ontario : {value}",
    language: "Langue préférée : {value}",
    note: "Note : {value}",
    notShared: "non transmis",
    stream: "Volet de programme : {value}",
    state: "État sur l'appareil : {value}",
    age: "16 ans ou plus : confirmé par la personne",
    onBehalf:
      "Cette demande a été faite pour quelqu'un d'autre. Elle est à examiner, et l'application n'a rien demandé à cette personne.",
    notReferral:
      "Ceci n'est pas une orientation. Aucun programme n'a vu cette demande jusqu'ici, et aucune réponse ni aucun délai de réponse n'a été promis.",
    noHealth:
      "Par conception, il ne contient ni diagnostic, ni niveau de blessure, ni autre renseignement sur la santé.",
    reference: "Référence sur l'appareil : {value}",
    listSeparator: " ; ",
  },
};

const FR: ConnectStrings = mapStrings(FR_RAW, frenchTypography);

export const CONNECT_CATALOG: Record<Language, ConnectStrings> = { en: EN, fr: FR };
