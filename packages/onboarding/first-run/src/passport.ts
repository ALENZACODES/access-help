import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import { FACT_KEYS, isIsoDate, type FactKey } from "./facts";
import { hasRequirement, type Requirement } from "./filter";
import { isoDate, looksLikeEmail, looksLikePhone } from "./form";
import { esc } from "./html";
import { hasControlChars } from "./model";
import type { KeyValueStore } from "./store";

/**
 * "My access card": what the person chooses to tell staff at a place, in their
 * own words, to show on a phone or print with the visit cards. It holds the
 * mobility device the person uses (or nothing), its size if they want to give
 * it, the details they need, and other things that help.
 *
 * It asks for no condition, diagnosis or contact details and gives no advice.
 * It is kept on this device only, appears on the "kept on this device" page and
 * can be cleared there. Every part is optional except saying something.
 */
export const PASSPORT_KEY = "app.onboarding.passport.v1";

export type DeviceKind = "manual-wheelchair" | "power-wheelchair" | "scooter" | "walker" | "other" | "";
export const DEVICE_KINDS: readonly Exclude<DeviceKind, "">[] = ["manual-wheelchair", "power-wheelchair", "scooter", "walker", "other"];

/** Sizes in whole centimetres. */
export type SizeKey = "width" | "length" | "seatHeight";
export const SIZE_KEYS: readonly SizeKey[] = ["width", "length", "seatHeight"];
export const SIZE_RANGE: Readonly<Record<SizeKey, readonly [number, number]>> = {
  width: [30, 150],
  length: [40, 250],
  seatHeight: [20, 120],
};
export const MAX_HELPS = 300;

export interface Passport {
  readonly device: DeviceKind;
  /** Kept as typed, so a mistake can be shown and fixed; checked before saving. */
  readonly sizes: Readonly<Record<SizeKey, string>>;
  readonly needs: readonly FactKey[];
  readonly helps: string;
  readonly updatedOn: string;
}

export type PassportErrorCode = "out-of-range" | "not-a-number" | "too-long" | "control-chars" | "personal-email" | "personal-phone" | "empty";

export interface PassportError {
  readonly field: SizeKey | "helps" | "card";
  readonly code: PassportErrorCode;
}

export const PASSPORT_COPY = {
  open: { en: "My access card", fr: "Ma fiche d’accès" },
  title: { en: "My access card", fr: "Ma fiche d’accès" },
  intro: {
    en: "A short card you can show staff or print with your visit cards. Say only what you want to. Everything here is optional.",
    fr: "Une courte fiche à montrer au personnel ou à imprimer avec vos fiches de visite. Dites seulement ce que vous voulez. Tout est facultatif.",
  },
  privacy: {
    en: "Kept on this device only. It asks for no condition, diagnosis or contact details.",
    fr: "Gardée sur cet appareil seulement. Elle ne demande aucun état de santé, diagnostic ni coordonnées.",
  },
  deviceLegend: { en: "What I use to get around", fr: "Ce que j’utilise pour me déplacer" },
  deviceNone: { en: "Prefer not to say", fr: "Je préfère ne pas le dire" },
  sizesLegend: { en: "Its size (optional, in centimetres)", fr: "Ses dimensions (facultatif, en centimètres)" },
  sizesHint: {
    en: "Whole numbers. These help a place tell whether a door, lift or table works for you.",
    fr: "Nombres entiers. Elles aident un lieu à savoir si une porte, un ascenseur ou une table vous convient.",
  },
  needsLegend: { en: "What I need at a place", fr: "Ce dont j’ai besoin dans un lieu" },
  fromMustHaves: { en: "Use my must-haves", fr: "Reprendre mes essentiels" },
  helpsLabel: { en: "Other things that help (optional)", fr: "Autres choses utiles (facultatif)" },
  helpsHint: {
    en: "In your own words, up to 300 characters. No email address or phone number.",
    fr: "Dans vos mots, jusqu’à 300 caractères. Aucune adresse courriel ni aucun numéro de téléphone.",
  },
  save: { en: "Save my access card", fr: "Enregistrer ma fiche d’accès" },
  saved: { en: "Your access card was saved.", fr: "Votre fiche d’accès a été enregistrée." },
  errorsTitle: { en: "Fix this to save the card", fr: "Corrigez ceci pour enregistrer la fiche" },
  previewTitle: { en: "How the card reads", fr: "Ce que dit la fiche" },
  cardTitle: { en: "Access card", fr: "Fiche d’accès" },
  updated: { en: "Updated on", fr: "Mise à jour le" },
  download: { en: "Download my access card as text", fr: "Télécharger ma fiche d’accès en texte" },
  print: { en: "Print my access card", fr: "Imprimer ma fiche d’accès" },
  include: { en: "Print my access card first", fr: "Imprimer d’abord ma fiche d’accès" },
  nothingYet: { en: "Nothing on the card yet.", fr: "Rien sur la fiche pour l’instant." },
  back: { en: "Back to my notes", fr: "Retour à mes notes" },
  deviceTitle: { en: "My access card", fr: "Ma fiche d’accès" },
  deviceWhat: {
    en: "What you chose to put on your access card.",
    fr: "Ce que vous avez choisi de mettre sur votre fiche d’accès.",
  },
} as const satisfies Record<string, Pair>;

export const DEVICE_COPY: Record<Exclude<DeviceKind, "">, Pair> = {
  "manual-wheelchair": { en: "A manual wheelchair", fr: "Un fauteuil roulant manuel" },
  "power-wheelchair": { en: "A power wheelchair", fr: "Un fauteuil roulant motorisé" },
  scooter: { en: "A mobility scooter", fr: "Un triporteur ou quadriporteur" },
  walker: { en: "A walker", fr: "Une marchette" },
  other: { en: "Something else", fr: "Autre chose" },
};

export const SIZE_COPY: Record<SizeKey, Pair> = {
  width: { en: "Width", fr: "Largeur" },
  length: { en: "Length", fr: "Longueur" },
  seatHeight: { en: "Seat height", fr: "Hauteur du siège" },
};

export const PASSPORT_ERRORS: Record<PassportErrorCode, Pair> = {
  "out-of-range": { en: "Enter a number in the range shown.", fr: "Saisissez un nombre dans l’intervalle indiqué." },
  "not-a-number": { en: "Enter a whole number of centimetres, for example 68.", fr: "Saisissez un nombre entier de centimètres, par exemple 68." },
  "too-long": { en: "This is too long.", fr: "C’est trop long." },
  "control-chars": { en: "This contains characters that are not allowed.", fr: "Ceci contient des caractères non permis." },
  "personal-email": { en: "Remove the email address.", fr: "Retirez l’adresse courriel." },
  "personal-phone": { en: "Remove the phone number.", fr: "Retirez le numéro de téléphone." },
  empty: { en: "Put at least one thing on the card.", fr: "Mettez au moins une chose sur la fiche." },
};

export function emptyPassport(today: Date): Passport {
  return { device: "", sizes: { width: "", length: "", seatHeight: "" }, needs: [], helps: "", updatedOn: isoDate(today) };
}

export function isDeviceKind(v: unknown): v is DeviceKind {
  return v === "" || (typeof v === "string" && (DEVICE_KINDS as readonly string[]).includes(v));
}

/** The details marked "must have" in the person's must-haves, in the App's order. */
export function needsFromRequirement(req: Requirement): FactKey[] {
  if (!hasRequirement(req)) return [];
  return FACT_KEYS.filter((k) => req[k] === "yes");
}

/** A size as a whole number of centimetres, or undefined when empty. Throws nothing. */
export function sizeValue(s: string): number | undefined {
  const v = s.trim();
  return /^\d{1,3}$/.test(v) ? Number(v) : undefined;
}

export function validatePassport(p: Passport): PassportError[] {
  const errors: PassportError[] = [];
  for (const k of SIZE_KEYS) {
    const raw = p.sizes[k].trim();
    if (raw === "") continue;
    const v = sizeValue(raw);
    if (v === undefined) errors.push({ field: k, code: "not-a-number" });
    else if (v < SIZE_RANGE[k][0] || v > SIZE_RANGE[k][1]) errors.push({ field: k, code: "out-of-range" });
  }
  const helps = p.helps.trim();
  if (helps.length > MAX_HELPS) errors.push({ field: "helps", code: "too-long" });
  else if (hasControlChars(helps, true)) errors.push({ field: "helps", code: "control-chars" });
  else if (looksLikeEmail(helps)) errors.push({ field: "helps", code: "personal-email" });
  else if (looksLikePhone(helps)) errors.push({ field: "helps", code: "personal-phone" });
  if (errors.length === 0 && isEmptyPassport(p)) errors.push({ field: "card", code: "empty" });
  return errors;
}

export function isEmptyPassport(p: Passport): boolean {
  return p.device === "" && SIZE_KEYS.every((k) => p.sizes[k].trim() === "") && p.needs.length === 0 && p.helps.trim() === "";
}

/** What the card says, one sentence per line, in the language asked for. */
export function passportLines(p: Passport, l: Locale): string[] {
  const lines: string[] = [];
  const colon = l === "fr" ? `${NB}:` : ":";
  if (p.device !== "") {
    const what = t(DEVICE_COPY[p.device], l);
    lines.push(l === "fr" ? `J’utilise ${what.charAt(0).toLowerCase()}${what.slice(1)}.` : `I use ${what.charAt(0).toLowerCase()}${what.slice(1)}.`);
  }
  const sizes = SIZE_KEYS.map((k) => [k, sizeValue(p.sizes[k])] as const).filter((x): x is readonly [SizeKey, number] => x[1] !== undefined);
  if (sizes.length > 0) {
    const parts = sizes.map(([k, v]) => `${t(SIZE_COPY[k], l).toLowerCase()} ${v}${NB}cm`).join(", ");
    lines.push(l === "fr" ? `Dimensions${colon} ${parts}.` : `Size${colon} ${parts}.`);
  }
  if (p.needs.length > 0) {
    const names = FACT_KEYS.filter((k) => p.needs.includes(k)).map((k) => t(COPY.facts[k], l).toLowerCase());
    lines.push(l === "fr" ? `J’ai besoin de${colon} ${names.join(", ")}.` : `I need${colon} ${names.join(", ")}.`);
  }
  const helps = p.helps.trim();
  if (helps !== "") lines.push(`${l === "fr" ? "Autres choses utiles" : "Other things that help"}${colon} ${helps}`);
  return lines;
}

/** The card as markup, under a heading at `level`. The person's own words are marked as theirs. */
export function passportHtml(p: Passport, l: Locale, level: 2 | 3 | 4 = 3): string {
  const h = `h${level}`;
  const lines = passportLines(p, l);
  const last = p.helps.trim() !== "" ? lines.length - 1 : -1;
  const items = lines.map((x, i) => (i === last ? `<li><span data-user-content>${esc(x)}</span></li>` : `<li>${esc(x)}</li>`)).join("");
  return (
    `<article class="place-card access-card" aria-labelledby="access-card-title">` +
    `<${h} id="access-card-title">${esc(t(PASSPORT_COPY.cardTitle, l))}</${h}>` +
    (lines.length === 0 ? `<p>${esc(t(PASSPORT_COPY.nothingYet, l))}</p>` : `<ul>${items}</ul>`) +
    `<p class="card-made">${esc(`${t(PASSPORT_COPY.updated, l)} ${p.updatedOn}.`)}</p>` +
    `</article>`
  );
}

/** The card as a text file. */
export function passportText(p: Passport, l: Locale): string {
  const title = t(PASSPORT_COPY.cardTitle, l);
  return `${[title, "=".repeat(title.length), "", ...passportLines(p, l), "", `${t(PASSPORT_COPY.updated, l)} ${p.updatedOn}.`].join("\n")}\n`;
}

export function passportFilename(l: Locale): string {
  return l === "fr" ? "fiche-acces-fr.txt" : "access-card-en.txt";
}

// ---- Kept on this device ----

export function parsePassport(raw: string | null, today: Date): Passport | undefined {
  if (!raw) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const o = data as Record<string, unknown>;
  const s = o["sizes"] && typeof o["sizes"] === "object" ? (o["sizes"] as Record<string, unknown>) : {};
  const size = (k: SizeKey): string => {
    const v = s[k];
    return typeof v === "string" && /^\d{0,3}$/.test(v.trim()) ? v.trim() : "";
  };
  const p: Passport = {
    device: isDeviceKind(o["device"]) ? o["device"] : "",
    sizes: { width: size("width"), length: size("length"), seatHeight: size("seatHeight") },
    needs: Array.isArray(o["needs"]) ? FACT_KEYS.filter((k) => (o["needs"] as unknown[]).includes(k)) : [],
    helps: typeof o["helps"] === "string" ? o["helps"] : "",
    updatedOn: typeof o["updatedOn"] === "string" && isIsoDate(o["updatedOn"]) ? o["updatedOn"] : isoDate(today),
  };
  // A card that would not pass the checks today is not shown as if it did.
  return validatePassport(p).length === 0 ? p : undefined;
}

export function loadPassport(store: KeyValueStore | undefined, today: Date): Passport | undefined {
  try {
    return parsePassport(store?.getItem(PASSPORT_KEY) ?? null, today);
  } catch {
    return undefined;
  }
}

export function savePassport(store: KeyValueStore | undefined, p: Passport): "saved" | "unavailable" {
  if (!store) return "unavailable";
  try {
    store.setItem(PASSPORT_KEY, JSON.stringify({ ...p, helps: p.helps.trim(), sizes: { width: p.sizes.width.trim(), length: p.sizes.length.trim(), seatHeight: p.sizes.seatHeight.trim() } }));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function passportStrings(): Array<[string, Pair]> {
  return [
    ...Object.entries(PASSPORT_COPY).map(([k, p]): [string, Pair] => [`passport.${k}`, p]),
    ...Object.entries(DEVICE_COPY).map(([k, p]): [string, Pair] => [`passport.device.${k}`, p]),
    ...Object.entries(SIZE_COPY).map(([k, p]): [string, Pair] => [`passport.size.${k}`, p]),
    ...Object.entries(PASSPORT_ERRORS).map(([k, p]): [string, Pair] => [`passport.error.${k}`, p]),
  ];
}
