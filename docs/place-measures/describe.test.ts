import { describe, expect, it } from 'vitest';
import { MAX_DESCRIPTION, describeMeasures, factSentences, measureTagText, measureTags, methodSentence } from './describe.js';
import { flat, full, sparse } from './fixtures.js';
import { emptyMeasures } from './measures.js';

describe('description for the map', () => {
  it('writes every measured fact, then how and when', () => {
    expect(describeMeasures(full(), 'en')).toEqual({
      text: '2 steps at the entrance, highest 14 cm. No ramp. Entrance door 82.5 cm wide. The door opens with a button. There is a wheelchair toilet, door 86 cm wide. Measured with a tape on 2026-11-12.',
      length: 189,
      tooLong: false,
    });
  });
  it('says "about" for an estimate and leaves UNKNOWN facts out', () => {
    expect(describeMeasures(sparse(), 'en').text).toBe('Entrance door about 80 cm wide. Estimated by eye on 2026-11-12.');
  });
  it('says there is no step, and no wheelchair toilet, as facts', () => {
    expect(describeMeasures(flat(), 'en').text).toBe('No step at the entrance. There is a ramp. The door opens by itself. No wheelchair toilet. Noted on 2026-11-12.');
  });
  it('is empty when nothing was measured', () => {
    expect(describeMeasures(emptyMeasures('a1', '2026-11-12'), 'en')).toEqual({ text: '', length: 0, tooLong: false });
    expect(factSentences(emptyMeasures('a1', '2026-11-12'), 'en')).toEqual([]);
  });
  it('uses the singular for one step and leaves out a height nobody measured', () => {
    expect(factSentences(full({ steps: 1, stepHeightCm: null }), 'en')[0]).toBe('1 step at the entrance.');
    expect(factSentences(full({ steps: 1 }), 'fr')[0]).toBe('1 marche à l’entrée, la plus haute 14 cm.');
  });
  it('writes a step height on its own when the count is UNKNOWN', () => {
    expect(factSentences(sparse({ doorWidthCm: null, stepHeightCm: 9 }), 'en')).toEqual(['Highest step at the entrance about 9 cm.']);
  });
  it('writes a toilet door on its own when the toilet answer is UNKNOWN', () => {
    expect(factSentences(sparse({ doorWidthCm: null, toiletDoorCm: 90, method: 'tape' }), 'en')).toEqual(['Toilet door 90 cm wide.']);
  });
  it('words each way a door opens', () => {
    expect(factSentences(sparse({ doorWidthCm: null, doorOpening: 'manual' }), 'en')).toEqual(['The door is opened by hand.']);
    expect(factSentences(sparse({ doorWidthCm: null, doorOpening: 'automatic' }), 'fr')).toEqual(['La porte s’ouvre toute seule.']);
  });
  it('writes French with a decimal comma, and joins "de" and "environ" properly', () => {
    expect(describeMeasures(full(), 'fr').text).toBe(
      '2 marches à l’entrée, la plus haute 14 cm. Aucune rampe. Porte d’entrée large de 82,5 cm. La porte s’ouvre avec un bouton. Il y a une toilette pour fauteuil roulant, porte large de 86 cm. Mesuré au ruban le 2026-11-12.',
    );
    expect(describeMeasures(sparse(), 'fr').text).toBe('Porte d’entrée large d’environ 80 cm. Estimé à l’œil le 2026-11-12.');
  });
  it('words how the facts were taken', () => {
    expect(methodSentence(full(), 'en')).toBe('Measured with a tape on 2026-11-12.');
    expect(methodSentence(full({ method: null }), 'en')).toBe('Noted on 2026-11-12.');
    expect(methodSentence(full({ method: 'estimate' }), 'fr')).toBe('Estimé à l’œil le 2026-11-12.');
  });
  it('stays inside what OpenStreetMap keeps for every full set of measures', () => {
    for (const lang of ['en', 'fr'] as const) {
      const widest = describeMeasures(full({ steps: 60, stepHeightCm: 59.5, doorWidthCm: 399.5, toiletDoorCm: 249.5, method: 'estimate' }), lang);
      expect(widest.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
      expect(widest.tooLong).toBe(false);
    }
  });
  it('counts length as a reader sees it', () => {
    const d = describeMeasures(full(), 'fr');
    expect(d.length).toBe([...d.text].length);
  });
});

describe('tags from measures', () => {
  it('writes the description under the key for its language, and the toilet answer', () => {
    const tags = measureTags(full(), 'en');
    expect(tags.map((t) => t.key)).toEqual(['wheelchair:description:en', 'toilets:wheelchair']);
    expect(tags[0]?.value).toBe(describeMeasures(full(), 'en').text);
    expect(tags[1]?.value).toBe('yes');
    expect(measureTags(full(), 'fr')[0]?.key).toBe('wheelchair:description:fr');
  });
  it('writes no toilet tag when the toilet answer is UNKNOWN', () => {
    expect(measureTags(sparse(), 'en').map((t) => t.key)).toEqual(['wheelchair:description:en']);
  });
  it('writes toilets:wheelchair=no when the person noted there is none', () => {
    expect(measureTags(flat(), 'en')[1]).toEqual({ key: 'toilets:wheelchair', value: 'no' });
  });
  it('writes no tag when nothing was measured', () => {
    expect(measureTags(emptyMeasures('a1', '2026-11-12'), 'en')).toEqual([]);
  });
  it('never writes a wheelchair status', () => {
    for (const m of [full(), sparse(), flat()]) expect(measureTags(m, 'en').some((t) => t.key === 'wheelchair')).toBe(false);
  });
  it('writes tags as key=value lines', () => {
    expect(measureTagText(measureTags(flat(), 'en'))).toBe('wheelchair:description:en=No step at the entrance. There is a ramp. The door opens by itself. No wheelchair toilet. Noted on 2026-11-12.\ntoilets:wheelchair=no');
    expect(measureTagText([])).toBe('');
  });
});
