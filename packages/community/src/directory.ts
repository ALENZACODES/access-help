import type { Language } from "./types.js";

export interface ProgrammeLink {
  href: string;
  label: { en: string; fr: string };
  retrieved: "2026-11-13";
  pageLanguage: "en" | "fr";
  /** True only when no programme page was confirmed and the organisation homepage is used. */
  homepageFallback: boolean;
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
      en: "SCIO's audited statements for the year ended 31 March 2025 name regional services as a programme grouping. Public material describes practical help, information, and support during adjustment to spinal cord injury. A Barrie (Central East) listing names Bruce, Grey, Haliburton, Muskoka, and Simcoe counties. Other office service areas were not verified. On 13 November 2026 the service-navigation page and the regional office locations page were open. Addresses on the offices page were not copied here.",
      fr: "Les états vérifiés de SCIO pour l'exercice terminé le 31 mars 2025 nomment les services régionaux comme groupe de programmes. Le matériel public décrit une aide pratique, de l'information et du soutien pendant l'adaptation à une lésion médullaire. Une fiche de Barrie (Centre-Est) nomme les comtés de Bruce, Grey, Haliburton, Muskoka et Simcoe. Les autres territoires de bureaux n'ont pas été vérifiés. Le 13 novembre 2026, la page de navigation des services et la page des bureaux régionaux étaient ouvertes. Les adresses de la page des bureaux n'ont pas été copiées ici.",
    },
    links: [
      {
        href: "https://www.sciontario.org/services/service-navigation/",
        label: {
          en: "SCIO service navigation page (English, checked 13 November 2026)",
          fr: "Page de navigation des services de SCIO (en anglais, vérifiée le 13 novembre 2026)",
        },
        retrieved: CHECKED,
        pageLanguage: "en",
        homepageFallback: false,
        limit: {
          en: "The page title is Service Navigation. It does not say which office serves your address.",
          fr: "Le titre de la page est Service Navigation. Elle ne dit pas quel bureau dessert votre adresse.",
        },
      },
      {
        href: "https://www.sciontario.org/contact-us/regions/",
        label: {
          en: "SCIO regional office locations (English, checked 13 November 2026)",
          fr: "Adresses des bureaux régionaux de SCIO (en anglais, vérifiées le 13 novembre 2026)",
        },
        retrieved: CHECKED,
        pageLanguage: "en",
        homepageFallback: false,
        limit: {
          en: "The page lists office addresses and phone numbers as published that day. Which office serves a given address was not established.",
          fr: "La page liste des adresses et des numéros tels que publiés ce jour-là. Quel bureau dessert une adresse donnée n'a pas été établi.",
        },
      },
    ],
    unknowns: ["U26 which office serves a given address, and hours"],
  },
  {
    id: "peer-support",
    name: { en: "Peer support, including SCIO Connect", fr: "Soutien par les pairs, y compris SCIO Connect" },
    description: {
      en: "SCIO describes SCIO Connect as a peer programme that matches newly injured people and family members with mentors who have lived experience. The master plan also names SCIO-Connect for Families and Peer Connections events. Training, screening, supervision, and safeguarding policies were not verified. The App does not match mentors. The peer-support page checked on 13 November 2026 describes peer mentors. A heading titled SCIO Connect was not confirmed on that page.",
      fr: "SCIO décrit SCIO Connect comme un programme de pairs qui jumelle les personnes nouvellement blessées et les membres de la famille avec des mentors qui ont une expérience vécue. Le plan directeur nomme aussi SCIO-Connect pour les familles et les événements Peer Connections. La formation, la sélection, la supervision et les politiques de protection n'ont pas été vérifiées. L'application ne jumelle pas de mentors. La page de soutien par les pairs vérifiée le 13 novembre 2026 décrit des mentors pairs. Un titre SCIO Connect n'a pas été confirmé sur cette page.",
    },
    links: [
      {
        href: "https://www.sciontario.org/services/peer-support/",
        label: {
          en: "SCIO peer support page (English, checked 13 November 2026)",
          fr: "Page de soutien par les pairs de SCIO (en anglais, vérifiée le 13 novembre 2026)",
        },
        retrieved: CHECKED,
        pageLanguage: "en",
        homepageFallback: false,
        limit: {
          en: "The page describes peer support and becoming a peer mentor. It does not state how many mentors are available or whether a match is open. French addresses under /fr/services/ redirected to the English page that day.",
          fr: "La page décrit le soutien par les pairs et le fait de devenir mentor. Elle ne dit pas combien de mentors sont disponibles ni si un jumelage est ouvert. Les adresses françaises sous /fr/services/ renvoyaient à la page anglaise ce jour-là.",
        },
      },
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
      {
        href: "https://www.sciontario.org/services/employment-services/",
        label: {
          en: "SCIO employment services page (English, checked 13 November 2026)",
          fr: "Page des services d'emploi de SCIO (en anglais, vérifiée le 13 novembre 2026)",
        },
        retrieved: CHECKED,
        pageLanguage: "en",
        homepageFallback: false,
        limit: {
          en: "The page title is Employment Services. Eligibility rules and a current job list were not copied.",
          fr: "Le titre de la page est Employment Services. Les règles d'admission et une liste d'emplois actuelle n'ont pas été copiées.",
        },
      },
    ],
    unknowns: ["U13 geography and funder"],
  },
  {
    id: "equipment",
    name: { en: "Equipment access", fr: "Accès à l'équipement" },
    description: {
      en: "The audited statements say regional services include essential equipment and mobility aids for people who cannot afford them. Whether SCIO currently loans, donates, or funds equipment directly was not verified. The App does not recommend a device and does not promise funding.",
      fr: "Les états vérifiés disent que les services régionaux comprennent de l'équipement essentiel et des aides à la mobilité pour les personnes qui ne peuvent pas se les payer. On n'a pas vérifié si SCIO prête, donne ou finance actuellement l'équipement directement. L'application ne recommande pas un appareil et ne promet pas de financement.",
    },
    links: [
      {
        href: "https://www.sciontario.org/services/equipment/",
        label: {
          en: "SCIO accessing equipment page (English, checked 13 November 2026)",
          fr: "Page d'accès à l'équipement de SCIO (en anglais, vérifiée le 13 novembre 2026)",
        },
        retrieved: CHECKED,
        pageLanguage: "en",
        homepageFallback: false,
        limit: {
          en: "The page title is Accessing Equipment. A French address under /fr/services/equipment/ redirected to a ski-day equipment page on 13 November 2026, so that address is not used. Prices and stock were not copied.",
          fr: "Le titre de la page est Accessing Equipment. Une adresse française sous /fr/services/equipment/ renvoyait le 13 novembre 2026 vers une page d'équipement d'une journée de ski, donc cette adresse n'est pas utilisée. Les prix et les stocks n'ont pas été copiés.",
        },
      },
    ],
    unknowns: ["U14 loan, donation, or funding model"],
  },
  {
    id: "knowledge",
    name: { en: "Knowledge exchange and Cortree", fr: "Transfert de connaissances et Cortree" },
    description: {
      en: "Knowledge exchange is an audited grouping. Cortree Disability Education Centre is described as a social enterprise launched in 2019. The current catalogue and prices were not verified. The App does not copy Cortree courses. No separate page for the grouping 'knowledge exchange' was found on 13 November 2026. The link is Cortree, the learning site named in SCIO's navigation.",
      fr: "Le transfert de connaissances est un groupe vérifié dans les états. Le Cortree Disability Education Centre est décrit comme une entreprise sociale lancée en 2019. Le catalogue et les prix actuels n'ont pas été vérifiés. L'application ne copie pas les cours de Cortree. Aucune page distincte pour le groupe « transfert de connaissances » n'a été trouvée le 13 novembre 2026. Le lien est Cortree, le site d'apprentissage nommé dans la navigation de SCIO.",
    },
    links: [
      {
        href: "https://cortree.sciontario.org/",
        label: {
          en: "Cortree by SCIO (checked 13 November 2026)",
          fr: "Cortree par SCIO (vérifié le 13 novembre 2026)",
        },
        retrieved: CHECKED,
        pageLanguage: "en",
        homepageFallback: false,
        limit: {
          en: "The page says Cortree is by SCIO. It is not a copy of the course catalogue, and it is not a separate knowledge-exchange programme page.",
          fr: "La page dit que Cortree est de SCIO. Ce n'est pas une copie du catalogue de cours, et ce n'est pas une page distincte du programme de transfert de connaissances.",
        },
      },
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
      {
        href: "https://www.sciontario.org/research/",
        label: {
          en: "SCIO research page (English, checked 13 November 2026)",
          fr: "Page de recherche de SCIO (en anglais, vérifiée le 13 novembre 2026)",
        },
        retrieved: CHECKED,
        pageLanguage: "en",
        homepageFallback: false,
        limit: {
          en: "The page title is Research. Current studies, ethics review, and whether the public can join were not copied.",
          fr: "Le titre de la page est Research. Les études en cours, l'examen éthique et la possibilité pour le public de participer n'ont pas été copiés.",
        },
      },
    ],
    unknowns: ["U18 objectives"],
  },
  {
    id: "policy",
    name: { en: "Public policy and advocacy", fr: "Politiques publiques et défense des droits" },
    description: {
      en: "Public policy is an audited grouping. Current positions were not verified. This App does not state an SCIO policy position.",
      fr: "Les politiques publiques sont un groupe vérifié dans les états. Les positions actuelles n'ont pas été vérifiées. Cette application n'énonce pas une position de SCIO.",
    },
    links: [
      {
        href: "https://www.sciontario.org/our-initiatives/",
        label: {
          en: "SCIO advocacy initiatives page (English, checked 13 November 2026)",
          fr: "Page des initiatives de défense des droits de SCIO (en anglais, vérifiée le 13 novembre 2026)",
        },
        retrieved: CHECKED,
        pageLanguage: "en",
        homepageFallback: false,
        limit: {
          en: "The page describes advocacy initiatives, including accessible housing, pressure injury management, mobility devices, and medical supplies. It is not a list of current policy positions. The address /our-initiatives/advocacy-committee/ redirected here on 13 November 2026.",
          fr: "La page décrit des initiatives de défense des droits, dont le logement accessible, la gestion des plaies de pression, les aides à la mobilité et les fournitures médicales. Ce n'est pas une liste de positions politiques actuelles. L'adresse /our-initiatives/advocacy-committee/ renvoyait ici le 13 novembre 2026.",
        },
      },
    ],
    unknowns: ["U20 current positions"],
  },
  {
    id: "membership",
    name: { en: "Membership and community", fr: "Adhésion et communauté" },
    description: {
      en: "Membership, community, and communications are cross-cutting. They are not a separate audited programme grouping. Benefits, fees, and counts were not verified. On 13 November 2026 no page that states membership categories, fees, or counts was found, so this row keeps the SCIO homepage. The page /about/join-community/ is a newsletter signup. It is not used as the membership programme page.",
      fr: "L'adhésion, la communauté et les communications sont transversales. Ce n'est pas un groupe de programme distinct dans les états vérifiés. Les avantages, les frais et les nombres n'ont pas été vérifiés. Le 13 novembre 2026, aucune page qui énonce les catégories d'adhésion, les frais ou les nombres n'a été trouvée, donc cette ligne garde la page d'accueil de SCIO. La page /about/join-community/ est une inscription à un bulletin. Elle n'est pas utilisée comme page du programme d'adhésion.",
    },
    links: [
      {
        href: "https://www.sciontario.org/",
        label: {
          en: "SCIO homepage — no membership programme page was found (checked 13 November 2026)",
          fr: "Page d'accueil de SCIO — aucune page de programme d'adhésion n'a été trouvée (vérifiée le 13 novembre 2026)",
        },
        retrieved: CHECKED,
        pageLanguage: "en",
        homepageFallback: true,
        limit: {
          en: "Kept on the homepage because a membership programme page was not confirmed.",
          fr: "Gardé sur la page d'accueil parce qu'une page de programme d'adhésion n'a pas été confirmée.",
        },
      },
    ],
    unknowns: ["U9", "U21 membership categories, fees, and counts"],
  },
  {
    id: "events",
    name: { en: "Events", fr: "Événements" },
    description: {
      en: "SCIO publishes peer and community events, including Peer Connections. The English and French events category pages were open on 13 November 2026. Their listings were not copied into the App. Demonstration listings in the App are not those events and are not a registration.",
      fr: "SCIO publie des événements de pairs et communautaires, y compris Peer Connections. Les pages de catégorie d'événements en anglais et en français étaient ouvertes le 13 novembre 2026. Leurs fiches n'ont pas été copiées dans l'application. Les fiches de démonstration dans l'application ne sont pas ces événements et ne sont pas une inscription.",
    },
    links: [
      {
        href: "https://www.sciontario.org/category/events/",
        label: {
          en: "SCIO events list (English, checked 13 November 2026)",
          fr: "Liste des événements de SCIO (en anglais, vérifiée le 13 novembre 2026)",
        },
        retrieved: CHECKED,
        pageLanguage: "en",
        homepageFallback: false,
        limit: {
          en: "This is the English events category. Listings change. The three demonstration events in the App are not these listings.",
          fr: "C'est la catégorie d'événements en anglais. Les fiches changent. Les trois événements de démonstration dans l'application ne sont pas ces fiches.",
        },
      },
      {
        href: "https://www.sciontario.org/fr/category/evenements/",
        label: {
          en: "SCIO events list in French (checked 13 November 2026)",
          fr: "Liste des événements de SCIO en français (vérifiée le 13 novembre 2026)",
        },
        retrieved: CHECKED,
        pageLanguage: "fr",
        homepageFallback: false,
        limit: {
          en: "This French category page stayed in French on 13 November 2026. It is not a registration form.",
          fr: "Cette page de catégorie en français est restée en français le 13 novembre 2026. Ce n'est pas un formulaire d'inscription.",
        },
      },
    ],
    unknowns: ["U22 current sponsors and revenue. Listings on the events pages were not copied"],
  },
];

/**
 * Contact details printed on SCIO's contact page on 13 November 2026.
 * They are SCIO's lines. The App does not operate them and does not send complaints there.
 * The older InfoLine extension 213 is not on that page and is not listed.
 */
export const ORGANISATION_CONTACT = {
  retrieved: CHECKED,
  pageUrl: "https://www.sciontario.org/contact-us/",
  phone: "416-422-5644",
  tollFree: "1-877-422-1112",
  email: "info@sciontario.org",
  referralsEmail: "referrals@sciontario.org",
  frenchLine: {
    en: "The contact page says to press 1 on 1-877-422-1112 for service in French.",
    fr: "La page de contact dit d'appuyer sur 1 au 1-877-422-1112 pour les services en français.",
  },
  limit: {
    en: "These are Spinal Cord Injury Ontario's published contact details, read on 13 November 2026. The App does not operate this phone or this inbox. SCIO has not agreed to receive complaints about the App. Hours, and whether a person answers, were not copied. The older extension 213 is not on this page and is not listed.",
    fr: "Ce sont les coordonnées publiées de Spinal Cord Injury Ontario, lues le 13 novembre 2026. L'application n'exploite pas ce téléphone ni cette boîte. SCIO n'a pas accepté de recevoir les plaintes au sujet de l'application. Les heures, et si une personne répond, n'ont pas été copiées. L'ancien poste 213 n'est pas sur cette page et n'est pas listé.",
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
  { id: "directory", path: "/community", actions: [{ kind: "link_out", href: ORGANISATION_CONTACT.pageUrl }] },
  { id: "events", path: "/community/events", actions: [{ kind: "link_out", href: "https://www.sciontario.org/category/events/" }] },
  { id: "moderation", path: "/community/safety", actions: [] },
];

export function programmeText(language: Language): string {
  return PROGRAMMES.map((entry) => `${entry.name[language]}\n${entry.description[language]}`).join("\n");
}

/** Empty when every programme has a distinct link label and a homepage is used only with an explicit fallback. */
export function programmeLinkDefects(): string[] {
  const defects: string[] = [];
  if (PROGRAMMES.length !== 9) {
    defects.push("expected 9 programmes");
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
      if (link.homepageFallback !== (link.href === "https://www.sciontario.org/")) {
        defects.push(`${entry.id} homepage flag does not match the address`);
      }
      if (link.label.en === link.label.fr) {
        defects.push(`${entry.id} link label is the same in both languages`);
      }
    }
  }
  const fallbacks = PROGRAMMES.filter((entry) => entry.links.some((link) => link.homepageFallback));
  if (fallbacks.length !== 1 || fallbacks[0]?.id !== "membership") {
    defects.push("only membership should keep the homepage");
  }
  return defects;
}
