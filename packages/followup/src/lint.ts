import { OVERCLAIM_PATTERNS } from "@access/help";

export type LintRule =
  | "overclaim"
  | "endorsement"
  | "verified-claim"
  | "live-claim"
  | "health-claim"
  | "commitment"
  | "ai-mention"
  | "placeholder"
  | "email"
  | "phone"
  | "postal-code";

export interface LintHit {
  rule: LintRule;
  /** Pattern id, for example endorsed-by. */
  id: string;
  /** The matched words. For privacy rules this is withheld. */
  match: string;
  severity: "blocker" | "serious" | "review";
}

interface Pattern {
  rule: LintRule;
  id: string;
  pattern: RegExp;
  severity: LintHit["severity"];
  /** Skip the hit when the sentence states the opposite. */
  negatable?: boolean;
}

const ORG = String.raw`(?:SCIO|Spinal Cord Injury Ontario|Lésions Médullaires Ontario|LMO)`;

const PATTERNS: Pattern[] = [
  ...OVERCLAIM_PATTERNS.map((item): Pattern => ({ rule: "overclaim", id: item.id, pattern: item.pattern, severity: "blocker" })),
  { rule: "endorsement", id: "org-endorsed", pattern: new RegExp(String.raw`\b${ORG}\s+(?:has\s+|have\s+)?(?:endorsed|approved|backed|adopted|signed off on|agreed to (?:adopt|use|fund|partner|promote|endorse))\b`, "i"), severity: "blocker" },
  { rule: "endorsement", id: "org-will", pattern: new RegExp(String.raw`\b${ORG}\s+(?:will|is going to)\s+(?:adopt|fund|promote|endorse|launch|partner)\b`, "i"), severity: "blocker" },
  { rule: "endorsement", id: "with-support", pattern: new RegExp(String.raw`\bwith\s+${ORG}(?:'s|’s)\s+(?:support|approval|endorsement|blessing)\b`, "i"), severity: "blocker" },
  { rule: "endorsement", id: "org-a-approuve", pattern: new RegExp(String.raw`\b${ORG}\s+(?:a|ont)\s+(?:approuvé|appuyé|adopté|accepté d'adopter|convenu d'adopter)`, "i"), severity: "blocker" },
  { rule: "endorsement", id: "avec-appui", pattern: new RegExp(String.raw`\bavec\s+l['’](?:appui|approbation|aval)\s+de\s+${ORG}`, "i"), severity: "blocker" },
  { rule: "verified-claim", id: "verified", pattern: /\b(?:is|are|was|were|been|fully|all)\s+verified\b|\bverified\s+(?:data|record|records|place|places|washroom|washrooms|entrance|entrances|information|accessibility)\b/i, severity: "blocker", negatable: true },
  { rule: "verified-claim", id: "verifie", pattern: /\b(?:données|fiches?|lieux|toilettes|entrées|renseignements)\s+vérifié(?:e|es|s)?\b|\b(?:est|sont|a été|ont été)\s+vérifié(?:e|es|s)?\b/i, severity: "blocker", negatable: true },
  { rule: "verified-claim", id: "fully-accessible", pattern: /\b(?:fully|100\s?%|guaranteed)\s+accessible\b|\bentièrement accessible\b/i, severity: "blocker", negatable: true },
  { rule: "live-claim", id: "real-time", pattern: /\breal[- ]time\b|\blive (?:elevator|status|data|availability|updates?)\b|\ben temps réel\b|\bétat en direct\b/i, severity: "blocker", negatable: true },
  { rule: "health-claim", id: "improves", pattern: /\b(?:improves?|boosts?|sharpens?|restores?|treats?|cures?|heals?|prevents?|reduces?)\s+(?:your\s+)?(?:memory|cognition|cognitive|brain|recovery|pressure (?:injuries|sores|ulcers)|spasticity|pain|bladder|bowel|dysreflexia)\b/i, severity: "blocker", negatable: true },
  { rule: "health-claim", id: "ameliore", pattern: /\b(?:améliorent|améliore|stimulent|stimule|guérissent|guérit|traitent|traite|préviennent|prévient|réduisent|réduit)\s+(?:la|le|les|votre|vos)?\s*(?:mémoire|cognition|cerveau|récupération|plaies de pression|spasticité|douleur|vessie|intestin|dysréflexie)\b/i, severity: "blocker", negatable: true },
  { rule: "health-claim", id: "medical-instruction", pattern: /\byou should (?:stop|start|change|increase|decrease) (?:your )?(?:medication|dose|catheteri[sz]ation|bowel routine)\b/i, severity: "blocker" },
  { rule: "commitment", id: "we-will", pattern: /\bwe (?:will|promise|guarantee|commit to)\b|\bnous (?:allons|promettons|garantissons|nous engageons)\b/i, severity: "review" },
  { rule: "ai-mention", id: "ai", pattern: /\b(?:AI|IA|LLM)\b|\bartificial intelligence\b|\bintelligence artificielle\b|\b(?:ChatGPT|Claude|Grok|Gemini|Copilot)\b|\blanguage model\b|\bmodèle de langage\b/, severity: "blocker" },
  { rule: "placeholder", id: "placeholder", pattern: /\[[^\]\n]{1,40}\](?!\()|\{\{[^}]*\}\}|\b(?:TODO|TBD|XXX|FIXME)\b|<[A-Z][A-Z _-]{2,}>/, severity: "blocker" },
  { rule: "email", id: "email", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, severity: "blocker" },
  { rule: "phone", id: "phone", pattern: /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/, severity: "blocker" },
  { rule: "postal-code", id: "postal-code", pattern: /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/i, severity: "blocker" },
];

const NEGATION = /\b(?:not|no|never|nothing|none|unverified|unknown|unconfirmed|without|isn't|aren't|wasn't|weren't|cannot|can't|does not|do not|unavailable|pas|aucun(?:e)?|jamais|non|ni|sans|indisponible)\b/i;

const PRIVATE: ReadonlySet<LintRule> = new Set(["email", "phone", "postal-code"]);

/** Splits into sentences so a negation in one sentence does not excuse another. */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?;:])\s+|\n+/).filter((part) => part.trim() !== "");
}

/**
 * Checks text a person will read or send. Privacy hits do not echo the
 * matched value, so a report about a leak does not repeat it.
 */
export function lintText(text: string, only?: readonly LintRule[]): LintHit[] {
  const hits: LintHit[] = [];
  for (const sentence of sentences(text)) {
    for (const item of PATTERNS) {
      if (only && !only.includes(item.rule)) continue;
      const match = item.pattern.exec(sentence);
      if (!match) continue;
      if (item.negatable && NEGATION.test(sentence)) continue;
      hits.push({
        rule: item.rule,
        id: item.id,
        match: PRIVATE.has(item.rule) ? "(withheld)" : match[0],
        severity: item.severity,
      });
    }
  }
  return hits;
}

export const PRIVACY_RULES: readonly LintRule[] = ["email", "phone", "postal-code"];
export const RECORD_RULES: readonly LintRule[] = [
  "overclaim",
  "endorsement",
  "verified-claim",
  "live-claim",
  "health-claim",
  "placeholder",
  "email",
  "phone",
  "postal-code",
];
