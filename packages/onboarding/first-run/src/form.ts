import type { Locale } from "../../switch-first/src/index";
import { NN } from "./copy";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, OPEN_LICENCES, isIsoDate, type FactKey, type Tri } from "./facts";
import { LIMITS, hasControlChars, type Note } from "./model";
import type { KeyValueStore } from "./store";

export type FieldId = "placeName" | "address" | "details" | "observedOn" | "licence" | "note";

export const FIELD_IDS: readonly FieldId[] = [
  "placeName",
  "address",
  "details",
  "observedOn",
  "licence",
  "note",
];

export interface FormValues {
  readonly placeName: string;
  readonly address: string;
  /** Every detail starts as unknown. Unknown is never a default "no". */
  readonly details: Readonly<Record<FactKey, Tri>>;
  readonly observedOn: string;
  /** Empty until the person picks one. There is no default licence. */
  readonly licence: string;
  readonly note: string;
}

export type ErrorCode =
  | "required"
  | "too-long"
  | "control-chars"
  | "bad-date"
  | "future-date"
  | "licence-required"
  | "licence-invalid"
  | "personal-email"
  | "personal-phone"
  | "needs-one-detail";

export interface FieldError {
  readonly field: FieldId;
  readonly code: ErrorCode;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function emptyUnknownDetails(): Record<FactKey, Tri> {
  const out = {} as Record<FactKey, Tri>;
  for (const k of FACT_KEYS) out[k] = "unknown";
  return out;
}

export function emptyForm(today: Date): FormValues {
  return {
    placeName: "",
    address: "",
    details: emptyUnknownDetails(),
    observedOn: isoDate(today),
    licence: "",
    note: "",
  };
}

export function looksLikeEmail(s: string): boolean {
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(s);
}

/** True for a run of at least 10 digits written like a phone number. */
export function looksLikePhone(s: string): boolean {
  const runs = s.match(/\+?\d[\d\s().-]{7,}\d/g) ?? [];
  return runs.some((r) => r.replace(/\D/g, "").length >= 10);
}

export function validateForm(v: FormValues, today: Date): FieldError[] {
  const errors: FieldError[] = [];
  const add = (field: FieldId, code: ErrorCode): void => void errors.push({ field, code });

  const name = v.placeName.trim();
  if (name === "") add("placeName", "required");
  else if (name.length > LIMITS.placeName) add("placeName", "too-long");
  else if (hasControlChars(name)) add("placeName", "control-chars");

  const address = v.address.trim();
  if (address.length > LIMITS.address) add("address", "too-long");
  else if (hasControlChars(address)) add("address", "control-chars");
  else if (looksLikeEmail(address)) add("address", "personal-email");
  else if (looksLikePhone(address)) add("address", "personal-phone");

  if (!FACT_KEYS.some((k) => v.details[k] === "yes" || v.details[k] === "no")) {
    add("details", "needs-one-detail");
  }

  if (!isIsoDate(v.observedOn)) add("observedOn", "bad-date");
  else if (v.observedOn > isoDate(today)) add("observedOn", "future-date");

  if (v.licence === "") add("licence", "licence-required");
  else if (!OPEN_LICENCES.includes(v.licence)) add("licence", "licence-invalid");

  const note = v.note.trim();
  if (note.length > LIMITS.note) add("note", "too-long");
  else if (hasControlChars(note, true)) add("note", "control-chars");
  else if (looksLikeEmail(note)) add("note", "personal-email");
  else if (looksLikePhone(note)) add("note", "personal-phone");

  return errors;
}

const MESSAGES: Record<ErrorCode, { en: (f: string) => string; fr: (f: string) => string }> = {
  required: { en: (f) => `Enter ${f}.`, fr: (f) => `Saisissez ${f}.` },
  "too-long": {
    en: (f) => `${cap(f)} is too long.`,
    fr: (f) => `${cap(f)} est trop long.`,
  },
  "control-chars": {
    en: (f) => `${cap(f)} contains characters that are not allowed.`,
    fr: (f) => `${cap(f)} contient des caractères non permis.`,
  },
  "bad-date": {
    en: () => "Enter the date as year-month-day, for example 2026-11-15.",
    fr: () => "Saisissez la date sous la forme année-mois-jour, par exemple 2026-11-15.",
  },
  "future-date": {
    en: () => "The date cannot be in the future.",
    fr: () => "La date ne peut pas être dans le futur.",
  },
  "licence-required": {
    en: () => "Choose a licence for your note.",
    fr: () => "Choisissez une licence pour votre note.",
  },
  "licence-invalid": {
    en: () => "Choose one of the licences in the list.",
    fr: () => "Choisissez l’une des licences de la liste.",
  },
  "personal-email": {
    en: (f) => `Remove the email address from ${f}.`,
    fr: (f) => `Retirez l’adresse courriel de ${f}.`,
  },
  "personal-phone": {
    en: (f) => `Remove the phone number from ${f}.`,
    fr: (f) => `Retirez le numéro de téléphone de ${f}.`,
  },
  "needs-one-detail": {
    en: () => "Answer Yes or No for at least one detail. Leave the others as Unknown.",
    fr: () => "Répondez Oui ou Non pour au moins un détail. Laissez les autres à UNKNOWN.",
  },
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Field names used inside sentences, per language. */
export const FIELD_PHRASES: Record<FieldId, { en: string; fr: string }> = {
  placeName: { en: "the place name", fr: "le nom du lieu" },
  address: { en: "the address", fr: "l’adresse" },
  details: { en: "the details", fr: "les détails" },
  observedOn: { en: "the date", fr: "la date" },
  licence: { en: "the licence", fr: "la licence" },
  note: { en: "the note", fr: "la note" },
};

export function errorMessage(e: FieldError, locale: Locale): string {
  const phrase = FIELD_PHRASES[e.field][locale];
  return MESSAGES[e.code][locale](phrase);
}

export function fieldLabelText(f: FieldId, locale: Locale): string {
  const en: Record<FieldId, string> = {
    placeName: "Place name",
    address: "Address (optional)",
    details: "What did you see?",
    observedOn: "Date you saw it (year-month-day)",
    licence: "Licence for your note",
    note: "Extra note (optional)",
  };
  const fr: Record<FieldId, string> = {
    placeName: "Nom du lieu",
    address: "Adresse (facultatif)",
    details: "Qu’avez-vous observé" + NN + "?",
    observedOn: "Date de l’observation (année-mois-jour)",
    licence: "Licence de votre note",
    note: "Note supplémentaire (facultatif)",
  };
  return (locale === "fr" ? fr : en)[f];
}

export type IdMaker = () => string;

let counter = 0;
export const defaultIdMaker: IdMaker = () => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const uuid = c?.randomUUID?.();
  counter += 1;
  return uuid ?? `n${Date.now().toString(36)}${counter.toString(36)}`;
};

/** Builds a note from valid values. Throws if the form has errors. */
export function toNote(v: FormValues, today: Date, makeId: IdMaker = defaultIdMaker): Note {
  const errors = validateForm(v, today);
  if (errors.length > 0) throw new Error(`Form is not valid: ${errors.map((e) => e.code).join(",")}`);
  const facts = FACT_KEYS.map((key) => {
    const value = v.details[key];
    return value === "unknown"
      ? { key, value, provenance: undefined }
      : {
          key,
          value,
          provenance: { source: CONTRIBUTOR_SOURCE, licence: v.licence, recordedOn: v.observedOn },
        };
  });
  const address = v.address.trim();
  const note = v.note.trim();
  return {
    id: makeId(),
    placeName: v.placeName.trim(),
    address: address === "" ? undefined : address,
    note: note === "" ? undefined : note,
    createdOn: isoDate(today),
    licence: v.licence,
    facts,
  };
}

// ---- Draft autosave (WCAG 3.3.7: do not make people enter the same thing twice) ----

export const DRAFT_KEY = "app.onboarding.draft.v1";

export function saveDraft(store: KeyValueStore | undefined, v: FormValues): void {
  try {
    store?.setItem(DRAFT_KEY, JSON.stringify(v));
  } catch {
    /* a lost draft is not an error */
  }
}

export function clearDraft(store: KeyValueStore | undefined): void {
  try {
    store?.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to clear */
  }
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/** Reads a saved draft defensively. Unknown details stay unknown. */
export function loadDraft(store: KeyValueStore | undefined, today: Date): FormValues | undefined {
  let raw: string | null = null;
  try {
    raw = store?.getItem(DRAFT_KEY) ?? null;
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!data || typeof data !== "object") return undefined;
  const o = data as Record<string, unknown>;
  const d = (o["details"] && typeof o["details"] === "object" ? o["details"] : {}) as Record<string, unknown>;
  const details = emptyUnknownDetails();
  for (const k of FACT_KEYS) {
    const val = d[k];
    if (val === "yes" || val === "no") details[k] = val;
  }
  const observedOn = typeof o["observedOn"] === "string" && isIsoDate(o["observedOn"]) ? o["observedOn"] : isoDate(today);
  const licence = typeof o["licence"] === "string" && OPEN_LICENCES.includes(o["licence"]) ? o["licence"] : "";
  const values: FormValues = {
    placeName: str(o["placeName"], LIMITS.placeName),
    address: str(o["address"], LIMITS.address),
    details,
    observedOn,
    licence,
    note: str(o["note"], LIMITS.note),
  };
  const untouched =
    values.placeName === "" && values.address === "" && values.note === "" && values.licence === "" &&
    FACT_KEYS.every((k) => details[k] === "unknown");
  return untouched ? undefined : values;
}

