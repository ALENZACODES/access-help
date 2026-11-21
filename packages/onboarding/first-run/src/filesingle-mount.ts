import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { fileSingle, type SingleReport } from "./corroboration";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_SINGLE_COPY as C } from "./filesingle-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { injectStyles } from "./styles";
import { KEYS_TARGET, SINGLE_AREA_ID, SINGLE_OPEN_ID, SINGLE_TEXT_ID, START_CHOICE, areaTooLong, readSingleForm, renderFileSingle, type SingleChoice } from "./views-filesingle";

export interface FileSingleOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileSingleHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  /** The results on screen, or undefined before they are shown. */
  report(): SingleReport | undefined;
  /** The choices the results on screen were made with. */
  choice(): SingleChoice | undefined;
  destroy(): void;
}

/**
 * Mounts "Details with one report". The file lives in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person
 * opens it.
 */
export function mountFileSingle(root: HTMLElement, opts: FileSingleOptions): FileSingleHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let form: SingleChoice = START_CHOICE;
  let areaError = false;
  let keysError = false;
  let shown: SingleChoice | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileSingle({ text, error, file, form, areaError, keysError, shown, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${SINGLE_TEXT_ID}`);
    if (box) text = box.value;
    if (file) form = readSingleForm(root, form);
  }

  function read(): void {
    sync();
    status = undefined;
    shown = undefined;
    areaError = false;
    keysError = false;
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fsg-errors");
      return;
    }
    error = undefined;
    file = r.file;
    // A file read is shown at once with the choices on the form; they can be changed after.
    present();
  }

  function show(): void {
    sync();
    present();
  }

  /** Shows the results for the choices held, without reading the page again. */
  function present(): void {
    if (!file) return;
    status = undefined;
    areaError = areaTooLong(form.area);
    keysError = form.keys.length === 0;
    if (areaError || keysError) {
      render();
      focus("#fsg-errors");
      return;
    }
    shown = { ...form, area: form.area.trim() };
    render();
    focus("#fsg-results");
    announcer.say(`${t(C.shown, locale)} ${root.querySelector("#fsg-summary")?.textContent ?? ""}`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    form = START_CHOICE;
    areaError = false;
    keysError = false;
    shown = undefined;
    status = t(C.cleared, locale);
    render();
    focus(`#${SINGLE_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      shown = undefined;
      status = undefined;
      render();
      focus("#fsg-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${SINGLE_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    shown = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${SINGLE_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fsg-file-form" && id !== "fsg-show-form") return;
    e.preventDefault();
    if (id === "fsg-file-form") read();
    else show();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fsg-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (href === `#${SINGLE_TEXT_ID}` || href === `#${SINGLE_AREA_ID}` || href === `#${KEYS_TARGET}`) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fsg-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === SINGLE_OPEN_ID) void open(el);
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
      render();
    },
    file: () => file,
    report: () => (file && shown ? fileSingle(file, shown.mode, shown.area, shown.keys) : undefined),
    choice: () => shown,
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
