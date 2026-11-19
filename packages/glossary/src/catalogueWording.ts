import { lintCopy } from './copyRules';
import { isOnlyDataLabel, maskDataLabels } from './dataLabels';
import type { Lang } from './plainTerms';
import { TERMS as CATALOGUE, type Role, type Term } from './terms';

/**
 * The term catalogue under the wording rules. The catalogue is the bilingual list of the App's
 * preferred words, shown on the terms page with an editorial note for each. Its labels and notes
 * are user copy like any other, so they go through the same checks as the rest of the copy.
 * Data labels are set aside first: they are shown exactly as written in the data.
 */
export interface CatalogueString {
  /** For example "catalogue.ramp.label" or "catalogue.ramp.note". */
  readonly where: string;
  readonly lang: Lang;
  /** The text as it is shown. */
  readonly text: string;
  /** The text the wording rules look at: the same, with data labels set aside. */
  readonly checked: string;
  readonly field: 'label' | 'note';
  readonly termId: string;
}

export const CATALOGUE_ROLES: readonly Role[] = ['noun', 'verb', 'adjective', 'label', 'status'];

/** Every label and note of the catalogue in one language, in catalogue order. */
export function catalogueStrings(lang: Lang, terms: readonly Term[] = CATALOGUE): readonly CatalogueString[] {
  const out: CatalogueString[] = [];
  for (const term of terms) {
    const label = lang === 'fr' ? term.fr : term.en;
    const note = lang === 'fr' ? term.noteFr : term.note;
    out.push({ where: `catalogue.${term.id}.label`, lang, text: label, checked: maskDataLabels(label), field: 'label', termId: term.id });
    out.push({ where: `catalogue.${term.id}.note`, lang, text: note, checked: maskDataLabels(note), field: 'note', termId: term.id });
  }
  return out;
}

export type CatalogueRule =
  | 'id-format'
  | 'id-duplicate'
  | 'id-wording'
  | 'empty'
  | 'role'
  | 'untrimmed'
  | 'label-full-stop'
  | 'note-full-stop'
  | 'data-label-pair'
  | 'label-duplicate';

export interface CatalogueFinding {
  readonly rule: CatalogueRule;
  readonly termId: string;
  /** 'both' for a finding about the term as a whole. */
  readonly lang: Lang | 'both';
  readonly detail: string;
}

const ID_FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SENTENCE_END = /[.!?]$/;

/**
 * Findings about the shape of the catalogue, apart from the wording of its sentences:
 * - an id is lower-case words joined by hyphens, is used once, and uses no wording kept out of copy;
 * - every label and note is filled in, with no space at either end, and the role is a known one;
 * - a label is a name, so it has no full stop; a note is a sentence, so it ends with one;
 * - a data label is the same token in both languages;
 * - no two terms share a label in the same language.
 */
export function catalogueStructureFindings(terms: readonly Term[] = CATALOGUE): readonly CatalogueFinding[] {
  const out: CatalogueFinding[] = [];
  const add = (rule: CatalogueRule, termId: string, lang: Lang | 'both', detail: string): void => void out.push({ rule, termId, lang, detail });
  const seenIds = new Set<string>();
  const seenLabels: Record<Lang, Map<string, string>> = { en: new Map(), fr: new Map() };
  for (const term of terms) {
    if (!ID_FORMAT.test(term.id)) add('id-format', term.id, 'both', `"${term.id}" is not lower-case words joined by hyphens`);
    if (seenIds.has(term.id)) add('id-duplicate', term.id, 'both', `"${term.id}" is used more than once`);
    seenIds.add(term.id);
    for (const v of lintCopy(term.id.replace(/-/g, ' '))) add('id-wording', term.id, 'both', `${v.rule}: "${v.match}"`);
    if (!CATALOGUE_ROLES.includes(term.role)) add('role', term.id, 'both', `"${String(term.role)}" is not a known role`);
    const fields: readonly (readonly [Lang, 'label' | 'note', string])[] = [
      ['en', 'label', term.en],
      ['fr', 'label', term.fr],
      ['en', 'note', term.note],
      ['fr', 'note', term.noteFr],
    ];
    for (const [lang, field, text] of fields) {
      if (text.trim() === '') {
        add('empty', term.id, lang, `the ${field} is empty`);
        continue;
      }
      if (text !== text.trim()) add('untrimmed', term.id, lang, `the ${field} has a space at one end`);
      if (field === 'label' && SENTENCE_END.test(text.trim())) add('label-full-stop', term.id, lang, `the label ends with "${text.trim().slice(-1)}"`);
      if (field === 'note' && !SENTENCE_END.test(text.trim())) add('note-full-stop', term.id, lang, 'the note does not end with a full stop');
    }
    if ((isOnlyDataLabel(term.en) || isOnlyDataLabel(term.fr)) && term.en !== term.fr) {
      add('data-label-pair', term.id, 'both', 'a data label must be the same token in both languages');
    }
    for (const lang of ['en', 'fr'] as const) {
      const label = (lang === 'fr' ? term.fr : term.en).trim().toLocaleLowerCase(lang === 'fr' ? 'fr-CA' : 'en-CA');
      if (label === '') continue;
      const other = seenLabels[lang].get(label);
      if (other !== undefined && other !== term.id) add('label-duplicate', term.id, lang, `the label is also used by "${other}"`);
      else seenLabels[lang].set(label, term.id);
    }
  }
  return out;
}

/** One line for a finding, for a report. */
export function formatCatalogueFinding(f: CatalogueFinding): string {
  return `${f.rule} catalogue.${f.termId} [${f.lang}]: ${f.detail}`;
}

/** The terms whose label in either language is a data label. */
export function dataLabelTerms(terms: readonly Term[] = CATALOGUE): readonly string[] {
  return terms.filter((t) => isOnlyDataLabel(t.en) || isOnlyDataLabel(t.fr)).map((t) => t.id);
}
