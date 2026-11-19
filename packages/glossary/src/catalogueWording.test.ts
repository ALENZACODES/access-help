import { describe, expect, it } from 'vitest';
import { findBannedCopy } from '../../../qa/src/audit/copy';
import {
  CATALOGUE_ROLES,
  DATA_LABELS,
  buildCopyReport,
  catalogueCopyIssues,
  catalogueStrings,
  catalogueStructureFindings,
  dataLabelTerms,
  formatCatalogueFinding,
  frenchIssues,
  lintClaims,
  lintCopy,
  maskDataLabels,
  runAudit,
} from './index';
import { TERMS as CATALOGUE, type Term } from './terms';

const term = (o: Partial<Term> = {}): Term => ({ id: 'ramp', en: 'Ramp', fr: 'Rampe', role: 'noun', note: 'A note.', noteFr: 'Une note.', ...o });
const rules = (terms: readonly Term[]): string[] => catalogueStructureFindings(terms).map((f) => `${f.rule}:${f.termId}:${f.lang}`);

describe('catalogueStrings', () => {
  it('has a label and a note for every term in each language, in catalogue order', () => {
    for (const lang of ['en', 'fr'] as const) {
      const strings = catalogueStrings(lang);
      expect(strings).toHaveLength(CATALOGUE.length * 2);
      expect(strings[0]).toMatchObject({ where: `catalogue.${CATALOGUE[0]?.id}.label`, field: 'label', lang });
      expect(strings[1]).toMatchObject({ where: `catalogue.${CATALOGUE[0]?.id}.note`, field: 'note', lang });
    }
  });
  it('gives the text as shown and the text the rules look at', () => {
    const strings = catalogueStrings('en', [term({ id: 'x', en: 'PROTOTYPE-UNVERIFIED', note: 'Shown as PROTOTYPE-UNVERIFIED.' })]);
    expect(strings[0]).toMatchObject({ text: 'PROTOTYPE-UNVERIFIED', checked: 'label' });
    expect(strings[1]).toMatchObject({ text: 'Shown as PROTOTYPE-UNVERIFIED.', checked: 'Shown as label.' });
  });
  it('reads the French fields for French', () => {
    const strings = catalogueStrings('fr', [term()]);
    expect(strings.map((s) => s.text)).toEqual(['Rampe', 'Une note.']);
  });
});

describe('the catalogue as shipped', () => {
  it('has no wording issue in any label or note, in either language', () => {
    expect(catalogueCopyIssues().map((i) => `${i.check} ${i.where} [${i.lang}]: ${i.detail}`)).toEqual([]);
  });
  it('has no finding about its shape', () => {
    expect(catalogueStructureFindings().map(formatCatalogueFinding)).toEqual([]);
  });
  it('passes the shared audit of banned wording, label by label and note by note', () => {
    const found: string[] = [];
    for (const lang of ['en', 'fr'] as const) {
      for (const s of catalogueStrings(lang)) for (const f of findBannedCopy(s.text, `${s.where}[${lang}]`)) found.push(`${f.file} ${f.term}: ${f.text}`);
    }
    expect(found).toEqual([]);
  });
  it('has no id that uses the wording kept out of copy', () => {
    for (const t of CATALOGUE) {
      expect(findBannedCopy(t.id.replace(/-/g, ' '), t.id), t.id).toEqual([]);
      expect(lintCopy(t.id.replace(/-/g, ' ')), t.id).toEqual([]);
    }
  });
  it('names the tier of a source without that wording, in both languages', () => {
    const tier = CATALOGUE.find((t) => t.id === 'source-tier');
    expect(tier).toMatchObject({ en: 'Source tier', fr: 'Niveau de la source', role: 'label' });
    expect(tier?.note).toBe('A label for the kind of source. It promises nothing about access.');
    expect(tier?.noteFr).toBe('Une étiquette pour le type de source. Elle ne promet rien sur l’accès.');
    expect(CATALOGUE.some((t) => t.id === 'verification-tier' || t.id === 'prototype-unverified')).toBe(false);
  });
  it('shows the two data labels exactly as they are in the data, the same in both languages', () => {
    expect(dataLabelTerms()).toEqual(['prototype-label', 'seeded-open-data']);
    const labels = CATALOGUE.filter((t) => dataLabelTerms().includes(t.id));
    expect(labels.map((t) => t.en)).toEqual([...DATA_LABELS]);
    for (const t of labels) expect(t.fr).toBe(t.en);
  });
  it('writes French labels and notes with French spacing and curved apostrophes', () => {
    for (const s of catalogueStrings('fr')) {
      expect(frenchIssues(s.text), s.where).toEqual([]);
      expect(s.text, s.where).not.toContain("'");
    }
  });
  it('uses the token in French notes, never the feminine word for it', () => {
    for (const s of catalogueStrings('fr')) expect(s.text, s.where).not.toMatch(/inconnues?(?![a-zà-ÿ])/i);
    expect(CATALOGUE.find((t) => t.id === 'unknown')?.noteFr).toBe('Laissez UNKNOWN ce qui manque de preuves. Ne déduisez jamais une caractéristique.');
  });
  it('is part of the audit too, where a catalogue issue is an error', () => {
    const clean = runAudit();
    expect(clean.findings.filter((f) => f.rule.startsWith('catalogue-'))).toEqual([]);
    const issues = catalogueCopyIssues([term({ id: 'x', en: 'Verification tier', noteFr: "L'entrée" })]);
    const names = new Set(issues.map((i) => `catalogue-${i.check}`));
    expect(names.has('catalogue-banned')).toBe(true);
    expect(names.has('catalogue-french')).toBe(true);
  });
  it('is part of the copy report, so a new issue fails the build', () => {
    const report = buildCopyReport();
    expect(report.issues).toEqual([]);
    expect(report.byCheck.catalogue).toBe(0);
  });
});

describe('the catalogue checks do catch what they should', () => {
  const issues = (t: Term): string[] => catalogueCopyIssues([t]).map((i) => `${i.check}:${i.lang}`);
  it('catches a label with wording kept out of copy', () => {
    expect(issues(term({ en: 'Verification tier' }))).toContain('banned:en');
    expect(issues(term({ fr: 'Niveau de vérification' }))).toContain('banned:fr');
    expect(issues(term({ fr: 'État en direct' }))).toContain('banned:fr');
  });
  it('catches a note that makes a claim, also when the claim is denied', () => {
    expect(issues(term({ note: 'A label, not a guarantee of access.' }))).toContain('banned:en');
    expect(issues(term({ note: 'This place is fully accessible.' }))).toContain('claim:en');
  });
  it('catches French typed without French spacing', () => {
    expect(issues(term({ fr: "l'application" }))).toContain('french:fr');
    expect(issues(term({ noteFr: 'Sans marque; rien de plus.' }))).toContain('french:fr');
  });
  it('catches a long note and a word in capital letters', () => {
    const long = `${Array.from({ length: 24 }, () => 'word').join(' ')}.`;
    expect(issues(term({ note: long }))).toContain('sentence:en');
    expect(issues(term({ note: 'This is VERY clear.' }))).toContain('sentence:en');
  });
  it('sets a data label aside, and nothing else', () => {
    expect(issues(term({ en: 'SEEDED-OPEN-DATA', fr: 'SEEDED-OPEN-DATA' }))).toEqual([]);
    expect(issues(term({ en: 'SEEDED-CLOSED-DATA', fr: 'SEEDED-CLOSED-DATA' })).filter((x) => x.startsWith('sentence')).length).toBeGreaterThan(0);
    expect(maskDataLabels('SEEDED-CLOSED-DATA')).toBe('SEEDED-CLOSED-DATA');
  });
  it('reports shape findings under the catalogue check', () => {
    const found = catalogueCopyIssues([term({ id: 'Bad Id' })]);
    expect(found.some((i) => i.check === 'catalogue' && i.where === 'catalogue.Bad Id' && i.detail.startsWith('id-format'))).toBe(true);
  });
});

describe('catalogueStructureFindings', () => {
  it('accepts a well-formed term', () => {
    expect(rules([term()])).toEqual([]);
    expect(rules([])).toEqual([]);
  });
  it('wants an id of lower-case words joined by hyphens', () => {
    for (const id of ['Ramp', 'ramp_one', 'ramp one', '-ramp', 'ramp-', 'ramp--one', '', 'rampé']) expect(rules([term({ id })]), id).toContain(`id-format:${id}:both`);
    for (const id of ['ramp', 'tier-0', 'a-b-c', '2fa']) expect(rules([term({ id })]), id).toEqual([]);
  });
  it('wants each id once', () => {
    expect(rules([term(), term({ en: 'Other', fr: 'Autre' })])).toEqual(['id-duplicate:ramp:both']);
  });
  it('keeps the wording kept out of copy out of ids too', () => {
    expect(rules([term({ id: 'verification-tier' })])).toEqual(['id-wording:verification-tier:both']);
    expect(rules([term({ id: 'partnership-note' })])).toEqual(['id-wording:partnership-note:both']);
  });
  it('wants every label and note filled in', () => {
    expect(rules([term({ en: '' })])).toEqual(['empty:ramp:en']);
    expect(rules([term({ noteFr: '   ' })])).toEqual(['empty:ramp:fr']);
    expect(rules([term({ en: '', fr: '', note: '', noteFr: '' })])).toEqual(['empty:ramp:en', 'empty:ramp:fr', 'empty:ramp:en', 'empty:ramp:fr']);
  });
  it('wants no space at either end', () => {
    expect(rules([term({ en: ' Ramp' })])).toEqual(['untrimmed:ramp:en']);
    expect(rules([term({ noteFr: 'Une note. ' })])).toEqual(['untrimmed:ramp:fr']);
  });
  it('wants a known role', () => {
    expect(rules([term({ role: 'thing' as Term['role'] })])).toEqual(['role:ramp:both']);
    for (const role of CATALOGUE_ROLES) expect(rules([term({ role })])).toEqual([]);
    expect(new Set(CATALOGUE.map((t) => t.role))).toEqual(new Set(CATALOGUE_ROLES));
  });
  it('wants no full stop on a label and one on a note', () => {
    expect(rules([term({ en: 'Ramp.' })])).toEqual(['label-full-stop:ramp:en']);
    expect(rules([term({ fr: 'Rampe\u202f?' })])).toEqual(['label-full-stop:ramp:fr']);
    expect(rules([term({ note: 'A note' })])).toEqual(['note-full-stop:ramp:en']);
    expect(rules([term({ noteFr: 'Une note' })])).toEqual(['note-full-stop:ramp:fr']);
    expect(rules([term({ note: 'Is it so?' })])).toEqual([]);
  });
  it('wants a data label to be the same token in both languages', () => {
    expect(rules([term({ en: 'SEEDED-OPEN-DATA', fr: 'DONNÉES OUVERTES' })])).toEqual(['data-label-pair:ramp:both']);
    expect(rules([term({ en: 'Seeded', fr: 'PROTOTYPE-UNVERIFIED' })])).toEqual(['data-label-pair:ramp:both']);
    expect(rules([term({ en: 'SEEDED-OPEN-DATA', fr: 'SEEDED-OPEN-DATA' })])).toEqual([]);
  });
  it('wants each label used by one term in a language, without regard to case', () => {
    expect(rules([term(), term({ id: 'slope', en: 'RAMP', fr: 'Pente' })])).toEqual(['label-duplicate:slope:en']);
    expect(rules([term(), term({ id: 'slope', en: 'Slope', fr: 'rampe' })])).toEqual(['label-duplicate:slope:fr']);
  });
  it('allows the same label in the two languages of one term', () => {
    expect(rules([term({ id: 'source', en: 'Source', fr: 'Source' })])).toEqual([]);
  });
  it('writes a finding as one line', () => {
    const [finding] = catalogueStructureFindings([term({ en: 'Ramp.' })]);
    expect(finding && formatCatalogueFinding(finding)).toBe('label-full-stop catalogue.ramp [en]: the label ends with "."');
  });
  it('does not change the terms it was given', () => {
    const terms = [term({ id: 'Bad' }), term()];
    const before = JSON.stringify(terms);
    catalogueStructureFindings(terms);
    catalogueCopyIssues(terms);
    expect(JSON.stringify(terms)).toBe(before);
  });
  it('never flags a claim rule in the shipped notes that only passes because of a mask', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const s of catalogueStrings(lang)) {
        if (s.text === s.checked) continue;
        expect(lintClaims(s.text), s.where).toEqual([]);
      }
    }
  });
});
