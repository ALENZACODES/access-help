import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_SOURCES_COPY as C, aloneTitle, overlapSummary, reportSummary } from "./filesources-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { DEFAULT_SOURCES, aloneAnswers, sourceOverlap, sourceReport, type Overlap, type SourceOptions, type SourceReport } from "./sourcecover";
import { injectStyles } from "./styles";
import { ALONE_TITLE_ID, FIRST_ID, SECOND_ID, SOURCES_OPEN_ID, SOURCES_TEXT_ID, readOptions, renderFileSources, showId } from "./views-filesources";

export interface FileSourcesOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileSourcesHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  options(): SourceOptions;
  report(): SourceReport | undefined;
  /** The source whose answers resting on it alone are listed, or undefined. */
  openSource(): string | undefined;
  /** The comparison of two sources, or undefined. */
  overlap(): { a: string; b: string; result: Overlap } | undefined;
  destroy(): void;
}

/**
 * Mounts "Which sources the answers rest on". The file lives in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileSources(root: HTMLElement, opts: FileSourcesOptions): FileSourcesHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let form: SourceOptions = DEFAULT_SOURCES;
  let shown: SourceOptions | undefined;
  let noKeys = false;
  let report: SourceReport | undefined;
  let openSource: string | undefined;
  let pair: [string, string] | undefined;
  let sameSource = false;
  let overlap: { a: string; b: string; result: Overlap } | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileSources({ text, error, file, form, noKeys, report, openSource, pair, sameSource, overlap, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${SOURCES_TEXT_ID}`);
    if (box) text = box.value;
    if (root.querySelector("#fsr-options-form")) form = readOptions(root);
    const a = root.querySelector<HTMLSelectElement>(`#${FIRST_ID}`);
    const b = root.querySelector<HTMLSelectElement>(`#${SECOND_ID}`);
    if (a && b) pair = [a.value, b.value];
  }

  /** Keeps the two sources chosen while both are still in the report, else the first two; and the comparison up to date. */
  function refreshPair(f: StreetFile): void {
    const names = report?.rows.map((s) => s.source) ?? [];
    const keep = pair && names.includes(pair[0]) && names.includes(pair[1]);
    const first = names[0];
    const second = names[1];
    pair = keep ? pair : first !== undefined && second !== undefined ? [first, second] : undefined;
    sameSource = false;
    if (overlap && report && names.includes(overlap.a) && names.includes(overlap.b)) overlap = { ...overlap, result: sourceOverlap(f, overlap.a, overlap.b, report.keys, locale) };
    else overlap = undefined;
  }

  function compare(): void {
    if (!file || !report) return;
    sync();
    status = undefined;
    if (!pair) return;
    const [a, b] = pair;
    if (a === b) {
      sameSource = true;
      overlap = undefined;
      render();
      focus("#fsr-errors");
      return;
    }
    sameSource = false;
    overlap = { a, b, result: sourceOverlap(file, a, b, report.keys, locale) };
    render();
    focus("#fsr-overlap");
    announcer.say(overlapSummary(a, b, overlap.result, locale));
  }

  /** Works out the sources for the options on the form; nothing when no detail is ticked. */
  function work(f: StreetFile): void {
    noKeys = form.keys.length === 0;
    shown = noKeys ? undefined : form;
    report = shown ? sourceReport(f, shown, locale) : undefined;
    // A list stays open while its source still has answers resting on it alone.
    if (openSource !== undefined && !(report && aloneAnswers(f, openSource, report.keys, locale).length > 0)) openSource = undefined;
    refreshPair(f);
  }

  function announceReport(): void {
    if (!report) {
      focus("#fsr-errors");
      return;
    }
    focus("#fsr-results");
    announcer.say(reportSummary(report, locale));
  }

  function read(): void {
    sync();
    status = undefined;
    noKeys = false;
    report = undefined;
    openSource = undefined;
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fsr-errors");
      return;
    }
    error = undefined;
    file = r.file;
    // The options stay for the next file, and the sources show at once with them.
    work(r.file);
    render();
    announceReport();
  }

  function show(): void {
    if (!file) return;
    sync();
    status = undefined;
    work(file);
    render();
    announceReport();
  }

  /** Lists the answers resting on a source alone, or hides the list when that source's is open. */
  function toggleAlone(index: number): void {
    if (!file || !report) return;
    sync();
    const row = report.rows[index];
    if (!row) return;
    if (openSource === row.source) {
      closeAlone();
      return;
    }
    openSource = row.source;
    render();
    focus(`#${ALONE_TITLE_ID}`);
    announcer.say(aloneTitle(row.source, aloneAnswers(file, row.source, report.keys, locale).length, locale));
  }

  /** Hides the list and puts focus back on the button that opened it. */
  function closeAlone(): void {
    const source = openSource;
    if (source === undefined || !report) return;
    sync();
    openSource = undefined;
    render();
    const i = report.rows.findIndex((r) => r.source === source);
    focus(i >= 0 ? `#${showId(i)}` : "#fsr-results");
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    form = DEFAULT_SOURCES;
    shown = undefined;
    noKeys = false;
    report = undefined;
    openSource = undefined;
    pair = undefined;
    sameSource = false;
    overlap = undefined;
    status = t(C.cleared, locale);
    render();
    focus(`#${SOURCES_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      report = undefined;
      openSource = undefined;
      status = undefined;
      render();
      focus("#fsr-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${SOURCES_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    report = undefined;
    openSource = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${SOURCES_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fsr-file-form" && id !== "fsr-options-form" && id !== "fsr-compare-form") return;
    e.preventDefault();
    if (id === "fsr-file-form") read();
    else if (id === "fsr-options-form") show();
    else compare();
  }

  function onClick(e: Event): void {
    const node = e.target as HTMLElement | null;
    const link = node?.closest<HTMLAnchorElement>("#fsr-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = node?.closest<HTMLElement>("button[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.dataset["action"];
    if (action === "fsr-clear") clear();
    else if (action === "fsr-alone") toggleAlone(Number(el.dataset["index"]));
    else if (action === "fsr-close") closeAlone();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === SOURCES_OPEN_ID) void open(el);
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
      // Places and sources are ordered again in the new language.
      if (file && shown) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) {
          file = r.file;
          report = sourceReport(r.file, shown, locale);
          refreshPair(r.file);
        }
      }
      render();
    },
    file: () => file,
    options: () => form,
    report: () => report,
    openSource: () => openSource,
    overlap: () => overlap,
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
