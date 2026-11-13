import type { Language } from "./types.js";

export interface ProgrammeEntry {
  id: string;
  name: { en: string; fr: string };
  description: { en: string; fr: string };
  /** Public organisation home page. Deep links were not re-checked for this draft. */
  href: "https://sciontario.org/";
  unknowns: string[];
}

export const NO_REPLACEMENT = {
  en: "The App links to Spinal Cord Injury Ontario. It does not replace SCIO services. SCIO has not endorsed the App.",
  fr: "L'application renvoie vers Spinal Cord Injury Ontario. Elle ne remplace pas les services de SCIO. SCIO n'a pas approuvé l'application.",
} as const;

export const NO_ENDORSEMENT = {
  en: "No endorsement is claimed. A link is not a partnership.",
  fr: "Aucune approbation n'est revendiquée. Un lien n'est pas un partenariat.",
} as const;

/**
 * Nine programme areas from the master plan's reconciliation of the FY2025
 * audited statements and later directory wording. Attendant services are omitted
 * because their current status is unverified (plan unknown U12).
 */
export const PROGRAMMES: readonly ProgrammeEntry[] = [
  {
    id: "regional-services",
    name: { en: "Regional services and service navigation", fr: "Services régionaux et navigation dans les services" },
    description: {
      en: "SCIO's audited statements for the year ended 31 March 2025 name regional services as a programme grouping. Public material describes practical help, information, and support during adjustment to spinal cord injury. A Barrie (Central East) listing names Bruce, Grey, Haliburton, Muskoka, and Simcoe counties. Other office service areas were not verified.",
      fr: "Les états vérifiés de SCIO pour l'exercice terminé le 31 mars 2025 nomment les services régionaux comme groupe de programmes. Le matériel public décrit une aide pratique, de l'information et du soutien pendant l'adaptation à une lésion médullaire. Une fiche de Barrie (Centre-Est) nomme les comtés de Bruce, Grey, Haliburton, Muskoka et Simcoe. Les autres territoires de bureaux n'ont pas été vérifiés.",
    },
    href: "https://sciontario.org/",
    unknowns: ["U26 office addresses, hours, and service areas beyond head office and Barrie"],
  },
  {
    id: "peer-support",
    name: { en: "Peer support, including SCIO Connect", fr: "Soutien par les pairs, y compris SCIO Connect" },
    description: {
      en: "SCIO describes SCIO Connect as a peer programme that matches newly injured people and family members with mentors who have lived experience. The master plan also names SCIO-Connect for Families and Peer Connections events. Training, screening, supervision, and safeguarding policies were not verified. The App does not match mentors.",
      fr: "SCIO décrit SCIO Connect comme un programme de pairs qui jumelle les personnes nouvellement blessées et les membres de la famille avec des mentors qui ont une expérience vécue. Le plan directeur nomme aussi SCIO-Connect pour les familles et les événements Peer Connections. La formation, la sélection, la supervision et les politiques de protection n'ont pas été vérifiées. L'application ne jumelle pas de mentors.",
    },
    href: "https://sciontario.org/",
    unknowns: ["U23 training and safeguarding policies"],
  },
  {
    id: "employment",
    name: { en: "Employment services", fr: "Services d'emploi" },
    description: {
      en: "The audited statements name employment services. A 2026 job posting suggested the work was active. Geography and funder were in conflict or unverified in the November 2026 research, so this App does not state a service area or a funder and does not give employment advice.",
      fr: "Les états vérifiés nomment les services d'emploi. Une offre d'emploi de 2026 suggérait que le travail était actif. Le territoire et le bailleur étaient en conflit ou non vérifiés dans la recherche de novembre 2026. Cette application ne dit donc pas un territoire ni un bailleur et ne donne pas de conseil d'emploi.",
    },
    href: "https://sciontario.org/",
    unknowns: ["U13 geography and funder"],
  },
  {
    id: "equipment",
    name: { en: "Equipment access", fr: "Accès à l'équipement" },
    description: {
      en: "The audited statements say regional services include essential equipment and mobility aids for people who cannot afford them. Whether SCIO currently loans, donates, or funds equipment directly was not verified. The App does not recommend a device and does not promise funding.",
      fr: "Les états vérifiés disent que les services régionaux comprennent de l'équipement essentiel et des aides à la mobilité pour les personnes qui ne peuvent pas se les payer. On n'a pas vérifié si SCIO prête, donne ou finance actuellement l'équipement directement. L'application ne recommande pas un appareil et ne promet pas de financement.",
    },
    href: "https://sciontario.org/",
    unknowns: ["U14 loan, donation, or funding model"],
  },
  {
    id: "knowledge",
    name: { en: "Knowledge exchange and Cortree", fr: "Transfert de connaissances et Cortree" },
    description: {
      en: "Knowledge exchange is an audited grouping. Cortree Disability Education Centre is described as a social enterprise launched in 2019. The current catalogue and prices were not verified. The App does not copy Cortree courses.",
      fr: "Le transfert de connaissances est un groupe vérifié dans les états. Le Cortree Disability Education Centre est décrit comme une entreprise sociale lancée en 2019. Le catalogue et les prix actuels n'ont pas été vérifiés. L'application ne copie pas les cours de Cortree.",
    },
    href: "https://sciontario.org/",
    unknowns: ["U15 catalogue and pricing", "U16 resource centre hours", "U17 magazine format"],
  },
  {
    id: "research",
    name: { en: "Research and partnerships", fr: "Recherche et partenariats" },
    description: {
      en: "Research and partnerships is an audited grouping, including material that names the Ontario SCI Alliance. Detailed objectives were not verified. The App is not a research study and does not collect health data for research.",
      fr: "La recherche et les partenariats sont un groupe vérifié dans les états, y compris un matériel qui nomme l'Ontario SCI Alliance. Les objectifs détaillés n'ont pas été vérifiés. L'application n'est pas une étude et ne collecte pas de données de santé pour la recherche.",
    },
    href: "https://sciontario.org/",
    unknowns: ["U18 objectives"],
  },
  {
    id: "policy",
    name: { en: "Public policy and advocacy", fr: "Politiques publiques et défense des droits" },
    description: {
      en: "Public policy is an audited grouping. Current positions were not verified. This App does not state an SCIO policy position.",
      fr: "Les politiques publiques sont un groupe vérifié dans les états. Les positions actuelles n'ont pas été vérifiées. Cette application n'énonce pas une position de SCIO.",
    },
    href: "https://sciontario.org/",
    unknowns: ["U20 current positions"],
  },
  {
    id: "membership",
    name: { en: "Membership and community", fr: "Adhésion et communauté" },
    description: {
      en: "Membership, community, and communications are cross-cutting. They are not a separate audited programme grouping. Benefits, fees, and counts were not verified.",
      fr: "L'adhésion, la communauté et les communications sont transversales. Ce n'est pas un groupe de programme distinct dans les états vérifiés. Les avantages, les frais et les nombres n'ont pas été vérifiés.",
    },
    href: "https://sciontario.org/",
    unknowns: ["U9", "U21 membership categories, fees, and counts"],
  },
  {
    id: "events",
    name: { en: "Events", fr: "Événements" },
    description: {
      en: "SCIO publishes peer and community events, including Peer Connections. A current calendar was not verified for this draft. Demonstration listings in the App are not real events and are not SCIO's calendar. Registration stays on SCIO's own site.",
      fr: "SCIO publie des événements de pairs et communautaires, y compris Peer Connections. Un calendrier actuel n'a pas été vérifié pour cette ébauche. Les fiches de démonstration dans l'application ne sont pas de vrais événements et ne sont pas le calendrier de SCIO. L'inscription reste sur le site de SCIO.",
    },
    href: "https://sciontario.org/",
    unknowns: ["U22 current sponsors, revenue, and calendar"],
  },
];

export const ATTENDANT_SERVICES_NOTE = {
  en: "Attendant services appeared in older directories. They are not in the FY2025 audited programme list or the February 2026 short directory, as summarised in the master plan. Status unverified (U12). Not listed as a current programme.",
  fr: "Des services de préposés apparaissaient dans d'anciens répertoires. Ils ne sont pas dans la liste des programmes des états vérifiés de 2025 ni dans le court répertoire de février 2026, selon le résumé du plan directeur. Statut non vérifié (U12). Pas listés comme programme actuel.",
} as const;

export interface ExplainerSection {
  id: "staffing" | "safety" | "reporting" | "accessibility" | "agreement";
  title: { en: string; fr: string };
  body: { en: string; fr: string };
  notRunning: true;
}

export const MODERATION_EXPLAINER: readonly ExplainerSection[] = [
  {
    id: "staffing",
    title: { en: "Moderation staffing", fr: "Personnel de modération" },
    body: {
      en: "A live community needs trained people, a published review time, and French-speaking reviewers for French tips. The proposed time in the plan is one working day. Nobody is rostered here.",
      fr: "Une communauté en service a besoin de personnes formées, d'un délai de revue publié et de réviseurs francophones pour les conseils en français. Le délai proposé dans le plan est d'un jour ouvrable. Personne n'est inscrit ici.",
    },
    notRunning: true,
  },
  {
    id: "safety",
    title: { en: "Community safety rules", fr: "Règles de sécurité communautaire" },
    body: {
      en: "Tips may describe a place. They may not give health advice, transfer instruction, equipment recommendations, or benefits decisions. There is no mentor matching and no private messaging. Crisis text is not stored.",
      fr: "Les conseils peuvent décrire un lieu. Ils ne peuvent pas donner d'avis de santé, d'instruction de transfert, de recommandation d'équipement ou de décision de prestation. Il n'y a pas de jumelage de mentors ni de messages privés. Un texte de crise n'est pas enregistré.",
    },
    notRunning: true,
  },
  {
    id: "reporting",
    title: { en: "Reporting and response", fr: "Signalement et réponse" },
    body: {
      en: "People need a way to report advice, errors, abuse, privacy problems, and safeguarding concerns, in the App and by phone and email once a service is staffed. A person reads safety reports. Software only sorts them. The reported person does not see who reported them.",
      fr: "Les personnes ont besoin d'un moyen de signaler un avis, une erreur, un abus, un problème de vie privée et une préoccupation de protection, dans l'application et par téléphone et courriel quand un service est doté. Une personne lit les signalements de sécurité. Le logiciel ne fait que les trier. La personne visée ne voit pas qui a signalé.",
    },
    notRunning: true,
  },
  {
    id: "accessibility",
    title: { en: "Accessibility of community content", fr: "Accessibilité du contenu communautaire" },
    body: {
      en: "Reporting, posting for review, and appeals have to work by keyboard, screen reader, switch, and voice, with large targets, in English and French. Decisions need a plain-language reason and an appeal.",
      fr: "Le signalement, l'envoi pour revue et les appels doivent fonctionner au clavier, au lecteur d'écran, au contacteur et à la voix, avec de grandes cibles, en français et en anglais. Les décisions ont besoin d'un motif en langage clair et d'un appel.",
    },
    notRunning: true,
  },
  {
    id: "agreement",
    title: { en: "Agreement required before a live community", fr: "Entente requise avant une communauté en service" },
    body: {
      en: "If Spinal Cord Injury Ontario governed peer features, that would need an explicit written agreement covering screening, training, supervision, boundaries, privacy, and liability. No agreement exists. If SCIO does not govern it, an independent safeguarding lead is required before any public launch. Neither is in place.",
      fr: "Si Spinal Cord Injury Ontario gouvernait les fonctions de pairs, il faudrait une entente écrite explicite sur la sélection, la formation, la supervision, les limites, la vie privée et la responsabilité. Aucune entente n'existe. Si SCIO ne gouverne pas ces fonctions, une personne responsable de la protection, indépendante, est requise avant tout lancement public. Ni l'un ni l'autre n'est en place.",
    },
    notRunning: true,
  },
];

export const NOT_RUNNING = {
  en: "This is not running in the prototype.",
  fr: "Ceci ne fonctionne pas dans le prototype.",
} as const;

export type SkeletonActionKind = "link_out";

export interface SkeletonScreen {
  id: "directory" | "events" | "moderation";
  path: string;
  actions: Array<{ kind: SkeletonActionKind; href: string }>;
}

/** Day 16 surface. Actions are link-outs only. There is no post, comment, message, or register action. */
export const PROTOTYPE_SKELETON: readonly SkeletonScreen[] = [
  { id: "directory", path: "/community", actions: [{ kind: "link_out", href: "https://sciontario.org/" }] },
  { id: "events", path: "/community/events", actions: [{ kind: "link_out", href: "https://sciontario.org/" }] },
  { id: "moderation", path: "/community/safety", actions: [] },
];

export function programmeText(language: Language): string {
  return PROGRAMMES.map((entry) => `${entry.name[language]}\n${entry.description[language]}`).join("\n");
}
