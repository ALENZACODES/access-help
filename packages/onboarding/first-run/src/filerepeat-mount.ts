import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import { importNotes, type ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_REPEAT_COPY as C, checkText, foundSummary, removalSummary, tickedText } from "./filerepeat-copy";
import { readStreetFile } from "./filestreets";
import type { Note } from "./model";
import { DEFAULT_REPEATS, checkRepeats, findRepeats, groupId, removeRepeats, repeatFiles, sortGroups, type RepeatGroup, type RepeatOptions } from "./repeatnotes";
import { injectStyles } from "./styles";
import { ANY_DAY_ID, REPEAT_OPEN_ID, REPEAT_TEXT_ID, WITHIN_ID, renderFileRepeat, tickId, type RepeatOutcome } from "./views-filerepeat";

export interface FileRepeatOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileRepeatHandle {
  setLocale(locale: Locale): void;
  /** The notes read, in the file's order; empty before a file is read. */
  notes(): readonly Note[];
  /** The groups found, or undefined before a file is read. */
  groups(): readonly RepeatGroup[] | undefined;
  /** Ids of the groups ticked. */
  ticked(): readonly string[];
  outcome(): RepeatOutcome | undefined;
  destroy(): void;
}

/**
 * Mounts "Remove repeated notes". The file lives in memory only; nothing is
 * saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileRepeat(root: HTMLElement, opts: FileRepeatOptions): FileRepeatHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let notes: Note[] | undefined;
  let options: RepeatOptions = DEFAULT_REPEATS;
  let groups: RepeatGroup[] | undefined;
  let ticked: string[] = [];
  let noneTicked = false;
  let outcome: RepeatOutcome | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileRepeat({ text, error, loaded: notes !== undefined, options, groups, ticked, noneTicked, outcome, locale, today, statusMessage: status });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${REPEAT_TEXT_ID}`);
    if (box) text = box.value;
    const anyDay = root.querySelector<HTMLInputElement>(`#${ANY_DAY_ID}`);
    const within = root.querySelector<HTMLInputElement>(`#${WITHIN_ID}`);
    if (anyDay && within) options = { anyDay: anyDay.checked, within: within.checked };
  }

  /** Any change to what is taken out puts the copy away, so a copy never stands for another choice. */
  function choiceChanged(): void {
    if (outcome) {
      outcome = undefined;
      status = t(C.changed, locale);
      announcer.say(status);
    } else status = undefined;
  }

  /** Finds the groups for the options; every group starts ticked, for the person to look over. */
  function work(): void {
    if (!notes) return;
    groups = sortGroups(findRepeats(notes, options), locale);
    ticked = groups.map(groupId);
    noneTicked = false;
  }

  function reset(): void {
    notes = undefined;
    groups = undefined;
    ticked = [];
    noneTicked = false;
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
      focus("#frp-errors");
      return;
    }
    error = undefined;
    // The notes in the file's own order, so the copy keeps it.
    notes = importNotes(text).notes;
    work();
    render();
    focus("#frp-results");
    if (groups) announcer.say(foundSummary(groups, locale));
  }

  function find(): void {
    if (!notes) return;
    sync();
    choiceChanged();
    work();
    render();
    focus("#frp-results");
    if (groups) announcer.say(foundSummary(groups, locale));
  }

  function tick(input: HTMLInputElement): void {
    sync();
    const id = input.value;
    ticked = input.checked ? [...new Set([...ticked, id])] : ticked.filter((x) => x !== id);
    noneTicked = false;
    choiceChanged();
    render();
    const g = groups?.find((x) => groupId(x) === id);
    if (g) focus(`#${tickId(g)}`);
  }

  /** Ticks or unticks every group at once; focus stays on the button used. */
  function tickEvery(on: boolean): void {
    if (!groups) return;
    sync();
    const next = on ? groups.map(groupId) : [];
    if (next.length === ticked.length && next.every((id) => ticked.includes(id))) return;
    ticked = next;
    noneTicked = false;
    choiceChanged();
    render();
    focus(`[data-action="${on ? "frp-tick-all" : "frp-untick-all"}"]`);
    announcer.say(tickedText(groups.filter((g) => ticked.includes(groupId(g))), locale));
  }

  function remove(): void {
    if (!notes || !groups) return;
    sync();
    status = undefined;
    const chosen = groups.filter((g) => ticked.includes(groupId(g)));
    if (chosen.length === 0) {
      noneTicked = true;
      outcome = undefined;
      render();
      focus("#frp-errors");
      return;
    }
    noneTicked = false;
    outcome = make(notes, groups);
    render();
    focus("#frp-copy");
    announcer.say(`${removalSummary(outcome.removal, locale)} ${checkText(outcome.check, locale)}`);
  }

  function make(all: Note[], gs: RepeatGroup[]): RepeatOutcome {
    const removal = removeRepeats(
      all,
      gs,
      gs.filter((g) => ticked.includes(groupId(g))).map((g) => g.key),
    );
    const files = repeatFiles(removal, today);
    return { removal, check: checkRepeats(files.copy, all, removal), copy: files.copy, removed: files.removed };
  }

  function clear(): void {
    text = "";
    error = undefined;
    options = DEFAULT_REPEATS;
    reset();
    status = t(C.cleared, locale);
    render();
    focus(`#${REPEAT_TEXT_ID}`);
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
      focus("#frp-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${REPEAT_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    reset();
    status = t(C.opened, locale);
    render();
    focus(`#${REPEAT_TEXT_ID}`);
    announcer.say(status);
  }

  const FORMS: Record<string, () => void> = { "frp-file-form": read, "frp-options-form": find, "frp-remove-form": remove };

  function onSubmit(e: Event): void {
    const run = FORMS[(e.target as HTMLElement | null)?.id ?? ""];
    if (!run) return;
    e.preventDefault();
    run();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#frp-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("button[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.dataset["action"];
    if (action === "frp-clear") clear();
    else if (action === "frp-tick-all") tickEvery(true);
    else if (action === "frp-untick-all") tickEvery(false);
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || !root.contains(el)) return;
    if (el.id === REPEAT_OPEN_ID) void open(el);
    else if (el.dataset["action"] === "frp-tick") tick(el);
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
      // Groups are ordered again in the new language; the ticks and the copy stay.
      if (groups) groups = sortGroups(groups, locale);
      if (outcome && notes && groups) outcome = make(notes, groups);
      render();
    },
    notes: () => notes ?? [],
    groups: () => groups,
    ticked: () => ticked,
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
