import { foldText } from "./filter";

/**
 * Reading the street from an address a person typed, for sorting places into
 * walking or calling lists. It reads the common Ontario forms in English and
 * French: "12 King St W", "Unit 4, 1 Main Street", "12-345 King St W",
 * "1 rue King", "45, boul. Saint-Laurent", "100 Queen Street West, Toronto".
 *
 * It only groups text the person typed; it does not look anything up, and it
 * never says where a place is. An address it cannot read gives no street, and
 * the place goes in its own group rather than being guessed into a street.
 */

export interface StreetAddress {
  /** The house number as written ("345", "12A"), or undefined when there is none. */
  readonly number: string | undefined;
  /** The house number as a number for sorting; NaN when there is none. */
  readonly order: number;
  /** The street, matched the same way however it is spelled: "king street west". */
  readonly key: string;
  /** The street as shown: "King Street West". */
  readonly name: string;
}

/** Street types, every spelling to one word. English after the name, French before it. */
const TYPES_AFTER: Readonly<Record<string, string>> = {
  st: "Street",
  str: "Street",
  street: "Street",
  rd: "Road",
  road: "Road",
  ave: "Avenue",
  av: "Avenue",
  avenue: "Avenue",
  blvd: "Boulevard",
  boulevard: "Boulevard",
  dr: "Drive",
  drive: "Drive",
  cres: "Crescent",
  crescent: "Crescent",
  ct: "Court",
  court: "Court",
  cir: "Circle",
  circle: "Circle",
  pl: "Place",
  place: "Place",
  ln: "Lane",
  lane: "Lane",
  way: "Way",
  pkwy: "Parkway",
  parkway: "Parkway",
  hwy: "Highway",
  highway: "Highway",
  terr: "Terrace",
  terrace: "Terrace",
  sq: "Square",
  square: "Square",
  gate: "Gate",
  trail: "Trail",
  trl: "Trail",
};

const TYPES_BEFORE: Readonly<Record<string, string>> = {
  rue: "rue",
  boul: "boulevard",
  boulevard: "boulevard",
  bd: "boulevard",
  av: "avenue",
  avenue: "avenue",
  ch: "chemin",
  chemin: "chemin",
  rte: "route",
  route: "route",
  pl: "place",
  place: "place",
  prom: "promenade",
  promenade: "promenade",
  crois: "croissant",
  croissant: "croissant",
  rang: "rang",
  montee: "montée",
  allee: "allée",
};

const DIRECTIONS: Readonly<Record<string, string>> = {
  n: "North",
  north: "North",
  s: "South",
  south: "South",
  e: "East",
  east: "East",
  w: "West",
  west: "West",
  nord: "Nord",
  sud: "Sud",
  est: "Est",
  ouest: "Ouest",
  o: "Ouest",
};

/** Words that start a unit or a box in front of the street address. */
const UNIT_WORDS = /^(unit|suite|apt|apartment|app|appartement|bureau|local|po box|c\.?p\.?|case postale)\b/i;

const word = (w: string): string => foldText(w).replace(/[.,]/g, "");

function titleCase(w: string): string {
  return w.length === 0 ? w : w[0]?.toUpperCase() + w.slice(1);
}

/** Drops a unit written after the street: "#300", "Unit 4", "Suite 300", "app. 2", "bureau 5". */
function withoutTrailingUnit(words: readonly string[]): string[] {
  const out = [...words];
  const last = out[out.length - 1] ?? "";
  if (out.length > 1 && /^#\w+$/.test(last)) return out.slice(0, -1);
  const before = word(out[out.length - 2] ?? "");
  if (out.length > 2 && /^[\w-]+$/.test(last) && /^(unit|suite|apt|app|bureau|local)$/.test(before)) return out.slice(0, -2);
  return out;
}

/**
 * The key two spellings of one street share: folded, punctuation as spaces,
 * and "St", "Saint", "Ste" and "Sainte" read alike when they start a name
 * ("St. Clair" and "Saint Clair"), but not "St" as the street type at the end.
 */
export function streetKey(name: string): string {
  const words = foldText(name).replace(/[^a-z0-9]+/g, " ").trim().split(" ");
  return words
    .map((w, i) => {
      if (i === words.length - 1) return w;
      if (w === "st" || w === "saint") return "saint";
      if (w === "ste" || w === "sainte") return "sainte";
      return w;
    })
    .join(" ");
}

/** The part of an address that holds the street: the first comma part that starts with a number and is not a unit. */
function streetPart(address: string): string | undefined {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p !== "");
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i] as string;
    if (UNIT_WORDS.test(p)) continue;
    if (/^\d/.test(p)) {
      // "45, boul. Saint-Laurent": the number on its own, then the street.
      if (/^\d+[a-z]?$/i.test(p) && parts[i + 1] && !/^\d/.test(parts[i + 1] as string)) return `${p} ${parts[i + 1]}`;
      return p;
    }
  }
  return undefined;
}

/**
 * The street of an address, or undefined when the address has no house number
 * followed by a street name. "12-345 King St W" is unit 12 at 345 King Street
 * West, the usual Canadian form.
 */
export function parseStreet(address: string | undefined): StreetAddress | undefined {
  if (!address) return undefined;
  const part = streetPart(address);
  if (!part) return undefined;
  const m = /^(?:\d+[a-z]?\s*-\s*)?(\d+[a-z]?)\s+(.+)$/i.exec(part);
  if (!m) return undefined;
  const number = (m[1] as string).toUpperCase();
  // A unit written after the street ("12 King St W #300", "1 Main St Suite 4") is not part of the street.
  const words = withoutTrailingUnit((m[2] as string).split(/\s+/).filter((w) => w !== ""));
  if (words.length === 0) return undefined;
  const first = word(words[0] as string);
  let typeBefore: string | undefined;
  let rest = words;
  // "10 Avenue Rd" is Avenue Road: a French type word at the front only counts when the address
  // does not end with an English street type (a direction after it is allowed).
  const tail = words.map(word).filter((w) => !DIRECTIONS[w] || w === first);
  const endsEnglish = tail.length > 1 && TYPES_AFTER[tail[tail.length - 1] as string] !== undefined;
  if (TYPES_BEFORE[first] && words.length > 1 && !endsEnglish) {
    typeBefore = TYPES_BEFORE[first];
    rest = words.slice(1);
  }
  let direction: string | undefined;
  const last = word(rest[rest.length - 1] ?? "");
  if (rest.length > 1 && DIRECTIONS[last]) {
    direction = DIRECTIONS[last];
    rest = rest.slice(0, -1);
  }
  let typeAfter: string | undefined;
  const lastType = word(rest[rest.length - 1] ?? "");
  if (!typeBefore && rest.length > 1 && TYPES_AFTER[lastType]) {
    typeAfter = TYPES_AFTER[lastType];
    rest = rest.slice(0, -1);
  }
  const base = rest.map((w) => w.replace(/[.,]+$/g, "")).filter((w) => w !== "");
  if (base.length === 0 || base.every((w) => /^\d+$/.test(w))) return undefined;
  const nameWords = [...(typeBefore ? [typeBefore] : []), ...base.map(titleCase), ...(typeAfter ? [typeAfter] : []), ...(direction ? [direction] : [])];
  const name = nameWords.join(" ");
  return { number, order: Number.parseInt(number, 10), key: streetKey(name), name };
}

/** Sorts addresses on one street: by house number, then by the number as written (12 before 12A), then by place name. */
export function compareOnStreet(a: { street: StreetAddress; name: string }, b: { street: StreetAddress; name: string }): number {
  const an = Number.isNaN(a.street.order) ? Infinity : a.street.order;
  const bn = Number.isNaN(b.street.order) ? Infinity : b.street.order;
  if (an !== bn) return an - bn;
  const byNumber = (a.street.number ?? "").localeCompare(b.street.number ?? "");
  return byNumber !== 0 ? byNumber : a.name.localeCompare(b.name);
}

/**
 * The first three characters of a Canadian postal code in an address (the
 * forward sortation area, such as "M5H"), or undefined when there is none.
 * Letters D, F, I, O, Q and U are never used in postal codes, so text with
 * them is not read as one.
 */
export function postalArea(address: string | undefined): string | undefined {
  if (!address) return undefined;
  const m = /(?:^|[^A-Za-z0-9])([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z])\s?(\d[ABCEGHJ-NPRSTV-Z]\d)(?![A-Za-z0-9])/i.exec(address);
  return m ? (m[1] as string).toUpperCase() : undefined;
}

/**
 * Walking order along one street, one side then the other: odd numbers going
 * up, then even numbers coming back down. Places with no number go last.
 */
export function compareBothSides(a: { street: StreetAddress; name: string }, b: { street: StreetAddress; name: string }): number {
  const side = (s: StreetAddress): number => (Number.isNaN(s.order) ? 2 : s.order % 2 === 1 ? 0 : 1);
  const sa = side(a.street);
  const sb = side(b.street);
  if (sa !== sb) return sa - sb;
  if (sa === 1 && a.street.order !== b.street.order) return b.street.order - a.street.order;
  return compareOnStreet(a, b);
}
