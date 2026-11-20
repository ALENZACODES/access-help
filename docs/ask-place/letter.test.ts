import { describe, expect, it } from 'vitest';
import { letterInput } from './fixtures.js';
import { SHORT_MESSAGE_MAX, buildLetter, emailBody, isChannel, isLetterLanguage, letterFileText, letterFilename, phoneScript, shortMessage, subjectLine } from './letter.js';
import { QUESTION_KEYS } from './questions.js';

describe('drafts for asking a place', () => {
  it('writes an email with numbered questions and measuring hints', () => {
    expect(emailBody(letterInput(), 'en')).toBe(
      [
        'Hello,',
        '',
        'I am planning a visit and would like to know a few facts about the way in. Short answers are fine, and "I do not know" is a useful answer too.',
        '',
        '1. How many steps are there at the entrance most people use?',
        '   Count every step from the sidewalk to the inside, including a raised doorsill.',
        '2. How wide is the clear opening of the entrance door, in centimetres?',
        '   Open the door fully and measure the narrowest gap a person passes through, not the door itself.',
        '3. Is there a toilet meant for wheelchair users?',
        '',
        'Thank you for your time.',
      ].join('\n'),
    );
  });
  it('leaves the hints out when asked to', () => {
    expect(emailBody(letterInput({ withHints: false }), 'en')).not.toContain('Count every step');
  });
  it('names the place in the subject, or not when it has no name', () => {
    expect(subjectLine(letterInput(), 'en')).toBe('A few questions about the entrance at Sample Library');
    expect(subjectLine(letterInput({ placeName: null }), 'en')).toBe('A few questions about your entrance');
    expect(subjectLine(letterInput({ placeName: '  ' }), 'fr')).toBe('Quelques questions sur votre entrée');
  });
  it('tidies and shortens a long name in the subject', () => {
    const subject = subjectLine(letterInput({ placeName: `  Sample \n Library ${'x'.repeat(200)}` }), 'en');
    expect(subject).toContain('Sample Library x');
    expect(subject.length).toBeLessThan(130);
  });
  it('writes a short message in one paragraph without hints', () => {
    expect(shortMessage(letterInput(), 'en')).toBe(
      'Hello, I am planning a visit and have a few questions about the way in. 1) How many steps are there at the entrance most people use? 2) How wide is the clear opening of the entrance door, in centimetres? 3) Is there a toilet meant for wheelchair users? Thank you.',
    );
    expect(shortMessage(letterInput(), 'en')).not.toContain('\n');
  });
  it('writes a phone script with a line for each answer', () => {
    const script = phoneScript(letterInput({ questions: ['ramp'] }), 'en');
    expect(script).toContain('Is now a good time?');
    expect(script).toContain('1. Is there a ramp to the entrance?\n   Answer: ____________');
    expect(phoneScript(letterInput({ questions: ['ramp'] }), 'fr')).toContain('   Réponse : ____________');
  });
  it('writes nothing when no question is chosen', () => {
    const none = letterInput({ questions: [] });
    expect(emailBody(none, 'en')).toBe('');
    expect(shortMessage(none, 'en')).toBe('');
    expect(phoneScript(none, 'en')).toBe('');
    expect(buildLetter('email', 'en', none, 'en')).toMatchObject({ text: '', subject: '', length: 0, tooLongForForm: false });
  });
  it('builds an email with a subject, and other drafts without one', () => {
    expect(buildLetter('email', 'en', letterInput(), 'en').subject).toBe('A few questions about the entrance at Sample Library');
    expect(buildLetter('message', 'en', letterInput(), 'en').subject).toBe('');
    expect(buildLetter('phone', 'en', letterInput(), 'en').subject).toBe('');
  });
  it('uses the phone script for asking in person', () => {
    expect(buildLetter('in-person', 'en', letterInput(), 'en').text).toBe(buildLetter('phone', 'en', letterInput(), 'en').text);
  });
  it('writes the letter in the language asked for, whatever the page language', () => {
    expect(buildLetter('email', 'fr', letterInput(), 'en').text.startsWith('Bonjour,')).toBe(true);
    expect(buildLetter('email', 'en', letterInput(), 'fr').text.startsWith('Hello,')).toBe(true);
  });
  it('puts both languages one after the other, the page language first', () => {
    const fr = buildLetter('email', 'both', letterInput({ questions: ['ramp'], withHints: false }), 'fr');
    expect(fr.text.indexOf('Bonjour,')).toBe(0);
    expect(fr.text).toContain('\n\n----\n\nHello,');
    expect(fr.subject).toBe('Quelques questions sur l’entrée de Sample Library / A few questions about the entrance at Sample Library');
    const en = buildLetter('email', 'both', letterInput({ questions: ['ramp'] }), 'en');
    expect(en.text.indexOf('Hello,')).toBe(0);
  });
  it('says when a short message is longer than most forms take', () => {
    expect(buildLetter('message', 'en', letterInput(), 'en').tooLongForForm).toBe(false);
    const all = letterInput({ questions: [...QUESTION_KEYS] });
    expect(buildLetter('message', 'fr', all, 'fr').length).toBeGreaterThan(SHORT_MESSAGE_MAX);
    expect(buildLetter('message', 'fr', all, 'fr').tooLongForForm).toBe(true);
    expect(buildLetter('email', 'fr', all, 'fr').tooLongForForm).toBe(false);
  });
  it('counts length as a reader sees it', () => {
    const letter = buildLetter('email', 'fr', letterInput(), 'fr');
    expect(letter.length).toBe([...letter.text].length);
  });
  it('says nothing about the person in any draft', () => {
    for (const channel of ['email', 'message', 'phone'] as const) {
      for (const lang of ['en', 'fr'] as const) {
        const text = buildLetter(channel, lang, letterInput({ questions: [...QUESTION_KEYS] }), lang).text;
        expect(text).not.toMatch(/\bI use\b|\bmy (?:chair|wheelchair)\b|\bmon fauteuil\b|disab|handicap/i);
      }
    }
  });
  it('writes the file with the subject first for an email', () => {
    expect(letterFileText(buildLetter('email', 'en', letterInput(), 'en'), 'en').startsWith('Subject: A few questions about the entrance at Sample Library\n\nHello,')).toBe(true);
    expect(letterFileText(buildLetter('email', 'fr', letterInput(), 'fr'), 'fr').startsWith('Objet : Quelques questions')).toBe(true);
    expect(letterFileText(buildLetter('phone', 'en', letterInput(), 'en'), 'en').startsWith('Hello, I am planning')).toBe(true);
    expect(letterFileText(buildLetter('email', 'en', letterInput({ questions: [] }), 'en'), 'en')).toBe('');
  });
  it('names the file by channel and day', () => {
    expect(letterFilename('email', '2026-11-19')).toBe('ask-email-2026-11-19.txt');
    expect(letterFilename('in-person', '2026-11-19')).toBe('ask-in-person-2026-11-19.txt');
  });
  it('knows its channels and languages', () => {
    expect(isChannel('phone')).toBe(true);
    expect(isChannel('fax')).toBe(false);
    expect(isLetterLanguage('both')).toBe(true);
    expect(isLetterLanguage('de')).toBe(false);
  });
});
