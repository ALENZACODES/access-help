import { describe, expect, it } from 'vitest';
import { compareFacts } from './compare.js';
import { letterInput, measured, sampleLog, told, TODAY } from './fixtures.js';
import { buildLetter } from './letter.js';
import { askCounts, setAskStatus } from './log.js';
import { askCountsText, askIssueText, askLine, channelLabel, compareLabel, compareSummary, differenceText, letterLanguageLabel, letterNote, privacyNoteText, statusLabel, toldNoteText } from './messages.js';
import { QUESTION_KEYS } from './questions.js';

describe('words for the asking page', () => {
  it('labels channels, letter languages and statuses in both languages', () => {
    expect(channelLabel('email', 'fr')).toBe('Courriel');
    expect(channelLabel('message', 'en')).toBe('Short message or contact form');
    expect(letterLanguageLabel('both', 'fr')).toBe('Anglais et français');
    expect(statusLabel('answered', 'en')).toBe('You said it was answered');
    expect(statusLabel('no-reply', 'fr')).toBe('Fermée sans réponse');
  });
  it('writes a waiting ask with the days since it was made', () => {
    const entry = sampleLog().entries[1];
    expect(entry && askLine(entry, TODAY, 'en')).toBe('Asked on 2026-11-15. How: phone call. Asked about: width of the entrance door and wheelchair toilet. Waiting for an answer. Days since you asked: 4.');
  });
  it('writes a closed ask with the day it was closed', () => {
    const entry = setAskStatus(sampleLog(), 1, 'answered', TODAY).entries[0];
    expect(entry && askLine(entry, TODAY, 'en')).toBe('Asked on 2026-11-11. How: email. Asked about: width of the entrance door and wheelchair toilet. You said it was answered. Closed on 2026-11-19.');
    expect(entry && askLine(entry, TODAY, 'fr')).toContain('Comment : courriel.');
  });
  it('gives counts only', () => {
    expect(askCountsText(askCounts(sampleLog().entries), 'en')).toBe('Times you asked: 3. Waiting: 3. Answered: 0. No reply: 0.');
    expect(askCountsText(askCounts([]), 'fr')).toBe('Demandes faites : 0. En attente : 0. Avec réponse : 0. Sans réponse : 0.');
  });
  it('has a message for every problem with an ask', () => {
    for (const issue of ['date-invalid', 'date-future', 'no-question', 'too-many-for-place', 'log-full'] as const) {
      expect(askIssueText(issue, 'en').length).toBeGreaterThan(10);
      expect(askIssueText(issue, 'fr')).not.toBe(askIssueText(issue, 'en'));
    }
    expect(askIssueText('too-many-for-place', 'en')).toContain('keeps 6 asks for one place');
  });
  it('notes the length of a draft, and when a short message runs long', () => {
    expect(letterNote(buildLetter('email', 'en', letterInput(), 'en'), 'en')).toBe('Length: 539 characters.');
    const long = buildLetter('message', 'fr', letterInput({ questions: [...QUESTION_KEYS] }), 'fr');
    expect(letterNote(long, 'fr')).toContain('Beaucoup de formulaires de contact s’arrêtent vers 500.');
    expect(letterNote(buildLetter('email', 'en', letterInput({ questions: [] }), 'en'), 'en')).toBe('Choose at least one question to get a draft.');
  });
  it('labels each kind of comparison', () => {
    expect(compareLabel('neither', 'en')).toBe('UNKNOWN from both');
    expect(compareLabel('neither', 'fr')).toBe('UNKNOWN des deux côtés');
    expect(compareLabel('only-told', 'en')).toBe('Only the place said it');
    expect(compareLabel('does-not-apply', 'fr')).toBe('Ne s’applique pas ici');
  });
  it('says by how much two lengths differ, and calls neither wrong', () => {
    const rows = compareFacts(measured(), told());
    const door = rows.find((r) => r.key === 'doorWidthCm');
    expect(door && differenceText(door, 'en')).toBe('The place said 7.5 cm more than you measured.');
    expect(door && differenceText(door, 'fr')).toBe('Le lieu a dit 7,5 cm de plus que votre mesure.');
    const less = compareFacts(measured(), told({ doorWidthCm: 80 })).find((r) => r.key === 'doorWidthCm');
    expect(less && differenceText(less, 'en')).toBe('The place said 2.5 cm less than you measured.');
  });
  it('says only that two answers differ for a count or a choice, and nothing for other rows', () => {
    const rows = compareFacts(measured(), told({ steps: 3 }));
    const steps = rows.find((r) => r.key === 'steps');
    expect(steps && differenceText(steps, 'en')).toBe('The two answers are not the same.');
    const ramp = rows.find((r) => r.key === 'ramp');
    expect(ramp && differenceText(ramp, 'en')).toBe('');
  });
  it('sums up the comparison and names what is still open', () => {
    expect(compareSummary(compareFacts(measured(), told()), 'en')).toBe('The same: 1. Different: 1. Only you: 1. Only the place: 3. UNKNOWN from both: 1. Still to ask or measure: width of the toilet door.');
    expect(compareSummary(compareFacts(measured(), told({ toilet: 'no' })), 'en')).toBe('The same: 1. Different: 1. Only you: 1. Only the place: 3. UNKNOWN from both: 0.');
  });
  it('says what a place said is kept apart and never becomes a tag', () => {
    expect(toldNoteText('en')).toContain('it is never among the tags for OpenStreetMap');
    expect(toldNoteText('fr')).toContain('Allez voir avant de l’ajouter à la carte.');
  });
  it('says the draft holds nothing about the person and the App sends nothing', () => {
    expect(privacyNoteText('en')).toBe('The draft says nothing about you, your health or your body. Add only what you choose to. The App sends nothing: you copy the words and send them yourself.');
    expect(privacyNoteText('fr')).toContain('L’application n’envoie rien : vous copiez les mots');
  });
});
