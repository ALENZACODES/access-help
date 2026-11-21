import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import {
  DEFAULT_WORDS,
  NO_FIXED,
  guessMapping,
  makeNotes,
  readSheet,
  setupProblems,
  type FixedValues,
  type Mapping,
  type SetupProblem,
  type Sheet,
  type SheetError,
  type SheetResult,
  type ValueWords,
} from "./filesheet";
import { FILE_SHEET_COPY as C, madeText, missingColumnsText, readText, setupFileErrorText } from "./filesheet-copy";
import { applySetup, parseSetup } from "./filesheet-setup";
import { injectStyles } from "./styles";
import { FIXED_ID, SETUP_OPEN_ID, SHEET_OPEN_ID, SHEET_TEXT_ID, WORDS_ID, columnSelectId, renderFileSheet, setupField, targetFrom } from "./views-filesheet";

export interface FileSheetOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileSheetHandle {
  setLocale(locale: Locale): void;
  sheet(): Sheet | undefined;
  mapping(): Mapping;
  fixed(): FixedValues;
  words(): ValueWords;
  result(): SheetResult | undefined;
  destroy(): void;
}

/**
 * Mounts "Make a notes file from your own spreadsheet". The spreadsheet and
 * every choice live in memory only; nothing is saved. It is its own entry
 * point, loaded only when a person opens it.
 */
export function mountFileSheet(root: HTMLElement, opts: FileSheetOptions): FileSheetHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let readError: SheetError | undefined;
  let sheet: Sheet | undefined;
  let mapping: Mapping = [];
  let fixed: FixedValues = NO_FIXED;
  let words: ValueWords = DEFAULT_WORDS;
  let setup: readonly SetupProblem[] = [];
  let result: SheetResult | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileSheet({ text, readError, sheet, mapping, fixed, words, setup, result, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  const value = (id: string): string | undefined => root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`#${id}`)?.value;

  /** Keeps everything typed and chosen, so a re-render never loses it. */
  function sync(): void {
    text = value(SHEET_TEXT_ID) ?? text;
    if (!sheet) return;
    mapping = sheet.header.map((_, i) => {
      const v = value(columnSelectId(i));
      return v === undefined ? (mapping[i] ?? "") : targetFrom(v);
    });
    fixed = { source: value(FIXED_ID.source) ?? fixed.source, licence: value(FIXED_ID.licence) ?? fixed.licence, recordedOn: (value(FIXED_ID.recordedOn) ?? fixed.recordedOn).trim() };
    words = { yes: value(WORDS_ID.yes) ?? words.yes, no: value(WORDS_ID.no) ?? words.no, unknown: value(WORDS_ID.unknown) ?? words.unknown };
  }

  function read(): void {
    sync();
    status = undefined;
    setup = [];
    result = undefined;
    const r = readSheet(text);
    if (!r.ok) {
      readError = r.error;
      sheet = undefined;
      render();
      focus("#fh-errors");
      return;
    }
    readError = undefined;
    sheet = r.sheet;
    mapping = guessMapping(r.sheet.header);
    render();
    focus(`#${columnSelectId(0)}`);
    announcer.say(readText(r.sheet.header.length, r.sheet.rows.length, locale));
  }

  function make(): void {
    if (!sheet) return;
    sync();
    status = undefined;
    setup = setupProblems(mapping, fixed, words, today);
    if (setup.length > 0) {
      result = undefined;
      render();
      focus("#fh-errors");
      return;
    }
    const made = makeNotes(sheet, mapping, fixed, words, today);
    if ("error" in made) {
      // The made CSV is larger than the import reads; the spreadsheet itself was within the limit.
      readError = "too-large";
      result = undefined;
      render();
      focus("#fh-errors");
      return;
    }
    result = made;
    render();
    focus("#fh-results");
    announcer.say(madeText(made.preview.notes.length, new Set(made.preview.problems.map((p) => p.row)).size, locale));
  }

  function clear(): void {
    text = "";
    readError = undefined;
    sheet = undefined;
    mapping = [];
    fixed = NO_FIXED;
    words = DEFAULT_WORDS;
    setup = [];
    result = undefined;
    status = t(C.cleared, locale);
    render();
    focus(`#${SHEET_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const picked = input.files?.[0];
    if (!picked) return;
    sync();
    if (picked.size > MAX_FILE_BYTES) {
      readError = "too-large";
      sheet = undefined;
      result = undefined;
      status = undefined;
      render();
      focus("#fh-errors");
      return;
    }
    let read: string;
    try {
      read = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${SHEET_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = read;
    readError = undefined;
    sheet = undefined;
    result = undefined;
    setup = [];
    status = t(C.opened, locale);
    render();
    focus(`#${SHEET_TEXT_ID}`);
    announcer.say(status);
  }

  /** Fills the form from a saved choices file. Nothing is made until the person asks. */
  async function openSetup(input: HTMLInputElement): Promise<void> {
    const picked = input.files?.[0];
    if (!picked || !sheet) return;
    sync();
    let raw: string;
    try {
      raw = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${SETUP_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed || !sheet) return;
    const parsed = parseSetup(raw);
    if (!parsed.ok) {
      status = setupFileErrorText(parsed.error, locale);
      render();
      focus(`#${SETUP_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    const applied = applySetup(parsed.setup, sheet.header, words);
    mapping = applied.mapping;
    fixed = applied.fixed;
    words = applied.words;
    setup = [];
    result = undefined;
    status = [t(C.setupApplied, locale), missingColumnsText(applied.missing, locale)].filter((x) => x !== "").join(" ");
    render();
    focus(`#${columnSelectId(0)}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fh-file-form" && id !== "fh-setup-form") return;
    e.preventDefault();
    if (id === "fh-file-form") read();
    else make();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fh-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      const known = href === `#${SHEET_TEXT_ID}` || setup.some((p) => `#${setupField(p, mapping)}` === href);
      if (known) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fh-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || !root.contains(el)) return;
    if (el.id === SHEET_OPEN_ID) void open(el);
    else if (el.id === SETUP_OPEN_ID) void openSetup(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      status = undefined;
      render();
    },
    sheet: () => sheet,
    mapping: () => mapping,
    fixed: () => fixed,
    words: () => words,
    result: () => result,
    destroy(): void {
      destroyed = true;
      root.removeEventListener("submit", onSubmit);
      root.removeEventListener("click", onClick);
      root.removeEventListener("change", onChange);
      if (ownAnnouncer) announcer.destroy();
      root.innerHTML = "";
    },
  };
}
