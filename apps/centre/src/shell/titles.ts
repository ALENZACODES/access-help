/**
 * Page titles and focus after a route change.
 * A single-page app does not reload, so a screen reader hears nothing when the
 * screen changes unless the title changes and focus moves to the new content.
 */
export type Language = "en" | "fr";

const MAX_HEADING = 80;

/** "Saved places — the App". The heading is the page's own h1, so the title always matches the screen. */
export function documentTitle(heading: string | null, language: Language): string {
  const app = language === "fr" ? "l’application" : "the App";
  const clean = (heading ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_HEADING);
  return clean === "" ? app : `${clean} — ${app}`;
}

export interface Navigation {
  /** null on the first render of the page. */
  previousPath: string | null;
  path: string;
  hash: string;
}

/**
 * Focus moves to the main region when the path changes. It does not move on the first load,
 * when only the language changed, or when the link points to a place inside the same page.
 */
export function shouldMoveFocus(nav: Navigation): boolean {
  if (nav.previousPath === null) return false;
  if (nav.previousPath === nav.path) return false;
  return nav.hash === "";
}
