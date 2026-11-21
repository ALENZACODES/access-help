import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import { collectCredits, type Copy, type Credits } from "./credits";
import type { ImportError } from "./exchange";
import { MAX_FILE_BYTES, readFileText, type FileReaderFn } from "./filecompare-mount";
import { FILE_CREDITS_COPY as C, creditsSummary, excludedSummary } from "./filecredits-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { injectStyles } from "./styles";
import {
  AREA_ID,
  CREDITS_OPEN_ID,
  CREDITS_TEXT_ID,
  areaProblem,
  copyFor,
  fileNotes,
  leaveOutId,
  leaveOutProblem,
  readLeaveOut,
  readPicks,
  renderFileCredits,
  type AreaError,
  type LeaveOutError,
} from "./views-filecredits";

export interface FileCreditsOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly today?: Date;
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
  readonly readFile?: FileReaderFn;
}

export interface FileCreditsHandle {
  setLocale(locale: Locale): void;
  file(): StreetFile | undefined;
  credits(): Credits | undefined;
  copy(): Copy | undefined;
  destroy(): void;
}

/**
 * Mounts "Credits for sharing a notes file". The file lives in memory only;
 * nothing is saved. It is its own entry point, loaded only when a person
 * opens it.
 */
export function mountFileCredits(root: HTMLElement, opts: FileCreditsOptions): FileCreditsHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const readFile = opts.readFile ?? readFileText;
  let locale: Locale = opts.locale;
  let text = "";
  let error: ImportError | "no-notes" | undefined;
  let file: StreetFile | undefined;
  /** The licences ticked on the page. */
  let checked: readonly string[] = [];
  /** The licences the copy on screen leaves out. */
  let leaveOut: readonly string[] = [];
  /** The spellings picked on the page, and the ones the copy on screen uses. */
  let picks: Readonly<Record<string, string>> = {};
  let appliedPicks: Readonly<Record<string, string>> = {};
  let leaveOutError: LeaveOutError | undefined;
  let area = "";
  let areaText = "";
  let areaError: AreaError | undefined;
  let copyMade = false;
  let status: string | undefined;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    root.innerHTML = renderFileCredits(ctx());
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function ctx() {
    return { text, error, file, checked, leaveOut, picks, appliedPicks, leaveOutError, area, areaText, areaError, copyMade, locale, today, statusMessage: status };
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  function sync(): void {
    const box = root.querySelector<HTMLTextAreaElement>(`#${CREDITS_TEXT_ID}`);
    if (box) text = box.value;
    const a = root.querySelector<HTMLInputElement>(`#${AREA_ID}`);
    if (a) areaText = a.value;
  }

  /** Limits the credits and the copy to places whose address holds the text typed. */
  function setArea(): void {
    if (!file) return;
    sync();
    status = undefined;
    areaError = areaProblem(file, areaText);
    if (areaError) {
      render();
      focus("#fcr-errors");
      return;
    }
    area = areaText.trim();
    // A copy made for other places no longer matches what is shown.
    copyMade = false;
    leaveOutError = undefined;
    render();
    focus("#fcr-summary");
    announcer.say(creditsSummary(collectCredits(fileNotes(file, area)), locale));
  }

  function read(): void {
    sync();
    status = undefined;
    checked = [];
    leaveOut = [];
    picks = {};
    appliedPicks = {};
    leaveOutError = undefined;
    area = "";
    areaText = "";
    areaError = undefined;
    copyMade = false;
    const r = readStreetFile(text, today, locale);
    if (!r.ok) {
      error = r.error;
      file = undefined;
      render();
      focus("#fcr-errors");
      return;
    }
    error = undefined;
    file = r.file;
    render();
    focus("#fcr-summary");
    announcer.say(creditsSummary(collectCredits(fileNotes(r.file, area)), locale));
  }

  function makeCopy(): void {
    if (!file) return;
    status = undefined;
    checked = readLeaveOut(root);
    picks = readPicks(root);
    leaveOut = checked;
    appliedPicks = picks;
    leaveOutError = leaveOutProblem(file, leaveOut, appliedPicks, area);
    copyMade = leaveOutError === undefined;
    render();
    if (leaveOutError) {
      focus("#fcr-errors");
      return;
    }
    focus("#fcr-copy");
    announcer.say(`${t(C.made, locale)} ${excludedSummary(copyFor(ctx(), file), locale)}`);
  }

  function clear(): void {
    text = "";
    error = undefined;
    file = undefined;
    checked = [];
    leaveOut = [];
    picks = {};
    appliedPicks = {};
    leaveOutError = undefined;
    area = "";
    areaText = "";
    areaError = undefined;
    copyMade = false;
    status = t(C.cleared, locale);
    render();
    focus(`#${CREDITS_TEXT_ID}`);
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
      focus("#fcr-errors");
      return;
    }
    let content: string;
    try {
      content = await readFile(picked);
    } catch {
      if (destroyed) return;
      status = t(C.readFailed, locale);
      render();
      focus(`#${CREDITS_OPEN_ID}`);
      announcer.say(status);
      return;
    }
    if (destroyed) return;
    text = content;
    error = undefined;
    file = undefined;
    status = t(C.opened, locale);
    render();
    focus(`#${CREDITS_TEXT_ID}`);
    announcer.say(status);
  }

  function onSubmit(e: Event): void {
    const id = (e.target as HTMLElement | null)?.id;
    if (id !== "fcr-file-form" && id !== "fcr-leave-form" && id !== "fcr-area-form") return;
    e.preventDefault();
    if (id === "fcr-file-form") read();
    else if (id === "fcr-area-form") setArea();
    else makeCopy();
  }

  function onClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    const link = target?.closest<HTMLAnchorElement>("#fcr-errors a");
    if (link && root.contains(link)) {
      e.preventDefault();
      const href = link.getAttribute("href") ?? "";
      if (href === `#${CREDITS_TEXT_ID}` || href === `#${leaveOutId(0)}` || href === `#${AREA_ID}`) focus(href);
      return;
    }
    const el = target?.closest<HTMLElement>("[data-action]");
    if (el && root.contains(el) && el.dataset["action"] === "fcr-clear") clear();
  }

  function onChange(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (el && root.contains(el) && el.id === CREDITS_OPEN_ID) void open(el);
  }

  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  render();

  return {
    setLocale(next: Locale): void {
      sync();
      if (file) {
        checked = readLeaveOut(root);
        picks = readPicks(root);
      }
      locale = next;
      status = undefined;
      render();
    },
    file: () => file,
    credits: () => (file ? collectCredits(fileNotes(file, area)) : undefined),
    copy: () => (file && copyMade ? copyFor(ctx(), file) : undefined),
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
