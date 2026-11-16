import { screenRequestText } from "../screen.js";
import type { HoldCode } from "../types.js";

export type ConnectHoldCode = HoldCode | "health_detail";

export type ConnectScreenResult =
  | { decision: "allow" }
  | { decision: "hold"; codes: ConnectHoldCode[] }
  | { decision: "crisis" };

/**
 * Diagnosis labels, injury levels and other health details that a peer-connection
 * request must not collect. Text is lower-cased and stripped of accents first, so the
 * patterns carry no accents. A match is a refusal to keep the text, never a judgement
 * about the person.
 */
const HEALTH_DETAIL = new RegExp(
  [
    "\\b(",
    [
      "paraplegi\\w*",
      "quadriplegi\\w*",
      "tetraplegi\\w*",
      "hemiplegi\\w*",
      "paralys\\w*",
      "paralyz\\w*",
      "spinal cord",
      "moelle epiniere",
      "medullaire\\w*",
      "lesions?",
      "injury levels?",
      "level of (my |the )?injury",
      "niveau de (la |ma )?(lesion|blessure)",
      "(complete|incomplete) (injury|injuries)",
      "(blessure|lesion) (complete|incomplete)",
      "asia [a-e]",
      "[ctls]-?\\d{1,2}",
      "cervical\\w*",
      "thoracic",
      "thoracique",
      "lumbar",
      "lombaire",
      "sacral",
      "vertebr\\w*",
      "surger\\w*",
      "chirurgi\\w*",
      "hospital\\w*",
      "hopital|hopitaux",
      "rehab\\w*",
      "readaptation",
      "condition medicale|medical conditions?",
      "disorders?",
      "syndromes?",
      "disease\\w*",
      "maladies?",
      "depress\\w*",
      "anxiety|anxiete",
      "ptsd",
      "amputat\\w*",
      "strokes?",
      "avc",
      "sclerosis|sclerose",
      "spina bifida",
      "cancers?",
    ].join("|"),
    ")\\b",
  ].join(""),
);

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Screen the optional note of a peer-connection request.
 * Crisis wording wins over everything and the text must not be kept.
 * The package's clinical and contact-detail rules still apply; this adds the
 * diagnosis-label and injury-level rule on top of them.
 */
export function screenConnectText(text: string): ConnectScreenResult {
  const base = screenRequestText(text);
  if (base.decision === "crisis") {
    return base;
  }
  const codes: ConnectHoldCode[] = base.decision === "hold" ? [...base.codes] : [];
  if (HEALTH_DETAIL.test(fold(text))) {
    codes.push("health_detail");
  }
  return codes.length === 0 ? { decision: "allow" } : { decision: "hold", codes };
}
