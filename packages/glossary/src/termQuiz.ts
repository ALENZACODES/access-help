import { fixFrench } from './frTypography';
import { practiceCards, practiceIds, type PracticeCard } from './termPractice';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * A short quiz on the plain words. Each question gives a meaning and three words to choose from.
 * It is about words only. It says nothing about any place, and Unknown is one of the words.
 * The questions are always the same and in the same order, so a score can be compared with an earlier one.
 */
export const QUIZ_BEST_KEY = 'glossary-quiz-best';

export interface QuizQuestion {
  /** The word whose meaning is shown. */
  readonly id: string;
  /** Three words (fewer when there are fewer than four words), the right one among them. */
  readonly options: readonly string[];
}

/** One question for each word. The wrong words and the order of the three are set by the position, not by chance. */
export function buildQuiz(ids: readonly string[]): readonly QuizQuestion[] {
  const n = ids.length;
  return ids.map((id, i) => {
    if (n < 4) return { id, options: [...ids] };
    const a = ids[(i + 1 + (i % (n - 1))) % n];
    const b = ids[(i + 1 + ((i + Math.floor((n - 1) / 2)) % (n - 1))) % n];
    const three = [id, a ?? id, b ?? id];
    const turn = i % 3;
    return { id, options: [...three.slice(turn), ...three.slice(0, turn)] };
  });
}

export interface QuizState {
  readonly quiz: readonly QuizQuestion[];
  readonly position: number;
  /** The word chosen for the current question, or null before an answer. */
  readonly picked: string | null;
  readonly score: number;
}

export function startQuiz(ids: readonly string[]): QuizState {
  return { quiz: buildQuiz(ids), position: 0, picked: null, score: 0 };
}

export function currentQuestion(state: QuizState): QuizQuestion | null {
  return state.quiz[state.position] ?? null;
}

export function isDone(state: QuizState): boolean {
  return state.position >= state.quiz.length;
}

/** Records an answer. Only the first answer to a question counts, and only a word on offer. */
export function pick(state: QuizState, id: string): QuizState {
  const q = currentQuestion(state);
  if (q === null || state.picked !== null || !q.options.includes(id)) return state;
  return { ...state, picked: id, score: state.score + (id === q.id ? 1 : 0) };
}

/** Goes on to the next question. Needs an answer to the current one. */
export function next(state: QuizState): QuizState {
  if (isDone(state) || state.picked === null) return state;
  return { ...state, position: state.position + 1, picked: null };
}

export interface Best {
  readonly score: number;
  readonly total: number;
}

/** The better of two results by share right. An equal share keeps the old one. */
export function betterBest(old: Best | null, score: number, total: number): Best {
  const now: Best = { score, total };
  if (old === null || old.total === 0) return now;
  return score * old.total > old.score * total ? now : old;
}

export function serialiseBest(best: Best | null): string {
  return JSON.stringify(best);
}

/** Null for anything that is not an object with whole numbers, 0 <= score <= total (including a stored "no best yet"). */
export function parseBest(json: string): Best | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const { score, total } = raw as { score?: unknown; total?: unknown };
    if (!Number.isInteger(score) || !Number.isInteger(total)) return null;
    const s = score as number;
    const t = total as number;
    return s >= 0 && t > 0 && s <= t && t <= 1000 ? { score: s, total: t } : null;
  } catch {
    return null;
  }
}

export const QUIZ_UI = {
  en: {
    heading: 'Test yourself',
    intro: 'Read the meaning, then choose the word. The questions are the same each time.',
    position: (n: number, total: number): string => `Question ${n} of ${total}`,
    ask: 'Which word has this meaning?',
    optionLabel: (term: string): string => `Choose ${term}`,
    right: 'Correct.',
    wrong: (term: string): string => `Not quite. The answer is ${term}.`,
    yours: 'Your answer',
    answer: 'Right answer',
    next: 'Next question',
    finish: 'See my score',
    score: (score: number, total: number): string => `You got ${score} of ${total}.`,
    best: (score: number, total: number): string => `Your best so far is ${score} of ${total}.`,
    again: 'Try again',
    none: 'There are no questions.',
    saidRight: 'Correct.',
    saidWrong: (term: string): string => `Not quite. The answer is ${term}.`,
  },
  fr: {
    heading: 'Testez-vous',
    intro: 'Lisez le sens, puis choisissez le mot. Les questions sont les mêmes chaque fois.',
    position: (n: number, total: number): string => `Question ${n} sur ${total}`,
    ask: 'Quel mot a ce sens\u202f?',
    optionLabel: (term: string): string => `Choisir ${term}`,
    right: 'Bonne réponse.',
    wrong: (term: string): string => `Pas tout à fait. La réponse est ${term}.`,
    yours: 'Votre réponse',
    answer: 'Bonne réponse',
    next: 'Question suivante',
    finish: 'Voir mon score',
    score: (score: number, total: number): string => `Vous avez obtenu ${score} sur ${total}.`,
    best: (score: number, total: number): string => `Votre meilleur score est ${score} sur ${total}.`,
    again: 'Réessayer',
    none: 'Il n’y a aucune question.',
    saidRight: 'Bonne réponse.',
    saidWrong: (term: string): string => `Pas tout à fait. La réponse est ${term}.`,
  },
} as const;

export const QUIZ_IDS = { next: 'gl-quiz-next', again: 'gl-quiz-again' } as const;
export const QUIZ_OPTION_PREFIX = 'gl-quiz-opt-';

export type QuizAction = { readonly kind: 'pick'; readonly id: string } | { readonly kind: 'next' } | { readonly kind: 'again' };

/** What a control id means, or null for any other id. */
export function parseQuizId(id: string): QuizAction | null {
  if (id === QUIZ_IDS.next) return { kind: 'next' };
  if (id === QUIZ_IDS.again) return { kind: 'again' };
  if (id.startsWith(QUIZ_OPTION_PREFIX) && id.length > QUIZ_OPTION_PREFIX.length) return { kind: 'pick', id: id.slice(QUIZ_OPTION_PREFIX.length) };
  return null;
}

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** The card for the question now showing, the score at the end, and the best so far. */
export function renderQuiz(state: QuizState, cards: readonly PracticeCard[], best: Best | null, lang: Lang): string {
  const ui = QUIZ_UI[lang];
  const intro = `<p>${escapeHtml(ui.intro)}</p>`;
  const bestLine = best === null ? '' : `<p class="gl-note">${escapeHtml(ui.best(best.score, best.total))}</p>`;
  const byId = new Map(cards.map((c) => [c.id, c] as const));
  if (state.quiz.length === 0) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  if (isDone(state)) {
    return `${intro}<p role="status">${escapeHtml(fr(lang, ui.score(state.score, state.quiz.length)))}</p>${bestLine}<div class="gl-actions"><button type="button" class="gl-btn" id="${QUIZ_IDS.again}">${escapeHtml(ui.again)}</button></div>`;
  }
  const q = currentQuestion(state);
  const card = q === null ? undefined : byId.get(q.id);
  if (q === null || card === undefined) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const head = `<p class="gl-note">${escapeHtml(fr(lang, ui.position(state.position + 1, state.quiz.length)))}</p><p>${escapeHtml(card.plain)}</p><p><strong>${escapeHtml(fr(lang, ui.ask))}</strong></p>`;
  const term = (id: string): string => byId.get(id)?.term ?? id;
  if (state.picked === null) {
    const options = q.options
      .map((id) => `<li><button type="button" class="gl-btn" id="${QUIZ_OPTION_PREFIX}${escapeHtml(id)}" aria-label="${escapeHtml(fr(lang, ui.optionLabel(term(id))))}">${escapeHtml(term(id))}</button></li>`)
      .join('');
    return `${intro}${head}<ul class="gl-options">${options}</ul>${bestLine}`;
  }
  const last = state.position + 1 >= state.quiz.length;
  const correct = state.picked === q.id;
  const marks = q.options
    .map((id) => {
      const tags = [id === state.picked ? ui.yours : '', id === q.id ? ui.answer : ''].filter((x) => x !== '');
      return `<li>${escapeHtml(term(id))}${tags.length === 0 ? '' : ` (${escapeHtml(tags.join(', '))})`}</li>`;
    })
    .join('');
  const verdict = correct ? ui.right : ui.wrong(card.term);
  return (
    `${intro}${head}<ul class="gl-options">${marks}</ul><p role="status">${escapeHtml(fr(lang, verdict))}</p>` +
    `<div class="gl-actions"><button type="button" class="gl-btn" id="${QUIZ_IDS.next}">${escapeHtml(last ? ui.finish : ui.next)}</button></div>${bestLine}`
  );
}

/** The ids and cards the quiz is made from: the same words as the practice. */
export function quizWords(lang: Lang): { readonly ids: readonly string[]; readonly cards: readonly PracticeCard[] } {
  return { ids: practiceIds(), cards: practiceCards(lang) };
}
