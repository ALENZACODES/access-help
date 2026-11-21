import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import type { FactKey } from "./facts";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import {
  NO_FILTERS,
  NO_PICKS,
  filterErrors as checkFilters,
  prunePicks,
  readSplitFile,
  splitNotes,
  togglePick,
  type AnswerFilter,
  type FilterError,
  type HandPicks,
  type Split,
  type SplitFile,
  type SplitFilters,
} from "./filesplit";
import { FILE_SPLIT_COPY as C, chosenText } from "./filesplit-copy";
import { injectStyles } from "./styles";
import { ERROR_FIELD, FILTER_FIELD, SPLIT_OPEN_ID, SPLIT_TEXT_ID, renderFileSplit } from "./views-filesplit";

export interface FileSplitOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileSplitHandle {
  setLocale(locale: Locale): void;
  file(): SplitFile | undefined;
  split(): Split | undefined;
  filters(): SplitFilters;
  picks(): HandPicks;
  destroy(): void;
}

/**
 * Mounts "Split a notes file". The file, the filters and the picks live in
 * memory only. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileSplit(root: HTMLElement, opts: FileSplitOptions): FileSplitHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let fileError: ImportError | "no-notes" | undefined;
  let file: SplitFile | undefined;
  let draft: SplitFilters = NO_FILTERS;
  let filters: SplitFilters = NO_FILTERS;
  let errors: readonly FilterError[] = [];
  let picks: HandPicks = NO_PICKS;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  const current = (): Split | undefined => (file ? splitNotes(file.notes, filters, picks) : undefined);

  function render(): void {
    root.innerHTML = renderFileSplit({ text, fileError, file, draft, filters, filterErrors: errors, picks, split: current(), locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function value(id: string): string | undefined {
    const el = root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`#${id}`);
    return el ? el.value : undefined;
  }

  /** Keeps what was typed, so a re-render never loses it. */
  function sync(): void {
    text = value(SPLIT_TEXT_ID) ?? text;
    if (!file) return;
    const F = FILTER_FIELD;
    draft = {
      words: value(F.words) ?? draft.words,
      detail: (value(F.detail) ?? draft.detail) as FactKey | "",
      answer: (value(F.answer) ?? draft.answer) as AnswerFilter,
      source: value(F.source) ?? draft.source,
      licence: value(F.licence) ?? draft.licence,
      from: (value(F.from) ?? draft.from).trim(),
      to: (value(F.to) ?? draft.to).trim(),
    };
  }

  function announceChoice(): void {
    const s = current();
    if (file && s) announcer.say(chosenText(s.chosen.length, file.notes.length, locale));
  }

  function readText(): void {
    sync();
    status = undefined;
    errors = [];
    const r = readSplitFile(text, today);
    if (!r.ok) {
      fileError = r.error;
      file = undefined;
      render();
      focus("#fs-errors");
      return;
    }
    fileError = undefined;
    file = r.file;
    draft = NO_FILTERS;
    filters = NO_FILTERS;
    picks = NO_PICKS;
    render();
    focus("#fs-file-read");
    announceChoice();
  }

  function apply(): void {
    sync();
    status = undefined;
    const found = checkFilters(draft);
    if (found.length > 0) {
      errors = found;
      render();
      focus("#fs-errors");
      return;
    }
    errors = [];
    filters = draft;
    render();
    focus("#fs-notes");
    announceChoice();
  }

  function resetFilters(): void {
    sync();
    draft = NO_FILTERS;
    filters = NO_FILTERS;
    errors = [];
    status = undefined;
    render();
    focus(`#${FILTER_FIELD.words}`);
    announceChoice();
  }

  function clear(): void {
    text = "";
    fileError = undefined;
    file = undefined;
    draft = NO_FILTERS;
    filters = NO_FILTERS;
    errors = [];
    picks = NO_PICKS;
    status = t(C.cleared, locale);
    render();
    focus(`#${SPLIT_TEXT_ID}`);
    announcer.say(status);
  }

  function toggle(id: string, on: boolean, controlId: string): void {
    const s = current();
    if (!file || !s) return;
    sync();
    picks = prunePicks(togglePick(picks, id, on, s.byFilters), file.notes);
    render();
    focus(`#${controlId}`);
    announceChoice();
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const picked = input.files?.[0];
    if (!picked) return;
    sync();
    if (picked.size > MAX_FILE_BYTES) {
      fileError = "too-large";
      file = undefined;
      status = undefined;
      render();
      focus("#fs-errors");
      return;
    }
    let read: string;
    try {
      read = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${SPLIT_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = read;
    fileError = undefined;
    file = undefined;
    picks = NO_PICKS;
    status = t(C.opened, locale);
    render();
    focus(`#${SPLIT_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fs-file-form" && id !== "fs-filter-form") return;
    e.preventDefault();
    if (id === "fs-file-form") readText();
    else apply();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fs-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (href === `#${SPLIT_TEXT_ID}` || Object.values(ERROR_FIELD).includes(href.slice(1))) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.dataset["action"];
    if (action === "fs-clear") clear();
    else if (action === "fs-reset") resetFilters();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || !root.contains(el)) return;
    if (el.id === SPLIT_OPEN_ID) void open(el);
    else if (el.type === "checkbox" && el.dataset["note"]) toggle(el.dataset["note"], el.checked, el.id);
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
    split: current,
    filters: () => filters,
    picks: () => picks,
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
