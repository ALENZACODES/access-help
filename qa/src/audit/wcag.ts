/**
 * WCAG 2.2 success criteria at Level A and AA. An audit failure must name one
 * of these. 4.1.1 Parsing is obsolete in WCAG 2.2 and is not listed.
 */
export const WCAG22_AA_CRITERIA = [
  "1.1.1", "1.2.1", "1.2.2", "1.2.3", "1.2.4", "1.2.5",
  "1.3.1", "1.3.2", "1.3.3", "1.3.4", "1.3.5",
  "1.4.1", "1.4.2", "1.4.3", "1.4.4", "1.4.5", "1.4.10", "1.4.11", "1.4.12", "1.4.13",
  "2.1.1", "2.1.2", "2.1.4",
  "2.2.1", "2.2.2",
  "2.3.1",
  "2.4.1", "2.4.2", "2.4.3", "2.4.4", "2.4.5", "2.4.6", "2.4.7", "2.4.11",
  "2.5.1", "2.5.2", "2.5.3", "2.5.4", "2.5.7", "2.5.8",
  "3.1.1", "3.1.2",
  "3.2.1", "3.2.2", "3.2.3", "3.2.4", "3.2.6",
  "3.3.1", "3.3.2", "3.3.3", "3.3.4", "3.3.7", "3.3.8",
  "4.1.2", "4.1.3",
] as const;

export type WcagCriterion = (typeof WCAG22_AA_CRITERIA)[number];

export function isWcagAaCriterion(value: string): value is WcagCriterion {
  return (WCAG22_AA_CRITERIA as readonly string[]).includes(value);
}

/** WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA: 24 by 24 CSS pixels. */
export const TARGET_MIN_PX = 24;
/** WCAG 2.2 SC 2.5.5 Target Size (Enhanced), Level AAA. Reported, not required. */
export const TARGET_ENHANCED_PX = 44;
