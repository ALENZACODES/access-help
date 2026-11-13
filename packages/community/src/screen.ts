export type HoldCode =
  | "medical_advice"
  | "transfer_instruction"
  | "equipment_recommendation"
  | "benefits_decision"
  | "personal_health"
  | "personal_data"
  | "harassment"
  | "reidentification"
  | "not_on_topic";

export type ScreenResult =
  | { decision: "allow" }
  | { decision: "hold"; codes: HoldCode[] }
  | { decision: "crisis" };

interface Rule {
  code: HoldCode;
  pattern: RegExp;
}

const HOLD_RULES: readonly Rule[] = [
  { code: "medical_advice", pattern: /\bcatheteri[sz]e\b|\bcatheter\b|\bsondage\b|\bsuppositor(y|ies)\b|\b\d+\s?mg\b|\bpressure (sore|injury|ulcer)\b|\bplaie de pression\b|\bbowel programme\b|\bprogramme intestinal\b|\bm[ée]dicament\b|\bmedication\b/i },
  { code: "transfer_instruction", pattern: /\bhow to transfer\b|\btransfer technique\b|\bslide board\b|\btechnique de transfert\b|\bplanche de transfert\b/i },
  { code: "equipment_recommendation", pattern: /\bi recommend (a|the|this) (chair|cushion|wheelchair)\b|\byou should (buy|get) (a |this )?(chair|cushion|wheelchair)\b|\bje recommande (un|une|le|la|ce|cette)\b/i },
  { code: "benefits_decision", pattern: /\byou (are eligible|qualify)\b|\bvous êtes admissible\b|\byour odsp (payment|amount|will be)\b/i },
  { code: "personal_health", pattern: /\bmy diagnosis\b|\bmon diagnostic\b|\bAIS [A-E]\b|\bcomplete injury at [cCtTlLsS]\d/i },
  { code: "personal_data", pattern: /\bOHIP\b|\bhealth card\b|\bcarte sant[ée]\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/i },
  { code: "harassment", pattern: /\b(i will )?(kill|hurt) you\b|\bi hate you\b|\bje vais te tuer\b|\bje te d[ée]teste\b/i },
];

const CRISIS = /\b(suicide|suicidal|kill myself|want to die|end my life|self-harm)\b|\b(me suicider|envie de mourir|automutilation)\b/i;

const REIDENTIFICATION = /\bonly (person|wheelchair user) (in|with)\b|\bthe only one with\b|\bla seule personne\b/i;

/**
 * Screen a tip before it can be queued or published.
 * Crisis text is not a hold: the caller must not store it.
 * A hold still needs a person. Software cannot publish it.
 */
export function screenTip(text: string, options?: { smallCommunity?: boolean }): ScreenResult {
  if (CRISIS.test(text)) {
    return { decision: "crisis" };
  }
  const codes = new Set<HoldCode>();
  for (const rule of HOLD_RULES) {
    if (rule.pattern.test(text)) {
      codes.add(rule.code);
    }
  }
  if (options?.smallCommunity && REIDENTIFICATION.test(text)) {
    codes.add("reidentification");
  }
  if (codes.size === 0) {
    return { decision: "allow" };
  }
  return { decision: "hold", codes: [...codes] };
}

const REASONS: Record<HoldCode, { en: string; fr: string }> = {
  medical_advice: {
    en: "This tip reads as health advice. The App cannot publish it. A clinician, not a peer tip, is the right place for that question. Call Health811 at 811 for a non-urgent health question, or 911 in an emergency.",
    fr: "Ce conseil ressemble à un avis de santé. L'App ne peut pas le publier. Un clinicien, pas un conseil de pair, est le bon endroit pour cette question. Appelez Health811 au 811 pour une question non urgente, ou le 911 en cas d'urgence.",
  },
  transfer_instruction: {
    en: "This tip tells someone how to transfer. The App can record measurements of a place. It cannot teach a transfer.",
    fr: "Ce conseil dit à quelqu'un comment faire un transfert. L'App peut noter les mesures d'un lieu. Elle ne peut pas enseigner un transfert.",
  },
  equipment_recommendation: {
    en: "This tip recommends equipment. The App lists programmes and vendors only when a sourced directory says so. It does not recommend a chair or a cushion.",
    fr: "Ce conseil recommande de l'équipement. L'App liste des programmes et des fournisseurs seulement quand un répertoire sourcé le dit. Elle ne recommande pas un fauteuil ou un coussin.",
  },
  benefits_decision: {
    en: "This tip decides a benefit or a payment. The App cannot say whether someone qualifies.",
    fr: "Ce conseil décide d'une prestation ou d'un paiement. L'App ne peut pas dire si une personne est acceptée par un programme.",
  },
  personal_health: {
    en: "This tip includes personal health detail. Take that out. You do not need to share a diagnosis to describe a place.",
    fr: "Ce conseil contient un détail de santé personnel. Retirez-le. Vous n'avez pas à partager un diagnostic pour décrire un lieu.",
  },
  personal_data: {
    en: "This tip includes contact or identity information, such as an email, a phone number, or a health card. Take that out.",
    fr: "Ce conseil contient un moyen de contact ou un identifiant, comme un courriel, un téléphone ou une carte Santé. Retirez-le.",
  },
  harassment: {
    en: "This tip attacks a person. It cannot be published.",
    fr: "Ce conseil s'en prend à une personne. Il ne peut pas être publié.",
  },
  reidentification: {
    en: "In a small community this tip could identify someone. Remove the identifying detail, or keep the tip private.",
    fr: "Dans une petite communauté, ce conseil pourrait identifier quelqu'un. Retirez le détail identifiant, ou gardez le conseil privé.",
  },
  not_on_topic: {
    en: "This tip does not describe a place, a route, or a practical non-clinical detail. It was not published.",
    fr: "Ce conseil ne décrit pas un lieu, un trajet ou un détail pratique non clinique. Il n'a pas été publié.",
  },
};

export function reasonFor(code: HoldCode): { en: string; fr: string } {
  return REASONS[code];
}

export function reasonsFor(codes: readonly HoldCode[]): { en: string; fr: string } {
  return {
    en: codes.map((code) => REASONS[code].en).join(" "),
    fr: codes.map((code) => REASONS[code].fr).join(" "),
  };
}
