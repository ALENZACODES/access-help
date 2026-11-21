import type { Locale } from "../../switch-first/src/index";
import { createAnnouncer, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { t } from "./copy";
import { FILE_TOOLS_COPY as C, TOOL_IDS, TOOL_LOADERS, isToolId, openedToolText, toolTitle, type ToolHandle, type ToolId, type ToolLoader } from "./filetools";
import { button, esc } from "./html";
import { injectStyles } from "./styles";

export interface FileToolsOptions {
  readonly locale: Locale;
  readonly doc?: Document;
  readonly announcer?: Announcer;
  /** Called after every render of the list, and after a tool opens, with the App's DOM audit of the page. */
  readonly onAudit?: (violations: Violation[]) => void;
  /** Loaders to use instead of the real dynamic imports (for tests and hosts with their own loading). */
  readonly loaders?: Partial<Record<ToolId, ToolLoader>>;
}

export interface FileToolsHandle {
  setLocale(locale: Locale): void;
  /** The open tool, or undefined on the list. */
  openTool(): ToolId | undefined;
  /** Opens a tool as if its button was chosen. Resolves when it is open or has failed to load. */
  open(id: ToolId): Promise<void>;
  /** Goes back to the list. */
  back(): void;
  destroy(): void;
}

export function renderToolList(l: Locale, failed: ToolId | undefined, loading: ToolId | undefined): string {
  const items = TOOL_IDS.map((id) => {
    const c = C.tools[id];
    const note =
      failed === id
        ? `<p id="ft-failed-${id}" class="error">${esc(t(C.loadFailed, l))}</p>`
        : loading === id
          ? `<p class="hint">${esc(t(C.loading, l))}</p>`
          : "";
    return (
      `<li data-tool="${id}"><h3 id="ft-h-${id}">${esc(t(c.title, l))}</h3><p>${esc(t(c.summary, l))}</p>` +
      `<p>${button(t(c.open, l), { "data-action": "ft-open", "data-value": id, id: `ft-open-${id}`, ...(failed === id ? { "aria-describedby": `ft-failed-${id}` } : {}) })}</p>${note}</li>`
    );
  }).join("");
  return (
    `<div class="app filetools-app" lang="${l}"><section lang="${l}" aria-labelledby="ft-title" class="filetools">` +
    `<h2 id="ft-title" tabindex="-1">${esc(t(C.title, l))}</h2><p>${esc(t(C.intro, l))}</p>` +
    `<ul class="ft-tools" data-names-unique>${items}</ul></section></div>`
  );
}

export function renderToolFrame(l: Locale): string {
  return `<div class="app filetools-app" lang="${l}"><p>${button(t(C.back, l), { "data-action": "ft-back", class: "secondary", id: "ft-back" })}</p><div id="ft-tool"></div></div>`;
}

/**
 * Mounts the "Note files" page. The list is plain markup; a tool's code is
 * fetched only when its button is chosen, then mounted below a Back button,
 * sharing this page's live region.
 */
export function mountFileTools(root: HTMLElement, opts: FileToolsOptions): FileToolsHandle {
  const doc = opts.doc ?? root.ownerDocument;
  let locale: Locale = opts.locale;
  let active: { id: ToolId; handle: ToolHandle } | undefined;
  let loading: ToolId | undefined;
  let failed: ToolId | undefined;
  /** Bumped by every open and back, so a slow load that finishes late does nothing. */
  let generation = 0;
  let destroyed = false;

  injectStyles(doc);
  const ownAnnouncer = opts.announcer === undefined;
  const announcer: Announcer = opts.announcer ?? createAnnouncer(doc);
  const audit = (): void => opts.onAudit?.(auditDom(doc.body, { locale }));

  function renderList(): void {
    root.innerHTML = renderToolList(locale, failed, loading);
    audit();
  }

  function focus(selector: string): void {
    root.querySelector<HTMLElement>(selector)?.focus();
  }

  async function open(id: ToolId): Promise<void> {
    if (destroyed || active?.id === id) return;
    const mine = ++generation;
    active?.handle.destroy();
    active = undefined;
    loading = id;
    failed = undefined;
    renderList();
    focus(`#ft-open-${id}`);
    announcer.say(t(C.loading, locale));
    const loader = opts.loaders?.[id] ?? TOOL_LOADERS[id];
    let mount;
    try {
      mount = await loader();
    } catch {
      if (destroyed || mine !== generation) return;
      loading = undefined;
      failed = id;
      renderList();
      focus(`#ft-open-${id}`);
      announcer.say(t(C.loadFailed, locale));
      return;
    }
    if (destroyed || mine !== generation) return;
    loading = undefined;
    root.innerHTML = renderToolFrame(locale);
    const host = root.querySelector<HTMLElement>("#ft-tool") as HTMLElement;
    active = { id, handle: mount(host, { locale, announcer, ...(opts.onAudit ? { onAudit: opts.onAudit } : {}) }) };
    host.querySelector<HTMLElement>("h2")?.focus();
    announcer.say(openedToolText(id, locale));
  }

  function back(): void {
    generation++;
    const was = active?.id ?? loading;
    active?.handle.destroy();
    active = undefined;
    loading = undefined;
    failed = undefined;
    renderList();
    focus(was ? `#ft-open-${was}` : "#ft-title");
  }

  function onClick(e: Event): void {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
    if (!el || !root.contains(el)) return;
    const action = el.dataset["action"];
    if (action === "ft-open") {
      const id = el.dataset["value"];
      if (isToolId(id)) void open(id);
    } else if (action === "ft-back") back();
  }

  root.addEventListener("click", onClick);
  renderList();

  return {
    setLocale(next: Locale): void {
      locale = next;
      if (active) {
        const back = root.querySelector<HTMLElement>("#ft-back");
        if (back) back.textContent = t(C.back, locale);
        root.querySelector(".filetools-app")?.setAttribute("lang", locale);
        active.handle.setLocale(locale);
        audit();
      } else renderList();
    },
    openTool: () => active?.id,
    open,
    back,
    destroy(): void {
      destroyed = true;
      generation++;
      active?.handle.destroy();
      active = undefined;
      root.removeEventListener("click", onClick);
      if (ownAnnouncer) announcer.destroy();
      root.innerHTML = "";
    },
  };
}

/** The title of the open tool, for a host's page title. */
export function openToolTitle(handle: FileToolsHandle, l: Locale): string | undefined {
  const id = handle.openTool();
  return id ? toolTitle(id, l) : undefined;
}
