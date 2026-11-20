import { describe, expect, it } from 'vitest';
import { mixedSession, notes, started } from './fixtures.js';
import { addedGroups } from './groups.js';
import { cannotSeeText, countsText, groupHeading, groupNotes, leftOutLines, nextStopText, orderHint, orderLabel, outcomeLabel, outcomeText, positionText, readyText, restText, skipReasonText } from './messages.js';
import { buildQueue } from './queue.js';
import { sessionCounts, setOutcome } from './session.js';

describe('words for a sitting', () => {
  it('labels each order and says the nearby order is not a route', () => {
    expect(orderLabel('newest', 'en')).toBe('Newest first');
    expect(orderLabel('nearby', 'fr')).toBe('Lieu par lieu, le plus proche ensuite');
    expect(orderHint('nearby', 'en')).toContain('not a route to travel');
  });
  it('lists what was left out with counts, and nothing when nothing was', () => {
    expect(leftOutLines(buildQueue(notes(), new Set(['a1']), 'newest').leftOut, 'en')).toEqual([
      'Already on your list of what you added: 1.',
      'Status UNKNOWN, so there is nothing to add: 1.',
      'No source written: 1.',
    ]);
    expect(leftOutLines([], 'en')).toEqual([]);
    expect(leftOutLines(buildQueue(notes(), new Set(), 'newest').leftOut, 'fr')[0]).toBe('État UNKNOWN, donc rien à ajouter : 1.');
  });
  it('says how many are ready and how many wait for another sitting', () => {
    expect(readyText(4, 0, 'en')).toBe('Ready to go through: 4.');
    expect(readyText(200, 7, 'en')).toBe('Ready to go through: 200. Waiting for another sitting: 7.');
    expect(readyText(0, 0, 'fr')).toBe('Prêtes à parcourir : 0.');
  });
  it('words an added outcome as something the person said', () => {
    expect(outcomeLabel('added', 'en')).toBe('You said you added it');
    expect(outcomeText({ kind: 'added', changeset: null }, 'en')).toBe('You said you added it');
    expect(outcomeText({ kind: 'added', changeset: '42' }, 'en')).toBe('You said you added it, changeset 42');
    expect(outcomeText({ kind: 'added', changeset: '42' }, 'fr')).toBe('Vous avez dit l’avoir ajoutée, lot de modifications 42');
  });
  it('gives the reason with a skipped outcome', () => {
    expect(outcomeText({ kind: 'skipped', reason: 'could-not-find' }, 'en')).toBe('Skipped: i could not find the place on the map');
    expect(outcomeText({ kind: 'skipped', reason: 'already-on-map' }, 'fr')).toBe('Passée : la carte dit déjà la même chose');
    expect(skipReasonText('not-sure', 'en')).toBe('I am not sure of what I saw');
  });
  it('words the other outcomes plainly', () => {
    expect(outcomeText({ kind: 'later' }, 'en')).toBe('For later');
    expect(outcomeText(undefined, 'en')).toBe('Not looked at yet');
  });
  it('gives counts only', () => {
    expect(countsText(sessionCounts(mixedSession()), 'en')).toBe('In this sitting: 4. Said added: 1. Skipped: 1. For later: 1. Not looked at yet: 1.');
    expect(countsText(sessionCounts(started()), 'fr')).toBe('Dans cette séance : 4. Dites ajoutées : 0. Passées : 0. Pour plus tard : 0. Pas encore regardées : 4.');
  });
  it('gives the position counting from one', () => {
    expect(positionText(0, 4, 'en')).toBe('Observation 1 of 4');
    expect(positionText(3, 4, 'fr')).toBe('Observation 4 sur 4');
  });
  it('gives the distance to the next one, or nothing at the end', () => {
    expect(nextStopText(120, 'en')).toBe('Next one, in a straight line: 120 m.');
    expect(nextStopText(48_000, 'fr')).toBe('La suivante, en ligne droite : 48,0 km.');
    expect(nextStopText(null, 'en')).toBe('');
  });
  it('heads a group with its number and count', () => {
    const [group] = addedGroups(mixedSession(), notes(), 'en');
    expect(group && groupHeading(group, 'en')).toBe('Changeset 123456: 1 place');
    expect(group && groupHeading(group, 'fr')).toBe('Lot de modifications 123456 : 1 lieu');
    expect(group && groupNotes(group, 'en')).toEqual([]);
  });
  it('notes a wide group and a group with no number', () => {
    let session = started();
    for (const id of [...session.ids]) session = setOutcome(session, id, { kind: 'added', changeset: id === 'a2' ? null : '7' });
    const [wide, bare] = addedGroups(session, notes(), 'en');
    expect(wide && groupNotes(wide, 'en')).toEqual([
      'Widest gap between two of them, in a straight line: 101.8 km.',
      'These places are far apart for one changeset. Look at the number again in case two were mixed up.',
    ]);
    expect(bare && groupHeading(bare, 'en')).toBe('No changeset number: 1 place');
    expect(bare && groupNotes(bare, 'en')).toEqual(['You can write the number in later on your list of what you added.']);
  });
  it('says the App cannot see the map and that the sitting can be picked up again', () => {
    expect(cannotSeeText('en')).toMatch(/^The App adds nothing to OpenStreetMap and cannot see it\./);
    expect(cannotSeeText('fr')).toContain('« Ajoutée »');
    expect(restText('en')).toBe('Stop whenever you like. The sitting is kept on this device and you can pick it up again.');
  });
});
