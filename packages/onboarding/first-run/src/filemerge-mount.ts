import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import { checkFile } from "./filecheck";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { CLASH_CHOICES, MAX_FILES, NO_CHOICES, applyChoices, planMerge, pruneChoices, trimLabel, type Choices, type ClashChoice, type FileProblem, type MergePlan } from "./filemerge";
import { FILE_MERGE_COPY as C, addedText, combinedText } from "./filemerge-copy";
import { injectStyles } from "./styles";
import { LABEL_ID, OPEN_ID, PASTE_ID, renderFileMerge, type ListedFile, type MergeFormError } from "./views-filemerge";

export interface FileMergeOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileMergeHandle {
  setLocale(locale: Locale): void;
  /** The files in the list, in order. */
  files(): readonly ListedFile[];
  plan(): MergePlan | undefined;
  choices(): Choices;
  destroy(): void;
}

/** A file in the list: its text and what the App reads in it. The label is shown with the file's number at render time. */
export function listFile(label: string, text: string, today: Date): ListedFile {
  const r = checkFile(text, today);
  const clean = trimLabel(label);
  if (!r.ok) return { label: clean, text, notes: 0, leftOut: 0, unreadable: true };
  return { label: clean, text, notes: r.check.totals.readable, leftOut: r.check.totals.leftOut, unreadable: false };
}

/**
 * Mounts "Combine note files". The files live in memory only; nothing is
 * saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileMerge(root: HTMLElement, opts: FileMergeOptions): FileMergeHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let files: ListedFile[] = [];
  let pasteText = "";
  let pasteLabel = "";
  let formError: MergeFormError | undefined;
  let plan: MergePlan | undefined;
  /** Files the last combine could not use. */
  let problems: readonly FileProblem[] = [];
  let choices: Choices = NO_CHOICES;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileMerge({ files, pasteText, pasteLabel, formError, plan, problems, choices, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function syncForm(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${PASTE_ID}`);
    const name = root.querySelector<HTMLInputElement>(`#${LABEL_ID}`);
    if (box) pasteText = box.value;
    if (name) pasteLabel = name.value;
  }

  /** The list changed, so a combined file on screen no longer matches it. */
  function listChanged(): void {
    plan = undefined;
    problems = [];
    choices = NO_CHOICES;
  }

  function fail(e: MergeFormError): void {
    formError = e;
    status = undefined;
    render();
    focus("#fm-errors");
  }

  function addPasted(): void {
    syncForm();
    if (pasteText.trim() === "") return fail("empty-paste");
    if (files.length >= MAX_FILES) return fail("too-many");
    files = [...files, listFile(pasteLabel, pasteText, today)];
    pasteText = "";
    pasteLabel = "";
    formError = undefined;
    status = undefined;
    listChanged();
    render();
    focus("#fm-files");
    announcer.say(addedText(files.length, locale));
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const picked = Array.from(input.files ?? []);
    if (picked.length === 0) return;
    syncForm();
    let failed = false;
    const added: ListedFile[] = [];
    for (const file of picked) {
      if (files.length + added.length >= MAX_FILES) break;
      if (file.size > MAX_FILE_BYTES) {
        added.push({ label: trimLabel(file.name), text: "", notes: 0, leftOut: 0, unreadable: true });
        continue;
      }
      try {
        added.push(listFile(file.name, await readFile(file), today));
      } catch {
        failed = true;
      }
      if (destroyed) return;
    }
    if (destroyed) return;
    const over = files.length + picked.length > MAX_FILES;
    files = [...files, ...added];
    listChanged();
    formError = over ? "too-many" : undefined;
    status = failed ? t(C.readFailed, locale) : undefined;
    render();
    if (over) focus("#fm-errors");
    else focus("#fm-files");
    announcer.say(failed ? t(C.readFailed, locale) : addedText(files.length, locale));
  }

  function remove(index: number): void {
    syncForm();
    if (index < 0 || index >= files.length) return;
    files = files.filter((_, i) => i !== index);
    formError = undefined;
    status = undefined;
    listChanged();
    render();
    focus("#fm-files");
    announcer.say(addedText(files.length, locale));
  }

  function clear(): void {
    files = [];
    pasteText = "";
    pasteLabel = "";
    formError = undefined;
    listChanged();
    status = t(C.cleared, locale);
    render();
    focus(`#${PASTE_ID}`);
    announcer.say(status);
  }

  function combine(): void {
    syncForm();
    const next = planMerge(files, today);
    problems = next.problems;
    if (next.files.length < 2) {
      // Without two readable files there is nothing to combine; the files that cannot be used are still listed.
      plan = undefined;
      formError = "need-two";
      status = undefined;
      render();
      focus("#fm-errors");
      return;
    }
    plan = next;
    choices = pruneChoices(next, choices);
    formError = undefined;
    status = undefined;
    render();
    focus("#fm-results");
    const result = applyChoices(next, choices);
    announcer.say(combinedText(result.notes.length, next.clashes.length, next.copies.length, locale));
  }

  function choose(key: string, value: string, controlId: string): void {
    if (!plan || !CLASH_CHOICES.includes(value as ClashChoice)) return;
    syncForm();
    choices = { ...choices, clashes: { ...choices.clashes, [key]: value as ClashChoice } };
    render();
    focus(`#${controlId}`);
    announcer.say(t(C.updated, locale));
  }

  function toggleCopy(key: string, on: boolean, controlId: string): void {
    if (!plan) return;
    syncForm();
    const rest = choices.dropCopies.filter((k) => k !== key);
    choices = { ...choices, dropCopies: on ? [...rest, key] : rest };
    render();
    focus(`#${controlId}`);
    announcer.say(t(C.updated, locale));
  }

  function onSubmit(e: Event): void {
    if ((e.target as HTMLElement | null)?.id !== "fm-form") return;
    e.preventDefault();
    addPasted();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fm-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      focus(link.getAttribute("href") ?? "");
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.dataset["action"];
    if (action === "fm-combine") combine();
    else if (action === "fm-clear") clear();
    else if (action === "fm-remove") remove(Number(el.dataset["value"]));
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || !root.contains(el)) return;
    if (el.id === OPEN_ID) void open(el);
    else if (el.type === "radio" && el.dataset["clash"]) choose(el.dataset["clash"], el.value, el.id);
    else if (el.type === "checkbox" && el.dataset["copy"]) toggleCopy(el.dataset["copy"], el.checked, el.id);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      syncForm();
      locale = next;
      status = undefined;
      render();
    },
    files: () => files,
    plan: () => plan,
    choices: () => choices,
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
