import { TERMS, type Lang } from './plainTerms';
import { escapeHtml, fold, isWordChar } from './text';

export type Segment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'term'; readonly text: string; readonly id: string };

/** Lower-case, accent-free and apostrophe-normalised, one output char per input char. */
function foldKeepLength(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    const ch = s.charAt(i);
    const f = fold(ch);
    const one = f.length === 1 ? f : ch.toLowerCase().charAt(0);
    out += one === "'" ? '’' : one;
  }
  return out;
}

interface Match {
  readonly start: number;
  readonly end: number;
  readonly id: string;
}

/**
 * Splits text into plain and glossary-term segments so help pages can link terms.
 * Whole words only, longest term first, case and accent insensitive.
 */
export function annotate(input: string, lang: Lang): readonly Segment[] {
  const text = input.normalize('NFC');
  const hay = foldKeepLength(text);
  const needles = TERMS.map((t) => ({ id: t.id, needle: foldKeepLength(t[lang].term.normalize('NFC')) })).sort(
    (a, b) => b.needle.length - a.needle.length,
  );
  const taken: boolean[] = new Array<boolean>(text.length).fill(false);
  const matches: Match[] = [];
  for (const { id, needle } of needles) {
    let from = 0;
    while (needle.length > 0) {
      const start = hay.indexOf(needle, from);
      if (start === -1) break;
      const end = start + needle.length;
      from = start + 1;
      if (isWordChar(text.charAt(start - 1)) || isWordChar(text.charAt(end))) continue;
      if (taken.slice(start, end).some(Boolean)) continue;
      taken.fill(true, start, end);
      matches.push({ start, end, id });
    }
  }
  matches.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) out.push({ kind: 'text', text: text.slice(cursor, m.start) });
    out.push({ kind: 'term', text: text.slice(m.start, m.end), id: m.id });
    cursor = m.end;
  }
  if (cursor < text.length) out.push({ kind: 'text', text: text.slice(cursor) });
  return out;
}

/** Escaped HTML with each term linked to its entry (#glossary-<id>). */
export function annotateToHtml(text: string, lang: Lang): string {
  return annotate(text, lang)
    .map((s) =>
      s.kind === 'text'
        ? escapeHtml(s.text)
        : `<a class="gl-term" href="#glossary-${escapeHtml(s.id)}">${escapeHtml(s.text)}</a>`,
    )
    .join('');
}
