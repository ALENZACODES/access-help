/**
 * String-table audit: English and French copy must stay in step.
 * CI- and test-only. It reads the tables the screens use and reports each problem
 * with the table, the key, and what is wrong. A test fails when anything is reported.
 */
import { frenchPunctuationIssues } from "../typography.js";

export interface StringTable {
  name: string;
  en: Readonly<Record<string, string>>;
  fr: Readonly<Record<string, string>>;
}

export type I18nProblem =
  | "missing-fr"
  | "extra-fr"
  | "empty-en"
  | "empty-fr"
  | "placeholder-mismatch"
  | "straight-apostrophe"
  | "french-punctuation"
  | "untranslated"
  | "unknown-token-lost"
  | "inconnu-for-status";

export interface I18nFinding {
  table: string;
  key: string;
  problem: I18nProblem;
  detail: string;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

/** English and French may be the same for a short string, such as a file type or a code. */
const SAME_LENGTH_LIMIT = 24;

export function auditStringTables(tables: readonly StringTable[], allowSame: ReadonlySet<string> = new Set()): I18nFinding[] {
  const findings: I18nFinding[] = [];
  for (const table of tables) {
    const add = (key: string, problem: I18nProblem, detail: string) => findings.push({ table: table.name, key, problem, detail });
    for (const key of Object.keys(table.en)) {
      const en = table.en[key]!;
      const fr = table.fr[key];
      if (en.trim() === "") add(key, "empty-en", "English text is empty");
      if (fr === undefined) {
        add(key, "missing-fr", "no French text");
        continue;
      }
      if (fr.trim() === "") {
        add(key, "empty-fr", "French text is empty");
        continue;
      }
      if (placeholders(en).join() !== placeholders(fr).join()) {
        add(key, "placeholder-mismatch", `${placeholders(en).join(",")} vs ${placeholders(fr).join(",")}`);
      }
      if (fr.includes("'")) add(key, "straight-apostrophe", "French uses ' instead of ’");
      for (const issue of frenchPunctuationIssues(fr)) add(key, "french-punctuation", issue);
      if (fr === en && en.length > SAME_LENGTH_LIMIT && !allowSame.has(`${table.name}.${key}`)) {
        add(key, "untranslated", "French is identical to English");
      }
      // UNKNOWN is a status word that is not translated. If English says it, French must too.
      if (/\bUNKNOWN\b/.test(en) && !/\bUNKNOWN\b/.test(fr)) add(key, "unknown-token-lost", "English says UNKNOWN, French does not");
      if (/\bUNKNOWN\b/.test(en) && /\binconnu(e|s|es)?\b/i.test(fr)) add(key, "inconnu-for-status", "French renames the UNKNOWN status");
    }
    for (const key of Object.keys(table.fr)) {
      if (!(key in table.en)) add(key, "extra-fr", "French key with no English key");
    }
  }
  return findings;
}
