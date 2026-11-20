import { FACT_KEYS, OPEN_LICENCES, isIsoDate, type FactKey, type Tri } from "./facts";
import { isoDate, toNote, validateForm, type FieldError, type FormValues, type IdMaker, defaultIdMaker } from "./form";
import { LIMITS, type Note } from "./model";

/**
 * Reading a place's own accessibility page. The person pastes the text; the
 * App splits it into sentences and, for each of its four details, lists the
 * sentences that mention it, with a cue about the words used:
 *
 * - "has": words that usually mean the place has it ("step-free entrance",
 *   "there is an elevator", "toilettes accessibles");
 * - "lacks": words that usually mean it does not ("no elevator", "pas
 *   d'ascenseur", "steps at the entrance");
 * - "changes": words about something that comes and goes ("out of service",
 *   "temporairement", "under repair");
 * - "mentions": the detail is named, with no clear cue either way.
 *
 * This only looks for words. It does not decide anything and can be wrong, so
 * every detail starts as UNKNOWN and only the person can change it, after
 * reading the sentences. Nothing pasted is kept: only the note the person
 * chooses to save, built by the same `toNote` as the add-a-note form.
 */
export type Cue = "has" | "lacks" | "changes" | "mentions";

export const CUES: readonly Cue[] = ["has", "lacks", "changes", "mentions"];

/** The most text read at once, and the most sentences listed for one detail. */
export const MAX_TEXT = 20_000;
export const MAX_SENTENCE = 400;
export const MAX_PER_DETAIL = 8;

export interface Mention {
  readonly sentence: string;
  readonly cue: Cue;
  /** Where the matched words sit in `sentence`, to mark them. */
  readonly start: number;
  readonly end: number;
}

export interface Finding {
  readonly key: FactKey;
  readonly mentions: readonly Mention[];
  /** Sentences that matched beyond MAX_PER_DETAIL, not listed. */
  readonly more: number;
}

/**
 * Lower-case, accents removed, curly apostrophes made straight, one character
 * for one character, so a position in the folded text is the same position in
 * the original.
 */
export function foldKeepLength(s: string): string {
  let out = "";
  for (const ch of s) {
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const one = base.length === ch.length ? base : ch.toLowerCase().length === ch.length ? ch.toLowerCase() : ch;
    out += one === "’" || one === "‘" ? "'" : one;
  }
  return out;
}

/** Splits pasted text into sentences: at . ! ? ; and line breaks, and at list bullets. Long sentences are cut. */
export function splitSentences(text: string): string[] {
  const clipped = text.slice(0, MAX_TEXT).replace(/\r\n?/g, "\n");
  const out: string[] = [];
  for (const line of clipped.split(/\n+/)) {
    const cleaned = line.replace(/^\s*(?:[-*•▪●]|\d+[.)])\s+/, "").replace(/\s+/g, " ").trim();
    if (cleaned === "") continue;
    for (const part of cleaned.split(/(?<=[.!?;])\s+(?=\S)/)) {
      const s = part.trim();
      if (s.length < 2) continue;
      out.push(s.length > MAX_SENTENCE ? `${s.slice(0, MAX_SENTENCE - 1).trimEnd()}…` : s);
    }
  }
  return out;
}

interface Words {
  /** Names of the detail. A sentence must contain one to be listed. */
  readonly topic: readonly RegExp[];
  /** Phrases that usually mean the place has it. Checked after `lacks`. */
  readonly has: readonly RegExp[];
  /** Phrases that usually mean it does not. Checked first. */
  readonly lacks: readonly RegExp[];
}

const W = (s: string): RegExp => new RegExp(s, "g");

/** All patterns work on folded text (lower case, no accents, straight apostrophes). */
export const WORDS: Readonly<Record<FactKey, Words>> = {
  "step-free-entry": {
    topic: [
      W(String.raw`\bstep[- ]?free\b`),
      W(String.raw`\bstepless\b`),
      W(String.raw`\b(?:level|flat|zero[- ]step|at[- ]grade) (?:entrance|entry|access)\b`),
      W(String.raw`\bramp(?:s|ed)?\b`),
      W(String.raw`\b(?:steps?|stairs?) (?:at|to|into|up to) the (?:main )?(?:entrance|entry|door|front door)\b`),
      W(String.raw`\b(?:entrance|entry) (?:has|with) (?:a |an |\d+ |(?:one|two|three|four|five|six|several|a few|some|many) )?(?:steps?|stairs?)\b`),
      W(String.raw`\bno (?:steps?|stairs?)\b`),
      W(String.raw`\bsans (?:aucune )?marches?\b`),
      W(String.raw`\bde plain[- ]pied\b`),
      W(String.raw`\brampes?\b`),
      W(String.raw`\bmarches? (?:a|devant) l'entree\b`),
      W(String.raw`\bentree (?:avec|comporte) (?:une |des |quelques |plusieurs |\d+ |(?:deux|trois|quatre|cinq) )?marches?\b`),
    ],
    lacks: [
      W(String.raw`\bnot (?:step[- ]?free|stepless|level)\b`),
      W(String.raw`\b(?:steps?|stairs?) (?:at|to|into|up to) the (?:main )?(?:entrance|entry|door|front door)\b`),
      W(String.raw`\b(?:entrance|entry) (?:has|with) (?:a |an |\d+ |(?:one|two|three|four|five|six|several|a few|some|many) )?(?:steps?|stairs?)\b`),
      W(String.raw`\bno ramp\b`),
      W(String.raw`\bpas de (?:rampe|plain[- ]pied)\b`),
      W(String.raw`\bmarches? (?:a|devant) l'entree\b`),
      W(String.raw`\bentree (?:avec|comporte) (?:une |des |quelques |plusieurs |\d+ |(?:deux|trois|quatre|cinq) )?marches?\b`),
    ],
    has: [
      W(String.raw`\bstep[- ]?free\b`),
      W(String.raw`\bstepless\b`),
      W(String.raw`\b(?:level|flat|zero[- ]step|at[- ]grade) (?:entrance|entry|access)\b`),
      W(String.raw`\bno (?:steps?|stairs?)\b`),
      W(String.raw`\bramp(?:s|ed)?\b`),
      W(String.raw`\bsans (?:aucune )?marches?\b`),
      W(String.raw`\bde plain[- ]pied\b`),
      W(String.raw`\brampes?\b`),
    ],
  },
  "accessible-washroom": {
    topic: [
      W(String.raw`\b(?:accessible|universal|barrier[- ]free|wheelchair[- ]accessible|adapted) (?:washrooms?|restrooms?|toilets?|bathrooms?|lavatory|lavatories)\b`),
      W(String.raw`\b(?:washrooms?|restrooms?|toilets?|bathrooms?)\b`),
      W(String.raw`\b(?:toilettes?|salles? de bains?|salles? de toilettes?|cabinets? de toilette)\b`),
    ],
    lacks: [
      W(String.raw`\bno (?:accessible |universal |barrier[- ]free )?(?:washrooms?|restrooms?|toilets?|bathrooms?)\b`),
      W(String.raw`\b(?:washrooms?|restrooms?|toilets?|bathrooms?) (?:is|are) not (?:wheelchair[- ])?accessible\b`),
      W(String.raw`\b(?:washrooms?|restrooms?|toilets?|bathrooms?) (?:is|are) (?:only )?(?:up|down)stairs\b`),
      W(String.raw`\b(?:pas|aucune?) (?:de )?(?:toilettes?|salles? de bains?)(?: accessibles?| adaptees?)?\b`),
      W(String.raw`\b(?:toilettes?|salles? de bains?) (?:ne sont pas|n'est pas|non) (?:accessibles?|adaptees?)\b`),
    ],
    has: [
      W(String.raw`\b(?:accessible|universal|barrier[- ]free|wheelchair[- ]accessible|adapted) (?:washrooms?|restrooms?|toilets?|bathrooms?|lavatory|lavatories)\b`),
      W(String.raw`\b(?:toilettes?|salles? de bains?|salles? de toilettes?) (?:accessibles?|adaptees?|universelles?)\b`),
    ],
  },
  "automatic-door": {
    topic: [
      W(String.raw`\b(?:automatic|power(?:ed)?|push[- ]button|motion[- ]activated|sliding automatic) doors?\b`),
      W(String.raw`\bdoor openers?\b`),
      W(String.raw`\bautomatic door openers?\b`),
      W(String.raw`\bportes? (?:a ouverture )?automatiques?\b`),
      W(String.raw`\bouvre[- ]portes?\b`),
      W(String.raw`\bportes? (?:electriques?|motorisees?|a bouton)\b`),
    ],
    lacks: [
      W(String.raw`\bno (?:automatic|power(?:ed)?|push[- ]button) doors?\b`),
      W(String.raw`\bno (?:automatic )?door openers?\b`),
      W(String.raw`\b(?:doors?|door) (?:is|are) (?:heavy|manual|not automatic)\b`),
      W(String.raw`\b(?:pas|aucune?) (?:de )?(?:portes? (?:a ouverture )?automatiques?|ouvre[- ]portes?)\b`),
      W(String.raw`\bportes? (?:lourdes?|manuelles?)\b`),
    ],
    has: [
      W(String.raw`\b(?:automatic|power(?:ed)?|push[- ]button|motion[- ]activated|sliding automatic) doors?\b`),
      W(String.raw`\b(?:automatic )?door openers?\b`),
      W(String.raw`\bportes? (?:a ouverture )?automatiques?\b`),
      W(String.raw`\bouvre[- ]portes?\b`),
      W(String.raw`\bportes? (?:electriques?|motorisees?|a bouton)\b`),
    ],
  },
  elevator: {
    topic: [W(String.raw`\belevators?\b`), W(String.raw`\blifts?\b(?! (?:up|off|the|a|your|heavy))`), W(String.raw`\bascenseurs?\b`), W(String.raw`\bplate-?formes? elevatrices?\b`)],
    lacks: [
      W(String.raw`\bno (?:elevators?|lifts?)\b`),
      W(String.raw`\b(?:elevators?|lifts?) (?:is|are) not available\b`),
      W(String.raw`\b(?:there is|there's|there are) no (?:elevators?|lifts?)\b`),
      W(String.raw`\b(?:pas|aucun) (?:d'|de )?ascenseurs?\b`),
      W(String.raw`\bsans ascenseurs?\b`),
      W(String.raw`\b(?:stairs|escaliers?) only\b`),
      W(String.raw`\buniquement par (?:l')?escaliers?\b`),
    ],
    has: [W(String.raw`\belevators?\b`), W(String.raw`\blifts?\b`), W(String.raw`\bascenseurs?\b`), W(String.raw`\bplate-?formes? elevatrices?\b`)],
  },
};

/** Words about something that comes and goes. A sentence with these gets the cue "changes", whatever else it says. */
export const CHANGING: readonly RegExp[] = [
  W(String.raw`\bout of (?:service|order)\b`),
  W(String.raw`\bunder (?:repair|maintenance|construction)\b`),
  W(String.raw`\btemporar(?:y|ily)\b`),
  W(String.raw`\bclosed for\b`),
  W(String.raw`\bon request\b`),
  W(String.raw`\bhors (?:service|d'usage)\b`),
  W(String.raw`\ben (?:panne|reparation|travaux)\b`),
  W(String.raw`\btemporaire(?:ment)?\b`),
  W(String.raw`\bsur demande\b`),
];

/** Words that turn a plain mention into "lacks" when they come up to 3 words before it. */
const NEGATION = /(?:^|\s)(?:no|not|without|isn't|aren't|doesn't|don't|never|none|lacks?|pas|aucune?|sans|ni|jamais)(?=\s|$)|(?:^|\s)n'/;

function firstMatch(folded: string, list: readonly RegExp[]): { start: number; end: number } | undefined {
  let best: { start: number; end: number } | undefined;
  for (const re of list) {
    re.lastIndex = 0;
    const m = re.exec(folded);
    if (m && (best === undefined || m.index < best.start)) best = { start: m.index, end: m.index + m[0].length };
  }
  return best;
}

/** Up to 3 words before a position, for the negation check. */
function before(folded: string, at: number): string {
  return folded.slice(0, at).trim().split(/\s+/).slice(-3).join(" ");
}

/** How one sentence speaks of one detail, or undefined if it does not name it. */
export function readSentence(sentence: string, key: FactKey): Mention | undefined {
  const folded = foldKeepLength(sentence);
  const w = WORDS[key];
  const topic = firstMatch(folded, w.topic);
  if (!topic) return undefined;
  const at = (m: { start: number; end: number }, cue: Cue): Mention => ({ sentence, cue, start: m.start, end: m.end });
  if (firstMatch(folded, CHANGING)) return at(topic, "changes");
  const lacks = firstMatch(folded, w.lacks);
  if (lacks) return at(lacks, "lacks");
  const has = firstMatch(folded, w.has);
  if (has) return NEGATION.test(before(folded, has.start)) ? at(has, "lacks") : at(has, "has");
  return NEGATION.test(before(folded, topic.start)) ? at(topic, "lacks") : at(topic, "mentions");
}

/** Every detail with the sentences that name it, in the order of the text. */
export function readStatement(text: string): Finding[] {
  const sentences = splitSentences(text);
  return FACT_KEYS.map((key) => {
    const all = sentences.map((s) => readSentence(s, key)).filter((m): m is Mention => m !== undefined);
    return { key, mentions: all.slice(0, MAX_PER_DETAIL), more: Math.max(0, all.length - MAX_PER_DETAIL) };
  });
}

export type CueCounts = Readonly<Record<Cue, number>>;

export function cueCounts(f: Finding): CueCounts {
  const c: Record<Cue, number> = { has: 0, lacks: 0, changes: 0, mentions: 0 };
  for (const m of f.mentions) c[m.cue] += 1;
  return c;
}

/** True when the listed sentences use both "has" and "lacks" words: the person should read them closely. */
export function mixed(f: Finding): boolean {
  const c = cueCounts(f);
  return c.has > 0 && c.lacks > 0;
}

// ---- The note the person builds from it ----

export interface StatementForm {
  readonly placeName: string;
  readonly address: string;
  /** The text as pasted. Kept only while the page is open. */
  readonly text: string;
  /** Optional web address of the page, kept in the note so the person can find it again. */
  readonly pageUrl: string;
  /** Every detail starts as UNKNOWN. Only the person changes it. */
  readonly answers: Readonly<Record<FactKey, Tri>>;
  readonly observedOn: string;
  readonly licence: string;
  /** Where the text came from: the place's own page, or its written reply to the person. */
  readonly from: StatementSource;
}

export type StatementSource = "page" | "reply";

export function emptyStatementForm(today: Date): StatementForm {
  return {
    placeName: "",
    address: "",
    text: "",
    pageUrl: "",
    answers: Object.fromEntries(FACT_KEYS.map((k) => [k, "unknown"])) as Record<FactKey, Tri>,
    observedOn: isoDate(today),
    licence: "",
    from: "page",
  };
}

export type StatementField = FieldError["field"] | "text" | "pageUrl";

export interface StatementError {
  readonly field: StatementField;
  readonly code: FieldError["code"] | "text-required" | "bad-url";
}

/** An http or https address with a host, no spaces, no user name or password, at most 300 characters. */
export function isPageUrl(s: string): boolean {
  if (s.length > 300 || /\s/.test(s)) return false;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".") && u.username === "" && u.password === "";
}

/** The sentence put in the note: where the answers came from. */
export function noteText(pageUrl: string, locale: "en" | "fr", from: StatementSource = "page"): string {
  const url = pageUrl.trim();
  const said =
    from === "reply"
      ? locale === "fr"
        ? "Lu dans la réponse écrite du lieu."
        : "Read from the place’s written reply."
      : locale === "fr"
        ? "Lu sur la page d’accessibilité du lieu."
        : "Read from the place’s own accessibility page.";
  return url === "" ? said : `${said} ${url}`;
}

/** The add-a-note form values the note is built from. */
export function statementValues(f: StatementForm, locale: "en" | "fr"): FormValues {
  return {
    placeName: f.placeName,
    address: f.address,
    details: f.answers,
    observedOn: f.observedOn,
    licence: f.licence,
    note: noteText(f.pageUrl, locale, f.from),
  };
}

/** The form's own rules, plus: some text was read, and the page address (if any) is a web address. */
export function validateStatement(f: StatementForm, today: Date, locale: "en" | "fr"): StatementError[] {
  const errors: StatementError[] = [];
  if (f.text.trim() === "") errors.push({ field: "text", code: "text-required" });
  const url = f.pageUrl.trim();
  const badUrl = url !== "" && !isPageUrl(url);
  if (badUrl) errors.push({ field: "pageUrl", code: "bad-url" });
  for (const e of validateForm(statementValues(f, locale), today)) {
    // The note field holds only the App's own sentence and the address; its problems are the address's.
    // An address already refused gets one message, not two.
    if (e.field === "note") {
      if (!badUrl) errors.push({ field: "pageUrl", code: e.code });
    } else errors.push({ field: e.field, code: e.code });
  }
  return errors;
}

export function statementNote(f: StatementForm, today: Date, locale: "en" | "fr", makeId: IdMaker = defaultIdMaker): Note {
  if (validateStatement(f, today, locale).length > 0) throw new Error("Statement form is not valid");
  return toNote(statementValues(f, locale), today, makeId);
}

/** Reads the form values back from untrusted input: lengths cut, answers only yes/no/unknown, licence only from the list. */
export function cleanStatementForm(raw: Partial<Record<string, unknown>>, today: Date): StatementForm {
  const str = (k: string, max: number): string => (typeof raw[k] === "string" ? (raw[k] as string).slice(0, max) : "");
  const a = raw["answers"] && typeof raw["answers"] === "object" ? (raw["answers"] as Record<string, unknown>) : {};
  const answers = Object.fromEntries(
    FACT_KEYS.map((k) => [k, a[k] === "yes" || a[k] === "no" ? a[k] : "unknown"]),
  ) as Record<FactKey, Tri>;
  const observedOn = str("observedOn", 10);
  const licence = str("licence", 40);
  return {
    placeName: str("placeName", LIMITS.placeName + 1),
    address: str("address", LIMITS.address + 1),
    text: str("text", MAX_TEXT),
    pageUrl: str("pageUrl", 301),
    answers,
    observedOn: observedOn === "" ? isoDate(today) : observedOn,
    licence: OPEN_LICENCES.includes(licence) ? licence : "",
    from: raw["from"] === "reply" ? "reply" : "page",
  };
}

/** True when the date field holds something the form would accept, for showing the field state. */
export function dateLooksRight(s: string, today: Date): boolean {
  return isIsoDate(s) && s <= isoDate(today);
}
