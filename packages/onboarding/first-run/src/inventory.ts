import { CHECKLIST_KEY, parseChecklist } from "./checklist";
import type { Pair } from "./copy";
import { DISPLAY_KEY } from "./display";
import { DRAFT_KEY } from "./form";
import { NOTES_KEY, loadNotes } from "./outbox";
import { SHORTLIST_KEY, parseShortlist } from "./shortlist";
import { NEEDS_KEY, parseNeeds } from "./needs";
import { SURVEY_KEY, parseSurvey } from "./survey";
import { SURVEY_COPY } from "./survey-copy";
import { ASKED_COPY, ASKED_KEY, parseAsked } from "./asked";
import { BIN_COPY, BIN_KEY, countBinEntries } from "./bin";
import { CORRECTIONS_KEY, EDIT_COPY, parseCorrections } from "./noteedit";
import { PREFS_KEY, type KeyValueStore } from "./store";

/**
 * What the App keeps on this device, item by item. Everything it saves goes
 * through one of the keys below; the page reads each one, says what is in it
 * in plain words, and can remove it. Nothing is sent anywhere. A saved item
 * that cannot be read is reported as unreadable, never guessed at.
 */
export type ItemId = "notes" | "shortlist" | "needs" | "checklist" | "draft" | "survey" | "asked" | "bin" | "corrections" | "display" | "prefs";

export interface Item {
  readonly id: ItemId;
  readonly key: string;
  readonly title: Pair;
  readonly what: Pair;
}

export const ITEMS: readonly Item[] = [
  {
    id: "notes",
    key: NOTES_KEY,
    title: { en: "My notes", fr: "Mes notes" },
    what: { en: "The notes about places that you added.", fr: "Les notes sur des lieux que vous avez ajoutées." },
  },
  {
    id: "shortlist",
    key: SHORTLIST_KEY,
    title: { en: "Shortlist", fr: "Liste restreinte" },
    what: { en: "The places you chose to keep handy.", fr: "Les lieux que vous avez choisi de garder sous la main." },
  },
  {
    id: "needs",
    key: NEEDS_KEY,
    title: { en: "Saved must-haves", fr: "Incontournables enregistrés" },
    what: { en: "The details you asked for when you looked at places.", fr: "Les détails que vous avez demandés en consultant des lieux." },
  },
  {
    id: "checklist",
    key: CHECKLIST_KEY,
    title: { en: "Plan notes", fr: "Notes de plan" },
    what: { en: "Which questions you asked and your own answers in a visit plan.", fr: "Les questions posées et vos propres réponses dans un plan de visite." },
  },
  {
    id: "draft",
    key: DRAFT_KEY,
    title: { en: "Unfinished note", fr: "Note inachevée" },
    what: { en: "A note you started and did not finish.", fr: "Une note commencée et non terminée." },
  },
  {
    id: "survey",
    key: SURVEY_KEY,
    title: SURVEY_COPY.deviceTitle,
    what: SURVEY_COPY.deviceWhat,
  },
  {
    id: "asked",
    key: ASKED_KEY,
    title: ASKED_COPY.deviceTitle,
    what: ASKED_COPY.deviceWhat,
  },
  {
    id: "bin",
    key: BIN_KEY,
    title: BIN_COPY.deviceTitle,
    what: BIN_COPY.deviceWhat,
  },
  {
    id: "corrections",
    key: CORRECTIONS_KEY,
    title: EDIT_COPY.deviceTitle,
    what: EDIT_COPY.deviceWhat,
  },
  {
    id: "display",
    key: DISPLAY_KEY,
    title: { en: "Display settings", fr: "Réglages d’affichage" },
    what: { en: "Text size, spacing, contrast and motion.", fr: "Taille du texte, espacement, contraste et animations." },
  },
  {
    id: "prefs",
    key: PREFS_KEY,
    title: { en: "Language and way of moving", fr: "Langue et façon de se déplacer" },
    what: { en: "The language, the way of moving and the highlight interval you chose.", fr: "La langue, la façon de se déplacer et l’intervalle de surbrillance que vous avez choisis." },
  },
];

export function getItem(id: string | undefined): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}

export type ItemState = "empty" | "saved" | "unreadable" | "unavailable";

export interface ItemReport {
  readonly id: ItemId;
  readonly state: ItemState;
  /** How many entries could be read, for items that are lists. Undefined for the rest, so no number is made up. */
  readonly count: number | undefined;
  readonly bytes: number;
}

const utf8 = (s: string): number => new TextEncoder().encode(s).length;

function readRaw(store: KeyValueStore | undefined, key: string): { raw: string | null; ok: boolean } {
  if (!store) return { raw: null, ok: false };
  try {
    return { raw: store.getItem(key), ok: true };
  } catch {
    return { raw: null, ok: false };
  }
}

function isJson(raw: string): boolean {
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

/** The number of entries that pass the same checks the App uses when it reads the item, or undefined if the item is not a list. */
function countReadable(id: ItemId, raw: string, store: KeyValueStore): number | undefined {
  switch (id) {
    case "notes":
      return loadNotes(store).notes.length;
    case "shortlist":
      return parseShortlist(raw).length;
    case "checklist":
      return Object.keys(parseChecklist(raw)).length;
    case "needs":
      return Object.keys(parseNeeds(raw)).length;
    case "asked":
      return parseAsked(raw).length;
    case "bin":
      // Entries are counted as written; the 30 days are applied when the App reads them for the page.
      return countBinEntries(raw);
    case "corrections":
      return parseCorrections(raw).length;
    case "survey":
      // The places in the walk that can be read back. The date only fills in a missing visit date, so any day will do.
      return parseSurvey(raw, new Date(0))?.stops.length ?? 0;
    default:
      return undefined;
  }
}

export function inspectItem(store: KeyValueStore | undefined, item: Item): ItemReport {
  const { raw, ok } = readRaw(store, item.key);
  if (!ok) return { id: item.id, state: "unavailable", count: undefined, bytes: 0 };
  if (raw === null || raw === "") return { id: item.id, state: "empty", count: undefined, bytes: 0 };
  const bytes = utf8(raw);
  if (!isJson(raw)) return { id: item.id, state: "unreadable", count: undefined, bytes };
  const count = store ? countReadable(item.id, raw, store) : undefined;
  // A list that holds entries but none that can be read is as good as lost to the App: say so.
  if (count === 0 && /^\s*(\[\s*[^\]\s]|\{\s*[^}\s])/.test(raw)) return { id: item.id, state: "unreadable", count, bytes };
  if (count === 0) return { id: item.id, state: "empty", count, bytes };
  return { id: item.id, state: "saved", count, bytes };
}

export function inspectAll(store: KeyValueStore | undefined): ItemReport[] {
  return ITEMS.map((i) => inspectItem(store, i));
}

export function totalBytes(reports: readonly ItemReport[]): number {
  return reports.reduce((n, r) => n + r.bytes, 0);
}

export function hasAnything(reports: readonly ItemReport[]): boolean {
  return reports.some((r) => r.state === "saved" || r.state === "unreadable");
}

export type ClearResult = "cleared" | "unavailable";

export function clearItem(store: KeyValueStore | undefined, id: ItemId): ClearResult {
  const item = getItem(id);
  if (!store || !item) return "unavailable";
  try {
    store.removeItem(item.key);
    return store.getItem(item.key) === null ? "cleared" : "unavailable";
  } catch {
    return "unavailable";
  }
}

/** Clears every item that has something in it. Returns the ids that were cleared and the ones that could not be. */
export function clearAll(store: KeyValueStore | undefined): { cleared: ItemId[]; failed: ItemId[] } {
  const cleared: ItemId[] = [];
  const failed: ItemId[] = [];
  for (const r of inspectAll(store)) {
    if (r.state === "empty") continue;
    if (clearItem(store, r.id) === "cleared") cleared.push(r.id);
    else failed.push(r.id);
  }
  return { cleared, failed };
}

/** Size in kilobytes with one decimal under 10 KB, whole numbers above. Never "0 KB" for something that is saved. */
export function formatKb(bytes: number, locale: "en" | "fr" = "en"): string {
  if (bytes <= 0) return "0";
  const kb = bytes / 1024;
  const text = kb < 0.1 ? "0.1" : kb < 10 ? (Math.round(kb * 10) / 10).toString() : Math.round(kb).toString();
  return locale === "fr" ? text.replace(".", ",") : text;
}

/** Copy checked by the copy audit. */
export function inventoryStrings(): Array<[string, Pair]> {
  return ITEMS.flatMap((i): Array<[string, Pair]> => [
    [`device.${i.id}.title`, i.title],
    [`device.${i.id}.what`, i.what],
  ]);
}
