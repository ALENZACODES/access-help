import { describe, expect, it } from 'vitest';
import { MAX_CARD_CHARACTERS, MAX_CARD_LABEL, buildCard, cardFilename, cardStatus, cleanLine, parseCard, sameCard, serializeCard } from './card.js';
import { ALL, bare, card, measured, source, told, TODAY } from './fixtures.js';

const raw = (change: (file: Record<string, any>) => void): string => {
  const file = JSON.parse(serializeCard(card())) as Record<string, any>;
  change(file);
  return JSON.stringify(file);
};

describe('making a card', () => {
  it('packs the place, its status, source, licence and dates', () => {
    const c = card();
    expect(c).toMatchObject({ app: 'the-app-place-card', v: 1, madeOn: TODAY, from: 'Sam' });
    expect(c.place).toEqual({ name: 'Sample Library', lat: 43.85, lon: -79.43, wheelchair: 'limited', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10' });
  });
  it('carries the measures without the observation id from the sender’s device', () => {
    expect(card().measures).toMatchObject({ recordId: 'card', steps: 2, doorWidthCm: 82.5, method: 'tape' });
    expect(card().told).toMatchObject({ recordId: 'card', ramp: 'yes' });
  });
  it('leaves the map point out when asked', () => {
    expect(card({ withPoint: false }).place).toMatchObject({ lat: null, lon: null });
  });
  it('leaves what the place said out when asked, and keeps the measures', () => {
    const c = card({ withTold: false });
    expect(c.told).toBeNull();
    expect(c.measures).not.toBeNull();
  });
  it('makes a card with no measures at all', () => {
    expect(bare()).toMatchObject({ from: '', measures: null, told: null });
    expect(bare().place).toMatchObject({ name: null, wheelchair: 'UNKNOWN' });
  });
  it('keeps UNKNOWN as UNKNOWN and turns any other odd status into UNKNOWN', () => {
    expect(cardStatus('UNKNOWN')).toBe('UNKNOWN');
    expect(cardStatus('maybe')).toBe('UNKNOWN');
    expect(cardStatus('Yes')).toBe('UNKNOWN');
    expect(cardStatus('no')).toBe('no');
  });
  it('rounds the point to five decimals', () => {
    expect(card({}, { lat: 43.123456789, lon: -79.987654321 }).place).toMatchObject({ lat: 43.12346, lon: -79.98765 });
  });
  it('tidies the label and keeps it short', () => {
    expect(card({ from: '  Sam \n from   the club ' }).from).toBe('Sam from the club');
    expect([...card({ from: 'x'.repeat(90) }).from]).toHaveLength(MAX_CARD_LABEL);
    expect(cleanLine('a\u0000b', 10)).toBe('ab');
    expect(cleanLine(42, 10)).toBe('');
  });
  it('refuses an observation with a licence the App does not take, or a day that is not a day', () => {
    expect(buildCard(source({ licence: 'CC-BY-4.0' }), null, null, ALL, TODAY)).toEqual({ ok: false, code: 'licence-not-open' });
    expect(buildCard(source({ observedOn: 'last week' }), null, null, ALL, TODAY)).toEqual({ ok: false, code: 'date-invalid' });
  });
  it('does not change the observation or the measures it was given', () => {
    const s = source();
    const m = measured();
    const copy = JSON.stringify([s, m]);
    buildCard(s, m, told(), ALL, TODAY);
    expect(JSON.stringify([s, m])).toBe(copy);
  });
  it('names the file from the place name and the day', () => {
    expect(cardFilename(card(), 'json')).toBe('place-card-sample-library-2026-11-19.json');
    expect(cardFilename(bare(), 'txt')).toBe('place-card-place-2026-11-19.txt');
    expect(cardFilename(card({}, { name: 'Café Élan & Co.' }), 'json')).toBe('place-card-cafe-elan-co-2026-11-19.json');
    expect(cardFilename(card({}, { name: '../../etc' }), 'json')).toBe('place-card-etc-2026-11-19.json');
  });
});

describe('reading a card', () => {
  it('reads back a card it wrote, with nothing to note', () => {
    for (const c of [card(), bare(), card({ withPoint: false, withTold: false })]) expect(parseCard(serializeCard(c))).toEqual({ ok: true, card: c, notes: [] });
  });
  it('refuses a file that is too large, is not JSON or is not a card', () => {
    expect(parseCard('x'.repeat(MAX_CARD_CHARACTERS + 1))).toEqual({ ok: false, code: 'too-large' });
    expect(parseCard('{oops')).toEqual({ ok: false, code: 'not-json' });
    for (const text of ['[]', '"card"', '{}', '{"app":"something-else","v":1}']) expect(parseCard(text)).toEqual({ ok: false, code: 'not-a-card' });
  });
  it('refuses another version', () => {
    expect(parseCard(raw((f) => (f.v = 2)))).toEqual({ ok: false, code: 'unsupported-version' });
  });
  it('refuses a card with no usable place', () => {
    expect(parseCard(raw((f) => delete f.place))).toEqual({ ok: false, code: 'bad-place' });
    expect(parseCard(raw((f) => (f.madeOn = 'today')))).toEqual({ ok: false, code: 'bad-place' });
    expect(parseCard(raw((f) => (f.place.observedOn = '2026-13-40')))).toEqual({ ok: false, code: 'bad-place' });
    expect(parseCard(raw((f) => (f.place.source = '  ')))).toEqual({ ok: false, code: 'bad-place' });
  });
  it('refuses a place seen after the card was made', () => {
    expect(parseCard(raw((f) => (f.place.observedOn = '2026-12-01')))).toEqual({ ok: false, code: 'bad-place' });
  });
  it('refuses a licence that is not open', () => {
    expect(parseCard(raw((f) => (f.place.licence = 'All rights reserved')))).toEqual({ ok: false, code: 'licence-not-open' });
  });
  it('turns a status it does not know into UNKNOWN and says so', () => {
    const result = parseCard(raw((f) => (f.place.wheelchair = 'designated')));
    expect(result.ok && result.card.place.wheelchair).toBe('UNKNOWN');
    expect(result.ok && result.notes).toEqual(['status-set-unknown']);
  });
  it('does not note a status that was UNKNOWN to begin with', () => {
    const result = parseCard(serializeCard(bare()));
    expect(result.ok && result.notes).toEqual([]);
  });
  it('leaves out a map point it cannot use and says so', () => {
    for (const change of [(f: Record<string, any>) => (f.place.lat = 'north'), (f: Record<string, any>) => (f.place.lat = 200), (f: Record<string, any>) => (f.place.lon = null)]) {
      const result = parseCard(raw(change));
      expect(result.ok && result.card.place).toMatchObject({ lat: null, lon: null });
      expect(result.ok && result.notes).toEqual(['point-left-out']);
    }
  });
  it('keeps a point outside Ontario but says so', () => {
    const result = parseCard(raw((f) => Object.assign(f.place, { lat: 48.85, lon: 2.35 })));
    expect(result.ok && result.card.place.lat).toBe(48.85);
    expect(result.ok && result.notes).toEqual(['point-outside-ontario']);
  });
  it('turns a number out of range into UNKNOWN, never keeps it', () => {
    const result = parseCard(raw((f) => (f.measures.doorWidthCm = 99999)));
    expect(result.ok && result.card.measures).toMatchObject({ doorWidthCm: null, steps: 2 });
  });
  it('leaves out measures it cannot use at all and says so', () => {
    const result = parseCard(raw((f) => Object.assign(f, { measures: { measuredOn: 'x' }, told: 'yes' })));
    expect(result.ok && [result.card.measures, result.card.told]).toEqual([null, null]);
    expect(result.ok && result.notes).toEqual(['measures-left-out', 'told-left-out']);
  });
  it('keeps nothing extra from the file', () => {
    const result = parseCard(raw((f) => Object.assign(f, { script: '<script>alert(1)</script>', place: { ...f.place, phone: '555', wheelchair: 'yes' } })));
    expect(result.ok && Object.keys(result.card).sort()).toEqual(['app', 'from', 'madeOn', 'measures', 'place', 'told', 'v']);
    expect(result.ok && Object.keys(result.card.place)).not.toContain('phone');
  });
  it('tidies a name and a label that hold line breaks', () => {
    const result = parseCard(raw((f) => Object.assign(f, { from: 'Sam\nline two', place: { ...f.place, name: ' A \t B ' } })));
    expect(result.ok && [result.card.from, result.card.place.name]).toEqual(['Sam line two', 'A B']);
  });
  it('tells two cards apart, and knows the same card', () => {
    expect(sameCard(card(), card())).toBe(true);
    expect(sameCard(card(), card({ from: 'Alex' }))).toBe(false);
    expect(sameCard(card(), card({}, { name: 'Other' }))).toBe(false);
    expect(sameCard(card(), bare())).toBe(false);
  });
});
