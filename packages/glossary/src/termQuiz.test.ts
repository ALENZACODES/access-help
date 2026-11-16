import { describe, expect, it } from 'vitest';
import {
  QUIZ_BEST_KEY,
  QUIZ_IDS,
  QUIZ_UI,
  UNKNOWN_ID,
  auditHtml,
  betterBest,
  buildQuiz,
  currentQuestion,
  frenchIssues,
  isDone,
  lintClaims,
  lintCopy,
  next,
  parseBest,
  parseQuizId,
  pick,
  plainLanguageIssues,
  practiceCards,
  practiceIds,
  quizWords,
  readabilityIssues,
  renderQuiz,
  serialiseBest,
  startQuiz,
  type Lang,
  type QuizState,
} from './index';

const real = practiceIds();

describe('buildQuiz', () => {
  it('has one question for each word, with the right word among the options', () => {
    const quiz = buildQuiz(real);
    expect(quiz.map((q) => q.id)).toEqual(real);
    for (const q of quiz) expect(q.options).toContain(q.id);
  });
  it('has three different options, all real words', () => {
    for (const q of buildQuiz(real)) {
      expect(q.options).toHaveLength(3);
      expect(new Set(q.options).size).toBe(3);
      for (const o of q.options) expect(real).toContain(o);
    }
  });
  it('does not always put the right word first', () => {
    const places = new Set(buildQuiz(real).map((q) => q.options.indexOf(q.id)));
    expect(places.size).toBeGreaterThan(1);
  });
  it('is the same every time', () => {
    expect(buildQuiz(real)).toEqual(buildQuiz(real));
  });
  it('works for any list of four or more words', () => {
    for (const n of [4, 5, 6, 7, 20]) {
      const ids = Array.from({ length: n }, (_, i) => `w${i}`);
      for (const q of buildQuiz(ids)) {
        expect(q.options).toHaveLength(3);
        expect(new Set(q.options).size).toBe(3);
        expect(q.options).toContain(q.id);
      }
    }
  });
  it('offers every word when there are fewer than four', () => {
    expect(buildQuiz(['a', 'b'])).toEqual([
      { id: 'a', options: ['a', 'b'] },
      { id: 'b', options: ['a', 'b'] },
    ]);
    expect(buildQuiz([])).toEqual([]);
  });
});

describe('play', () => {
  it('starts on the first question with no answer', () => {
    const s = startQuiz(real);
    expect(s.position).toBe(0);
    expect(s.picked).toBeNull();
    expect(s.score).toBe(0);
    expect(currentQuestion(s)?.id).toBe(real[0]);
    expect(isDone(s)).toBe(false);
  });
  it('scores a right answer and not a wrong one', () => {
    const s = startQuiz(real);
    const q = currentQuestion(s);
    expect(q).not.toBeNull();
    if (q === null) return;
    expect(pick(s, q.id).score).toBe(1);
    const wrong = q.options.find((o) => o !== q.id) ?? '';
    const w = pick(s, wrong);
    expect(w.score).toBe(0);
    expect(w.picked).toBe(wrong);
  });
  it('counts only the first answer', () => {
    const s = startQuiz(real);
    const q = currentQuestion(s);
    if (q === null) return;
    const wrong = q.options.find((o) => o !== q.id) ?? '';
    const first = pick(s, wrong);
    expect(pick(first, q.id)).toBe(first);
  });
  it('ignores a word that is not on offer', () => {
    const s = startQuiz(real);
    expect(pick(s, 'zzz')).toBe(s);
    expect(pick(s, 'constructor')).toBe(s);
  });
  it('needs an answer before it goes on', () => {
    const s = startQuiz(real);
    expect(next(s)).toBe(s);
  });
  it('goes on with no answer showing', () => {
    const s = startQuiz(real);
    const q = currentQuestion(s);
    if (q === null) return;
    const n = next(pick(s, q.id));
    expect(n.position).toBe(1);
    expect(n.picked).toBeNull();
    expect(n.score).toBe(1);
  });
  it('finishes after the last question and then ignores everything', () => {
    let s: QuizState = startQuiz(real);
    for (let i = 0; i < real.length; i += 1) {
      const q = currentQuestion(s);
      if (q === null) break;
      s = next(pick(s, q.id));
    }
    expect(isDone(s)).toBe(true);
    expect(s.score).toBe(real.length);
    expect(currentQuestion(s)).toBeNull();
    expect(pick(s, real[0] ?? '')).toBe(s);
    expect(next(s)).toBe(s);
  });
  it('does not change its input', () => {
    const s = startQuiz(real);
    const copy = JSON.stringify(s);
    const q = currentQuestion(s);
    if (q !== null) next(pick(s, q.id));
    expect(JSON.stringify(s)).toBe(copy);
  });
});

describe('best score', () => {
  it('keeps the better share, and the old one on a tie', () => {
    expect(betterBest(null, 3, 9)).toEqual({ score: 3, total: 9 });
    expect(betterBest({ score: 3, total: 9 }, 5, 9)).toEqual({ score: 5, total: 9 });
    expect(betterBest({ score: 5, total: 9 }, 3, 9)).toEqual({ score: 5, total: 9 });
    const old = { score: 4, total: 8 };
    expect(betterBest(old, 5, 10)).toBe(old);
  });
  it('compares shares when the number of questions changed', () => {
    expect(betterBest({ score: 8, total: 10 }, 5, 6)).toEqual({ score: 5, total: 6 });
    expect(betterBest({ score: 5, total: 5 }, 8, 10)).toEqual({ score: 5, total: 5 });
  });
  it('replaces a best with no questions', () => {
    expect(betterBest({ score: 0, total: 0 }, 0, 9)).toEqual({ score: 0, total: 9 });
  });
  it('round-trips', () => {
    expect(parseBest(serialiseBest({ score: 3, total: 9 }))).toEqual({ score: 3, total: 9 });
    expect(parseBest(serialiseBest(null))).toBeNull();
  });
  it('is null for anything that is not a sensible result', () => {
    const bad = ['', 'x', '[]', '3', '{}', '{"score":1}', '{"score":"1","total":2}', '{"score":-1,"total":2}', '{"score":3,"total":2}', '{"score":0,"total":0}', '{"score":1.5,"total":2}', '{"score":1,"total":99999}'];
    for (const b of bad) expect(parseBest(b), b).toBeNull();
  });
  it('has a stable key', () => {
    expect(QUIZ_BEST_KEY).toBe('glossary-quiz-best');
  });
});

describe('ids', () => {
  it('reads each control id', () => {
    expect(parseQuizId(QUIZ_IDS.next)).toEqual({ kind: 'next' });
    expect(parseQuizId(QUIZ_IDS.again)).toEqual({ kind: 'again' });
    expect(parseQuizId('gl-quiz-opt-ramp')).toEqual({ kind: 'pick', id: 'ramp' });
  });
  it('rejects other ids', () => {
    for (const id of ['', 'gl-quiz-opt-', 'gl-quiz', 'gl-prac-show', 'ramp']) expect(parseQuizId(id), id).toBeNull();
  });
});

describe('markup', () => {
  const answered = (lang: Lang, right: boolean): QuizState => {
    const s = startQuiz(real);
    const q = currentQuestion(s);
    const id = right ? q?.id : q?.options.find((o) => o !== q.id);
    return pick(s, id ?? '');
  };
  it.each(['en', 'fr'] as Lang[])('is valid in %s in every state', (lang) => {
    const { cards } = quizWords(lang);
    let done: QuizState = startQuiz(real);
    for (let i = 0; i < real.length; i += 1) done = next(pick(done, currentQuestion(done)?.id ?? ''));
    const states = [startQuiz(real), answered(lang, true), answered(lang, false), done, startQuiz([])];
    for (const st of states) {
      for (const best of [null, { score: 5, total: 9 }]) {
        expect(auditHtml(`<div lang="${lang}">${renderQuiz(st, cards, best, lang)}</div>`, 'quiz')).toEqual([]);
      }
    }
  });
  it('shows the meaning and three word buttons, not the answer', () => {
    const html = renderQuiz(startQuiz(real), practiceCards('en'), null, 'en');
    expect(html).toContain('Question 1 of ');
    expect(html).toContain('We do not have information about this.');
    expect(html.match(/class="gl-btn"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Choose Unknown"');
    expect(html).not.toContain('Right answer');
  });
  it('says what the answer was and does not rely on colour', () => {
    const wrong = renderQuiz(answered('en', false), practiceCards('en'), null, 'en');
    expect(wrong).toContain('Not quite. The answer is Unknown.');
    expect(wrong).toContain('(Your answer)');
    expect(wrong).toContain('(Right answer)');
    expect(wrong).not.toContain(`id="gl-quiz-opt-`);
    const right = renderQuiz(answered('en', true), practiceCards('en'), null, 'en');
    expect(right).toContain('Correct.');
    expect(right).toContain('(Your answer, Right answer)');
    expect(right).toContain(QUIZ_IDS.next);
  });
  it('has a finish button on the last question', () => {
    let s = startQuiz(real);
    for (let i = 0; i < real.length - 1; i += 1) s = next(pick(s, currentQuestion(s)?.id ?? ''));
    const html = renderQuiz(pick(s, currentQuestion(s)?.id ?? ''), practiceCards('en'), null, 'en');
    expect(html).toContain('See my score');
  });
  it('shows the score and the best at the end', () => {
    let s = startQuiz(real);
    for (let i = 0; i < real.length; i += 1) s = next(pick(s, currentQuestion(s)?.id ?? ''));
    const html = renderQuiz(s, practiceCards('en'), { score: 5, total: 9 }, 'en');
    expect(html).toContain(`You got ${real.length} of ${real.length}.`);
    expect(html).toContain('Your best so far is 5 of 9.');
    expect(html).toContain(QUIZ_IDS.again);
  });
  it('is French', () => {
    const html = renderQuiz(startQuiz(real), practiceCards('fr'), null, 'fr');
    expect(html).toContain('Question 1 sur ');
    expect(html).toContain('Quel mot a ce sens\u202f?');
    expect(html).toContain('aria-label="Choisir Inconnu"');
  });
  it('says so when there are no questions, and when the word has no card', () => {
    expect(renderQuiz(startQuiz([]), [], null, 'en')).toContain(QUIZ_UI.en.none);
    expect(renderQuiz(startQuiz(real), [], null, 'en')).toContain(QUIZ_UI.en.none);
  });
  it('escapes words and meanings', () => {
    const cards = [
      { id: 'a', term: '<b>a</b>', plain: '<i>p</i>' },
      { id: 'b', term: 'b', plain: 'q' },
      { id: 'c', term: 'c', plain: 'r' },
      { id: 'd', term: 'd', plain: 's' },
    ];
    const html = renderQuiz(startQuiz(['a', 'b', 'c', 'd']), cards, null, 'en');
    expect(html).not.toContain('<b>a');
    expect(html).not.toContain('<i>p');
  });
  it('uses the same words as the practice, and Unknown is one of them', () => {
    expect(quizWords('en').ids).toEqual(real);
    expect(real).toContain(UNKNOWN_ID);
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = QUIZ_UI[lang];
    const texts = [
      ui.heading, ui.intro, ui.position(2, 9), ui.ask, ui.optionLabel('Ramp'), ui.right, ui.wrong('Ramp'), ui.yours, ui.answer, ui.next,
      ui.finish, ui.score(7, 9), ui.best(8, 9), ui.again, ui.none, ui.saidRight, ui.saidWrong('Ramp'),
    ];
    for (const t of texts) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      expect(readabilityIssues(t, lang), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});
