import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { applyContacts, contactFindings, type CleanedCopy, type ContactChoice, type ContactProblem, type ContactsReport } from "./contactdetails";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_CONTACTS_COPY as C, copySummary } from "./filecontacts-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { injectStyles } from "./styles";
import { CONTACTS_OPEN_ID, CONTACTS_TEXT_ID, choiceOf, readContactPicks, renderFileContacts, type ContactPick } from "./views-filecontacts";

export interface FileContactsOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileContactsHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  /** The contact details found, or undefined before a file is read. */
  report(): ContactsReport | undefined;
  /** The copy on screen, or undefined before one is made. */
  copy(): CleanedCopy | undefined;
  destroy(): void;
}

/**
 * Mounts "Remove contact details". The file lives in memory only; nothing is
 * saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileContacts(root: HTMLElement, opts: FileContactsOptions): FileContactsHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let report: ContactsReport | undefined;
  let picks: ReadonlyMap<string, ContactPick> = new Map();
  let typed: ReadonlyMap<string, string> = new Map();
  let problems: ReadonlyMap<string, ContactProblem> = new Map();
  let noneError = false;
  let made: ReadonlyMap<string, ContactChoice> | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileContacts({ text, error, file, report, picks, typed, problems, noneError, made, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${CONTACTS_TEXT_ID}`);
    if (box) text = box.value;
    if (report && root.querySelector("#fct-fix-form")) ({ picks, typed } = readContactPicks(root, report));
  }

  function reset(): void {
    report = undefined;
    picks = new Map();
    typed = new Map();
    problems = new Map();
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
      focus("#fct-errors");
      return;
    }
    error = undefined;
    file = r.file;
    report = contactFindings(r.file);
    render();
    focus("#fct-results");
    announcer.say(root.querySelector("#fct-summary")?.textContent ?? "");
  }

  function make(): void {
    if (!file || !report) return;
    sync();
    status = undefined;
    const choices = new Map<string, ContactChoice>();
    const found = new Map<string, ContactProblem>();
    for (const f of report.findings) {
      const c = choiceOf(f, picks.get(f.id), typed.get(f.id));
      if ("problem" in c) found.set(f.id, c.problem);
      else if (c.kind !== "keep" && !(c.kind === "text" && c.text.trim() === f.text)) choices.set(f.id, c);
    }
    problems = found;
    noneError = found.size === 0 && choices.size === 0;
    if (noneError || found.size > 0) {
      render();
      focus("#fct-errors");
      return;
    }
    made = choices;
    render();
    focus("#fct-copy");
    announcer.say(`${t(C.made, locale)} ${copySummary(applyContacts(file, report, made), locale)}`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    reset();
    status = t(C.cleared, locale);
    render();
    focus(`#${CONTACTS_TEXT_ID}`);
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
      focus("#fct-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${CONTACTS_OPEN_ID}`);
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
    focus(`#${CONTACTS_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fct-file-form" && id !== "fct-fix-form") return;
    e.preventDefault();
    if (id === "fct-file-form") read();
    else make();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fct-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      // Every link in the summary names a field on the page.
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fct-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === CONTACTS_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      // Findings are keyed by note id and source name, so the choices survive the switch.
      sync();
      locale = next;
      status = undefined;
      render();
    },
    file: () => file,
    report: () => report,
    copy: () => (file && report && made ? applyContacts(file, report, made) : undefined),
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
