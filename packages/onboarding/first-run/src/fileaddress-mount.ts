import type { Locale } from "../../switch-first/src/index";
import { addressRows, applyAddresses, type AddressedCopy, type AddressProblem, type AddressReport } from "./addressfill";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { FILE_ADDRESS_COPY as C, copySummary } from "./fileaddress-copy";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { readStreetFile, type StreetFile } from "./filestreets";
import { injectStyles } from "./styles";
import { ADDRESS_OPEN_ID, ADDRESS_TEXT_ID, POSTAL_ID, addressOf, readAddressPicks, renderFileAddress, type AddressPick } from "./views-fileaddress";

export interface FileAddressOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileAddressHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  /** The places to add an address to, or undefined before a file is read. */
  report(): AddressReport | undefined;
  /** The copy on screen, or undefined before one is made. */
  copy(): AddressedCopy | undefined;
  destroy(): void;
}

/**
 * Mounts "Add missing addresses". The file lives in memory only; nothing is
 * saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileAddress(root: HTMLElement, opts: FileAddressOptions): FileAddressHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let report: AddressReport | undefined;
  let picks: ReadonlyMap<string, AddressPick> = new Map();
  let typed: ReadonlyMap<string, string> = new Map();
  let problems: ReadonlyMap<string, AddressProblem> = new Map();
  let noneError = false;
  let made: ReadonlyMap<string, string> | undefined;
  let postal = false;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileAddress({ text, error, file, report, picks, typed, problems, noneError, made, postal, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${ADDRESS_TEXT_ID}`);
    if (box) text = box.value;
    const box2 = root.querySelector<HTMLInputElement>(`#${POSTAL_ID}`);
    if (box2) postal = box2.checked;
    if (report && root.querySelector("#fad-fix-form")) ({ picks, typed } = readAddressPicks(root, report));
  }

  function reset(): void {
    report = undefined;
    picks = new Map();
    typed = new Map();
    problems = new Map();
    noneError = false;
    made = undefined;
  }

  function read(): void {
    sync();
    status = undefined;
    reset();
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fad-errors");
      return;
    }
    error = undefined;
    file = r.file;
    report = addressRows(r.file, { postal });
    render();
    focus("#fad-results");
    announcer.say(root.querySelector("#fad-summary")?.textContent ?? "");
  }

  function make(): void {
    if (!file || !report) return;
    sync();
    status = undefined;
    const choices = new Map<string, string>();
    const found = new Map<string, AddressProblem>();
    for (const row of report.rows) {
      const a = addressOf(row, picks.get(row.id), typed.get(row.id));
      if (a === undefined) continue;
      if ("problem" in a) found.set(row.id, a.problem);
      else choices.set(row.id, a.to);
    }
    problems = found;
    noneError = found.size === 0 && choices.size === 0;
    if (noneError || found.size > 0) {
      render();
      focus("#fad-errors");
      return;
    }
    made = choices;
    render();
    focus("#fad-copy");
    announcer.say(`${t(C.made, locale)} ${copySummary(applyAddresses(file, report, made), locale)}`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    reset();
    status = t(C.cleared, locale);
    render();
    focus(`#${ADDRESS_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      reset();
      status = undefined;
      render();
      focus("#fad-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${ADDRESS_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    reset();
    status = t(C.opened, locale);
    render();
    focus(`#${ADDRESS_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fad-file-form" && id !== "fad-fix-form") return;
    e.preventDefault();
    if (id === "fad-file-form") read();
    else make();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fad-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      // Every link in the summary names a field on the page.
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fad-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === ADDRESS_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      // Places are grouped again in the new language's order; ids stay, so the choices stay with their place.
      if (file) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) {
          file = r.file;
          report = addressRows(r.file, { postal });
        }
      }
      status = undefined;
      render();
    },
    file: () => file,
    report: () => report,
    copy: () => (file && report && made ? applyAddresses(file, report, made) : undefined),
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
