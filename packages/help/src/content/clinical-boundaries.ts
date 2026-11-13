import type { BoundaryTable, Language } from "../types.js";

const NO_CHANGE = {
  en: "The default is no change.",
  fr: "Le défaut est de ne rien changer.",
} as const;

function row(
  domain: { en: string; fr: string },
  does: { en: string; fr: string },
  doesNot: { en: string; fr: string },
  governance: { en: string; fr: string },
): Record<Language, { domain: string; does: string; doesNot: string; governance: string }> {
  return {
    en: {
      domain: domain.en,
      does: does.en,
      doesNot: doesNot.en,
      governance: `${governance.en} ${NO_CHANGE.en}`,
    },
    fr: {
      domain: domain.fr,
      does: does.fr,
      doesNot: doesNot.fr,
      governance: `${governance.fr} ${NO_CHANGE.fr}`,
    },
  };
}

const ROWS = [
  row(
    { en: "Secondary conditions", fr: "Conditions secondaires" },
    {
      en: "The App may show environmental information, such as a washroom, a rest space, shade, or a heat or cold warning, when the wording is sourced and dated. It may link to Health811. General information is marked as not personal advice.",
      fr: "L'application peut montrer une information sur le milieu, comme une toilette, un lieu de repos, de l'ombre ou un avertissement de chaleur ou de froid, quand le texte a une source et une date. Elle peut renvoyer vers Health811. L'information générale est marquée comme n'étant pas un conseil personnel.",
    },
    {
      en: "The App does not diagnose, triage, monitor, remind, or advise on a secondary condition. It does not offer a pressure-relief schedule, a skin-check reminder, wound advice, catheter advice, fluid advice, or advice about pain, spasms, bladder, or bowel.",
      fr: "L'application ne diagnostique pas, ne trie pas, ne surveille pas, ne rappelle pas et ne conseille pas au sujet d'une condition secondaire. Elle n'offre pas d'horaire de soulagement de pression, de rappel de vérification de la peau, de conseil sur une plaie, une sonde, les liquides, la douleur, les spasmes, la vessie ou l'intestin.",
    },
    {
      en: "Changing this needs clinical governance, legal review, a decision about which privacy law applies, and an agreement with any organisation that adopts or runs the App. It also needs a design, evaluation, and liability review for a health feature. None of that is recorded.",
      fr: "Changer ceci exige une gouvernance clinique, une revue juridique, une décision sur la loi de la vie privée qui s'applique, et une entente avec toute organisation qui adopte ou exploite l'application. Il faut aussi une revue de conception, d'évaluation et de responsabilité pour une fonction de santé. Rien de cela n'est consigné.",
    },
  ),
  row(
    { en: "Autonomic dysreflexia", fr: "Dysréflexie autonome" },
    {
      en: "Call 911 stays available, including offline, in English and French. General information is in Get help now and is marked as not personal advice. If you are in doubt, call 911.",
      fr: "Le 911 reste disponible, y compris hors ligne, en français et en anglais. L'information générale est dans Obtenir de l'aide maintenant et elle est marquée comme n'étant pas un conseil personnel. Si vous avez un doute, composez le 911.",
    },
    {
      en: "The App does not check symptoms, read a blood pressure, or give personal advice. It does not use a trigger list that would delay a call to 911.",
      fr: "L'application ne vérifie pas les symptômes, ne lit pas une tension et ne donne pas de conseil personnel. Elle n'utilise pas une liste de déclencheurs qui retarderait un appel au 911.",
    },
    {
      en: "Changing this needs clinical governance and legal review. The emergency-first framing stays. A checker or a triage feature is not added.",
      fr: "Changer ceci exige une gouvernance clinique et une revue juridique. Le cadre qui met l'urgence en premier reste. Un vérificateur ou une fonction de tri n'est pas ajouté.",
    },
  ),
  row(
    { en: "Transfers", fr: "Transferts" },
    {
      en: "Other parts of the App may record a measurement, such as a height, a clear space, which side a grab bar is on, or whether a lift is present, with the method, the date, and who checked it.",
      fr: "D'autres parties de l'application peuvent consigner une mesure, comme une hauteur, un espace libre, le côté d'une barre d'appui, ou la présence d'un lève-personne, avec la méthode, la date et qui a vérifié.",
    },
    {
      en: "The App does not teach a transfer or recommend a method, a device, or an amount of help.",
      fr: "L'application n'enseigne pas un transfert et ne recommande pas une méthode, un appareil ou une quantité d'aide.",
    },
    {
      en: "Changing this needs clinical governance and legal review.",
      fr: "Changer ceci exige une gouvernance clinique et une revue juridique.",
    },
  ),
  row(
    { en: "Equipment", fr: "Équipement" },
    {
      en: "The App may list a vendor or a programme and link to that organisation's own page. A funding rule is stated only in general, with a source and a date. A repair, supply, or rental note needs a source and a date.",
      fr: "L'application peut lister un fournisseur ou un programme et renvoyer vers la page de cette organisation. Une règle de financement n'est dite qu'en général, avec une source et une date. Une note de réparation, de fourniture ou de location a besoin d'une source et d'une date.",
    },
    {
      en: "The App does not recommend a device, a cushion, a seating system, a catheter, or a supply. It does not assess what a person needs. It does not promise funding. It does not name Spinal Cord Injury Ontario, or any other organisation, as an Assistive Devices Program authorizer or vendor. That role was not verified.",
      fr: "L'application ne recommande pas un appareil, un coussin, un système d'assise, une sonde ou une fourniture. Elle n'évalue pas ce dont une personne a besoin. Elle ne promet pas de financement. Elle ne nomme pas Lésions Médullaires Ontario, ni une autre organisation, comme autorisateur ou vendeur du Assistive Devices Program. Ce rôle n'a pas été vérifié.",
    },
    {
      en: "Changing this needs clinical governance, a check of any authorizer or vendor role on an official page, and legal review.",
      fr: "Changer ceci exige une gouvernance clinique, une vérification de tout rôle d'autorisateur ou de vendeur sur une page officielle, et une revue juridique.",
    },
  ),
  row(
    { en: "Benefits and funding", fr: "Prestations et financement" },
    {
      en: "The App may list a programme and link to that programme's own way to apply. It may say what the programme is, who runs it, where to apply, and which documents are usually asked for, with a source.",
      fr: "L'application peut lister un programme et renvoyer vers la façon propre de ce programme de présenter une demande. Elle peut dire ce qu'est le programme, qui le gère, où présenter une demande, et quels documents sont habituellement demandés, avec une source.",
    },
    {
      en: "The App does not decide eligibility, calculate an amount, advise on an appeal, or present itself as a benefits advisor.",
      fr: "L'application ne décide pas de l'admissibilité, ne calcule pas un montant, ne conseille pas sur un appel et ne se présente pas comme une conseillère en prestations.",
    },
    {
      en: "Changing this needs legal review and an agreement with the authority that runs the programme.",
      fr: "Changer ceci exige une revue juridique et une entente avec l'autorité qui gère le programme.",
    },
  ),
  row(
    { en: "Employment", fr: "Emploi" },
    {
      en: "The App may give general information about accessible workplaces, disclosure, and accommodation, and link to a source. Accommodation is individual. The person controls what they disclose.",
      fr: "L'application peut donner une information générale sur les milieux de travail accessibles, la divulgation et l'adaptation, et renvoyer vers une source. L'adaptation est individuelle. La personne contrôle ce qu'elle divulgue.",
    },
    {
      en: "The App does not present itself as an employment service, a job board, or a benefits advisor. It does not give legal advice about accommodation, disclosure, or dismissal. It does not send a person's data to an employer.",
      fr: "L'application ne se présente pas comme un service d'emploi, un tableau d'offres ou une conseillère en prestations. Elle ne donne pas d'avis juridique sur l'adaptation, la divulgation ou le congédiement. Elle n'envoie pas les données d'une personne à un employeur.",
    },
    {
      en: "Changing this needs authority from an employment programme and legal review.",
      fr: "Changer ceci exige l'autorité d'un programme d'emploi et une revue juridique.",
    },
  ),
  row(
    { en: "Driving and licensing", fr: "Conduite et permis" },
    {
      en: "The App may give general information and link to an official page about driver rehabilitation or licensing.",
      fr: "L'application peut donner une information générale et renvoyer vers une page officielle sur la réadaptation à la conduite ou le permis.",
    },
    {
      en: "The App does not advise a person on a licence, a driving assessment, or whether a vehicle change suits them.",
      fr: "L'application ne conseille pas une personne sur un permis, une évaluation de conduite, ou si un changement de véhicule lui convient.",
    },
    {
      en: "Changing this needs clinical review, a driver-rehabilitation review, and legal review.",
      fr: "Changer ceci exige une révision clinique, une revue de réadaptation à la conduite et une revue juridique.",
    },
  ),
  row(
    { en: "Mental health and crisis", fr: "Santé mentale et crise" },
    {
      en: "The App points to 9-8-8, ConnexOntario, and Health811. The numbers were checked on a named date.",
      fr: "L'application indique le 9-8-8, ConnexOntario et Health811. Les numéros ont été vérifiés à une date nommée.",
    },
    {
      en: "The App does not counsel, score risk, write a safety plan, or give mental-health advice.",
      fr: "L'application ne fait pas de counseling, ne donne pas de score de risque, n'écrit pas de plan de sécurité et ne donne pas de conseil en santé mentale.",
    },
    {
      en: "Changing this needs clinical governance and an agreement with a crisis service.",
      fr: "Changer ceci exige une gouvernance clinique et une entente avec un service de crise.",
    },
  ),
  row(
    { en: "Research", fr: "Recherche" },
    {
      en: "The App may link to a study's own page, including the eligibility and the contact details that study publishes.",
      fr: "L'application peut renvoyer vers la page propre d'une étude, y compris l'admissibilité et les coordonnées que cette étude publie.",
    },
    {
      en: "The App does not collect health data for research. It is not a research study. It does not imply that a research partner has approved the App.",
      fr: "L'application ne collecte pas de données de santé pour la recherche. Elle n'est pas une étude. Elle ne laisse pas entendre qu'un partenaire de recherche a approuvé l'application.",
    },
    {
      en: "Changing this needs a research-ethics review, a privacy review, and an agreement with any organisation that adopts or runs the App.",
      fr: "Changer ceci exige une revue d'éthique de la recherche, une revue de la vie privée, et une entente avec toute organisation qui adopte ou exploite l'application.",
    },
  ),
  row(
    { en: "Law", fr: "Droit" },
    {
      en: "The App may describe a fact or a measurement and link to an official policy or a complaint route.",
      fr: "L'application peut décrire un fait ou une mesure et renvoyer vers une politique officielle ou une voie de plainte.",
    },
    {
      en: "The App does not label a place as meeting the Accessibility for Ontarians with Disabilities Act or the Human Rights Code. It does not give legal advice. It does not turn a count of records into a compliance finding.",
      fr: "L'application n'étiquette pas un lieu comme respectant la Loi sur l'accessibilité pour les personnes handicapées de l'Ontario ou le Code des droits de la personne. Elle ne donne pas d'avis juridique. Elle ne transforme pas un compte de fiches en conclusion de conformité.",
    },
    {
      en: "Changing this needs legal review.",
      fr: "Changer ceci exige une revue juridique.",
    },
  ),
];

export const CLINICAL_BOUNDARY_TABLE: Record<Language, BoundaryTable> = {
  en: {
    caption: "Clinical boundaries. General information, not personal advice. Clinical review is still outstanding.",
    columns: {
      domain: "Domain",
      does: "What the App does",
      doesNot: "What the App does not do",
      governance: "Governance to change this",
    },
    rows: ROWS.map((item) => item.en),
  },
  fr: {
    caption: "Limites cliniques. Information générale, pas un conseil personnel. La révision clinique n'est pas encore faite.",
    columns: {
      domain: "Domaine",
      does: "Ce que l'application fait",
      doesNot: "Ce que l'application ne fait pas",
      governance: "Gouvernance pour changer ceci",
    },
    rows: ROWS.map((item) => item.fr),
  },
};
