import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_LETTERS_COPY as C, setSummary } from "./fileletters-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { readTracking, type Tracking } from "./lettertrack";
import { letterProblems, makeLetters, type LetterOptions, type LetterProblem, type LetterSet } from "./letters";
import { injectStyles } from "./styles";
import { EMPTY_TRACK, LETTERS_OPEN_ID, LETTERS_TEXT_ID, TRACK_OPEN_ID, TRACK_TEXT_ID, problemTarget, readLetterForm, renderFileLetters, type TrackContext } from "./views-fileletters";

export interface FileLettersOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileLettersHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  /** The letters on screen, or undefined before any are written. */
  letters(): LetterSet | undefined;
  /** The options the letters on screen were written with. */
  options(): LetterOptions | undefined;
  /** The tracking list as read, or undefined. */
  tracking(): Tracking | undefined;
  destroy(): void;
}

/**
 * Mounts "Letters to places". The file, the name and the contact live in
 * memory only; nothing is saved or sent. It is its own entry point, loaded
 * only when a person opens it.
 */
export function mountFileLetters(root: HTMLElement, opts: FileLettersOptions): FileLettersHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  // The letters' language starts as the page's language.
  let form: LetterOptions = { sender: "", contact: "", language: locale, includeOld: false };
  let applied: LetterOptions | undefined;
  let problems: LetterProblem[] = [];
  let status: string | undefined;
  let track: TrackContext = EMPTY_TRACK;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileLetters({ text, error, file, form, applied, problems, locale, today, statusMessage: status, track });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${LETTERS_TEXT_ID}`);
    if (box) text = box.value;
    if (file) form = readLetterForm(root, form);
    const list = root.querySelector<HTMLTextAreaElement>(`#${TRACK_TEXT_ID}`);
    if (list) track = { ...track, text: list.value };
  }

  function read(): void {
    sync();
    track = { ...track, statusMessage: undefined };
    status = undefined;
    applied = undefined;
    problems = [];
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#flt-errors");
      return;
    }
    error = undefined;
    file = r.file;
    render();
    focus("#flt-form");
    announcer.say(t(C.formTitle, locale));
  }

  function make(): void {
    if (!file) return;
    sync();
    track = { ...track, statusMessage: undefined };
    status = undefined;
    problems = letterProblems(form);
    if (problems.length > 0) {
      render();
      focus("#flt-errors");
      return;
    }
    applied = form;
    render();
    focus("#flt-results");
    announcer.say(`${t(C.made, locale)} ${setSummary(makeLetters(file, form.includeOld, today, locale), locale)}`);
  }

  function readList(): void {
    sync();
    status = undefined;
    const r = readTracking(track.text, today);
    if (!r.ok) {
      track = { text: track.text, error: r.error, missing: r.missing, tracking: undefined, statusMessage: undefined };
      render();
      focus("#flt-track-errors");
      return;
    }
    track = { text: track.text, error: undefined, missing: undefined, tracking: r.tracking, statusMessage: undefined };
    render();
    focus("#flt-track-summary");
    announcer.say(root.querySelector("#flt-track-summary")?.textContent ?? "");
  }

  function clearList(): void {
    sync();
    status = undefined;
    track = { ...EMPTY_TRACK, statusMessage: t(C.track.cleared, locale) };
    render();
    focus(`#${TRACK_TEXT_ID}`);
    announcer.say(t(C.track.cleared, locale));
  }

  async function openList(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    status = undefined;
    if (chosen.size > MAX_FILE_BYTES) {
      track = { ...track, error: "too-large", missing: undefined, tracking: undefined, statusMessage: undefined };
      render();
      focus("#flt-track-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      track = { ...track, statusMessage: t(C.readFailed, locale) };
      render();
      focus(`#${TRACK_OPEN_ID}`);
      announcer.say(t(C.readFailed, locale));
      return;
    }
    if (destroyed) return;
    track = { text: content, error: undefined, missing: undefined, tracking: undefined, statusMessage: t(C.track.opened, locale) };
    render();
    focus(`#${TRACK_TEXT_ID}`);
    announcer.say(t(C.track.opened, locale));
  }

  function clear(): void {
    sync();
    track = { ...track, statusMessage: undefined };
    text = "";
    error = undefined;
    file = undefined;
    applied = undefined;
    problems = [];
    form = { sender: "", contact: "", language: locale, includeOld: false };
    status = t(C.cleared, locale);
    render();
    focus(`#${LETTERS_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      applied = undefined;
      status = undefined;
      render();
      focus("#flt-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${LETTERS_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    applied = undefined;
    problems = [];
    status = t(C.opened, locale);
    render();
    focus(`#${LETTERS_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "flt-file-form" && id !== "flt-letter-form" && id !== "flt-track-form") return;
    e.preventDefault();
    if (id === "flt-file-form") read();
    else if (id === "flt-letter-form") make();
    else readList();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const listLink = target?.closest<HTMLAnchorElement>("#flt-track-errors a");
    if (listLink && root.contains(listLink)) {
      e.preventDefault();
      focus(`#${TRACK_TEXT_ID}`);
      return;
    }
    const link = target?.closest<HTMLAnchorElement>("#flt-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      const targets = [`#${LETTERS_TEXT_ID}`, ...problems.map((p) => `#${problemTarget(p)}`)];
      if (targets.includes(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (!el || !root.contains(el)) return;
    if (el.dataset["action"] === "flt-clear") clear();
    else if (el.dataset["action"] === "flt-track-clear") clearList();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || !root.contains(el)) return;
    if (el.id === LETTERS_OPEN_ID) void open(el);
    else if (el.id === TRACK_OPEN_ID) void openList(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      // Streets are put in the language's alphabet, so the file is read again.
      if (file) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) file = r.file;
      }
      status = undefined;
      track = { ...track, statusMessage: undefined };
      render();
    },
    file: () => file,
    letters: () => (file && applied ? makeLetters(file, applied.includeOld, today, locale) : undefined),
    options: () => applied,
    tracking: () => track.tracking,
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
