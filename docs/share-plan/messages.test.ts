import { describe, expect, it } from 'vitest';
import { awkward, mixed, rec } from './fixtures.js';
import { checklistProgress, creditAskedText, leftOutLines, partDutyLines, partHeading, partSourcesText, scopeCountText, sourceName, sourceRowText, spanText, splitAdvice, splitKindLabel, statusCountsText } from './messages.js';
import { buildSharePlan } from './report.js';
import { sourceRows } from './sources.js';
import { splitPlan } from './split.js';

describe('share-plan words', () => {
  it('writes status counts with the stored words and UNKNOWN in capitals', () => {
    expect(statusCountsText({ yes: 1, limited: 0, no: 2, unknown: 3 }, 'en')).toBe('yes: 1; limited: 0; no: 2; UNKNOWN: 3');
    expect(statusCountsText({ yes: 1, limited: 0, no: 2, unknown: 3 }, 'fr')).toBe('yes : 1 ; limited : 0 ; no : 2 ; UNKNOWN : 3');
  });
  it('writes a source row as one sentence with source, licence, dates and tier', () => {
    const [pack] = sourceRows(mixed());
    expect(pack).toBeDefined();
    if (pack) {
      expect(sourceRowText(pack, 'en')).toBe(
        'Sample open pack. Licence: ODbL-1.0. Records: 2. Seen: 2026-09-15 to 2026-09-20. Status - yes: 0; limited: 1; no: 1; UNKNOWN: 0. Credit: asked. Tier: UNKNOWN.',
      );
      expect(sourceRowText(pack, 'fr')).toContain('Mention : demandée. Niveau : UNKNOWN.');
    }
  });
  it('says so when a row has no source or a licence the App does not take', () => {
    const rows = sourceRows(awkward());
    const other = rows.find((r) => !r.accepted);
    const blank = rows.find((r) => r.source === '');
    if (other) expect(sourceRowText(other, 'en')).toContain('CC-BY-4.0 (the App does not take this licence). ');
    if (other) expect(creditAskedText(other, 'en')).toBe('Cannot be said');
    if (blank) expect(sourceName(blank, 'en')).toBe('No source written');
    if (blank) expect(sourceName(blank, 'fr')).toBe('Aucune source inscrite');
  });
  it('writes a single day without a span', () => {
    expect(spanText('2026-11-10', '2026-11-10', 'en')).toBe('2026-11-10');
    expect(spanText('2026-11-01', '2026-11-10', 'fr')).toBe('du 2026-11-01 au 2026-11-10');
  });
  it('labels each way of splitting and never picks for the person', () => {
    expect(splitKindLabel('one-file', 'en')).toBe('One file is enough');
    expect(splitAdvice('two-files', 'en')).toContain('The App does not pick for you.');
    expect(splitAdvice('two-files', 'fr')).toContain('L’application ne choisit pas pour vous.');
    expect(splitKindLabel('nothing', 'fr')).toBe('Aucune fiche ne peut encore aller dans un fichier');
  });
  it('heads a part with its licence and count, and lists its sources and duties', () => {
    const plan = splitPlan(mixed());
    const [cc0, odbl] = plan.parts;
    if (cc0 && odbl) {
      expect(partHeading(cc0, 'en')).toBe('CC0-1.0 file: 2 records');
      expect(partHeading(odbl, 'fr')).toBe('Fichier ODbL-1.0 : 2 fiches');
      expect(partSourcesText(odbl, 'en')).toBe('Sources: Sample open pack.');
      expect(partDutyLines(cc0, 'en')).toEqual(['Sharing this file asks for nothing.']);
      expect(partDutyLines(odbl, 'en')).toHaveLength(3);
    }
  });
  it('counts what was left out, and says nothing when nothing was', () => {
    expect(leftOutLines(splitPlan(mixed()), 'en')).toEqual([]);
    expect(leftOutLines(splitPlan(awkward()), 'en')).toEqual(['Left out, licence the App does not take: 1.', 'Left out, no source written: 1.']);
  });
  it('reports ticks as counts and says they are the person’s own', () => {
    const plan = buildSharePlan(mixed(), 'en');
    expect(checklistProgress(['read-licence'], plan.checklist, 'en')).toBe('Ticked: 1. Not ticked: 4. The ticks are yours. The App does not know what was done.');
    expect(checklistProgress([], [], 'en')).toBe('There is nothing to share, so there is nothing on the list.');
    expect(checklistProgress([], plan.checklist, 'fr')).toContain('Cochés : 0. Non cochés : 5.');
  });
  it('counts records for a scope with the right plural in each language', () => {
    expect(scopeCountText(1, 'en')).toBe('1 record');
    expect(scopeCountText(0, 'en')).toBe('0 records');
    expect(scopeCountText(0, 'fr')).toBe('0 fiche');
    expect(scopeCountText(2, 'fr')).toBe('2 fiches');
    expect(rec().licence).toBe('CC0-1.0');
  });
});
