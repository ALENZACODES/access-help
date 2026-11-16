import { describe, expect, it } from 'vitest';
import { CLAIM_RULE_IDS, lintClaims, passesClaimRules, type ClaimRuleId } from './index';

const rulesFor = (text: string): ClaimRuleId[] => [...new Set(lintClaims(text).map((v) => v.rule))];

describe('lintClaims: what we never say about a place', () => {
  it.each([
    ['The library is accessible.', 'no-absolute-accessible'],
    ['The café is fully accessible', 'no-absolute-accessible'],
    ['A wheelchair-accessible entrance', 'no-absolute-accessible'],
    ['Accessible to all', 'no-absolute-accessible'],
    ['La bibliothèque est accessible.', 'no-absolute-accessible'],
    ['Entrée accessible en fauteuil roulant', 'no-absolute-accessible'],
    ['Un lieu accessible à tous', 'no-absolute-accessible'],
  ] as const)('flags "%s"', (text, rule) => {
    expect(rulesFor(text)).toContain(rule);
  });

  it.each([
    ['A barrier-free building', 'no-barrier-free'],
    ['There are no barriers here', 'no-barrier-free'],
    ['Un bâtiment sans obstacle', 'no-barrier-free'],
    ['Probably accessible', 'no-inferred-accessible'],
    ['It should be accessible', 'no-inferred-accessible'],
    ['Devrait être accessible', 'no-inferred-accessible'],
    ['The ramp is safe', 'no-safety-claim'],
    ['Safe to use', 'no-safety-claim'],
    ['Un accès sécuritaire', 'no-safety-claim'],
    ['Suitable for wheelchairs', 'no-suitability-claim'],
    ['Perfect for families', 'no-suitability-claim'],
    ['We recommend this place', 'no-suitability-claim'],
    ['Idéal pour les familles', 'no-suitability-claim'],
    ['You will be able to enter', 'no-outcome-promise'],
    ['Aucun problème pour entrer', 'no-outcome-promise'],
    ['Always up to date', 'no-freshness-claim'],
    ['Our latest information', 'no-freshness-claim'],
    ['Les données sont à jour', 'no-freshness-claim'],
    ['An official listing', 'no-official-claim'],
    ['Approved by the city', 'no-official-claim'],
    ['Liste officielle', 'no-official-claim'],
    ['Made for everyone', 'no-universal-claim'],
    ['All abilities welcome', 'no-universal-claim'],
    ['Pour tous les handicaps', 'no-universal-claim'],
    ['AODA-compliant washroom', 'no-code-compliance-claim'],
    ['This door meets the standards', 'no-code-compliance-claim'],
    ['Respecte les normes', 'no-code-compliance-claim'],
  ] as const)('flags "%s" as %s', (text, rule) => {
    expect(rulesFor(text)).toContain(rule);
  });

  it('returns the text that matched', () => {
    expect(lintClaims('Fully accessible!')[0]?.match).toBe('Fully accessible');
  });

  it('is not case sensitive', () => {
    expect(passesClaimRules('FULLY ACCESSIBLE')).toBe(false);
  });

  it('has one id per rule and covers every kind of claim', () => {
    expect(new Set(CLAIM_RULE_IDS).size).toBe(CLAIM_RULE_IDS.length);
    expect(CLAIM_RULE_IDS).toHaveLength(10);
  });
});

describe('lintClaims: wording we do use stays allowed', () => {
  it.each([
    'Accessible parking',
    'An accessible washroom has more space.',
    'Toilettes accessibles',
    'Une place de stationnement réservée aux personnes qui ont un permis de stationnement accessible.',
    'Ramp: reported as available.',
    'Rampe : signalé comme disponible.',
    'Unknown means we have no information.',
    'Inconnu veut dire que nous n’avons pas d’information.',
    'Information is old. Ask the place before you go.',
    'Data updated: 2 places added.',
    'Données mises à jour : 2 lieux ajoutés.',
    'Best match',
    'Meilleure correspondance',
    'Newest information',
    'Information la plus récente',
    'Source: City open data. Licence: CC0-1.0. Date: 2026-06-01.',
    'The order is not a rating of a place.',
    'Step-free entrance',
    'Largeur libre de porte',
  ])('allows "%s"', (text) => {
    expect(lintClaims(text)).toEqual([]);
  });

  it('does not match inside longer words', () => {
    expect(passesClaimRules('Officiate')).toBe(true);
    expect(passesClaimRules('Disapproved')).toBe(true);
    expect(passesClaimRules('Latest')).toBe(true);
  });
});
