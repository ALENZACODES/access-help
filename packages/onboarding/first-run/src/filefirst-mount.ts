import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_FIRST_COPY as C, rankedSummary, streetsSummary } from "./filefirst-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { DEFAULT_FIRST, checkFirstForm, formFor, pickFirst, pickStreets, rankPlaces, rankStreets, type FirstForm, type FirstOptions, type FirstProblem, type PlaceNeeds } from "./lookfirst";
import { injectStyles } from "./styles";
import { FIRST_OPEN_ID, FIRST_TEXT_ID, fieldId, readFirstForm, renderFileFirst } from "./views-filefirst";

export interface FileFirstOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileFirstHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  options(): FirstOptions;
  picked(): PlaceNeeds[];
  destroy(): void;
}

/**
 * Mounts "Choose places to look at first". The file lives in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person
 * opens it.
 */
export function mountFileFirst(root: HTMLElement, opts: FileFirstOptions): FileFirstHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let options: FirstOptions = DEFAULT_FIRST;
  let form: FirstForm = formFor(DEFAULT_FIRST);
  let problems: readonly FirstProblem[] = [];
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileFirst({ text, error, file, options, form, problems, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${FIRST_TEXT_ID}`);
    if (box) text = box.value;
    form = readFirstForm(root, form);
  }

  function summary(f: StreetFile): string {
    const r = rankPlaces(f, options, today, locale);
    if (options.view === "streets") {
      const s = rankStreets(r, locale);
      return streetsSummary(s, pickStreets(s, options.count).length, locale);
    }
    return rankedSummary(r, pickFirst(r, options.count).length, options.area, locale);
  }

  function read(): void {
    sync();
    status = undefined;
    problems = [];
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#ffl-errors");
      return;
    }
    error = undefined;
    file = r.file;
    // The ranking choices made so far are kept for the new file when they are valid.
    const c = checkFirstForm(form);
    options = c.ok ? c.options : DEFAULT_FIRST;
    form = formFor(options);
    render();
    focus("#ffl-summary");
    announcer.say(summary(r.file));
  }

  function update(): void {
    if (!file) return;
    sync();
    status = undefined;
    const c = checkFirstForm(form);
    if (!c.ok) {
      problems = c.problems;
      render();
      focus("#ffl-errors");
      return;
    }
    problems = [];
    options = c.options;
    form = formFor(options);
    render();
    focus("#ffl-list");
    announcer.say(`${t(C.updated, locale)} ${summary(file)}`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    options = DEFAULT_FIRST;
    form = formFor(DEFAULT_FIRST);
    problems = [];
    status = t(C.cleared, locale);
    render();
    focus(`#${FIRST_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const picked = input.files?.[0];
    if (!picked) return;
    sync();
    if (picked.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      status = undefined;
      render();
      focus("#ffl-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${FIRST_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${FIRST_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "ffl-file-form" && id !== "ffl-options-form") return;
    e.preventDefault();
    if (id === "ffl-file-form") read();
    else update();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#ffl-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      const allowed = [`#${FIRST_TEXT_ID}`, ...problems.map((p) => `#${fieldId(p.field)}`)];
      if (allowed.includes(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "ffl-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === FIRST_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      // Ties are broken by name in the language's alphabet, so the file is read again.
      if (file) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) file = r.file;
      }
      status = undefined;
      render();
    },
    file: () => file,
    options: () => options,
    picked: () => (file ? pickFirst(rankPlaces(file, options, today, locale), options.count) : []),
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
