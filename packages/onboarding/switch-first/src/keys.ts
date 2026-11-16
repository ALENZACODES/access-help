/**
 * Roving focus for a group of options. Returns the new focused index, or
 * the same index for keys it does not handle. Tab is never intercepted, so
 * keyboard users are never trapped (WCAG 2.1.2).
 */
export function nextFocusIndex(current: number, count: number, key: string): number {
  if (count <= 0) return 0;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return current;
  }
}

/** Keys that activate the focused control. */
export function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
}
