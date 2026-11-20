import { describe, expect, it } from 'vitest';
import { emptyCriteria } from './criteria.js';
import { m, simple, strict } from './fixtures.js';
import { matchPlace } from './match.js';
import { checkText, criteriaIssueText, criteriaLines, criterionShort, criterionText, matchCountsText, noCriteriaText, overallLabel, setIssueText, tallyLine, toldCountedText, unknownText, yoursText } from './messages.js';

const texts = (criteria: ReturnType<typeof strict>, measures: ReturnType<typeof m>, lang: 'en' | 'fr' = 'en') => matchPlace('x', criteria, measures, null).checks.map((check) => checkText(check, criteria, lang));

describe('words for the numbers', () => {
  it('writes each criterion with the number the person set', () => {
    expect(criteriaLines(strict(), 'en')).toEqual([
      'At most 1 step at the entrance, or a ramp',
      'Highest step at most 5 cm, or a ramp',
      'Entrance door at least 80 cm wide',
      'Door that opens by itself or with a button',
      'A wheelchair toilet',
      'Toilet door at least 85 cm wide',
    ]);
  });
  it('says "no step" for zero and uses the plural for more than one', () => {
    expect(criterionText('steps', simple(), 'en')).toBe('No step at the entrance');
    expect(criterionText('steps', simple({ maxSteps: 2 }), 'en')).toBe('At most 2 steps at the entrance');
    expect(criterionText('steps', simple({ maxSteps: 2 }), 'fr')).toBe('Au plus 2 marches à l’entrée');
  });
  it('words the two door choices', () => {
    expect(criterionText('door', strict({ door: 'by-itself' }), 'en')).toBe('Door that opens by itself');
    expect(criterionText('door', strict(), 'fr')).toBe('Porte qui s’ouvre toute seule ou avec un bouton');
  });
  it('writes French numbers with a decimal comma', () => {
    expect(criterionText('doorWidth', simple({ minDoorWidthCm: 81.3 }), 'fr')).toBe('Porte d’entrée large d’au moins 81,3 cm');
  });
  it('lists nothing when nothing is set', () => {
    expect(criteriaLines(emptyCriteria(), 'en')).toEqual([]);
    expect(noCriteriaText('en')).toBe('Set at least one number to look through your places.');
  });
  it('has a short name for every criterion', () => {
    expect(criterionShort('doorWidth', 'en')).toBe('width of the entrance door');
    expect(criterionShort('toiletDoor', 'fr')).toBe('largeur de la porte de la toilette');
  });
});

describe('words for what a check found', () => {
  it('gives the fact and how far it is from the number', () => {
    expect(texts(strict(), m('x', { steps: 1, stepHeightCm: 5, doorWidthCm: 80, doorOpening: 'button', toilet: 'yes', toiletDoorCm: 90 }))).toEqual([
      'At most 1 step at the entrance, or a ramp: 1 step.',
      'Highest step at most 5 cm, or a ramp: 5 cm, the same as the number you set.',
      'Entrance door at least 80 cm wide: 80 cm, the same as the number you set.',
      'Door that opens by itself or with a button: yes.',
      'A wheelchair toilet: yes.',
      'Toilet door at least 85 cm wide: 90 cm, 5 cm more than the number you set.',
    ]);
  });
  it('says when a ramp stood in, and what is outside a number', () => {
    expect(texts(strict(), m('x', { steps: 4, stepHeightCm: 20, ramp: 'yes', doorWidthCm: 70, doorOpening: 'manual', toilet: 'no' }))).toEqual([
      'At most 1 step at the entrance, or a ramp: there is a ramp.',
      'Highest step at most 5 cm, or a ramp: there is a ramp.',
      'Entrance door at least 80 cm wide: 70 cm, 10 cm less than the number you set.',
      'Door that opens by itself or with a button: no.',
      'A wheelchair toilet: no.',
      'Toilet door at least 85 cm wide: there is no wheelchair toilet.',
    ]);
  });
  it('writes UNKNOWN for a fact nobody has, in both languages', () => {
    expect(texts(simple(), m('x', {}))).toEqual(['No step at the entrance: UNKNOWN.', 'Entrance door at least 80 cm wide: UNKNOWN.']);
    expect(texts(simple(), m('x', {}), 'fr')[1]).toBe('Porte d’entrée large d’au moins 80 cm : UNKNOWN.');
  });
  it('says "no step" for zero steps and for a height limit where there is none', () => {
    const criteria = { ...emptyCriteria(), maxSteps: 0, maxStepHeightCm: 5 };
    expect(texts(criteria, m('x', { steps: 0 }))).toEqual(['No step at the entrance: no step.', 'Highest step at most 5 cm: no step.']);
  });
  it('counts the steps found', () => {
    expect(texts(simple(), m('x', { steps: 3 }))[0]).toBe('No step at the entrance: 3 steps.');
    expect(texts(simple(), m('x', { steps: 3 }), 'fr')[0]).toBe('Aucune marche à l’entrée : 3 marches.');
  });
  it('marks a fact that came from what the place said', () => {
    const criteria = simple({ countTold: true });
    const result = matchPlace('x', criteria, null, m('x', { steps: 0, doorWidthCm: 85 }));
    expect(checkText(result.checks[1]!, criteria, 'en')).toBe('Entrance door at least 80 cm wide: 85 cm, 5 cm more than the number you set. This comes from what the place said, not from your own measure.');
  });
});

describe('words for the result', () => {
  it('labels the three groups without calling a place usable or not', () => {
    expect(overallLabel('fits', 'en')).toBe('Within every number you set');
    expect(overallLabel('does-not-fit', 'en')).toBe('Outside a number you set');
    expect(overallLabel('cannot-say', 'en')).toBe('Cannot be said: a fact is UNKNOWN');
    expect(overallLabel('cannot-say', 'fr')).toBe('Impossible à dire : un fait est UNKNOWN');
  });
  it('gives counts only', () => {
    expect(matchCountsText({ total: 4, fits: 1, doesNotFit: 1, cannotSay: 2 }, 'en')).toBe('Places looked through: 4. Within every number: 1. Outside a number: 1. Cannot be said: 2.');
  });
  it('names what is UNKNOWN for a place', () => {
    expect(unknownText(matchPlace('x', simple(), null, null), 'en')).toBe('UNKNOWN: number of steps and width of the entrance door.');
    expect(unknownText(matchPlace('x', simple(), m('x', { steps: 0, doorWidthCm: 90 }), null), 'en')).toBe('');
  });
  it('writes a tally line with the right plural', () => {
    expect(tallyLine({ key: 'steps', places: 2 }, 'en')).toBe('UNKNOWN at 2 places: number of steps.');
    expect(tallyLine({ key: 'doorWidth', places: 1 }, 'fr')).toBe('UNKNOWN pour 1 lieu : largeur de la porte d’entrée.');
  });
  it('says the numbers are the person’s own and the App suggests none', () => {
    expect(yoursText('en')).toMatch(/^The numbers are yours\. The App suggests none, holds no standard and does not say who can use a place\./);
    expect(yoursText('fr')).toContain('le jour de la mesure ; les choses changent.');
    expect(toldCountedText('en')).toContain('Your own measure always comes first.');
  });
  it('has a message for every problem with the form and with a set', () => {
    for (const code of ['not-a-whole-number', 'not-a-length', 'too-small', 'too-large'] as const) expect(criteriaIssueText({ field: 'maxSteps', code }, 'fr')).not.toBe(criteriaIssueText({ field: 'maxSteps', code }, 'en'));
    expect(setIssueText('too-many', 'en')).toBe('The App keeps 6 sets. Remove one before you add another.');
    expect(setIssueText('name-empty', 'fr')).toBe('Donnez d’abord un nom à l’ensemble.');
    expect(setIssueText('nothing-set', 'en')).toBe('Set at least one number first.');
  });
});
