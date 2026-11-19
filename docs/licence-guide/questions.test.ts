import { describe, expect, it } from 'vitest';
import { licenceQuestions, QUESTION_IDS } from './questions.js';

describe('licenceQuestions', () => {
  for (const lang of ['en', 'fr'] as const) {
    it(`has every question once, in order (${lang})`, () => expect(licenceQuestions(lang).map((q) => q.id)).toEqual([...QUESTION_IDS]));
    it(`ends each question with a question mark and gives a full answer (${lang})`, () => {
      for (const q of licenceQuestions(lang)) {
        expect(q.question.endsWith('?'), q.id).toBe(true);
        expect(q.answer.length, q.id).toBeGreaterThan(40);
      }
    });
  }
  it('puts a narrow no-break space before each French question mark', () => {
    for (const q of licenceQuestions('fr')) expect(q.question.endsWith(' ?'), q.id).toBe(true);
  });
  it('does not choose a licence for the person', () => {
    expect(licenceQuestions('en').find((q) => q.id === 'which-for-mine')?.answer).toMatch(/The App does not pick for you\./);
  });
  it('says the App stores no photos', () => expect(licenceQuestions('en').find((q) => q.id === 'photo')?.answer).toMatch(/stores no photos/));
  it('differs between languages', () => expect(licenceQuestions('fr')[0]?.answer).not.toBe(licenceQuestions('en')[0]?.answer));
});
