import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_LIST_COPY as C, checkSummary, type ListError } from "./filelist-copy";
import { readSheet, type Sheet } from "./filesheet";
import { readStreetFile, type StreetFile } from "./filestreets";
import { columnsProblems, guessColumns, readEntries, type ColumnsProblem, type Decisions, type ListCheck, type ListColumns } from "./placelist";
import { injectStyles } from "./styles";
import { LIST_OPEN_ID, LIST_TEXT_ID, NOTES_OPEN_ID, NOTES_TEXT_ID, listResults, problemTarget, readColumns, readDecisions, renderFileList } from "./views-filelist";

export interface FileListOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileListHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  sheet(): Sheet | undefined;
  columns(): ListColumns;
  check(): ListCheck | undefined;
  decisions(): Decisions;
  destroy(): void;
}

/**
 * Mounts "Check your list of places against a notes file". The file and the
 * list live in memory only; nothing is saved. It is its own entry point,
 * loaded only when a person opens it.
 */
export function mountFileList(root: HTMLElement, opts: FileListOptions): FileListHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let notesText = "";
  let listText = "";
  let notesError: ImportError | "no-notes" | undefined;
  let listError: ListError | undefined;
  let file: StreetFile | undefined;
  let sheet: Sheet | undefined;
  let columns: ListColumns = { name: 0, address: -1 };
  let licence = "CC0-1.0";
  let problems: readonly ColumnsProblem[] = [];
  let decisions: Decisions = {};
  let readListText: string | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function ctx() {
    return { notesText, listText, notesError, listError, file, sheet, columns, licence, problems, decisions, locale, today, statusMessage: status };
  }

  function render(): void {
    root.innerHTML = renderFileList(ctx());
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const n = root.querySelector<HTMLTextAreaElement>(`#${NOTES_TEXT_ID}`);
    if (n) notesText = n.value;
    const s = root.querySelector<HTMLTextAreaElement>(`#${LIST_TEXT_ID}`);
    if (s) listText = s.value;
  }

  /** Checks the columns and the list's rows; a list with no usable name in the column is an error on the list. */
  function settle(): void {
    if (!sheet) return;
    problems = columnsProblems(sheet, columns, licence);
    if (problems.length === 0 && readEntries(sheet, columns).entries.length === 0) listError = "no-entries";
    else if (listError === "no-entries") listError = undefined;
  }

  function show(updated: boolean): void {
    render();
    const results = listResults(ctx());
    if (notesError || listError || problems.length > 0 || !results) {
      focus("#fpl-errors");
      return;
    }
    focus("#fpl-summary");
    const text = checkSummary(results.check, locale);
    announcer.say(updated ? `${t(C.updated, locale)} ${text}` : text);
  }

  function read(): void {
    sync();
    status = undefined;
    const n = readStreetFile(notesText, today, locale);
    notesError = n.ok ? undefined : n.error;
    file = n.ok ? n.file : undefined;
    const s = readSheet(listText);
    listError = s.ok ? undefined : s.error;
    const before = sheet?.header.join("\u0001");
    sheet = s.ok ? s.sheet : undefined;
    // A new list gets a fresh guess at its columns; reading the same list again keeps the choice.
    if (sheet && sheet.header.join("\u0001") !== before) columns = guessColumns(sheet.header);
    // Answers belong to the rows of one list: a changed list starts with none.
    if (listText !== readListText) decisions = {};
    readListText = listText;
    problems = [];
    settle();
    show(false);
  }

  function decide(): void {
    if (!listResults(ctx())) return;
    decisions = readDecisions(root, decisions);
    status = undefined;
    show(true);
  }

  function update(): void {
    if (!sheet) return;
    sync();
    status = undefined;
    const c = readColumns(root, columns, licence);
    columns = c.columns;
    licence = c.licence;
    settle();
    show(true);
  }

  function clear(): void {
    notesText = "";
    listText = "";
    notesError = undefined;
    listError = undefined;
    file = undefined;
    sheet = undefined;
    columns = { name: 0, address: -1 };
    licence = "CC0-1.0";
    problems = [];
    decisions = {};
    readListText = undefined;
    status = t(C.cleared, locale);
    render();
    focus(`#${NOTES_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement, target: "notes" | "list"): Promise<void> {
    const picked = input.files?.[0];
    if (!picked) return;
    sync();
    if (picked.size > MAX_FILE_BYTES) {
      if (target === "notes") notesError = "too-large";
      else listError = "too-large";
      status = undefined;
      render();
      focus("#fpl-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${input.id}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    if (target === "notes") {
      notesText = content;
      notesError = undefined;
    } else {
      listText = content;
      listError = undefined;
    }
    status = t(C.opened, locale);
    render();
    focus(`#${target === "notes" ? NOTES_TEXT_ID : LIST_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fpl-file-form" && id !== "fpl-columns-form" && id !== "fpl-decide-form") return;
    e.preventDefault();
    if (id === "fpl-file-form") read();
    else if (id === "fpl-columns-form") update();
    else decide();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fpl-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      const allowed = [`#${NOTES_TEXT_ID}`, `#${LIST_TEXT_ID}`, ...problems.map((p) => `#${problemTarget(p)}`)];
      if (allowed.includes(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fpl-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || !root.contains(el)) return;
    if (el.id === NOTES_OPEN_ID) void open(el, "notes");
    else if (el.id === LIST_OPEN_ID) void open(el, "list");
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      // Places are grouped in the language's alphabet, so the file is read again.
      if (file) {
        const r = readStreetFile(notesText, today, locale);
        if (r.ok) file = r.file;
      }
      status = undefined;
      render();
    },
    file: () => file,
    sheet: () => sheet,
    columns: () => columns,
    check: () => listResults(ctx())?.check,
    decisions: () => decisions,
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
