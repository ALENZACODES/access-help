import { describe, expect, it } from 'vitest';
import { walkChanges } from './finish.js';
import { answered, complete, fresh, saved, short } from './fixtures.js';
import { answerIssueText, answerText, changeLabel, changeLine, changesSummary, choiceLabel, filledInText, lengthRange, nothingAnsweredText, onSiteNoteText, positionText, progressText, stepQuestion, stepShort, stepTip, unitLabel } from './messages.js';
import { STEP_CHOICES, WALK_STEPS } from './steps.js';
import { walkProgress } from './walk.js';

describe('questions and tips', () => {
  it('asks a question for every step in both languages', () => {
    for (const step of WALK_STEPS) {
      expect(stepQuestion(step, 'en')).toMatch(/\?$/);
      expect(stepQuestion(step, 'fr')).toMatch(/\u202f\?$/);
      expect(stepQuestion(step, 'fr')).not.toBe(stepQuestion(step, 'en'));
    }
  });
  it('gives a tip and a short name for every step', () => {
    for (const step of WALK_STEPS) {
      for (const lang of ['en', 'fr'] as const) {
        expect(stepTip(step, lang).length).toBeGreaterThan(20);
        expect(stepShort(step, lang)).not.toBe('');
      }
    }
  });
  it('names every choice in both languages, and says UNKNOWN for anything else', () => {
    for (const step of WALK_STEPS) {
      for (const value of STEP_CHOICES[step] ?? []) {
        expect(choiceLabel(step, value, 'en')).not.toBe('UNKNOWN');
        expect(choiceLabel(step, value, 'fr')).not.toBe(choiceLabel(step, value, 'en'));
      }
    }
    expect(choiceLabel('ramp', 'perhaps', 'en')).toBe('UNKNOWN');
    expect(choiceLabel('steps', 'yes', 'fr')).toBe('UNKNOWN');
  });
  it('names the units', () => {
    expect(unitLabel('cm', 'en')).toBe('Centimetres');
    expect(unitLabel('in', 'fr')).toBe('Pouces');
  });
  it('gives the range in the unit being typed', () => {
    expect(lengthRange('doorWidth', 'cm', 'en')).toBe('From 30 cm to 400 cm.');
    expect(lengthRange('doorWidth', 'in', 'en')).toMatch(/^From 11\.8 in to 157\.5 in\.$/);
    expect(lengthRange('stepHeight', 'cm', 'fr')).toMatch(/^De 0,5\u00a0cm à 60\u00a0cm\.$/);
  });
});

describe('answers and issues', () => {
  it('shows UNKNOWN for an unanswered question', () => {
    for (const step of WALK_STEPS) expect(answerText(fresh(), step, 'en')).toBe('UNKNOWN');
    expect(answerText(short(), 'ramp', 'fr')).toBe('UNKNOWN');
  });
  it('shows a count as typed, a choice by its label, a length in both units', () => {
    expect(answerText(complete(), 'steps', 'en')).toBe('2');
    expect(answerText(complete(), 'doorOpening', 'en')).toBe('With a button');
    expect(answerText(complete(), 'doorWidth', 'en')).toBe('82.5 cm (32.5 in)');
    expect(answerText(complete(), 'doorWidth', 'fr')).toBe('82,5\u00a0cm (32,5\u00a0po)');
  });
  it('has a sentence for every issue', () => {
    for (const issue of ['empty', 'not-a-whole-number', 'not-a-length', 'too-small', 'too-large', 'not-a-choice'] as const) {
      expect(answerIssueText(issue, 'en')).toMatch(/\.$/);
      expect(answerIssueText(issue, 'fr')).not.toBe(answerIssueText(issue, 'en'));
    }
    expect(answerIssueText('empty', 'en')).toContain('UNKNOWN');
  });
});

describe('progress', () => {
  it('says which question is on screen', () => {
    expect(positionText(walkProgress(fresh()), 'en')).toBe('Question 1 of 7');
    expect(positionText(walkProgress(answered([['steps', '0']])), 'fr')).toBe('Question 2 sur 6');
    expect(positionText(walkProgress(complete()), 'en')).toBe('Look over your answers');
  });
  it('counts answered, skipped and to come', () => {
    expect(progressText(walkProgress(short()), 'en')).toBe('Answered: 5. Skipped, so UNKNOWN: 1. Still to come: 0.');
    expect(progressText(walkProgress(fresh()), 'fr')).toBe('Répondues\u00a0: 0. Passées, donc UNKNOWN\u00a0: 0. À venir\u00a0: 7.');
  });
});

describe('changes', () => {
  it('labels each kind', () => {
    expect(changeLabel('new', 'en')).toBe('New');
    expect(changeLabel('cleared', 'en')).toBe('Goes back to UNKNOWN');
    expect(changeLabel('cleared', 'fr')).toBe('Redevient UNKNOWN');
  });
  it('writes one line per fact', () => {
    expect(changeLine({ key: 'steps', kind: 'new' }, 'en')).toMatch(/: new\.$/);
    expect(changeLine({ key: 'steps', kind: 'cleared' }, 'en')).toMatch(/: goes back to unknown\.$/i);
  });
  it('sums up without a warning when nothing is cleared', () => {
    expect(changesSummary(walkChanges(null, saved()), 'en')).toBe('New: 3. Changed: 0. The same: 0.');
  });
  it('adds a warning when a saved fact would go back to UNKNOWN', () => {
    const text = changesSummary(walkChanges(saved({ toilet: 'yes' }), saved()), 'en');
    expect(text).toContain('Going back to UNKNOWN: 1.');
    expect(text).toContain('Go back and answer those questions');
  });
});

describe('notes', () => {
  it('names the day an answer was filled in from', () => {
    expect(filledInText('2026-11-12', 'en')).toContain('2026-11-12');
    expect(filledInText('2026-11-12', 'fr')).toContain('le 2026-11-12');
  });
  it('tells the person to skip what they are not sure of', () => {
    expect(onSiteNoteText('en')).toContain('it stays UNKNOWN');
    expect(onSiteNoteText('fr')).toContain('cela reste UNKNOWN');
  });
  it('says there is nothing to save when nothing is answered', () => {
    expect(nothingAnsweredText('en')).toContain('nothing to save');
  });
});
