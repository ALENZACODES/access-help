import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { EMPTY_ADD, addProblems, applyAdds, hasNoRecord, matchingPlaces, planAdds, type AddedCopy, type AddOptions, type AddProblem, type PlannedAdd } from "./bulkadd";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { FILE_ADD_COPY as C } from "./fileadd-copy";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { readStreetFile, type StreetFile } from "./filestreets";
import { injectStyles } from "./styles";
import { ADD_OPEN_ID, ADD_TEXT_ID, readRecord, readTicked, renderFileAdd } from "./views-fileadd";

export interface FileAddOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileAddHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  /** The places shown, or undefined before any are. */
  plan(): readonly PlannedAdd[] | undefined;
  /** The copy on screen, or undefined before one is made. */
  copy(): AddedCopy | undefined;
  destroy(): void;
}

/**
 * Mounts "Add one record to many places". The file lives in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person
 * opens it.
 */
export function mountFileAdd(root: HTMLElement, opts: FileAddOptions): FileAddHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let form: AddOptions = EMPTY_ADD;
  let search = "";
  let onlyUnknown = true;
  let problems: readonly AddProblem[] = [];
  let plan: readonly PlannedAdd[] | undefined;
  let options: AddOptions | undefined;
  let ticked: ReadonlySet<string> = new Set();
  let made: ReadonlySet<string> | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileAdd({ text, error, file, form, search, onlyUnknown, problems, plan, options, ticked, made, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${ADD_TEXT_ID}`);
    if (box) text = box.value;
    if (root.querySelector("#fbd-options-form")) ({ form, search, onlyUnknown } = readRecord(root));
    if (plan && root.querySelector("#fbd-places-form")) ticked = readTicked(root, plan);
  }

  /** Drops the places, ticks and copy. The record on the form stays: one source's list often covers more than one file. */
  function resetResults(): void {
    problems = [];
    plan = undefined;
    options = undefined;
    ticked = new Set();
    made = undefined;
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
      focus("#fbd-errors");
      return;
    }
    error = undefined;
    file = r.file;
    render();
    focus("#fbd-record");
    announcer.say(`${t(C.recordTitle, locale)}.`);
  }

  function show(): void {
    if (!file) return;
    sync();
    status = undefined;
    problems = addProblems(form, today);
    if (problems.length > 0) {
      render();
      focus("#fbd-errors");
      return;
    }
    const key = form.key;
    const places = matchingPlaces(file, search).filter((p) => !onlyUnknown || (key !== "" && hasNoRecord(p, key)));
    options = form;
    plan = planAdds(places, form, today);
    ticked = new Set();
    made = undefined;
    render();
    focus("#fbd-list");
    announcer.say(root.querySelector("#fbd-summary")?.textContent ?? "");
  }

  function make(): void {
    if (!file || !plan || !options) return;
    sync();
    status = undefined;
    if (ticked.size === 0) {
      problems = ["no-places"];
      made = undefined;
      render();
      focus("#fbd-errors");
      return;
    }
    problems = [];
    made = ticked;
    render();
    focus("#fbd-copy");
    announcer.say(`${t(C.made, locale)} ${root.querySelector("#fbd-copy-summary")?.textContent ?? ""}`);
  }

  function tickAll(on: boolean): void {
    if (!plan) return;
    for (const b of Array.from(root.querySelectorAll<HTMLInputElement>('#fbd-places-form input[type="checkbox"]'))) b.checked = on;
    ticked = readTicked(root, plan);
    announcer.say(t(on ? C.allTicked : C.noneTicked, locale));
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    form = EMPTY_ADD;
    search = "";
    onlyUnknown = true;
    resetResults();
    status = t(C.cleared, locale);
    render();
    focus(`#${ADD_TEXT_ID}`);
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
      focus("#fbd-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${ADD_OPEN_ID}`);
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
    focus(`#${ADD_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fbd-file-form" && id !== "fbd-options-form" && id !== "fbd-places-form") return;
    e.preventDefault();
    if (id === "fbd-file-form") read();
    else if (id === "fbd-options-form") show();
    else make();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fbd-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      // Every link in the summary names a field on the page.
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.dataset["action"];
    if (action === "fbd-clear") clear();
    else if (action === "fbd-tick-all" || action === "fbd-untick-all") tickAll(action === "fbd-tick-all");
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === ADD_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      // Places are kept by id, so the ticks survive the switch.
      sync();
      locale = next;
      status = undefined;
      render();
    },
    file: () => file,
    plan: () => plan,
    copy: () => (file && plan && options && made ? applyAdds(file, plan.filter((a) => made?.has(a.place.id)).map((a) => a.place), options, today) : undefined),
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
