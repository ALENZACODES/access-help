/**
 * Polite live region for status messages (WCAG 4.1.3) and heading focus for
 * view changes (WCAG 2.4.3).
 */
export interface Announcer {
  say(message: string): void;
  destroy(): void;
}

export function createAnnouncer(doc: Document): Announcer {
  const el = doc.createElement("div");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.setAttribute("aria-atomic", "true");
  el.className = "sr-only";
  doc.body.appendChild(el);
  return {
    say(message: string): void {
      el.textContent = "";
      // Set on a later tick so repeated identical messages are announced again.
      queueMicrotask(() => {
        el.textContent = message;
      });
    },
    destroy(): void {
      el.remove();
    },
  };
}

/**
 * Moves focus to the first h2 inside root. The heading gets tabindex="-1" so
 * it can take focus without joining the tab order. Returns the heading text.
 */
export function focusHeading(root: ParentNode): string | undefined {
  const h = root.querySelector<HTMLElement>("h2");
  if (!h) return undefined;
  h.setAttribute("tabindex", "-1");
  h.focus();
  return h.textContent ?? undefined;
}
