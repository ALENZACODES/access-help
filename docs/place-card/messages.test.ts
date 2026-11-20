import { describe, expect, it } from 'vitest';
import { bare, card, measured } from './fixtures.js';
import { besideRows, buildFailureText, cardFailureText, cardFromLine, cardNoteText, cardPlaceLine, cardPointLine, cardText, cardTitle, factLines, nearText, notNearText, otherPersonText, receiveIssueText, receivedCountText, shareNoteText } from './messages.js';

describe('a card as text', () => {
  it('opens with the place, who it is from, the record line and the map point', () => {
    const lines = cardText(card(), 'en').split('\n');
    expect(lines.slice(0, 4)).toEqual([
      'Place card: Sample Library',
      'From: Sam. Card made on 2026-11-19.',
      'Status: limited. Source: own visit. Licence: CC0-1.0. Seen: 2026-11-10. Tier: UNKNOWN.',
      'Map point: 43.85000, -79.43000.',
    ]);
  });
  it('lists every fact the sender measured, with UNKNOWN for the rest', () => {
    const text = cardText(card(), 'en');
    expect(text).toContain('What the sender measured\nMeasured on 2026-11-12. How: With a tape.\nSteps at the entrance: 2\nHighest step: 14 cm (5.5 in)\nEntrance door width: 82.5 cm (32.5 in)\nHow the door opens: UNKNOWN\n');
  });
  it('keeps what the place said in a part of its own', () => {
    const text = cardText(card(), 'en');
    expect(text).toContain('What the place told the sender\nAnswered on 2026-11-16.\nSteps at the entrance: UNKNOWN');
    expect(text).toContain('Ramp: Yes');
    expect(cardText(card({ withTold: false }), 'en')).not.toContain('What the place told the sender');
  });
  it('says so when nothing was measured, the label is missing or the point was left out', () => {
    const text = cardText(bare(), 'en');
    expect(text).toContain('Place card: Place without a name');
    expect(text).toContain('From: UNKNOWN. Card made on 2026-11-19.');
    expect(text).toContain('Status: UNKNOWN.');
    expect(text).toContain('Map point: left out by the sender.');
    expect(text).toContain('Nothing was measured. Every fact is UNKNOWN.');
  });
  it('ends by saying these are another person’s facts', () => {
    const text = cardText(card(), 'en').trimEnd();
    expect(text.endsWith(otherPersonText('en'))).toBe(true);
    expect(otherPersonText('en')).toContain('They are not yours and not something you saw.');
  });
  it('never holds a tag line', () => {
    expect(cardText(card(), 'en')).not.toMatch(/^[\w:]+=/m);
  });
  it('writes French with French spacing', () => {
    const text = cardText(card(), 'fr');
    expect(text.split('\n')[0]).toBe('Fiche de lieu : Sample Library');
    expect(text).toContain('De : Sam. Fiche faite le 2026-11-19.');
    expect(text).toContain('Largeur de la porte d’entrée : 82,5 cm (32,5 po)');
    expect(text).toContain('Niveau : UNKNOWN.');
    expect(text).toContain('Les choses changent : allez voir vous-même');
  });
  it('gives the parts on their own', () => {
    expect(cardTitle(bare(), 'fr')).toBe('Lieu sans nom');
    expect(cardFromLine(card(), 'en')).toBe('From: Sam. Card made on 2026-11-19.');
    expect(cardPlaceLine(card(), 'en')).toMatch(/Tier: UNKNOWN\.$/);
    expect(cardPointLine(bare(), 'fr')).toBe('Point sur la carte : laissé de côté par la personne qui envoie.');
    expect(factLines(measured(), 'en')).toHaveLength(7);
  });
});

describe('words for reading and keeping cards', () => {
  it('has a message for every way making or reading a card can fail', () => {
    for (const code of ['licence-not-open', 'date-invalid'] as const) expect(buildFailureText(code, 'fr')).not.toBe(buildFailureText(code, 'en'));
    for (const code of ['too-large', 'not-json', 'not-a-card', 'unsupported-version', 'bad-place', 'licence-not-open'] as const) {
      expect(cardFailureText(code, 'en').length).toBeGreaterThan(20);
      expect(cardFailureText(code, 'fr')).not.toBe(cardFailureText(code, 'en'));
    }
    expect(cardFailureText('too-large', 'en')).toContain('20000 characters at most');
  });
  it('has a note for everything that was tidied', () => {
    expect(cardNoteText('status-set-unknown', 'en')).toBe('The status in the card was not yes, limited or no, so it reads UNKNOWN.');
    for (const note of ['point-left-out', 'point-outside-ontario', 'measures-left-out', 'told-left-out'] as const) expect(cardNoteText(note, 'fr')).not.toBe(cardNoteText(note, 'en'));
  });
  it('has a message for every reason a card is not kept', () => {
    expect(receiveIssueText('already-here', 'en')).toBe('You already have this card.');
    expect(receiveIssueText('too-many', 'en')).toContain('keeps 100 received cards');
    expect(receiveIssueText('date-invalid', 'fr')).toContain('n’a pas pu être datée');
  });
  it('says how close one of your observations is, and whether the names agree', () => {
    expect(nearText({ id: 'x', name: 'Sample Library', metres: 22, sameName: true }, 'en')).toBe('Close to Sample Library, in a straight line: 22 m. The names are the same.');
    expect(nearText({ id: 'x', name: null, metres: 60, sameName: false }, 'en')).toBe('Close to an observation of yours without a name, in a straight line: 60 m. It may be another place.');
    expect(nearText({ id: 'x', name: 'A', metres: 22, sameName: false }, 'fr')).toBe('Près de A, en ligne droite : 22 m. C’est peut-être un autre lieu.');
  });
  it('says why a card is not set beside any observation', () => {
    expect(notNearText(card(), 'en')).toBe('None of your observations is close to this card’s map point.');
    expect(notNearText(bare(), 'en')).toBe('The card has no map point, so it is not set beside any of your observations.');
  });
  it('counts received cards and says what a card holds', () => {
    expect(receivedCountText(3, 'en')).toBe('Cards you received: 3.');
    expect(receivedCountText(0, 'fr')).toBe('Fiches reçues : 0.');
    expect(shareNoteText('en')).toContain('It holds nothing about you unless you type a label.');
    expect(shareNoteText('fr')).toContain('L’application n’envoie rien : vous transmettez');
  });
});

describe('a card beside your own measures', () => {
  it('sets each fact side by side and says by how much lengths differ', () => {
    const rows = besideRows(measured({ doorWidthCm: 90 }), card(), 'en');
    expect(rows.map((row) => [row.fact, row.yours, row.theirs, row.note]).slice(0, 4)).toEqual([
      ['Steps at the entrance', '2', '2', 'The same'],
      ['Highest step', '14 cm (5.5 in)', '14 cm (5.5 in)', 'The same'],
      ['Entrance door width', '90 cm (35.4 in)', '82.5 cm (32.5 in)', 'Differs. The card says 7.5 cm less than you measured.'],
      ['How the door opens', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN from both'],
    ]);
  });
  it('writes UNKNOWN for your side when you have no measures', () => {
    const rows = besideRows(null, card(), 'en');
    expect(rows.every((row) => row.yours === 'UNKNOWN')).toBe(true);
    expect(rows[0]?.note).toBe('Only the card has it');
  });
  it('writes UNKNOWN for the card’s side when it has no measures', () => {
    const rows = besideRows(measured(), bare(), 'en');
    expect(rows.every((row) => row.theirs === 'UNKNOWN')).toBe(true);
    expect(rows[0]?.note).toBe('Only you measured it');
  });
  it('says more or less in French too', () => {
    expect(besideRows(measured({ doorWidthCm: 80 }), card(), 'fr')[2]?.note).toBe('Diffère. La fiche indique 2,5 cm de plus que votre mesure.');
  });
  it('never uses what the place told the sender in the side-by-side', () => {
    const rows = besideRows(measured(), card(), 'en');
    expect(rows.find((row) => row.key === 'ramp')?.theirs).toBe('UNKNOWN');
  });
});
