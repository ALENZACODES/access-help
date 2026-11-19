import { describe, expect, it } from 'vitest';
import { awkward, mixed, rec, TODAY } from './fixtures.js';
import { buildSharePlan, sharePlanFilename, sharePlanText } from './report.js';

describe('share plan', () => {
  it('puts the mix, rows, statuses, split, notice and checklist together', () => {
    const plan = buildSharePlan(mixed(), 'en');
    expect(plan.mix.kind).toBe('cc0-and-odbl');
    expect(plan.rows).toHaveLength(2);
    expect(plan.statuses).toEqual({ yes: 1, limited: 1, no: 1, unknown: 1 });
    expect(plan.split.kind).toBe('two-files');
    expect(plan.notice.form).toBe('short');
    expect(plan.checklist).toHaveLength(5);
  });
  it('builds the full notice when asked', () => {
    expect(buildSharePlan(mixed(), 'en', 'full').notice.form).toBe('full');
  });
  it('is empty but well formed for no records', () => {
    const plan = buildSharePlan([], 'en');
    expect(plan.mix.kind).toBe('empty');
    expect(plan.rows).toEqual([]);
    expect(plan.checklist).toEqual([]);
    expect(plan.notice.text).toBe('');
  });
  it('writes a text file that opens with the day and the not-advice line', () => {
    const text = sharePlanText(buildSharePlan(mixed(), 'en'), [], TODAY, 'en');
    const lines = text.split('\n');
    expect(lines[0]).toBe('Sharing plan, 2026-11-19');
    expect(lines[1]).toBe('This is a short summary, not legal advice. Read the licence text before you share data.');
    expect(text.endsWith('\n')).toBe(true);
  });
  it('lists the sources, both files, the notice and the checklist in the text', () => {
    const text = sharePlanText(buildSharePlan(mixed(), 'en'), ['read-licence'], TODAY, 'en');
    expect(text).toContain('- Sample open pack. Licence: ODbL-1.0.');
    expect(text).toContain('Two files keep the duties apart');
    expect(text).toContain('CC0-1.0 file: 2 records');
    expect(text).toContain('ODbL-1.0 file: 2 records');
    expect(text).toContain('Notice\nContains data from Sample open pack, under ODbL-1.0.');
    expect(text).toContain('[x] I read the licence text for the records I am sharing.');
    expect(text).toContain('[ ] The credit for the ODbL-1.0 sources is where people will see it.');
    expect(text).toContain('Ticked: 1. Not ticked: 4.');
  });
  it('says what was left out', () => {
    const text = sharePlanText(buildSharePlan(awkward(), 'en'), [], TODAY, 'en');
    expect(text).toContain('Left out, licence the App does not take: 1.');
    expect(text).toContain('Left out, no source written: 1.');
    expect(text).toContain('Licence for a combined file: cannot be said.');
  });
  it('drops a tick for an item that is not on this list', () => {
    const text = sharePlanText(buildSharePlan([rec()], 'en'), ['credit-placed'], TODAY, 'en');
    expect(text).toContain('Ticked: 0. Not ticked: 2.');
  });
  it('leaves out the sections that have nothing in them', () => {
    const text = sharePlanText(buildSharePlan([], 'en'), [], TODAY, 'en');
    expect(text).not.toContain('Notice');
    expect(text).not.toContain('Before sharing');
    expect(text).toContain('No record can go into a file yet');
  });
  it('writes the French file with French spacing', () => {
    const text = sharePlanText(buildSharePlan(mixed(), 'fr'), [], TODAY, 'fr');
    expect(text.split('\n')[0]).toBe('Plan de partage, 2026-11-19');
    expect(text).toContain('Fichier ODbL-1.0 : 2 fiches');
    expect(text).toContain('Avant de partager');
  });
  it('names the file by the day it was made', () => {
    expect(sharePlanFilename(TODAY)).toBe('sharing-plan-2026-11-19.txt');
  });
});
