import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_REPLACE_COPY as C, copySummary } from "./filereplace-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { injectStyles } from "./styles";
import { DEFAULT_REPLACE, applyReplace, findHits, optionProblems, type OptionProblem, type ReplacedCopy, type ReplaceOptions, type ReplaceReport } from "./textreplace";
import { FIND_ID, REPLACE_OPEN_ID, REPLACE_TEXT_ID, readAccepted, readOptions, renderFileReplace } from "./views-filereplace";

export interface FileReplaceOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileReplaceHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  /** The changes shown, or undefined before any are. */
  report(): ReplaceReport | undefined;
  /** The copy on screen, or undefined before one is made. */
  copy(): ReplacedCopy | undefined;
  destroy(): void;
}

/**
 * Mounts "Find and replace in notes". The file lives in memory only; nothing
 * is saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileReplace(root: HTMLElement, opts: FileReplaceOptions): FileReplaceHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let form: ReplaceOptions = DEFAULT_REPLACE;
  let problems: readonly OptionProblem[] = [];
  let report: ReplaceReport | undefined;
  let options: ReplaceOptions | undefined;
  let accepted: ReadonlySet<string> = new Set();
  let noneError = false;
  let made: ReadonlySet<string> | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileReplace({ text, error, file, form, problems, report, options, accepted, noneError, made, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${REPLACE_TEXT_ID}`);
    if (box) text = box.value;
    if (root.querySelector("#fre-options-form")) form = readOptions(root);
    if (report && root.querySelector("#fre-apply-form")) accepted = readAccepted(root, report);
  }

  /** Drops the changes and the copy; the options on the form stay for the next file. */
  function resetResults(): void {
    problems = [];
    report = undefined;
    options = undefined;
    accepted = new Set();
    noneError = false;
    made = undefined;
  }

  function read(): void {
    sync();
    status = undefined;
    resetResults();
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fre-errors");
      return;
    }
    error = undefined;
    file = r.file;
    const notes = r.file.places.reduce((s, p) => s + p.notes.length, 0);
    render();
    focus(`#${FIND_ID}`);
    announcer.say(`${notes} ${t(C.readDone, locale)}`);
  }

  function show(): void {
    if (!file) return;
    sync();
    status = undefined;
    noneError = false;
    problems = optionProblems(form);
    if (problems.length > 0) {
      render();
      focus("#fre-errors");
      return;
    }
    options = form;
    report = findHits(file, form);
    accepted = new Set(report.hits.filter((h) => h.problem === undefined).map((h) => h.id));
    made = undefined;
    render();
    focus("#fre-results");
    announcer.say(root.querySelector("#fre-summary")?.textContent ?? "");
  }

  function make(): void {
    if (!file || !report) return;
    sync();
    status = undefined;
    const usable = new Set(report.hits.filter((h) => h.problem === undefined && accepted.has(h.id)).map((h) => h.id));
    noneError = usable.size === 0;
    if (noneError) {
      made = undefined;
      render();
      focus("#fre-errors");
      return;
    }
    made = usable;
    render();
    focus("#fre-copy");
    announcer.say(`${t(C.made, locale)} ${copySummary(applyReplace(file, report, made), locale)}`);
  }

  /** Ticks or unticks every change that can be made, on the page, keeping the copy on screen as it is. */
  function tickAll(on: boolean): void {
    if (!report) return;
    const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('#fre-apply-form input[type="checkbox"]'));
    for (const b of boxes) b.checked = on;
    accepted = readAccepted(root, report);
    announcer.say(t(on ? C.allTicked : C.noneTicked, locale));
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    form = DEFAULT_REPLACE;
    resetResults();
    status = t(C.cleared, locale);
    render();
    focus(`#${REPLACE_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      resetResults();
      status = undefined;
      render();
      focus("#fre-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${REPLACE_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    resetResults();
    status = t(C.opened, locale);
    render();
    focus(`#${REPLACE_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fre-file-form" && id !== "fre-options-form" && id !== "fre-apply-form") return;
    e.preventDefault();
    if (id === "fre-file-form") read();
    else if (id === "fre-options-form") show();
    else make();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fre-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      // Every link in the summary names a field on the page.
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.dataset["action"];
    if (action === "fre-clear") clear();
    else if (action === "fre-tick-all" || action === "fre-untick-all") tickAll(action === "fre-tick-all");
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === REPLACE_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      // Changes are keyed by note and field, so the ticks survive the switch.
      sync();
      locale = next;
      status = undefined;
      render();
    },
    file: () => file,
    report: () => report,
    copy: () => (file && report && made ? applyReplace(file, report, made) : undefined),
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
