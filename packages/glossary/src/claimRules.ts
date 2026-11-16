/**
 * Claims the App must never make about a place, EN + FR. copyRules.ts covers verification,
 * real-time, partnership, conformance, AI, medical and eligibility wording. These rules cover
 * what a sentence says about a place: that it is accessible overall, safe, suitable, official,
 * up to date, or that an outcome is promised. Reports come from sources and stay as reported.
 */

export type ClaimRuleId =
  | 'no-absolute-accessible'
  | 'no-barrier-free'
  | 'no-inferred-accessible'
  | 'no-safety-claim'
  | 'no-suitability-claim'
  | 'no-outcome-promise'
  | 'no-freshness-claim'
  | 'no-official-claim'
  | 'no-universal-claim'
  | 'no-code-compliance-claim';

export interface ClaimViolation {
  readonly rule: ClaimRuleId;
  readonly match: string;
}

function w(list: readonly string[]): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${list.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
}

interface ClaimRule {
  readonly id: ClaimRuleId;
  readonly patterns: readonly RegExp[];
}


const CLAIM_RULES: readonly ClaimRule[] = [
  {
    id: 'no-absolute-accessible',
    patterns: [
      w([
        '(?:is|are|was|were|remains?) (?:fully |completely |totally |entirely |100 ?% )?(?:wheelchair[- ])?accessible',
        '(?:fully|completely|totally|entirely|wheelchair)[- ]accessible',
        '(?:est|sont|reste|restent) (?:entièrement |complètement |totalement )?accessibles?(?: en fauteuil roulant)?',
        'accessible en fauteuil roulant',
        'accessible à tous',
        'accessible for all',
        'accessible to all',
      ]),
    ],
  },
  {
    id: 'no-barrier-free',
    patterns: [
      w(['barrier[- ]free', 'no barriers?', 'without (?:any )?barriers?', 'sans obstacles?', 'sans barrières?', 'sans entraves?']),
    ],
  },
  {
    id: 'no-inferred-accessible',
    patterns: [
      w([
        '(?:probably|likely|should be|must be|seems|appears to be) (?:fully )?accessible',
        '(?:probablement|vraisemblablement) accessibles?',
        '(?:devrait|doit|semble) être accessible',
      ]),
    ],
  },
  {
    id: 'no-safety-claim',
    patterns: [
      w([
        'safe (?:to use|to enter|for you|for everyone|place|access)',
        'is safe',
        'are safe',
        'completely safe',
        'sécuritaires?',
        'sans danger',
        'en toute sécurité',
        'est sûre?s?',
      ]),
    ],
  },
  {
    id: 'no-suitability-claim',
    patterns: [
      w([
        'suitable for',
        'perfect for',
        'ideal for',
        'great for',
        'best for you',
        'right for you',
        'recommended for you',
        'we recommend',
        'convient à',
        'conviennent à',
        'idéale? pour',
        'parfaite? pour',
        'recommandée? pour vous',
        'nous recommandons',
      ]),
    ],
  },
  {
    id: 'no-outcome-promise',
    patterns: [
      w([
        'you will be able to',
        'you(?:’ll|\'ll) be able to',
        'you can get in',
        'you can enter',
        'no problem getting',
        'will work for you',
        'vous pourrez entrer',
        'vous pourrez accéder',
        'aucun problème',
        'vous n’aurez aucun',
      ]),
    ],
  },
  {
    id: 'no-freshness-claim',
    patterns: [
      w([
        'up[- ]to[- ]date',
        'always current',
        'always accurate',
        'latest information',
        'current information',
        '(?:est|sont|reste|restent|toujours) à jour',
        'toujours exacte?s?',
        'toujours à jour',
        'informations? actuelles?',
      ]),
    ],
  },
  {
    id: 'no-official-claim',
    patterns: [w(['official(?:ly)?', 'approved', 'endorsed', 'accredited', 'officielle?s?', 'approuvée?s?', 'homologuée?s?', 'agréée?s?'])],
  },
  {
    id: 'no-universal-claim',
    patterns: [
      w([
        'for everyone',
        'for all abilities',
        'all abilities',
        'any disability',
        'every disability',
        'pour tout le monde',
        'pour tous',
        'toutes les capacités',
        'tous les handicaps',
      ]),
    ],
  },
  {
    id: 'no-code-compliance-claim',
    patterns: [
      w([
        '(?:AODA|ADA|OBC|building code)[- ](?:compliant|approved|certified)',
        'meets (?:the )?(?:AODA|ADA|code|standards?)',
        'complies with',
        'conforme (?:à la|aux|au) (?:LAPHO|ADA|code|normes?)',
        'respecte (?:la|le|les) (?:LAPHO|code|normes?)',
        'répond aux normes',
      ]),
    ],
  },
];

export const CLAIM_RULE_IDS: readonly ClaimRuleId[] = CLAIM_RULES.map((r) => r.id);

/** Every unsafe claim found in `text`, with the rule it breaks. */
export function lintClaims(text: string): readonly ClaimViolation[] {
  const found: ClaimViolation[] = [];
  for (const rule of CLAIM_RULES) {
    for (const pattern of rule.patterns) {
      for (const m of text.matchAll(pattern)) found.push({ rule: rule.id, match: m[0] });
    }
  }
  return found;
}

export function passesClaimRules(text: string): boolean {
  return lintClaims(text).length === 0;
}

