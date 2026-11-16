import { describe, expect, it } from 'vitest';
import { PLAIN_TERMS, UNKNOWN_TERM, auditTerms, type GlossaryTerm } from './index';

const good: GlossaryTerm = {
  id: 'handrail',
  en: { term: 'Handrail', plain: 'A rail along a ramp or stairs to hold onto.' },
  fr: { term: 'Main courante', plain: 'Une barre le long d’une rampe ou d’un escalier pour s’y tenir.' },
};

const rulesOf = (...terms: GlossaryTerm[]): string[] => auditTerms(terms).map((f) => f.rule);
const withEn = (en: Partial<GlossaryTerm['en']>): GlossaryTerm => ({ ...good, en: { ...good.en, ...en } });
const withFr = (fr: Partial<GlossaryTerm['fr']>): GlossaryTerm => ({ ...good, fr: { ...good.fr, ...fr } });

describe('auditTerms on shipped data', () => {
  it('finds nothing', () => {
    expect(auditTerms([...PLAIN_TERMS, UNKNOWN_TERM])).toEqual([]);
  });
});

describe('auditTerms: structure', () => {
  it('accepts a well-formed term', () => {
    expect(rulesOf(good)).toEqual([]);
  });

  it('flags bad id formats', () => {
    for (const id of ['Bad_Id', 'two words', '-lead', 'trail-', '9start', 'a--b', '']) {
      expect(rulesOf({ ...good, id })).toContain('term-id-format');
    }
  });

  it('flags duplicate ids', () => {
    expect(rulesOf(good, good)).toContain('term-duplicate-id');
  });

  it('flags empty text in either language', () => {
    expect(rulesOf(withEn({ term: ' ' }))).toEqual(['term-empty']);
    expect(rulesOf(withFr({ plain: '' }))).toEqual(['term-empty']);
  });

  it('flags long terms, and honours a custom limit', () => {
    expect(rulesOf(withEn({ term: 'x'.repeat(61) }))).toEqual(['term-too-long']);
    expect(auditTerms([withEn({ term: 'x'.repeat(21) })], { maxTermLength: 20 }).map((f) => f.rule)).toEqual(['term-too-long']);
  });

  it('flags two terms with the same name in one language, ignoring accents and case', () => {
    const other: GlossaryTerm = { ...good, id: 'handrail-2', en: { ...good.en, term: 'HANDRAIL' }, fr: { term: 'Autre', plain: 'Une autre phrase.' } };
    expect(rulesOf(good, other)).toEqual(['term-duplicate-name']);
  });

  it('flags descriptions that do not end like a sentence', () => {
    expect(rulesOf(withEn({ plain: 'A rail to hold onto' }))).toEqual(['term-no-full-stop']);
  });

  it('flags a French description that is just the English one', () => {
    expect(rulesOf(withFr({ plain: good.en.plain }))).toContain('term-untranslated');
  });
});

describe('auditTerms: wording (fails on the words we never use)', () => {
  const words = ['verified', 'vérifié', 'real-time', 'partnership', 'guarantee'];

  it.each(words)('flags "%s" in English text', (word) => {
    expect(rulesOf(withEn({ plain: `This is ${word}.` }))).toContain('copy-rule');
  });

  it.each(words)('flags "%s" in French text', (word) => {
    expect(rulesOf(withFr({ plain: `Ceci est ${word}.` }))).toContain('copy-rule');
  });

  it('flags other banned wording', () => {
    expect(rulesOf(withEn({ plain: 'Powered by AI.' }))).toContain('copy-rule');
    expect(rulesOf(withEn({ plain: 'Consult your doctor.' }))).toContain('copy-rule');
  });

  it('puts the matched text in the detail', () => {
    const f = auditTerms([withEn({ plain: 'This is verified.' })]).find((x) => x.rule === 'copy-rule');
    expect(f?.detail).toContain('verified');
    expect(f?.where).toBe('handrail [en]');
  });
});

describe('auditTerms: language quality', () => {
  it('flags long sentences, and honours a custom limit', () => {
    const long = Array.from({ length: 25 }, (_, i) => `w${i}`).join(' ') + '.';
    expect(rulesOf(withEn({ plain: long }))).toEqual(['plain-language']);
    expect(auditTerms([withEn({ plain: long })], { maxWords: 30 })).toEqual([]);
  });

  it('flags French typography errors', () => {
    expect(rulesOf(withFr({ plain: "Une barre d'appui." }))).toEqual(['french-typography']);
    expect(rulesOf(withFr({ plain: 'Attention: une barre.' }))).toEqual(['french-typography']);
  });

  it('does not apply French rules to English', () => {
    expect(rulesOf(withEn({ plain: "It's a rail." }))).toEqual([]);
  });
});
