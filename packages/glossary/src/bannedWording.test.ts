import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BANNED_TERMS, findBannedCopy } from '../../../qa/src/audit/copy';
import {
  ADVICE_UI,
  DATA_LABELS,
  WORDINGCHECK_UI,
  adviseWording,
  attributeText,
  catalogueStrings,
  collectUserStrings,
  inventory,
  lintCopy,
  maskDataLabels,
  renderWordingCheck,
  sampleMarkup,
  visibleText,
  type Lang,
} from './index';
import { UI as PAGE_UI } from './strings';

/**
 * The glossary package under the App's shared audit of banned wording (qa/src/audit/copy.ts).
 * The package has rules of its own; these tests hold it to the shared list as well, so the two
 * cannot drift apart without a test failing. The shared audit is for tests only and is never
 * imported by code that ships.
 */
const LANGS: readonly Lang[] = ['en', 'fr'];
const dir = new URL('.', import.meta.url);
const banned = (text: string, where: string): string[] => findBannedCopy(text, where).map((f) => `${f.file} ${f.term}: ${f.text}`);

describe('the shared audit', () => {
  it('still has the five families this package relies on', () => {
    expect(BANNED_TERMS.map((t) => t.id)).toEqual(['verified', 'verify', 'real-time', 'partnership', 'guarantee']);
  });
  it('lets the prototype data label through, and nothing that only looks like it', () => {
    expect(banned('Tier: PROTOTYPE-UNVERIFIED', 'x')).toEqual([]);
    expect(banned('Tier: prototype-unverified', 'x')).toHaveLength(1);
    expect(banned('This is unverified.', 'x')).toHaveLength(1);
    expect(DATA_LABELS).toContain('PROTOTYPE-UNVERIFIED');
  });
});

describe('every string a person can see passes the shared audit', () => {
  it('in the inventory of copy, in both languages', () => {
    const found: string[] = [];
    for (const lang of LANGS) for (const s of inventory(lang)) found.push(...banned(s.text, `${s.where}[${lang}]`));
    expect(found).toEqual([]);
    expect(inventory('en').length).toBeGreaterThan(2000);
  });
  it('in the strings the audit collects for each language', () => {
    const found: string[] = [];
    for (const lang of LANGS) for (const s of collectUserStrings(lang)) found.push(...banned(s.text, `${s.where}[${lang}]`));
    expect(found).toEqual([]);
  });
  it('in the term catalogue, labels and notes', () => {
    const found: string[] = [];
    for (const lang of LANGS) for (const s of catalogueStrings(lang)) found.push(...banned(s.text, `${s.where}[${lang}]`));
    expect(found).toEqual([]);
  });
  it('in the page around the tools: headings, links and the language switch', () => {
    const found: string[] = [];
    const walk = (value: unknown, where: string): void => {
      if (typeof value === 'string') found.push(...banned(value, where));
      else if (typeof value === 'object' && value !== null) for (const [k, v] of Object.entries(value)) walk(v, `${where}.${k}`);
    };
    for (const lang of LANGS) walk(PAGE_UI[lang], `page[${lang}]`);
    expect(found).toEqual([]);
    expect(PAGE_UI.en.views.wording).toBe('Wording');
    expect(PAGE_UI.fr.views.wording).toBe('Formulation');
  });
  it('in the sample pages the audit renders, text and attributes', () => {
    const found: string[] = [];
    let pages = 0;
    for (const lang of LANGS) {
      for (const page of sampleMarkup(lang)) {
        pages += 1;
        found.push(...banned(visibleText(page.html), `${page.name}[${lang}] text`));
        for (const attr of attributeText(page.html)) found.push(...banned(attr, `${page.name}[${lang}] attribute`));
      }
    }
    expect(found).toEqual([]);
    expect(pages).toBeGreaterThan(4);
  });
  it('in the wording check itself, before any text is typed', () => {
    for (const lang of LANGS) {
      const html = renderWordingCheck({ lang, text: '', advice: null, message: '' });
      expect(banned(visibleText(html), `tool[${lang}]`)).toEqual([]);
    }
  });
});

describe('the wording check shows the person their own words, and only those', () => {
  it('has banned wording in its results only where it repeats what the person typed', () => {
    for (const [lang, text, typed] of [
      ['en', 'Verified by a partner in real time, guaranteed.', ['Verified', 'partner', 'real time', 'guaranteed']],
      ['fr', 'Vérifié par un partenaire en temps réel, garanti.', ['Vérifié', 'partenaire', 'temps réel', 'garanti']],
    ] as const) {
      const advice = adviseWording(text, lang);
      expect(advice.filter((a) => a.kind === 'word').map((a) => a.found).sort()).toEqual([...typed].sort());
      for (const a of advice) {
        expect(banned(a.reason, 'reason'), a.reason).toEqual([]);
        expect(banned(a.suggestion, 'suggestion'), a.suggestion).toEqual([]);
      }
      const html = renderWordingCheck({ lang, text: '', advice, message: '' });
      let shown = visibleText(html);
      for (const word of typed) shown = shown.split(word).join('');
      expect(banned(shown, `results[${lang}]`)).toEqual([]);
    }
  });
  it('finds everything the shared audit finds, so a text that passes here passes there', () => {
    const samples: readonly (readonly [Lang, string])[] = [
      ['en', 'This entrance is verified.'],
      ['en', 'An unverified record.'],
      ['en', 'We verify each record.'],
      ['en', 'After verification, the record is shown.'],
      ['en', 'Updated in real time.'],
      ['en', 'A partnership with the city.'],
      ['en', 'Access is guaranteed.'],
      ['en', 'We guarantee access.'],
      ['fr', 'Cette entrée est vérifiée.'],
      ['fr', 'Nous vérifions chaque fiche.'],
      ['fr', 'Après vérification, la fiche est affichée.'],
      ['fr', 'Mis à jour en temps réel.'],
      ['fr', 'Un partenariat avec la ville.'],
      ['fr', 'L’accès est garanti.'],
    ];
    const missed: string[] = [];
    for (const [lang, text] of samples) {
      expect(banned(text, 'sample').length, text).toBeGreaterThan(0);
      if (adviseWording(text, lang).filter((a) => a.kind === 'word').length === 0) missed.push(text);
    }
    expect(missed).toEqual([]);
  });
  it('matches the word with its prefix too, as the shared audit does, and still lets the data label through', () => {
    expect(lintCopy('An unverified record.').map((v) => v.match)).toEqual(['unverified']);
    expect(lintCopy('A non-verified record.').map((v) => v.match)).toEqual(['non-verified']);
    expect(lintCopy('Une fiche non vérifiée.').map((v) => v.match)).toEqual(['non vérifiée']);
    expect(lintCopy('Tier: PROTOTYPE-UNVERIFIED')).toEqual([]);
    expect(lintCopy('Tier: prototype-unverified').map((v) => v.match)).toEqual(['unverified']);
    expect(banned(maskDataLabels('PROTOTYPE-UNVERIFIED'), 'x')).toEqual([]);
  });
  it('keeps the tool’s own copy and the advice out of the words they are about', () => {
    const walk = (value: unknown, out: string[]): string[] => {
      if (typeof value === 'string') out.push(value);
      else if (typeof value === 'function') out.push(String((value as (...a: unknown[]) => unknown)(3, 'x')));
      else if (typeof value === 'object' && value !== null) for (const v of Object.values(value)) walk(v, out);
      return out;
    };
    for (const lang of LANGS) {
      for (const text of [...walk(ADVICE_UI[lang], []), ...walk(WORDINGCHECK_UI[lang], [])]) expect(banned(text, 'ui'), text).toEqual([]);
    }
  });
});

describe('source files under the shared audit', () => {
  // Files that name the wording in order to keep it out: the two rule files, the catalogue linter,
  // and the advice table, whose keys are the rule ids. The number of lines is pinned for each, so
  // a new line that names the wording, in these files or in any other, fails this test.
  const RULE_FILE_LINES: Readonly<Record<string, number>> = { 'catalog.ts': 4, 'claimRules.ts': 3, 'copyRules.ts': 14, 'wordingAdvice.ts': 7 };
  const sources = readdirSync(dir).filter((f) => /\.(?:ts|tsx|css)$/.test(f) && !/\.test\.tsx?$/.test(f));
  const lines = (file: string): number => findBannedCopy(readFileSync(new URL(file, dir), 'utf8'), file).length;

  it('looks at every source file that ships', () => {
    expect(sources.length).toBeGreaterThan(130);
    for (const f of ['terms.ts', 'helpCopy.ts', 'wordingCheck.ts', 'WordingView.tsx', 'style.css', 'strings.ts']) expect(sources).toContain(f);
  });
  it('finds the wording in the rule files only, on a pinned number of lines', () => {
    const found: Record<string, number> = {};
    for (const f of sources) {
      const n = lines(f);
      if (n > 0) found[f] = n;
    }
    expect(found).toEqual(RULE_FILE_LINES);
  });
  it('finds none in the term catalogue, which used to be left out of this check', () => {
    expect(lines('terms.ts')).toBe(0);
    expect(readFileSync(new URL('terms.ts', dir), 'utf8')).toContain('PROTOTYPE-UNVERIFIED');
  });
  it('finds the advice table’s lines only on rule ids, never in a sentence', () => {
    const text = readFileSync(new URL('wordingAdvice.ts', dir), 'utf8');
    for (const f of findBannedCopy(text, 'wordingAdvice.ts')) {
      const line = text.split(/\r?\n/)[f.line - 1] ?? '';
      const withoutIds = line.replace(/'no-[a-z-]+'/g, '').replace(/"no-[a-z-]+"/g, '');
      expect(findBannedCopy(withoutIds, 'line'), line.trim().slice(0, 80)).toEqual([]);
    }
  });
});
