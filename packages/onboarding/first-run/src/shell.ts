import {
  attachRovingFocus,
  initialState,
  reduce,
  type FirstRunAction,
  type FirstRunState,
  type Locale,
  type MoveMode,
  type ScanMs,
  SCAN_INTERVALS_MS,
} from "../../switch-first/src/index";
import { createAnnouncer, focusHeading, type Announcer } from "./announce";
import { COPY, t } from "./copy";
import { button, esc } from "./html";
import { applyLocale, negotiateLocale, nativeName, otherLocale } from "./locale";
import type { OfflineStatus } from "./register";
import {
  loadPrefs,
  savePrefs,
  type KeyValueStore,
  type Prefs,
  type SaveResult,
} from "./store";
import { injectStyles } from "./styles";
import { renderCardGuide, renderHelpIndex, renderPathStep, renderSetup } from "./views";

export type View =
  | { readonly kind: "setup" }
  | { readonly kind: "help" }
  | { readonly kind: "path"; readonly id: string; readonly step: number }
  | { readonly kind: "card" };

export interface ShellOptions {
  readonly requestedLocales: readonly string[];
  readonly store?: KeyValueStore | undefined;
  readonly doc?: Document;
  readonly today?: Date;
  readonly onDone?: (prefs: Prefs) => void;
}

export interface ShellHandle {
  getView(): View;
  getLocale(): Locale;
  setOfflineStatus(status: OfflineStatus): void;
  destroy(): void;
}

interface State {
  view: View;
  locale: Locale;
  setup: FirstRunState;
  offline: OfflineStatus;
}

type FocusMode = "keep" | "heading" | "none";

interface KeepTarget {
  readonly action: string;
  readonly value: string | undefined;
}

const SWITCH_ACTIONS = new Set(["choose-mode", "set-scan", "next", "back", "skip"]);

function isMode(v: string | undefined): v is MoveMode {
  return v === "keyboard" || v === "switch" || v === "pointer";
}

function toScan(v: string | undefined): ScanMs | undefined {
  return SCAN_INTERVALS_MS.find((ms) => String(ms) === v);
}

export function mountShell(root: HTMLElement, opts: ShellOptions): ShellHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const saved = loadPrefs(opts.store);
  const locale = negotiateLocale(opts.requestedLocales, saved.locale);

  let setup = initialState();
  if (saved.mode) setup = reduce(setup, { type: "choose-mode", mode: saved.mode });
  if (saved.scanMs) setup = reduce(setup, { type: "set-scan", ms: saved.scanMs });

  const state: State = { view: { kind: "setup" }, locale, setup, offline: "pending" };

  injectStyles(doc);
  const announcer: Announcer = createAnnouncer(doc);
  let detachers: Array<() => void> = [];

  const currentPrefs = (): Prefs => ({
    locale: state.locale,
    mode: state.setup.mode,
    scanMs: state.setup.scanMs,
  });

  const persist = (): SaveResult => savePrefs(opts.store, currentPrefs());

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
    }
  }

  function chrome(inner: string): string {
    const l = state.locale;
    const other = otherLocale(l);
    const setupCurrent = state.view.kind === "setup";
    return (
      `<div class="app" lang="${l}">` +
      `<a class="skip-link" href="#main">${esc(t(COPY.skipLink, l))}</a>` +
      `<header><h1>${esc(t(COPY.appName, l))}</h1>` +
      button(nativeName(other), { "data-action": "set-locale", "data-value": other, "class": "secondary" }, other) +
      `</header>` +
      `<nav aria-label="${esc(t(COPY.nav.label, l))}">` +
      button(t(COPY.nav.setup, l), { "data-action": "view", "data-value": "setup", ...(setupCurrent ? { "aria-current": "page" } : {}) }) +
      button(t(COPY.nav.help, l), { "data-action": "view", "data-value": "help", ...(!setupCurrent ? { "aria-current": "page" } : {}) }) +
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

    if (focus === "keep" && keep) {
      const sel =
        `[data-action="${keep.action}"]` + (keep.value !== undefined ? `[data-value="${keep.value}"]` : "");
      const el = root.querySelector<HTMLElement>(sel);
      if (el) {
        el.focus();
        return;
      }
      focusHeading(root);
    } else if (focus === "heading" || focus === "keep") {
      focusHeading(root);
    }
  }

  function dispatchSetup(action: FirstRunAction): void {
    state.setup = reduce(state.setup, action);
    persist();
  }

  function onClick(e: Event): void {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
    if (!target || !root.contains(target)) return;
    const action = target.dataset["action"] ?? "";
    const value = target.dataset["value"];

    if (SWITCH_ACTIONS.has(action)) {
      if (action === "choose-mode" && isMode(value)) dispatchSetup({ type: "choose-mode", mode: value });
      else if (action === "set-scan") {
        const ms = toScan(value);
        if (ms) dispatchSetup({ type: "set-scan", ms });
      } else if (action === "next" || action === "back" || action === "skip") {
        dispatchSetup({ type: action });
      }
      render(action === "choose-mode" || action === "set-scan" ? "keep" : "heading", { action, value });
      return;
    }

    switch (action) {
      case "done": {
        const result = persist();
        state.view = { kind: "help" };
        render("heading");
        announcer.say(t(result === "saved" ? COPY.save.saved : COPY.save.unavailable, state.locale));
        opts.onDone?.(currentPrefs());
        return;
      }
      case "set-locale":
        if (value === "en" || value === "fr") {
          state.locale = value;
          persist();
          // The toggle now offers the other language, so keep focus by action only.
          render("keep", { action, value: undefined });
          announcer.say(t(COPY.language.changed, state.locale));
        }
        return;
      case "view":
        if (value === "setup") state.view = { kind: "setup" };
        else if (value === "help") state.view = { kind: "help" };
        render("heading");
        return;
      case "open-path":
        if (value) state.view = { kind: "path", id: value, step: 0 };
        render("heading");
        return;
      case "path-step":
        if (state.view.kind === "path") {
          const n = Number(value);
          if (Number.isInteger(n) && n >= 0) state.view = { ...state.view, step: n };
        }
        render("heading");
        return;
      case "open-card":
        state.view = { kind: "card" };
        render("heading");
        return;
    }
  }

  root.addEventListener("click", onClick);
  render("none");

  return {
    getView: () => state.view,
    getLocale: () => state.locale,
    setOfflineStatus(status: OfflineStatus): void {
      state.offline = status;
      const footer = root.querySelector("footer p");
      if (footer) footer.textContent = t(COPY.offline[status], state.locale);
    },
    destroy(): void {
      root.removeEventListener("click", onClick);
      for (const d of detachers) d();
      detachers = [];
      announcer.destroy();
      root.innerHTML = "";
    },
  };
}
