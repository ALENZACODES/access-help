import type { HoldCode } from "./types.js";

export type ScreenResult =
  | { decision: "allow" }
  | { decision: "hold"; codes: HoldCode[] }
  | { decision: "crisis" };

/**
 * Clinical boundaries, matching the help centre: no diagnosis, treatment, catheter,
 * wound, bowel/bladder, pain, spasm or medication content. Text is lower-cased and
 * stripped of accents before matching, so patterns carry no accents.
 */
const MEDICAL =
  /\b(diagnos\w*|treat(ment|ments|ing)?|therap(y|ie|ies)|traitement\w*|cathe\w*|sondage|wounds?|plaies?|pressure (sore|sores|injur\w*|ulcers?)|escarres?|bowel\w*|bladder|intestin\w*|vessie|vesical|urinary|urinaire|medications?|medicaments?|medicines?|prescri\w+|doses?|dosage|\d+\s?mg|suppositor\w+|spasms?|spasmes?|pains?|douleurs?|skin checks?|autonomic dysreflexia|dysreflexie|infection\w*|symptoms?|symptomes?)\b/;

const CRISIS =
  /\b(suicide|suicidal|suicid\w*|kill myself|want to die|end my life|self[- ]?harm|me suicider|envie de mourir|automutilation)\b/;

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/;
const PHONE = /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/;
const URL = /\bhttps?:\/\/|\bwww\./;

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Screen free text in a peer request.
 * Crisis wins over every other outcome and the text must not be stored.
 * A hold is a refusal: there is no moderator in this slice to release it.
 */
export function screenRequestText(text: string): ScreenResult {
  const folded = fold(text);
  if (CRISIS.test(folded)) {
    return { decision: "crisis" };
  }
  const codes: HoldCode[] = [];
  if (MEDICAL.test(folded)) {
    codes.push("medical_advice");
  }
  if (EMAIL.test(folded) || PHONE.test(folded) || URL.test(folded)) {
    codes.push("personal_data");
  }
  return codes.length === 0 ? { decision: "allow" } : { decision: "hold", codes };
}
