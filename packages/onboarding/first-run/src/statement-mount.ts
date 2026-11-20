import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import { FACT_KEYS } from "./facts";
import type { IdMaker } from "./form";
import type { Note } from "./model";
import { addNote, loadNotes } from "./outbox";
import { knownPlace } from "./statement-check";
import {
  cleanStatementForm,
  emptyStatementForm,
  readStatement,
  statementNote,
  validateStatement,
  type Finding,
  type StatementError,
  type StatementForm,
  type StatementSource,
} from "./statement";
import { STATEMENT_COPY, foundText, savedText, statementError } from "./statement-copy";
import type { KeyValueStore } from "./store";
import { injectStyles } from "./styles";
import { FIELD_ID, renderStatement } from "./views-statement";

export interface StatementOptions {
  readonly locale: Locale;
  /** Where notes are kept: the same store as the first-run shell, so a saved note shows up there. */
  readonly store?: KeyValueStore | undefined;
  readonly doc?: Document;
  readonly today?: Date;
  readonly makeId?: IdMaker;
  /** Called with each note once it is saved on this device. */
  readonly onSaved?: (note: Note) => void;
  /** A place to start with, and where the text comes from (the place's page, or its written reply). */
  readonly initial?: { readonly placeName?: string; readonly address?: string; readonly from?: StatementSource };
  /** The host's own announcer, so there is one live region on the page. One is made when none is given. */
  readonly announcer?: Announcer;
  /** Called after every render with the App's DOM audit of the whole host page. */
  readonly onAudit?: (violations: Violation[]) => void;
}

export interface StatementHandle {
  setLocale(locale: Locale): void;
  /** The values on screen now, for callers that keep their own copy. */
  form(): StatementForm;
  destroy(): void;
}

/**
 * Mounts "Read a place's accessibility page" into an element. It works on its
 * own, so any page can host it, and saves notes through the same rules and
 * the same store as the add-a-note form.
 */
export function mountStatementReader(root: HTMLElement, opts: StatementOptions): StatementHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  let locale: Locale = opts.locale;
  const start = (): StatementForm => ({
    ...emptyStatementForm(today),
    placeName: opts.initial?.placeName ?? "",
    address: opts.initial?.address ?? "",
    from: opts.initial?.from ?? "page",
  });
  let form: StatementForm = start();
  let findings: readonly Finding[] | undefined;
  let errors: readonly StatementError[] = [];
  let status: string | undefined;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);

  function render(): void {
    const known = findings === undefined ? undefined : knownPlace(loadNotes(opts.store).notes, form.placeName, form.address, locale);
    root.innerHTML = renderStatement({ form, findings, errors, locale, statusMessage: status, known });
    // The reader lives inside a host page, so the page-level rules (one main, a skip link, the page language) are the page's: audit the whole page.
    opts.onAudit?.(auditDom(doc.body, { locale }));
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  /** The values from the page. Answers not shown yet stay what they were (UNKNOWN to begin with). */
  function readForm(): StatementForm {
    const el = root.querySelector<HTMLFormElement>("#statement-form");
    if (!el) return form;
    const data = new FormData(el);
    const text = (k: string): string | undefined => {
      const v = data.get(k);
      return typeof v === "string" ? v : undefined;
    };
    const answers: Record<string, string> = { ...form.answers };
    for (const k of FACT_KEYS) {
      const v = text(`answer-${k}`);
      if (v !== undefined) answers[k] = v;
    }
    return cleanStatementForm(
      {
        placeName: text("placeName") ?? form.placeName,
        address: text("address") ?? form.address,
        text: text("text") ?? form.text,
        pageUrl: text("pageUrl") ?? form.pageUrl,
        observedOn: text("observedOn") ?? form.observedOn,
        licence: text("licence") ?? form.licence,
        from: form.from,
        answers,
      },
      today,
    );
  }

  function readText(): void {
    form = readForm();
    status = undefined;
    if (form.text.trim() === "") {
      findings = undefined;
      errors = [{ field: "text", code: "text-required" }];
      render();
      focus("#st-text");
      announcer.say(statementError("text-required", locale));
      return;
    }
    errors = [];
    findings = readStatement(form.text);
    render();
    focus("#st-findings");
    announcer.say(foundText(findings.filter((f) => f.mentions.length > 0).length, findings.length, locale));
  }

  function save(): void {
    form = readForm();
    errors = validateStatement(form, today, locale);
    if (errors.length > 0) {
      status = undefined;
      render();
      focus("#error-summary");
      return;
    }
    const note = statementNote(form, today, locale, opts.makeId);
    const res = addNote(opts.store, note);
    if (res.result !== "saved") {
      status = t(res.result === "full" ? STATEMENT_COPY.full : STATEMENT_COPY.unavailable, locale);
      render();
      focus("#st-title");
      announcer.say(status);
      return;
    }
    opts.onSaved?.(note);
    // The licence and date are often the same for the next page: keep them, clear the rest.
    form = { ...emptyStatementForm(today), observedOn: form.observedOn, licence: form.licence, from: form.from };
    findings = undefined;
    status = savedText(note.placeName, locale);
    render();
    focus("#st-title");
    announcer.say(status);
  }

  function clear(): void {
    form = { ...emptyStatementForm(today), from: form.from };
    findings = undefined;
    errors = [];
    status = t(STATEMENT_COPY.cleared, locale);
    render();
    focus("#st-text");
    announcer.say(status);
  }

  function onClick(e: Event): void {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
    if (!target || !root.contains(target)) return;
    const action = target.dataset["action"];
    if (action === "statement-read") readText();
    else if (action === "statement-clear") clear();
  }

  function onSubmit(e: Event): void {
    if ((e.target as HTMLElement | null)?.id !== "statement-form") return;
    e.preventDefault();
    save();
  }

  /** Links in the error summary move focus to the field, not only the scroll position. */
  function onSummaryLink(e: Event): void {
    const link = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>("#error-summary a");
    if (!link || !root.contains(link)) return;
    e.preventDefault();
    const id = (link.getAttribute("href") ?? "").slice(1);
    if (Object.values(FIELD_ID).includes(id)) focus(`#${id}`);
  }

  function onAnyClick(e: Event): void {
    onSummaryLink(e);
    onClick(e);
  }

  root.addEventListener("click", onAnyClick);
  root.addEventListener("submit", onSubmit);
  render();

  return {
    setLocale(next: Locale): void {
      form = readForm();
      locale = next;
      render();
    },
    form: () => readForm(),
    destroy(): void {
      root.removeEventListener("click", onAnyClick);
      root.removeEventListener("submit", onSubmit);
      if (ownAnnouncer) announcer.destroy();
      root.innerHTML = "";
    },
  };
}
