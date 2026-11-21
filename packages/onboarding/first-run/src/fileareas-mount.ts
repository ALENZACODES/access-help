import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { DEFAULT_AREA, areaReport, findArea, type AreaOptions, type AreaReport } from "./areacover";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { FILE_AREAS_COPY as C, placesTitle } from "./fileareas-copy";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { readStreetFile, type StreetFile } from "./filestreets";
import { injectStyles } from "./styles";
import { AREAS_OPEN_ID, AREAS_TEXT_ID, PLACES_TITLE_ID, readOptions, renderFileAreas, showId } from "./views-fileareas";

export interface FileAreasOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileAreasHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  options(): AreaOptions;
  /** The areas shown, or undefined before they are. */
  report(): AreaReport | undefined;
  /** The key of the area whose places are listed, or undefined. */
  openArea(): string | undefined;
  destroy(): void;
}

/**
 * Mounts "Where records are missing". The file lives in memory only; nothing
 * is saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileAreas(root: HTMLElement, opts: FileAreasOptions): FileAreasHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let form: AreaOptions = DEFAULT_AREA;
  let noKeys = false;
  let report: AreaReport | undefined;
  /** The options the areas shown were worked out with. */
  let shown: AreaOptions | undefined;
  let openArea: string | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileAreas({ text, error, file, form, noKeys, report, openArea, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${AREAS_TEXT_ID}`);
    if (box) text = box.value;
    if (root.querySelector("#far-options-form")) form = readOptions(root);
  }

  /** Works out the areas for the options on the form; nothing when no detail is ticked. */
  function work(f: StreetFile): void {
    noKeys = form.keys.length === 0;
    shown = noKeys ? undefined : form;
    report = shown ? areaReport(f, shown, locale) : undefined;
    // An area's list stays open while that area is still shown.
    if (openArea !== undefined && !(report && findArea(report, openArea))) openArea = undefined;
  }

  function read(): void {
    sync();
    status = undefined;
    noKeys = false;
    report = undefined;
    openArea = undefined;
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#far-errors");
      return;
    }
    error = undefined;
    file = r.file;
    // The options stay for the next file, and the areas show at once with them.
    work(r.file);
    render();
    if (report) {
      focus("#far-results");
      announcer.say(root.querySelector("#far-summary")?.textContent ?? "");
    } else focus("#far-errors");
  }

  function show(): void {
    if (!file) return;
    sync();
    status = undefined;
    work(file);
    render();
    if (!report) {
      focus("#far-errors");
      return;
    }
    focus("#far-results");
    announcer.say(root.querySelector("#far-summary")?.textContent ?? "");
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    form = DEFAULT_AREA;
    noKeys = false;
    report = undefined;
    shown = undefined;
    openArea = undefined;
    status = t(C.cleared, locale);
    render();
    focus(`#${AREAS_TEXT_ID}`);
    announcer.say(status);
  }

  /** Lists an area's places, or hides the list when that area's is already open. */
  function togglePlaces(key: string): void {
    if (!report) return;
    sync();
    status = undefined;
    if (openArea === key) {
      closePlaces();
      return;
    }
    const a = findArea(report, key);
    if (!a) return;
    openArea = key;
    render();
    focus(`#${PLACES_TITLE_ID}`);
    announcer.say(placesTitle(a, locale));
  }

  /** Hides the list and puts focus back on the button that opened it. */
  function closePlaces(): void {
    const key = openArea;
    if (key === undefined) return;
    sync();
    openArea = undefined;
    render();
    focus(`#${showId(key)}`);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      report = undefined;
      openArea = undefined;
      status = undefined;
      render();
      focus("#far-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${AREAS_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    report = undefined;
    openArea = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${AREAS_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "far-file-form" && id !== "far-options-form") return;
    e.preventDefault();
    if (id === "far-file-form") read();
    else show();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#far-errors a");
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
    if (action === "far-clear") clear();
    else if (action === "far-places") togglePlaces(el.dataset["area"] ?? "");
    else if (action === "far-close-places") closePlaces();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === AREAS_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      // Places and areas are ordered again in the new language.
      if (file && report && shown) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) {
          file = r.file;
          report = areaReport(r.file, shown, locale);
        }
      }
      status = undefined;
      render();
    },
    file: () => file,
    options: () => form,
    report: () => report,
    openArea: () => openArea,
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
