import { describe, expect, it } from 'vitest';
import {
  CHANNELS,
  MESSAGE_ID_PREFIX,
  MESSAGE_UI,
  buildPlan,
  composeMessage,
  findingsList,
  frenchIssues,
  lintClaims,
  lintCopy,
  messageFilename,
  messageId,
  messageToText,
  parseMessageId,
  plainLanguageIssues,
  scanText,
  setAsked,
  unaskedItems,
  type FeatureClaim,
  type Lang,
  type Place,
  type PlanEntry,
} from './index';

const today = '2026-11-15';
const prov = { source: 'City open data', licence: 'CC0-1.0', date: '2026-06-01' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const places: Place[] = [
  { id: 'a', name: 'Library', claims: [yes('ramp')] },
  { id: 'b', name: 'Café Nord', claims: [] },
];
const terms = ['ramp', 'elevator', 'grab-bar'];
const entryFor = (lang: Lang, asked: Record<string, string[]> = {}): PlanEntry => {
  const e = buildPlan(places, ['b'], terms, today, lang, asked)[0];
  if (e === undefined) throw new Error('no entry');
  return e;
};
const langs: Lang[] = ['en', 'fr'];

describe('findingsList', () => {
  it('names each kind once in a fixed order', () => {
    expect(findingsList(['unknown', 'unknown', 'old'], 'en')).toMatch(/ or /);
    expect(findingsList(['unknown'], 'en')).not.toMatch(/ or |,/);
  });
  it('is empty for nothing', () => {
    expect(findingsList([], 'en')).toBe('');
    expect(findingsList([], 'fr')).toBe('');
  });
  it('joins three kinds with commas and one "or"', () => {
    const text = findingsList(['unknown', 'old', 'conflict'], 'en');
    expect(text.split(',').length).toBe(2);
    expect(text).toContain(' or ');
  });
  it('uses the French word for "or"', () => {
    expect(findingsList(['unknown', 'conflict'], 'fr')).toContain(` ${MESSAGE_UI.fr.or} `);
  });
  it('does not depend on the order given', () => {
    expect(findingsList(['old', 'unknown'], 'en')).toBe(findingsList(['unknown', 'old'], 'en'));
  });
});

describe('unaskedItems', () => {
  it('drops the questions already ticked', () => {
    const e = entryFor('en', { b: ['ramp'] });
    expect(unaskedItems(e).map((i) => i.termId)).toEqual(['elevator', 'grab-bar']);
  });
  it('keeps all of them when none is ticked', () => {
    expect(unaskedItems(entryFor('en')).length).toBe(3);
  });
});

describe('composeMessage', () => {
  it.each(langs)('writes an email with a subject and numbered questions in %s', (lang) => {
    const m = composeMessage(entryFor(lang), lang);
    expect(m).not.toBeNull();
    expect(m?.channel).toBe('email');
    expect(m?.subject).toContain('Café Nord');
    expect(m?.questions.length).toBe(3);
    m?.questions.forEach((q, i) => expect(m.body).toContain(`${i + 1}. ${q}`));
  });

  it('asks only what is not ticked yet', () => {
    const m = composeMessage(entryFor('en', { b: ['ramp', 'elevator'] }), 'en');
    expect(m?.questions.length).toBe(1);
    expect(m?.body).not.toContain('2. ');
  });

  it('returns null when everything has been asked', () => {
    expect(composeMessage(entryFor('en', { b: terms }), 'en')).toBeNull();
    expect(composeMessage(entryFor('fr', { b: terms }), 'fr', 'phone')).toBeNull();
  });

  it('writes a shorter phone script with no subject', () => {
    const phone = composeMessage(entryFor('en'), 'en', 'phone');
    const email = composeMessage(entryFor('en'), 'en', 'email');
    expect(phone?.subject).toBe('');
    expect(phone?.channel).toBe('phone');
    expect((phone?.body.length ?? 0) < (email?.body.length ?? 0)).toBe(true);
    expect(phone?.body).toContain('1. ');
  });

  it('mentions what was found only in the email', () => {
    const email = composeMessage(entryFor('en'), 'en', 'email');
    expect(email?.body).toContain(findingsList(['unknown'], 'en'));
  });

  it.each(langs)('keeps the same questions in both channels in %s', (lang) => {
    const a = composeMessage(entryFor(lang), lang, 'email');
    const b = composeMessage(entryFor(lang), lang, 'phone');
    expect(a?.questions).toEqual(b?.questions);
  });

  it.each(langs)('uses the place name once in the subject and once in the greeting in %s', (lang) => {
    const m = composeMessage(entryFor(lang), lang);
    expect(m?.body).toContain('Café Nord');
  });

  it.each(langs)('never says anything about the place in %s', (lang) => {
    for (const channel of CHANNELS) {
      const m = composeMessage(entryFor(lang), lang, channel);
      const text = messageToText(m!, lang);
      expect(lintCopy(text)).toEqual([]);
      expect(lintClaims(text)).toEqual([]);
      expect(scanText(text)).toEqual([]);
      expect(text).not.toMatch(/\b(is|has) (accessible|step-free)\b/i);
    }
  });

  it('puts a French no-break space before a question mark', () => {
    const m = composeMessage(entryFor('fr'), 'fr');
    expect(frenchIssues(m!.body)).toEqual([]);
    expect(m?.body).toMatch(/ \?/);
  });

  it.each(langs)('keeps sentences short in %s', (lang) => {
    for (const channel of CHANNELS) {
      const m = composeMessage(entryFor(lang), lang, channel);
      for (const line of m!.body.split('\n')) {
        expect(plainLanguageIssues(line.replace(/^\d+\.\s/, ''))).toEqual([]);
      }
    }
  });
});

describe('messageToText', () => {
  it.each(langs)('starts an email with the subject line in %s', (lang) => {
    const m = composeMessage(entryFor(lang), lang)!;
    const text = messageToText(m, lang);
    expect(text.startsWith(MESSAGE_UI[lang].subjectLabel)).toBe(true);
    expect(text).toContain(m.subject);
    expect(text.endsWith('\n')).toBe(true);
  });

  it('puts the French colon after a no-break space', () => {
    const text = messageToText(composeMessage(entryFor('fr'), 'fr')!, 'fr');
    expect(text.split('\n')[0]).toMatch(/ :| :/);
  });

  it('has no subject line for a phone script', () => {
    const text = messageToText(composeMessage(entryFor('en'), 'en', 'phone')!, 'en');
    expect(text).not.toContain(MESSAGE_UI.en.subjectLabel);
  });
});

describe('messageFilename', () => {
  it('is lower case, ASCII, with the language and channel', () => {
    expect(messageFilename('Café Nord', 'fr')).toBe('message-cafe-nord-fr.txt');
    expect(messageFilename('Café Nord', 'en', 'phone')).toBe('call-cafe-nord-en.txt');
  });
  it('is never empty', () => {
    expect(messageFilename('***', 'en')).toBe('message-place-en.txt');
    expect(messageFilename('', 'fr', 'phone')).toBe('call-place-fr.txt');
  });
  it('is cut to a safe length with no trailing dash', () => {
    const name = messageFilename('a'.repeat(39) + ' b ' + 'c'.repeat(30), 'en');
    expect(name).toMatch(/^message-[a-z0-9-]+-en\.txt$/);
    expect(name).not.toMatch(/--/);
    expect(name.length).toBeLessThan(60);
  });
  it('has no path characters', () => {
    expect(messageFilename('../etc/passwd', 'en')).not.toMatch(/[./\\]{2}|\//);
  });
});

describe('message ids', () => {
  it('round-trips', () => {
    expect(messageId(4)).toBe(`${MESSAGE_ID_PREFIX}4`);
    expect(parseMessageId(messageId(12))).toBe(12);
  });
  it('rejects anything else', () => {
    for (const bad of ['gl-msg-', 'gl-msg-x', 'gl-msg--1', 'gl-ask-1', 'xgl-msg-1', 'gl-msg-1 ']) expect(parseMessageId(bad)).toBeNull();
  });
});

describe('MESSAGE_UI', () => {
  it('has the same keys in both languages', () => {
    expect(Object.keys(MESSAGE_UI.en).sort()).toEqual(Object.keys(MESSAGE_UI.fr).sort());
  });
  it('builds its functions from the place name', () => {
    expect(MESSAGE_UI.en.subject('X')).toContain('X');
    expect(MESSAGE_UI.fr.copy('X')).toContain('X');
  });
  it('does not change by tick', () => {
    expect(setAsked({}, 'b', 'ramp', true)).toEqual({ b: ['ramp'] });
  });
});
