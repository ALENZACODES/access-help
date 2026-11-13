import type { Language } from "./types.js";

export interface ProgrammeLink {
  href: { en: string; fr: string };
  label: { en: string; fr: string };
  /** Language of the page opened from each interface language. */
  pageLanguage: { en: "en"; fr: "fr" };
  retrieved: "2026-11-13";
  homepageFallback: false;
  limit: { en: string; fr: string };
}

export interface ProgrammeEntry {
  id: string;
  name: { en: string; fr: string };
  description: { en: string; fr: string };
  links: readonly ProgrammeLink[];
  unknowns: string[];
}

const CHECKED = "2026-11-13" as const;

function bilingual(
  enHref: string,
  frHref: string,
  enLabel: string,
  frLabel: string,
  enLimit: string,
  frLimit: string,
): ProgrammeLink {
  return {
    href: { en: enHref, fr: frHref },
    label: { en: enLabel, fr: frLabel },
    pageLanguage: { en: "en", fr: "fr" },
    retrieved: CHECKED,
    homepageFallback: false,
    limit: { en: enLimit, fr: frLimit },
  };
}

export const NO_REPLACEMENT = {
  en: "The App links to Spinal Cord Injury Ontario. It does not replace SCIO services. SCIO has not endorsed the App.",
  fr: "L'application renvoie vers Lésions Médullaires Ontario. Elle ne remplace pas les services de Lésions Médullaires Ontario. Lésions Médullaires Ontario n'a pas approuvé l'application.",
} as const;

export const NO_ENDORSEMENT = {
  en: "No endorsement is claimed. A link is not a partnership.",
  fr: "Aucune approbation n'est revendiquée. Un lien n'est pas un partenariat.",
} as const;

/**
 * Programme areas from the master plan's reconciliation of the FY2025
 * audited statements and later directory wording. Attendant services are omitted
 * because their current status is unverified (plan unknown U12).
 */
export const PROGRAMMES: readonly ProgrammeEntry[] = [
  {
    id: "regional-services",
    name: { en: "Regional services and service navigation", fr: "Services régionaux et navigation dans les services" },
    description: {
      en: "SCIO's audited statements for the year ended 31 March 2025 name regional services as a programme grouping. Public material describes practical help, information, and support during adjustment to spinal cord injury. A Barrie (Central East) listing names Bruce, Grey, Haliburton, Muskoka, and Simcoe counties. Other office service areas were not verified. On 13 November 2026 the service-navigation page and the regional office locations page were open. Addresses on the offices page were not copied here.",
      fr: "Les états vérifiés de Lésions Médullaires Ontario pour l'exercice terminé le 31 mars 2025 nomment les services régionaux comme groupe de programmes. Le matériel public décrit une aide pratique, de l'information et du soutien pendant l'adaptation à une lésion médullaire. Une fiche de Barrie (Centre-Est) nomme les comtés de Bruce, Grey, Haliburton, Muskoka et Simcoe. Les autres territoires de bureaux n'ont pas été vérifiés. Le 13 novembre 2026, la page de navigation des services et la page des bureaux régionaux étaient ouvertes. Les adresses de la page des bureaux n'ont pas été copiées ici.",
    },
    links: [
      bilingual(
        "https://www.sciontario.org/services/service-navigation/",
        "https://www.sciontario.org/fr/services/navigation-de-services/",
        "SCIO service navigation page (checked 13 November 2026)",
        "Page Navigation de services de Lésions Médullaires Ontario (vérifiée le 13 novembre 2026)",
        "The English page title is Service Navigation. It does not say which office serves your address.",
        "Le titre français est Navigation de services. La page ne dit pas quel bureau dessert votre adresse.",
      ),
      bilingual(
        "https://www.sciontario.org/contact-us/regions/",
        "https://www.sciontario.org/fr/contactez-nous/regions/",
        "SCIO regional office locations (checked 13 November 2026)",
        "Emplacements des bureaux régionaux de Lésions Médullaires Ontario (vérifiés le 13 novembre 2026)",
        "The page lists office addresses as published that day. Which office serves a given address was not established. The addresses were not copied here.",
        "La page liste des adresses telles que publiées ce jour-là. Quel bureau dessert une adresse donnée n'a pas été établi. Les adresses n'ont pas été copiées ici.",
      ),
    ],
    unknowns: ["U26 which office serves a given address, and hours"],
  },
  {
    id: "peer-support",
    name: { en: "Peer support, including SCIO Connect", fr: "Soutien par les pairs, y compris SCIO Connect" },
    description: {
      en: "SCIO describes SCIO Connect as a peer programme that matches newly injured people and family members with mentors who have lived experience. The master plan also names SCIO-Connect for Families and Peer Connections events. Training, screening, supervision, and safeguarding policies were not verified. The App does not match mentors. The peer-support page checked on 13 November 2026 describes peer mentors. A heading titled SCIO Connect was not confirmed on that page.",
      fr: "Lésions Médullaires Ontario décrit SCIO Connect comme un programme de pairs qui jumelle les personnes nouvellement blessées et les membres de la famille avec des mentors qui ont une expérience vécue. Le plan directeur nomme aussi SCIO-Connect pour les familles et les événements Peer Connections. La formation, la sélection, la supervision et les politiques de protection n'ont pas été vérifiées. L'application ne jumelle pas de mentors. La page de soutien par les pairs vérifiée le 13 novembre 2026 décrit des mentors pairs. Un titre SCIO Connect n'a pas été confirmé sur cette page.",
    },
    links: [
      bilingual(
        "https://www.sciontario.org/services/peer-support/",
        "https://www.sciontario.org/fr/services/soutien-par-les-pairs/",
        "SCIO peer support page (checked 13 November 2026)",
        "Page Soutien par les pairs de Lésions Médullaires Ontario (vérifiée le 13 novembre 2026)",
        "The English page describes peer support and becoming a peer mentor. It does not state how many mentors are available or whether a match is open. The French page is /fr/services/soutien-par-les-pairs/.",
        "La page française décrit le soutien par les pairs. Elle ne dit pas combien de mentors sont disponibles ni si un jumelage est ouvert. L'adresse utilisée est /fr/services/soutien-par-les-pairs/.",
      ),
    ],
    unknowns: ["U23 training and safeguarding policies"],
  },
  {
    id: "employment",
    name: { en: "Employment services", fr: "Services d'emploi" },
    description: {
      en: "The audited statements name employment services. A 2026 job posting suggested the work was active. Geography and funder were in conflict or unverified in the November 2026 research, so this App does not state a service area or a funder and does not give employment advice.",
      fr: "Les états vérifiés nomment les services d'emploi. Une offre d'emploi de 2026 suggérait que le travail était actif. Le territoire et le bailleur étaient en conflit ou non vérifiés dans la recherche de novembre 2026. Cette application ne dit donc pas un territoire ni un bailleur et ne donne pas de conseil d'emploi.",
    },
    links: [
      bilingual(
        "https://www.sciontario.org/services/employment-services/",
        "https://www.sciontario.org/fr/services/services-de-lemploi/",
        "SCIO employment services page (checked 13 November 2026)",
        "Page Services de l'emploi de Lésions Médullaires Ontario (vérifiée le 13 novembre 2026)",
        "The English page title is Employment Services. Eligibility rules and a current job list were not copied.",
        "Le titre français est Services de l'emploi. Les règles d'admission et une liste d'emplois actuelle n'ont pas été copiées.",
      ),
    ],
    unknowns: ["U13 geography and funder"],
  },
  {
    id: "equipment",
    name: { en: "Equipment access", fr: "Accès à l'équipement" },
    description: {
      en: "The audited statements say regional services include essential equipment and mobility aids for people who cannot afford them. Whether SCIO currently loans, donates, or funds equipment directly was not verified. The App does not recommend a device and does not promise funding.",
      fr: "Les états vérifiés disent que les services régionaux comprennent de l'équipement essentiel et des aides à la mobilité pour les personnes qui ne peuvent pas se les payer. On n'a pas vérifié si Lésions Médullaires Ontario prête, donne ou finance actuellement l'équipement directement. L'application ne recommande pas un appareil et ne promet pas de financement.",
    },
    links: [
      bilingual(
        "https://www.sciontario.org/services/equipment/",
        "https://www.sciontario.org/fr/services/acces-a-lequipement/",
        "SCIO accessing equipment page (checked 13 November 2026)",
        "Page Accès à l'équipement de Lésions Médullaires Ontario (vérifiée le 13 novembre 2026)",
        "The English page title is Accessing Equipment. Prices and stock were not copied. The French page used is /fr/services/acces-a-lequipement/. A different address, /fr/services/equipment/, redirected to a ski-day page on 13 November 2026 and is not used.",
        "Le titre français est Accès à l'équipement. Les prix et les stocks n'ont pas été copiés. L'adresse utilisée est /fr/services/acces-a-lequipement/. Une autre adresse, /fr/services/equipment/, renvoyait vers une page de journée de ski le 13 novembre 2026 et n'est pas utilisée.",
      ),
    ],
    unknowns: ["U14 loan, donation, or funding model"],
  },
  {
    id: "knowledge",
    name: { en: "Knowledge exchange and Cortree", fr: "Transfert de connaissances et Cortree" },
    description: {
      en: "Knowledge exchange is an audited grouping. Cortree Disability Education Centre is described as a social enterprise launched in 2019. The current catalogue and prices were not verified. The App does not copy Cortree courses. No separate page for the grouping 'knowledge exchange' was found on 13 November 2026. The link is Cortree, the learning site named in SCIO's navigation.",
      fr: "Le transfert de connaissances est un groupe vérifié dans les états. Le Cortree Disability Education Centre est décrit comme une entreprise sociale lancée en 2019. Le catalogue et les prix actuels n'ont pas été vérifiés. L'application ne copie pas les cours de Cortree. Aucune page distincte pour le groupe « transfert de connaissances » n'a été trouvée le 13 novembre 2026. Le lien est Cortree, le site d'apprentissage nommé dans la navigation de Lésions Médullaires Ontario.",
    },
    links: [
      bilingual(
        "https://cortree.sciontario.org/",
        "https://cortree.sciontario.org/fr/",
        "Cortree by SCIO (checked 13 November 2026)",
        "Cortree par Lésions Médullaires Ontario (vérifié le 13 novembre 2026)",
        "The English page says Cortree is by SCIO. It is not a copy of the course catalogue, and it is not a separate knowledge-exchange programme page.",
        "La page française a pour titre Cortree, éducation en ligne sur le handicap. Ce n'est pas une copie du catalogue de cours, et ce n'est pas une page distincte du programme de transfert de connaissances.",
      ),
    ],
    unknowns: ["U15 catalogue and pricing", "U16 resource centre hours", "U17 magazine format"],
  },
  {
    id: "research",
    name: { en: "Research and partnerships", fr: "Recherche et partenariats" },
    description: {
      en: "Research and partnerships is an audited grouping, including material that names the Ontario SCI Alliance. Detailed objectives were not verified. The App is not a research study and does not collect health data for research.",
      fr: "La recherche et les partenariats sont un groupe vérifié dans les états, y compris un matériel qui nomme l'Ontario SCI Alliance. Les objectifs détaillés n'ont pas été vérifiés. L'application n'est pas une étude et ne collecte pas de données de santé pour la recherche.",
    },
    links: [
      bilingual(
        "https://www.sciontario.org/research/",
        "https://www.sciontario.org/fr/recherche/",
        "SCIO research page (checked 13 November 2026)",
        "Page Recherche de Lésions Médullaires Ontario (vérifiée le 13 novembre 2026)",
        "The English page title is Research. Current studies, ethics review, and whether the public can join were not copied.",
        "Le titre français est Recherche. Les études en cours, l'examen éthique et la possibilité pour le public de participer n'ont pas été copiés.",
      ),
    ],
    unknowns: ["U18 objectives"],
  },
  {
    id: "policy",
    name: { en: "Public policy and advocacy", fr: "Politiques publiques et défense des droits" },
    description: {
      en: "Public policy is an audited grouping. Current positions were not verified. This App does not state an SCIO policy position.",
      fr: "Les politiques publiques sont un groupe vérifié dans les états. Les positions actuelles n'ont pas été vérifiées. Cette application n'énonce pas une position de Lésions Médullaires Ontario.",
    },
    links: [
      bilingual(
        "https://www.sciontario.org/our-initiatives/",
        "https://www.sciontario.org/fr/nos-initiatives/",
        "SCIO advocacy initiatives page (checked 13 November 2026)",
        "Page Nos initiatives de Lésions Médullaires Ontario (vérifiée le 13 novembre 2026)",
        "The English page describes advocacy initiatives, including accessible housing, pressure injury management, mobility devices, and medical supplies. It is not a list of current policy positions. The address /our-initiatives/advocacy-committee/ redirected here on 13 November 2026.",
        "Le titre français est Plaidoyer — Nos initiatives. Ce n'est pas une liste de positions actuelles. L'adresse anglaise /our-initiatives/advocacy-committee/ renvoyait vers /our-initiatives/ le 13 novembre 2026.",
      ),
    ],
    unknowns: ["U20 current positions"],
  },
  {
    id: "events",
    name: { en: "Events", fr: "Événements" },
    description: {
      en: "SCIO publishes peer and community events, including Peer Connections. The English and French events category pages were open on 13 November 2026. Their listings were not copied into the App. Demonstration listings in the App are not those events and are not a registration.",
      fr: "Lésions Médullaires Ontario publie des événements de pairs et communautaires, y compris Peer Connections. Les pages de catégorie d'événements en anglais et en français étaient ouvertes le 13 novembre 2026. Leurs fiches n'ont pas été copiées dans l'application. Les fiches de démonstration dans l'application ne sont pas ces événements et ne sont pas une inscription.",
    },
    links: [
      bilingual(
        "https://www.sciontario.org/category/events/",
        "https://www.sciontario.org/fr/category/evenements/",
        "SCIO events list (checked 13 November 2026)",
        "Liste des événements de Lésions Médullaires Ontario (vérifiée le 13 novembre 2026)",
        "This is the English events category. Listings change. The three demonstration events in the App are not these listings.",
        "C'est la page française des événements. Les fiches changent. Les trois événements de démonstration dans l'application ne sont pas ces fiches. Ce n'est pas un formulaire d'inscription.",
      ),
    ],
    unknowns: ["U22 current sponsors and revenue. Listings on the events pages were not copied"],
  },
];

/**
 * A link to the organisation's own contact page, checked 13 November 2026.
 * The directory does not turn that page into phone, email, or referral actions.
 */
export const ORGANISATION_CONTACT = {
  retrieved: CHECKED,
  pageUrl: {
    en: "https://www.sciontario.org/contact-us/",
    fr: "https://www.sciontario.org/fr/contactez-nous/",
  },
  pageLanguage: { en: "en", fr: "fr" },
  label: {
    en: "Spinal Cord Injury Ontario contact page (checked 13 November 2026)",
    fr: "Page Contactez-nous de Lésions Médullaires Ontario (vérifiée le 13 novembre 2026)",
  },
  limit: {
    en: "The App is independent. It is not operated by, and it is not affiliated with, any organisation listed here. This link opens that organisation's own contact page. It is not a way to contact the App or to complain about the App.",
    fr: "L'application est indépendante. Elle n'est pas exploitée par une organisation listée ici, et elle n'est pas affiliée à une organisation listée ici. Ce lien ouvre la page de contact de cette organisation. Il ne sert pas à joindre l'application ni à s'en plaindre.",
  },
} as const;

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
  { id: "directory", path: "/community", actions: [{ kind: "link_out", href: ORGANISATION_CONTACT.pageUrl.en }] },
  { id: "events", path: "/community/events", actions: [{ kind: "link_out", href: "https://www.sciontario.org/category/events/" }] },
  { id: "moderation", path: "/community/safety", actions: [] },
];

export function programmeText(language: Language): string {
  return PROGRAMMES.map((entry) => `${entry.name[language]}\n${entry.description[language]}`).join("\n");
}

/** Empty when every programme row has a distinct bilingual link and no homepage fallback. */
export function programmeLinkDefects(): string[] {
  const defects: string[] = [];
  if (PROGRAMMES.length !== 8) {
    defects.push("expected 8 programmes");
  }
  if (PROGRAMMES.some((entry) => entry.id === "membership")) {
    defects.push("membership is not a directory row");
  }
  const labels = PROGRAMMES.flatMap((entry) => entry.links.map((link) => link.label.en));
  if (new Set(labels).size !== labels.length) {
    defects.push("English link labels are not distinct");
  }
  const french = PROGRAMMES.flatMap((entry) => entry.links.map((link) => link.label.fr));
  if (new Set(french).size !== french.length) {
    defects.push("French link labels are not distinct");
  }
  for (const entry of PROGRAMMES) {
    if (entry.links.length === 0) {
      defects.push(`${entry.id} has no link`);
    }
    for (const link of entry.links) {
      if (link.homepageFallback) {
        defects.push(`${entry.id} still uses a homepage fallback`);
      }
      if (!link.href.fr.includes("/fr")) {
        defects.push(`${entry.id} French address was not checked as a French page`);
      }
      if (link.pageLanguage.fr !== "fr" || link.pageLanguage.en !== "en") {
        defects.push(`${entry.id} page language does not match the interface`);
      }
      if (link.label.fr.includes("en anglais") || !link.label.fr.includes("Lésions Médullaires Ontario")) {
        defects.push(`${entry.id} French link text is not the organisation's French name`);
      }
      if (link.label.en === link.label.fr) {
        defects.push(`${entry.id} link label is the same in both languages`);
      }
    }
  }
  return defects;
}
