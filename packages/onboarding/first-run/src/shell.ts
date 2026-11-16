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
import { COPY, importDone, resultsCount, restoreDone, t } from "./copy";
import { queryWords, searchHelp } from "./search";
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
import {
  clearPlaceChecklist,
  loadChecklist,
  pruneChecklist,
  saveChecklist,
  setAnswer,
  setAsked,
  type AnswerError,
  type Checklist,
} from "./checklist";
import { pruneCompare, toggleCompare, canCompare } from "./compare";
import { hasNeeds, loadNeeds, saveNeeds } from "./needs";
import { exportLists, importLists, mergeLists } from "./backup";
import { buildPlan, planToText } from "./plan";
import { findPlace, groupPlaces } from "./places";
import { formForPlace } from "./report";
import { hashToView, isRouteHash, viewToHash } from "./router";
import { loadShortlist, pruneShortlist, saveShortlist, toggleShortlist } from "./shortlist";
import { isSortKey, type SortKey } from "./sort";
import { loadPrefs, savePrefs, type KeyValueStore, type Prefs, type SaveResult } from "./store";
import { injectStyles } from "./styles";
import { renderCardGuide, renderPathStep, renderSetup } from "./views";
import type { View } from "./view";
import { renderDisplay } from "./views-display";
import { renderCompare } from "./views-compare";
import { collectSources, onlySource, sourceNames } from "./sources";
import { renderSources } from "./views-sources";
import { renderSummary } from "./views-summary";
import { renderArticle, renderHelpBody, renderHelpHome } from "./views-help";
import { renderForm } from "./views-form";
import { renderClearArea, renderPlaceDetail, renderPlaceResults, renderPlan, renderPlaces, type PlanContext, type PlacesContext } from "./views-places";
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
  shortlist: string[];
  shortlistOnly: boolean;
  sort: SortKey;
  compareIds: string[];
  checklist: Checklist;
  answerError: { key: string; code: AnswerError } | undefined;
  confirmClear: boolean;
  /** Where to go after the "add a note" form, when it was opened from a place. */
  afterForm: View | undefined;
  prefill: FormValues | undefined;
  helpQuery: string;
  /** The help item last opened, so going back can put focus on it again. */
  helpReturn: KeepTarget | undefined;
  backupText: string | undefined;
  restoreText: string;
  restoreMessage: string | undefined;
  summarySource: string | undefined;
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
    case "compare":
    case "sources":
    case "summary":
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
    shortlist: loadShortlist(opts.store),
    shortlistOnly: false,
    sort: "name",
    compareIds: [],
    checklist: loadChecklist(opts.store),
    answerError: undefined,
    confirmClear: false,
    afterForm: undefined,
    prefill: undefined,
    helpQuery: "",
    helpReturn: undefined,
    backupText: undefined,
    restoreText: "",
    restoreMessage: undefined,
    summarySource: undefined,
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
    shortlist: state.shortlist,
    shortlistOnly: state.shortlistOnly,
    sort: state.sort,
    compareIds: state.compareIds,
    backupText: state.backupText,
    restoreText: state.restoreText,
    restoreMessage: state.restoreMessage,
  });

  const planContext = (id: string): PlanContext => ({
    place: findPlace(groupPlaces(state.notes, state.locale), id),
    req: state.usingSaved ? state.needs : state.req,
    usingSaved: state.usingSaved,
    locale: state.locale,
    today,
    checklist: state.checklist,
    answerError: state.answerError,
    confirmClear: state.confirmClear,
    statusMessage: state.status,
  });

  /** Keeps saved lists pointing at places that still exist. */
  function pruneSaved(): void {
    const places = groupPlaces(state.notes, state.locale);
    const sl = pruneShortlist(state.shortlist, places);
    if (sl.length !== state.shortlist.length) {
      state.shortlist = sl;
      saveShortlist(opts.store, sl);
    }
    state.compareIds = pruneCompare(state.compareIds, places);
    const cl = pruneChecklist(state.checklist, places);
    if (Object.keys(cl).length !== Object.keys(state.checklist).length) {
      state.checklist = cl;
      saveChecklist(opts.store, cl);
    }
  }

  function body(): string {
    const v = state.view;
    switch (v.kind) {
      case "setup":
        return renderSetup(state.setup, state.locale);
      case "help":
        return renderHelpHome({ locale: state.locale, mode: state.setup.mode, query: state.helpQuery });
      case "article":
        return renderArticle(v.id, state.locale);
      case "card":
        return renderCardGuide(state.locale, today);
      case "path":
        return renderPathStep(v.id, v.step, state.locale) ?? renderHelpHome({ locale: state.locale, mode: state.setup.mode, query: state.helpQuery });
      case "notes":
        return renderNotes(notesContext());
      case "form":
        return renderForm(state.form, state.errors, state.locale, state.restored);
      case "display":
        return renderDisplay(state.display, state.locale);
      case "places":
        return renderPlaces(placesContext());
      case "place":
        return renderPlaceDetail(findPlace(groupPlaces(state.notes, state.locale), v.id), state.locale, today, state.shortlist.includes(v.id));
      case "plan":
        return renderPlan(planContext(v.id));
      case "sources":
        return renderSources(state.notes, state.locale, today);
      case "summary": {
        const names = sourceNames(collectSources(state.notes, today));
        const source = state.summarySource !== undefined && names.includes(state.summarySource) ? state.summarySource : undefined;
        const notes = source === undefined ? state.notes : onlySource(state.notes, source);
        return renderSummary({ places: groupPlaces(notes, state.locale), source, sourceNames: names, locale: state.locale, today });
      }
      case "compare": {
        const places = groupPlaces(state.notes, state.locale);
        const chosen = v.ids.map((id) => findPlace(places, id));
        const found = chosen.filter((p): p is NonNullable<typeof p> => p !== undefined);
        return renderCompare(found, state.usingSaved ? state.needs : state.req, state.locale, today, found.length !== chosen.length);
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
    pruneSaved();
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

  function go(view: View, status?: string): void {
    state.view = view;
    state.answerError = undefined;
    state.confirmClear = false;
    state.backupText = undefined;
    state.restoreMessage = undefined;
    if (view.kind !== "summary") state.summarySource = undefined;
    if (view.kind !== "form") state.afterForm = undefined;
    if (opts.hashRouting && win && !fromRoute) {
      const h = viewToHash(view);
      if (win.location.hash !== h) win.history.pushState(null, "", h);
    }
    state.status = status;
    state.pendingRemove = undefined;
    state.exportText = undefined;
    state.importMessage = undefined;
    if (view.kind === "form") {
      const draft = state.prefill ? undefined : loadDraft(opts.store, today);
      state.form = state.prefill ?? draft ?? emptyForm(today);
      state.restored = draft !== undefined;
      state.prefill = undefined;
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

  /** Rewrites the text to copy after a tick or an answer, without redrawing the page. */
  function refreshPlanText(placeId: string): void {
    const ta = root.querySelector<HTMLTextAreaElement>("#plan-text");
    const ctx = planContext(placeId);
    if (!ta || !ctx.place) return;
    ta.value = planToText(ctx.place, buildPlan(ctx.place, ctx.req), state.locale, today, state.checklist);
    const area = root.querySelector("#clear-area");
    if (area) area.innerHTML = renderClearArea(state.checklist, placeId, state.confirmClear, state.locale);
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
    const next: View = state.afterForm ?? { kind: "notes" };
    if (res.result === "full") {
      state.errors = [];
      go(next, t(COPY.notes.full, state.locale));
      return;
    }
    state.notes = res.notes;
    clearDraft(opts.store);
    state.form = emptyForm(today);
    const message = t(res.result === "saved" ? COPY.notes.added : COPY.save.unavailable, state.locale);
    go(next, message);
    announcer.say(message);
  }

  /** A contents link inside an article: move focus to the section heading, not only the scroll position. */
  function onJump(e: Event): boolean {
    const link = (e.target as HTMLElement | null)?.closest<HTMLElement>("a[data-jump]");
    if (!link || !root.contains(link)) return false;
    e.preventDefault();
    const heading = doc.getElementById(link.dataset["jump"] ?? "");
    if (heading) {
      heading.focus();
      heading.scrollIntoView?.({ block: "start" });
    }
    return true;
  }

  function onClick(e: Event): void {
    if (onJump(e)) return;
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
        else if (value === "help") {
          const from = state.view.kind;
          go({ kind: "help" });
          // Back from a guide: put focus on the guide that was opened, not at the top.
          if (state.helpReturn && (from === "article" || from === "path" || from === "card")) {
            const { action: a, value: v } = state.helpReturn;
            const el = root.querySelector<HTMLElement>(`[data-action="${a}"]${v === undefined ? "" : `[data-value="${v}"]`}`);
            el?.focus();
          }
        }
        else if (value === "notes") go({ kind: "notes" });
        else if (value === "display") go({ kind: "display" });
        else if (value === "places") go({ kind: "places" });
        else if (value === "sources") go({ kind: "sources" });
        else if (value === "summary") go({ kind: "summary" });
        return;
      case "summary-source":
        state.summarySource = value ? value : undefined;
        render("keep", { action, value: value ?? "" });
        announcer.say(state.summarySource === undefined ? t(COPY.summary.all, state.locale) : state.summarySource);
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
      case "backup-open":
        state.backupText = exportLists({ needs: state.needs, shortlist: state.shortlist, checklist: state.checklist }, today.toISOString().slice(0, 10));
        render("keep", { action: "backup-hide" });
        return;
      case "backup-hide":
        state.backupText = undefined;
        render("keep", { action: "backup-open" });
        return;
      case "backup-restore": {
        const ta = root.querySelector<HTMLTextAreaElement>("#restore-text");
        state.restoreText = ta?.value ?? "";
        const r = importLists(state.restoreText);
        const l = state.locale;
        if (r.error) {
          const msg = { empty: COPY.lists.errors.empty, "too-large": COPY.lists.errors.tooLarge, "not-json": COPY.lists.errors.notJson, "wrong-format": COPY.lists.errors.wrongFormat, "wrong-version": COPY.lists.errors.wrongVersion }[r.error];
          state.restoreMessage = t(msg, l);
        } else {
          // Only places that exist on this device are taken, so the counts below are what was really added.
          const places = groupPlaces(state.notes, state.locale);
          const incoming = { ...r.lists, shortlist: pruneShortlist(r.lists.shortlist, places), checklist: pruneChecklist(r.lists.checklist, places) };
          const m = mergeLists({ needs: state.needs, shortlist: state.shortlist, checklist: state.checklist }, incoming);
          const results = [saveNeeds(opts.store, m.lists.needs), saveShortlist(opts.store, m.lists.shortlist), saveChecklist(opts.store, m.lists.checklist)];
          if (results.every((x) => x === "saved")) {
            state.needs = m.lists.needs;
            state.shortlist = [...m.lists.shortlist];
            state.checklist = m.lists.checklist;
            state.restoreText = "";
            state.restoreMessage = restoreDone(m.added, l);
          } else {
            state.restoreMessage = t(COPY.save.unavailable, l);
          }
        }
        render("none");
        announcer.say(state.restoreMessage ?? "");
        return;
      }
      case "toggle-shortlist": {
        if (!value) return;
        const r = toggleShortlist(state.shortlist, value);
        if (r.result === "invalid") return;
        state.shortlist = r.list;
        const saved = r.result === "full" ? "saved" : saveShortlist(opts.store, r.list);
        const msg = r.result === "full" ? COPY.shortlist.full : saved === "unavailable" ? COPY.save.unavailable : r.result === "added" ? COPY.shortlist.added : COPY.shortlist.removed;
        state.status = t(msg, state.locale);
        render("keep", { action, value });
        announcer.say(state.status);
        return;
      }
      case "shortlist-only":
        state.shortlistOnly = !state.shortlistOnly;
        render("keep", { action });
        return;
      case "toggle-compare": {
        if (!value) return;
        const r = toggleCompare(state.compareIds, value);
        state.compareIds = r.ids;
        state.status = r.result === "full" ? t(COPY.compare.full, state.locale) : undefined;
        render("keep", { action, value });
        if (state.status) announcer.say(state.status);
        return;
      }
      case "open-compare":
        if (canCompare(state.compareIds)) {
          state.usingSaved = !hasRequirement(state.req) && hasNeeds(state.needs);
          go({ kind: "compare", ids: [...state.compareIds] });
        }
        return;
      case "compare-clear":
        state.compareIds = [];
        render("heading");
        return;
      case "report-place": {
        const place = findPlace(groupPlaces(state.notes, state.locale), value ?? "");
        if (!place) return;
        if (state.notes.length >= LIMITS.notes) {
          state.status = t(COPY.notes.full, state.locale);
          render("heading");
          return;
        }
        state.prefill = formForPlace(place, today);
        const back = state.view;
        go({ kind: "form" });
        state.afterForm = back.kind === "form" ? undefined : back;
        return;
      }
      case "asked": {
        if (!value || !key || !(FACT_KEYS as readonly string[]).includes(key)) return;
        state.checklist = setAsked(state.checklist, value, key as FactKey, (target as HTMLInputElement).checked);
        saveChecklist(opts.store, state.checklist);
        refreshPlanText(value);
        return;
      }
      case "clear-checklist":
        state.confirmClear = true;
        render("keep", { action: "confirm-clear-checklist", value });
        return;
      case "cancel-clear-checklist":
        state.confirmClear = false;
        render("keep", { action: "clear-checklist", value });
        return;
      case "confirm-clear-checklist":
        if (!value) return;
        state.checklist = clearPlaceChecklist(state.checklist, value);
        saveChecklist(opts.store, state.checklist);
        state.confirmClear = false;
        state.status = t(COPY.checklist.cleared, state.locale);
        render("heading");
        announcer.say(state.status);
        return;
      case "copy-plan": {
        const ta = root.querySelector<HTMLTextAreaElement>("#plan-text");
        if (!ta) return;
        const clip = win?.navigator?.clipboard;
        const fail = (): void => {
          ta.focus();
          ta.select();
          state.status = t(COPY.copy.failed, state.locale);
          announcer.say(state.status);
        };
        if (!clip) return fail();
        clip.writeText(ta.value).then(
          () => announcer.say(t(COPY.copy.done, state.locale)),
          fail,
        );
        return;
      }
      case "select-text": {
        const ta = root.querySelector<HTMLTextAreaElement>("#plan-text");
        if (ta) { ta.focus(); ta.select(); }
        return;
      }
      case "open-path":
        if (value) {
          state.helpReturn = { action, value };
          go({ kind: "path", id: value, step: 0 });
        }
        return;
      case "open-article":
        if (value) {
          state.helpReturn = { action, value };
          go({ kind: "article", id: value });
        }
        return;
      case "help-clear":
        state.helpQuery = "";
        render("none");
        root.querySelector<HTMLElement>("#help-q")?.focus();
        return;
      case "path-step":
        if (state.view.kind === "path") {
          const n = Number(value);
          if (Number.isInteger(n) && n >= 0) state.view = { ...state.view, step: n };
        }
        render("heading");
        return;
      case "open-card":
        state.helpReturn = { action };
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
        go(state.afterForm ?? { kind: "notes" });
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
    } else if (el.id === "help-q") {
      state.helpQuery = el.value;
      const body = root.querySelector("#help-body");
      if (body) body.innerHTML = renderHelpBody({ locale: state.locale, mode: state.setup.mode, query: state.helpQuery });
      if (queryWords(state.helpQuery).length > 0) announcer.say(resultsCount(searchHelp(state.helpQuery, state.locale).length, state.locale));
      opts.onAudit?.(auditDom(root, { locale: state.locale }));
    } else if (el.id === "sort") {
      if (isSortKey(el.value)) {
        state.sort = el.value;
        refreshResults();
      }
    } else if (e.type === "change" && el.dataset["action"] === "answer") {
      const placeId = el.dataset["value"];
      const key = el.dataset["key"];
      if (!placeId || !key || !(FACT_KEYS as readonly string[]).includes(key)) return;
      const r = setAnswer(state.checklist, placeId, key as FactKey, el.value);
      if (!r.ok) {
        state.answerError = { key, code: r.error };
        render("keep", { action: "answer", key, value: placeId });
        announcer.say(t(COPY.checklist.error[r.error], state.locale));
        return;
      }
      state.answerError = undefined;
      state.checklist = r.list;
      const saved = saveChecklist(opts.store, r.list);
      refreshPlanText(placeId);
      announcer.say(t(saved === "saved" ? COPY.checklist.saved : COPY.save.unavailable, state.locale));
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
