import type { Locale } from "../../switch-first/src/index";
import { t, type Pair } from "./copy";
import { FACT_KEYS } from "./facts";
import type { Requirement } from "./filter";
import { isoDate, looksLikeEmail, looksLikePhone } from "./form";
import { hasControlChars } from "./model";
import { needsLines } from "./musthaves";
import { parseNeeds } from "./needs";
import type { KeyValueStore } from "./store";

/**
 * Saved sets of must-haves: one person's needs can change with the day, the
 * device they bring or who comes along ("With the power chair", "With the
 * walker"). Each set is a name the person chooses and the must-haves it
 * holds. Using a set makes its must-haves the ones in use; nothing else
 * changes. The sets describe places to look for, not the person, and stay on
 * this device.
 */
export const NEED_SETS_KEY = "app.onboarding.needsets.v1";
export const MAX_SETS = 10;
export const SET_NAME_MAX = 40;

export interface NeedSet {
  readonly id: string;
  readonly name: string;
  readonly needs: Requirement;
  /** The day it was saved or last changed. */
  readonly savedOn: string;
}

export type SetNameError = "required" | "too-long" | "control-chars" | "personal-email" | "personal-phone" | "taken" | "full" | "empty-needs";

export const SETS_COPY = {
  title: { en: "Saved sets of must-haves", fr: "Ensembles d’indispensables enregistrés" },
  intro: {
    en: "Keep more than one set, for example one for each mobility device, and switch between them. Each set holds the must-haves chosen above.",
    fr: "Gardez plus d’un ensemble, par exemple un pour chaque aide à la mobilité, et passez de l’un à l’autre. Chaque ensemble contient les indispensables choisis plus haut.",
  },
  none: { en: "No saved sets yet.", fr: "Aucun ensemble enregistré pour l’instant." },
  nameLabel: { en: "Name for these must-haves", fr: "Nom pour ces indispensables" },
  nameHint: { en: "For example “With the power chair”. Up to 40 characters.", fr: "Par exemple «\u202FAvec le fauteuil motorisé\u202F». Jusqu’à 40 caractères." },
  save: { en: "Save these must-haves as a set", fr: "Enregistrer ces indispensables comme ensemble" },
  saved: { en: "The set was saved.", fr: "L’ensemble a été enregistré." },
  used: { en: "These must-haves are now in use.", fr: "Ces indispensables sont maintenant utilisés." },
  updated: { en: "The set now holds the must-haves in use.", fr: "L’ensemble contient maintenant les indispensables utilisés." },
  renamed: { en: "The set was renamed.", fr: "L’ensemble a été renommé." },
  removed: { en: "The set was removed. The must-haves in use did not change.", fr: "L’ensemble a été retiré. Les indispensables utilisés n’ont pas changé." },
  inUse: { en: "In use now", fr: "Utilisé maintenant" },
  noNeeds: { en: "No must-haves", fr: "Aucun indispensable" },
  renameLabel: { en: "New name", fr: "Nouveau nom" },
  renameSave: { en: "Save the new name", fr: "Enregistrer le nouveau nom" },
  renameCancel: { en: "Keep the old name", fr: "Garder l’ancien nom" },
  confirmRemove: { en: "Yes, remove the set", fr: "Oui, retirer l’ensemble" },
  keep: { en: "No, keep it", fr: "Non, le garder" },
  unavailable: { en: "This browser did not keep the change.", fr: "Ce navigateur n’a pas gardé le changement." },
  deviceWhat: {
    en: "Your saved sets of must-haves: their names and the must-haves in each.",
    fr: "Vos ensembles d’indispensables enregistrés\u00A0: leurs noms et les indispensables de chacun.",
  },
  errorsTitle: { en: "Fix this first", fr: "Corrigez d’abord ceci" },
} as const satisfies Record<string, Pair>;

export const SET_NAME_ERRORS: Readonly<Record<SetNameError, Pair>> = {
  required: { en: "Write a name for the set.", fr: "Écrivez un nom pour l’ensemble." },
  "too-long": { en: "The name can be up to 40 characters.", fr: "Le nom peut compter jusqu’à 40 caractères." },
  "control-chars": { en: "The name contains a character that cannot be kept.", fr: "Le nom contient un caractère qui ne peut pas être gardé." },
  "personal-email": { en: "Leave out email addresses.", fr: "N’indiquez pas d’adresse courriel." },
  "personal-phone": { en: "Leave out phone numbers.", fr: "N’indiquez pas de numéro de téléphone." },
  taken: { en: "Another set already has this name.", fr: "Un autre ensemble porte déjà ce nom." },
  full: { en: "This device keeps up to 10 sets. Remove one to save another.", fr: "Cet appareil garde jusqu’à 10 ensembles. Retirez-en un pour en enregistrer un autre." },
  "empty-needs": { en: "Choose at least one must-have first.", fr: "Choisissez d’abord au moins un indispensable." },
};

const sameName = (a: string, b: string): boolean => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/** Problems with a name; `exceptId` is the set being renamed, which may keep its own name. */
export function checkSetName(name: string, sets: readonly NeedSet[], exceptId?: string): SetNameError[] {
  const n = name.trim();
  if (n === "") return ["required"];
  const errors: SetNameError[] = [];
  if (n.length > SET_NAME_MAX) errors.push("too-long");
  if (hasControlChars(n)) errors.push("control-chars");
  if (looksLikeEmail(n)) errors.push("personal-email");
  if (looksLikePhone(n)) errors.push("personal-phone");
  if (sets.some((s) => s.id !== exceptId && sameName(s.name, n))) errors.push("taken");
  return errors;
}

/** True when the two hold the same must-haves. */
export function sameNeeds(a: Requirement, b: Requirement): boolean {
  return FACT_KEYS.every((k) => a[k] === b[k]);
}

const hasAny = (needs: Requirement): boolean => FACT_KEYS.some((k) => needs[k] !== undefined);

/** Only the details with a must-have, in the App's order. */
export function cleanNeeds(needs: Requirement): Requirement {
  const out: Partial<Record<(typeof FACT_KEYS)[number], "yes" | "no">> = {};
  for (const k of FACT_KEYS) {
    const v = needs[k];
    if (v === "yes" || v === "no") out[k] = v;
  }
  return out;
}

export type SetResult = { readonly ok: true; readonly sets: NeedSet[] } | { readonly ok: false; readonly errors: readonly SetNameError[] };

/** A new set holding the must-haves in use. */
export function addSet(sets: readonly NeedSet[], name: string, needs: Requirement, today: Date, id: string): SetResult {
  const errors = checkSetName(name, sets);
  if (!hasAny(needs)) errors.push("empty-needs");
  if (sets.length >= MAX_SETS) errors.push("full");
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, sets: [...sets, { id, name: name.trim(), needs: cleanNeeds(needs), savedOn: isoDate(today) }] };
}

export function renameSet(sets: readonly NeedSet[], id: string, name: string, today: Date): SetResult {
  const errors = checkSetName(name, sets, id);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, sets: sets.map((s) => (s.id === id ? { ...s, name: name.trim(), savedOn: isoDate(today) } : s)) };
}

/** The set now holds the must-haves in use. */
export function updateSet(sets: readonly NeedSet[], id: string, needs: Requirement, today: Date): SetResult {
  if (!hasAny(needs)) return { ok: false, errors: ["empty-needs"] };
  return { ok: true, sets: sets.map((s) => (s.id === id ? { ...s, needs: cleanNeeds(needs), savedOn: isoDate(today) } : s)) };
}

export function removeSet(sets: readonly NeedSet[], id: string): NeedSet[] {
  return sets.filter((s) => s.id !== id);
}

/** The set whose must-haves are the ones in use, if any. */
export function setInUse(sets: readonly NeedSet[], needs: Requirement): NeedSet | undefined {
  return hasAny(needs) ? sets.find((s) => sameNeeds(s.needs, needs)) : undefined;
}

/** "Step-free entrance: Yes; Elevator: Yes", or that there are none. */
export function setSummary(s: NeedSet, l: Locale): string {
  const lines = needsLines(s.needs, l);
  return lines.length === 0 ? t(SETS_COPY.noNeeds, l) : lines.join(l === "fr" ? "\u202F; " : "; ");
}

/** "Showing places that meet With the walker." */
export function filteredText(s: NeedSet, l: Locale): string {
  return l === "fr" ? `Lieux filtrés avec ${s.name}.` : `Places filtered with ${s.name}.`;
}

/** Button names that say which set they act on. */
export function setLabel(kind: "use" | "update" | "rename" | "remove" | "filter" | "card", s: NeedSet, l: Locale): string {
  const n = s.name;
  const fr: Record<typeof kind, string> = {
    use: `Utiliser ${n}`,
    update: `Mettre les indispensables utilisés dans ${n}`,
    rename: `Renommer ${n}`,
    remove: `Retirer l’ensemble ${n}`,
    filter: `Filtrer avec ${n}`,
    card: `Prendre les indispensables de ${n}`,
  };
  const en: Record<typeof kind, string> = {
    use: `Use ${n}`,
    update: `Put the must-haves in use into ${n}`,
    rename: `Rename ${n}`,
    remove: `Remove the set ${n}`,
    filter: `Filter with ${n}`,
    card: `Use the must-haves of ${n}`,
  };
  return l === "fr" ? fr[kind] : en[kind];
}

export const defaultSetId = (): string => `s-${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;

const ID_RE = /^s-[a-z0-9]{1,24}$/;

/** One set from stored or imported data; undefined when anything is off. */
export function parseSet(raw: unknown, today: Date): NeedSet | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const id = o["id"];
  const name = o["name"];
  if (typeof id !== "string" || !ID_RE.test(id) || typeof name !== "string") return undefined;
  const n = name.trim();
  if (n === "" || n.length > SET_NAME_MAX || hasControlChars(n) || looksLikeEmail(n) || looksLikePhone(n)) return undefined;
  const needs = parseNeeds(JSON.stringify(o["needs"] ?? {}));
  if (!hasAny(needs)) return undefined;
  const day = isoDate(today);
  const savedOn = typeof o["savedOn"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o["savedOn"]) && o["savedOn"] <= day ? o["savedOn"] : day;
  return { id, name: n, needs: cleanNeeds(needs), savedOn };
}

/** Saved sets, read defensively: broken ones, repeated ids or names, and any past the limit are dropped. */
export function parseSets(raw: string | null, today: Date): NeedSet[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: NeedSet[] = [];
  for (const item of data) {
    const s = parseSet(item, today);
    if (s && out.length < MAX_SETS && !out.some((x) => x.id === s.id || sameName(x.name, s.name))) out.push(s);
  }
  return out;
}

export function loadSets(store: KeyValueStore | undefined, today: Date): NeedSet[] {
  try {
    return parseSets(store?.getItem(NEED_SETS_KEY) ?? null, today);
  } catch {
    return [];
  }
}

export function saveSets(store: KeyValueStore | undefined, sets: readonly NeedSet[]): "saved" | "unavailable" {
  if (!store) return "unavailable";
  try {
    if (sets.length === 0) store.removeItem(NEED_SETS_KEY);
    else store.setItem(NEED_SETS_KEY, JSON.stringify(sets));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function setsStrings(): Array<[string, Pair]> {
  return [...Object.entries(SETS_COPY).map(([k, p]): [string, Pair] => [`sets.${k}`, p]), ...Object.entries(SET_NAME_ERRORS).map(([k, p]): [string, Pair] => [`sets.error.${k}`, p])];
}
