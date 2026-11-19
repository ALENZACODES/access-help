import { describe, expect, it } from 'vitest';
import { buildDayLog, logTotals } from './days.js';
import { log, sample } from './fixtures.js';
import { calendarCellText, dayCountText, dayHeading, dayStatLines, gapText, logNoteLine, spanText, statusCountsText, totalsLines } from './messages.js';

const dayLog = buildDayLog(sample());

describe('small words', () => {
  it('lists every status, UNKNOWN included, with French spacing', () => {
    expect(statusCountsText({ yes: 1, limited: 0, no: 2, UNKNOWN: 3 }, 'en')).toBe('yes: 1; limited: 0; no: 2; UNKNOWN: 3');
    expect(statusCountsText({ yes: 1, limited: 0, no: 2, UNKNOWN: 3 }, 'fr')).toBe('yes : 1 ; limited : 0 ; no : 2 ; UNKNOWN : 3');
  });
  it('writes the day in full with its date, or just the text for a bad date', () => {
    expect(dayHeading('2026-11-10', 'en')).toBe('Tuesday, 10 November 2026 (2026-11-10)');
    expect(dayHeading('nope', 'en')).toBe('nope');
  });
  it('counts observations with the right plural', () => {
    expect(dayCountText(1, 'en')).toBe('1 observation');
    expect(dayCountText(2, 'fr')).toBe('2 observations');
  });
  it('says how long after the previous day, or that it is the earliest', () => {
    expect(gapText(null, 'en')).toBe('This is the earliest day in your log.');
    expect(gapText(1, 'en')).toBe('1 day after the day before it in your log.');
    expect(gapText(11, 'fr')).toBe('11 jours après le jour précédent de votre journal.');
  });
  it('gives the spread only for two or more places, and says straight line', () => {
    expect(spanText(1100, 1, 'en')).toBe('');
    expect(spanText(1100, 2, 'en')).toBe('The places are spread over 1.1 km, in a straight line.');
  });
  it('labels a calendar cell with its count', () => {
    expect(calendarCellText(10, 0, 'en')).toBe('10');
    expect(calendarCellText(10, 2, 'en')).toBe('10, 2 observations');
  });
});

describe('dayStatLines', () => {
  it('gives counts, licences, sources, unnamed, spread and gap for a day', () => {
    expect(dayStatLines(dayLog.days[1]!, 'en')).toEqual([
      'Observations: 2.',
      'By status - yes: 1; limited: 0; no: 0; UNKNOWN: 1.',
      'Licences - CC0-1.0: 1; ODbL-1.0: 1.',
      'Sources: field notes and own visit.',
      'Without a name: 1.',
      'The places are spread over 1.1 km, in a straight line.',
      '11 days after the day before it in your log.',
    ]);
  });
  it('leaves out lines that do not apply', () => {
    expect(dayStatLines(dayLog.days[2]!, 'en')).toHaveLength(5);
  });
});

describe('logNoteLine', () => {
  it('gives status, source, licence, date and tier', () => {
    expect(logNoteLine(log(), 'en')).toBe('Status: yes. Source: own visit. Licence: CC0-1.0. Seen on 2026-11-10. Tier: UNKNOWN.');
    expect(logNoteLine(log({ wheelchair: 'UNKNOWN' }), 'fr')).toContain('Niveau : UNKNOWN.');
  });
});

describe('totalsLines', () => {
  it('says there is nothing saved', () => expect(totalsLines(logTotals(buildDayLog([])), 'en')).toEqual(['You have no saved observations.']));
  it('gives the totals and says counts are only counts', () => {
    expect(totalsLines(logTotals(dayLog), 'en')).toEqual([
      'Days with observations: 3.',
      'Observations: 5.',
      'By status - yes: 2; limited: 1; no: 1; UNKNOWN: 1.',
      'From 2026-10-30 to 2026-11-12.',
      'Day with the most observations: 2026-11-10.',
      'With a date that is not a real day: 1.',
      'These are counts of what you saved. They do not say a day is finished.',
    ]);
  });
  it('writes French spacing', () => expect(totalsLines(logTotals(dayLog), 'fr')[0]).toBe('Jours avec des observations : 3.'));
});
