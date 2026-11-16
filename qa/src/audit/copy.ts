/**
 * Banned-wording audit for user copy. CI- and test-only.
 * Do not import this from UI code: it names the words the App must not use.
 *
 * The App does not claim a place or a record has been confirmed by anyone, that data is
 * live, that anyone is a partner, or that anything is guaranteed. Those words are
 * matched whole, in English and French, so "oververified" style accidents are not
 * a problem but a longer word that contains one of them is not missed either.
 */

export interface BannedTerm {
  id: string;
  pattern: RegExp;
}

// "(?<![\p{L}])" and "(?![\p{L}])" make these whole-word matches that also work with accents.
const word = (source: string) => new RegExp(`(?<![\\p{L}])(?:${source})(?![\\p{L}])`, "iu");

export const BANNED_TERMS: readonly BannedTerm[] = [
  { id: "verified", pattern: word("(?:un|non-?)?verified|v[ée]rifi[ée]e?s?") },
  { id: "real-time", pattern: word("real[- ]?time|temps r[ée]el") },
  { id: "partnership", pattern: word("partnerships?|partenariats?") },
  { id: "guarantee", pattern: word("guarantees?|guaranteed|garanties?|garanti(?:e|s|es)?") },
];

export interface CopyFinding {
  file: string;
  line: number;
  term: string;
  text: string;
}

/** The only allowlisted token that may contain a banned stem. */
const ALLOWED_TOKEN = /PROTOTYPE-UNVERIFIED/g;

export function findBannedCopy(text: string, file: string): CopyFinding[] {
  const findings: CopyFinding[] = [];
  text.split(/\r?\n/).forEach((lineText, index) => {
    const masked = lineText.replace(ALLOWED_TOKEN, "");
    for (const { id, pattern } of BANNED_TERMS) {
      if (pattern.test(masked)) findings.push({ file, line: index + 1, term: id, text: lineText.trim().slice(0, 120) });
    }
  });
  return findings;
}

export function countsByFile(findings: readonly CopyFinding[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const finding of findings) counts[finding.file] = (counts[finding.file] ?? 0) + 1;
  return counts;
}
