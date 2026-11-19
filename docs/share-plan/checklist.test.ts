import { describe, expect, it } from 'vitest';
import { buildChecklist, checklistLines, isCheckId, keepTicks, leftToDo, toggleCheck, type CheckId } from './checklist.js';
import { awkward, mixed, rec } from './fixtures.js';
import { splitPlan } from './split.js';
import { mixOf } from '../licence-guide/index.js';

const listFor = (records: Parameters<typeof splitPlan>[0], lang: 'en' | 'fr' = 'en') => buildChecklist(mixOf(records), splitPlan(records), lang);

describe('checklist before sharing', () => {
  it('is empty when there is nothing to share', () => {
    expect(listFor([])).toEqual([]);
  });
  it('asks only for the licence text and the map reminder when every record is CC0-1.0', () => {
    expect(listFor([rec()]).map((i) => i.id)).toEqual(['read-licence', 'own-eyes-map']);
  });
  it('adds the three ODbL-1.0 items when an ODbL-1.0 record can be shared', () => {
    expect(listFor(mixed()).map((i) => i.id)).toEqual(['read-licence', 'credit-placed', 'same-licence', 'open-copy', 'own-eyes-map']);
  });
  it('adds the left-out items with their counts', () => {
    const items = listFor(awkward());
    expect(items.map((i) => i.id)).toContain('other-left-out');
    expect(items.find((i) => i.id === 'other-left-out')?.text).toBe('I left out the 1 record under a licence the App does not take.');
    expect(items.find((i) => i.id === 'no-source-left-out')?.text).toBe('I left out the 1 record with no source, or I wrote the source in.');
  });
  it('gives every item a reason', () => {
    for (const lang of ['en', 'fr'] as const) for (const entry of listFor(awkward(), lang)) expect(entry.why.length).toBeGreaterThan(10);
  });
  it('ticks and unticks an item on the list', () => {
    const items = listFor(mixed());
    const one = toggleCheck([], 'credit-placed', items);
    expect(one).toEqual(['credit-placed']);
    expect(toggleCheck(one, 'credit-placed', items)).toEqual([]);
  });
  it('ignores an id that is not on the list', () => {
    const items = listFor([rec()]);
    expect(toggleCheck([], 'credit-placed', items)).toEqual([]);
    expect(toggleCheck([], 'nonsense', items)).toEqual([]);
    expect(isCheckId('nonsense')).toBe(false);
    expect(isCheckId('open-copy')).toBe(true);
  });
  it('drops ticks for items that no longer apply', () => {
    const done: CheckId[] = ['read-licence', 'credit-placed'];
    expect(keepTicks(done, listFor([rec()]))).toEqual(['read-licence']);
  });
  it('counts what is left', () => {
    const items = listFor(mixed());
    expect(leftToDo([], items)).toBe(5);
    expect(leftToDo(['read-licence', 'open-copy'], items)).toBe(3);
  });
  it('writes the list with a box per item', () => {
    const items = listFor([rec()]);
    expect(checklistLines(items, ['read-licence'])).toEqual(['[x] I read the licence text for the records I am sharing.', '[ ] For OpenStreetMap, I add only what I saw myself.']);
  });
  it('writes the French items in the first person', () => {
    expect(listFor(awkward(), 'fr').find((i) => i.id === 'other-left-out')?.text).toBe('J’ai laissé de côté 1 fiche sous une licence que l’application ne prend pas.');
  });
});
