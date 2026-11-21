import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_PARTS_COPY as C, readText, reportSummary } from "./fileparts-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { MAX_PARTS, checkParts, partsReport, postalAreasIn, streetsIn, type PartProblem, type PartsReport } from "./partsummary";
import { injectStyles } from "./styles";
import { PARTS_OPEN_ID, PARTS_TEXT_ID, boxId, readBoxes, readView, renderFileParts, type PartsView } from "./views-fileparts";

export interface FilePartsOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FilePartsHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  report(): PartsReport | undefined;
  destroy(): void;
}

const EMPTY_BOXES: readonly string[] = Array.from({ length: MAX_PARTS }, () => "");

/**
 * Mounts "Compare parts of a file". The file lives in memory only; nothing is
 * saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileParts(root: HTMLElement, opts: FilePartsOptions): FilePartsHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let boxes: readonly string[] = EMPTY_BOXES;
  let applied: readonly string[] = [];
  let problems: Readonly<Record<number, PartProblem>> = {};
  let emptyError = false;
  let view: PartsView = "part";
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileParts({ text, error, file, boxes, applied, problems, emptyError, view, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${PARTS_TEXT_ID}`);
    if (box) text = box.value;
    boxes = readBoxes(root, boxes);
    view = readView(root, view);
  }

  function read(): void {
    sync();
    status = undefined;
    boxes = EMPTY_BOXES;
    applied = [];
    problems = {};
    emptyError = false;
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fpt-errors");
      return;
    }
    error = undefined;
    file = r.file;
    render();
    focus(`#${boxId(0)}`);
    announcer.say(readText(r.file.places.length, locale));
  }

  function compare(): void {
    if (!file) return;
    status = undefined;
    const c = checkParts(file, boxes);
    problems = c.problems;
    emptyError = c.empty;
    if (c.empty || Object.keys(c.problems).length > 0) {
      render();
      focus("#fpt-errors");
      return;
    }
    const first = applied.length === 0;
    applied = c.texts;
    render();
    focus("#fpt-results");
    const summary = reportSummary(partsReport(file, applied, today), locale);
    announcer.say(first ? summary : `${t(C.updated, locale)} ${summary}`);
  }

  /** Fills the boxes with the largest postal areas in the file and compares them. */
  function usePostal(): void {
    if (!file) return;
    sync();
    const areas = postalAreasIn(file, locale).slice(0, MAX_PARTS).map((a) => a.area);
    boxes = Array.from({ length: MAX_PARTS }, (_, i) => areas[i] ?? "");
    compare();
  }

  /** Fills the boxes with the largest streets, as their places write them, and compares them. */
  function useStreets(): void {
    if (!file) return;
    sync();
    const streets = streetsIn(file, locale).slice(0, MAX_PARTS).map((s) => s.street);
    boxes = Array.from({ length: MAX_PARTS }, (_, i) => streets[i] ?? "");
    compare();
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    boxes = EMPTY_BOXES;
    applied = [];
    problems = {};
    emptyError = false;
    view = "part";
    status = t(C.cleared, locale);
    render();
    focus(`#${PARTS_TEXT_ID}`);
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
      focus("#fpt-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${PARTS_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${PARTS_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fpt-file-form" && id !== "fpt-parts-form") return;
    e.preventDefault();
    if (id === "fpt-file-form") read();
    else {
      sync();
      compare();
    }
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fpt-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      const allowed = [`#${PARTS_TEXT_ID}`, ...Array.from({ length: MAX_PARTS }, (_, i) => `#${boxId(i)}`)];
      if (allowed.includes(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (!el || !root.contains(el)) return;
    if (el.dataset["action"] === "fpt-clear") clear();
    else if (el.dataset["action"] === "fpt-postal") usePostal();
    else if (el.dataset["action"] === "fpt-streets") useStreets();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === PARTS_OPEN_ID) void open(el);
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
        const r = readStreetFile(text, today, locale);
        if (r.ok) file = r.file;
      }
      status = undefined;
      render();
    },
    file: () => file,
    report: () => (file && applied.length > 0 ? partsReport(file, applied, today) : undefined),
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
