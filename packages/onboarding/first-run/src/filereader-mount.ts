import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { FACT_KEYS } from "./facts";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import {
  GROUPS,
  START_VIEW,
  hasMustHaves,
  isGroup,
  readNotesFile,
  setMustHave,
  toggleOpen,
  viewPages,
  withFilter,
  withPage,
  type ReaderFile,
  type ReaderView,
} from "./filereader";
import { FILE_READER_COPY as C, foundText } from "./filereader-copy";
import type { Requirement } from "./filter";
import { injectStyles } from "./styles";
import { READER_OPEN_ID, READER_TEXT_ID, SEARCH_ID, mustHaveId, renderFileReader } from "./views-filereader";

export interface FileReaderOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileReaderHandle {
  setLocale(locale: Locale): void;
  file(): ReaderFile | undefined;
  view(): ReaderView;
  destroy(): void;
}

/**
 * Mounts "Read a notes file". The file lives in memory only; nothing is saved
 * or brought into the device's notes. It is its own entry point, loaded only
 * when a person opens it.
 */
export function mountFileReader(root: HTMLElement, opts: FileReaderOptions): FileReaderHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: ReaderFile | undefined;
  let view: ReaderView = START_VIEW;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileReader({ text, error, file, view, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function syncText(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${READER_TEXT_ID}`);
    if (box) text = box.value;
  }

  /** The search and must-haves as set in the form. */
  function formFilter(): { query: string; req: Requirement } {
    const query = root.querySelector<HTMLInputElement>(`#${SEARCH_ID}`)?.value ?? view.query;
    let req: Requirement = {};
    for (const k of FACT_KEYS) {
      const v = root.querySelector<HTMLSelectElement>(`#${mustHaveId(k)}`)?.value ?? view.req[k] ?? "";
      req = setMustHave(req, k, v === "yes" || v === "no" ? v : "");
    }
    return { query, req };
  }

  function announceFound(): void {
    if (!file) return;
    const pages = viewPages(file, view);
    announcer.say(foundText(pages.map((p) => p.total), hasMustHaves(view.req), locale));
  }

  function read(): void {
    syncText();
    status = undefined;
    const r = readNotesFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fr-errors");
      return;
    }
    error = undefined;
    file = r.file;
    view = START_VIEW;
    render();
    focus("#fr-summary");
    announceFound();
  }

  function show(): void {
    if (!file) return;
    syncText();
    const f = formFilter();
    view = withFilter(view, f.query, f.req);
    status = undefined;
    render();
    focus(`#fr-group-${GROUPS[0]}`);
    announceFound();
  }

  function reset(): void {
    if (!file) return;
    syncText();
    view = withFilter(view, "", {});
    render();
    focus(`#${SEARCH_ID}`);
    announceFound();
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    view = START_VIEW;
    status = t(C.cleared, locale);
    render();
    focus(`#${READER_TEXT_ID}`);
    announcer.say(status);
  }

  function toggle(id: string): void {
    if (!file) return;
    syncText();
    // Keep what is typed in the search form, even if it was not applied yet.
    const typed = formFilter();
    view = toggleOpen(view, id);
    render();
    const search = root.querySelector<HTMLInputElement>(`#${SEARCH_ID}`);
    if (search) search.value = typed.query;
    for (const k of FACT_KEYS) {
      const sel = root.querySelector<HTMLSelectElement>(`#${mustHaveId(k)}`);
      if (sel) sel.value = typed.req[k] ?? "";
    }
    const btn = Array.from(root.querySelectorAll<HTMLElement>('[data-action="fr-toggle"]')).find((b) => b.dataset["value"] === id);
    btn?.focus();
  }

  function page(group: string | undefined, to: number): void {
    if (!file || !isGroup(group)) return;
    syncText();
    view = withPage(view, group, to);
    render();
    focus(`#fr-group-${group}`);
    announcer.say(t(C.updated, locale));
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const picked = input.files?.[0];
    if (!picked) return;
    syncText();
    if (picked.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      status = undefined;
      render();
      focus("#fr-errors");
      return;
    }
    let read: string;
    try {
      read = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${READER_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = read;
    error = undefined;
    file = undefined;
    view = START_VIEW;
    status = t(C.opened, locale);
    render();
    focus(`#${READER_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fr-file-form" && id !== "fr-find-form") return;
    e.preventDefault();
    if (id === "fr-file-form") read();
    else show();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fr-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      focus(`#${READER_TEXT_ID}`);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.dataset["action"];
    if (action === "fr-clear") clear();
    else if (action === "fr-reset") reset();
    else if (action === "fr-toggle" && el.dataset["value"]) toggle(el.dataset["value"]);
    else if (action === "fr-page") page(el.dataset["group"], Number(el.dataset["value"]));
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === READER_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      syncText();
      locale = next;
      // Places are ordered by the language's alphabet, so they are grouped again.
      if (file) {
        const r = readNotesFile(text, today, locale);
        if (r.ok) file = r.file;
      }
      status = undefined;
      render();
    },
    file: () => file,
    view: () => view,
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
