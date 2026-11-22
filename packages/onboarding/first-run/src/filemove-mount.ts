import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_MOVE_COPY as C, checkText, foundText, notesTitle, targetTitle, type StepProblem } from "./filemove-copy";
import { readStreetFile } from "./filestreets";
import type { Note } from "./model";
import { MOVE_FOUND_MAX, applyMove, checkMoves, findPlaces, moveProblems, movedFile, placeNameOf, placeOfNote, placesOf, type MoveChange, type MoveCheck, type MoveTarget } from "./movenote";
import type { Place } from "./places";
import { injectStyles } from "./styles";
import { MOVE_OPEN_ID, MOVE_TEXT_ID, NEW_ADDRESS_ID, NEW_NAME_ID, SEARCH_ID, TARGET_SEARCH_ID, noteRadioId, placeRadioId, renderFileMove } from "./views-filemove";

export interface FileMoveOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileMoveHandle {
  setLocale(locale: Locale): void;
  /** The notes as they are in the copy now; empty before a file is read. */
  notes(): readonly Note[];
  changes(): readonly MoveChange[];
  /** The place whose notes are shown, or undefined. */
  place(): Place | undefined;
  /** The note being moved, or undefined. */
  note(): Note | undefined;
  check(): MoveCheck | undefined;
  destroy(): void;
}

/**
 * Mounts "Move a note to another place". The file lives in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileMove(root: HTMLElement, opts: FileMoveOptions): FileMoveHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let original: Note[] | undefined;
  let notes: Note[] = [];
  /** The notes before each move, so the last move can be taken back. */
  let history: Note[][] = [];
  let changes: MoveChange[] = [];
  let query = "";
  let found: { places: Place[]; total: number } | undefined;
  let pickedPlace: string | undefined;
  let placeId: string | undefined;
  let pickedNote: string | undefined;
  let noteId: string | undefined;
  let targetQuery = "";
  let targets: { places: Place[]; total: number } | undefined;
  let target: string | undefined;
  let newName = "";
  let newAddress = "";
  let problems: StepProblem[] = [];
  let copy: { text: string; check: MoveCheck } | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  const places = (): Place[] => placesOf(notes, locale);
  const place = (): Place | undefined => (placeId === undefined ? undefined : places().find((p) => p.id === placeId));
  const note = (): Note | undefined => (noteId === undefined ? undefined : notes.find((n) => n.id === noteId));

  function render(): void {
    root.innerHTML = renderFileMove({
      text,
      error,
      loaded: original !== undefined,
      query,
      found,
      pickedPlace,
      place: place(),
      pickedNote,
      note: note(),
      targetQuery,
      targets,
      target,
      newName,
      newAddress,
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

  const checked = (form: string, name: string): string | undefined =>
    root.querySelector<HTMLInputElement>(`#${form} input[name="${name}"]:checked`)?.value;

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${MOVE_TEXT_ID}`);
    if (box) text = box.value;
    const search = root.querySelector<HTMLInputElement>(`#${SEARCH_ID}`);
    if (search) query = search.value;
    if (root.querySelector("#fmv-place-form")) pickedPlace = checked("fmv-place-form", "place");
    if (root.querySelector("#fmv-note-form")) pickedNote = checked("fmv-note-form", "note");
    const tq = root.querySelector<HTMLInputElement>(`#${TARGET_SEARCH_ID}`);
    if (tq) targetQuery = tq.value;
    if (root.querySelector("#fmv-move-form")) target = checked("fmv-move-form", "target");
    const name = root.querySelector<HTMLInputElement>(`#${NEW_NAME_ID}`);
    const address = root.querySelector<HTMLInputElement>(`#${NEW_ADDRESS_ID}`);
    if (name && address) {
      newName = name.value;
      newAddress = address.value;
    }
  }

  function search(): void {
    found = findPlaces(places(), query, locale);
    if (pickedPlace !== undefined && !found.places.some((p) => p.id === pickedPlace)) pickedPlace = undefined;
  }

  /** Places the note can go to: every match but the place it is under now. */
  function searchTargets(): void {
    const n = note();
    const own = n ? placeOfNote(places(), n)?.id : undefined;
    const all = findPlaces(places(), targetQuery, locale, Number.MAX_SAFE_INTEGER).places.filter((p) => p.id !== own);
    targets = { places: all.slice(0, MOVE_FOUND_MAX), total: all.length };
    if (target !== undefined && target !== "new" && !targets.places.some((p) => p.id === target)) target = undefined;
  }

  function makeCopy(): void {
    if (!original || changes.length === 0) {
      copy = undefined;
      return;
    }
    const file = movedFile(notes, today);
    copy = { text: file, check: checkMoves(file, original, changes, locale) };
  }

  function stopTarget(): void {
    noteId = undefined;
    targetQuery = "";
    targets = undefined;
    target = undefined;
    newName = "";
    newAddress = "";
  }

  function reset(): void {
    original = undefined;
    notes = [];
    history = [];
    changes = [];
    query = "";
    found = undefined;
    pickedPlace = undefined;
    placeId = undefined;
    pickedNote = undefined;
    stopTarget();
    problems = [];
    copy = undefined;
  }

  function read(): void {
    sync();
    status = undefined;
    const r = readStreetFile(text, today, locale);
    reset();
    if (!r.ok) {
      error = r.error;
      render();
      focus("#fmv-errors");
      return;
    }
    error = undefined;
    original = r.file.places.flatMap((p) => p.notes);
    notes = original;
    search();
    render();
    focus("#fmv-find");
    if (found) announcer.say(foundText(found.places.length, found.total, locale));
  }

  function find(): void {
    sync();
    status = undefined;
    problems = [];
    search();
    render();
    focus("#fmv-found");
    if (found) announcer.say(foundText(found.places.length, found.total, locale));
  }

  function showNotes(): void {
    sync();
    status = undefined;
    const p = places().find((x) => x.id === pickedPlace);
    if (!p) {
      problems = ["no-place"];
      render();
      focus("#fmv-errors");
      return;
    }
    problems = [];
    placeId = p.id;
    pickedNote = undefined;
    render();
    focus("#fmv-notes");
    announcer.say(notesTitle(placeNameOf(p), p.notes.length, locale));
  }

  function chooseNote(): void {
    sync();
    status = undefined;
    const n = notes.find((x) => x.id === pickedNote);
    if (!n) {
      problems = ["no-note"];
      render();
      focus("#fmv-errors");
      return;
    }
    problems = [];
    stopTarget();
    noteId = n.id;
    searchTargets();
    render();
    focus("#fmv-target");
    announcer.say(targetTitle(n, locale));
  }

  function findTarget(): void {
    sync();
    status = undefined;
    problems = [];
    searchTargets();
    render();
    focus("#fmv-targets-found");
    if (targets) announcer.say(foundText(targets.places.length, targets.total, locale));
  }

  function save(): void {
    sync();
    status = undefined;
    const n = note();
    if (!n || !original) return;
    const all = places();
    const moveTo: MoveTarget | undefined = target === "new" ? { kind: "new", name: newName, address: newAddress } : target ? { kind: "place", placeId: target } : undefined;
    problems = moveProblems(all, n, moveTo);
    if (problems.length > 0 || !moveTo) {
      render();
      focus("#fmv-errors");
      return;
    }
    const r = applyMove(notes, all, n.id, moveTo);
    if (!r.ok) {
      status = t(C.failed, locale);
      render();
      focus("#fmv-status");
      announcer.say(status);
      return;
    }
    history = [...history, notes];
    notes = r.notes;
    changes = [...changes, r.change];
    stopTarget();
    placeId = undefined;
    pickedPlace = undefined;
    pickedNote = undefined;
    search();
    makeCopy();
    status = t(C.saved, locale);
    render();
    focus(copy ? "#fmv-copy" : "#fmv-changes");
    announcer.say(`${status} ${copy ? checkText(copy.check, locale) : ""}`.trim());
  }

  function backToPlaces(): void {
    sync();
    const id = placeId;
    placeId = undefined;
    pickedNote = undefined;
    problems = [];
    status = undefined;
    pickedPlace = id;
    render();
    focus(id && root.querySelector(`#${placeRadioId(id)}`) ? `#${placeRadioId(id)}` : "#fmv-find");
  }

  function backToNotes(): void {
    sync();
    const id = noteId;
    stopTarget();
    problems = [];
    status = undefined;
    pickedNote = id;
    render();
    focus(id ? `#${noteRadioId(id)}` : "#fmv-notes");
  }

  function undo(): void {
    const before = history.at(-1);
    if (!before) return;
    sync();
    history = history.slice(0, -1);
    notes = before;
    changes = changes.slice(0, -1);
    stopTarget();
    placeId = undefined;
    pickedPlace = undefined;
    pickedNote = undefined;
    problems = [];
    search();
    makeCopy();
    status = t(C.undone, locale);
    render();
    focus("#fmv-changes");
    announcer.say(status);
  }

  function clear(): void {
    text = "";
    error = undefined;
    reset();
    status = t(C.cleared, locale);
    render();
    focus(`#${MOVE_TEXT_ID}`);
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
      focus("#fmv-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${MOVE_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    reset();
    status = t(C.opened, locale);
    render();
    focus(`#${MOVE_TEXT_ID}`);
    announcer.say(status);
  }

  const FORMS: Record<string, () => void> = {
    "fmv-file-form": read,
    "fmv-find-form": find,
    "fmv-place-form": showNotes,
    "fmv-note-form": chooseNote,
    "fmv-target-find-form": findTarget,
    "fmv-move-form": save,
  };
  const BUTTONS: Record<string, () => void> = { "fmv-clear": clear, "fmv-back-places": backToPlaces, "fmv-back-notes": backToNotes, "fmv-undo": undo };

  function onSubmit(e: Event): void {
    const run = FORMS[(e.target as HTMLElement | null)?.id ?? ""];
    if (!run) return;
    e.preventDefault();
    run();
  }

  function onClick(e: Event): void {
    const node = e.target as HTMLElement | null;
    const link = node?.closest<HTMLAnchorElement>("#fmv-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = node?.closest<HTMLElement>("button[data-action]");
    if (!el || !root.contains(el)) return;
    BUTTONS[el.dataset["action"] ?? ""]?.();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === MOVE_OPEN_ID) void open(el);
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
      // Places are ordered again in the new language; the steps and the moves stay.
      if (found) search();
      if (targets) searchTargets();
      makeCopy();
      render();
    },
    notes: () => notes,
    changes: () => changes,
    place,
    note,
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
