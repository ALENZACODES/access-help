import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { readStreetFile, type StreetFile } from "./filestreets";
import { FILE_TIME_COPY as C } from "./filetime-copy";
import { dayProblem as findDayProblem, placesOnDay, type DayProblem, type FileOnDay } from "./recordasof";
import { fileTimeline, type Timeline } from "./recordtimeline";
import { inArea } from "./lookfirst";
import { injectStyles } from "./styles";
import { TIME_AREA_ID, TIME_DAY_ID, TIME_OPEN_ID, TIME_TEXT_ID, areaTooLong, readTimeForm, renderFileTime, type TimeChoice } from "./views-filetime";

export interface FileTimeOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileTimeHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  /** The timeline on screen, or undefined before one is shown. */
  timeline(): Timeline | undefined;
  /** The day on screen, or undefined before one is shown. */
  day(): FileOnDay | undefined;
  destroy(): void;
}

const START: TimeChoice = { step: "month", area: "" };

/**
 * Mounts "Records over time". The file lives in memory only; nothing is
 * saved. It is its own entry point, loaded only when a person opens it.
 */
export function mountFileTime(root: HTMLElement, opts: FileTimeOptions): FileTimeHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  let form: TimeChoice = START;
  let areaError = false;
  let shown: TimeChoice | undefined;
  let status: string | undefined;
  let dayText = "";
  let dayProblem: DayProblem | undefined;
  let dayShown: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileTime({ text, error, file, form, areaError, shown, locale, today, statusMessage: status, dayText, dayProblem, dayShown });
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${TIME_TEXT_ID}`);
    if (box) text = box.value;
    if (file) form = readTimeForm(root, form);
    const day = root.querySelector<HTMLInputElement>(`#${TIME_DAY_ID}`);
    if (day) dayText = day.value;
  }

  function resetDay(): void {
    dayText = "";
    dayProblem = undefined;
    dayShown = undefined;
  }

  function read(): void {
    sync();
    status = undefined;
    shown = undefined;
    areaError = false;
    resetDay();
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#ftm-errors");
      return;
    }
    error = undefined;
    file = r.file;
    // A file read is shown at once with the choices on the form; they can be changed after.
    present();
  }

  function show(): void {
    sync();
    present();
  }

  /** Shows the timeline for the choices held, without reading the page again. */
  function present(): void {
    if (!file) return;
    status = undefined;
    dayProblem = undefined;
    areaError = areaTooLong(form.area);
    if (areaError) {
      render();
      focus("#ftm-errors");
      return;
    }
    shown = { step: form.step, area: form.area.trim() };
    render();
    focus("#ftm-results");
    announcer.say(`${t(C.shown, locale)} ${root.querySelector("#ftm-summary")?.textContent ?? ""}`);
  }

  function showDay(): void {
    if (!file || !shown) return;
    sync();
    status = undefined;
    areaError = false;
    dayProblem = findDayProblem(dayText, today);
    if (dayProblem) {
      render();
      focus("#ftm-errors");
      return;
    }
    dayShown = dayText.trim();
    render();
    focus("#ftm-day-summary");
    announcer.say(`${t(C.day.shown, locale)} ${root.querySelector("#ftm-day-summary")?.textContent ?? ""}`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    form = START;
    areaError = false;
    shown = undefined;
    resetDay();
    status = t(C.cleared, locale);
    render();
    focus(`#${TIME_TEXT_ID}`);
    announcer.say(status);
  }

  async function open(input: HTMLInputElement): Promise<void> {
    const chosen = input.files?.[0];
    if (!chosen) return;
    sync();
    if (chosen.size > MAX_FILE_BYTES) {
      error = "too-large";
      file = undefined;
      shown = undefined;
      status = undefined;
      render();
      focus("#ftm-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(chosen);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${TIME_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    shown = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${TIME_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "ftm-file-form" && id !== "ftm-show-form" && id !== "ftm-day-form") return;
    e.preventDefault();
    if (id === "ftm-file-form") read();
    else if (id === "ftm-show-form") show();
    else showDay();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#ftm-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (href === `#${TIME_TEXT_ID}` || href === `#${TIME_AREA_ID}` || href === `#${TIME_DAY_ID}`) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "ftm-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === TIME_OPEN_ID) void open(el);
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
      render();
    },
    file: () => file,
    timeline: () => (file && shown ? fileTimeline(file, shown.step, shown.area, today) : undefined),
    day: () => {
      if (!file || !shown || dayShown === undefined) return undefined;
      const area = shown.area;
      return placesOnDay(
        file.places.filter((p) => inArea(p, area)),
        dayShown,
      );
    },
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

