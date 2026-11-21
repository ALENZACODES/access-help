import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { compare, dayProblem, snapshot, sourcesSince, toProblem, type Comparison, type DayProblem, type Snapshot, type SourceSince, type ToProblem } from "./asof";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { FILE_ASOF_COPY as C } from "./fileasof-copy";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { readStreetFile, type StreetFile } from "./filestreets";
import { injectStyles } from "./styles";
import { ASOF_OPEN_ID, ASOF_TEXT_ID, DAY_ID, TO_ID, renderFileAsof } from "./views-fileasof";

export interface FileAsofOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileAsofHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  snapshot(): Snapshot | undefined;
  comparison(): Comparison | undefined;
  destroy(): void;
}

/**
 * Mounts "A notes file as it was on a day". The file lives in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person
 * opens it.
 */
export function mountFileAsof(root: HTMLElement, opts: FileAsofOptions): FileAsofHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let day = "";
  let to = "";
  let problem: DayProblem | undefined;
  let toIssue: ToProblem | undefined;
  let snap: Snapshot | undefined;
  let comparison: Comparison | undefined;
  let sources: readonly SourceSince[] = [];
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileAsof({ text, error, file, day, to, problem, toProblem: toIssue, snapshot: snap, comparison, sources, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${ASOF_TEXT_ID}`);
    if (box) text = box.value;
    const d = root.querySelector<HTMLInputElement>(`#${DAY_ID}`);
    if (d) day = d.value;
    const e = root.querySelector<HTMLInputElement>(`#${TO_ID}`);
    if (e) to = e.value;
  }

  /** The day stays for the next file: comparing several files to one day is common. */
  function resetResults(): void {
    problem = undefined;
    toIssue = undefined;
    snap = undefined;
    comparison = undefined;
    sources = [];
  }

  /** Works out the snapshot, comparison and sources for the days on the form, which have no problem. */
  function work(f: StreetFile): void {
    const first = day.trim();
    const second = to.trim() === "" ? undefined : to.trim();
    snap = snapshot(f, first);
    comparison = compare(f, snap, locale, second === undefined ? undefined : snapshot(f, second));
    sources = sourcesSince(f, first, second);
  }

  function read(): void {
    sync();
    status = undefined;
    resetResults();
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fas-errors");
      return;
    }
    error = undefined;
    file = r.file;
    render();
    focus("#fas-day-title");
    announcer.say(t(C.dayTitle, locale));
  }

  function show(): void {
    if (!file) return;
    sync();
    status = undefined;
    problem = dayProblem(day, today);
    toIssue = problem ? undefined : toProblem(to, day.trim(), today);
    if (problem || toIssue) {
      snap = undefined;
      comparison = undefined;
      sources = [];
      render();
      focus("#fas-errors");
      return;
    }
    work(file);
    render();
    focus("#fas-results");
    announcer.say(root.querySelector("#fas-summary")?.textContent ?? "");
  }

  /** Puts a quick day in the box, keeping everything else on the page, and moves focus to the box to check or change it. */
  function fillDay(d: string): void {
    const box = root.querySelector<HTMLInputElement>(`#${DAY_ID}`);
    if (!box || d === "") return;
    box.value = d;
    box.focus();
    announcer.say(`${t(C.quickFilled, locale)} ${d}`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    day = "";
    to = "";
    resetResults();
    status = t(C.cleared, locale);
    render();
    focus(`#${ASOF_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      resetResults();
      status = undefined;
      render();
      focus("#fas-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${ASOF_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    resetResults();
    status = t(C.opened, locale);
    render();
    focus(`#${ASOF_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fas-file-form" && id !== "fas-day-form") return;
    e.preventDefault();
    if (id === "fas-file-form") read();
    else show();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fas-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      // Every link in the summary names a field on the page.
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (!el || !root.contains(el)) return;
    if (el.dataset["action"] === "fas-clear") clear();
    else if (el.dataset["action"] === "fas-quick") fillDay(el.dataset["day"] ?? "");
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === ASOF_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      // Places are grouped again in the new language's order; the counts do not change.
      if (file && snap && comparison) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) {
          file = r.file;
          // Work from the days the results were made with, not ones typed since.
          const typed = { day, to };
          day = snap.day;
          to = comparison.to ?? "";
          work(r.file);
          ({ day, to } = typed);
        }
      }
      status = undefined;
      render();
    },
    file: () => file,
    snapshot: () => snap,
    comparison: () => comparison,
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
