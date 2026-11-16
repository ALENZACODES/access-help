import { finding, type Finding } from './auditTypes';
import { lintCopy } from './copyRules';
import { frenchIssues } from './frTypography';
import { plainLanguageIssues } from './plainLanguage';
import type { GlossaryTerm, Lang } from './plainTerms';
import { fold } from './text';

const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const LANGS: readonly Lang[] = ['en', 'fr'];

export interface TermAuditOptions {
  readonly maxTermLength?: number;
  readonly maxWords?: number;
}

/**
 * Checks glossary data: id format and uniqueness, both languages present and different,
 * no banned wording, French typography, plain-language sentence length.
 */
export function auditTerms(
  terms: readonly GlossaryTerm[],
  options: TermAuditOptions = {},
): readonly Finding[] {
  const maxTerm = options.maxTermLength ?? 60;
  const out: Finding[] = [];
  const ids = new Set<string>();
  const names: Record<Lang, Set<string>> = { en: new Set(), fr: new Set() };

  for (const t of terms) {
    if (!ID.test(t.id)) out.push(finding('term-id-format', t.id, 'Ids must be lower-case kebab-case.'));
    if (ids.has(t.id)) out.push(finding('term-duplicate-id', t.id, 'Id used more than once.'));
    ids.add(t.id);

    for (const lang of LANGS) {
      const { term, plain } = t[lang];
      const where = `${t.id} [${lang}]`;
      if (term.trim() === '' || plain.trim() === '') {
        out.push(finding('term-empty', where, 'Term or description is empty.'));
        continue;
      }
      if (term.length > maxTerm) out.push(finding('term-too-long', where, `Term is longer than ${maxTerm} characters.`));
      const key = fold(term);
      if (names[lang].has(key) && t.id !== 'unknown') {
        out.push(finding('term-duplicate-name', where, `Another term is already called "${term}".`));
      }
      names[lang].add(key);
      if (!/[.!?…]$/.test(plain.trim())) out.push(finding('term-no-full-stop', where, 'Description should end like a sentence.'));

      for (const v of lintCopy(`${term} ${plain}`)) {
        out.push(finding('copy-rule', where, `${v.rule}: "${v.match}"`));
      }
      for (const issue of plainLanguageIssues(plain, { ...(options.maxWords !== undefined ? { maxWords: options.maxWords } : {}) })) {
        out.push(finding('plain-language', where, `${issue.rule}: ${issue.text}`));
      }
      if (lang === 'fr') {
        for (const issue of frenchIssues(`${term} ${plain}`)) out.push(finding('french-typography', where, issue));
      }
    }

    if (t.fr.plain === t.en.plain) {
      out.push(finding('term-untranslated', t.id, 'French description is identical to the English one.'));
    }
  }
  return out;
}
