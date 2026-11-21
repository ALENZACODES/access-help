import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_DATES_COPY as C, copySummary } from "./filedates-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { applyDates, dateProblem, futureRecords, type DateChoice, type DateProblem, type DatesReport, type FixedCopy } from "./recorddates";
import { injectStyles } from "./styles";
import { DATES_OPEN_ID, DATES_TEXT_ID, choiceOf, readPicks, renderFileDates, type DatePick } from "./views-filedates";

export interface FileDatesOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileDatesHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  /** The records dated after today, or undefined before a file is read. */
  report(): DatesReport | undefined;
  /** The copy on screen, or undefined before one is made. */
  copy(): FixedCopy | undefined;
  destroy(): void;
}

/**
 * Mounts "Fix record dates". The file lives in memory only; nothing is saved.
 * It is its own entry point, loaded only when a person opens it.
 */
export function mountFileDates(root: HTMLElement, opts: FileDatesOptions): FileDatesHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let report: DatesReport | undefined;
  let picks: ReadonlyMap<string, DatePick> = new Map();
  let typed: ReadonlyMap<string, string> = new Map();
  let typedErrors: ReadonlyMap<string, DateProblem> = new Map();
  let noneError = false;
  let made: ReadonlyMap<string, DateChoice> | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileDates({ text, error, file, report, picks, typed, typedErrors, noneError, made, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${DATES_TEXT_ID}`);
    if (box) text = box.value;
    if (report && root.querySelector("#fdt-fix-form")) ({ picks, typed } = readPicks(root, report));
  }

  function reset(): void {
    report = undefined;
    picks = new Map();
    typed = new Map();
    typedErrors = new Map();
    noneError = false;
    made = undefined;
  }

  function read(): void {
    sync();
    status = undefined;
    reset();
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fdt-errors");
      return;
    }
    error = undefined;
    file = r.file;
    report = futureRecords(r.file, today);
    render();
    focus("#fdt-results");
    announcer.say(root.querySelector("#fdt-summary")?.textContent ?? "");
  }

  function make(): void {
    if (!file || !report) return;
    sync();
    status = undefined;
    const choices = new Map<string, DateChoice>();
    const errors = new Map<string, DateProblem>();
    for (const f of report.future) {
      const c = choiceOf(f, picks.get(f.id), typed.get(f.id), today);
      if (c) choices.set(f.id, c);
      else errors.set(f.id, dateProblem(typed.get(f.id) ?? "", today) ?? "empty");
    }
    typedErrors = errors;
    noneError = errors.size === 0 && ![...choices.values()].some((c) => c.kind !== "keep");
    if (noneError || errors.size > 0) {
      render();
      focus("#fdt-errors");
      return;
    }
    made = choices;
    render();
    focus("#fdt-copy");
    announcer.say(`${t(C.made, locale)} ${copySummary(applyDates(file, report, made, today), locale)}`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    reset();
    status = t(C.cleared, locale);
    render();
    focus(`#${DATES_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      reset();
      status = undefined;
      render();
      focus("#fdt-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${DATES_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    reset();
    status = t(C.opened, locale);
    render();
    focus(`#${DATES_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fdt-file-form" && id !== "fdt-fix-form") return;
    e.preventDefault();
    if (id === "fdt-file-form") read();
    else make();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fdt-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      // Every link in the summary names a field on the page.
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fdt-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === DATES_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      // Places are read again in the new language; records keep their ids, so the choices stay.
      if (file) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) {
          file = r.file;
          report = futureRecords(r.file, today);
        }
      }
      status = undefined;
      render();
    },
    file: () => file,
    report: () => report,
    copy: () => (file && report && made ? applyDates(file, report, made, today) : undefined),
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
