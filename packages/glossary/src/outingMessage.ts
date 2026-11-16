import { fixFrench } from './frTypography';
import { fold } from './text';
import type { PlanEntry } from './plan';
import type { QuestionReason } from './questions';
import type { Lang } from './plainTerms';

/**
 * A short message a person can send to a place before an outing. It asks the place the questions
 * from the visit plan that the person has not asked yet. It states what the person found
 * (missing, old or conflicting information) and never says anything about the place itself.
 * It is only copied: the App sends nothing.
 */
export type Channel = 'email' | 'phone';

export const CHANNELS: readonly Channel[] = ['email', 'phone'];

const FINDING_WORDS = {
  en: { unknown: 'missing', old: 'old', conflict: 'conflicting' },
  fr: { unknown: 'manquante', old: 'ancienne', conflict: 'contradictoire' },
} as const;

type Finding = keyof (typeof FINDING_WORDS)['en'];

export const MESSAGE_UI = {
  en: {
    subject: (name: string): string => `Questions before visiting ${name}`,
    greeting: 'Hello,',
    intro: (name: string): string => `I am planning a visit to ${name}.`,
    found: (list: string): string => `Some of the information I found about the building is ${list}.`,
    ask: 'Could you answer these questions?',
    thanks: 'Thank you for your time.',
    phoneIntro: (name: string): string => `Hello. I am planning a visit to ${name} and have a few questions about the building.`,
    phoneAsk: 'Questions to ask:',
    phoneEnd: 'Thank you.',
    subjectLabel: 'Subject',
    copy: (name: string): string => `Copy a message for ${name}`,
    or: 'or',
  },
  fr: {
    subject: (name: string): string => `Questions avant de visiter ${name}`,
    greeting: 'Bonjour,',
    intro: (name: string): string => `Je prévois une visite à ${name}.`,
    found: (list: string): string => `Une partie de l’information que j’ai trouvée sur le bâtiment est ${list}.`,
    ask: 'Pourriez-vous répondre à ces questions\u202f?',
    thanks: 'Merci de votre temps.',
    phoneIntro: (name: string): string => `Bonjour. Je prévois une visite à ${name} et j’ai quelques questions sur le bâtiment.`,
    phoneAsk: 'Questions à poser :',
    phoneEnd: 'Merci.',
    subjectLabel: 'Objet',
    copy: (name: string): string => `Copier un message pour ${name}`,
    or: 'ou',
  },
} as const;

export interface OutingMessage {
  readonly channel: Channel;
  readonly subject: string;
  readonly body: string;
  /** The questions in the body, in the order asked. */
  readonly questions: readonly string[];
}

function findingOf(reason: QuestionReason): Finding {
  return reason === 'unknown' ? 'unknown' : reason === 'conflict' ? 'conflict' : 'old';
}

/** "missing, old or conflicting": each kind once, in a fixed order, with "or" before the last. */
export function findingsList(reasons: readonly QuestionReason[], lang: Lang): string {
  const seen = new Set(reasons.map(findingOf));
  const words = (['unknown', 'old', 'conflict'] as const).filter((k) => seen.has(k)).map((k) => FINDING_WORDS[lang][k]);
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} ${MESSAGE_UI[lang].or} ${words[words.length - 1]}`;
}

/** The questions not yet asked for a place. */
export function unaskedItems(entry: PlanEntry): PlanEntry['items'] {
  return entry.items.filter((i) => !i.asked);
}

/**
 * Builds the message, or returns null when every question has been asked (there is nothing to send).
 * An email names the subject and thanks the reader. A phone script is shorter and has no subject.
 */
export function composeMessage(entry: PlanEntry, lang: Lang, channel: Channel = 'email'): OutingMessage | null {
  const items = unaskedItems(entry);
  if (items.length === 0) return null;
  const ui = MESSAGE_UI[lang];
  const questions = items.map((i) => i.question);
  const numbered = questions.map((q, n) => `${n + 1}. ${q}`);
  const lines =
    channel === 'phone'
      ? [ui.phoneIntro(entry.name), '', ui.phoneAsk, ...numbered, '', ui.phoneEnd]
      : [
          ui.greeting,
          '',
          ui.intro(entry.name),
          ui.found(findingsList(items.map((i) => i.reason), lang)),
          ui.ask,
          '',
          ...numbered,
          '',
          ui.thanks,
        ];
  const body = lines.join('\n');
  return {
    channel,
    subject: channel === 'phone' ? '' : ui.subject(entry.name),
    body: lang === 'fr' ? fixFrench(body) : body,
    questions,
  };
}

/** One text a person can paste: the subject line (email only) then the body. */
export function messageToText(message: OutingMessage, lang: Lang): string {
  const subject = message.subject === '' ? [] : [`${MESSAGE_UI[lang].subjectLabel}${lang === 'fr' ? ' ' : ''}: ${message.subject}`, ''];
  const text = [...subject, message.body].join('\n') + '\n';
  return lang === 'fr' ? fixFrench(text) : text;
}

/** A safe file name: letters and digits only, lower case, no accents, never empty. */
export function messageFilename(placeName: string, lang: Lang, channel: Channel = 'email'): string {
  const slug = fold(placeName).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
  return `${channel === 'phone' ? 'call' : 'message'}-${slug === '' ? 'place' : slug}-${lang}.txt`;
}

export const MESSAGE_ID_PREFIX = 'gl-msg-';

export function messageId(index: number): string {
  return `${MESSAGE_ID_PREFIX}${index}`;
}

export function parseMessageId(id: string): number | null {
  const m = /^gl-msg-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}
