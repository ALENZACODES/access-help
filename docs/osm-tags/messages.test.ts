import { describe, expect, it } from 'vitest';
import { changesetDraft } from './changeset.js';
import { compareTags } from './diff.js';
import { MAP_TEXT, obs, unknownObs } from './fixtures.js';
import { cautionText, changesetNotes, comparisonSummary, diffKindLabel, heldBackText, neverUploadsText, parsedNotes, problemText, recordLine } from './messages.js';
import { parseTagText } from './parse.js';
import { tagsFor } from './tags.js';

describe('tag page words', () => {
  it('says UNKNOWN is never turned into a status', () => {
    expect(heldBackText('status-unknown', 'en')).toContain('UNKNOWN is never turned into yes, limited or no.');
    expect(heldBackText('status-unknown', 'fr')).toContain('UNKNOWN n’est jamais changé en yes, limited ou no.');
  });
  it('names the key in every problem', () => {
    for (const kind of ['too-long', 'empty-value', 'control-character', 'repeated-key', 'bad-date'] as const) {
      expect(problemText({ kind, key: 'source' }, 'en').startsWith('source: ')).toBe(true);
      expect(problemText({ kind, key: 'source' }, 'fr').startsWith('source : ')).toBe(true);
    }
  });
  it('labels each kind of difference and tells the person to leave map-only tags', () => {
    expect(diffKindLabel('add', 'en')).toBe('Would be added');
    expect(diffKindLabel('only-on-map', 'en')).toBe('On the map only: leave it');
    expect(diffKindLabel('differs', 'fr')).toBe('Diffère de la carte');
  });
  it('marks neither side as wrong when the status differs', () => {
    expect(cautionText('status-differs', 'en')).toContain('Neither is marked as wrong here.');
  });
  it('sums up a comparison as counts', () => {
    const c = compareTags(tagsFor(obs()), parseTagText(MAP_TEXT).tags);
    expect(comparisonSummary(c, 'en')).toBe('Tags - to add: 1; the same: 0; different: 3; on the map only: 2.');
    expect(comparisonSummary(c, 'fr')).toBe('Balises - à ajouter : 1 ; identiques : 0 ; différentes : 3 ; sur la carte seulement : 2.');
  });
  it('says so when typing would change nothing', () => {
    const mine = tagsFor(obs());
    expect(comparisonSummary(compareTags(mine, mine), 'en')).toBe('Tags - to add: 0; the same: 4; different: 0; on the map only: 0. Typing your tags would change nothing.');
  });
  it('notes unread lines, repeated keys and a cut-off paste', () => {
    expect(parsedNotes(parseTagText('wheelchair=yes'), 'en')).toEqual([]);
    expect(parsedNotes(parseTagText('hello\nname=A\nname=B'), 'en')).toEqual(['Lines the App could not read as key=value: 1.', 'Keys pasted more than once, last value kept: name.']);
    const many = Array.from({ length: 201 }, (_, i) => `k${i}=v`).join('\n');
    expect(parsedNotes(parseTagText(many), 'en')).toEqual(['Only the first 200 lines were read.']);
  });
  it('notes the comment length and that it is a draft', () => {
    const notes = changesetNotes(changesetDraft([obs()], 'en'), 'en');
    expect(notes[0]).toBe('Comment length: 60 / 255.');
    expect(notes[1]).toBe('This is a draft. Change it to say what you did in your own words.');
  });
  it('says there is nothing to add when the status is UNKNOWN', () => {
    const notes = changesetNotes(changesetDraft([unknownObs()], 'en'), 'en');
    expect(notes[0]).toContain('nothing to add to the map');
    expect(notes[1]).toBe('Observations left out because their status is UNKNOWN: 1.');
  });
  it('writes status, source, licence, date, tier and spot for an observation', () => {
    expect(recordLine(obs(), 'en')).toBe('Status: yes. Source: own visit. Licence: CC0-1.0. Seen on 2026-11-10. Tier: UNKNOWN. Spot: 43.85000, -79.43000.');
    expect(recordLine(obs({ wheelchair: 'maybe', source: ' ' }), 'en')).toContain('Status: UNKNOWN. Source: UNKNOWN.');
    expect(recordLine(obs(), 'fr')).toContain('Niveau : UNKNOWN.');
  });
  it('says the App adds nothing to the map', () => {
    expect(neverUploadsText('en')).toMatch(/^The App adds nothing to OpenStreetMap\./);
    expect(neverUploadsText('fr')).toMatch(/^L’application n’ajoute rien à OpenStreetMap\./);
  });
});
