// guard:allow-terms (this file defines the rules, so it names the terms)

import { BANNED_WORDING } from "./wording";

/**
 * Source rules for this workstream, applied to every non-test .ts and .html
 * file under packages/onboarding by guard.test.ts (part of `npm run ci`).
 */
export interface GuardIssue {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
}

interface Rule {
  readonly id: string;
  readonly re: RegExp;
  /** Skipped for files carrying the guard:allow-terms marker (files that list the terms). */
  readonly termList?: boolean;
}

const RULES: readonly Rule[] = [
  { id: "literal-nbsp: write U+00A0 as \\u00A0", re: /\u00A0/ },
  { id: "literal-nnbsp: write U+202F as \\u202F", re: /\u202F/ },
  { id: "zoom-blocked: viewport must allow zoom", re: /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i },
  { id: "positive-tabindex", re: /tabindex\s*=\s*["']?[1-9]/i },
  { id: "tile-server: no third-party tile servers", re: /tile\.openstreetmap|api\.mapbox|maps\.googleapis|stadiamaps|cartocdn|tiles\.mapbox/i, termList: true },
  { id: "scheduler: no cron or scheduled workflows", re: /\bcron\b|schedule:\s*$/i, termList: true },
  { id: "secret-like literal", re: /(api[_-]?key|secret|passw(or)?d|token)\s*[:=]\s*["'][^"']{8,}["']/i },
  { id: "overclaim: wording not allowed in user copy", re: BANNED_WORDING, termList: true },
  { id: "ai-wording: no AI mentions in user copy", re: /\bAI\b|\bIA\b|artificial intelligence|intelligence artificielle/, termList: true },
  { id: "aaa-claim", re: /\bAAA\b/, termList: true },
];

export function scanSource(file: string, text: string): GuardIssue[] {
  const allowTerms = text.includes("guard:allow-terms");
  const issues: GuardIssue[] = [];
  const lines = text.split("\n");
  lines.forEach((ln, i) => {
    for (const r of RULES) {
      if (r.termList && allowTerms) continue;
      if (r.re.test(ln)) issues.push({ file, line: i + 1, rule: r.id });
    }
  });
  return issues;
}

/** Files that define wording lists and are checked for everything but wording. */
export const TERM_LIST_FILES: readonly string[] = ["paths.ts", "typography.ts"];
