import { nextFocusIndex } from "./keys";

/**
 * Adds arrow/Home/End focus movement to a group of buttons (for example the
 * option group rendered by `renderStep`). Tab is left alone, Enter and Space
 * keep their native button behaviour. Returns a function that removes the
 * listener.
 */
export function attachRovingFocus(group: HTMLElement): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    const items = Array.from(group.querySelectorAll<HTMLElement>("button"));
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (current < 0) return;
    const next = nextFocusIndex(current, items.length, e.key);
    if (next !== current) {
      e.preventDefault();
      items[next]?.focus();
    }
  };
  group.addEventListener("keydown", onKeyDown);
  return () => group.removeEventListener("keydown", onKeyDown);
}
