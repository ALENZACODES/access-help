import { describe, expect, it } from 'vitest';
import { STEP_IDS, submissionSteps } from './steps.js';

describe('submissionSteps', () => {
  for (const lang of ['en', 'fr'] as const) {
    it(`has every step in order (${lang})`, () => expect(submissionSteps(lang).map((s) => s.id)).toEqual([...STEP_IDS]));
    it(`gives each step a title and detail (${lang})`, () => {
      for (const s of submissionSteps(lang)) {
        expect(s.title.length).toBeGreaterThan(5);
        expect(s.detail.length).toBeGreaterThan(20);
      }
    });
  }
  it('says the sign-in stays with the person and the App cannot see the result', () => {
    const text = submissionSteps('en').map((s) => s.detail).join(' ');
    expect(text).toMatch(/never holds your sign-in/);
    expect(text).toMatch(/cannot see whether it worked/);
  });
  it('differs between languages', () => expect(submissionSteps('fr')[0]?.title).not.toBe(submissionSteps('en')[0]?.title));
});
