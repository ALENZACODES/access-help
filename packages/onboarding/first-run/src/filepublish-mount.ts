import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_PUBLISH_COPY as C } from "./filepublish-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { datasetRows, publishChecks, publishProblems, type DatasetRow, type PublishOptions, type PublishProblem } from "./publishpack";
import { injectStyles } from "./styles";
import { PUBLISH_OPEN_ID, PUBLISH_TEXT_ID, problemTarget, readPublishForm, renderFilePublish, startOptions } from "./views-filepublish";

export interface FilePublishOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FilePublishHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  /** The rows of the dataset on screen, or undefined before one is prepared. */
  rows(): DatasetRow[] | undefined;
  /** The options the dataset on screen was prepared with. */
  options(): PublishOptions | undefined;
  destroy(): void;
}

/**
 * Mounts "Prepare a file to publish". The file lives in memory only; nothing
 * is sent or saved. It is its own entry point, loaded only when a person
 * opens it.
 */
export function mountFilePublish(root: HTMLElement, opts: FilePublishOptions): FilePublishHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let form: PublishOptions = startOptions(locale);
  let problems: PublishProblem[] = [];
  let prepared: PublishOptions | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFilePublish({ text, error, file, form, problems, prepared, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${PUBLISH_TEXT_ID}`);
    if (box) text = box.value;
    if (file) form = readPublishForm(root, form);
  }

  function read(): void {
    sync();
    status = undefined;
    prepared = undefined;
    problems = [];
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fpb-errors");
      return;
    }
    error = undefined;
    file = r.file;
    render();
    focus("#fpb-form");
    announcer.say(root.querySelector("#fpb-check-list")?.textContent ?? "");
  }

  function prepare(): void {
    if (!file) return;
    sync();
    status = undefined;
    problems = publishProblems(form, publishChecks(file, today));
    if (problems.length > 0) {
      render();
      focus("#fpb-errors");
      return;
    }
    prepared = { ...form, title: form.title.trim(), area: form.area.trim() };
    render();
    focus("#fpb-results");
    announcer.say(t(C.prepared, locale));
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    form = startOptions(locale);
    problems = [];
    prepared = undefined;
    status = t(C.cleared, locale);
    render();
    focus(`#${PUBLISH_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      prepared = undefined;
      status = undefined;
      render();
      focus("#fpb-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${PUBLISH_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    prepared = undefined;
    problems = [];
    status = t(C.opened, locale);
    render();
    focus(`#${PUBLISH_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fpb-file-form" && id !== "fpb-publish-form") return;
    e.preventDefault();
    if (id === "fpb-file-form") read();
    else prepare();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fpb-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      const targets = [`#${PUBLISH_TEXT_ID}`, ...problems.map((p) => `#${problemTarget(p)}`)];
      if (targets.includes(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fpb-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === PUBLISH_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      locale = next;
      // Places are read again in the new language; the form and the dataset stay as chosen.
      if (file) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) file = r.file;
      }
      status = undefined;
      render();
    },
    file: () => file,
    rows: () => (file && prepared ? datasetRows(file, prepared, today) : undefined),
    options: () => prepared,
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
