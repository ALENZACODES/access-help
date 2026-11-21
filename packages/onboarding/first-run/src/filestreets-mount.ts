import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { DEFAULT_LIST_OPTIONS, groupFile, readStreetFile, shareGroups, type ListOptions, type StreetFile } from "./filestreets";
import { FILE_STREETS_COPY as C, sortedText } from "./filestreets-copy";
import { injectStyles } from "./styles";
import { BOTH_SIDES_ID, ONLY_OPEN_ID, PEOPLE_ID, STREETS_OPEN_ID, STREETS_TEXT_ID, isGroupBy, peopleFrom, renderFileStreets, sharedText } from "./views-filestreets";

export interface FileStreetsOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileStreetsHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  options(): ListOptions;
  destroy(): void;
}

/**
 * Mounts "Sort a notes file by street". The file lives in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person
 * opens it.
 */
export function mountFileStreets(root: HTMLElement, opts: FileStreetsOptions): FileStreetsHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let options: ListOptions = DEFAULT_LIST_OPTIONS;
  let peopleText = "1";
  let peopleError = false;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileStreets({ text, error, file, options, peopleText, peopleError, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${STREETS_TEXT_ID}`);
    if (box) text = box.value;
    const n = root.querySelector<HTMLInputElement>(`#${PEOPLE_ID}`);
    if (n) peopleText = n.value;
  }

  function summary(f: StreetFile): string {
    const g = groupFile(f, options, locale);
    return sortedText(f.places.length - g.leftOutDone, g.groups.length, g.ungrouped.length, locale, options.by);
  }

  function read(): void {
    sync();
    status = undefined;
    peopleError = false;
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fst-errors");
      return;
    }
    error = undefined;
    file = r.file;
    options = DEFAULT_LIST_OPTIONS;
    peopleText = "1";
    render();
    focus("#fst-summary");
    announcer.say(summary(r.file));
  }

  function share(): void {
    if (!file) return;
    sync();
    status = undefined;
    const n = peopleFrom(peopleText);
    const by = root.querySelector<HTMLInputElement>('input[name="by"]:checked')?.value;
    const bothSides = root.querySelector<HTMLInputElement>(`#${BOTH_SIDES_ID}`)?.checked ?? options.bothSides;
    const onlyOpen = root.querySelector<HTMLInputElement>(`#${ONLY_OPEN_ID}`)?.checked ?? options.onlyOpen;
    if (n === undefined) {
      peopleError = true;
      // Keep the other choices on screen while the number is fixed.
      options = { ...options, by: isGroupBy(by) ? by : options.by, bothSides, onlyOpen };
      render();
      focus("#fst-errors");
      return;
    }
    peopleError = false;
    options = { by: isGroupBy(by) ? by : options.by, bothSides, onlyOpen, people: n };
    peopleText = String(n);
    render();
    focus("#fst-lists");
    announcer.say(n === 1 ? summary(file) : `${t(C.updated, locale)} ${sharedText(shareGroups(groupFile(file, options, locale), n), locale)}.`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    options = DEFAULT_LIST_OPTIONS;
    peopleText = "1";
    peopleError = false;
    status = t(C.cleared, locale);
    render();
    focus(`#${STREETS_TEXT_ID}`);
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
      focus("#fst-errors");
      return;
    }
    let read: string;
    try {
      read = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${STREETS_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = read;
    error = undefined;
    file = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${STREETS_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fst-file-form" && id !== "fst-options-form") return;
    e.preventDefault();
    if (id === "fst-file-form") read();
    else share();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fst-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href");
      if (href === `#${STREETS_TEXT_ID}` || href === `#${PEOPLE_ID}`) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fst-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === STREETS_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      // Street and place order follow the language's alphabet, so the file is read again.
      if (file) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) file = r.file;
      }
      status = undefined;
      render();
    },
    file: () => file,
    options: () => options,
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
