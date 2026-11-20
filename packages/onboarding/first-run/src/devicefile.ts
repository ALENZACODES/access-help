import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import { MAX_ASKED, parseAsked, type AskRecord } from "./asked";
import { BACKUP_FORMAT, mergeLists, type Lists } from "./backup";
import { EXPORT_FORMAT } from "./exchange";
import { MAX_BIN, parseBin, type BinEntry } from "./bin";
import { parseChecklist } from "./checklist";
import { LIMITS, parseNote, type Note } from "./model";
import { parseNeeds } from "./needs";
import { MAX_CORRECTIONS, parseCorrections, pruneCorrections, type Correction } from "./noteedit";
import { parseShortlist } from "./shortlist";
import { MAX_SETS, parseSets, type NeedSet } from "./needsets";
import { parsePassport, type Passport } from "./passport";
import { isEmptySurvey, parseSurvey, type Survey } from "./survey";
import { MAX_VISITS, parseVisit, sortVisits, type Visit } from "./visits";

/**
 * "Move everything to another device": one file with all the App keeps on this
 * device, and a careful way to bring such a file in.
 *
 * - Nothing is sent anywhere: the file is made here, and the person carries it.
 * - Every part read from a file goes through the same checks as stored data,
 *   so anything broken is dropped, never guessed.
 * - Bringing a file in only adds. Where both sides hold the same thing in two
 *   versions, this device's version is kept and the preview says so, except
 *   in "Questions you sent", where the most recent question wins because it is
 *   the more useful one. An access card or an unfinished survey is only taken
 *   when this device has none.
 * - The person sees, part by part, what would be added before anything changes,
 *   and chooses the parts.
 */
export const DEVICE_FORMAT = "app-device";
export const DEVICE_VERSION = 1;

export type Part = "notes" | "lists" | "asked" | "corrections" | "bin" | "survey" | "visits" | "passport" | "sets";
export const PARTS: readonly Part[] = ["notes", "lists", "asked", "corrections", "bin", "survey", "visits", "passport", "sets"];

export interface DeviceData {
  readonly notes: readonly Note[];
  readonly lists: Lists;
  readonly asked: readonly AskRecord[];
  readonly corrections: readonly Correction[];
  readonly bin: readonly BinEntry[];
  readonly survey: Survey | undefined;
  readonly visits: readonly Visit[];
  readonly passport: Passport | undefined;
  /** Saved sets of must-haves; left out of older files. */
  readonly sets: readonly NeedSet[];
}

export const MOVE_COPY = {
  open: { en: "Move everything to another device", fr: "Tout transférer vers un autre appareil" },
  title: { en: "Move everything to another device", fr: "Tout transférer vers un autre appareil" },
  intro: {
    en: "Make one file with everything the App keeps on this device, then bring it in on the other device. Nothing is sent anywhere: you carry the file.",
    fr: `Créez un fichier avec tout ce que l’App garde sur cet appareil, puis importez-le sur l’autre appareil. Rien n’est envoyé nulle part${NB}: vous transportez le fichier.`,
  },
  private: {
    en: "The file holds your notes, lists, visits, access card and saved sets of must-haves. Keep it somewhere private.",
    fr: "Le fichier contient vos notes, vos listes, vos visites, votre fiche d’accès et vos ensembles d’indispensables. Gardez-le dans un endroit privé.",
  },
  takeTitle: { en: "Take it with you", fr: "L’emporter" },
  inFile: { en: "In the file", fr: "Dans le fichier" },
  download: { en: "Download everything as one file", fr: "Télécharger tout en un fichier" },
  bringTitle: { en: "Bring a file in", fr: "Importer un fichier" },
  pasteLabel: { en: "Paste the text of the file", fr: "Collez le texte du fichier" },
  pasteHint: {
    en: "Open the file in any text app, copy all of it and paste it here. Nothing changes until you choose.",
    fr: "Ouvrez le fichier dans une application de texte, copiez tout et collez-le ici. Rien ne change tant que vous n’avez pas choisi.",
  },
  look: { en: "Show what the file would add", fr: "Montrer ce que le fichier ajouterait" },
  previewTitle: { en: "What the file would add", fr: "Ce que le fichier ajouterait" },
  previewHint: {
    en: "Bringing a file in only adds. Where both hold two versions of the same thing, this device keeps its own.",
    fr: "L’importation ne fait qu’ajouter. Si les deux contiennent deux versions de la même chose, cet appareil garde la sienne.",
  },
  colPart: { en: "Part", fr: "Partie" },
  colFile: { en: "In the file", fr: "Dans le fichier" },
  colAdd: { en: "Would be added", fr: "Serait ajouté" },
  colKept: { en: "Kept as on this device", fr: "Gardé comme sur cet appareil" },
  colRoom: { en: "No room", fr: "Pas de place" },
  choose: { en: "Bring in", fr: "Importer" },
  apply: { en: "Bring in the chosen parts", fr: "Importer les parties choisies" },
  cancel: { en: "Cancel, change nothing", fr: "Annuler, ne rien changer" },
  nothing: { en: "The file adds nothing new to this device.", fr: "Le fichier n’ajoute rien de nouveau à cet appareil." },
  noneChosen: { en: "Choose at least one part to bring in.", fr: "Choisissez au moins une partie à importer." },
  cancelled: { en: "Nothing was changed.", fr: "Rien n’a été modifié." },
  brought: { en: "Brought in", fr: "Importé" },
  unavailable: {
    en: "This browser did not keep everything. Some parts may not be saved.",
    fr: "Ce navigateur n’a pas tout gardé. Certaines parties ne sont peut-être pas enregistrées.",
  },
  back: { en: "Back to what is kept on this device", fr: "Retour à ce qui est gardé sur cet appareil" },
  goNotes: { en: "Go to My notes", fr: "Aller à Mes notes" },
  oldFile: {
    en: "Anything added on the other device after that day is not in it.",
    fr: "Ce qui a été ajouté sur l’autre appareil après ce jour n’y figure pas.",
  },
  isDeviceFile: {
    en: "This is an “everything” file. Bring it in with “Move everything to another device”, under Help.",
    fr: `C’est un fichier «${NN}tout${NN}». Importez-le avec «${NN}Tout transférer vers un autre appareil${NN}», dans Aide.`,
  },
  goLists: { en: "Go to the places list", fr: "Aller à la liste des lieux" },
} as const satisfies Record<string, Pair>;

export const PART_NAMES: Record<Part, Pair> = {
  notes: { en: "Notes", fr: "Notes" },
  lists: { en: "Must-haves, shortlist and checklist", fr: "Essentiels, présélection et liste de contrôle" },
  asked: { en: "Questions you sent", fr: "Questions envoyées" },
  corrections: { en: "Corrections to notes", fr: "Corrections des notes" },
  bin: { en: "Recently removed", fr: "Retirées récemment" },
  survey: { en: "Unfinished survey", fr: "Relevé inachevé" },
  visits: { en: "My visits", fr: "Mes visites" },
  passport: { en: "My access card", fr: "Ma fiche d’accès" },
  sets: { en: "Saved sets of must-haves", fr: "Ensembles d’indispensables enregistrés" },
};

export const MOVE_ERRORS: Record<DeviceError, Pair> = {
  empty: { en: "Paste the text of the file first.", fr: "Collez d’abord le texte du fichier." },
  "too-large": { en: "This text is too long to be a file from the App.", fr: "Ce texte est trop long pour être un fichier de l’App." },
  "not-json": { en: "This text is not a file from the App. Paste all of the file.", fr: "Ce texte n’est pas un fichier de l’App. Collez tout le fichier." },
  "wrong-format": {
    en: "This is not an “everything” file. Notes and lists have their own import on their pages.",
    fr: `Ce n’est pas un fichier «${NN}tout${NN}». Les notes et les listes ont leur propre importation sur leurs pages.`,
  },
  "is-notes": {
    en: "This is a notes file. Bring it in with “Import notes” on My notes.",
    fr: `C’est un fichier de notes. Importez-le avec «${NN}Importer des notes${NN}» dans Mes notes.`,
  },
  "is-lists": {
    en: "This is a lists backup. Bring it in on the places list, under the lists backup.",
    fr: "C’est une sauvegarde des listes. Importez-la dans la liste des lieux, sous la sauvegarde des listes.",
  },
  "wrong-version": {
    en: "This file was made by a newer version of the App. Update the App, then try again.",
    fr: "Ce fichier a été créé par une version plus récente de l’App. Mettez l’App à jour, puis réessayez.",
  },
};

export type DeviceError = "empty" | "too-large" | "not-json" | "wrong-format" | "wrong-version" | "is-notes" | "is-lists";

/** The file's text. Parts are written as the App stores them. */
export function exportDevice(d: DeviceData, exportedOn: string): string {
  return JSON.stringify(
    {
      format: DEVICE_FORMAT,
      version: DEVICE_VERSION,
      exportedOn,
      notes: d.notes,
      lists: d.lists,
      asked: d.asked,
      corrections: d.corrections,
      bin: d.bin,
      survey: d.survey && !isEmptySurvey(d.survey) ? d.survey : null,
      visits: d.visits,
      passport: d.passport ?? null,
      sets: d.sets,
    },
    null,
    1,
  );
}

/** "app-everything-2026-11-20.json". */
export function deviceFilename(today: Date): string {
  return `app-everything-${today.toISOString().slice(0, 10)}.json`;
}

export type DeviceImportResult = { readonly error: DeviceError } | { readonly error: undefined; readonly data: DeviceData; readonly exportedOn: string | undefined };

/** Reads a file's text. Each part goes through the App's own readers; broken parts are dropped. */
export function importDevice(text: string, today: Date): DeviceImportResult {
  if (text.trim() === "") return { error: "empty" };
  if (text.length > LIMITS.importChars) return { error: "too-large" };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "not-json" };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { error: "wrong-format" };
  const o = data as Record<string, unknown>;
  // A file from one of the App's other exports: say which, so the person can take it to the right page.
  if (o["format"] === EXPORT_FORMAT) return { error: "is-notes" };
  if (o["format"] === BACKUP_FORMAT) return { error: "is-lists" };
  if (o["format"] !== DEVICE_FORMAT) return { error: "wrong-format" };
  if (typeof o["version"] !== "number" || o["version"] > DEVICE_VERSION || o["version"] < 1) return { error: "wrong-version" };
  const notes: Note[] = [];
  for (const raw of Array.isArray(o["notes"]) ? o["notes"] : []) {
    const n = parseNote(raw);
    if (n && !notes.some((x) => x.id === n.id) && notes.length < LIMITS.notes) notes.push(n);
  }
  const l = o["lists"] && typeof o["lists"] === "object" ? (o["lists"] as Record<string, unknown>) : {};
  const json = (v: unknown): string => JSON.stringify(v ?? null);
  const lists: Lists = { needs: parseNeeds(json(l["needs"])), shortlist: parseShortlist(json(l["shortlist"])), checklist: parseChecklist(json(l["checklist"])) };
  const survey = o["survey"] ? parseSurvey(json(o["survey"]), today) : undefined;
  const visits: Visit[] = [];
  for (const raw of Array.isArray(o["visits"]) ? o["visits"] : []) {
    const v = parseVisit(raw, today);
    if (v && !visits.some((x) => x.id === v.id) && visits.length < MAX_VISITS) visits.push(v);
  }
  const passport = o["passport"] ? parsePassport(json(o["passport"]), today) : undefined;
  const sets = Array.isArray(o["sets"]) ? parseSets(JSON.stringify(o["sets"]), today) : [];
  const exportedOn = typeof o["exportedOn"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o["exportedOn"]) ? o["exportedOn"] : undefined;
  return {
    error: undefined,
    exportedOn,
    data: {
      notes,
      lists,
      asked: parseAsked(json(o["asked"])),
      corrections: parseCorrections(json(o["corrections"])),
      bin: parseBin(json(o["bin"]), today),
      survey: survey && !isEmptySurvey(survey) ? survey : undefined,
      visits: sortVisits(visits),
      passport,
      sets,
    },
  };
}

/** True when a text is an "everything" file, so other imports can send the person to the right page. Never throws. */
export function isDeviceFile(text: string): boolean {
  if (text.length > LIMITS.importChars) return false;
  try {
    const data: unknown = JSON.parse(text);
    return !!data && typeof data === "object" && (data as Record<string, unknown>)["format"] === DEVICE_FORMAT;
  } catch {
    return false;
  }
}

/** Files older than this get a word that later changes on the other device are not in them. */
export const OLD_FILE_DAYS = 90;

/** "Made on 2026-11-01, 19 days ago." and, for an old file, what that means. Nothing when the file has no date. */
export function fileAgeText(exportedOn: string | undefined, today: Date, l: Locale): string {
  if (exportedOn === undefined) return "";
  const [y, m, d] = exportedOn.split("-").map(Number) as [number, number, number];
  const days = Math.max(0, Math.round((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - Date.UTC(y, m - 1, d)) / 86_400_000));
  const ago = l === "fr" ? (days === 0 ? "aujourd’hui" : days === 1 ? "il y a 1 jour" : `il y a ${days} jours`) : days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
  const made = l === "fr" ? `Fichier créé le ${exportedOn}, ${ago}.` : `File made on ${exportedOn}, ${ago}.`;
  return days > OLD_FILE_DAYS ? `${made} ${t(MOVE_COPY.oldFile, l)}` : made;
}

/** How many things one part holds, as people count them. */
export function partCount(d: DeviceData, part: Part): number {
  switch (part) {
    case "notes":
      return d.notes.length;
    case "lists":
      return Object.keys(d.lists.needs).length + d.lists.shortlist.length + Object.keys(d.lists.checklist).length;
    case "asked":
      return d.asked.length;
    case "corrections":
      return d.corrections.length;
    case "bin":
      return d.bin.length;
    case "survey":
      return d.survey ? d.survey.stops.length : 0;
    case "visits":
      return d.visits.length;
    case "passport":
      return d.passport ? 1 : 0;
    case "sets":
      return d.sets.length;
  }
}

export interface PartPlan {
  readonly part: Part;
  readonly inFile: number;
  /** New things the part would add. */
  readonly add: number;
  /** Things in both, in two versions, where this device keeps its own. */
  readonly kept: number;
  /** New things left out because the part is full. */
  readonly noRoom: number;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const correctionKey = (c: Correction): string => `${c.noteId}|${c.on}|${c.parts.join(",")}`;

/** The newest date an "asked" record carries: when it was closed, or when it was asked. */
const askedWhen = (r: AskRecord): string => r.closedOn ?? r.askedOn;

/**
 * Merges every chosen part, and says what each part did. Parts not chosen
 * stay exactly as they are on this device.
 */
export function mergeDevice(current: DeviceData, incoming: DeviceData, chosen: ReadonlySet<Part>): { readonly data: DeviceData; readonly plans: readonly PartPlan[] } {
  const plans: PartPlan[] = [];
  const on = (p: Part): boolean => chosen.has(p);

  // Notes: new ids are added at the end, up to the limit; a note in both keeps this device's version.
  let notes = [...current.notes];
  {
    let add = 0;
    let kept = 0;
    let noRoom = 0;
    const next = [...current.notes];
    for (const n of incoming.notes) {
      const mine = next.find((x) => x.id === n.id);
      if (mine) {
        if (!sameJson(mine, n)) kept += 1;
        continue;
      }
      if (next.length >= LIMITS.notes) {
        noRoom += 1;
        continue;
      }
      next.push(n);
      add += 1;
    }
    if (on("notes")) notes = next;
    plans.push({ part: "notes", inFile: incoming.notes.length, add, kept, noRoom });
  }

  // Lists: the App's own merge for backups.
  let lists = current.lists;
  {
    const merged = mergeLists(current.lists, incoming.lists);
    const add = merged.added.needs + merged.added.shortlist + merged.added.notes;
    if (on("lists")) lists = merged.lists;
    plans.push({ part: "lists", inFile: partCount(incoming, "lists"), add, kept: 0, noRoom: 0 });
  }

  // Questions sent: one per place; the more recent record wins.
  let asked = [...current.asked];
  {
    let add = 0;
    let kept = 0;
    let noRoom = 0;
    const next = [...current.asked];
    for (const r of incoming.asked) {
      const i = next.findIndex((x) => x.id === r.id);
      if (i >= 0) {
        const mine = next[i] as AskRecord;
        if (sameJson(mine, r)) continue;
        if (askedWhen(r) > askedWhen(mine)) {
          next[i] = r;
          add += 1;
        } else kept += 1;
        continue;
      }
      if (next.length >= MAX_ASKED) {
        noRoom += 1;
        continue;
      }
      next.push(r);
      add += 1;
    }
    if (on("asked")) asked = next;
    plans.push({ part: "asked", inFile: incoming.asked.length, add, kept, noRoom });
  }

  // Recently removed: notes that are not in the notes and not already here.
  let bin = [...current.bin];
  {
    let add = 0;
    let noRoom = 0;
    const next = [...current.bin];
    const inNotes = new Set(notes.map((n) => n.id));
    for (const e of incoming.bin) {
      if (inNotes.has(e.note.id) || next.some((x) => x.note.id === e.note.id)) continue;
      if (next.length >= MAX_BIN) {
        noRoom += 1;
        continue;
      }
      next.push(e);
      add += 1;
    }
    if (on("bin")) bin = next;
    plans.push({ part: "bin", inFile: incoming.bin.length, add, kept: 0, noRoom });
  }

  // Corrections: every correction once, newest first, only for notes that exist after the merge.
  let corrections = [...current.corrections];
  {
    const ids = new Set([...notes.map((n) => n.id), ...bin.map((e) => e.note.id)]);
    const seen = new Set(current.corrections.map(correctionKey));
    const fresh = incoming.corrections.filter((c) => !seen.has(correctionKey(c)) && ids.has(c.noteId));
    const all = [...current.corrections, ...fresh].sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0));
    const room = Math.max(0, MAX_CORRECTIONS - current.corrections.length);
    if (on("corrections")) corrections = pruneCorrections(all.slice(0, MAX_CORRECTIONS), ids);
    plans.push({ part: "corrections", inFile: incoming.corrections.length, add: Math.min(fresh.length, room), kept: 0, noRoom: Math.max(0, fresh.length - room) });
  }

  // Survey: taken only when this device has none, so a walk in progress is never replaced.
  let survey = current.survey;
  {
    const mine = current.survey && !isEmptySurvey(current.survey);
    const theirs = incoming.survey !== undefined;
    if (on("survey") && !mine && theirs) survey = incoming.survey;
    plans.push({ part: "survey", inFile: partCount(incoming, "survey"), add: !mine && theirs ? partCount(incoming, "survey") : 0, kept: mine && theirs ? 1 : 0, noRoom: 0 });
  }

  // Visits: new ids are added, up to the limit; a visit in both keeps this device's version.
  let visits = [...current.visits];
  {
    let add = 0;
    let kept = 0;
    let noRoom = 0;
    const next = [...current.visits];
    for (const v of incoming.visits) {
      const mine = next.find((x) => x.id === v.id);
      if (mine) {
        if (!sameJson(mine, v)) kept += 1;
        continue;
      }
      if (next.length >= MAX_VISITS) {
        noRoom += 1;
        continue;
      }
      next.push(v);
      add += 1;
    }
    if (on("visits")) visits = sortVisits(next);
    plans.push({ part: "visits", inFile: incoming.visits.length, add, kept, noRoom });
  }

  // Access card: taken only when this device has none; one already here is kept as it is.
  let passport = current.passport;
  {
    const mine = current.passport !== undefined;
    const theirs = incoming.passport !== undefined;
    if (on("passport") && !mine && theirs) passport = incoming.passport;
    plans.push({ part: "passport", inFile: theirs ? 1 : 0, add: !mine && theirs ? 1 : 0, kept: mine && theirs && !sameJson(current.passport, incoming.passport) ? 1 : 0, noRoom: 0 });
  }

  // Recently removed is worked out before corrections (which need its notes), but every list shows the parts in one order.
  plans.sort((a, b) => PARTS.indexOf(a.part) - PARTS.indexOf(b.part));
  // Saved sets: new ones are added up to the limit; a set with an id or a name already here keeps this device's.
  let sets = [...current.sets];
  {
    let add = 0;
    let kept = 0;
    let noRoom = 0;
    const next = [...current.sets];
    for (const s of incoming.sets) {
      const mine = next.find((x) => x.id === s.id || x.name.toLocaleLowerCase() === s.name.toLocaleLowerCase());
      if (mine) {
        if (!sameJson(mine, s)) kept += 1;
        continue;
      }
      if (next.length >= MAX_SETS) {
        noRoom += 1;
        continue;
      }
      next.push(s);
      add += 1;
    }
    if (on("sets")) sets = next;
    plans.push({ part: "sets", inFile: incoming.sets.length, add, kept, noRoom });
  }

  return { data: { notes, lists, asked, corrections, bin, survey, visits, passport, sets }, plans };
}

/** The parts worth bringing in: the ones that would add something. */
export function usefulParts(plans: readonly PartPlan[]): Part[] {
  return plans.filter((p) => p.add > 0).map((p) => p.part);
}

/** "Brought in: Notes (3), Questions you sent (1)." */
export function broughtText(plans: readonly PartPlan[], chosen: ReadonlySet<Part>, l: Locale): string {
  const done = plans.filter((p) => chosen.has(p.part) && p.add > 0);
  if (done.length === 0) return t(MOVE_COPY.nothing, l);
  return `${t(MOVE_COPY.brought, l)}${l === "fr" ? NB : ""}: ${done.map((p) => `${t(PART_NAMES[p.part], l)} (${p.add})`).join(", ")}.`;
}

export function moveStrings(): Array<[string, Pair]> {
  return [
    ...Object.entries(MOVE_COPY).map(([k, p]): [string, Pair] => [`move.${k}`, p]),
    ...Object.entries(PART_NAMES).map(([k, p]): [string, Pair] => [`move.part.${k}`, p]),
    ...Object.entries(MOVE_ERRORS).map(([k, p]): [string, Pair] => [`move.error.${k}`, p]),
  ];
}
