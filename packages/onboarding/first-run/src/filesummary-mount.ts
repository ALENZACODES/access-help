import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { readSummaryFile, type FileSummary } from "./filesummary";
import { FILE_SUMMARY_COPY as C, summarizedText } from "./filesummary-copy";
import { injectStyles } from "./styles";
import { SUMMARY_OPEN_ID, SUMMARY_TEXT_ID, renderFileSummary } from "./views-filesummary";

export interface FileSummaryOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileSummaryHandle {
  setLocale(locale: Locale): void;
  summary(): FileSummary | undefined;
  destroy(): void;
}

/**
 * Mounts "Summarize a notes file". The file lives in memory only; nothing is
 * saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileSummary(root: HTMLElement, opts: FileSummaryOptions): FileSummaryHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let summary: FileSummary | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileSummary({ text, error, summary, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function syncText(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${SUMMARY_TEXT_ID}`);
    if (box) text = box.value;
  }

  function read(): void {
    syncText();
    status = undefined;
    const r = readSummaryFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      summary = undefined;
      render();
      focus("#fy-errors");
      return;
    }
    error = undefined;
    summary = r.summary;
    render();
    focus("#fy-results");
    announcer.say(summarizedText(summary.places, summary.notes, locale));
  }

  function clear(): void {
    text = "";
    error = undefined;
    summary = undefined;
    status = t(C.cleared, locale);
    render();
    focus(`#${SUMMARY_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const picked = input.files?.[0];
    if (!picked) return;
    syncText();
    if (picked.size > MAX_FILE_BYTES) {
      error = "too-large";
      summary = undefined;
      status = undefined;
      render();
      focus("#fy-errors");
      return;
    }
    let read: string;
    try {
      read = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${SUMMARY_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = read;
    error = undefined;
    summary = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${SUMMARY_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    if ((e.target as HTMLElement | null)?.id !== "fy-file-form") return;
    e.preventDefault();
    read();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fy-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      focus(`#${SUMMARY_TEXT_ID}`);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fy-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === SUMMARY_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      syncText();
      locale = next;
      // Places follow the language's alphabet, so the file is read again.
      if (summary) {
        const r = readSummaryFile(text, today, locale);
        summary = r.ok ? r.summary : undefined;
      }
      status = undefined;
      render();
    },
    summary: () => summary,
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
