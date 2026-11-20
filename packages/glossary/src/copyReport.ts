import { catalogueStrings, catalogueStructureFindings } from './catalogueWording';
import type { Term } from './terms';
import { lintClaims } from './claimRules';
import { lintCopy } from './copyRules';
import { scanText } from './deepScan';
import { frenchIssues } from './frTypography';
import { UI_TABLES, inventory } from './inventory';
import { allParity } from './parity';
import { plainLanguageIssues } from './plainLanguage';
import { readabilityIssues } from './readability';
import type { Lang } from './plainTerms';

/**
 * One report over every string people can read: banned wording, unsafe claims, hidden text,
 * French typography, sentence length, readability and EN/FR parity. The result is plain data,
 * so CI can print it, count it and fail on it.
 */
export type CopyCheck = 'banned' | 'claim' | 'hidden' | 'french' | 'sentence' | 'readability' | 'parity' | 'catalogue';

export const COPY_CHECKS: readonly CopyCheck[] = ['banned', 'claim', 'hidden', 'french', 'sentence', 'readability', 'parity', 'catalogue'];

export interface CopyIssue {
  readonly check: CopyCheck;
  readonly where: string;
  readonly lang: Lang | 'both';
  readonly detail: string;
}

export interface CopyReport {
  readonly issues: readonly CopyIssue[];
  readonly checked: Readonly<Record<Lang, number>>;
  readonly byCheck: Readonly<Record<CopyCheck, number>>;
}

const LANGS: readonly Lang[] = ['en', 'fr'];

/** All issues in one string. `where` names the place the string lives. */
export function issuesForText(text: string, where: string, lang: Lang): readonly CopyIssue[] {
  const out: CopyIssue[] = [];
  const add = (check: CopyCheck, detail: string): void => void out.push({ check, where, lang, detail });
  for (const v of lintCopy(text)) add('banned', `${v.rule}: "${v.match}"`);
  for (const v of lintClaims(text)) add('claim', `${v.rule}: "${v.match}"`);
  for (const f of scanText(text)) add('hidden', `${f.rule}: "${f.match}" (${f.view})`);
  if (lang === 'fr') for (const r of frenchIssues(text)) add('french', r);
  for (const i of plainLanguageIssues(text)) add('sentence', `${i.rule}: ${i.words > 0 ? `${i.words} words` : i.text}`);
  for (const i of readabilityIssues(text, lang)) add('readability', `${i.rule}: ${i.detail}`);
  return out;
}

/**
 * Every issue in the term catalogue: the wording checks over each label and note, with data
 * labels set aside, and the findings about the catalogue's shape.
 */
export function catalogueCopyIssues(terms?: readonly Term[]): readonly CopyIssue[] {
  const issues: CopyIssue[] = [];
  for (const lang of LANGS) {
    for (const s of catalogueStrings(lang, terms)) issues.push(...issuesForText(s.checked, s.where, lang));
  }
  for (const f of catalogueStructureFindings(terms)) issues.push({ check: 'catalogue', where: `catalogue.${f.termId}`, lang: f.lang, detail: `${f.rule}: ${f.detail}` });
  return issues;
}

/** Runs every check over the inventory in both languages, plus the EN/FR parity checks and the term catalogue. */
export function buildCopyReport(): CopyReport {
  const issues: CopyIssue[] = [];
  const checked: Record<Lang, number> = { en: 0, fr: 0 };
  for (const lang of LANGS) {
    for (const s of inventory(lang)) {
      checked[lang] += 1;
      issues.push(...issuesForText(s.text, s.where, lang));
    }
  }
  for (const p of allParity(UI_TABLES)) issues.push({ check: 'parity', where: p.where, lang: 'both', detail: `${p.rule}: ${p.detail}` });
  for (const lang of LANGS) checked[lang] += catalogueStrings(lang).length;
  issues.push(...catalogueCopyIssues());
  return { issues, checked, byCheck: countByCheck(issues) };
}

export function countByCheck(issues: readonly CopyIssue[]): Readonly<Record<CopyCheck, number>> {
  const counts = Object.fromEntries(COPY_CHECKS.map((c) => [c, 0])) as Record<CopyCheck, number>;
  for (const i of issues) counts[i.check] += 1;
  return counts;
}

/** Plain text for a terminal or a CI log: a summary line, then one line per issue. */
export function formatCopyReport(report: CopyReport): string {
  const head = `Copy checked: ${report.checked.en} English and ${report.checked.fr} French strings.`;
  if (report.issues.length === 0) return `${head}\nNo copy issues.`;
  const counts = COPY_CHECKS.filter((c) => report.byCheck[c] > 0).map((c) => `${c} ${report.byCheck[c]}`).join(', ');
  const lines = report.issues.map((i) => `${i.check.toUpperCase()} ${i.where} [${i.lang}]: ${i.detail}`);
  return [head, `${report.issues.length} copy issue(s): ${counts}.`, ...lines].join('\n');
}

/** The same report as JSON, with a stable key order. */
export function copyReportJson(report: CopyReport): string {
  return JSON.stringify({ checked: report.checked, byCheck: report.byCheck, issues: report.issues }, null, 2);
}

/** 1 when there is any issue, else 0. Logs the report. */
export function copyExitCode(report: CopyReport, log: (line: string) => void): number {
  log(formatCopyReport(report));
  return report.issues.length > 0 ? 1 : 0;
}
