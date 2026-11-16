import { describe, expect, it } from 'vitest';
import { frenchIssues, lintCopy, placeFilename, placeToText, type FeatureClaim, type Place } from './index';

const prov = { source: 'City open data', licence: 'CC0-1.0', date: '2026-06-01' } as const;
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const place: Place = { id: 'Café-Nord #1', name: 'Café Nord', claims: [yes('ramp')] };
const today = '2026-11-15';

describe('placeToText', () => {
  it('lists each feature with its status and source, and unknown as Unknown', () => {
    const t = placeToText(place, ['ramp', 'elevator'], 'en', today);
    expect(t.startsWith('Café Nord\n\n')).toBe(true);
    expect(t).toContain('Ramp: Reported as available');
    expect(t).toContain('  Source: City open data');
    expect(t).toContain('Elevator: Unknown');
  });

  it('adds questions for what is unknown, and none for a recent answer', () => {
    const t = placeToText(place, ['ramp', 'elevator'], 'en', today);
    expect(t).toContain('Questions to ask:');
    expect(t).toContain('- Is there an elevator?');
    expect(t).not.toContain('Is there a ramp?');
  });

  it('leaves out the questions section when everything is answered', () => {
    expect(placeToText(place, ['ramp'], 'en', today)).not.toContain('Questions to ask');
  });

  it('includes the person’s note exactly as typed and labels it as theirs', () => {
    const t = placeToText(place, ['ramp'], 'en', today, '  Call first : side door ');
    expect(t).toContain('Your note:\nCall first : side door\n');
  });

  it('leaves out an empty note', () => {
    expect(placeToText(place, ['ramp'], 'en', today, '   ')).not.toContain('Your note');
  });

  it('ends with the data source when given', () => {
    const t = placeToText(place, ['ramp'], 'en', today, '', prov);
    expect(t.trimEnd().split('\n').at(-1)).toContain('City open data');
  });

  it('keeps French spacing in what we write, but not in the person’s note', () => {
    const note = 'Appeler avant: porte latérale';
    const t = placeToText(place, ['ramp', 'elevator'], 'fr', today, note, prov);
    expect(t).toContain('Rampe : Signalé comme disponible');
    expect(t).toContain('Ascenseur : Inconnu');
    expect(t).toContain('Votre note :\nAppeler avant: porte latérale');
    expect(frenchIssues(t.replace(note, ''))).toEqual([]);
  });

  it('never calls a place accessible overall', () => {
    for (const lang of ['en', 'fr'] as const) {
      const t = placeToText(place, ['ramp', 'elevator'], lang, today, '', prov);
      expect(lintCopy(t)).toEqual([]);
      expect(t).not.toMatch(/\baccessible overall\b|\bis accessible\b|\best accessible\b/i);
    }
  });
});

describe('placeFilename', () => {
  it('makes a safe file name from the id and language', () => {
    expect(placeFilename(place, 'en')).toBe('place-caf-nord-1-en.txt');
    expect(placeFilename({ ...place, id: '///' }, 'fr')).toBe('place-place-fr.txt');
  });
});
