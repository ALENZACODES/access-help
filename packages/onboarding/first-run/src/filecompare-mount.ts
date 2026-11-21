import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import { SIDES, compareFiles, placesToShow, type FileComparison, type FileError, type Side } from "./filecompare";
import { FILE_COMPARE_COPY as C, comparedText, fileErrorText, openedText, shownText } from "./filecompare-copy";
import { LIMITS } from "./model";
import { injectStyles } from "./styles";
import { FILTER_ID, OPEN_ID, TEXT_ID, renderFileCompare } from "./views-filecompare";

/** Reads an opened file as text, on this device; nothing is uploaded. */
export type FileReaderFn = (file: File) => Promise<string>;

export interface FileCompareOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  /** The host's own announcer, so there is one live region on the page. One is made when none is given. */
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileCompareHandle {
  setLocale(locale: Locale): void;
  /** The comparison on screen, or undefined before one is made. */
  comparison(): FileComparison | undefined;
  /** The text in each box now. */
  texts(): { readonly a: string; readonly b: string };
  destroy(): void;
}

/** A file larger than this many bytes is refused before it is read; the text limit is in characters, and a character takes up to 4 bytes. */
export const MAX_FILE_BYTES = LIMITS.importChars * 4;

/**
 * Uses File.text() where the browser has it, and FileReader where it does not
 * (older browsers). Either way the file is read on this device.
 */
export const readFileText: FileReaderFn = (file) => {
  if (typeof (file as Partial<File>).text === "function") return file.text();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("not text")));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
};

/**
 * Mounts "Compare two note files" into an element. It saves nothing and needs
 * no store: the two files live in the boxes until the page is left or the
 * person removes them. It is its own entry point, so a host loads it only when
 * a person opens it.
 */
export function mountFileCompare(root: HTMLElement, opts: FileCompareOptions): FileCompareHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let texts: Record<Side, string> = { a: "", b: "" };
  let errors: readonly FileError[] = [];
  let comparison: FileComparison | undefined;
  let onlyDiffering = false;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileCompare({ textA: texts.a, textB: texts.b, errors, comparison, onlyDiffering, locale, today, statusMessage: status });
    // The widget lives inside a host page, so the page-level rules (one main, a skip link, the page language) are the page's: audit the whole page.
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  /** Keeps what the person typed or pasted, so a re-render never loses it. */
  function syncTexts(): void {
    const next = { ...texts };
    for (const s of SIDES) {
      const box = root.querySelector<HTMLTextAreaElement>(`#${TEXT_ID[s]}`);
      if (box) next[s] = box.value;
    }
    texts = next;
  }

  function compare(): void {
    syncTexts();
    status = undefined;
    const res = compareFiles(texts.a, texts.b, locale);
    if (!res.ok) {
      errors = res.errors;
      comparison = undefined;
      render();
      focus("#fc-errors");
      return;
    }
    errors = [];
    comparison = res.comparison;
    onlyDiffering = false;
    render();
    focus("#fc-results");
    announcer.say(comparedText(comparison.both.length, comparison.onlyA.length, comparison.onlyB.length, locale));
  }

  function clear(): void {
    texts = { a: "", b: "" };
    errors = [];
    comparison = undefined;
    onlyDiffering = false;
    status = t(C.cleared, locale);
    render();
    focus(`#${TEXT_ID.a}`);
    announcer.say(status);
  }

  function setFilter(on: boolean): void {
    syncTexts();
    onlyDiffering = on;
    render();
    focus(`#${FILTER_ID}`);
    if (comparison) announcer.say(shownText(placesToShow(comparison, onlyDiffering).length, locale));
  }

  async function open(side: Side, input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    syncTexts();
    if (file.size > MAX_FILE_BYTES) {
      errors = [{ side, code: "too-large" }];
      status = undefined;
      render();
      focus("#fc-errors");
      return;
    }
    let text: string;
    try {
      text = await readFile(file);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${OPEN_ID[side]}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    // A file opened later replaces what was in its box. The comparison on screen no longer matches the boxes, so it goes.
    texts = { ...texts, [side]: text };
    errors = errors.filter((e) => e.side !== side);
    comparison = undefined;
    status = openedText(side, locale);
    render();
    focus(`#${TEXT_ID[side]}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    if ((e.target as HTMLElement | null)?.id !== "fc-form") return;
    e.preventDefault();
    compare();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fc-errors a");
    if (link && root.contains(link)) {
      // Links in the error summary move focus to the box, not only the scroll position.
      e.preventDefault();
      const id = (link.getAttribute("href") ?? "").slice(1);
      if (Object.values(TEXT_ID).includes(id)) focus(`#${id}`);
      return;
    }
    const action = target?.closest<HTMLElement>("[data-action]");
    if (action && root.contains(action) && action.dataset["action"] === "fc-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || !root.contains(el)) return;
    if (el.id === FILTER_ID) {
      setFilter(el.checked);
      return;
    }
    const side = el.dataset["side"];
    if (el.type === "file" && (side === "a" || side === "b")) void open(side, el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      syncTexts();
      locale = next;
      if (comparison) {
        // Place order follows the language's alphabet, so the comparison is made again from the same two texts.
        const res = compareFiles(texts.a, texts.b, locale);
        comparison = res.ok ? res.comparison : undefined;
      }
      status = undefined;
      render();
    },
    comparison: () => comparison,
    texts: () => {
      syncTexts();
      return { a: texts.a, b: texts.b };
    },
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

/** For hosts that show the first error in their own words. */
export function firstErrorText(errors: readonly FileError[], locale: Locale): string | undefined {
  const e = errors[0];
  return e ? fileErrorText(e.side, e.code, locale) : undefined;
}
