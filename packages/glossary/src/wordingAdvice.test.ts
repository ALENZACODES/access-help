import { describe, expect, it } from 'vitest';
import { findBannedCopy } from '../../../qa/src/audit/copy';
import {
  ADVICE_KINDS,
  ADVICE_UI,
  CLAIM_RULE_IDS,
  COPY_RULE_IDS,
  FRENCH_RULES,
  MAX_ADVICE_CHARS,
  MAX_SENTENCE_WORDS,
  adviceCounts,
  adviseWording,
  advisedRules,
  frenchIssues,
  hasSpacingToFix,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  readabilityIssues,
  type Advice,
  type Lang,
} from './index';

const kinds = (text: string, lang: Lang = 'en'): string[] => adviseWording(text, lang).map((a) => `${a.kind}:${a.rule}:${a.found}`);
const one = (text: string, lang: Lang = 'en'): Advice => adviseWording(text, lang)[0] as Advice;

describe('adviseWording: words the App does not use', () => {
  it('finds each kind of wording and gives the words as written', () => {
    expect(kinds('Verified by the city.')).toEqual(['word:no-verification-claim:Verified']);
    expect(kinds('Mis à jour en temps réel.', 'fr')).toEqual(['word:no-realtime-claim:temps réel']);
    expect(kinds('A partnership with the city.')).toEqual(['word:no-partnership-claim:partnership']);
    expect(kinds('Ask about treatment.')).toEqual(['word:no-medical-advice:treatment']);
  });
  it('gives a reason and a suggestion for the rule', () => {
    const advice = one('We guarantee the entrance.');
    expect(advice.reason).toBe(ADVICE_UI.en.words['no-verification-claim'].reason);
    expect(advice.suggestion).toBe('Say what the source reports, and give its date.');
    expect(one('Vérifié par la ville.', 'fr').suggestion).toBe('Dites ce que la source signale, et donnez sa date.');
  });
  it('gives the same words under the same rule once, whatever their case', () => {
    expect(kinds('Verified here. verified there. VERIFIED again.').filter((k) => k.startsWith('word:'))).toEqual(['word:no-verification-claim:Verified']);
    expect(kinds('Verified and certified.')).toEqual(['word:no-verification-claim:Verified', 'word:no-verification-claim:certified']);
  });
});

describe('adviseWording: claims about a place', () => {
  it('finds a claim and says what to write instead', () => {
    expect(kinds('This place is fully accessible.')).toContain('claim:no-absolute-accessible:is fully accessible');
    expect(kinds('Ce lieu est probablement accessible.', 'fr').some((k) => k.startsWith('claim:no-inferred-accessible'))).toBe(true);
    const advice = adviseWording('It is probably accessible.', 'en').find((a) => a.rule === 'no-inferred-accessible');
    expect(advice?.suggestion).toBe('Say what is reported, or say that it is unknown.');
  });
  it('uses the token in the French suggestion', () => {
    const advice = adviseWording('Ce lieu est probablement accessible.', 'fr').find((a) => a.rule === 'no-inferred-accessible');
    expect(advice?.suggestion).toBe('Dites ce qui est signalé, ou dites que c’est UNKNOWN.');
  });
});

describe('adviseWording: sentences, plainer words and hidden characters', () => {
  it('counts the words of a long sentence', () => {
    const long = `${Array.from({ length: 24 }, () => 'word').join(' ')}.`;
    const advice = one(long);
    expect(advice).toMatchObject({ kind: 'sentence', rule: 'long-sentence', found: long, reason: 'This sentence has 24 words. Short sentences are easier to read.' });
    expect(advice.suggestion).toBe(`Use sentences of ${MAX_SENTENCE_WORDS} words or fewer.`);
    expect(kinds(`${Array.from({ length: MAX_SENTENCE_WORDS }, () => 'word').join(' ')}.`)).toEqual([]);
  });
  it('finds a word in capital letters, but not the token or a data label', () => {
    expect(kinds('This is VERY clear.')).toEqual(['sentence:all-caps-word:VERY']);
    expect(kinds('The status is UNKNOWN.')).toEqual([]);
    expect(kinds('The tier is SEEDED-OPEN-DATA.')).toEqual([]);
    expect(kinds('The tier is PROTOTYPE-UNVERIFIED.')).toEqual([]);
  });
  it('offers a plainer word', () => {
    const advice = one('Open the additional information.');
    expect(advice).toMatchObject({ kind: 'plainer', rule: 'plain-swap', found: 'additional', suggestion: 'Write “more” in its place.' });
  });
  it('says so when the text holds characters that cannot be seen', () => {
    const advice = adviseWording('Clear​ text.', 'en').find((a) => a.kind === 'hidden');
    expect(advice).toMatchObject({ rule: 'hidden-characters', found: '', suggestion: 'Type the text again, or paste it as plain text.' });
  });
  it('finds wording that is hidden behind such characters', () => {
    expect(adviseWording('Veri​fied by the city.', 'en').map((a) => a.kind)).toContain('hidden');
  });
});

describe('adviseWording: French spacing', () => {
  it('names each kind of spacing to fix, once', () => {
    const text = "L'entrée: ouverte! «Oui»";
    expect(kinds(text, 'fr')).toEqual(['spacing:straight-apostrophe:', 'spacing:guillemet-spacing:', 'spacing:colon-spacing:', 'spacing:high-punctuation-spacing:']);
    for (const a of adviseWording(text, 'fr')) expect(a.suggestion).toBe('Appuyez sur le bouton qui corrige les espaces du français.');
  });
  it('is not looked at for English text', () => {
    expect(kinds("It's here: open!", 'en')).toEqual([]);
  });
  it('finds nothing in French that is already spaced', () => {
    expect(kinds('L’entrée\u00a0: ouverte\u202f! «\u202fOui\u202f»', 'fr')).toEqual([]);
  });
  it('knows when there is spacing to fix', () => {
    expect(hasSpacingToFix("L'entrée: ouverte!")).toBe(true);
    expect(hasSpacingToFix('L’entrée\u00a0: ouverte\u202f!')).toBe(false);
    expect(hasSpacingToFix('')).toBe(false);
  });
});

describe('adviseWording: words from the other language', () => {
  it('gives the App’s word in the language of the text', () => {
    const advice = adviseWording('Le washroom est fermé.', 'fr').find((a) => a.kind === 'language');
    expect(advice).toMatchObject({ rule: 'other-language:washroom', found: 'washroom', suggestion: 'En français, l’application dit «\u202fToilettes\u202f».' });
    const en = adviseWording('The ascenseur is closed.', 'en').find((a) => a.kind === 'language');
    expect(en).toMatchObject({ found: 'ascenseur', reason: 'This is the French word in the App’s list of terms.', suggestion: 'In English, the App says “Elevator”.' });
  });
});

describe('adviseWording in general', () => {
  it('finds nothing in plain, honest text', () => {
    for (const [text, lang] of [
      ['One source reports a ramp at the main entrance. The record is dated 2026-06-01.', 'en'],
      ['Unknown means we have no information.', 'en'],
      ['Une source signale une rampe à l’entrée principale. La fiche date du 2026-06-01.', 'fr'],
    ] as const) {
      expect(kinds(text, lang), text).toEqual([]);
    }
  });
  it('finds nothing in no text', () => {
    expect(adviseWording('', 'en')).toEqual([]);
    expect(adviseWording('  \n\t ', 'fr')).toEqual([]);
  });
  it('gives the advice in a fixed order of kinds', () => {
    const text = `Veri​fied. VERIFIED BY US. This place is fully accessible. Use the additional washroom ${Array.from({ length: 22 }, () => 'now').join(' ')}.`;
    const order = adviseWording(text, 'fr').map((a) => ADVICE_KINDS.indexOf(a.kind));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(adviseWording(text, 'fr').map((a) => a.kind)).size).toBeGreaterThanOrEqual(4);
  });
  it('looks only at the start of a very long text', () => {
    const text = `${'word '.repeat(MAX_ADVICE_CHARS / 5)}. verified`;
    expect(text.length).toBeGreaterThan(MAX_ADVICE_CHARS);
    expect(adviseWording(text, 'en').some((a) => a.kind === 'word')).toBe(false);
    expect(adviseWording(`verified ${text}`, 'en').some((a) => a.kind === 'word')).toBe(true);
  });
  it('counts the advice by kind', () => {
    const counts = adviceCounts(adviseWording('Verified and certified. This place is safe to enter.', 'en'));
    expect(counts.word).toBe(2);
    expect(counts.claim).toBeGreaterThanOrEqual(1);
    expect(Object.keys(counts)).toEqual([...ADVICE_KINDS]);
    expect(Object.values(adviceCounts([])).every((n) => n === 0)).toBe(true);
  });
  it('agrees with the rules: advice for exactly what they find', () => {
    for (const text of ['Verified by a partner in real time.', 'Official and approved, safe to enter for everyone.', 'AODA compliant and barrier-free.']) {
      const advice = adviseWording(text, 'en');
      expect(advice.filter((a) => a.kind === 'word').map((a) => a.found.toLowerCase()).sort()).toEqual([...new Set(lintCopy(text).map((v) => v.match.toLowerCase()))].sort());
      expect(advice.filter((a) => a.kind === 'claim').map((a) => a.found.toLowerCase()).sort()).toEqual([...new Set(lintClaims(text).map((v) => v.match.toLowerCase()))].sort());
    }
  });
});

describe('ADVICE_UI', () => {
  const texts = (lang: Lang): string[] => {
    const ui = ADVICE_UI[lang];
    return [
      ...Object.values(ui.words).flatMap((a) => [a.reason, a.suggestion]),
      ...Object.values(ui.claims).flatMap((a) => [a.reason, a.suggestion]),
      ...Object.values(ui.spacing),
      ui.spacingFix, ui.longSentence(24), ui.longSentenceFix(20), ui.allCaps, ui.allCapsFix, ui.plainer, ui.plainerFix('more'), ui.hidden, ui.hiddenFix, ui.otherLanguage, ui.otherLanguageFix('Elevator'),
    ];
  };
  it('has advice for every wording rule, every claim rule and every spacing rule, in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(Object.keys(ADVICE_UI[lang].words).sort()).toEqual([...COPY_RULE_IDS].sort());
      expect(Object.keys(ADVICE_UI[lang].claims).sort()).toEqual([...CLAIM_RULE_IDS].sort());
      expect(Object.keys(ADVICE_UI[lang].spacing).sort()).toEqual([...FRENCH_RULES].sort());
    }
    expect(Object.keys(ADVICE_UI.fr)).toEqual(Object.keys(ADVICE_UI.en));
    expect(new Set(advisedRules()).size).toBe(advisedRules().length);
    for (const id of [...COPY_RULE_IDS, ...CLAIM_RULE_IDS]) expect(advisedRules()).toContain(id);
  });
  it('never uses, in a reason or a suggestion, the words it is about', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of texts(lang)) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(findBannedCopy(text, 'advice'), text).toEqual([]);
      }
    }
  });
  it('is itself plain to read, with French spacing in French', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of texts(lang)) {
        expect(plainLanguageIssues(text), text).toEqual([]);
        expect(readabilityIssues(text, lang), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
  it('gives a different reason for each rule', () => {
    for (const lang of ['en', 'fr'] as const) {
      const reasons = [...Object.values(ADVICE_UI[lang].words), ...Object.values(ADVICE_UI[lang].claims)].map((a) => a.reason);
      expect(new Set(reasons).size).toBe(reasons.length);
    }
  });
  it('advises on its own advice with nothing to say', () => {
    for (const lang of ['en', 'fr'] as const) for (const text of texts(lang)) expect(adviseWording(text, lang).filter((a) => a.kind !== 'language'), text).toEqual([]);
  });
});
