import type { HelpArticle, Language, TranslationState } from "../types.js";
import { FR_BOUNDARIES } from "./fr-boundaries.js";

const DRAFT = "lane-7-draft";

function translation(enState: TranslationState): HelpArticle["translation"] {
  return {
    en: { state: enState, translator: DRAFT, reviewer: null, reviewed: null },
    fr: {
      state: "draft_awaiting_franco_ontarian_review",
      translator: DRAFT,
      reviewer: null,
      reviewed: null,
    },
  };
}

/**
 * Help articles for the App. English and French are human drafts from the
 * November 2026 master plan and from official pages retrieved 13 November 2026.
 * French is not launch-ready until a Franco-Ontarian reviewer is recorded.
 * Safety articles are not launch-ready until clinical review is recorded.
 */
const ARTICLE_DRAFTS = [
  {
    id: "what-the-app-is",
    topics: ["about", "boundaries"],
    safetyCritical: false,
    does: [
      "Explain that the product is called the App.",
      "Separate place facts, peer tips, and health information.",
      "Say, in the same words, what the App refuses to do.",
    ],
    doesNot: [
      "Claim that Spinal Cord Injury Ontario, AccessNow, Google, a transit agency, or a municipality endorses the App.",
      "Give medical, legal, or benefits-eligibility advice.",
      "Call a place accessible because a map pin is green.",
    ],
    synonyms: {
      en: ["about", "what is this", "boundaries", "scio"],
      fr: ["à propos", "c'est quoi", "limites", "scio"],
    },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan, November 2026, unbranded product rule and clinical boundaries",
        retrieved: "2026-11-13",
        limit: "The plan is a proposal. It is not a statement by Spinal Cord Injury Ontario.",
      },
    ],
    en: {
      title: "What the App is",
      summary: "The App is an Ontario tool for people with a spinal cord injury. It shows sourced place and trip information, and it says when it does not know.",
      sections: [
        {
          heading: "The name",
          paragraphs: [
            "This product is called the App. It has no brand name in this prototype.",
            "Spinal Cord Injury Ontario has not endorsed the App. AccessNow, Google, transit agencies, and municipalities have not endorsed it either. A link to an official page is not a partnership.",
          ],
        },
        {
          heading: "Three kinds of information",
          paragraphs: [
            "Place facts are measurements and observations with a source, a date, and a verification label. If a fact is missing, the App says Unknown.",
            "Peer tips are lived experience. A public community would require a person to review each tip before anyone else could read it. No reviewer is staffed in this prototype. A tip is not a measurement.",
            "Health information, when the App shows any, is general and sourced. It is not advice about you.",
          ],
        },
      ],
    },
    fr: {
      title: "Ce qu'est l'application",
      summary: "L'application est un outil ontarien pour les personnes ayant une lésion médullaire. Elle montre de l'information sourcée sur les lieux et les trajets, et elle dit quand elle ne sait pas.",
      sections: [
        {
          heading: "Le nom",
          paragraphs: [
            "Ce produit s'appelle l'application. Ce prototype n'a pas de nom de marque.",
            "Spinal Cord Injury Ontario n'a pas approuvé l'application. AccessNow, Google, les sociétés de transport et les municipalités ne l'ont pas approuvée non plus. Un lien vers une page officielle n'est pas un partenariat.",
          ],
        },
        {
          heading: "Trois sortes d'information",
          paragraphs: [
            "Les faits sur un lieu sont des mesures et des observations avec une source, une date et une étiquette de vérification. Si un fait manque, l'application écrit Inconnu.",
            "Les conseils des pairs viennent de l'expérience vécue. Une communauté publique exigerait qu'une personne révise chaque conseil avant que d'autres puissent le lire. Aucune personne n'est en poste pour cette revue dans ce prototype. Un conseil n'est pas une mesure.",
            "L'information de santé, quand l'application en montre, est générale et sourcée. Ce n'est pas un conseil sur vous.",
          ],
        },
      ],
    },
  },
  {
    id: "get-help-now",
    topics: ["emergency", "help"],
    safetyCritical: true,
    does: [
      "Keep emergency help in the same place on every screen.",
      "Offer 911 with no questions first.",
      "Point to health and crisis lines that were checked on a named date.",
    ],
    doesNot: [
      "Ask questions before showing 911.",
      "Check symptoms, read a blood pressure, or tell you whether to wait.",
      "Store what you were going to say about an emergency.",
    ],
    synonyms: {
      en: ["emergency", "911", "help", "urgent", "autonomic dysreflexia"],
      fr: ["urgence", "911", "aide", "dysréflexie autonome"],
    },
    translation: translation("draft_awaiting_clinical_review"),
    machineTranslated: false,
    sources: [
      {
        title: "9-8-8 Suicide Crisis Helpline homepage",
        url: "https://988.ca/",
        retrieved: "2026-11-13",
        limit: "Confirms call or text 9-8-8, and says to call 911 if safety is at risk. Does not describe spinal cord injury.",
      },
      {
        title: "Health811 contact page",
        url: "https://health811.ontario.ca/static/guest/contact-us",
        retrieved: "2026-11-13",
        limit: "Confirms 811 and TTY 711 for non-urgent health advice. The page says to call 911 in a medical emergency.",
      },
    ],
    en: {
      title: "Get help now",
      summary: "If you are in danger, call 911. The App will not ask you questions first. The App is not an emergency service.",
      sections: [
        {
          heading: "Immediate danger",
          paragraphs: [
            "Call 911 for a fall, an injury, trouble breathing, chest pain, a sudden severe headache, or any immediate danger.",
            "Some people with a spinal cord injury can have a medical emergency called autonomic dysreflexia. This sentence is general information, not a diagnosis and not advice about you. Clinical review of any longer explanation is still outstanding. Do not look for a checklist in the App. Call 911 or get urgent care.",
          ],
        },
        {
          heading: "Where help sits",
          paragraphs: [
            "Help stays in the same place on every screen: the Help link in the header, next to Call 911. That placement follows the idea of consistent help.",
            "For a non-urgent health question, call Health811 at 811. TTY is 711. People in northern Ontario on a VoIP phone can use 1-866-797-0000, as the Health811 calling page stated on 13 November 2026.",
            "These numbers were checked on 13 November 2026. They can change. The App must be updated when they do.",
          ],
        },
      ],
    },
    fr: {
      title: "Obtenir de l'aide maintenant",
      summary: "Si vous êtes en danger, composez le 911. L'application ne vous pose pas de questions d'abord. L'application n'est pas un service d'urgence.",
      sections: [
        {
          heading: "Danger immédiat",
          paragraphs: [
            "Composez le 911 pour une chute, une blessure, un trouble respiratoire, une douleur à la poitrine, un mal de tête soudain et intense, ou tout danger immédiat.",
            "Certaines personnes ayant une lésion médullaire peuvent avoir une urgence médicale appelée dysréflexie autonome. Cette phrase est une information générale, pas un diagnostic et pas un conseil sur vous. Une révision clinique de toute explication plus longue n'est pas encore faite. Ne cherchez pas une liste de contrôle dans l'application. Composez le 911 ou obtenez des soins urgents.",
          ],
        },
        {
          heading: "Où se trouve l'aide",
          paragraphs: [
            "L'aide reste au même endroit sur chaque écran : le lien Aide dans l'en-tête, à côté de Appeler le 911.",
            "Pour une question de santé non urgente, appelez Health811 au 811. L'ATS est le 711. Les personnes du Nord de l'Ontario qui utilisent un téléphone VoIP peuvent utiliser le 1-866-797-0000, comme l'indiquait la page d'appel de Health811 le 13 novembre 2026.",
            "Ces numéros ont été vérifiés le 13 novembre 2026. Ils peuvent changer. L'application doit être mise à jour quand ils changent.",
          ],
        },
      ],
    },
  },
  {
    id: "crisis-support",
    topics: ["crisis", "mental health"],
    safetyCritical: true,
    does: [
      "Show 9-8-8 and ConnexOntario without a form.",
      "Say the App is not a crisis service.",
      "Leave the conversation on the phone or text line, not in the App.",
    ],
    doesNot: [
      "Ask you to type suicidal thoughts into the App.",
      "Store a crisis disclosure.",
      "Offer counselling, a risk score, or a safety plan.",
    ],
    synonyms: {
      en: ["suicide", "988", "crisis", "mental health", "connex"],
      fr: ["suicide", "988", "crise", "santé mentale", "connex"],
    },
    translation: translation("draft_awaiting_clinical_review"),
    machineTranslated: false,
    sources: [
      {
        title: "9-8-8 Suicide Crisis Helpline",
        url: "https://988.ca/",
        retrieved: "2026-11-13",
        limit: "Service description only. The App does not operate 9-8-8.",
      },
      {
        title: "ConnexOntario contact page",
        url: "https://connexontario.ca/contact-us/",
        retrieved: "2026-11-13",
        limit: "Lists 1-866-531-2600 and text CONNEX to 247247. Carrier charges for text may apply.",
      },
    ],
    en: {
      title: "Crisis support",
      summary: "If you need to talk about suicide or distress, call or text 9-8-8. The App will not ask you to explain, and it will not save what you might have typed.",
      sections: [
        {
          heading: "Talk to a person",
          paragraphs: [
            "Call or text 9-8-8. The service is offered 24 hours a day in English and French. That is what https://988.ca/ said on 13 November 2026.",
            "ConnexOntario lists 1-866-531-2600 for information about mental health, addiction, and gambling services in Ontario. You can also text CONNEX to 247247. Your phone company may charge for that text.",
            "If you are in immediate danger, call 911.",
          ],
        },
        {
          heading: "What the App will not do",
          paragraphs: [
            "The App is not a crisis line. It does not counsel you. It does not score risk. It does not write a safety plan.",
            "Do not type a crisis into a tip, a report, or a search box and expect a reply. If a draft looks like a crisis, the App shows these numbers and does not keep the text.",
          ],
        },
      ],
    },
    fr: {
      title: "Soutien en cas de crise",
      summary: "Si vous avez besoin de parler de suicide ou de détresse, appelez ou textez le 9-8-8. L'application ne vous demande pas d'expliquer, et elle ne garde pas ce que vous auriez pu écrire.",
      sections: [
        {
          heading: "Parler à une personne",
          paragraphs: [
            "Appelez ou textez le 9-8-8. Le service est offert 24 heures sur 24 en français et en anglais. C'est ce que disait https://988.ca/ le 13 novembre 2026.",
            "ConnexOntario indique le 1-866-531-2600 pour de l'information sur les services de santé mentale, de dépendance et de jeu en Ontario. Vous pouvez aussi texter CONNEX au 247247. Votre fournisseur peut facturer ce texto.",
            "Si vous êtes en danger immédiat, composez le 911.",
          ],
        },
        {
          heading: "Ce que l'application ne fera pas",
          paragraphs: [
            "L'application n'est pas une ligne de crise. Elle ne fait pas de counseling. Elle ne note pas un risque. Elle n'écrit pas un plan de sécurité.",
            "N'écrivez pas une crise dans un conseil, un signalement ou une recherche en attendant une réponse. Si un brouillon ressemble à une crise, l'application montre ces numéros et ne conserve pas le texte.",
          ],
        },
      ],
    },
  },
  {
    id: "health-concerns",
    topics: ["health"],
    safetyCritical: true,
    does: [
      "Point you to Health811, your own clinician, and 911.",
      "Keep health wording general, dated, and marked as not personal advice.",
    ],
    doesNot: [
      "Diagnose a urinary tract infection, a pressure injury, pain, or any other condition.",
      "Tell you when to catheterize, how to transfer, or which cushion to use.",
      "Run timers for pressure relief or bladder care.",
    ],
    synonyms: {
      en: ["health", "811", "bladder", "skin", "nurse", "washroom"],
      fr: ["santé", "811", "vessie", "peau", "infirmier", "toilette"],
    },
    translation: translation("draft_awaiting_clinical_review"),
    machineTranslated: false,
    sources: [
      {
        title: "Health811 calling page",
        url: "https://health811.ontario.ca/static/guest/help-centre/calling-health811-help-centre",
        retrieved: "2026-11-13",
        limit: "Describes Health811's own nurses. It is not a clinical protocol for spinal cord injury.",
      },
    ],
    en: {
      title: "Health concerns",
      summary: "The App does not give health advice. For a non-urgent health question, call Health811 at 811. For an emergency, call 911.",
      sections: [
        {
          heading: "Who can advise you",
          paragraphs: [
            "A pressure injury, a bladder or bowel problem, pain, or a new symptom needs a clinician who knows you. Health811 (811, TTY 711) can help you reach a nurse for non-urgent questions.",
            "The App can show a washroom, a place to rest, shade, or an indoor route. Those are place facts. They are not a treatment plan.",
          ],
        },
        {
          heading: "What you will not find here",
          paragraphs: [
            "You will not find a symptom checker. You will not find a suggested catheter interval, a bowel programme, a skin-care routine, or a drug dose.",
            "A peer tip that tells someone how to manage their body is removed. The author is told why. The tip is not rewritten into advice.",
          ],
        },
      ],
    },
    fr: {
      title: "Questions de santé",
      summary: "L'application ne donne pas de conseil de santé. Pour une question non urgente, appelez Health811 au 811. En cas d'urgence, composez le 911.",
      sections: [
        {
          heading: "Qui peut vous conseiller",
          paragraphs: [
            "Une plaie de pression, un problème de vessie ou d'intestin, une douleur ou un nouveau symptôme demande un clinicien qui vous connaît. Health811 (811, ATS 711) peut vous mettre en lien avec une infirmière ou un infirmier pour une question non urgente.",
            "L'application peut montrer une toilette, un endroit pour se reposer, de l'ombre ou un trajet à l'intérieur. Ce sont des faits sur les lieux. Ce n'est pas un plan de traitement.",
          ],
        },
        {
          heading: "Ce que vous ne trouverez pas ici",
          paragraphs: [
            "Vous ne trouverez pas un vérificateur de symptômes. Vous ne trouverez pas un intervalle de sondage suggéré, un programme intestinal, une routine de soins de la peau ou une dose de médicament.",
            "Un conseil de pair qui dit à quelqu'un comment gérer son corps est retiré. La personne autrice est informée du motif. Le conseil n'est pas réécrit en avis.",
          ],
        },
      ],
    },
  },
  {
    id: "privacy",
    topics: ["privacy", "consent"],
    safetyCritical: false,
    does: [
      "Let you use place and trip help with no account.",
      "Ask for separate, plain-language consent for each extra use of personal information.",
      "Keep this draft honest about the undecided privacy statute.",
    ],
    doesNot: [
      "Decide whether PHIPA or PIPEDA applies. That decision needs counsel.",
      "Require a diagnosis, an injury level, or a health card.",
      "Sell location or health-related information, or run ads.",
    ],
    synonyms: {
      en: ["privacy", "phipa", "pipeda", "consent", "delete", "account"],
      fr: ["confidentialité", "vie privée", "phipa", "pipeda", "consentement", "supprimer", "compte"],
    },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 2, section 5, privacy",
        retrieved: "2026-11-13",
        limit: "The plan says the PHIPA versus PIPEDA question is undecided and that statute text was not re-read from e-Laws in that research pass. This article is not legal advice.",
      },
    ],
    en: {
      title: "Privacy",
      summary: "You can read help and look up places with no account. A lawyer still has to decide which privacy law applies. This article is not legal advice.",
      sections: [
        {
          heading: "No account for the core",
          paragraphs: [
            "Washroom information, elevator status, and trip help must work with no account, no health details, and no saved location history.",
            "If you later choose an account, the App may keep only what that account needs. It must not demand a health history to create one.",
          ],
        },
        {
          heading: "Two laws, not yet chosen",
          paragraphs: [
            "PIPEDA is the federal law for personal information in commercial activity. PHIPA is the Ontario law for personal health information held by health information custodians and their agents.",
            "A direct-to-consumer App that does not act for a hospital or another custodian is often discussed under PIPEDA. The App would become a PHIPA matter if it handled personal health information for a custodian. Counsel has not made that determination. Do not treat this paragraph as the determination.",
            "Consent for anything sensitive has to be express, separate for each purpose, and as easy to take back as to give. There is no pre-ticked box.",
          ],
        },
      ],
    },
    fr: {
      title: "Vie privée",
      summary: "Vous pouvez lire l'aide et chercher des lieux sans compte. Un avocat doit encore décider quelle loi sur la vie privée s'applique. Cet article n'est pas un avis juridique.",
      sections: [
        {
          heading: "Pas de compte pour l'essentiel",
          paragraphs: [
            "L'information sur les toilettes, l'état des ascenseurs et l'aide au trajet doivent fonctionner sans compte, sans détail de santé et sans historique de position.",
            "Si vous choisissez plus tard un compte, l'application ne peut garder que ce dont ce compte a besoin. Elle ne doit pas exiger un historique de santé pour le créer.",
          ],
        },
        {
          heading: "Deux lois, pas encore choisies",
          paragraphs: [
            "La LPRPDE est la loi fédérale sur les renseignements personnels dans une activité commerciale. La LPRPS (PHIPA) est la loi ontarienne sur les renseignements personnels sur la santé détenus par les dépositaires et leurs mandataires.",
            "Une application offerte directement aux personnes, qui n'agit pas pour un hôpital ou un autre dépositaire, est souvent discutée sous la LPRPDE. L'application relèverait de la LPRPS si elle traitait des renseignements personnels sur la santé pour un dépositaire. Un avocat n'a pas tranché. Ne traitez pas ce paragraphe comme la décision.",
            "Le consentement pour une donnée sensible doit être exprès, séparé pour chaque fin, et aussi simple à retirer qu'à donner. Il n'y a pas de case déjà cochée.",
          ],
        },
      ],
    },
  },
  {
    id: "indigenous-data",
    topics: ["privacy", "ocap"],
    safetyCritical: false,
    does: [
      "Refuse on-reserve and Nation-governed records until that Nation agrees.",
      "Name OCAP as First Nations principles, not as a pan-Indigenous rule.",
      "Keep core features free of any identity check.",
    ],
    doesNot: [
      "Collect Indigenous identity, status, or membership in a profile.",
      "Treat a land acknowledgement as engagement.",
      "Say that talking to the App team discharges a Crown duty to consult.",
    ],
    synonyms: {
      en: ["ocap", "first nations", "indigenous", "inuit", "métis", "data sovereignty"],
      fr: ["pcap", "ocap", "premières nations", "autochtone", "inuit", "métis", "souveraineté des données"],
    },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 2, section 7.2, Indigenous engagement principles",
        retrieved: "2026-11-13",
        limit: "The plan summarises secondary sources. It says fnigc.ca was not retrieved in that pass (unknown U72) and that no Nation was contacted. This article does not speak for any Nation.",
      },
    ],
    en: {
      title: "Indigenous data",
      summary: "The App does not publish accessibility data about a First Nation reserve or an Indigenous-governed service unless that Nation or community has agreed. No agreement exists in this prototype.",
      sections: [
        {
          heading: "OCAP is First Nations specific",
          paragraphs: [
            "OCAP means Ownership, Control, Access, and Possession. The master plan describes it as First Nations principles, and as a trademark of the First Nations Information Governance Centre. This draft did not re-fetch fnigc.ca. Do not read this article as the Centre's own wording.",
            "OCAP is not a rule for Inuit or Métis data. Those Peoples have their own governance. The plan left Inuit and Métis frameworks as unknown U74. This article will not invent them.",
            "CARE principles are not restated here. The plan did not retrieve the primary definitions.",
          ],
        },
        {
          heading: "What builders must not do",
          paragraphs: [
            "Do not scrape, infer, or show place data for a reserve or an Indigenous-governed facility without an agreement on ownership, control, access, and possession. The default is no data.",
            "A Nation must be able to correct or withdraw its records. A land acknowledgement is not that agreement.",
            "You never have to prove Indigenous identity to use the App. The App does not ask for status or membership.",
          ],
        },
      ],
    },
    fr: {
      title: "Données autochtones",
      summary: "L'application ne publie pas de données d'accessibilité sur une réserve d'une Première Nation ou un service sous gouvernance autochtone, sauf si cette Nation ou cette communauté a accepté. Aucune entente n'existe dans ce prototype.",
      sections: [
        {
          heading: "Les PCAP visent les Premières Nations",
          paragraphs: [
            "PCAP (OCAP en anglais) veut dire propriété, contrôle, accès et possession. Le plan directeur les décrit comme des principes des Premières Nations et comme une marque du Centre de gouvernance de l'information des Premières Nations. Cette ébauche n'a pas rouvert fnigc.ca. Ne lisez pas cet article comme le texte du Centre.",
            "Les PCAP ne sont pas une règle pour les données inuites ou métisses. Ces peuples ont leur propre gouvernance. Le plan a laissé ces cadres comme inconnus (U74). Cet article ne les invente pas.",
            "Les principes CARE ne sont pas repris ici. Le plan n'a pas obtenu les définitions primaires.",
          ],
        },
        {
          heading: "Ce que les bâtisseurs ne doivent pas faire",
          paragraphs: [
            "Ne pas extraire, déduire ou montrer des données de lieu pour une réserve ou un établissement sous gouvernance autochtone sans entente sur la propriété, le contrôle, l'accès et la possession. Le défaut est : aucune donnée.",
            "Une Nation doit pouvoir corriger ou retirer ses fiches. Une reconnaissance territoriale n'est pas cette entente.",
            "Vous n'avez jamais à prouver une identité autochtone pour utiliser l'application. L'application ne demande pas un statut ou une appartenance.",
          ],
        },
      ],
    },
  },
  {
    id: "peer-tips",
    topics: ["community", "moderation"],
    safetyCritical: false,
    does: [
      "Hold a practical tip on this device. A staffed review is required before a public community. No reviewer is staffed in this prototype.",
      "Show the display name the author chose, the date, and a label that says no reviewer is staffed.",
      "Keep family tips in the family space unless the author asks to share more widely.",
    ],
    doesNot: [
      "Match you with a mentor.",
      "Let people message each other.",
      "Publish health advice, a transfer method, an equipment recommendation, or a benefits decision.",
    ],
    synonyms: {
      en: ["peer", "tip", "mentor", "community", "moderation", "advice"],
      fr: ["pair", "conseil", "mentor", "communauté", "modération", "avis"],
    },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 2 section 4 and Part 4 feature F-16",
        retrieved: "2026-11-13",
        limit: "SCIO Connect training and safeguarding policies were not verified (unknown U23). No SCIO agreement to govern tips exists.",
      },
    ],
    en: {
      title: "Peer tips",
      summary: "A peer tip says what worked at a place or on a trip. It is not medical advice. Nobody else sees it until a trained person has reviewed it. That review is not staffed in this prototype.",
      sections: [
        {
          heading: "What you may share",
          paragraphs: [
            "Share which entrance worked, whether a washroom fit your chair and an attendant, or where a power chair could charge. Name the place. Date the visit in your own words.",
            "Choose a display name. You do not have to give an injury level, a diagnosis, or the kind of equipment you are prescribed.",
            "The public list shows community tips are not yet available, because no moderator is staffed. A practice queue on this device can show the steps. It is not a live community.",
          ],
        },
        {
          heading: "What is refused",
          paragraphs: [
            "Do not tell someone how to transfer, how to manage their bladder, bowel, or skin, which wheelchair to buy, or whether they qualify for a programme.",
            "There is no inbox and no mentor matching. Spinal Cord Injury Ontario's peer programme is a separate service. The App links to SCIO. It does not replace SCIO Connect.",
            "A French tip waits for a French-speaking reviewer. It does not wait longer on purpose, and it is not run through machine translation.",
          ],
        },
      ],
    },
    fr: {
      title: "Conseils des pairs",
      summary: "Un conseil de pair dit ce qui a fonctionné dans un lieu ou sur un trajet. Ce n'est pas un avis médical. Personne d'autre ne le voit tant qu'une personne formée ne l'a pas lu. Cette revue n'est pas dotée en personnel dans ce prototype.",
      sections: [
        {
          heading: "Ce que vous pouvez partager",
          paragraphs: [
            "Dites quelle entrée a fonctionné, si une toilette convenait à votre fauteuil et à une personne accompagnatrice, ou où un fauteuil motorisé pouvait se recharger. Nommez le lieu. Datez la visite dans vos mots.",
            "Choisissez un nom d'affichage. Vous n'avez pas à donner un niveau de lésion, un diagnostic ou l'équipement qui vous est prescrit.",
            "La liste publique dit que les conseils communautaires ne sont pas encore disponibles, parce qu'aucune modération n'est dotée. Une file d'exercice sur cet appareil peut montrer les étapes. Ce n'est pas une communauté en service.",
          ],
        },
        {
          heading: "Ce qui est refusé",
          paragraphs: [
            "Ne dites pas à quelqu'un comment faire un transfert, comment gérer sa vessie, son intestin ou sa peau, quel fauteuil acheter, ou s'il est admissible à un programme.",
            "Il n'y a pas de boîte de messages et pas de jumelage avec un mentor. Le programme de pairs de Spinal Cord Injury Ontario est un service distinct. L'application renvoie vers SCIO. Elle ne remplace pas SCIO Connect.",
            "Un conseil en français attend une personne réviseure francophone. Il n'attend pas plus longtemps exprès, et il ne passe pas par une traduction automatique.",
          ],
        },
      ],
    },
  },
  {
    id: "events",
    topics: ["events", "community"],
    safetyCritical: false,
    does: [
      "Show a separate accessibility note for that event, not only for the building.",
      "Send registration to the organiser's own page.",
      "Label demonstration listings as demonstration data.",
    ],
    doesNot: [
      "Register you for an event inside the App.",
      "Treat last month's venue note as proof about tonight's event.",
      "Claim a listing is a Spinal Cord Injury Ontario event unless SCIO published it and the record says so.",
    ],
    synonyms: {
      en: ["event", "peer connections", "workshop", "calendar", "registration"],
      fr: ["événement", "activité", "atelier", "calendrier", "inscription"],
    },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 4 feature F-13 and Part 5 Day 16",
        retrieved: "2026-11-13",
        limit: "Day 16 requires demonstration events, not a live calendar. SCIO's current calendar was not re-fetched for this draft (unknown U22).",
      },
    ],
    en: {
      title: "Events",
      summary: "An event can block an entrance that is open on a normal day. The App keeps event notes separate from the building notes. This prototype shows demonstration listings only.",
      sections: [
        {
          heading: "What a listing must show",
          paragraphs: [
            "Each listing shows when, where, how to get there, the entrance for that event, seating, washrooms open for that event, support, registration, and cost, including whether a support person pays.",
            "If the organiser has not confirmed those facts for that date, the App says so. It may show the building's usual note, labelled as the building note, and it tells you to check with the organiser.",
            "Unknown stays Unknown. The App does not copy a measurement from another event.",
          ],
        },
        {
          heading: "Registration and demonstration data",
          paragraphs: [
            "The App does not take registrations. The button leaves the App for the organiser's site or phone number.",
            "Listings marked demonstration are examples of the shape. They are not invitations. They are not SCIO events. SCIO has not agreed to supply a calendar.",
          ],
        },
      ],
    },
    fr: {
      title: "Événements",
      summary: "Un événement peut bloquer une entrée qui est ouverte un jour ordinaire. L'application garde les notes de l'événement séparées des notes du bâtiment. Ce prototype ne montre que des fiches de démonstration.",
      sections: [
        {
          heading: "Ce qu'une fiche doit montrer",
          paragraphs: [
            "Chaque fiche montre quand, où, comment s'y rendre, l'entrée pour cet événement, les places, les toilettes ouvertes pour cet événement, le soutien, l'inscription et le coût, y compris si une personne de soutien paie.",
            "Si l'organisateur n'a pas confirmé ces faits pour cette date, l'application le dit. Elle peut montrer la note habituelle du bâtiment, étiquetée comme note du bâtiment, et elle vous dit de vérifier auprès de l'organisateur.",
            "Inconnu reste Inconnu. L'application ne copie pas une mesure d'un autre événement.",
          ],
        },
        {
          heading: "Inscription et données de démonstration",
          paragraphs: [
            "L'application ne prend pas les inscriptions. Le bouton quitte l'application vers le site ou le numéro de l'organisateur.",
            "Les fiches marquées démonstration sont des exemples de forme. Ce ne sont pas des invitations. Ce ne sont pas des événements de SCIO. SCIO n'a pas accepté de fournir un calendrier.",
          ],
        },
      ],
    },
  },
  {
    id: "reporting",
    topics: ["safety", "moderation"],
    safetyCritical: true,
    does: [
      "Take a report in the App, and publish a phone and email path for when the App is the wrong channel.",
      "Hide a reported tip until a person looks at it.",
      "Keep the reporter's identity off the public tip.",
    ],
    doesNot: [
      "Decide a safeguarding report by software alone.",
      "Show the report to the person who was reported.",
      "Delete a report with no record.",
    ],
    synonyms: {
      en: ["report", "abuse", "harassment", "safeguarding", "appeal"],
      fr: ["signaler", "abus", "harcèlement", "protection", "appel"],
    },
    translation: translation("draft_awaiting_clinical_review"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 2 sections 4.3 and 4.4",
        retrieved: "2026-11-13",
        limit: "Service levels in the plan are marked proposed, not staffed. No safeguarding lead is appointed in this prototype.",
      },
    ],
    en: {
      title: "Reporting a problem",
      summary: "You can report a tip, a listing, harassment, or a privacy problem. A person has to read a safety report. The App does not decide it alone. This prototype is not a staffed reporting line.",
      sections: [
        {
          heading: "In the App",
          paragraphs: [
            "On a practice tip you can report advice, a wrong fact, abuse, a privacy problem, or a safeguarding concern. The tip is hidden from the public list until review. Your name is not placed on the tip.",
            "You can appeal a decision. The appeal goes back to the queue for a different review. The prototype queue lives on your device only.",
          ],
        },
        {
          heading: "Outside the App",
          paragraphs: [
            "A staffed service would also offer phone and email, in English and French, with a published response time. Those contacts are not open, because nobody is staffed.",
            "For immediate danger, call 911. Do not wait for a moderator. The App must not delay that path with a form.",
          ],
        },
      ],
    },
    fr: {
      title: "Signaler un problème",
      summary: "Vous pouvez signaler un conseil, une fiche, du harcèlement ou un problème de vie privée. Une personne doit lire un signalement de sécurité. L'application ne le décide pas seule. Ce prototype n'est pas une ligne de signalement dotée.",
      sections: [
        {
          heading: "Dans l'application",
          paragraphs: [
            "Sur un conseil d'exercice, vous pouvez signaler un avis, un fait erroné, un abus, un problème de vie privée ou une préoccupation de protection. Le conseil est caché de la liste publique jusqu'à la revue. Votre nom n'est pas mis sur le conseil.",
            "Vous pouvez en appeler d'une décision. L'appel retourne dans la file pour une autre revue. La file du prototype reste seulement sur votre appareil.",
          ],
        },
        {
          heading: "Hors de l'application",
          paragraphs: [
            "Un service doté offrirait aussi le téléphone et le courriel, en français et en anglais, avec un délai de réponse publié. Ces contacts ne sont pas ouverts, parce que personne n'est en poste.",
            "En cas de danger immédiat, composez le 911. N'attendez pas une modération. L'application ne doit pas retarder ce chemin avec un formulaire.",
          ],
        },
      ],
    },
  },
  {
    id: "languages",
    topics: ["french", "language"],
    safetyCritical: false,
    does: [
      "Offer English and French on the first screen, in the header, and in help.",
      "Keep your place when you switch language.",
      "Label any text that exists in only one language.",
    ],
    doesNot: [
      "Hide French behind a request.",
      "Machine-translate safety, health, legal, or benefits text.",
      "Claim the French Language Services Act forces this private prototype to be bilingual. It does not, by itself.",
    ],
    synonyms: {
      en: ["french", "english", "language", "français", "flsa"],
      fr: ["français", "anglais", "langue", "english", "lsf"],
    },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 2 section 7.1 and Part 4 feature F-22",
        retrieved: "2026-11-13",
        limit: "The designated-area count is an unresolved conflict in the plan (25 versus 27). This article does not pick a number. French in the App is a draft pending Franco-Ontarian review.",
      },
    ],
    en: {
      title: "English and French",
      summary: "French is offered beside English, not hidden in a submenu. Help articles exist in both languages as drafts. A Franco-Ontarian review is still required before launch.",
      sections: [
        {
          heading: "Active offer",
          paragraphs: [
            "You can choose Français or English on the first screen and in the header. The choice is stored on this device. Switching does not wipe a draft you already typed.",
            "Search works with or without accents. A French word can find an article while the interface is in English, and the other way around.",
          ],
        },
        {
          heading: "What the law is, and is not",
          paragraphs: [
            "The French Language Services Act gives a right to provincial government services in French in designated areas and at government head offices. The App, as described, is not a government institution. The Act does not by itself obligate this prototype.",
            "If a ministry or another public funder later funded the App, French duties might be written into that agreement. No such agreement exists.",
            "The plan found a conflict about how many designated areas exist. This App does not say 25 and it does not say 27. That count is Unknown until the current regulation is listed.",
          ],
        },
      ],
    },
    fr: {
      title: "Français et anglais",
      summary: "Le français est offert à côté de l'anglais, pas caché dans un sous-menu. Les articles d'aide existent dans les deux langues comme ébauches. Une révision franco-ontarienne est encore requise avant un lancement.",
      sections: [
        {
          heading: "Offre active",
          paragraphs: [
            "Vous pouvez choisir Français ou English au premier écran et dans l'en-tête. Le choix est gardé sur cet appareil. Changer de langue n'efface pas un brouillon déjà écrit.",
            "La recherche fonctionne avec ou sans accents. Un mot français peut trouver un article pendant que l'interface est en anglais, et l'inverse aussi.",
          ],
        },
        {
          heading: "Ce que la loi est, et n'est pas",
          paragraphs: [
            "La Loi sur les services en français donne un droit aux services du gouvernement provincial en français dans les régions désignées et aux sièges des institutions gouvernementales. L'application, telle qu'elle est décrite, n'est pas une institution gouvernementale. La Loi n'oblige pas, à elle seule, ce prototype.",
            "Si un ministère ou un autre bailleur public finançait plus tard l'application, des obligations en français pourraient être écrites dans cette entente. Aucune entente de ce genre n'existe.",
            "Le plan a trouvé un conflit sur le nombre de régions désignées. Cette application ne dit pas 25 et elle ne dit pas 27. Ce nombre est Inconnu jusqu'à ce que le règlement actuel soit listé.",
          ],
        },
      ],
    },
  },
  {
    id: "labels",
    topics: ["verification", "unknown"],
    safetyCritical: false,
    does: [
      "Show a verification label, a source, and a date on records the App displays.",
      "Say Unknown when a field was not checked.",
      "Keep peer tips visually separate from measurements.",
    ],
    doesNot: [
      "Use the word verified for a prototype record.",
      "Turn an open-data tag into a measurement.",
      "Guess a doorway width, a transfer side, or an elevator status.",
    ],
    synonyms: {
      en: ["unknown", "verified", "tier", "source", "washroom", "elevator", "toilette"],
      fr: ["inconnu", "vérifié", "niveau", "source", "toilette", "ascenseur", "washroom"],
    },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 5, Day 1 verification tiers",
        retrieved: "2026-11-13",
        limit: "Canonical tiers are 0, 1, 2, 3, 4, and E. Prototype labels are PROTOTYPE-UNVERIFIED, SEEDED-OPEN-DATA, COMMUNITY-REPORTED, and VERIFIED. VERIFIED and tier 3 are not produced by this prototype.",
      },
    ],
    en: {
      title: "Labels and unknowns",
      summary: "Every record shows where it came from, when it was recorded, and how far it has been checked. Missing facts stay Unknown.",
      sections: [
        {
          heading: "The four prototype labels",
          paragraphs: [
            "PROTOTYPE-UNVERIFIED means the record is for the prototype and has not been checked on site.",
            "SEEDED-OPEN-DATA means the record came from a named open dataset. The licence and the download date belong on the record. An open-data wheelchair tag is a mapper's or an agency's statement, not a measurement by the App.",
            "COMMUNITY-REPORTED means a person reported it. It is not a surveyed measurement.",
            "VERIFIED would require evidence this prototype does not create. You should not see VERIFIED on a prototype record.",
            "Canonical tiers, from the shared schema, are 0, 1, 2, 3, 4, and E. They are not the same list as the four prototype labels. A prototype record may carry PROTOTYPE-UNVERIFIED on tier 0 or 1, or SEEDED-OPEN-DATA on tier 0. It cannot carry VERIFIED or tier 3. COMMUNITY-REPORTED is tier 2 and is not used on a prototype record.",
          ],
        },
        {
          heading: "How to read a washroom or an elevator",
          paragraphs: [
            "A washroom line without a measured turning space, transfer side, or adult change table says Unknown for those fields. It does not say accessible.",
            "An elevator line without a live feed says the last check time, or Unknown. It never says the elevator is working right now unless a source and a time are on the screen.",
          ],
        },
      ],
    },
    fr: {
      title: "Étiquettes et inconnus",
      summary: "Chaque fiche montre d'où elle vient, quand elle a été enregistrée et jusqu'où elle a été vérifiée. Les faits manquants restent Inconnus.",
      sections: [
        {
          heading: "Les quatre étiquettes du prototype",
          paragraphs: [
            "PROTOTYPE-UNVERIFIED veut dire que la fiche sert au prototype et n'a pas été vérifiée sur place.",
            "SEEDED-OPEN-DATA veut dire que la fiche vient d'un jeu de données ouvertes nommé. La licence et la date de téléchargement appartiennent à la fiche. Une étiquette de données ouvertes sur un fauteuil roulant est une déclaration d'une personne cartographe ou d'un organisme, pas une mesure de l'application.",
            "COMMUNITY-REPORTED veut dire qu'une personne l'a signalé. Ce n'est pas une mesure d'enquête.",
            "VERIFIED exigerait une preuve que ce prototype ne crée pas. Vous ne devriez pas voir VERIFIED sur une fiche de prototype.",
            "Les niveaux canoniques, du schéma partagé, sont 0, 1, 2, 3, 4 et E. Ce n'est pas la même liste que les quatre étiquettes de prototype. Une fiche de prototype peut porter PROTOTYPE-UNVERIFIED au niveau 0 ou 1, ou SEEDED-OPEN-DATA au niveau 0. Elle ne peut pas porter VERIFIED ni le niveau 3. COMMUNITY-REPORTED est le niveau 2 et n'est pas utilisé sur une fiche de prototype.",
          ],
        },
        {
          heading: "Comment lire une toilette ou un ascenseur",
          paragraphs: [
            "Une ligne de toilette sans espace de rotation mesuré, sans côté de transfert ou sans table à langer pour adulte écrit Inconnu pour ces champs. Elle ne dit pas accessible.",
            "Une ligne d'ascenseur sans flux en direct montre l'heure du dernier contrôle, ou Inconnu. Elle ne dit jamais que l'ascenseur fonctionne maintenant, sauf si une source et une heure sont à l'écran.",
          ],
        },
      ],
    },
  },
  {
    id: "offline",
    topics: ["offline", "help"],
    safetyCritical: false,
    does: [
      "Keep these help articles on the device after the first save.",
      "Show the date the pack was saved.",
      "Leave 911 and the crisis numbers in the saved help pack.",
    ],
    doesNot: [
      "Pretend that a saved elevator status is live.",
      "Download someone else's personal information into the pack.",
      "Require a network connection to read a saved article.",
    ],
    synonyms: {
      en: ["offline", "download", "no signal", "cache", "subway"],
      fr: ["hors ligne", "télécharger", "sans réseau", "cache", "métro"],
    },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 4 feature F-15 and Part 2 consistent-help rule",
        retrieved: "2026-11-13",
        limit: "Trip packs for maps and places are built in other repositories. This package stores help articles only.",
      },
    ],
    en: {
      title: "Offline help",
      summary: "Help articles are saved on this device. You can search them with no signal. Live elevator status is not part of this help pack.",
      sections: [
        {
          heading: "What is saved",
          paragraphs: [
            "The help pack stores the articles, the search words, and the crisis and health numbers that were checked on 13 November 2026. The screen shows the date the pack was saved.",
            "Language choice is stored on the device too. You can switch between English and French while offline.",
          ],
        },
        {
          heading: "What a saved page cannot know",
          paragraphs: [
            "A saved page cannot know if an elevator broke after you saved it. When the rest of the App is offline, it has to say that live status is unavailable.",
            "The pack does not include your reports, your profile, or anyone else's tips.",
          ],
        },
      ],
    },
    fr: {
      title: "Aide hors ligne",
      summary: "Les articles d'aide sont enregistrés sur cet appareil. Vous pouvez les chercher sans réseau. L'état en direct des ascenseurs ne fait pas partie de ce paquet d'aide.",
      sections: [
        {
          heading: "Ce qui est enregistré",
          paragraphs: [
            "Le paquet d'aide garde les articles, les mots de recherche et les numéros de crise et de santé vérifiés le 13 novembre 2026. L'écran montre la date d'enregistrement du paquet.",
            "Le choix de langue est aussi gardé sur l'appareil. Vous pouvez passer du français à l'anglais hors ligne.",
          ],
        },
        {
          heading: "Ce qu'une page enregistrée ne peut pas savoir",
          paragraphs: [
            "Une page enregistrée ne peut pas savoir si un ascenseur est tombé en panne après l'enregistrement. Quand le reste de l'application est hors ligne, elle doit dire que l'état en direct n'est pas disponible.",
            "Le paquet ne contient pas vos signalements, votre profil, ni les conseils d'autres personnes.",
          ],
        },
      ],
    },
  },
  {
    id: "programmes",
    topics: ["benefits", "equipment", "directory"],
    safetyCritical: false,
    does: [
      "Link to official programme pages.",
      "Say who publishes a page and when the App last looked.",
      "Tell you the App cannot say whether you qualify.",
    ],
    doesNot: [
      "Calculate a benefit, a copay, or a grant.",
      "Recommend a wheelchair, a cushion, or a supplier.",
      "List attendant services as a current Spinal Cord Injury Ontario programme. That status is unverified.",
    ],
    synonyms: {
      en: ["odsp", "benefits", "funding", "adp", "equipment", "money", "211"],
      fr: ["posph", "prestations", "financement", "paiement", "équipement", "argent", "211"],
    },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 2 sections 3.4 to 3.6 and Part 4 feature F-10",
        retrieved: "2026-11-13",
        limit: "Dollar amounts in the plan were marked for re-check. This article deliberately omits dollar amounts. Attendant services are unknown U12.",
      },
      {
        title: "211 Ontario",
        url: "https://211ontario.ca/",
        retrieved: "2026-11-13",
        limit: "Link only. Not an open dataset.",
      },
    ],
    en: {
      title: "Money, equipment, and other programmes",
      summary: "The App can point to official pages about income support, equipment funding, and community services. It cannot tell you if you qualify or what you would be paid.",
      sections: [
        {
          heading: "Directory, not a decision",
          paragraphs: [
            "Use the official page for a programme, then talk to that programme or to a community legal clinic. 211 Ontario (https://211ontario.ca/) lists community services. The App does not copy 211's database.",
            "This help article does not print benefit amounts. Amounts change, and a figure without your household details would be misleading.",
            "The App does not recommend a wheelchair or a cushion, and it does not promise that a funder will pay.",
          ],
        },
        {
          heading: "What is not listed",
          paragraphs: [
            "Older directories mentioned attendant services at Spinal Cord Injury Ontario. The FY2025 audited programme list and the February 2026 short directory, as summarised in the master plan, do not name them. The current status is unverified. They are not listed here as a current programme.",
            "Direct Funding is not described as an SCIO service. Confirm the administrator on the official page before you rely on a path.",
          ],
        },
      ],
    },
    fr: {
      title: "Argent, équipement et autres programmes",
      summary: "L'application peut pointer vers des pages officielles sur le soutien du revenu, le financement de l'équipement et les services communautaires. Elle ne peut pas dire si un programme vous accepte ni ce qui vous serait payé.",
      sections: [
        {
          heading: "Un répertoire, pas une décision",
          paragraphs: [
            "Utilisez la page officielle d'un programme, puis parlez à ce programme ou à une clinique juridique communautaire. 211 Ontario (https://211ontario.ca/) liste des services communautaires. L'application ne copie pas la base de 211.",
            "Cet article d'aide n'imprime pas de montants de prestations. Les montants changent, et un chiffre sans les détails de votre ménage serait trompeur.",
            "L'application ne recommande pas un fauteuil roulant ou un coussin, et elle ne promet pas qu'un bailleur paiera.",
          ],
        },
        {
          heading: "Ce qui n'est pas listé",
          paragraphs: [
            "D'anciens répertoires mentionnaient des services de préposés à Spinal Cord Injury Ontario. La liste des programmes des états vérifiés de l'exercice 2025 et le court répertoire de février 2026, tels que résumés dans le plan directeur, ne les nomment pas. Le statut actuel n'est pas vérifié. Ils ne sont pas listés ici comme programme actuel.",
            "Le financement direct n'est pas décrit comme un service de SCIO. Confirmez l'administrateur sur la page officielle avant de vous fier à un chemin.",
          ],
        },
      ],
    },
  },
  {
    id: "complaints",
    topics: ["complaints", "accessibility"],
    safetyCritical: false,
    does: [
      "Describe a complaints path for wrong data, discrimination, privacy, accessibility of the App, and safeguarding.",
      "Say that a complaint is not published as a fact about a place.",
      "Offer this help text in English and French.",
    ],
    doesNot: [
      "Give legal advice.",
      "Label a venue as meeting the Human Rights Code or the AODA.",
      "Promise a response time that nobody is staffed to meet.",
    ],
    synonyms: {
      en: ["complaint", "correction", "aoda", "human rights", "feedback"],
      fr: ["plainte", "correction", "aoda", "droits de la personne", "commentaire"],
    },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 2 sections 4.6 and 6",
        retrieved: "2026-11-13",
        limit: "The plan proposes a one-business-day acknowledgement. It is not staffed. The Integrated Accessibility Standards Regulation's WCAG version was marked unknown U69.",
      },
    ],
    en: {
      title: "Complaints and corrections",
      summary: "You can report a wrong record, a discriminatory comment, a privacy problem, or a barrier in the App itself. A report is not automatically a fact about a place. No one is staffed to answer in this prototype.",
      sections: [
        {
          heading: "What you can challenge",
          paragraphs: [
            "Wrong venue data, a peer tip, a privacy problem, an accessibility failure in the App, and a safeguarding concern each need a person to read them. Software can sort the queue. It cannot close a safety report alone.",
            "A venue can dispute a record. The App must not delete a checked fact only because the venue asked. Until a new check, both the record and the dispute should stay visible, with dates. That workflow is specified. It is not operating on live places in this repository.",
          ],
        },
        {
          heading: "Laws the App will not apply for you",
          paragraphs: [
            "The App does not decide whether a place meets the Accessibility for Ontarians with Disabilities Act or the Human Rights Code. Those are legal questions.",
            "The design target for the App itself is WCAG 2.2 Level AA. An automated scan does not prove that target. A conformance claim needs an audit and testing with people with a spinal cord injury. This prototype does not make that claim.",
            "Official complaint routes, including the Ontario Human Rights Commission and community legal clinics, should be opened from their own sites. This article does not give legal advice.",
          ],
        },
      ],
    },
    fr: {
      title: "Plaintes et corrections",
      summary: "Vous pouvez signaler une fiche erronée, un commentaire discriminatoire, un problème de vie privée ou un obstacle dans l'application elle-même. Un signalement n'est pas automatiquement un fait sur un lieu. Personne n'est en poste pour répondre dans ce prototype.",
      sections: [
        {
          heading: "Ce que vous pouvez contester",
          paragraphs: [
            "Une donnée de lieu erronée, un conseil de pair, un problème de vie privée, un échec d'accessibilité dans l'application et une préoccupation de protection doivent chacun être lus par une personne. Le logiciel peut trier la file. Il ne peut pas fermer seul un signalement de sécurité.",
            "Un lieu peut contester une fiche. L'application ne doit pas effacer un fait vérifié seulement parce que le lieu l'a demandé. Jusqu'à une nouvelle vérification, la fiche et la contestation devraient rester visibles, avec les dates. Ce flux est spécifié. Il ne fonctionne pas sur des lieux réels dans ce dépôt.",
          ],
        },
        {
          heading: "Des lois que l'application n'applique pas à votre place",
          paragraphs: [
            "L'application ne décide pas si un lieu respecte la Loi sur l'accessibilité pour les personnes handicapées de l'Ontario ou le Code des droits de la personne. Ce sont des questions juridiques.",
            "La cible de conception de l'application elle-même est les WCAG 2.2 niveau AA. Un balayage automatique ne prouve pas cette cible. Une déclaration de conformité exige un audit et des essais avec des personnes ayant une lésion médullaire. Ce prototype ne fait pas cette déclaration.",
            "Les voies de plainte officielles, y compris la Commission ontarienne des droits de la personne et les cliniques juridiques communautaires, doivent être ouvertes sur leurs propres sites. Cet article ne donne pas d'avis juridique.",
          ],
        },
      ],
    },
  },
  {
    id: "journey-planner",
    topics: ["journey"],
    safetyCritical: false,
    does: [
      "Describe a journey as separate legs, including the approach from the stop to the door.",
      "Label times as scheduled unless a live source and a time are on the screen.",
      "Say Unknown when the approach was not checked.",
    ],
    doesNot: [
      "Assume a route is step-free because a station and a venue both say accessible.",
      "Call a scheduled time live or real-time.",
      "Plan a journey inside this help package. The planner is not in this repository.",
    ],
    synonyms: { en: ["journey", "route", "trip", "step-free"], fr: ["trajet", "itinéraire", "sans marche"] },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 5, Days 4 and 5",
        retrieved: "2026-11-13",
        limit: "This repository does not contain the route engine or seeded places.",
      },
    ],
    en: {
      title: "Journey planner",
      summary: "A journey in the App is a chain of legs with sources. This help package does not plan a trip. It explains the rules the planner has to follow.",
      sections: [
        {
          heading: "How a plan should read",
          paragraphs: [
            "Each leg needs a step-free label and a source. The walk or roll from the transit stop to the door is its own leg. If that approach was not checked, the leg says Unknown and names the gap.",
            "Times from a timetable are scheduled. They are not live unless a live feed is named and timed.",
          ],
        },
        {
          heading: "What this package cannot do",
          paragraphs: [
            "There is no map and no router here. If you expected a trip plan, it is not available in the help centre.",
            "A plan must not use an able-bodied walking time as if it were your trip.",
          ],
        },
      ],
    },
    fr: {
      title: "Planificateur de trajet",
      summary: "Un trajet dans l'application est une chaîne d'étapes avec des sources. Ce paquet d'aide ne planifie pas un déplacement. Il explique les règles que le planificateur doit suivre.",
      sections: [
        {
          heading: "Comment un plan devrait se lire",
          paragraphs: [
            "Chaque étape a besoin d'une étiquette sans marche et d'une source. Le chemin du point de transport jusqu'à la porte est une étape à part. Si ce chemin n'a pas été vérifié, l'étape dit Inconnu et nomme le manque.",
            "Les heures d'un horaire sont prévues. Elles ne sont pas en direct, sauf si un flux en direct est nommé et horodaté.",
          ],
        },
        {
          heading: "Ce que ce paquet ne peut pas faire",
          paragraphs: [
            "Il n'y a pas de carte ni de routeur ici. Si vous attendiez un plan de trajet, il n'est pas disponible dans le centre d'aide.",
            "Un plan ne doit pas utiliser un temps de marche sans contrainte comme s'il s'agissait de votre trajet.",
          ],
        },
      ],
    },
  },
  {
    id: "finders",
    topics: ["washroom", "parking"],
    safetyCritical: false,
    does: [
      "Explain that a finder result needs a tier, a source, and a date.",
      "Say when a filter removed results, and why.",
      "Tell you to widen a filter when nothing matched.",
    ],
    doesNot: [
      "Show whether a washroom is open, clean, or free right now.",
      "Show whether a parking space is free right now.",
      "Invent a washroom or a parking space. This package has no finder database.",
    ],
    synonyms: { en: ["finder", "washroom", "parking", "toilet"], fr: ["chercheur", "toilette", "stationnement"] },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 5, Days 7 and 8",
        retrieved: "2026-11-13",
        limit: "Finder data lives in other repositories. None is loaded here.",
      },
    ],
    en: {
      title: "Finders",
      summary: "Washroom and parking finders, when they exist, show what was checked and what is Unknown. They do not show live availability. This help package does not search places.",
      sections: [
        {
          heading: "Washrooms",
          paragraphs: [
            "A washroom result should show measurements that were actually taken, the tier, the source, and the date. Turning space, transfer side, and an adult change table stay Unknown until they are measured.",
            "The finder does not know if the room is unlocked, clean, or in service. Those facts change during the day and are not in a static record.",
          ],
        },
        {
          heading: "Parking",
          paragraphs: [
            "A parking result should show the distance to the entrance if it was measured, the type of space if it was checked, and the payment rules from a source.",
            "It does not know if a space is free now. Payment and reservation rules have to be checked with the operator.",
          ],
        },
      ],
    },
    fr: {
      title: "Outils de recherche",
      summary: "Les recherches de toilettes et de stationnement, quand elles existent, montrent ce qui a été vérifié et ce qui est Inconnu. Elles ne montrent pas la disponibilité en direct. Ce paquet d'aide ne cherche pas de lieux.",
      sections: [
        {
          heading: "Toilettes",
          paragraphs: [
            "Un résultat de toilette devrait montrer les mesures réellement prises, le niveau, la source et la date. L'espace de rotation, le côté de transfert et une table à langer pour adulte restent Inconnus tant qu'ils ne sont pas mesurés.",
            "L'outil ne sait pas si la pièce est ouverte, propre ou en service. Ces faits changent dans la journée et ne sont pas dans une fiche statique.",
          ],
        },
        {
          heading: "Stationnement",
          paragraphs: [
            "Un résultat de stationnement devrait montrer la distance jusqu'à l'entrée si elle a été mesurée, le type de place s'il a été vérifié, et les règles de paiement d'une source.",
            "Il ne sait pas si une place est libre maintenant. Les règles de paiement et de réservation doivent être vérifiées auprès de l'exploitant.",
          ],
        },
      ],
    },
  },
  {
    id: "profile",
    topics: ["profile"],
    safetyCritical: false,
    does: [
      "Let you set optional functional preferences, such as chair type or transfer side, when a profile exists.",
      "Keep those preferences on the device.",
      "Let you delete them.",
    ],
    doesNot: [
      "Ask for an injury level, a diagnosis, a medication, or a health history.",
      "Require a profile to read help or to see a public place fact.",
      "Store a profile in this help package. There is no profile database here.",
    ],
    synonyms: { en: ["profile", "chair", "preferences"], fr: ["profil", "fauteuil", "préférences"] },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 2 section 5.4 and Part 5 Day 6",
        retrieved: "2026-11-13",
        limit: "Profile storage is specified for the device. It is not implemented in this package.",
      },
    ],
    en: {
      title: "Profile",
      summary: "A profile, when you choose one, stores functional preferences you enter. It does not store a diagnosis. This help package does not keep a profile.",
      sections: [
        {
          heading: "What a profile is for",
          paragraphs: [
            "Chair type, transfer side, whether an attendant is travelling, charging need, language, and display preferences can change what a planner shows. They are optional.",
            "You should be able to keep more than one set and switch. Nothing here asks you to pick a single disability identity.",
          ],
        },
        {
          heading: "What stays out",
          paragraphs: [
            "Level, completeness, cause of injury, medications, and bladder or bowel timing are not profile fields.",
            "Core help works with no profile. Deleting a profile, when one exists, has to remove the stored fields and say so.",
          ],
        },
      ],
    },
    fr: {
      title: "Profil",
      summary: "Un profil, si vous en choisissez un, garde les préférences fonctionnelles que vous entrez. Il ne garde pas un diagnostic. Ce paquet d'aide ne conserve pas de profil.",
      sections: [
        {
          heading: "À quoi sert un profil",
          paragraphs: [
            "Le type de fauteuil, le côté de transfert, la présence d'une personne accompagnatrice, le besoin de recharge, la langue et l'affichage peuvent changer ce qu'un planificateur montre. Ils sont facultatifs.",
            "Vous devriez pouvoir garder plus d'un ensemble et changer. Rien ici ne vous demande de choisir une seule identité de handicap.",
          ],
        },
        {
          heading: "Ce qui reste dehors",
          paragraphs: [
            "Le niveau, le caractère complet, la cause de la lésion, les médicaments et les horaires de vessie ou d'intestin ne sont pas des champs de profil.",
            "L'aide de base fonctionne sans profil. Supprimer un profil, quand il existe, doit effacer les champs enregistrés et le dire.",
          ],
        },
      ],
    },
  },
  {
    id: "games-hub",
    topics: ["games"],
    safetyCritical: false,
    does: [
      "Name the ten starter activities the plan allows.",
      "State that scores, if a game exists, stay on the device.",
      "Say the games are not in this repository.",
    ],
    doesNot: [
      "Claim a game is therapy, treatment, or a medical assessment.",
      "Use another company's game names.",
      "Show a score to anyone else.",
    ],
    synonyms: { en: ["games", "memory", "practice"], fr: ["jeux", "mémoire", "pratique"] },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 5, the ten starter games",
        retrieved: "2026-11-13",
        limit: "The games are assigned to another repository. This article only names them and states the limits.",
      },
    ],
    en: {
      title: "Games hub",
      summary: "The plan names ten original activities. They are not therapy. They are not in this help package, so you cannot play them here.",
      sections: [
        {
          heading: "The ten names",
          paragraphs: [
            "The names are Grid Recall, Pair Sequence, Route Planner, Pattern Rules, Word Roots Builder, Number Compare, Focus Flankers, Switch Rules, Shape Assembly, and Order Keeper.",
            "Each one, when it is built, needs a notice that it is not health care. Practice mode should not show a score. Timing should not be required.",
          ],
        },
        {
          heading: "Where they are",
          paragraphs: [
            "This repository does not include the games. A missing game is not a hidden failure of the help centre. It is out of scope for this package.",
            "Scores must not leave the device, and they must not be tied to a health record.",
          ],
        },
      ],
    },
    fr: {
      title: "Espace des jeux",
      summary: "Le plan nomme dix activités originales. Ce n'est pas une thérapie. Elles ne sont pas dans ce paquet d'aide, donc vous ne pouvez pas y jouer ici.",
      sections: [
        {
          heading: "Les dix noms",
          paragraphs: [
            "Les noms sont Grid Recall, Pair Sequence, Route Planner, Pattern Rules, Word Roots Builder, Number Compare, Focus Flankers, Switch Rules, Shape Assembly et Order Keeper.",
            "Chacune, quand elle est construite, a besoin d'un avis qu'elle n'est pas un soin. Le mode pratique ne devrait pas montrer un score. Un chronomètre ne devrait pas être obligatoire.",
          ],
        },
        {
          heading: "Où elles sont",
          paragraphs: [
            "Ce dépôt n'inclut pas les jeux. Un jeu absent n'est pas un échec caché du centre d'aide. Il est hors du champ de ce paquet.",
            "Les scores ne doivent pas quitter l'appareil, et ils ne doivent pas être liés à un dossier de santé.",
          ],
        },
      ],
    },
  },
  {
    id: "community-skeleton",
    topics: ["community"],
    safetyCritical: false,
    does: [
      "Link to Spinal Cord Injury Ontario programme pages.",
      "Show three demonstration events with demonstration labels.",
      "Explain the staffing a live community would need, and say it is not running.",
    ],
    doesNot: [
      "Replace SCIO services or claim SCIO has endorsed the App.",
      "Take event registrations inside the App.",
      "Offer messages or mentor matching on the prototype screens.",
    ],
    synonyms: { en: ["skeleton", "directory", "moderation"], fr: ["squelette", "répertoire", "modération"] },
    translation: translation("draft_plain_language"),
    machineTranslated: false,
    sources: [
      {
        title: "Master plan Part 5, Day 16",
        retrieved: "2026-11-13",
        limit: "The governed review practice is a separate screen and is not a live community.",
      },
    ],
    en: {
      title: "Community skeleton",
      summary: "The prototype community screens link out, show demonstration events, and explain moderation. They do not run a live community.",
      sections: [
        {
          heading: "What you can open",
          paragraphs: [
            "The directory lists programme areas from public and audited descriptions, with unknowns named. Each row links to the SCIO website.",
            "The events screen has three demonstration listings. Registration goes to the organisation's site.",
            "The safety screen repeats that moderation is not running.",
          ],
        },
        {
          heading: "The practice queue",
          paragraphs: [
            "A separate practice screen can hold a tip on this device so the review steps can be tested. It is not in the prototype navigation. It does not send the tip to anyone else.",
            "If that practice screen is unstaffed, the public line stays: community tips are not yet available.",
          ],
        },
      ],
    },
    fr: {
      title: "Squelette communautaire",
      summary: "Les écrans communautaires du prototype renvoient ailleurs, montrent des événements de démonstration et expliquent la modération. Ils ne font pas fonctionner une communauté.",
      sections: [
        {
          heading: "Ce que vous pouvez ouvrir",
          paragraphs: [
            "Le répertoire liste des groupes de programmes à partir de descriptions publiques et d'états vérifiés, avec les inconnus nommés. Chaque ligne renvoie au site de SCIO.",
            "L'écran des événements a trois fiches de démonstration. L'inscription va sur le site de l'organisme.",
            "L'écran de sécurité répète que la modération ne fonctionne pas.",
          ],
        },
        {
          heading: "La file d'exercice",
          paragraphs: [
            "Un écran d'exercice séparé peut garder un conseil sur cet appareil pour tester les étapes de revue. Il n'est pas dans la navigation du prototype. Il n'envoie le conseil à personne d'autre.",
            "Si cet écran d'exercice n'est pas doté, la ligne publique reste : les conseils communautaires ne sont pas encore disponibles.",
          ],
        },
      ],
    },
  },
];

const DATA_USES: Record<string, readonly string[]> = {
  "what-the-app-is": ["No personal data. The article is bundled text."],
  "get-help-now": ["Bundled help text and the signpost list checked on 13 November 2026. No crisis disclosure is stored."],
  "crisis-support": ["Bundled help text and the 9-8-8 and ConnexOntario contacts. The App does not store what you might have typed about a crisis."],
  "health-concerns": ["Bundled help text and the Health811 contact. No symptom log and no health record."],
  privacy: ["No account is required to read this article. The article does not collect a profile."],
  "indigenous-data": ["No identity data. No reserve or Nation records are included."],
  "peer-tips": ["A practice tip stays on the device until you clear it. Public tips are not served from a server in this package."],
  events: ["Three hand-entered demonstration event records. No attendance list and no registration data."],
  reporting: ["A practice report stays on the device. The reporter token is not copied onto the public tip."],
  languages: ["The language choice is stored on the device under a local key. It is not sent to a server."],
  labels: ["The article explains labels. It does not load place records."],
  offline: ["The help pack stored in on-device IndexedDB or memory, with the save time. No location history."],
  programmes: ["Bundled descriptions and a link to public websites. No eligibility data and no benefit amounts."],
  complaints: ["Bundled policy text. No complaints inbox is staffed in this package."],
  "journey-planner": ["No trip data in this package. A future planner would use place, route, and timetable records with sources and dates."],
  finders: ["No washroom or parking records in this package. A future finder would use sourced records with tiers and dates."],
  profile: ["No profile is stored here. A future profile would be optional functional fields on the device, not a health record."],
  "games-hub": ["No scores and no game state in this package. A future game would keep scores on the device only."],
  "community-skeleton": ["Programme text, three demonstration events, and the moderation explainer. No live posts on the skeleton screens."],
};

function assertDataUses(id: string): string[] {
  const uses = DATA_USES[id];
  if (!uses || uses.length === 0) {
    throw new Error(`Missing data-uses list for ${id}`);
  }
  return [...uses];
}

export const HELP_ARTICLES: readonly HelpArticle[] = ARTICLE_DRAFTS.map((article) => {
  const french = FR_BOUNDARIES[article.id];
  if (!french) {
    throw new Error(`Missing French boundaries for ${article.id}`);
  }
  const languages: Language[] = ["en", "fr"];
  for (const language of languages) {
    const list = language === "en" ? { does: article.does, doesNot: article.doesNot } : french;
    if (list.does.length !== article.does.length || list.doesNot.length !== article.doesNot.length) {
      throw new Error(`French boundary length mismatch for ${article.id}`);
    }
  }
  if (french.dataUses.length === 0 || french.sources.length !== article.sources.length) {
    throw new Error(`French source or data-uses mismatch for ${article.id}`);
  }
  return {
    ...article,
    machineTranslated: false,
    does: { en: [...article.does], fr: [...french.does] },
    doesNot: { en: [...article.doesNot], fr: [...french.doesNot] },
    dataUses: { en: assertDataUses(article.id), fr: [...french.dataUses] },
    sources: article.sources.map((source, index) => {
      const translated = french.sources[index];
      if (!translated) {
        throw new Error(`Missing French source ${index} for ${article.id}`);
      }
      return {
        title: { en: source.title, fr: translated.title },
        ...(source.url ? { url: source.url } : {}),
        retrieved: source.retrieved,
        limit: { en: source.limit, fr: translated.limit },
      };
    }),
  };
});

export const HELP_PACK_ID = "help-pack-2026-11-13";
