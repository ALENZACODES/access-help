import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import { importNotes, type ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_GAPS_COPY as C, checkText, filledSummary, planSummary, tickedText, type Box } from "./filegaps-copy";
import { readStreetFile } from "./filestreets";
import { DEFAULT_FILL, checkFill, fillCopy, fillPlan, filledFile, sinceOk, type FillOptions, type FillPlan } from "./fillgaps";
import type { Note } from "./model";
import { injectStyles } from "./styles";
import { OPEN_IDS, TEXT_IDS, readOptions, renderFileGaps, tickId, type GapsOutcome } from "./views-filegaps";

export interface FileGapsOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileGapsHandle {
  setLocale(locale: Locale): void;
  /** The plan for the last options without a problem, or undefined. */
  plan(): FillPlan | undefined;
  options(): FillOptions;
  /** Ids of the places ticked. */
  ticked(): readonly string[];
  outcome(): GapsOutcome | undefined;
  destroy(): void;
}

/**
 * Mounts "Fill gaps from another file". Both files live in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileGaps(root: HTMLElement, opts: FileGapsOptions): FileGapsHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  const texts: Record<Box, string> = { mine: "", other: "" };
  const errors: Record<Box, ImportError | "no-notes" | undefined> = { mine: undefined, other: undefined };
  let mine: Note[] | undefined;
  let other: Note[] | undefined;
  let form: FillOptions = DEFAULT_FILL;
  let noKeys = false;
  let badSince = false;
  let plan: FillPlan | undefined;
  let ticked: string[] = [];
  let noneTicked = false;
  let outcome: GapsOutcome | undefined;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileGaps({
      mineText: texts.mine,
      otherText: texts.other,
      mineError: errors.mine,
      otherError: errors.other,
      loaded: mine !== undefined && other !== undefined,
      form,
      noKeys,
      badSince,
      plan,
      ticked,
      noneTicked,
      outcome,
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
    for (const b of ["mine", "other"] as const) {
      const box = root.querySelector<HTMLTextAreaElement>(`#${TEXT_IDS[b]}`);
      if (box) texts[b] = box.value;
    }
    if (root.querySelector("#fgp-options-form")) form = readOptions(root);
  }

  /** Any change to what is added puts the copy away, so a copy never stands for another choice. */
  function choiceChanged(): void {
    if (outcome) {
      outcome = undefined;
      status = t(C.changed, locale);
      announcer.say(status);
    } else status = undefined;
  }

  /** Works out the plan for the options; every place starts ticked, for the person to look over. */
  function work(): void {
    if (!mine || !other) return;
    noKeys = form.keys.length === 0;
    badSince = !sinceOk(form.since);
    plan = noKeys || badSince ? undefined : fillPlan(mine, other, form, locale);
    ticked = plan ? plan.places.map((p) => p.place.id) : [];
    noneTicked = false;
  }

  function announcePlan(): void {
    if (!plan) {
      focus("#fgp-errors");
      return;
    }
    focus("#fgp-results");
    announcer.say(planSummary(plan, locale));
  }

  function reset(): void {
    mine = undefined;
    other = undefined;
    plan = undefined;
    ticked = [];
    noneTicked = false;
    noKeys = false;
    badSince = false;
    outcome = undefined;
  }

  /** Reads a box: its notes in the file's own order, or the problem with it. */
  function readBox(b: Box): Note[] | undefined {
    const r = readStreetFile(texts[b], today, locale);
    errors[b] = r.ok ? undefined : r.error;
    return r.ok ? importNotes(texts[b]).notes : undefined;
  }

  function read(): void {
    sync();
    status = undefined;
    reset();
    const a = readBox("mine");
    const b = readBox("other");
    if (!a || !b) {
      render();
      focus("#fgp-errors");
      return;
    }
    mine = a;
    other = b;
    work();
    render();
    announcePlan();
  }

  function find(): void {
    if (!mine || !other) return;
    sync();
    choiceChanged();
    work();
    render();
    announcePlan();
  }

  function tick(input: HTMLInputElement): void {
    sync();
    const id = input.value;
    ticked = input.checked ? [...new Set([...ticked, id])] : ticked.filter((x) => x !== id);
    noneTicked = false;
    choiceChanged();
    render();
    focus(`#${tickId(id)}`);
  }

  /** Ticks or unticks every place at once; focus stays on the button used. */
  function tickEvery(on: boolean): void {
    if (!plan) return;
    sync();
    const next = on ? plan.places.map((p) => p.place.id) : [];
    if (next.length === ticked.length && next.every((id) => ticked.includes(id))) return;
    ticked = next;
    noneTicked = false;
    choiceChanged();
    render();
    focus(`[data-action="${on ? "fgp-tick-all" : "fgp-untick-all"}"]`);
    announcer.say(tickedText(plan.places.filter((p) => ticked.includes(p.place.id)), locale));
  }

  function add(): void {
    if (!mine || !plan) return;
    sync();
    status = undefined;
    if (!plan.places.some((p) => ticked.includes(p.place.id))) {
      noneTicked = true;
      outcome = undefined;
      render();
      focus("#fgp-errors");
      return;
    }
    noneTicked = false;
    outcome = make(mine, plan);
    render();
    focus("#fgp-copy");
    announcer.say(outcome.check.ok ? `${filledSummary(outcome.filled, outcome.check, locale)} ${checkText(outcome.check, locale)}` : checkText(outcome.check, locale));
  }

  function make(m: Note[], p: FillPlan): GapsOutcome {
    const filled = fillCopy(m, p, ticked);
    const copy = filledFile(filled, today);
    return { filled, check: checkFill(copy, m, filled, locale), copy };
  }

  function clear(): void {
    texts.mine = "";
    texts.other = "";
    errors.mine = undefined;
    errors.other = undefined;
    form = DEFAULT_FILL;
    reset();
    status = t(C.cleared, locale);
    render();
    focus(`#${TEXT_IDS.mine}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement, b: Box): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      errors[b] = "too-large";
      reset();
      status = undefined;
      render();
      focus("#fgp-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${OPEN_IDS[b]}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    texts[b] = content;
    errors[b] = undefined;
    reset();
    status = t(C.opened, locale);
    render();
    focus(`#${TEXT_IDS[b]}`);
    announcer.say(status);
  }

  const FORMS: Record<string, () => void> = { "fgp-file-form": read, "fgp-options-form": find, "fgp-add-form": add };

  function onSubmit(e: Event): void {
    const run = FORMS[(e.target as HTMLElement | null)?.id ?? ""];
    if (!run) return;
    e.preventDefault();
    run();
  }

  function onClick(e: Event): void {
    const node = e.target as HTMLElement | null;
    const link = node?.closest<HTMLAnchorElement>("#fgp-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("#") && root.querySelector(href)) focus(href);
      return;
    }
    const el = node?.closest<HTMLElement>("button[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.dataset["action"];
    if (action === "fgp-clear") clear();
    else if (action === "fgp-tick-all") tickEvery(true);
    else if (action === "fgp-untick-all") tickEvery(false);
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el || !root.contains(el)) return;
    const b = el.dataset["box"];
    if (b === "mine" || b === "other") void open(el, b);
    else if (el.dataset["action"] === "fgp-tick") tick(el);
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
      // Places are ordered again in the new language; the ticks and the copy stay.
      if (mine && other && plan) {
        const keep = ticked;
        plan = fillPlan(mine, other, form, locale);
        ticked = keep.filter((id) => plan?.places.some((p) => p.place.id === id));
        if (outcome) outcome = make(mine, plan);
      }
      render();
    },
    plan: () => plan,
    options: () => form,
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
