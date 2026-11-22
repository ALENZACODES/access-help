import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_GRID_COPY as C, captionText, matchText, pageText } from "./filegrid-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { DEFAULT_GRID, gridRows, pageOf, parsePage, type GridFilter, type GridRow } from "./answergrid";
import { injectStyles } from "./styles";
import { GOTO_ID, GRID_OPEN_ID, GRID_TEXT_ID, ONLY_TICKED_ID, readFilter, renderFileGrid, rowTickId } from "./views-filegrid";

export interface FileGridOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileGridHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  filter(): GridFilter;
  /** The rows shown, in order, or undefined before they are. */
  rows(): readonly GridRow[] | undefined;
  /** 1-based page shown. */
  page(): number;
  /** Ids of the places ticked in the table. */
  ticked(): readonly string[];
  destroy(): void;
}

/**
 * Mounts "Answers by place, in a table". The file lives in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileGrid(root: HTMLElement, opts: FileGridOptions): FileGridHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let filter: GridFilter = DEFAULT_GRID;
  let shownFilter: GridFilter | undefined;
  let rows: GridRow[] | undefined;
  let page = 1;
  let noColumns = false;
  let gotoText = "";
  let badPage = false;
  let ticked: string[] = [];
  let onlyTicked = false;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileGrid({ text, error, file, filter, shownFilter, rows, page, noColumns, gotoText, badPage, ticked, onlyTicked, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${GRID_TEXT_ID}`);
    if (box) text = box.value;
    if (root.querySelector("#fgr-filter-form")) filter = readFilter(root);
    const box2 = root.querySelector<HTMLInputElement>(`#${GOTO_ID}`);
    if (box2) gotoText = box2.value;
    if (root.querySelector("#fgr-filter-form")) onlyTicked = root.querySelector<HTMLInputElement>(`#${ONLY_TICKED_ID}`)?.checked ?? false;
  }

  /** Works out the rows for the filter on the form; nothing when no detail is shown. */
  function work(f: StreetFile): void {
    noColumns = filter.columns.length === 0;
    badPage = false;
    gotoText = "";
    page = 1;
    shownFilter = noColumns ? undefined : filter;
    rows = shownFilter ? gridRows(f, shownFilter, locale, onlyTicked ? new Set(ticked) : undefined) : undefined;
  }

  function announceRows(): void {
    if (!rows) {
      focus("#fgr-errors");
      return;
    }
    focus("#fgr-results");
    announcer.say(matchText(rows.length, locale));
  }

  function read(): void {
    sync();
    status = undefined;
    rows = undefined;
    shownFilter = undefined;
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fgr-errors");
      return;
    }
    error = undefined;
    file = r.file;
    ticked = [];
    onlyTicked = false;
    // The filter stays for the next file, and the places show at once with it.
    work(r.file);
    render();
    announceRows();
  }

  function show(): void {
    if (!file) return;
    sync();
    status = undefined;
    work(file);
    render();
    announceRows();
  }

  /** Moves a page back or forward; focus goes to the page number, which says where the person is. */
  function turn(by: number): void {
    if (!rows) return;
    sync();
    const p = pageOf(rows, page + by);
    if (p.page === page) return;
    page = p.page;
    badPage = false;
    render();
    focus("#fgr-page");
    announcer.say(`${pageText(p, locale)}. ${captionText(p, locale)}`);
  }

  /** Ticks or unticks a place; the ticks stay across pages and filters while the file stays. */
  function tick(input: HTMLInputElement): void {
    sync();
    const id = input.value;
    ticked = input.checked ? [...new Set([...ticked, id])] : ticked.filter((x) => x !== id);
    render();
    focus(`#${rowTickId(id)}`);
  }

  function untickAll(): void {
    sync();
    ticked = [];
    // With nothing ticked, showing only the places ticked would show nothing.
    if (onlyTicked && file && shownFilter) {
      onlyTicked = false;
      rows = gridRows(file, shownFilter, locale);
      page = 1;
    }
    render();
    focus("#fgr-results");
  }

  /** Goes to the page typed in the page box, or says which numbers it takes. */
  function goto(): void {
    if (!rows) return;
    sync();
    const n = parsePage(gotoText, pageOf(rows, page).pages);
    if (n === undefined) {
      badPage = true;
      render();
      focus("#fgr-errors");
      return;
    }
    badPage = false;
    gotoText = "";
    page = n;
    const p = pageOf(rows, page);
    render();
    focus("#fgr-page");
    announcer.say(`${pageText(p, locale)}. ${captionText(p, locale)}`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    filter = DEFAULT_GRID;
    shownFilter = undefined;
    rows = undefined;
    page = 1;
    ticked = [];
    onlyTicked = false;
    noColumns = false;
    gotoText = "";
    badPage = false;
    status = t(C.cleared, locale);
    render();
    focus(`#${GRID_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      rows = undefined;
      status = undefined;
      render();
      focus("#fgr-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${GRID_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    rows = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${GRID_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fgr-file-form" && id !== "fgr-filter-form" && id !== "fgr-goto-form") return;
    e.preventDefault();
    if (id === "fgr-file-form") read();
    else if (id === "fgr-filter-form") show();
    else goto();
  }

  function onClick(e: Event): void {
    const node = e.target as HTMLElement | null;
    const link = node?.closest<HTMLAnchorElement>("#fgr-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = node?.closest<HTMLButtonElement>("button[data-action]");
    if (!el || !root.contains(el) || el.disabled) return;
    const action = el.dataset["action"];
    if (action === "fgr-clear") clear();
    else if (action === "fgr-prev") turn(-1);
    else if (action === "fgr-next") turn(1);
    else if (action === "fgr-untick-all") untickAll();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || !root.contains(el)) return;
    if (el.id === GRID_OPEN_ID) void open(el);
    else if (el.dataset["action"] === "fgr-tick") tick(el);
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
      // Places are ordered again in the new language; the page stays when it still exists.
      if (file && shownFilter) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) {
          file = r.file;
          rows = gridRows(r.file, shownFilter, locale, onlyTicked ? new Set(ticked) : undefined);
          page = pageOf(rows, page).page;
        }
      }
      render();
    },
    file: () => file,
    filter: () => filter,
    rows: () => rows,
    page: () => page,
    ticked: () => ticked,
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
