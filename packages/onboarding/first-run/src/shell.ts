import {
  SCAN_INTERVALS_MS,
  attachRovingFocus,
  initialState,
  reduce,
  type FirstRunAction,
  type FirstRunState,
  type Locale,
  type MoveMode,
  type ScanMs,
} from "../../switch-first/src/index";
import { createAnnouncer, focusHeading, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { COPY, importDone, t } from "./copy";
import { applyDisplay, loadDisplay, saveDisplay, updateDisplay, type Display } from "./display";
import { exportNotes, importNotes, mergeNotes } from "./exchange";
import { FACT_KEYS, type FactKey, type Tri } from "./facts";
import { hasRequirement, withRequirement, type Requirement } from "./filter";
import {
  clearDraft,
  emptyForm,
  emptyUnknownDetails,
  loadDraft,
  saveDraft,
  toNote,
  validateForm,
  type FieldError,
  type FormValues,
} from "./form";
import { button, esc } from "./html";
import { applyLocale, nativeName, negotiateLocale, otherLocale } from "./locale";
import { LIMITS, type Note } from "./model";
import { addNote, loadNotes, removeNote, saveNotes } from "./outbox";
import type { OfflineStatus } from "./register";
import { hasNeeds, loadNeeds, saveNeeds } from "./needs";
import { findPlace, groupPlaces } from "./places";
import { hashToView, isRouteHash, viewToHash } from "./router";
import { loadPrefs, savePrefs, type KeyValueStore, type Prefs, type SaveResult } from "./store";
import { injectStyles } from "./styles";
import { renderCardGuide, renderHelpIndex, renderPathStep, renderSetup } from "./views";
import type { View } from "./view";
import { renderDisplay } from "./views-display";
import { renderForm } from "./views-form";
import { renderPlaceDetail, renderPlaceResults, renderPlan, renderPlaces, type PlacesContext } from "./views-places";
import { renderNotes, renderResults, type NotesContext } from "./views-notes";

export interface ShellOptions {
  readonly requestedLocales: readonly string[];
  readonly store?: KeyValueStore | undefined;
  readonly doc?: Document;
  readonly today?: Date;
  readonly onDone?: (prefs: Prefs) => void;
  /** Called after every render with the DOM audit result (see audit.ts). */
  readonly onAudit?: (violations: Violation[]) => void;
  /** Opt in to #/ addresses for each screen (back button and links work). Off by default. */
  readonly hashRouting?: boolean;
  readonly win?: Window;
}

export interface ShellHandle {
  getView(): View;
  getLocale(): Locale;
  getNotes(): readonly Note[];
  setOfflineStatus(status: OfflineStatus): void;
  destroy(): void;
}

interface State {
  view: View;
  locale: Locale;
  setup: FirstRunState;
  offline: OfflineStatus;
  display: Display;
  notes: Note[];
  droppedNotes: number;
  req: Requirement;
  query: string;
  pendingRemove: string | undefined;
  exportText: string | undefined;
  importText: string;
  importMessage: string | undefined;
  status: string | undefined;
  form: FormValues;
  errors: FieldError[];
  restored: boolean;
  needs: Requirement;
  usingSaved: boolean;
}

type FocusMode = "keep" | "heading" | "summary" | "none";

interface KeepTarget {
  readonly action: string;
  readonly value?: string | undefined;
  readonly key?: string | undefined;
}

const SWITCH_ACTIONS = new Set(["choose-mode", "set-scan", "next", "back", "skip"]);

function isMode(v: string | undefined): v is MoveMode {
  return v === "keyboard" || v === "switch" || v === "pointer";
}

function toScan(v: string | undefined): ScanMs | undefined {
  return SCAN_INTERVALS_MS.find((ms) => String(ms) === v);
}

function navSection(v: View): "setup" | "notes" | "help" | "display" {
  switch (v.kind) {
    case "setup":
      return "setup";
    case "notes":
    case "form":
    case "places":
    case "place":
    case "plan":
      return "notes";
    case "display":
      return "display";
    default:
      return "help";
  }
}

export function mountShell(root: HTMLElement, opts: ShellOptions): ShellHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const saved = loadPrefs(opts.store);
  const locale = negotiateLocale(opts.requestedLocales, saved.locale);

  let setup = initialState();
  if (saved.mode) setup = reduce(setup, { type: "choose-mode", mode: saved.mode });
  if (saved.scanMs) setup = reduce(setup, { type: "set-scan", ms: saved.scanMs });

  const loaded = loadNotes(opts.store);
  const state: State = {
    view: { kind: "setup" },
    locale,
    setup,
    offline: "pending",
    display: loadDisplay(opts.store),
    notes: loaded.notes,
    droppedNotes: loaded.dropped,
    req: {},
    query: "",
    pendingRemove: undefined,
    exportText: undefined,
    importText: "",
    importMessage: undefined,
    status: loaded.dropped > 0 ? t(COPY.notes.dropped, locale) : undefined,
    form: emptyForm(today),
    errors: [],
    restored: false,
    needs: loadNeeds(opts.store),
    usingSaved: false,
  };

  injectStyles(doc);
  applyDisplay(doc, state.display);
  const announcer: Announcer = createAnnouncer(doc);
  let detachers: Array<() => void> = [];

  const currentPrefs = (): Prefs => ({
    locale: state.locale,
    mode: state.setup.mode,
    scanMs: state.setup.scanMs,
  });
  const persist = (): SaveResult => savePrefs(opts.store, currentPrefs());

  const notesContext = (): NotesContext => ({
    notes: state.notes,
    req: state.req,
    query: state.query,
    locale: state.locale,
    today,
    pendingRemove: state.pendingRemove,
    exportText: state.exportText,
    importText: state.importText,
    importMessage: state.importMessage,
    statusMessage: state.status,
    hasSavedNeeds: hasNeeds(state.needs),
  });

  const placesContext = (): PlacesContext => ({
    places: groupPlaces(state.notes, state.locale),
    req: state.req,
    query: state.query,
    locale: state.locale,
    today,
    hasSavedNeeds: hasNeeds(state.needs),
    statusMessage: state.status,
  });

  function body(): string {
    const v = state.view;
    switch (v.kind) {
      case "setup":
        return renderSetup(state.setup, state.locale);
      case "help":
        return renderHelpIndex(state.locale);
      case "card":
        return renderCardGuide(state.locale, today);
      case "path":
        return renderPathStep(v.id, v.step, state.locale) ?? renderHelpIndex(state.locale);
      case "notes":
        return renderNotes(notesContext());
      case "form":
        return renderForm(state.form, state.errors, state.locale, state.restored);
      case "display":
        return renderDisplay(state.display, state.locale);
      case "places":
        return renderPlaces(placesContext());
      case "place":
        return renderPlaceDetail(findPlace(groupPlaces(state.notes, state.locale), v.id), state.locale, today);
      case "plan": {
        const req = state.usingSaved ? state.needs : state.req;
        return renderPlan(findPlace(groupPlaces(state.notes, state.locale), v.id), req, state.usingSaved, state.locale, today);
      }
    }
  }

  function chrome(inner: string): string {
    const l = state.locale;
    const other = otherLocale(l);
    const current = navSection(state.view);
    const navButton = (section: typeof current, label: string): string =>
      button(label, {
        "data-action": "view",
        "data-value": section,
        ...(current === section ? { "aria-current": "page" } : {}),
      });
    return (
      `<div class="app" lang="${l}">` +
      `<a class="skip-link" href="#main">${esc(t(COPY.skipLink, l))}</a>` +
      `<header><h1>${esc(t(COPY.appName, l))}</h1>` +
      button(nativeName(other), { "data-action": "set-locale", "data-value": other, class: "secondary" }, other) +
      `</header>` +
      `<nav aria-label="${esc(t(COPY.nav.label, l))}">` +
      navButton("setup", t(COPY.nav.setup, l)) +
      navButton("notes", t(COPY.nav.notes, l)) +
      navButton("help", t(COPY.nav.help, l)) +
      navButton("display", t(COPY.nav.display, l)) +
      `</nav>` +
      `<main id="main" tabindex="-1">${inner}</main>` +
      `<footer><p class="muted">${esc(t(COPY.offline[state.offline], l))}</p></footer>` +
      `</div>`
    );
  }

  function render(focus: FocusMode, keep?: KeepTarget): void {
    for (const d of detachers) d();
    detachers = [];
    applyLocale(doc, state.locale);
    root.innerHTML = chrome(body());
    const heading = root.querySelector("h2")?.textContent;
    doc.title = `${t(COPY.appName, state.locale)} – ${heading ?? ""}`.trim();

    for (const g of Array.from(root.querySelectorAll<HTMLElement>('[role="group"]'))) {
      detachers.push(attachRovingFocus(g));
    }

    if (focus === "summary") {
      const el = root.querySelector<HTMLElement>("#error-summary");
      if (el) el.focus();
      else focusHeading(root);
    } else if (focus === "keep" && keep) {
      let sel = `[data-action="${keep.action}"]`;
      if (keep.key !== undefined) sel += `[data-key="${keep.key}"]`;
      if (keep.value !== undefined) sel += `[data-value="${keep.value}"]`;
      const el = root.querySelector<HTMLElement>(sel);
      if (el) el.focus();
      else focusHeading(root);
    } else if (focus === "heading" || focus === "keep") {
      focusHeading(root);
    }
    opts.onAudit?.(auditDom(root, { locale: state.locale }));
  }

  const win = opts.win ?? doc.defaultView ?? undefined;
  let fromRoute = false;

  function go(view: View): void {
    state.view = view;
    if (opts.hashRouting && win && !fromRoute) {
      const h = viewToHash(view);
      if (win.location.hash !== h) win.history.pushState(null, "", h);
    }
    state.status = undefined;
    state.pendingRemove = undefined;
    state.exportText = undefined;
    state.importMessage = undefined;
    if (view.kind === "form") {
      const draft = loadDraft(opts.store, today);
      state.form = draft ?? emptyForm(today);
      state.restored = draft !== undefined;
      state.errors = [];
    }
    render("heading");
  }

  function dispatchSetup(action: FirstRunAction): void {
    state.setup = reduce(state.setup, action);
    persist();
  }

  /** Reads the form fields from the DOM. Unanswered details stay unknown. */
  function readForm(): FormValues {
    const form = root.querySelector<HTMLFormElement>("#note-form");
    if (!form) return state.form;
    const data = new FormData(form);
    const text = (k: string): string => {
      const v = data.get(k);
      return typeof v === "string" ? v : "";
    };
    const details = emptyUnknownDetails();
    for (const k of FACT_KEYS) {
      const v = text(`detail-${k}`);
      if (v === "yes" || v === "no") details[k as FactKey] = v as Tri;
    }
    return {
      placeName: text("placeName"),
      address: text("address"),
      details,
      observedOn: text("observedOn"),
      licence: text("licence"),
      note: text("note"),
    };
  }

  function refreshResults(): void {
    const el = root.querySelector("#results");
    if (el) el.innerHTML = state.view.kind === "places" ? renderPlaceResults(placesContext()) : renderResults(notesContext());
    opts.onAudit?.(auditDom(root, { locale: state.locale }));
  }

  function submitForm(): void {
    state.form = readForm();
    state.errors = validateForm(state.form, today);
    if (state.errors.length > 0) {
      state.restored = false;
      render("summary");
      return;
    }
    const res = addNote(opts.store, toNote(state.form, today));
    if (res.result === "full") {
      state.errors = [];
      state.view = { kind: "notes" };
      state.status = t(COPY.notes.full, state.locale);
      render("heading");
      return;
    }
    state.notes = res.notes;
    clearDraft(opts.store);
    state.form = emptyForm(today);
    state.view = { kind: "notes" };
    state.status = t(res.result === "saved" ? COPY.notes.added : COPY.save.unavailable, state.locale);
    render("heading");
    announcer.say(state.status);
  }

  function onClick(e: Event): void {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
    if (!target || !root.contains(target)) return;
    const action = target.dataset["action"] ?? "";
    const value = target.dataset["value"];
    const key = target.dataset["key"];

    if (SWITCH_ACTIONS.has(action)) {
      if (action === "choose-mode" && isMode(value)) dispatchSetup({ type: "choose-mode", mode: value });
      else if (action === "set-scan") {
        const ms = toScan(value);
        if (ms) dispatchSetup({ type: "set-scan", ms });
      } else if (action === "next" || action === "back" || action === "skip") {
        dispatchSetup({ type: action });
      }
      if (action === "choose-mode" || action === "set-scan") render("keep", { action, value });
      else render("heading");
      return;
    }

    switch (action) {
      case "done": {
        const result = persist();
        go({ kind: "help" });
        announcer.say(t(result === "saved" ? COPY.save.saved : COPY.save.unavailable, state.locale));
        opts.onDone?.(currentPrefs());
        return;
      }
      case "set-locale":
        if (value === "en" || value === "fr") {
          state.locale = value;
          persist();
          // The toggle now offers the other language, so keep focus by action only.
          render("keep", { action });
          announcer.say(t(COPY.language.changed, state.locale));
        }
        return;
      case "view":
        if (value === "setup") go({ kind: "setup" });
        else if (value === "help") go({ kind: "help" });
        else if (value === "notes") go({ kind: "notes" });
        else if (value === "display") go({ kind: "display" });
        else if (value === "places") go({ kind: "places" });
        return;
      case "open-place":
        if (value) go({ kind: "place", id: value });
        return;
      case "open-plan":
        if (value) {
          // Plan from the saved must-haves only when the filter is empty and some are saved.
          state.usingSaved = !hasRequirement(state.req) && hasNeeds(state.needs);
          go({ kind: "plan", id: value });
        }
        return;
      case "save-needs": {
        const r = saveNeeds(opts.store, state.req);
        if (r === "saved") state.needs = { ...state.req };
        state.status = t(r === "saved" ? COPY.needs.saved : COPY.save.unavailable, state.locale);
        render("keep", { action });
        announcer.say(state.status);
        return;
      }
      case "use-needs":
        state.req = { ...state.needs };
        state.status = t(COPY.needs.applied, state.locale);
        render("keep", { action });
        announcer.say(state.status);
        return;
      case "clear-needs":
        saveNeeds(opts.store, {});
        state.needs = {};
        state.status = t(COPY.needs.cleared, state.locale);
        render("heading");
        announcer.say(state.status);
        return;
      case "select-text": {
        const ta = root.querySelector<HTMLTextAreaElement>("#plan-text");
        if (ta) { ta.focus(); ta.select(); }
        return;
      }
      case "open-path":
        if (value) go({ kind: "path", id: value, step: 0 });
        return;
      case "path-step":
        if (state.view.kind === "path") {
          const n = Number(value);
          if (Number.isInteger(n) && n >= 0) state.view = { ...state.view, step: n };
        }
        render("heading");
        return;
      case "open-card":
        go({ kind: "card" });
        return;
      case "display":
        if (key === "scale" || key === "spacing" || key === "contrast" || key === "motion") {
          state.display = updateDisplay(state.display, key, value ?? "");
          applyDisplay(doc, state.display);
          saveDisplay(opts.store, state.display);
          render("keep", { action, key, value });
          announcer.say(t(COPY.display.changed, state.locale));
        }
        return;
      case "add-note":
      case "open-form":
        if (state.notes.length >= LIMITS.notes) {
          state.status = t(COPY.notes.full, state.locale);
          render("heading");
        } else go({ kind: "form" });
        return;
      case "cancel-form":
        go({ kind: "notes" });
        return;
      case "filter":
        if (key && (FACT_KEYS as readonly string[]).includes(key) && (value === "any" || value === "yes" || value === "no")) {
          state.req = withRequirement(state.req, key as FactKey, value);
          render("keep", { action, key, value });
        }
        return;
      case "remove-note":
        state.pendingRemove = value;
        render("keep", { action: "confirm-remove", value });
        return;
      case "cancel-remove":
        state.pendingRemove = undefined;
        render("keep", { action: "remove-note", value });
        return;
      case "confirm-remove": {
        if (!value) return;
        const res = removeNote(opts.store, value);
        state.notes = res.notes;
        state.pendingRemove = undefined;
        state.status = t(res.result === "saved" ? COPY.notes.removed : COPY.save.unavailable, state.locale);
        render("heading");
        announcer.say(state.status);
        return;
      }
      case "export-open":
        state.exportText = exportNotes(state.notes, today.toISOString().slice(0, 10));
        render("none");
        root.querySelector<HTMLElement>("#export-text")?.focus();
        return;
      case "import-run": {
        const ta = root.querySelector<HTMLTextAreaElement>("#import-text");
        state.importText = ta?.value ?? "";
        const r = importNotes(state.importText);
        const l = state.locale;
        if (r.error) {
          const msg = { empty: COPY.notes.importErrors.empty, "too-large": COPY.notes.importErrors.tooLarge, "not-json": COPY.notes.importErrors.notJson, "wrong-format": COPY.notes.importErrors.wrongFormat, "wrong-version": COPY.notes.importErrors.wrongVersion }[r.error];
          state.importMessage = t(msg, l);
        } else {
          const m = mergeNotes(state.notes, r.notes);
          const result = saveNotes(opts.store, m.notes);
          if (result === "saved") {
            state.notes = m.notes;
            state.importText = "";
            state.importMessage = importDone(m.added, m.skipped, r.rejected, l);
          } else {
            state.importMessage = t(COPY.notes.importFailedSave, l);
          }
        }
        render("none");
        root.querySelector<HTMLElement>("#import-message")?.setAttribute("tabindex", "-1");
        announcer.say(state.importMessage ?? "");
        return;
      }
    }
  }

  function onSubmit(e: Event): void {
    if ((e.target as HTMLElement | null)?.id !== "note-form") return;
    e.preventDefault();
    submitForm();
  }

  function onInput(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el) return;
    if (el.id === "q") {
      state.query = el.value;
      refreshResults();
    } else if (el.closest("#note-form")) {
      state.form = readForm();
      saveDraft(opts.store, state.form);
    }
  }

  root.addEventListener("click", onClick);
  root.addEventListener("submit", onSubmit);
  root.addEventListener("input", onInput);
  root.addEventListener("change", onInput);
  function onHash(): void {
    if (!win || !isRouteHash(win.location.hash)) return;
    const v = hashToView(win.location.hash);
    if (!v) return;
    fromRoute = true;
    try { go(v); } finally { fromRoute = false; }
  }
  if (opts.hashRouting && win) {
    win.addEventListener("popstate", onHash);
    win.addEventListener("hashchange", onHash);
  }
  render("none");
  if (opts.hashRouting && win) onHash();

  return {
    getView: () => state.view,
    getLocale: () => state.locale,
    getNotes: () => state.notes,
    setOfflineStatus(status: OfflineStatus): void {
      state.offline = status;
      const footer = root.querySelector("footer p");
      if (footer) footer.textContent = t(COPY.offline[status], state.locale);
    },
    destroy(): void {
      if (opts.hashRouting && win) {
        win.removeEventListener("popstate", onHash);
        win.removeEventListener("hashchange", onHash);
      }
      root.removeEventListener("click", onClick);
      root.removeEventListener("submit", onSubmit);
      root.removeEventListener("input", onInput);
      root.removeEventListener("change", onInput);
      for (const d of detachers) d();
      detachers = [];
      announcer.destroy();
      root.innerHTML = "";
    },
  };
}
