/** Small text helpers shared by search, annotation and rendering. */

const MARKS = /[̀-ͯ]/g;

/** Lower-case and strip accents. Apostrophes are kept. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(MARKS, '').toLowerCase();
}

/** fold() plus apostrophes removed and trimmed: used for substring search. */
export function normalise(s: string): string {
  return fold(s).replace(/[’']/g, '').trim();
}

/** Latin letters and digits only, accents stripped. Apostrophes split words. */
export function tokenise(s: string): string[] {
  return fold(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

export function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && ch !== '' && /[\p{L}\p{N}]/u.test(ch);
}
