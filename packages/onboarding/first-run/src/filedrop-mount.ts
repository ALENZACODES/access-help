import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import { chosenInOrder, findPlaces, listLines, listTooLong, matchList, readBack, reasonProblem, removalFiles, removePlaces, type FoundPlaces } from "./dropplaces";
import type { ImportError } from "./exchange";
import { FILE_DROP_COPY as C, chosenTitle, foundText, listResultText, readBackText, removalSummary, type DropProblem } from "./filedrop-copy";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { readStreetFile, type StreetFile } from "./filestreets";
import type { Place } from "./places";
import { injectStyles } from "./styles";
import { DROP_OPEN_ID, DROP_TEXT_ID, LIST_ID, REASON_ID, SEARCH_ID, keepId, pickId, renderFileDrop, type DropOutcome } from "./views-filedrop";

export interface FileDropOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileDropHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  /** Places ticked to remove, in the file's order. */
  chosen(): readonly Place[];
  /** The copy made, or undefined before the places are removed. */
  outcome(): DropOutcome | undefined;
  destroy(): void;
}

/**
 * Mounts "Remove places from a file". The file lives in memory only; nothing
 * is saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileDrop(root: HTMLElement, opts: FileDropOptions): FileDropHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let query = "";
  let found: FoundPlaces | undefined;
  let ids: string[] = [];
  let reason = "";
  let problems: DropProblem[] = [];
  let list = "";
  let listResult: string | undefined;
  let outcome: DropOutcome | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  const chosen = (): Place[] => {
    if (!file) return [];
    const byId = new Map(file.places.map((p) => [p.id, p]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  };

  function render(): void {
    root.innerHTML = renderFileDrop({ text, error, file, query, found, chosen: chosen(), reason, problems, list, listResult, outcome, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${DROP_TEXT_ID}`);
    if (box) text = box.value;
    const search = root.querySelector<HTMLInputElement>(`#${SEARCH_ID}`);
    if (search) query = search.value;
    const why = root.querySelector<HTMLInputElement>(`#${REASON_ID}`);
    if (why) reason = why.value;
    const names = root.querySelector<HTMLTextAreaElement>(`#${LIST_ID}`);
    if (names) list = names.value;
  }

  /** Any change to the choice puts the copy away, so a copy never stands for another choice. */
  function choiceChanged(): void {
    if (outcome) {
      outcome = undefined;
      status = t(C.changed, locale);
      announcer.say(status);
    } else status = undefined;
  }

  function reset(): void {
    file = undefined;
    query = "";
    found = undefined;
    ids = [];
    reason = "";
    problems = [];
    list = "";
    listResult = undefined;
    outcome = undefined;
  }

  function read(): void {
    sync();
    status = undefined;
    const r = readStreetFile(text, today, locale);
    reset();
    if (!r.ok) {
      error = r.error;
      render();
      focus("#fdp-errors");
      return;
    }
    error = undefined;
    file = r.file;
    // Every place is listed at once, so a small file needs no search.
    found = findPlaces(r.file, "", locale);
    render();
    focus("#fdp-find");
    announcer.say(foundText(found.places.length, found.total, locale));
  }

  function find(): void {
    if (!file) return;
    sync();
    status = undefined;
    problems = problems.filter((p) => p !== "none");
    found = findPlaces(file, query, locale);
    render();
    focus("#fdp-found");
    announcer.say(foundText(found.places.length, found.total, locale));
  }

  function pick(input: HTMLInputElement): void {
    if (!file) return;
    sync();
    const id = input.value;
    const next = input.checked ? [...ids, id] : ids.filter((x) => x !== id);
    ids = chosenInOrder(file, next);
    problems = problems.filter((p) => p !== "none");
    choiceChanged();
    render();
    focus(`#${pickId(id)}`);
    announcer.say(chosenTitle(ids.length, locale));
  }

  /** Ticks the places a pasted list names; the places already ticked stay ticked. */
  function tickList(): void {
    if (!file) return;
    sync();
    status = undefined;
    listResult = undefined;
    const p: DropProblem | undefined = listLines(list).length === 0 ? "list-empty" : listTooLong(list) ? "list-long" : undefined;
    problems = p ? [p] : [];
    if (p) {
      render();
      focus("#fdp-errors");
      return;
    }
    const m = matchList(file, list);
    const next = chosenInOrder(file, [...ids, ...m.ids]);
    if (next.length !== ids.length) choiceChanged();
    ids = next;
    listResult = listResultText(m, locale);
    render();
    focus("#fdp-list-result");
    announcer.say(`${listResult} ${chosenTitle(ids.length, locale)}`);
  }

  function keep(id: string): void {
    if (!file) return;
    sync();
    const at = ids.indexOf(id);
    if (at < 0) return;
    ids = ids.filter((x) => x !== id);
    choiceChanged();
    render();
    // Focus goes to the next place's button, or the one before, or the list's heading.
    const next = ids[at] ?? ids[at - 1];
    focus(next === undefined ? "#fdp-chosen-title" : `#${keepId(next)}`);
    announcer.say(chosenTitle(ids.length, locale));
  }

  function remove(): void {
    if (!file) return;
    sync();
    status = undefined;
    const p = reasonProblem(reason);
    problems = [...(ids.length === 0 ? (["none"] as const) : []), ...(p ? [p] : [])];
    if (problems.length > 0) {
      outcome = undefined;
      render();
      focus("#fdp-errors");
      return;
    }
    outcome = make(file);
    render();
    focus("#fdp-result");
    announcer.say(`${removalSummary(outcome.removal, locale)} ${readBackText(outcome.check, locale)}`);
  }

  function make(f: StreetFile): DropOutcome {
    const removal = removePlaces(f, ids);
    const files = removalFiles(removal, today);
    return { removal, check: readBack(files.copy, removal), copy: files.copy, removed: files.removed, reason: reason.trim() };
  }

  function clear(): void {
    text = "";
    error = undefined;
    reset();
    status = t(C.cleared, locale);
    render();
    focus(`#${DROP_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const picked = input.files?.[0];
    if (!picked) return;
    sync();
    if (picked.size > MAX_FILE_BYTES) {
      error = "too-large";
      reset();
      status = undefined;
      render();
      focus("#fdp-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${DROP_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    reset();
    status = t(C.opened, locale);
    render();
    focus(`#${DROP_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fdp-file-form" && id !== "fdp-find-form" && id !== "fdp-list-form" && id !== "fdp-remove-form") return;
    e.preventDefault();
    if (id === "fdp-file-form") read();
    else if (id === "fdp-find-form") find();
    else if (id === "fdp-list-form") tickList();
    else remove();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fdp-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("button[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.dataset["action"];
    if (action === "fdp-clear") clear();
    else if (action === "fdp-keep") keep(el.dataset["id"] ?? "");
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || !root.contains(el)) return;
    if (el.id === DROP_OPEN_ID) void open(el);
    else if (el.dataset["action"] === "fdp-pick") pick(el);
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
      // Places are ordered again in the new language; the choice stays.
      if (file) {
        const r = readStreetFile(text, today, locale);
        if (r.ok) {
          file = r.file;
          ids = chosenInOrder(r.file, ids);
          if (found) found = findPlaces(r.file, query, locale);
          if (outcome) outcome = make(r.file);
        }
      }
      render();
    },
    file: () => file,
    chosen,
    outcome: () => outcome,
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
