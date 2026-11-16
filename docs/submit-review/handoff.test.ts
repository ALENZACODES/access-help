import { describe, expect, it } from 'vitest';
import { csvCell, handoffText, issuesCsv, licenceSection, tagText } from './handoff.js';
import type { ReviewRecord } from './review.js';
import { reviewBatch } from './review.js';

const TODAY = '2026-11-16';
const a: ReviewRecord = { id: 'a', lat: 43.856123, lon: -79.452341, name: 'Corner café', wheelchair: 'yes', source: 'own site visit', licence: 'ODbL-1.0', observedOn: '2026-11-01' };
const b: ReviewRecord = { id: 'b', lat: 44.1, lon: -80.1, name: null, wheelchair: 'UNKNOWN', source: 'own site visit', licence: 'CC0-1.0', observedOn: '2026-11-02' };
const bad: ReviewRecord = { id: 'c', lat: 45.1, lon: -81.1, name: 'Bad', wheelchair: 'no', source: '', licence: 'MIT', observedOn: '2026-11-02' };

describe('tagText', () => {
  it('writes a heading, position, licence and tag lines per place', () => {
    const text = tagText([a], 'en');
    expect(text).toContain('## 1. Corner café');
    expect(text).toContain('Position: 43.856123, -79.452341');
    expect(text).toContain('Licence: ODbL-1.0');
    expect(text).toContain('wheelchair=yes');
    expect(text).toContain('check_date:wheelchair=2026-11-01');
    expect(text).toContain('source=own site visit');
  });
  it('writes no access tag for UNKNOWN and says why', () => {
    const text = tagText([b], 'en');
    expect(text).not.toContain('wheelchair=');
    expect(text).toContain('UNKNOWN, so no access tag is written');
    expect(text).toContain('Place without a name');
  });
  it('uses decimal commas and a spaced colon in French', () => {
    const text = tagText([a], 'fr');
    expect(text).toContain('43,856123, -79,452341');
    expect(text).toContain('Position : ');
  });
  it('says there are no tags when there is nothing to write', () => {
    expect(tagText([{ ...b, source: '' }], 'en')).toContain('(no tags to write)');
  });
  it('numbers places in the order given', () => {
    const text = tagText([b, a], 'en');
    expect(text.indexOf('## 1.')).toBeLessThan(text.indexOf('## 2. Corner café'));
  });
});

describe('licenceSection', () => {
  it('lists the licences in use in a fixed order', () => {
    const lines = licenceSection([a, b], 'en').join('\n');
    expect(lines.indexOf('CC0')).toBeLessThan(lines.indexOf('ODbL'));
  });
  it('mentions an unaccepted licence', () => {
    expect(licenceSection([bad], 'en').join('\n')).toContain('does not accept');
  });
});

describe('handoffText', () => {
  const batch = reviewBatch([a, b, bad], { today: TODAY });
  const text = handoffText([a, b, bad], batch, TODAY, 'en');
  it('says it was made on this device and nothing was sent', () => {
    expect(text).toContain('Nothing was sent. I submit it myself.');
    expect(text).toContain('Prepared on 2026-11-16');
  });
  it('lists issues under the record they belong to', () => {
    expect(text).toContain('c (Bad)');
    expect(text).toContain('Fix before submitting: No source is given');
  });
  it('leaves a record with a blocker out of the changeset and the tags', () => {
    expect(text).toContain('2 with nothing to fix first.');
    expect(text).not.toContain('## 3.');
    expect(text).toContain('between 2026-11-01 and 2026-11-02');
    expect(text).toContain('comment=Add wheelchair access notes for 2 places');
  });
  it('says nothing is ready when every record has a blocker', () => {
    const only = reviewBatch([bad], { today: TODAY });
    const out = handoffText([bad], only, TODAY, 'en');
    expect(out).toContain('No observation is ready yet.');
    expect(out).not.toContain('# Changeset');
  });
  it('ends with one newline and has no triple line breaks', () => {
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text).not.toMatch(/\n{3,}/);
  });
  it('is written in French when asked', () => {
    const fr = handoffText([a], reviewBatch([a], { today: TODAY }), TODAY, 'fr');
    expect(fr).toContain('Brouillon pour ma propre soumission');
    expect(fr).toContain('# Lot de modifications');
  });
  it('does not change the records it was given', () => {
    const copy = JSON.parse(JSON.stringify([a, b, bad]));
    handoffText([a, b, bad], batch, TODAY, 'en');
    expect([a, b, bad]).toEqual(copy);
  });
});

describe('csv', () => {
  it('neutralises text that a spreadsheet would read as a formula', () => {
    for (const text of ['=1+1', '+1', '@x', '\tx', '-x']) expect(csvCell(text).startsWith("'")).toBe(true);
  });
  it('leaves negative numbers and plain text alone', () => {
    expect(csvCell('-79.4')).toBe('-79.4');
    expect(csvCell('plain')).toBe('plain');
  });
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });
  it('writes one row per issue with a header', () => {
    const csv = issuesCsv(reviewBatch([bad], { today: TODAY }), 'en');
    const rows = csv.trimEnd().split('\r\n');
    expect(rows[0]).toBe('id,severity,note');
    expect(rows.length).toBeGreaterThan(2);
    expect(rows.every((row) => row.startsWith('id,') || row.startsWith('c,'))).toBe(true);
  });
  it('writes a header only when there is nothing to list', () => {
    expect(issuesCsv(reviewBatch([], { today: TODAY }), 'fr')).toBe('id,gravité,note\r\n');
  });
});
