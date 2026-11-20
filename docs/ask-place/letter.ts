/**
 * Writes the words for asking a place about its way in: an email, a short message for a web
 * form, and a script for a phone call. The words say nothing about the person's health or
 * body. The App writes a draft; the person sends it themselves, from their own account.
 */
import { howToMeasure, questionText } from './questions.js';
import type { FactKey } from '../place-measures/index.js';
import { colon, fill, pick, type PreLang } from '../presubmit/text.js';

export const CHANNELS = ['email', 'message', 'phone', 'in-person'] as const;
export type Channel = (typeof CHANNELS)[number];

export type LetterLanguage = 'en' | 'fr' | 'both';
export const LETTER_LANGUAGES: readonly LetterLanguage[] = ['en', 'fr', 'both'];

/** Many contact forms stop at about this many characters. The App says when a message runs longer. */
export const SHORT_MESSAGE_MAX = 500;

export function isChannel(value: unknown): value is Channel {
  return typeof value === 'string' && (CHANNELS as readonly string[]).includes(value);
}

export function isLetterLanguage(value: unknown): value is LetterLanguage {
  return typeof value === 'string' && (LETTER_LANGUAGES as readonly string[]).includes(value);
}

export interface LetterInput {
  /** The name of the place as the person wrote it, or null. */
  placeName: string | null;
  questions: readonly FactKey[];
  /** Adds a line on how to take each number. */
  withHints: boolean;
}

function cleanName(name: string | null): string {
  return name === null ? '' : name.replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function subjectLine(input: LetterInput, lang: PreLang): string {
  const name = cleanName(input.placeName);
  if (name === '') return pick(lang, 'A few questions about your entrance', 'Quelques questions sur votre entrée');
  return fill(pick(lang, 'A few questions about the entrance at {name}', 'Quelques questions sur l’entrée de {name}'), { name });
}

function opening(lang: PreLang): string {
  return pick(
    lang,
    'Hello,\n\nI am planning a visit and would like to know a few facts about the way in. Short answers are fine, and "I do not know" is a useful answer too.',
    'Bonjour,\n\nJe prépare une visite et j’aimerais connaître quelques faits sur l’accès. Des réponses courtes suffisent, et «\u202fje ne sais pas\u202f» est aussi une réponse utile.',
  );
}

function closing(lang: PreLang): string {
  return pick(lang, 'Thank you for your time.', 'Merci de votre temps.');
}

function numbered(input: LetterInput, lang: PreLang): string[] {
  const out: string[] = [];
  input.questions.forEach((key, index) => {
    out.push(`${index + 1}. ${questionText(key, lang)}`);
    const hint = input.withHints ? howToMeasure(key, lang) : '';
    if (hint !== '') out.push(`   ${hint}`);
  });
  return out;
}

/** The body of an email in one language. Empty when no question is chosen. */
export function emailBody(input: LetterInput, lang: PreLang): string {
  if (input.questions.length === 0) return '';
  return [opening(lang), '', ...numbered(input, lang), '', closing(lang)].join('\n');
}

/** One paragraph for a contact form or a text message. Hints are left out to keep it short. */
export function shortMessage(input: LetterInput, lang: PreLang): string {
  if (input.questions.length === 0) return '';
  const head = pick(lang, 'Hello, I am planning a visit and have a few questions about the way in.', 'Bonjour, je prépare une visite et j’ai quelques questions sur l’accès.');
  const body = input.questions.map((key, index) => `${index + 1}) ${questionText(key, lang)}`).join(' ');
  return `${head} ${body} ${pick(lang, 'Thank you.', 'Merci.')}`;
}

/** What to say on the phone or at the counter, with a line to write each answer on. */
export function phoneScript(input: LetterInput, lang: PreLang): string {
  if (input.questions.length === 0) return '';
  const lines: string[] = [
    pick(
      lang,
      'Hello, I am planning a visit and have a few short questions about the way in. Is now a good time?',
      'Bonjour, je prépare une visite et j’ai quelques courtes questions sur l’accès. Est-ce un bon moment\u202f?',
    ),
    '',
  ];
  input.questions.forEach((key, index) => {
    lines.push(`${index + 1}. ${questionText(key, lang)}`);
    lines.push(`   ${pick(lang, 'Answer', 'Réponse')}${colon(lang)}____________`);
  });
  lines.push('', pick(lang, 'Thank you. If you are not sure of a number, "I do not know" is fine.', 'Merci. Si vous n’êtes pas sûr d’un chiffre, «\u202fje ne sais pas\u202f» convient.'));
  return lines.join('\n');
}

export interface Letter {
  channel: Channel;
  language: LetterLanguage;
  /** Empty for anything that is not an email. */
  subject: string;
  text: string;
  length: number;
  /** True for a short message longer than most contact forms take. */
  tooLongForForm: boolean;
}

function inLanguage(channel: Channel, input: LetterInput, lang: PreLang): string {
  if (channel === 'email') return emailBody(input, lang);
  if (channel === 'message') return shortMessage(input, lang);
  return phoneScript(input, lang);
}

/**
 * The draft for one way of asking. With both languages, English and French follow each other,
 * French first when that is the language of the page.
 */
export function buildLetter(channel: Channel, language: LetterLanguage, input: LetterInput, pageLang: PreLang): Letter {
  const order: PreLang[] = language === 'both' ? (pageLang === 'fr' ? ['fr', 'en'] : ['en', 'fr']) : [language];
  const parts = order.map((lang) => inLanguage(channel, input, lang)).filter((part) => part !== '');
  const text = parts.join(channel === 'message' ? '\n\n' : '\n\n----\n\n');
  const subject = channel !== 'email' || text === '' ? '' : order.map((lang) => subjectLine(input, lang)).join(' / ');
  const length = [...text].length;
  return { channel, language, subject, text, length, tooLongForForm: channel === 'message' && length > SHORT_MESSAGE_MAX };
}

export function letterFilename(channel: Channel, today: string): string {
  return `ask-${channel}-${today}.txt`;
}

/** The draft as a text file: the subject first for an email, then the words. */
export function letterFileText(letter: Letter, lang: PreLang): string {
  if (letter.text === '') return '';
  const head = letter.subject === '' ? '' : `${pick(lang, 'Subject', 'Objet')}${colon(lang)}${letter.subject}\n\n`;
  return `${head}${letter.text}\n`;
}
