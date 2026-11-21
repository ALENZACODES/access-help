import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { checkFile, type FileCheck } from "./filecheck";
import { FILE_CHECK_COPY as C, checkErrorText, checkedText } from "./filecheck-copy";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { injectStyles } from "./styles";
import { CHECK_OPEN_ID, CHECK_TEXT_ID, renderFileCheck } from "./views-filecheck";

export interface FileCheckOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  /** The host's own announcer, so there is one live region on the page. One is made when none is given. */
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileCheckHandle {
  setLocale(locale: Locale): void;
  /** The check on screen, or undefined before one is made. */
  check(): FileCheck | undefined;
  /** The text in the box now. */
  text(): string;
  destroy(): void;
}

/**
 * Mounts "Check a notes file" into an element. Like the file comparison it
 * saves nothing, needs no store and is its own entry point, loaded only when a
 * person opens it.
 */
export function mountFileCheck(root: HTMLElement, opts: FileCheckOptions): FileCheckHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | undefined;
  let check: FileCheck | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileCheck({ text, error, check, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function syncText(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${CHECK_TEXT_ID}`);
    if (box) text = box.value;
  }

  function run(): void {
    syncText();
    status = undefined;
    const res = checkFile(text, today);
    if (!res.ok) {
      error = res.error;
      check = undefined;
      render();
      focus("#fk-errors");
      return;
    }
    error = undefined;
    check = res.check;
    render();
    focus("#fk-results");
    announcer.say(checkedText(check.totals.readable, check.totals.leftOut, check.totals.dropped, locale));
  }

  function clear(): void {
    text = "";
    error = undefined;
    check = undefined;
    status = t(C.cleared, locale);
    render();
    focus(`#${CHECK_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    syncText();
    if (file.size > MAX_FILE_BYTES) {
      error = "too-large";
      check = undefined;
      status = undefined;
      render();
      focus("#fk-errors");
      return;
    }
    let read: string;
    try {
      read = await readFile(file);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${CHECK_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    // The new file replaces the box's text; a check of the old text no longer applies.
    text = read;
    error = undefined;
    check = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${CHECK_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    if ((e.target as HTMLElement | null)?.id !== "fk-form") return;
    e.preventDefault();
    run();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fk-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      focus(`#${CHECK_TEXT_ID}`);
      return;
    }
    const action = target?.closest<HTMLElement>("[data-action]");
    if (action && root.contains(action) && action.dataset["action"] === "fk-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === CHECK_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      syncText();
      locale = next;
      status = undefined;
      render();
    },
    check: () => check,
    text: () => {
      syncText();
      return text;
    },
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

/** The error in words, for hosts that report it themselves. */
export function checkErrorMessage(error: ImportError | undefined, locale: Locale): string | undefined {
  return error === undefined ? undefined : checkErrorText(error, locale);
}
