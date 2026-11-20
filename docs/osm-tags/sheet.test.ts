import { describe, expect, it } from 'vitest';
import { MAP_TEXT, obs, unknownObs } from './fixtures.js';
import { buildTagSheet, tagSheetFilename, tagSheetText } from './sheet.js';

describe('tag sheet', () => {
  it('puts tags, steps and the changeset draft together', () => {
    const sheet = buildTagSheet(obs(), '', 'en');
    expect(sheet.tags).toHaveLength(4);
    expect(sheet.steps).toHaveLength(8);
    expect(sheet.changeset.comment).not.toBe('');
    expect(sheet).toMatchObject({ heldBack: [], problems: [], pasted: null, comparison: null });
  });
  it('compares only when something readable was pasted', () => {
    expect(buildTagSheet(obs(), '   \n ', 'en').pasted).toBeNull();
    const unread = buildTagSheet(obs(), 'hello there', 'en');
    expect(unread.pasted?.unread).toEqual(['hello there']);
    expect(unread.comparison).toBeNull();
    expect(buildTagSheet(obs(), MAP_TEXT, 'en').comparison?.rows).toHaveLength(6);
  });
  it('holds back the status for an UNKNOWN observation', () => {
    const sheet = buildTagSheet(unknownObs(), '', 'en');
    expect(sheet.tags.map((t) => t.key)).toEqual(['source']);
    expect(sheet.heldBack).toContain('status-unknown');
    expect(sheet.steps).toHaveLength(1);
    expect(sheet.changeset.comment).toBe('');
  });
  it('writes a text sheet that opens with the place, its record line and the no-upload line', () => {
    const lines = tagSheetText(buildTagSheet(obs(), '', 'en'), 'en').split('\n');
    expect(lines[0]).toBe('Tags to type by hand: Sample Library');
    expect(lines[1]).toContain('Tier: UNKNOWN.');
    expect(lines[2]).toMatch(/^The App adds nothing to OpenStreetMap\./);
  });
  it('lists the tags, numbered steps and the draft', () => {
    const text = tagSheetText(buildTagSheet(obs(), '', 'en'), 'en');
    expect(text).toContain('Tags\nname=Sample Library\nwheelchair=yes\ncheck_date:wheelchair=2026-11-10\nsource=own visit\n');
    expect(text).toContain('1. Add only what you saw yourself on 2026-11-10.');
    expect(text).toContain('8. Save in the editor.');
    expect(text).toContain('Changeset draft\ncomment=Wheelchair access for 1 place, seen in person on 2026-11-10.\nsource=own visit');
    expect(text).not.toContain('Beside the tags on the map');
  });
  it('adds the comparison and its cautions when tags were pasted', () => {
    const text = tagSheetText(buildTagSheet(obs(), MAP_TEXT, 'en'), 'en');
    expect(text).toContain('Beside the tags on the map\nTags - to add: 1;');
    expect(text).toContain('- wheelchair | yes | limited | Differs from the map');
    expect(text).toContain('- amenity | - | library | On the map only: leave it');
    expect(text).toContain('! The check date on the map is newer than your observation.');
  });
  it('names a place without a name and shows what was held back', () => {
    const text = tagSheetText(buildTagSheet(unknownObs(), '', 'en'), 'en');
    expect(text.split('\n')[0]).toBe('Tags to type by hand: Place without a name');
    expect(text).toContain('- The status is UNKNOWN, so no wheelchair tag');
    expect(text).not.toContain('comment=');
  });
  it('writes (none) when there is no tag at all', () => {
    expect(tagSheetText(buildTagSheet(obs({ name: null, wheelchair: 'UNKNOWN', source: '' }), '', 'en'), 'en')).toContain('Tags\n(none)\n');
  });
  it('marks a problem with the tags', () => {
    expect(tagSheetText(buildTagSheet(obs({ observedOn: '2026-13-01' }), '', 'en'), 'en')).toContain('! check_date:wheelchair: the date is not a real day');
  });
  it('writes the French sheet with French spacing', () => {
    const text = tagSheetText(buildTagSheet(obs(), MAP_TEXT, 'fr'), 'fr');
    expect(text.split('\n')[0]).toBe('Balises à taper à la main : Sample Library');
    expect(text).toContain('Brouillon du lot de modifications');
    expect(text).toContain('wheelchair=yes');
  });
  it('makes a safe file name from the id', () => {
    expect(tagSheetFilename({ id: 'obs-1' })).toBe('tags-obs-1.txt');
    expect(tagSheetFilename({ id: '../../Etc Passwd!' })).toBe('tags-etc-passwd.txt');
    expect(tagSheetFilename({ id: '***' })).toBe('tags-observation.txt');
    expect(tagSheetFilename({ id: 'a'.repeat(90) }).length).toBeLessThanOrEqual(49);
  });
});
