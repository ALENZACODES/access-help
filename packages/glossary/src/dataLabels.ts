/**
 * Data labels: fixed tokens that the App shows exactly as they are written in the data, in both
 * languages. They are identifiers, not sentences. One of them contains a stem that the wording
 * rules keep out of user copy, so the rules must look at text with these tokens set aside, the
 * same way the shared audit does. Nothing else is ever set aside.
 */
export const DATA_LABELS = ['PROTOTYPE-UNVERIFIED', 'SEEDED-OPEN-DATA'] as const;
export type DataLabel = (typeof DATA_LABELS)[number];

/** What a data label is replaced with before the wording rules run. A plain lower-case word that no rule flags. */
export const DATA_LABEL_MASK = 'label';

const LABEL_PATTERN = new RegExp(`(?<![\\p{L}\\p{N}-])(?:${DATA_LABELS.join('|')})(?![\\p{L}\\p{N}-])`, 'gu');

export function isDataLabel(value: unknown): value is DataLabel {
  return typeof value === 'string' && (DATA_LABELS as readonly string[]).includes(value);
}

/** The data labels in the text, in the order they appear. Only the exact upper-case token counts. */
export function dataLabelsIn(text: string): readonly DataLabel[] {
  return [...text.matchAll(LABEL_PATTERN)].map((m) => m[0] as DataLabel);
}

/**
 * The text with each data label replaced by a neutral word. A token that is part of a longer
 * word, or written in another case, is not a data label and is left for the rules to judge.
 */
export function maskDataLabels(text: string): string {
  return text.replace(LABEL_PATTERN, DATA_LABEL_MASK);
}

/** true when the text is nothing but one data label. */
export function isOnlyDataLabel(text: string): boolean {
  return isDataLabel(text.trim());
}
