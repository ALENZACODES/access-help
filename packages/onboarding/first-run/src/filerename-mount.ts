import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_RENAME_COPY as C, checkText, editTitle, foundText, type EditProblem } from "./filerename-copy";
import { readStreetFile } from "./filestreets";
import type { Note } from "./model";
import type { Place } from "./places";
import { applyRename, checkCopy, joinsWith, placeNameOf, placesOf, renameProblems, renamedFile, searchPlaces, type CopyCheck, type PlaceName, type RenameChange } from "./renameplace";
import { injectStyles } from "./styles";
import { ADDRESS_ID, JOIN_ID, NAME_ID, RENAME_OPEN_ID, RENAME_TEXT_ID, SEARCH_ID, pickId, renderFileRename } from "./views-filerename";

export interface FileRenameOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileRenameHandle {
  setLocale(locale: Locale): void;
  /** The notes as they are in the copy now; empty before a file is read. */
  notes(): readonly Note[];
  changes(): readonly RenameChange[];
  /** The place being renamed, or undefined. */
  editing(): Place | undefined;
  /** What reading the copy back found, or undefined before a change. */
  check(): CopyCheck | undefined;
  destroy(): void;
}

const EMPTY: PlaceName = { name: "", address: "" };

/**
 * Mounts "Rename a place". The file lives in memory only; nothing is saved.
 * It is its own entry point, loaded only when a person opens it.
 */
export function mountFileRename(root: HTMLElement, opts: FileRenameOptions): FileRenameHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let original: Note[] | undefined;
  let notes: Note[] = [];
  /** The notes before each change, so the last change can be taken back. */
  let history: Note[][] = [];
  let changes: RenameChange[] = [];
  let query = "";
  let found: { places: Place[]; total: number } | undefined;
  let picked: string | undefined;
  let editingId: string | undefined;
  let to: PlaceName = EMPTY;
  let allowJoin = false;
  let joins: PlaceName | undefined;
  let problems: EditProblem[] = [];
  let copy: { text: string; check: CopyCheck } | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  const places = (): Place[] => placesOf(notes, locale);
  const editing = (): Place | undefined => (editingId === undefined ? undefined : places().find((p) => p.id === editingId));

  function render(): void {
    root.innerHTML = renderFileRename({
      text,
      error,
      loaded: original !== undefined,
      query,
      found,
      places: places(),
      picked,
      editing: editing(),
      to,
      joins,
      allowJoin,
      problems,
      changes,
      copy,
      locale,
      today,
      statusMessage: status,
    });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${RENAME_TEXT_ID}`);
    if (box) text = box.value;
    const search = root.querySelector<HTMLInputElement>(`#${SEARCH_ID}`);
    if (search) query = search.value;
    const radio = root.querySelector<HTMLInputElement>('#frn-pick-form input[name="place"]:checked');
    if (root.querySelector("#frn-pick-form")) picked = radio?.value;
    const name = root.querySelector<HTMLInputElement>(`#${NAME_ID}`);
    const address = root.querySelector<HTMLInputElement>(`#${ADDRESS_ID}`);
    if (name && address) to = { name: name.value, address: address.value };
    const join = root.querySelector<HTMLInputElement>(`#${JOIN_ID}`);
    if (join) allowJoin = join.checked;
  }

  function search(): void {
    found = searchPlaces(places(), query, locale);
    if (picked !== undefined && !found.places.some((p) => p.id === picked)) picked = undefined;
  }

  function makeCopy(): void {
    if (!original || changes.length === 0) {
      copy = undefined;
      return;
    }
    const file = renamedFile(notes, today);
    copy = { text: file, check: checkCopy(file, original, changes, locale) };
  }

  function stopEditing(): void {
    editingId = undefined;
    to = EMPTY;
    allowJoin = false;
    joins = undefined;
    problems = [];
  }

  function reset(): void {
    original = undefined;
    notes = [];
    history = [];
    changes = [];
    query = "";
    found = undefined;
    picked = undefined;
    copy = undefined;
    stopEditing();
  }

  function read(): void {
    sync();
    status = undefined;
    const r = readStreetFile(text, today, locale);
    reset();
    if (!r.ok) {
      error = r.error;
      render();
      focus("#frn-errors");
      return;
    }
    error = undefined;
    original = r.file.places.flatMap((p) => p.notes);
    notes = original;
    // Every place is listed at once, so a small file needs no search.
    search();
    render();
    focus("#frn-find");
    if (found) announcer.say(foundText(found.places.length, found.total, locale));
  }

  function find(): void {
    sync();
    status = undefined;
    problems = [];
    search();
    render();
    focus("#frn-found");
    if (found) announcer.say(foundText(found.places.length, found.total, locale));
  }

  function choose(id?: string): void {
    sync();
    status = undefined;
    if (id !== undefined) picked = id;
    const place = places().find((p) => p.id === picked);
    if (!place) {
      problems = ["no-choice"];
      render();
      focus("#frn-errors");
      return;
    }
    editingId = place.id;
    to = placeNameOf(place);
    allowJoin = false;
    joins = undefined;
    problems = [];
    render();
    focus("#frn-edit");
    announcer.say(editTitle(placeNameOf(place), locale));
  }

  function save(): void {
    sync();
    status = undefined;
    const place = editing();
    if (!place || !original) return;
    const all = places();
    const other = joinsWith(all, place, to);
    joins = other ? placeNameOf(other) : undefined;
    if (!other) allowJoin = false;
    problems = renameProblems(all, place, to, allowJoin);
    if (problems.length > 0) {
      render();
      focus("#frn-errors");
      return;
    }
    const r = applyRename(notes, all, place, to);
    if (!r.ok) {
      status = t(C.failed, locale);
      render();
      focus("#frn-status");
      announcer.say(status);
      return;
    }
    history = [...history, notes];
    notes = r.notes;
    changes = [...changes, r.change];
    stopEditing();
    picked = undefined;
    search();
    makeCopy();
    status = t(C.saved, locale);
    render();
    focus(copy ? "#frn-copy" : "#frn-changes");
    announcer.say(`${status} ${copy ? checkText(copy.check, locale) : ""}`.trim());
  }

  function back(): void {
    sync();
    const id = editingId;
    stopEditing();
    status = undefined;
    picked = id;
    render();
    focus(id && root.querySelector(`#${pickId(id)}`) ? `#${pickId(id)}` : "#frn-find");
  }

  function undo(): void {
    const before = history.at(-1);
    if (!before) return;
    sync();
    history = history.slice(0, -1);
    notes = before;
    changes = changes.slice(0, -1);
    stopEditing();
    picked = undefined;
    search();
    makeCopy();
    status = t(C.undone, locale);
    render();
    focus("#frn-changes");
    announcer.say(status);
  }

  function clear(): void {
    text = "";
    error = undefined;
    reset();
    status = t(C.cleared, locale);
    render();
    focus(`#${RENAME_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      reset();
      status = undefined;
      render();
      focus("#frn-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${RENAME_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    reset();
    status = t(C.opened, locale);
    render();
    focus(`#${RENAME_TEXT_ID}`);
    announcer.say(status);
  }

  const FORMS: Record<string, () => void> = { "frn-file-form": read, "frn-find-form": find, "frn-pick-form": () => choose(), "frn-edit-form": save };

  function onSubmit(e: Event): void {
    const run = FORMS[(e.target as HTMLElement | null)?.id ?? ""];
    if (!run) return;
    e.preventDefault();
    run();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#frn-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("button[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.dataset["action"];
    if (action === "frn-clear") clear();
    else if (action === "frn-back") back();
    else if (action === "frn-undo") undo();
    else if (action === "frn-rename-place") choose(el.dataset["id"] ?? "");
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === RENAME_OPEN_ID) void open(el);
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
      // Places are ordered again in the new language; the changes stay.
      if (found) search();
      makeCopy();
      render();
    },
    notes: () => notes,
    changes: () => changes,
    editing,
    check: () => copy?.check,
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
