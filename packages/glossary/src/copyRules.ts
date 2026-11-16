/**
 * Wording rules for user-facing copy, EN + FR. The app must not overclaim
 * (verified, real-time, partnership, conformance), mention AI, or give medical / eligibility advice.
 */

export type CopyRuleId =
  | 'no-verification-claim'
  | 'no-realtime-claim'
  | 'no-partnership-claim'
  | 'no-conformance-claim'
  | 'no-ai-mention'
  | 'no-medical-advice'
  | 'no-eligibility-claim';

export interface CopyViolation {
  readonly rule: CopyRuleId;
  readonly match: string;
}

function w(list: readonly string[], flags = 'giu'): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${list.join('|')})(?![\\p{L}\\p{N}])`, flags);
}

interface CopyRule {
  readonly id: CopyRuleId;
  readonly patterns: readonly RegExp[];
}

const COPY_RULES: readonly CopyRule[] = [
  {
    id: 'no-verification-claim',
    patterns: [
      w(['verified', 'certified', 'guaranteed?', 'vérifié(?:e|s|es)?', 'certifié(?:e|s|es)?', 'garanti(?:e|s|es)?']),
    ],
  },
  {
    id: 'no-realtime-claim',
    patterns: [w(['real[- ]time', 'live updates?', 'temps réel', 'en direct'])],
  },
  {
    id: 'no-partnership-claim',
    patterns: [w(['partner(?:s|ed|ship|ships)?', 'partenaires?', 'partenariats?'])],
  },
  {
    id: 'no-conformance-claim',
    patterns: [
      w(['AAA'], 'gu'),
      w([
        'AA[- ](?:conformant|compliant)',
        'WCAG[- ]compliant',
        'fully accessible',
        '100 ?% accessible',
        'entièrement accessible',
        'conforme aux WCAG',
      ]),
    ],
  },
  {
    id: 'no-ai-mention',
    patterns: [
      w(['AI', 'A\\.I\\.', 'IA'], 'gu'),
      w(['artificial intelligence', 'intelligence artificielle', 'machine learning', 'chatbot']),
    ],
  },
  {
    id: 'no-medical-advice',
    patterns: [
      w([
        'medical advice',
        'consult (?:a|your) (?:doctor|physician)',
        'diagnos(?:e|es|ed|is)',
        'treatment',
        'conseil médical',
        'consultez (?:un|votre) médecin',
        'diagnostic',
        'traitement',
      ]),
    ],
  },
  {
    id: 'no-eligibility-claim',
    patterns: [
      w(['you (?:qualify|are eligible)', 'eligible', 'éligible', 'admissible', 'vous avez droit', 'vous êtes admissible']),
    ],
  },
];

export const COPY_RULE_IDS: readonly CopyRuleId[] = COPY_RULES.map((r) => r.id);

/** Every banned phrase found in `text`, with the rule it breaks. */
export function lintCopy(text: string): readonly CopyViolation[] {
  const found: CopyViolation[] = [];
  for (const rule of COPY_RULES) {
    for (const pattern of rule.patterns) {
      for (const m of text.matchAll(pattern)) {
        found.push({ rule: rule.id, match: m[0] });
      }
    }
  }
  return found;
}

export function passesCopyRules(text: string): boolean {
  return lintCopy(text).length === 0;
}
