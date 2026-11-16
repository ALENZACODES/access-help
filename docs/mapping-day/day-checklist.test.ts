import { describe, expect, it } from 'vitest';
import { CHECKLIST_GROUPS, DAY_CHECKLIST, GROUP_TITLE, checklistIds, cleanTicks, itemsIn, progress, progressText, setTick } from './day-checklist';
import { allStrings, bannedIn, lintFrench } from './day-lint.test';

describe('the list', () => {
  it('has distinct ids and every group has items', () => {
    const ids = checklistIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const group of CHECKLIST_GROUPS) expect(itemsIn(group).length, group).toBeGreaterThanOrEqual(2);
  });
  it('has both languages for every item and group, with no banned word and correct French', () => {
    for (const item of DAY_CHECKLIST) {
      expect(item.text.en.length, item.id).toBeGreaterThan(25);
      expect(item.text.fr.length, item.id).toBeGreaterThan(25);
      expect(bannedIn(item.text.en + item.text.fr), item.id).toEqual([]);
      expect(lintFrench(item.text.fr), item.id).toEqual([]);
    }
    for (const title of Object.values(GROUP_TITLE)) expect(lintFrench(title.fr)).toEqual([]);
    expect(allStrings(GROUP_TITLE)).toHaveLength(CHECKLIST_GROUPS.length * 2);
  });
  it('tells the person UNKNOWN is a normal answer and a blank is not "no"', () => {
    const text = DAY_CHECKLIST.map((i) => i.text.en).join(' ');
    expect(text).toMatch(/leave it UNKNOWN/);
    expect(text).toMatch(/A blank is not “no”/);
  });
  it('tells the person to record only what they saw themselves', () => {
    expect(DAY_CHECKLIST.find((i) => i.id === 'own-observation')?.text.en).toMatch(/Record only what you saw or measured yourself/);
  });
  it('gives no medical, legal or eligibility advice', () => {
    const all = DAY_CHECKLIST.map((i) => `${i.text.en} ${i.text.fr}`).join(' ');
    expect(all).not.toMatch(/doctor|medical|medication|eligible|eligib|admissib|médecin|médic|legal|law\b|juridique/i);
  });
});

describe('ticks', () => {
  it('sets and clears one item without changing the original', () => {
    const a = {};
    const b = setTick(a, 'charge', true);
    expect(a).toEqual({});
    expect(b).toEqual({ charge: true });
    expect(setTick(b, 'charge', false)).toEqual({});
  });
  it('ignores an id that is not on the list', () => {
    expect(setTick({}, 'nonsense', true)).toEqual({});
  });
  it('cleans ticks read back from storage', () => {
    expect(cleanTicks({ charge: true, nonsense: true, licence: 'yes', rules: false })).toEqual({ charge: true });
    for (const bad of [null, 3, 'x', [], undefined]) expect(cleanTicks(bad)).toEqual({});
  });
});

describe('progress', () => {
  it('counts what is done and lists what remains in list order', () => {
    const p = progress({ charge: true, licence: true });
    expect(p.done).toBe(2);
    expect(p.total).toBe(DAY_CHECKLIST.length);
    expect(p.remaining).toEqual(checklistIds().filter((id) => id !== 'charge' && id !== 'licence'));
  });
  it('counts one group', () => {
    const p = progress({ charge: true }, 'before');
    expect(p.total).toBe(itemsIn('before').length);
    expect(p.done).toBe(1);
  });
  it('is all done when everything is ticked', () => {
    const all = Object.fromEntries(checklistIds().map((id) => [id, true]));
    expect(progress(all).remaining).toEqual([]);
  });
  it('words progress in both languages as ticks, not as a score', () => {
    expect(progressText({ done: 3, total: 12, remaining: [] }, 'en')).toBe('3 of 12 ticked');
    expect(progressText({ done: 3, total: 12, remaining: [] }, 'fr')).toBe('3 sur 12 cochés');
  });
});
