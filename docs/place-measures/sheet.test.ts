import { describe, expect, it } from 'vitest';
import { flat, full, place, sparse } from './fixtures.js';
import { MEASURE_COLUMNS, measureSheetFilename, measureSheetText, measuresCsv, measuresCsvFilename, placeLine } from './sheet.js';

describe('measure sheet', () => {
  it('opens with the place, its record line and the no-judgment line', () => {
    const lines = measureSheetText(place(), full(), 'en').split('\n');
    expect(lines[0]).toBe('Measures: Sample Library');
    expect(lines[1]).toBe('Status: limited. Source: own visit. Licence: CC0-1.0. Seen: 2026-11-10. Tier: UNKNOWN.');
    expect(lines[2]).toMatch(/^These are facts you measured\./);
  });
  it('lists when, how and every fact', () => {
    const text = measureSheetText(place(), full(), 'en');
    expect(text).toContain('Measured on: 2026-11-12.\nHow: With a tape.\nSteps at the entrance: 2\nHighest step: 14 cm (5.5 in)\nEntrance door width: 82.5 cm (32.5 in)\nHow the door opens: With a button\nRamp: No\nWheelchair toilet: Yes\nToilet door width: 86 cm (33.9 in)\n');
  });
  it('writes UNKNOWN for what was not measured and names it', () => {
    const text = measureSheetText(place(), sparse(), 'en');
    expect(text).toContain('Steps at the entrance: UNKNOWN');
    expect(text).toContain('Ramp: UNKNOWN');
    expect(text).toContain('Still UNKNOWN: steps at the entrance,');
  });
  it('gives the description, its length and the tags', () => {
    const text = measureSheetText(place(), flat(), 'en');
    expect(text).toContain('Description for the map\nNo step at the entrance. There is a ramp. The door opens by itself. No wheelchair toilet. Noted on 2026-11-12.\nLength: 110 / 255.');
    expect(text).toContain('Tags to type\nwheelchair:description:en=No step at the entrance.');
    expect(text).toContain('toilets:wheelchair=no\nOpenStreetMap has a free-text key');
  });
  it('never puts a wheelchair status among the tags', () => {
    expect(measureSheetText(place(), full(), 'en')).not.toMatch(/^wheelchair=/m);
  });
  it('writes UNKNOWN for an odd status and a missing source, and names a place without a name', () => {
    const odd = place({ name: ' ', wheelchair: 'maybe', source: '' });
    expect(placeLine(odd, 'en')).toBe('Status: UNKNOWN. Source: UNKNOWN. Licence: CC0-1.0. Seen: 2026-11-10. Tier: UNKNOWN.');
    expect(measureSheetText(odd, full(), 'en').split('\n')[0]).toBe('Measures: Place without a name');
  });
  it('writes the French sheet with French spacing', () => {
    const text = measureSheetText(place(), full(), 'fr');
    expect(text.split('\n')[0]).toBe('Mesures : Sample Library');
    expect(text).toContain('Largeur de la porte d’entrée : 82,5 cm (32,5 po)');
    expect(text).toContain('Niveau : UNKNOWN.');
    expect(text).toContain('wheelchair:description:fr=2 marches');
  });
  it('makes a safe file name from the id', () => {
    expect(measureSheetFilename({ id: 'obs-1' })).toBe('measures-obs-1.txt');
    expect(measureSheetFilename({ id: '../Etc Passwd' })).toBe('measures-etc-passwd.txt');
    expect(measureSheetFilename({ id: '***' })).toBe('measures-observation.txt');
  });
});

describe('measures CSV', () => {
  it('has a header and one line per measured place, with CRLF', () => {
    const lines = measuresCsv([place(), place({ id: 'b', name: null, source: ' ', wheelchair: 'x' }), place({ id: 'c' })], [full(), sparse({ recordId: 'b' })]).split('\r\n');
    expect(lines[0]).toBe(MEASURE_COLUMNS.join(','));
    expect(lines[1]).toBe('a1,Sample Library,limited,own visit,CC0-1.0,2026-11-10,UNKNOWN,2026-11-12,tape,2,14,82.5,button,no,yes,86');
    expect(lines[2]).toBe('b,,UNKNOWN,UNKNOWN,CC0-1.0,2026-11-10,UNKNOWN,2026-11-12,estimate,UNKNOWN,UNKNOWN,80,UNKNOWN,UNKNOWN,UNKNOWN,UNKNOWN');
    expect(lines[3]).toBe('');
  });
  it('writes none for a length that does not apply and 0 for zero steps', () => {
    const line = measuresCsv([place()], [flat()]).split('\r\n')[1];
    expect(line).toBe('a1,Sample Library,limited,own visit,CC0-1.0,2026-11-10,UNKNOWN,2026-11-12,UNKNOWN,0,none,UNKNOWN,automatic,yes,no,none');
  });
  it('never leaves a measured column blank', () => {
    const cells = (measuresCsv([place()], [sparse()]).split('\r\n')[1] ?? '').split(',');
    expect(cells.slice(7).every((cell) => cell !== '')).toBe(true);
  });
  it('quotes a name with a comma and defuses a formula', () => {
    expect(measuresCsv([place({ name: '=SUM(A1), Café' })], [full()]).split('\r\n')[1]).toContain(`"'=SUM(A1), Café"`);
  });
  it('writes only the header when nothing is measured', () => {
    expect(measuresCsv([place()], [])).toBe(`${MEASURE_COLUMNS.join(',')}\r\n`);
  });
  it('names the file by the day it was made', () => {
    expect(measuresCsvFilename('2026-11-19')).toBe('measures-2026-11-19.csv');
  });
});
