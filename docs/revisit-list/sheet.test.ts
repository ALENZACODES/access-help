import { describe, expect, it } from 'vitest';
import { place, TODAY } from './fixtures.js';
import { buildRevisitList } from './list.js';
import { visitOrder } from './order.js';
import { fieldSheetText, FILL_COLUMNS, fillInCsv, revisitFilename, sheetCell } from './sheet.js';
import { readSheet } from '../sheet-import/read.js';

const list = buildRevisitList(
  [
    place({ id: 'a', wheelchair: 'UNKNOWN', lat: 43.851 }),
    place({ id: 'b', name: null, observedOn: '2020-01-01', lat: 43.86, licence: 'ODbL-1.0' }),
    place({ id: 'c', name: '=Odd; "name"', wheelchair: 'UNKNOWN', lat: 43.87 }),
  ],
  TODAY,
);
const order = visitOrder(list.items, { lat: 43.85, lon: -79.43 });

describe('sheetCell', () => {
  it('quotes and guards', () => {
    expect(sheetCell('a;b')).toBe('"a;b"');
    expect(sheetCell('@x').startsWith("'")).toBe(true);
    expect(sheetCell('plain')).toBe('plain');
  });
});

describe('fillInCsv', () => {
  const csv = fillInCsv(order, 'en');
  const lines = csv.replace(/^﻿/, '').trimEnd().split('\r\n');
  it('starts with the fixed header and has one line per stop', () => {
    expect(lines[0]).toBe(FILL_COLUMNS.join(','));
    expect(lines).toHaveLength(order.stops.length + 1);
  });
  it('is in visiting order', () => expect(lines.slice(1).map((l) => l.split(',')[0])).toEqual(order.stops.map((s) => s.item.place.record.id)));
  it('leaves status, source, licence and date empty for the person to fill', () => {
    expect(lines[1]).toMatch(/^a,Sample Library,,43\.851,-79\.43,,,,UNKNOWN,2026-10-01,/);
  });
  it('keeps what the pack says in its own columns', () => expect(lines.find((l) => l.startsWith('b,'))).toContain(',yes,2020-01-01,'));
  it('guards a name that starts like a formula', () => expect(csv).toContain(`"'=Odd; ""name"""`));
  it('is read by the sheet import, which rejects every line until the person fills it in', () => {
    const out = readSheet(csv, TODAY);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.headers.missing).toEqual([]);
    expect(out.headers.unkept).toEqual(['pack_status', 'pack_observed_on', 'reasons']);
    expect(out.rows.every((r) => !r.ok)).toBe(true);
  });
  it('is accepted by the sheet import once a line is filled in, with the empty status kept as UNKNOWN', () => {
    const filled = csv.replace('a,Sample Library,,43.851,-79.43,,,,', `a,Sample Library,,43.851,-79.43,own visit,CC0-1.0,${TODAY},`);
    const out = readSheet(filled, TODAY);
    const row = out.ok ? out.rows.find((r) => r.ok) : undefined;
    expect(row?.ok && row.record).toMatchObject({ id: 'a', wheelchair: 'UNKNOWN', source: 'own visit', licence: 'CC0-1.0' });
  });
  it('writes the reasons in the asked language', () => expect(fillInCsv(order, 'fr')).toContain('L’état est UNKNOWN'));
});

describe('fieldSheetText', () => {
  const text = fieldSheetText(list, order, TODAY, 'en');
  it('starts with the day, the summary and the order note', () => {
    const lines = text.split('\n');
    expect(lines[0]).toBe('Places to revisit, made 2026-11-18');
    expect(lines[1]).toContain('With a reason to revisit: 3.');
    expect(lines[2]).toContain('Straight-line total');
  });
  it('tells the person to write only what they see', () => expect(text).toContain('If you cannot tell, leave it as UNKNOWN.'));
  it('numbers the stops and gives each its record line, reasons and tick boxes', () => {
    expect(text).toContain('1. Sample Library (a)');
    expect(text).toContain('Status now: UNKNOWN. Source: sample pack. Licence: CC0-1.0. Seen on 2026-10-01. Tier: UNKNOWN.');
    expect(text).toContain('Why - Status is UNKNOWN');
    expect(text.match(/\[ \] yes  \[ \] limited  \[ \] no  \[ \] UNKNOWN/g)).toHaveLength(3);
  });
  it('names an unnamed place plainly', () => expect(text).toContain('Place without a name (b)'));
  it('is in French when asked', () => {
    const fr = fieldSheetText(list, order, TODAY, 'fr');
    expect(fr.split('\n')[0]).toBe('Lieux à revoir, liste du 2026-11-18');
    expect(fr).toContain('Vu aujourd’hui');
  });
  it('is a short note with no stops', () => {
    const empty = buildRevisitList([], TODAY);
    expect(fieldSheetText(empty, visitOrder([], null), TODAY, 'en').split('\n').filter((l) => l !== '')).toHaveLength(3);
  });
});

describe('revisitFilename', () => {
  it('names each file by day', () => {
    expect(revisitFilename('txt', TODAY)).toBe('places-to-revisit-2026-11-18.txt');
    expect(revisitFilename('csv', TODAY)).toBe('places-to-revisit-fill-in-2026-11-18.csv');
  });
});
