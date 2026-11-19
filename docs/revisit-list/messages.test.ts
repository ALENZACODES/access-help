import { describe, expect, it } from 'vitest';
import { place, rec, TODAY } from './fixtures.js';
import { buildRevisitList } from './list.js';
import { coordinatesText, kmText, legText, listSummaryText, orderNoteText, reasonLabel, reasonText, recordLine } from './messages.js';
import { visitOrder } from './order.js';
import { REASONS } from './reasons.js';

describe('reason words', () => {
  for (const lang of ['en', 'fr'] as const) {
    it(`has a different label and sentence for each reason (${lang})`, () => {
      expect(new Set(REASONS.map((r) => reasonLabel(r, lang))).size).toBe(REASONS.length);
      expect(new Set(REASONS.map((r) => reasonText(r, lang))).size).toBe(REASONS.length);
    });
  }
  it('says UNKNOWN is not a no', () => {
    expect(reasonText('status-unknown', 'en')).toBe('Nobody recorded a status here. UNKNOWN is not a no.');
    expect(reasonText('status-unknown', 'fr')).toContain('UNKNOWN n’est pas un non.');
  });
  it('names the age thresholds', () => {
    expect(reasonText('old', 'en')).toContain('365');
    expect(reasonText('very-old', 'en')).toContain('730');
  });
});

describe('record words', () => {
  it('gives status, source, licence, date and tier', () => {
    expect(recordLine(rec(), 'en')).toBe('Status now: yes. Source: sample pack. Licence: CC0-1.0. Seen on 2026-10-01. Tier: UNKNOWN.');
    expect(recordLine(rec({ wheelchair: 'UNKNOWN', licence: 'ODbL-1.0' }), 'fr')).toBe('État actuel : UNKNOWN. Source : sample pack. Licence : ODbL-1.0. Vu le 2026-10-01. Niveau : UNKNOWN.');
  });
  it('writes coordinates to five decimals in each language', () => {
    expect(coordinatesText(rec(), 'en')).toBe('43.85000, -79.43000');
    expect(coordinatesText(rec(), 'fr')).toBe('43,85000 ; -79,43000');
  });
});

describe('distance words', () => {
  const list = buildRevisitList([place({ id: 'a', wheelchair: 'UNKNOWN', lat: 43.851 }), place({ id: 'b', wheelchair: 'UNKNOWN', lat: 43.86 })], TODAY);
  const order = visitOrder(list.items, { lat: 43.85, lon: -79.43 });
  it('says straight line every time', () => {
    expect(kmText(1.2, 'en')).toBe('1.2 km from your start, in a straight line.');
    expect(legText(order.stops[0]!, 'en')).toMatch(/^1\d\d m from your start, in a straight line\.$/);
    expect(legText(order.stops[1]!, 'en')).toMatch(/from the stop before, in a straight line\.$/);
    expect(legText(order.stops[1]!, 'fr')).toMatch(/de l’arrêt précédent, en ligne droite\.$/);
  });
  it('has no leg text for a first stop with no start', () => {
    expect(legText(visitOrder(list.items, null).stops[0]!, 'en')).toBe('');
  });
  it('gives the total and says what the order does not know', () => {
    const text = orderNoteText(order, 'en');
    expect(text).toMatch(/^Straight-line total: /);
    expect(text).toContain('knows nothing about kerbs, slopes, stairs or closures');
  });
  it('leaves the total out for a single stop and says nothing for none', () => {
    expect(orderNoteText(visitOrder(list.items.slice(0, 1), null), 'en')).not.toContain('total');
    expect(orderNoteText(visitOrder([], null), 'en')).toBe('');
  });
});

describe('listSummaryText', () => {
  it('says there is nothing to list with no pack', () => {
    expect(listSummaryText(buildRevisitList([], TODAY), 'en')).toMatch(/^No pack is loaded on this device/);
  });
  it('gives the counts and says what a reason is', () => {
    const text = listSummaryText(buildRevisitList([place(), place({ id: 'u', wheelchair: 'UNKNOWN' })], TODAY), 'en');
    expect(text).toBe('Places looked at: 2. With a reason to revisit: 1. Shown: 1. A reason is a prompt to go and look. It does not say what you will find.');
  });
  it('writes French spacing', () => {
    expect(listSummaryText(buildRevisitList([place()], TODAY), 'fr')).toContain('Lieux examinés : 1.');
  });
});
