import { describe, expect, it } from 'vitest';
import { measured, place, sampleLog, told, TODAY } from './fixtures.js';
import { asksFor, setAskStatus } from './log.js';
import { ASK_COLUMNS, askSheetFilename, askSheetText, asksCsv, asksCsvFilename } from './sheet.js';

const asks = () => asksFor(setAskStatus(sampleLog(), 1, 'answered', TODAY), 'a1');

describe('asked-and-answered sheet', () => {
  it('opens with the place, its record line and the note that what was said is kept apart', () => {
    const lines = askSheetText({ place: place(), measured: measured(), told: told(), asks: asks() }, TODAY, 'en').split('\n');
    expect(lines[0]).toBe('Asked and answered: Sample Library');
    expect(lines[1]).toBe('Status: limited. Source: own visit. Licence: CC0-1.0. Seen: 2026-11-10. Tier: UNKNOWN.');
    expect(lines[2]).toMatch(/^What a place tells you is kept apart/);
  });
  it('lists the asks with counts', () => {
    const text = askSheetText({ place: place(), measured: measured(), told: told(), asks: asks() }, TODAY, 'en');
    expect(text).toContain('Your asks\nTimes you asked: 2. Waiting: 1. Answered: 1. No reply: 0.\n1. Asked on 2026-11-11.');
    expect(text).toContain('2. Asked on 2026-11-15. How: phone call.');
  });
  it('sets every fact side by side, labelled by who it came from', () => {
    const text = askSheetText({ place: place(), measured: measured(), told: told(), asks: asks() }, TODAY, 'en');
    expect(text).toContain('The place answered on: 2026-11-16.\nYou measured on: 2026-11-12.');
    expect(text).toContain('- Number of steps | you: 2 | the place: 2 | The same');
    expect(text).toContain('- Width of the entrance door | you: 82.5 cm (32.5 in) | the place: 90 cm (35.4 in) | Differs. The place said 7.5 cm more than you measured.');
    expect(text).toContain('- Ramp | you: UNKNOWN | the place: Yes | Only the place said it');
    expect(text).toContain('- Width of the toilet door | you: UNKNOWN | the place: UNKNOWN | UNKNOWN from both');
  });
  it('writes UNKNOWN on a side that has nothing at all', () => {
    const text = askSheetText({ place: place(), measured: null, told: told(), asks: [] }, TODAY, 'en');
    expect(text).toContain('- Number of steps | you: UNKNOWN | the place: 2 | Only the place said it');
    expect(text).not.toContain('You measured on');
    expect(text).toContain('Times you asked: 0.');
  });
  it('never holds a tag line', () => {
    const text = askSheetText({ place: place(), measured: measured(), told: told(), asks: asks() }, TODAY, 'en');
    expect(text).not.toMatch(/^[\w:]+=/m);
  });
  it('writes the French sheet with French spacing', () => {
    const text = askSheetText({ place: place({ name: null }), measured: measured(), told: told(), asks: asks() }, TODAY, 'fr');
    expect(text.split('\n')[0]).toBe('Demandes et réponses : Lieu sans nom');
    expect(text).toContain('| vous : 82,5 cm (32,5 po) | le lieu : 90 cm (35,4 po) | Diffère. Le lieu a dit 7,5 cm de plus que votre mesure.');
  });
  it('makes a safe file name from the id', () => {
    expect(askSheetFilename({ id: 'obs-1' })).toBe('asked-obs-1.txt');
    expect(askSheetFilename({ id: '../x y' })).toBe('asked-x-y.txt');
    expect(askSheetFilename({ id: '!!' })).toBe('asked-observation.txt');
  });
});

describe('asks CSV', () => {
  it('has a header and one line per ask for a saved place, with CRLF', () => {
    const lines = asksCsv([place(), place({ id: 'a2', name: null })], sampleLog().entries, TODAY).split('\r\n');
    expect(lines[0]).toBe(ASK_COLUMNS.join(','));
    expect(lines[1]).toBe('a1,Sample Library,2026-11-11,email,doorWidthCm toilet,waiting,,8');
    expect(lines[3]).toBe('a2,,2026-11-13,message,doorWidthCm toilet,waiting,,6');
    expect(lines[4]).toBe('');
  });
  it('writes the close day and no days waiting for a closed ask', () => {
    const log = setAskStatus(sampleLog(), 1, 'no-reply', TODAY);
    expect(asksCsv([place()], log.entries, TODAY).split('\r\n')[1]).toBe('a1,Sample Library,2026-11-11,email,doorWidthCm toilet,no-reply,2026-11-19,');
  });
  it('leaves out asks for a place that is not saved', () => {
    expect(asksCsv([place({ id: 'a2' })], sampleLog().entries, TODAY).trim().split('\r\n')).toHaveLength(2);
  });
  it('quotes a name with a comma and defuses a formula', () => {
    expect(asksCsv([place({ name: '@x, y' })], sampleLog().entries, TODAY).split('\r\n')[1]).toContain(`"'@x, y"`);
  });
  it('names the file by the day it was made', () => {
    expect(asksCsvFilename(TODAY)).toBe('asks-2026-11-19.csv');
  });
});
