/**
 * Official crisis and health signposts checked on 13 November 2026.
 * Re-check before any release. Do not add a number that is not in this file.
 * The App is not a crisis service, a health service, or a counsellor.
 */
export interface Signpost {
  id: string;
  name: { en: string; fr: string };
  /** Digits or short code as published. */
  contact: string;
  /** How to use it, in both languages. */
  how: { en: string; fr: string };
  url?: string;
  retrieved: string;
  sourceNote: string;
}

export const SIGNPOSTS_RETRIEVED = "2026-11-13";

export const SIGNPOSTS: readonly Signpost[] = [
  {
    id: "emergency-911",
    name: { en: "Emergency services", fr: "Services d'urgence" },
    contact: "911",
    how: {
      en: "Call 911 if you or someone else is in immediate danger, is badly hurt, or needs an ambulance. Do not answer questions in the App first.",
      fr: "Composez le 911 si vous ou une autre personne êtes en danger immédiat, gravement blessé, ou avez besoin d'une ambulance. Ne répondez pas d'abord à des questions dans l'application.",
    },
    retrieved: SIGNPOSTS_RETRIEVED,
    sourceNote:
      "911 is the emergency number used across Ontario. This draft does not re-state a local police or fire non-emergency number.",
  },
  {
    id: "suicide-crisis-988",
    name: { en: "9-8-8 Suicide Crisis Helpline", fr: "Ligne d'aide en cas de crise de suicide 9-8-8" },
    contact: "9-8-8",
    how: {
      en: "Call or text 9-8-8, any time, in English or French. If your safety is at risk, the 9-8-8 site says to call 911 right away. The App does not ask you to describe the crisis, and it does not store a crisis disclosure.",
      fr: "Appelez ou textez le 9-8-8, en tout temps, en français ou en anglais. Si votre sécurité est en jeu, le site 9-8-8 dit d'appeler le 911 tout de suite. L'application ne vous demande pas de décrire la crise et n'enregistre pas une divulgation de crise.",
    },
    url: "https://988.ca/",
    retrieved: SIGNPOSTS_RETRIEVED,
    sourceNote:
      "Official page https://988.ca/ retrieved 13 November 2026. It offers call and text, 24 hours a day, and an English or French choice. This is not a claim about wait times.",
  },
  {
    id: "health811",
    name: { en: "Health811", fr: "Health811" },
    contact: "811",
    how: {
      en: "Call 811 for non-urgent health information and advice from a registered nurse, 24 hours a day. TTY: 711 (you need a TTY device). The Health811 calling page says people in northern Ontario using a VoIP phone can dial 1-866-797-0000. If you need immediate medical help, call 911. The App does not give health advice.",
      fr: "Composez le 811 pour de l'information et des conseils de santé non urgents d'une infirmière ou d'un infirmier, 24 heures sur 24. ATS : 711 (il faut un appareil ATS). La page d'appel de Health811 indique que les personnes du Nord de l'Ontario qui utilisent un téléphone VoIP peuvent composer le 1-866-797-0000. En cas d'urgence médicale, composez le 911. L'application ne donne pas de conseil de santé.",
    },
    url: "https://health811.ontario.ca/static/guest/contact-us",
    retrieved: SIGNPOSTS_RETRIEVED,
    sourceNote:
      "Health811 contact page (updated 30 June 2026 on that page) and the calling-help page, retrieved 13 November 2026. ontario.ca/page/your-health also lists Call 811 (TTY 711), page updated 3 February 2026. The old ontario.ca/page/health811 address returned 404 on 13 November 2026.",
  },
  {
    id: "connexontario",
    name: { en: "ConnexOntario", fr: "ConnexOntario" },
    contact: "1-866-531-2600",
    how: {
      en: "ConnexOntario's site lists a free, confidential phone line at 1-866-531-2600, 24 hours a day, for information about mental health, addiction, and problem gambling services in Ontario. Text CONNEX to 247247 is also listed (carrier rates may apply). This is information and referral, not care from the App.",
      fr: "Le site de ConnexOntario indique une ligne téléphonique gratuite et confidentielle au 1-866-531-2600, 24 heures sur 24, pour de l'information sur les services de santé mentale, de dépendance et de jeu en Ontario. Le texto CONNEX au 247247 est aussi indiqué (des frais du fournisseur peuvent s'appliquer). C'est de l'information et une orientation, pas des soins de l'application.",
    },
    url: "https://connexontario.ca/contact-us/",
    retrieved: SIGNPOSTS_RETRIEVED,
    sourceNote:
      "ConnexOntario contact and services pages retrieved 13 November 2026. The App does not operate this line.",
  },
  {
    id: "poison-centre",
    name: { en: "Ontario Poison Centre", fr: "Centre antipoison de l'Ontario" },
    contact: "1-800-268-9017",
    how: {
      en: "Health811's calling page says: for suspected poisoning, call the Ontario Poison Centre at 1-800-268-9017. The App has not opened a separate poison-centre page for this draft.",
      fr: "La page d'appel de Health811 indique : en cas d'empoisonnement soupçonné, appelez le Centre antipoison de l'Ontario au 1-800-268-9017. Pour cette ébauche, l'application n'a pas ouvert une page distincte du centre antipoison.",
    },
    url: "https://health811.ontario.ca/static/guest/help-centre/calling-health811-help-centre",
    retrieved: SIGNPOSTS_RETRIEVED,
    sourceNote: "Number as stated on the Health811 calling page retrieved 13 November 2026, not from a separate poison-centre page.",
  },
  {
    id: "two-one-one",
    name: { en: "211 Ontario", fr: "211 Ontario" },
    contact: "211",
    how: {
      en: "211 Ontario is a directory of community and social services. The App links to the official site. It does not copy the 211 database and it does not decide whether you qualify for a service.",
      fr: "211 Ontario est un répertoire de services communautaires et sociaux. L'application renvoie au site officiel. Elle ne copie pas la base de 211 et elle ne décide pas si vous êtes admissible à un service.",
    },
    url: "https://211ontario.ca/",
    retrieved: SIGNPOSTS_RETRIEVED,
    sourceNote:
      "Link only. The November 2026 scout log found no open-data licence for 211 Ontario. Do not scrape it.",
  },
] as const;

export function signpost(id: string): Signpost {
  const found = SIGNPOSTS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown signpost: ${id}`);
  }
  return found;
}
