import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { readStreetFile, type StreetFile } from "./filestreets";
import { FILE_VISITS_COPY as C, planSummary } from "./filevisits-copy";
import { injectStyles } from "./styles";
import { checkPlanForm, defaultPlanOptions, formFor, planVisits, type Plan, type PlanForm, type PlanOptions, type PlanProblem } from "./visitplan";
import { VISITS_OPEN_ID, VISITS_TEXT_ID, fieldId, readPlanForm, renderFileVisits } from "./views-filevisits";

export interface FileVisitsOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileVisitsHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  options(): PlanOptions;
  plan(): Plan | undefined;
  destroy(): void;
}

/**
 * Mounts "Plan visits by day". The file lives in memory only; nothing is
 * saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileVisits(root: HTMLElement, opts: FileVisitsOptions): FileVisitsHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  const defaults = defaultPlanOptions(today);
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let options: PlanOptions = defaults;
  let form: PlanForm = formFor(defaults);
  let problems: readonly PlanProblem[] = [];
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileVisits({ text, error, file, options, form, problems, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${VISITS_TEXT_ID}`);
    if (box) text = box.value;
    form = readPlanForm(root, form);
  }

  function currentPlan(): Plan | undefined {
    return file ? planVisits(file, options, locale) : undefined;
  }

  function read(): void {
    sync();
    status = undefined;
    problems = [];
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fvp-errors");
      return;
    }
    error = undefined;
    file = r.file;
    // The days and times chosen so far are kept for the new file when they are valid.
    const c = checkPlanForm(form);
    options = c.ok ? c.options : defaults;
    form = formFor(options);
    render();
    focus("#fvp-summary");
    announcer.say(planSummary(planVisits(r.file, options, locale), locale));
  }

  function update(): void {
    if (!file) return;
    sync();
    status = undefined;
    const c = checkPlanForm(form);
    if (!c.ok) {
      problems = c.problems;
      render();
      focus("#fvp-errors");
      return;
    }
    problems = [];
    options = c.options;
    form = formFor(options);
    render();
    focus("#fvp-days");
    announcer.say(`${t(C.updated, locale)} ${planSummary(planVisits(file, options, locale), locale)}`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    options = defaults;
    form = formFor(defaults);
    problems = [];
    status = t(C.cleared, locale);
    render();
    focus(`#${VISITS_TEXT_ID}`);
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
      focus("#fvp-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${VISITS_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${VISITS_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fvp-file-form" && id !== "fvp-options-form") return;
    e.preventDefault();
    if (id === "fvp-file-form") read();
    else update();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fvp-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      const allowed = [`#${VISITS_TEXT_ID}`, ...problems.map((p) => `#${fieldId(p.field)}`)];
      if (allowed.includes(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fvp-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === VISITS_OPEN_ID) void open(el);
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
    plan: currentPlan,
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
