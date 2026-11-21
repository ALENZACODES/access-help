import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { FACT_KEYS } from "./facts";
import { DEFAULT_ASK, askList, isAskOrder, readAskFile, type AskFile, type AskList, type AskOptions } from "./fileask";
import { FILE_ASK_COPY as C, askSummaryText } from "./fileask-copy";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { injectStyles } from "./styles";
import { ASK_OLD_ID, ASK_OPEN_ID, ASK_SEARCH_ID, ASK_TEXT_ID, keyBoxId, renderFileAsk } from "./views-fileask";

export interface FileAskOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileAskHandle {
  setLocale(locale: Locale): void;
  file(): AskFile | undefined;
  options(): AskOptions;
  list(): AskList | undefined;
  destroy(): void;
}

/**
 * Mounts "Questions to ask". The file lives in memory only; nothing is saved
 * and nobody is contacted. It is its own entry point, loaded only when a
 * person opens it.
 */
export function mountFileAsk(root: HTMLElement, opts: FileAskOptions): FileAskHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: AskFile | undefined;
  let options: AskOptions = DEFAULT_ASK;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  const current = (): AskList | undefined => (file ? askList(file, options, locale, today) : undefined);

  function render(): void {
    root.innerHTML = renderFileAsk({ text, error, file, options, list: current(), locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function syncText(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${ASK_TEXT_ID}`);
    if (box) text = box.value;
  }

  function announceList(): void {
    const list = current();
    if (list) announcer.say(askSummaryText(list.places.length, list.places.reduce((n, p) => n + p.questions.length, 0), locale));
  }

  /** The options as ticked and typed. With no detail ticked, the earlier choice stays, since at least one is needed. */
  function formOptions(): AskOptions {
    const ticked = FACT_KEYS.filter((k) => root.querySelector<HTMLInputElement>(`#${keyBoxId(k)}`)?.checked);
    const keys = ticked.length === 0 ? options.keys : ticked.length === FACT_KEYS.length ? [] : ticked;
    const order = root.querySelector<HTMLInputElement>('input[name="order"]:checked')?.value;
    return {
      keys,
      includeOld: root.querySelector<HTMLInputElement>(`#${ASK_OLD_ID}`)?.checked ?? options.includeOld,
      query: root.querySelector<HTMLInputElement>(`#${ASK_SEARCH_ID}`)?.value ?? options.query,
      order: isAskOrder(order) ? order : options.order,
    };
  }

  function read(): void {
    syncText();
    status = undefined;
    const r = readAskFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fa-errors");
      return;
    }
    error = undefined;
    file = r.file;
    options = DEFAULT_ASK;
    render();
    focus("#fa-list");
    announceList();
  }

  function update(): void {
    if (!file) return;
    syncText();
    options = formOptions();
    status = undefined;
    render();
    focus("#fa-list");
    announceList();
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    options = DEFAULT_ASK;
    status = t(C.cleared, locale);
    render();
    focus(`#${ASK_TEXT_ID}`);
    announcer.say(status);
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
      focus("#fa-errors");
      return;
    }
    let read: string;
    try {
      read = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${ASK_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = read;
    error = undefined;
    file = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${ASK_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fa-file-form" && id !== "fa-options-form") return;
    e.preventDefault();
    if (id === "fa-file-form") read();
    else update();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fa-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      focus(`#${ASK_TEXT_ID}`);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fa-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === ASK_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      syncText();
      locale = next;
      // Questions are written in the page's language and places follow its alphabet, so the file is read again.
      if (file) {
        const r = readAskFile(text, today, locale);
        if (r.ok) file = r.file;
      }
      status = undefined;
      render();
    },
    file: () => file,
    options: () => options,
    list: current,
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
