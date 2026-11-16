import { describe, expect, it } from 'vitest';
import { COPY_RULE_IDS, lintCopy, passesCopyRules, type CopyRuleId } from './index';

function rulesFor(text: string): CopyRuleId[] {
  return lintCopy(text).map((v) => v.rule);
}

describe('lintCopy', () => {
  it('flags verification, real-time and partnership claims (EN)', () => {
    expect(rulesFor('Verified by our team')).toEqual(['no-verification-claim']);
    expect(rulesFor('Real-time updates')).toContain('no-realtime-claim');
    expect(rulesFor('Our partner network')).toEqual(['no-partnership-claim']);
    expect(rulesFor('guaranteed accurate')).toEqual(['no-verification-claim']);
  });

  it('flags the words we never use: verify, guarantee, realtime, partnership', () => {
    expect(rulesFor('We verify every entry')).toEqual(['no-verification-claim']);
    expect(rulesFor('This is a guarantee')).toEqual(['no-verification-claim']);
    expect(rulesFor('No guarantees given')).toEqual(['no-verification-claim']);
    expect(rulesFor('Realtime map')).toEqual(['no-realtime-claim']);
    expect(rulesFor('A partnership')).toEqual(['no-partnership-claim']);
    expect(rulesFor('Nous vérifions')).toEqual(['no-verification-claim']);
    expect(rulesFor('Une garantie')).toEqual(['no-verification-claim']);
  });

  it('flags the same claims in French', () => {
    expect(rulesFor('Information vérifiée')).toEqual(['no-verification-claim']);
    expect(rulesFor('Mise à jour en temps réel')).toEqual(['no-realtime-claim']);
    expect(rulesFor('En partenariat avec')).toEqual(['no-partnership-claim']);
    expect(rulesFor('Données certifiées')).toEqual(['no-verification-claim']);
  });

  it('flags conformance claims', () => {
    expect(rulesFor('AAA')).toEqual(['no-conformance-claim']);
    expect(rulesFor('WCAG-compliant pages')).toEqual(['no-conformance-claim']);
    expect(rulesFor('entièrement accessible')).toEqual(['no-conformance-claim']);
  });

  it('flags AI mentions but not the French verb ai or the word aid', () => {
    expect(rulesFor('Powered by AI')).toEqual(['no-ai-mention']);
    expect(rulesFor('Une IA répond')).toEqual(['no-ai-mention']);
    expect(rulesFor('intelligence artificielle')).toEqual(['no-ai-mention']);
    expect(rulesFor('J’ai une rampe')).toEqual([]);
    expect(rulesFor('A visual aid')).toEqual([]);
  });


  it('flags medical advice and eligibility claims', () => {
    expect(rulesFor('Consult your doctor')).toEqual(['no-medical-advice']);
    expect(rulesFor('Consultez votre médecin')).toEqual(['no-medical-advice']);
    expect(rulesFor('You qualify for this')).toEqual(['no-eligibility-claim']);
    expect(rulesFor('Vous êtes admissible')).toEqual(['no-eligibility-claim']);
    expect(rulesFor('SCIO ramp')).toEqual(['no-forbidden-org']);
    expect(rulesFor('See sciontario.org')).toEqual(['no-forbidden-org']);
  });

  it('returns the matched text', () => {
    expect(lintCopy('Real time')[0]?.match).toBe('Real time');
  });

  it('does not match inside longer words', () => {
    expect(passesCopyRules('Verifiable steps and a trainee')).toBe(true);
    expect(passesCopyRules('Aaaand done')).toBe(true);
  });

  it('passes ordinary glossary wording', () => {
    expect(passesCopyRules('An entrance with no steps between the outside and the inside.')).toBe(true);
    expect(passesCopyRules('Une entrée sans marche entre l’extérieur et l’intérieur.')).toBe(true);
  });

  it('lists all rule ids', () => {
    expect(COPY_RULE_IDS).toHaveLength(8);
  });
});
