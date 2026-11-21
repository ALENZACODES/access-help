import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_ROUND_COPY as C, resultSummary, roundSummary } from "./fileround-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { esc } from "./html";
import { buildRound, defaultSettings, makeRound, roundProblems, type AskFor, type Entries, type Round, type RoundProblem, type RoundResult, type RoundSettings } from "./visitrecord";
import { injectStyles } from "./styles";
import { ROUND_OPEN_ID, ROUND_TEXT_ID, problemTarget, readEntries, readSettings, renderFileRound } from "./views-fileround";

export interface FileRoundOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileRoundHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  round(): Round | undefined;
  entries(): Entries;
  result(): RoundResult | undefined;
  destroy(): void;
}

/**
 * Mounts "Record what you found on a round". What a person enters lives in
 * memory only; nothing is saved. It is its own entry point, loaded only when
 * a person opens it.
 */
export function mountFileRound(root: HTMLElement, opts: FileRoundOptions): FileRoundHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let askFor: AskFor = "open";
  let round: Round | undefined;
  let entries: Entries = {};
  let settings: RoundSettings = defaultSettings(today);
  let problems: readonly RoundProblem[] = [];
  let result: RoundResult | undefined;
  let edited = false;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function audit(): void {
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function render(): void {
    root.innerHTML = renderFileRound({ text, error, file, round, askFor, entries, settings, problems, result, edited, locale, today, statusMessage: status });
    audit();
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${ROUND_TEXT_ID}`);
    if (box) text = box.value;
    if (round) {
      entries = readEntries(root, round, entries);
      settings = readSettings(root, settings);
    }
  }

  function read(): void {
    sync();
    status = undefined;
    problems = [];
    result = undefined;
    edited = false;
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      round = undefined;
      render();
      focus("#frd-errors");
      return;
    }
    error = undefined;
    file = r.file;
    round = makeRound(r.file, askFor, locale);
    entries = {};
    render();
    focus("#frd-summary");
    announcer.say(roundSummary(round, locale));
  }

  function ask(): void {
    if (!file) return;
    sync();
    const v = root.querySelector<HTMLInputElement>('input[name="ask"]:checked')?.value;
    askFor = v === "all" ? "all" : "open";
    round = makeRound(file, askFor, locale);
    problems = [];
    status = undefined;
    render();
    focus("#frd-summary");
    announcer.say(roundSummary(round, locale));
  }

  function make(): void {
    if (!file || !round) return;
    sync();
    status = undefined;
    problems = roundProblems(round, entries, settings, today);
    if (problems.length > 0) {
      render();
      focus("#frd-errors");
      return;
    }
    result = buildRound(round, entries, settings);
    edited = false;
    render();
    focus("#frd-result");
    announcer.say(resultSummary(result, locale));
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    round = undefined;
    entries = {};
    settings = defaultSettings(today);
    problems = [];
    result = undefined;
    edited = false;
    status = t(C.cleared, locale);
    render();
    focus(`#${ROUND_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const picked = input.files?.[0];
    if (!picked) return;
    sync();
    if (picked.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      round = undefined;
      status = undefined;
      render();
      focus("#frd-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${ROUND_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    round = undefined;
    result = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${ROUND_TEXT_ID}`);
    announcer.say(status);
  }

  /** After the notes file is made, a changed answer is flagged in place, without moving focus. */
  function markEdited(): void {
    if (!result || edited) return;
    edited = true;
    const msg = t(C.edited, locale);
    root.querySelector("#frd-result-summary")?.insertAdjacentHTML("afterend", `<p class="notice" id="frd-edited">${esc(msg)}</p>`);
    announcer.say(msg);
    audit();
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "frd-file-form" && id !== "frd-ask-form" && id !== "frd-round-form") return;
    e.preventDefault();
    if (id === "frd-file-form") read();
    else if (id === "frd-ask-form") ask();
    else make();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#frd-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      const allowed = [`#${ROUND_TEXT_ID}`, ...problems.map((p) => `#${problemTarget(p, round)}`)];
      if (allowed.includes(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "frd-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || !root.contains(el)) return;
    if (el.id === ROUND_OPEN_ID) {
      void open(el);
      return;
    }
    if (el.closest("#frd-round-form")) markEdited();
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      // Street and place order follow the language's alphabet; answers are kept by place.
      if (file) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) {
          file = r.file;
          round = makeRound(r.file, askFor, locale);
        }
      }
      status = undefined;
      render();
    },
    file: () => file,
    round: () => round,
    entries: () => entries,
    result: () => result,
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
