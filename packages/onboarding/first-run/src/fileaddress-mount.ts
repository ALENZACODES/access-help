import type { Locale } from "../../switch-first/src/index";
import { NO_FIXES, applyFixes, checkAddresses, type AddressReport, type FixedCopy, type Fixes } from "./addresscheck";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_ADDRESS_COPY as C, copySummary, reportSummary } from "./fileaddress-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { injectStyles } from "./styles";
import { ADDRESS_OPEN_ID, ADDRESS_TEXT_ID, firstFixId, hasFix, readFixes, renderFileAddress } from "./views-fileaddress";

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
  report(): AddressReport | undefined;
  copy(): FixedCopy | undefined;
  destroy(): void;
}

/**
 * Mounts "Check the addresses in a file". The file lives in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person
 * opens it.
 */
export function mountFileAddress(root: HTMLElement, opts: FileAddressOptions): FileAddressHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let picked: Fixes = NO_FIXES;
  let applied: Fixes = NO_FIXES;
  let copyMade = false;
  let noneError = false;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileAddress({ text, error, file, picked, applied, copyMade, noneError, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${ADDRESS_TEXT_ID}`);
    if (box) text = box.value;
    if (file) picked = readFixes(root);
  }

  function reset(): void {
    picked = NO_FIXES;
    applied = NO_FIXES;
    copyMade = false;
    noneError = false;
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
    render();
    focus("#fad-summary");
    announcer.say(reportSummary(checkAddresses(r.file, locale), locale));
  }

  function makeCopy(): void {
    if (!file) return;
    sync();
    status = undefined;
    noneError = !hasFix(picked);
    if (noneError) {
      copyMade = false;
      render();
      focus("#fad-errors");
      return;
    }
    applied = picked;
    copyMade = true;
    render();
    focus("#fad-copy");
    announcer.say(`${t(C.made, locale)} ${copySummary(applyFixes(file, checkAddresses(file, locale), applied), locale)}`);
  }

  /** Ticks every suggested code on the page; nothing else changes until the person makes the copy. */
  function tickAll(): void {
    for (const b of Array.from(root.querySelectorAll<HTMLInputElement>('input[name="postal"]'))) b.checked = true;
    picked = readFixes(root);
    announcer.say(t(C.ticked, locale));
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
    else makeCopy();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fad-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      const fixId = file ? firstFixId(checkAddresses(file, locale)) : undefined;
      if (href === `#${ADDRESS_TEXT_ID}` || (fixId !== undefined && href === `#${fixId}`)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (!el || !root.contains(el)) return;
    if (el.dataset["action"] === "fad-clear") clear();
    else if (el.dataset["action"] === "fad-tick-all") tickAll();
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
      // Streets are put in the language's alphabet, so the file is read again.
      if (file) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) file = r.file;
      }
      status = undefined;
      render();
    },
    file: () => file,
    report: () => (file ? checkAddresses(file, locale) : undefined),
    copy: () => (file && copyMade ? applyFixes(file, checkAddresses(file, locale), applied) : undefined),
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
