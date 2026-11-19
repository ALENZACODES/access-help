import { fixFrench } from './frTypography';
import { TERMS, UNKNOWN_TERM, type GlossaryTerm, type Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * A short self-check on the plain words. The person sees a word, tries to say what it means,
 * then reads the meaning and marks "I know it" or "Practise again". The marks are the person's
 * own and stay on this device. This is about words only. It says nothing about any place.
 */
export const PRACTICE_STORE_KEY = 'glossary-practice';

export type Mark = 'known' | 'again';
export type Progress = Readonly<Record<string, Mark>>;

export interface PracticeCard {
  readonly id: string;
  readonly term: string;
  readonly plain: string;
}

/** Every plain word, Unknown first, in glossary order. */
export const PRACTICE_TERMS: readonly GlossaryTerm[] = [UNKNOWN_TERM, ...TERMS];

/** The ids of the words, in glossary order. */
export function practiceIds(): readonly string[] {
  return PRACTICE_TERMS.map((t) => t.id);
}

/** The words as cards in one language. */
export function practiceCards(lang: Lang): readonly PracticeCard[] {
  return PRACTICE_TERMS.map((t) => ({ id: t.id, term: t[lang].term, plain: t[lang].plain }));
}

export function markOf(progress: Progress, id: string): Mark | null {
  return Object.prototype.hasOwnProperty.call(progress, id) ? (progress[id] ?? null) : null;
}

/** Marks one word. Words that are not in `ids` are dropped, so old marks cannot pile up. */
export function setMark(progress: Progress, id: string, mark: Mark | null, ids: readonly string[]): Progress {
  const known = new Set(ids);
  const entries = Object.entries(progress).filter(([key]) => key !== id && known.has(key));
  if (mark !== null && known.has(id)) entries.push([id, mark]);
  return Object.fromEntries(entries);
}

export interface PracticeSummary {
  readonly known: number;
  readonly again: number;
  readonly unseen: number;
  readonly total: number;
}

export function summarise(progress: Progress, ids: readonly string[]): PracticeSummary {
  let known = 0;
  let again = 0;
  for (const id of ids) {
    const m = markOf(progress, id);
    if (m === 'known') known += 1;
    else if (m === 'again') again += 1;
  }
  return { known, again, unseen: ids.length - known - again, total: ids.length };
}

/**
 * The order for one round: words marked "practise again" first, then words not seen yet, then
 * words marked as known. Each group keeps the order of the glossary.
 */
export function buildDeck(progress: Progress, ids: readonly string[]): readonly string[] {
  const rank = (id: string): number => {
    const m = markOf(progress, id);
    return m === 'again' ? 0 : m === null ? 1 : 2;
  };
  return ids.map((id, i) => ({ id, i })).sort((a, b) => rank(a.id) - rank(b.id) || a.i - b.i).map((x) => x.id);
}

export interface PracticeState {
  readonly deck: readonly string[];
  /** Position in the deck. Equal to the deck length when the round is finished. */
  readonly position: number;
  /** true once the meaning is showing. */
  readonly revealed: boolean;
  readonly progress: Progress;
}

export function startRound(progress: Progress, ids: readonly string[]): PracticeState {
  return { deck: buildDeck(progress, ids), position: 0, revealed: false, progress };
}

export type PracticeAction = 'show' | 'know' | 'again' | 'skip' | 'round' | 'reset';

export function currentId(state: PracticeState): string | null {
  return state.deck[state.position] ?? null;
}

export function isFinished(state: PracticeState): boolean {
  return state.position >= state.deck.length;
}

/**
 * One step. "show" reveals the meaning. "know" and "again" need the meaning showing, record
 * the mark and go to the next word. "skip" goes on without a mark. "round" starts again with
 * the marks kept. "reset" starts again and clears the marks.
 */
export function step(state: PracticeState, action: PracticeAction, ids: readonly string[]): PracticeState {
  if (action === 'reset') return startRound({}, ids);
  if (action === 'round') return startRound(state.progress, ids);
  if (isFinished(state)) return state;
  if (action === 'show') return state.revealed ? state : { ...state, revealed: true };
  if (action === 'skip') return { ...state, position: state.position + 1, revealed: false };
  if (!state.revealed) return state;
  const id = currentId(state);
  if (id === null) return state;
  return { ...state, progress: setMark(state.progress, id, action === 'know' ? 'known' : 'again', ids), position: state.position + 1, revealed: false };
}

export function serialiseProgress(progress: Progress): string {
  return JSON.stringify(progress);
}

/** Null unless the text is a JSON object of ids to "known" or "again". Other entries are dropped. */
export function parseProgress(json: string, ids: readonly string[]): Progress | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    let out: Progress = {};
    for (const [id, mark] of Object.entries(raw)) if (mark === 'known' || mark === 'again') out = setMark(out, id, mark, ids);
    return out;
  } catch {
    return null;
  }
}

export const PRACTICE_UI = {
  en: {
    heading: 'Practise the words',
    intro: 'Say what the word means, then show the meaning. Your marks stay on this device.',
    position: (n: number, total: number): string => `Word ${n} of ${total}`,
    show: 'Show the meaning',
    know: 'I know it',
    again: 'Practise again',
    skip: 'Skip',
    knowLabel: (term: string): string => `I know it: ${term}`,
    againLabel: (term: string): string => `Practise again: ${term}`,
    summary: (known: number, again: number, unseen: number): string => `${known} known, ${again} to practise again, ${unseen} not seen yet.`,
    done: 'You went through every word.',
    next: 'Start another round',
    reset: 'Clear my marks',
    none: 'There are no words to practise.',
    meaning: 'Meaning',
    saidKnow: (term: string): string => `Marked ${term} as known.`,
    saidAgain: (term: string): string => `Marked ${term} to practise again.`,
  },
  fr: {
    heading: 'Pratiquer les mots',
    intro: 'Dites ce que le mot veut dire, puis affichez le sens. Vos marques restent sur cet appareil.',
    position: (n: number, total: number): string => `Mot ${n} sur ${total}`,
    show: 'Afficher le sens',
    know: 'Je le connais',
    again: 'À pratiquer encore',
    skip: 'Passer',
    knowLabel: (term: string): string => `Je le connais\u00a0: ${term}`,
    againLabel: (term: string): string => `À pratiquer encore\u00a0: ${term}`,
    summary: (known: number, again: number, unseen: number): string => `${known} connus, ${again} à pratiquer encore, ${unseen} pas encore vus.`,
    done: 'Vous avez passé en revue tous les mots.',
    next: 'Commencer une autre série',
    reset: 'Effacer mes marques',
    none: 'Il n’y a aucun mot à pratiquer.',
    meaning: 'Sens',
    saidKnow: (term: string): string => `${term} marqué comme connu.`,
    saidAgain: (term: string): string => `${term} marqué à pratiquer encore.`,
  },
} as const;

export const PRACTICE_IDS = {
  show: 'gl-prac-show',
  know: 'gl-prac-know',
  again: 'gl-prac-again',
  skip: 'gl-prac-skip',
  round: 'gl-prac-round',
  reset: 'gl-prac-reset',
} as const;

/** The action for a control id, or null for any other id. */
export function parsePracticeId(id: string): PracticeAction | null {
  const found = (Object.keys(PRACTICE_IDS) as PracticeAction[]).find((k) => PRACTICE_IDS[k] === id);
  return found ?? null;
}

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

function btn(id: string, text: string, label?: string): string {
  const aria = label === undefined ? '' : ` aria-label="${escapeHtml(label)}"`;
  return `<button type="button" class="gl-btn" id="${id}"${aria}>${escapeHtml(text)}</button>`;
}

/** The card: the word, then either the Show button or the meaning with the two marks. */
export function renderPractice(state: PracticeState, cards: readonly PracticeCard[], lang: Lang): string {
  const ui = PRACTICE_UI[lang];
  const intro = `<p>${escapeHtml(ui.intro)}</p>`;
  if (state.deck.length === 0 || cards.length === 0) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const sum = summarise(state.progress, state.deck);
  const summary = `<p class="gl-note" role="status">${escapeHtml(fr(lang, ui.summary(sum.known, sum.again, sum.unseen)))}</p>`;
  const reset = `<div class="gl-actions">${btn(PRACTICE_IDS.reset, ui.reset)}</div>`;
  if (isFinished(state)) {
    return `${intro}<p role="status">${escapeHtml(ui.done)}</p>${summary}<div class="gl-actions">${btn(PRACTICE_IDS.round, ui.next)}${btn(PRACTICE_IDS.reset, ui.reset)}</div>`;
  }
  const id = currentId(state);
  const card = cards.find((c) => c.id === id);
  if (card === undefined) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>${reset}`;
  const head = `<p class="gl-note">${escapeHtml(fr(lang, ui.position(state.position + 1, state.deck.length)))}</p><p class="gl-prac-term"><strong>${escapeHtml(card.term)}</strong></p>`;
  const body = state.revealed
    ? `<p><span class="gl-note">${escapeHtml((lang === 'fr' ? fixFrench(`${ui.meaning} :`) : `${ui.meaning}:`))}</span> ${escapeHtml(card.plain)}</p><div class="gl-actions">` +
      `${btn(PRACTICE_IDS.know, ui.know, fr(lang, ui.knowLabel(card.term)))}${btn(PRACTICE_IDS.again, ui.again, fr(lang, ui.againLabel(card.term)))}</div>`
    : `<div class="gl-actions">${btn(PRACTICE_IDS.show, ui.show)}${btn(PRACTICE_IDS.skip, ui.skip)}</div>`;
  return `${intro}${head}${body}${summary}${reset}`;
}
