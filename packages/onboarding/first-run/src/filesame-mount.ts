import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_SAME_COPY as C, copySummary } from "./filesame-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { TYPED, fileMatches, joinCount, joinedCopy, joinsTooFew, typedProblems, type JoinChoices, type JoinedCopy, type LeftOut, type MatchReport, type TypedNames, type TypedProblem } from "./placematch";
import { injectStyles } from "./styles";
import { SAME_OPEN_ID, SAME_TEXT_ID, readChoices, readLeft, readTyped, renderFileSame } from "./views-filesame";

export interface FileSameOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileSameHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  /** The groups found, or undefined before a file is read. */
  report(): MatchReport | undefined;
  /** The copy on screen, or undefined before one is made. */
  copy(): JoinedCopy | undefined;
  destroy(): void;
}

const NONE: JoinChoices = new Map();

/**
 * Mounts "Places that may be the same". The file lives in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person
 * opens it.
 */
export function mountFileSame(root: HTMLElement, opts: FileSameOptions): FileSameHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let report: MatchReport | undefined;
  let choices: JoinChoices = NONE;
  let noneError = false;
  let made: JoinChoices | undefined;
  let typed: TypedNames = new Map();
  let typedErrors: ReadonlyMap<string, readonly TypedProblem[]> = new Map();
  let left: LeftOut = new Map();
  let tooFew: ReadonlySet<string> = new Set();
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileSame({ text, error, file, report, choices, noneError, made, typed, typedErrors, left, tooFew, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${SAME_TEXT_ID}`);
    if (box) text = box.value;
    if (report && root.querySelector("#fsa-join-form")) {
      choices = readChoices(root, report);
      typed = readTyped(root, report, typed);
      left = readLeft(root, report);
    }
  }

  function reset(): void {
    report = undefined;
    choices = NONE;
    noneError = false;
    made = undefined;
    typed = new Map();
    typedErrors = new Map();
    left = new Map();
    tooFew = new Set();
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
      focus("#fsa-errors");
      return;
    }
    error = undefined;
    file = r.file;
    report = fileMatches(r.file);
    render();
    focus("#fsa-results");
    announcer.say(root.querySelector("#fsa-summary")?.textContent ?? "");
  }

  function make(): void {
    if (!file || !report) return;
    sync();
    status = undefined;
    const errors = new Map<string, readonly TypedProblem[]>();
    for (const g of report.groups) {
      if (choices.get(g.id) !== TYPED) continue;
      const problems = typedProblems(typed.get(g.id) ?? { name: "", address: "" });
      if (problems.length > 0) errors.set(g.id, problems);
    }
    typedErrors = errors;
    tooFew = new Set(report.groups.filter((g) => joinsTooFew(g, choices, left)).map((g) => g.id));
    noneError = errors.size === 0 && tooFew.size === 0 && joinCount(report, choices, typed, left) === 0;
    if (noneError || errors.size > 0 || tooFew.size > 0) {
      render();
      focus("#fsa-errors");
      return;
    }
    made = choices;
    render();
    focus("#fsa-copy");
    announcer.say(`${t(C.made, locale)} ${copySummary(joinedCopy(file, report, made, typed, left), locale)}`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    reset();
    status = t(C.cleared, locale);
    render();
    focus(`#${SAME_TEXT_ID}`);
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
      focus("#fsa-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${SAME_OPEN_ID}`);
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
    focus(`#${SAME_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fsa-file-form" && id !== "fsa-join-form") return;
    e.preventDefault();
    if (id === "fsa-file-form") read();
    else make();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fsa-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      // Every link in the summary names a field on the page.
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fsa-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === SAME_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      // Places are read again in the new language; groups and choices are kept by place, so they stay.
      if (file) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) {
          file = r.file;
          report = fileMatches(r.file);
        }
      }
      status = undefined;
      render();
    },
    file: () => file,
    report: () => report,
    copy: () => (file && report && made ? joinedCopy(file, report, made, typed, left) : undefined),
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
