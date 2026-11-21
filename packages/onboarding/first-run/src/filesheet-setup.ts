import { foldText } from "./filter";
import { TARGETS, type FixedValues, type Mapping, type Target, type ValueWords } from "./filesheet";

/**
 * Saved choices for "Make a notes file from your own spreadsheet": what each
 * column holds (by the column's name, so a new spreadsheet with the same
 * columns in another order still matches), the source, licence and day typed
 * for every row, and the word lists. A person who brings in the same kind of
 * spreadsheet every week downloads the choices once and opens them next time.
 *
 * Opening saved choices only fills in the form: every value is read with the
 * same checks as typing it, columns the spreadsheet does not have are listed,
 * and nothing is made until the person chooses Make the notes file.
 */

export const SETUP_FORMAT = "app-sheet-setup";
export const SETUP_VERSION = 1;
const MAX_SETUP_CHARS = 100_000;
const MAX_TEXT = 300;

export interface SavedSetup {
  /** Column name, folded, to what it holds. Columns not used are not saved. */
  readonly columns: Readonly<Record<string, Target>>;
  readonly fixed: FixedValues;
  readonly words: ValueWords;
}

export type SetupFileError = "empty" | "too-large" | "not-json" | "wrong-format" | "wrong-version";

export interface AppliedSetup {
  readonly mapping: Target[];
  readonly fixed: FixedValues;
  readonly words: ValueWords;
  /** Saved column names this spreadsheet does not have, as saved. */
  readonly missing: readonly string[];
}

/** A column name as it is matched: case, accents and spaces at either end do not matter. */
export function columnKey(name: string): string {
  return foldText(name.trim()).replace(/\s+/g, " ");
}

/** The choices as a small JSON file. Only used columns are saved. */
export function setupToJson(header: readonly string[], mapping: Mapping, fixed: FixedValues, words: ValueWords): string {
  const columns: Record<string, Target> = {};
  header.forEach((name, i) => {
    const target = mapping[i] ?? "";
    if (target !== "" && name.trim() !== "") columns[name.trim()] = target;
  });
  return JSON.stringify({ format: SETUP_FORMAT, version: SETUP_VERSION, columns, fixed, words }, null, 2);
}

function text(v: unknown): string {
  return typeof v === "string" ? v.slice(0, MAX_TEXT) : "";
}

/** Reads saved choices. Bad parts are dropped, never guessed: a value that is not text is left empty. */
export function parseSetup(raw: string): { readonly ok: true; readonly setup: SavedSetup } | { readonly ok: false; readonly error: SetupFileError } {
  if (raw.trim() === "") return { ok: false, error: "empty" };
  if (raw.length > MAX_SETUP_CHARS) return { ok: false, error: "too-large" };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "not-json" };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "wrong-format" };
  const o = data as Record<string, unknown>;
  if (o["format"] !== SETUP_FORMAT) return { ok: false, error: "wrong-format" };
  if (o["version"] !== SETUP_VERSION) return { ok: false, error: "wrong-version" };
  const columns: Record<string, Target> = {};
  const rawColumns = o["columns"];
  if (rawColumns && typeof rawColumns === "object" && !Array.isArray(rawColumns)) {
    for (const [name, target] of Object.entries(rawColumns as Record<string, unknown>)) {
      if (typeof target === "string" && target !== "" && (TARGETS as readonly string[]).includes(target) && name.trim() !== "") columns[name.trim().slice(0, MAX_TEXT)] = target as Target;
    }
  }
  const f = (o["fixed"] ?? {}) as Record<string, unknown>;
  const w = (o["words"] ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    setup: {
      columns,
      fixed: { source: text(f["source"]), licence: text(f["licence"]), recordedOn: text(f["recordedOn"]) },
      words: { yes: text(w["yes"]), no: text(w["no"]), unknown: text(w["unknown"]) },
    },
  };
}

/**
 * Fills in the choices for a spreadsheet. Each saved column is matched by
 * name; a target is given to one column only, the first that matches. Empty
 * word lists in the file keep the current ones, so an old file never empties
 * a list by mistake.
 */
export function applySetup(setup: SavedSetup, header: readonly string[], current: ValueWords): AppliedSetup {
  const byKey = new Map(Object.entries(setup.columns).map(([name, target]) => [columnKey(name), { name, target }]));
  const used = new Set<Target>();
  const matched = new Set<string>();
  const mapping = header.map((name) => {
    const hit = byKey.get(columnKey(name));
    if (!hit || used.has(hit.target)) return "" as Target;
    used.add(hit.target);
    matched.add(columnKey(hit.name));
    return hit.target;
  });
  const missing = Object.keys(setup.columns).filter((name) => !matched.has(columnKey(name)));
  const words: ValueWords = {
    yes: setup.words.yes.trim() === "" ? current.yes : setup.words.yes,
    no: setup.words.no.trim() === "" ? current.no : setup.words.no,
    unknown: setup.words.unknown.trim() === "" ? current.unknown : setup.words.unknown,
  };
  return { mapping, fixed: setup.fixed, words, missing };
}

export function setupFilename(today: Date, l: "en" | "fr"): string {
  const day = today.toISOString().slice(0, 10);
  return l === "fr" ? `choix-du-tableur-${day}.json` : `spreadsheet-choices-${day}.json`;
}
