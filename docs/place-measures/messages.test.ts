import { describe, expect, it } from 'vitest';
import { describeMeasures } from './describe.js';
import { flat, full, sparse } from './fixtures.js';
import { FACT_KEYS } from './measures.js';
import { descriptionNote, factLabel, factValue, formIssueText, measuredCountText, methodText, noJudgmentText, rangeHint, stillUnknownText, tagsNoteText } from './messages.js';

describe('words for the measuring page', () => {
  it('labels every fact in both languages', () => {
    for (const key of FACT_KEYS) {
      expect(factLabel(key, 'en').length).toBeGreaterThan(3);
      expect(factLabel(key, 'fr')).not.toBe(factLabel(key, 'en') === 'Ramp' ? '' : factLabel(key, 'en'));
    }
    expect(factLabel('doorWidthCm', 'fr')).toBe('Largeur de la porte d’entrée');
  });
  it('writes lengths in centimetres with inches beside them', () => {
    expect(factValue(full(), 'doorWidthCm', 'en')).toBe('82.5 cm (32.5 in)');
    expect(factValue(full(), 'stepHeightCm', 'fr')).toBe('14 cm (5,5 po)');
  });
  it('writes a fact nobody measured as UNKNOWN in both languages', () => {
    for (const key of ['steps', 'doorOpening', 'ramp', 'toilet', 'stepHeightCm', 'toiletDoorCm'] as const) {
      expect(factValue(sparse(), key, 'en')).toBe('UNKNOWN');
      expect(factValue(sparse(), key, 'fr')).toBe('UNKNOWN');
    }
  });
  it('says there is nothing to measure where a fact does not apply', () => {
    expect(factValue(flat(), 'stepHeightCm', 'en')).toBe('No step to measure');
    expect(factValue(flat(), 'toiletDoorCm', 'fr')).toBe('Aucune porte de toilette à mesurer');
  });
  it('writes zero steps as 0, not as UNKNOWN', () => {
    expect(factValue(flat(), 'steps', 'en')).toBe('0');
  });
  it('words the choices', () => {
    expect(factValue(full(), 'ramp', 'en')).toBe('No');
    expect(factValue(full(), 'toilet', 'fr')).toBe('Oui');
    expect(factValue(full(), 'doorOpening', 'en')).toBe('With a button');
    expect(methodText(full(), 'fr')).toBe('Au ruban');
    expect(methodText({ method: null }, 'en')).toBe('UNKNOWN');
  });
  it('names what is still UNKNOWN, and says nothing when nothing is', () => {
    expect(stillUnknownText(flat(), 'en')).toBe('Still UNKNOWN: entrance door width.');
    expect(stillUnknownText(sparse(), 'fr')).toBe('Encore UNKNOWN : marches à l’entrée, marche la plus haute, ouverture de la porte, rampe, toilette pour fauteuil roulant et largeur de la porte de la toilette.');
    expect(stillUnknownText(full(), 'en')).toBe('');
  });
  it('has a message for every form problem', () => {
    for (const code of ['date-invalid', 'date-future', 'date-before-seen', 'not-a-whole-number', 'not-a-length', 'too-small', 'too-large', 'height-without-steps', 'toilet-door-without-toilet', 'nothing-measured'] as const) {
      expect(formIssueText({ field: 'steps', code }, 'en').length).toBeGreaterThan(10);
      expect(formIssueText({ field: 'steps', code }, 'fr')).not.toBe(formIssueText({ field: 'steps', code }, 'en'));
    }
    expect(formIssueText({ field: 'doorWidth', code: 'not-a-length' }, 'en')).toBe('Write a length, such as 82, 82.5 cm or 32 in.');
  });
  it('gives the range the App keeps for a length', () => {
    expect(rangeHint('doorWidthCm', 'en')).toBe('In centimetres, or with "in" for inches. From 30 cm to 400 cm.');
    expect(rangeHint('stepHeightCm', 'fr')).toBe('En centimètres, ou avec « po » pour des pouces. De 0,5 cm à 60 cm.');
  });
  it('notes the length of the description and when it is too long', () => {
    expect(descriptionNote(describeMeasures(full(), 'en'), 'en')).toBe('Length: 189 / 255.');
    expect(descriptionNote({ text: 'x', length: 300, tooLong: true }, 'en')).toBe('Length: 300 / 255. This is longer than OpenStreetMap keeps, so it is not among the tags.');
    expect(descriptionNote({ text: '', length: 0, tooLong: false }, 'fr')).toBe('Rien n’a été mesuré, donc il n’y a pas de description.');
  });
  it('says the facts are not a judgment about who can use the place', () => {
    expect(noJudgmentText('en')).toContain('does not say who can use the place');
    expect(noJudgmentText('fr')).toContain('ne dit pas qui peut utiliser le lieu');
  });
  it('says which keys exist and that the App adds nothing to the map', () => {
    expect(tagsNoteText('en')).toContain('It has no settled key for step counts or door widths at an entrance');
    expect(tagsNoteText('fr')).toContain('vous-même ; l’application n’ajoute rien à la carte.');
  });
  it('counts observations with and without measures', () => {
    expect(measuredCountText(2, 5, 'en')).toBe('Observations with measures: 2. Without: 3.');
    expect(measuredCountText(0, 0, 'fr')).toBe('Observations avec des mesures : 0. Sans : 0.');
    expect(measuredCountText(3, 2, 'en')).toBe('Observations with measures: 3. Without: 0.');
  });
});
