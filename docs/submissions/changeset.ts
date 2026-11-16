/**
 * Reading a changeset number a person types or pastes. A changeset number is the
 * number OpenStreetMap gives an edit after the person submits it. The App never
 * contacts OpenStreetMap, so it can only check that the text is a plausible number.
 * It cannot tell whether such a changeset exists.
 */
export const MAX_CHANGESET_DIGITS = 12;

export type ChangesetFailure = 'empty' | 'not-a-number' | 'too-long' | 'zero';

export type ChangesetResult = { ok: true; id: string } | { ok: false; code: ChangesetFailure };

/**
 * Accepts "123456", "#123456", "changeset 123456", "changeset: 123456" and an address
 * whose path ends in /changeset/123456. Leading zeros are dropped. Anything else,
 * including a decimal, a negative number or two numbers, is rejected.
 */
export function parseChangesetId(input: string): ChangesetResult {
  const text = input.trim();
  if (text === '') return { ok: false, code: 'empty' };
  const fromPath = /(?:^|[\s/])changeset\/(\d+)(?:[/?#]\S*)?$/i.exec(text);
  const labelled = /^(?:changeset|lot|#)\s*[:#]?\s*(\d+)$/i.exec(text);
  const digits = fromPath?.[1] ?? labelled?.[1] ?? (/^\d+$/.test(text) ? text : null);
  if (digits === null) return { ok: false, code: 'not-a-number' };
  const trimmed = digits.replace(/^0+/, '');
  if (trimmed === '') return { ok: false, code: 'zero' };
  if (trimmed.length > MAX_CHANGESET_DIGITS) return { ok: false, code: 'too-long' };
  return { ok: true, id: trimmed };
}

/** Path part of the changeset page, for a person to look up themselves. It is not an address the App opens. */
export function changesetPath(id: string): string {
  return `/changeset/${id}`;
}

export function isChangesetId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,11}$/.test(value);
}
