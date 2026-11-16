import { describe, expect, it } from 'vitest';
import {
  PRACTICE_IDS,
  PRACTICE_STORE_KEY,
  PRACTICE_UI,
  UNKNOWN_ID,
  auditHtml,
  buildDeck,
  currentId,
  frenchIssues,
  isFinished,
  lintClaims,
  lintCopy,
  markOf,
  parsePracticeId,
  parseProgress,
  plainLanguageIssues,
  practiceCards,
  practiceIds,
  readabilityIssues,
  renderPractice,
  serialiseProgress,
  setMark,
  startRound,
  step,
  summarise,
  type Lang,
  type PracticeState,
  type Progress,
} from './index';

const ids = ['a', 'b', 'c', 'd'];
const cards = (lang: Lang) => practiceCards(lang);

describe('cards', () => {
  it('has a card for Unknown and every plain word, in both languages', () => {
    const en = practiceCards('en');
    const fr = practiceCards('fr');
    expect(en).toHaveLength(practiceIds().length);
    expect(fr.map((c) => c.id)).toEqual(en.map((c) => c.id));
    expect(en[0]?.id).toBe(UNKNOWN_ID);
    for (const c of [...en, ...fr]) {
      expect(c.term.trim()).not.toBe('');
      expect(c.plain.trim()).not.toBe('');
    }
  });
  it('keeps Unknown as Unknown', () => {
    expect(practiceCards('en')[0]?.term).toBe('Unknown');
    expect(practiceCards('fr')[0]?.term).toBe('Inconnu');
  });
  it('has unique ids', () => {
    expect(new Set(practiceIds()).size).toBe(practiceIds().length);
  });
});

describe('setMark and summarise', () => {
  it('marks and re-marks a word', () => {
    const one = setMark({}, 'a', 'known', ids);
    expect(markOf(one, 'a')).toBe('known');
    expect(markOf(setMark(one, 'a', 'again', ids), 'a')).toBe('again');
  });
  it('clears a mark with null', () => {
    expect(setMark({ a: 'known' }, 'a', null, ids)).toEqual({});
  });
  it('ignores words that are not in the list, and drops old marks for them', () => {
    expect(setMark({}, 'zz', 'known', ids)).toEqual({});
    expect(setMark({ old: 'known', a: 'again' }, 'b', 'known', ids)).toEqual({ a: 'again', b: 'known' });
  });
  it('is safe with prototype keys', () => {
    expect(markOf({}, 'constructor')).toBeNull();
    expect(markOf({}, '__proto__')).toBeNull();
    expect(Object.keys(setMark({}, '__proto__', 'known', ['__proto__']))).toEqual(['__proto__']);
  });
  it('counts', () => {
    expect(summarise({ a: 'known', b: 'again', c: 'known' }, ids)).toEqual({ known: 2, again: 1, unseen: 1, total: 4 });
    expect(summarise({}, [])).toEqual({ known: 0, again: 0, unseen: 0, total: 0 });
  });
  it('does not count marks for words that are not in the list', () => {
    expect(summarise({ zz: 'known' }, ids).known).toBe(0);
  });
});

describe('buildDeck', () => {
  it('puts practise-again first, then unseen, then known, each in glossary order', () => {
    const progress: Progress = { a: 'known', c: 'again', d: 'known' };
    expect(buildDeck(progress, ids)).toEqual(['c', 'b', 'a', 'd']);
  });
  it('keeps the glossary order with no marks', () => {
    expect(buildDeck({}, ids)).toEqual(ids);
  });
  it('has every word once', () => {
    expect([...buildDeck({ b: 'again' }, ids)].sort()).toEqual(ids);
  });
});

describe('step', () => {
  const start = (progress: Progress = {}): PracticeState => startRound(progress, ids);
  it('starts on the first word with the meaning hidden', () => {
    const s = start();
    expect(currentId(s)).toBe('a');
    expect(s.revealed).toBe(false);
    expect(isFinished(s)).toBe(false);
  });
  it('shows the meaning', () => {
    const s = step(start(), 'show', ids);
    expect(s.revealed).toBe(true);
    expect(step(s, 'show', ids)).toBe(s);
  });
  it('needs the meaning showing before it takes a mark', () => {
    const s = start();
    expect(step(s, 'know', ids)).toBe(s);
    expect(step(s, 'again', ids)).toBe(s);
  });
  it('records a mark and goes to the next word with the meaning hidden', () => {
    const s = step(step(start(), 'show', ids), 'know', ids);
    expect(markOf(s.progress, 'a')).toBe('known');
    expect(currentId(s)).toBe('b');
    expect(s.revealed).toBe(false);
    const t = step(step(s, 'show', ids), 'again', ids);
    expect(markOf(t.progress, 'b')).toBe('again');
  });
  it('skips without a mark', () => {
    const s = step(start(), 'skip', ids);
    expect(currentId(s)).toBe('b');
    expect(s.progress).toEqual({});
  });
  it('does not reorder the deck while the round runs', () => {
    let s = start();
    s = step(step(s, 'show', ids), 'again', ids);
    expect(s.deck).toEqual(ids);
  });
  it('finishes after the last word and then ignores marks', () => {
    let s = start();
    for (let i = 0; i < ids.length; i += 1) s = step(step(s, 'show', ids), 'know', ids);
    expect(isFinished(s)).toBe(true);
    expect(currentId(s)).toBeNull();
    expect(step(s, 'show', ids)).toBe(s);
    expect(step(s, 'know', ids)).toBe(s);
    expect(step(s, 'skip', ids)).toBe(s);
  });
  it('starts another round with the marks kept and the weak words first', () => {
    let s = start();
    s = step(step(s, 'show', ids), 'know', ids);
    s = step(step(s, 'show', ids), 'again', ids);
    s = step(s, 'skip', ids);
    s = step(s, 'skip', ids);
    const next = step(s, 'round', ids);
    expect(next.position).toBe(0);
    expect(next.deck).toEqual(['b', 'c', 'd', 'a']);
    expect(next.progress).toEqual({ a: 'known', b: 'again' });
  });
  it('clears the marks on reset', () => {
    const s = step(step(start(), 'show', ids), 'know', ids);
    const r = step(s, 'reset', ids);
    expect(r.progress).toEqual({});
    expect(r.deck).toEqual(ids);
    expect(r.position).toBe(0);
  });
  it('does not change its input', () => {
    const s = start();
    const copy = JSON.stringify(s);
    step(s, 'show', ids);
    step(s, 'skip', ids);
    expect(JSON.stringify(s)).toBe(copy);
  });
});

describe('storage', () => {
  it('round-trips', () => {
    const p: Progress = { a: 'known', b: 'again' };
    expect(parseProgress(serialiseProgress(p), ids)).toEqual(p);
  });
  it('is null for text that is not an object', () => {
    for (const bad of ['', 'x', '[]', 'null', '2']) expect(parseProgress(bad, ids), bad).toBeNull();
  });
  it('drops bad marks and words that are gone', () => {
    expect(parseProgress(JSON.stringify({ a: 'known', b: 'maybe', c: 3, zz: 'again' }), ids)).toEqual({ a: 'known' });
  });
  it('has a stable key', () => {
    expect(PRACTICE_STORE_KEY).toBe('glossary-practice');
  });
});

describe('ids', () => {
  it('maps each control id to its action', () => {
    expect(parsePracticeId(PRACTICE_IDS.show)).toBe('show');
    expect(parsePracticeId(PRACTICE_IDS.know)).toBe('know');
    expect(parsePracticeId(PRACTICE_IDS.again)).toBe('again');
    expect(parsePracticeId(PRACTICE_IDS.skip)).toBe('skip');
    expect(parsePracticeId(PRACTICE_IDS.round)).toBe('round');
    expect(parsePracticeId(PRACTICE_IDS.reset)).toBe('reset');
  });
  it('rejects other ids', () => {
    for (const id of ['', 'gl-prac', 'gl-prac-x', 'gl-save-1', 'constructor']) expect(parsePracticeId(id), id).toBeNull();
  });
});

describe('markup', () => {
  const real = practiceIds();
  const first = (lang: Lang): PracticeState => startRound({}, real);
  it.each(['en', 'fr'] as Lang[])('is valid in %s in every state', (lang) => {
    let s = first(lang);
    const states: PracticeState[] = [s];
    s = step(s, 'show', real);
    states.push(s);
    for (let i = 0; i < real.length; i += 1) s = step(step(s, 'show', real), 'know', real);
    states.push(s, { deck: [], position: 0, revealed: false, progress: {} });
    for (const st of states) expect(auditHtml(`<div lang="${lang}">${renderPractice(st, cards(lang), lang)}</div>`, 'practice')).toEqual([]);
  });
  it('shows the word and the Show button, not the meaning', () => {
    const html = renderPractice(first('en'), cards('en'), 'en');
    expect(html).toContain('Word 1 of ');
    expect(html).toContain('<strong>Unknown</strong>');
    expect(html).toContain(`id="${PRACTICE_IDS.show}"`);
    expect(html).not.toContain(PRACTICE_IDS.know);
  });
  it('shows the meaning and the two marks once revealed, with names that include the word', () => {
    const html = renderPractice(step(first('en'), 'show', real), cards('en'), 'en');
    expect(html).toContain('Meaning:');
    expect(html).toContain(`id="${PRACTICE_IDS.know}" aria-label="I know Unknown"`);
    expect(html).toContain(`id="${PRACTICE_IDS.again}" aria-label="Practise Unknown again"`);
    expect(html).not.toContain(PRACTICE_IDS.show);
  });
  it('spaces the colon in French', () => {
    expect(renderPractice(step(first('fr'), 'show', real), cards('fr'), 'fr')).toContain('Sens\u00a0:');
  });
  it('says what was marked, and that Unknown does not mean present or absent', () => {
    const en = renderPractice(step(first('en'), 'show', real), cards('en'), 'en');
    expect(en).toMatch(/not have information|do not have information/i);
    expect(en).toContain('0 known, 0 to practise again,');
  });
  it('ends with a done message and the choice to go again or clear', () => {
    let s = first('en');
    for (let i = 0; i < real.length; i += 1) s = step(step(s, 'show', real), 'know', real);
    const html = renderPractice(s, cards('en'), 'en');
    expect(html).toContain(PRACTICE_UI.en.done);
    expect(html).toContain(PRACTICE_IDS.round);
    expect(html).toContain(PRACTICE_IDS.reset);
    expect(html).not.toContain(PRACTICE_IDS.show);
  });
  it('says so when there are no words', () => {
    expect(renderPractice({ deck: [], position: 0, revealed: false, progress: {} }, [], 'en')).toContain(PRACTICE_UI.en.none);
  });
  it('is safe when the deck has a word with no card', () => {
    const html = renderPractice({ deck: ['zz'], position: 0, revealed: false, progress: {} }, cards('en'), 'en');
    expect(html).toContain(PRACTICE_UI.en.none);
    expect(html).toContain(PRACTICE_IDS.reset);
  });
  it('escapes the words', () => {
    const html = renderPractice(
      { deck: ['x'], position: 0, revealed: true, progress: {} },
      [{ id: 'x', term: '<b>t</b>', plain: '<i>p</i>' }],
      'en',
    );
    expect(html).not.toContain('<b>t');
    expect(html).not.toContain('<i>p');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = PRACTICE_UI[lang];
    const texts = [
      ui.heading, ui.intro, ui.position(2, 9), ui.show, ui.know, ui.again, ui.skip, ui.knowLabel('Unknown'), ui.againLabel('Unknown'),
      ui.summary(1, 2, 3), ui.done, ui.next, ui.reset, ui.none, ui.saidKnow('Unknown'), ui.saidAgain('Unknown'),
    ];
    for (const t of texts) {
      const text = lang === 'fr' ? t.replace(/ ([:;?!»])/g, '\u00a0$1') : t;
      expect(lintCopy(text), t).toEqual([]);
      expect(lintClaims(text), t).toEqual([]);
      expect(plainLanguageIssues(text), t).toEqual([]);
      expect(readabilityIssues(text, lang), t).toEqual([]);
    }
  });
  it('is clean French once typography is applied', () => {
    for (const t of Object.values(PRACTICE_UI.fr)) {
      if (typeof t === 'string') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});
