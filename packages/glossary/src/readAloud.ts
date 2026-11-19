import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { mergeClaims, statusLabel } from './status';
import { escapeHtml } from './text';

/**
 * A place as plain sentences for a speech voice: no symbols, no table, one short sentence at a time.
 * It reports exactly what the sources say, and says "unknown" where they say nothing.
 * The page does not make the sound itself. The host's `onSpeak` does (for example a speech synthesiser).
 */
export const MAX_SPEECH_CHUNK = 220;

export const SAY_UI = {
  en: {
    say: 'Read aloud',
    sayLabel: (name: string): string => `Read aloud: ${name}`,
    source: (name: string): string => `Source: ${name}.`,
    noFeatures: 'No features were chosen.',
    unknownCount: (n: number): string => (n === 1 ? '1 feature is unknown.' : `${n} features are unknown.`),
  },
  fr: {
    say: 'Lire à voix haute',
    sayLabel: (name: string): string => `Lire à voix haute\u00a0: ${name}`,
    source: (name: string): string => `Source : ${name}.`,
    noFeatures: 'Aucune caractéristique n’a été choisie.',
    unknownCount: (n: number): string => (n === 1 ? '1 caractéristique est UNKNOWN.' : `${n} caractéristiques sont UNKNOWN.`),
  },
} as const;

const clean = (text: string): string => text.replace(/\s+/g, ' ').trim();
const end = (text: string): string => (/[.!?]$/.test(text) ? text : `${text}.`);

/** One sentence each: the name, then each chosen feature with its status and source, then how many are unknown. */
export function speechSentences(place: Place, termIds: readonly string[], lang: Lang): readonly string[] {
  const ui = SAY_UI[lang];
  const colon = lang === 'fr' ? ' :' : ':';
  const out: string[] = [end(clean(place.name))];
  if (termIds.length === 0) {
    out.push(ui.noFeatures);
  } else {
    let unknown = 0;
    for (const c of mergeClaims(termIds, place.claims)) {
      const label = lookupTerm(c.termId, lang).term;
      out.push(end(`${label}${colon} ${statusLabel(c.status, lang, c.conflict).toLowerCase()}`));
      if (c.status === 'unknown') unknown += 1;
      else if (c.provenance !== undefined) out.push(ui.source(clean(c.provenance.source)));
    }
    if (unknown > 0) out.push(ui.unknownCount(unknown));
  }
  return lang === 'fr' ? out.map((s) => fixFrench(s)) : out;
}

/** Sentences grouped into pieces no longer than the limit, never cutting a sentence in half unless one is longer. */
export function speechChunks(sentences: readonly string[], limit = MAX_SPEECH_CHUNK): readonly string[] {
  const chunks: string[] = [];
  let current = '';
  for (const raw of sentences) {
    const sentence = clean(raw);
    if (sentence === '') continue;
    if (sentence.length > limit) {
      if (current !== '') chunks.push(current);
      current = '';
      for (let i = 0; i < sentence.length; i += limit) chunks.push(sentence.slice(i, i + limit));
      continue;
    }
    if (current === '') current = sentence;
    else if (current.length + 1 + sentence.length <= limit) current = `${current} ${sentence}`;
    else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current !== '') chunks.push(current);
  return chunks;
}

/** All of the place as one text, for a host that wants a single string. */
export function speechText(place: Place, termIds: readonly string[], lang: Lang): string {
  return speechSentences(place, termIds, lang).join(' ');
}

export function sayId(index: number): string {
  return `gl-say-${index}`;
}

export function parseSayId(id: string): number | null {
  const m = /^gl-say-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

export function sayButton(index: number, name: string, lang: Lang): string {
  const label = SAY_UI[lang].sayLabel(name);
  return `<button type="button" class="gl-btn" id="${sayId(index)}" aria-label="${escapeHtml(lang === 'fr' ? fixFrench(label) : label)}">${escapeHtml(SAY_UI[lang].say)}</button>`;
}
