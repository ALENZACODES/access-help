/**
 * Which panels of the finder are open. The finder redraws the whole page when the records or the
 * language change, and a redraw used to close every panel a person had opened. The finder now
 * remembers the open panels for the visit and draws them open again, so a person who is editing
 * records inside a panel is not sent back to a closed page after each step.
 *
 * A panel is known by the first class name of its details element. Only a class that is used by
 * exactly one details element in the page is remembered: a class shared by many blocks, such as
 * the record list of each place, cannot say which block was meant.
 */
export interface PanelToggle {
  readonly name: string;
  readonly open: boolean;
}

const PANEL_NAME = /^gl-[a-z0-9-]+$/;
export const MAX_OPEN_PANELS = 60;

/** Reads a toggle event's target. Null unless it is a details element whose first class is a finder class. */
export function panelFromTarget(target: unknown): PanelToggle | null {
  if (typeof target !== 'object' || target === null) return null;
  const t = target as { tagName?: unknown; className?: unknown; open?: unknown };
  if (typeof t.tagName !== 'string' || t.tagName.toLowerCase() !== 'details') return null;
  if (typeof t.className !== 'string' || typeof t.open !== 'boolean') return null;
  const name = t.className.trim().split(/\s+/)[0] ?? '';
  return PANEL_NAME.test(name) ? { name, open: t.open } : null;
}

/** The set after one panel was opened or closed. The same set is returned when nothing changes. */
export function togglePanel(open: ReadonlySet<string>, toggle: PanelToggle): ReadonlySet<string> {
  if (!PANEL_NAME.test(toggle.name) || open.has(toggle.name) === toggle.open) return open;
  const next = new Set(open);
  if (toggle.open) {
    if (next.size >= MAX_OPEN_PANELS) return open;
    next.add(toggle.name);
  } else {
    next.delete(toggle.name);
  }
  return next;
}

const DETAILS_TAG = /<details class="(gl-[a-z0-9-]+)"( open)?>/g;

/** The class names used by exactly one details element in the markup. */
export function uniquePanels(html: string): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(DETAILS_TAG)) counts.set(m[1] ?? '', (counts.get(m[1] ?? '') ?? 0) + 1);
  return new Set([...counts.entries()].filter(([, n]) => n === 1).map(([name]) => name));
}

/**
 * The markup with each remembered panel drawn open. A panel that the page itself draws open
 * stays open. Panels whose class is shared, and everything else, are left exactly as they are.
 */
export function applyOpenPanels(html: string, open: ReadonlySet<string>): string {
  if (open.size === 0) return html;
  const unique = uniquePanels(html);
  return html.replace(DETAILS_TAG, (tag, name: string, already: string | undefined) =>
    already === undefined && open.has(name) && unique.has(name) ? `<details class="${name}" open>` : tag,
  );
}

/** The panels that are open in the markup, among those with a class of their own. */
export function openPanelsIn(html: string): readonly string[] {
  const unique = uniquePanels(html);
  return [...html.matchAll(DETAILS_TAG)].filter((m) => m[2] !== undefined && unique.has(m[1] ?? '')).map((m) => m[1] ?? '');
}
