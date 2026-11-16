import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as pkg from './index';
import {
  PLAIN_TERMS,
  QUESTIONS,
  STRING_TABLES,
  UI_TABLES,
  UNKNOWN_TERM,
  callSamples,
  frenchIssues,
  inventory,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  scanText,
  SAMPLE_ARGS,
  type CopyString,
} from './index';

const LANGS = ['en', 'fr'] as const;
const dir = new URL('.', import.meta.url);

describe('callSamples', () => {
  it('collects what a string-building function says, once each', () => {
    const said = callSamples((n: number) => `${n} places`);
    expect(said).toEqual(expect.arrayContaining(['0 places', '1 places', '2 places', '7 places']));
    expect(new Set(said).size).toBe(said.length);
  });

  it('collects name-based output', () => {
    expect(callSamples((name: string) => `Save ${name}`)).toContain('Save Example place');
  });

  it('skips functions that throw or do not return text', () => {
    expect(callSamples(() => { throw new Error('no'); })).toEqual([]);
    expect(callSamples(() => 5)).toEqual([]);
    expect(callSamples(() => '')).toEqual([]);
  });

  it('keeps going after a sample the function cannot handle', () => {
    expect(callSamples((a: unknown) => { if (typeof a !== 'string') throw new Error('no'); return `ok ${a}`; })).toEqual(['ok Example place']);
  });

  it('has sample inputs for names and for small and large counts', () => {
    expect(SAMPLE_ARGS.flat().some((a) => typeof a === 'string')).toBe(true);
    expect(SAMPLE_ARGS.flat().filter((a): a is number => typeof a === 'number').sort((a, b) => a - b)).toEqual(expect.arrayContaining([0, 1, 2]));
  });
});

describe('inventory', () => {
  it.each(LANGS)('is large and has no empty strings (%s)', (lang) => {
    const all = inventory(lang);
    expect(all.length).toBeGreaterThan(200);
    for (const s of all) expect(s.text.trim(), s.where).not.toBe('');
  });

  it.each(LANGS)('has every kind of string, named by where it lives (%s)', (lang) => {
    const where = inventory(lang).map((s) => s.where);
    for (const prefix of ['ui.shell.', 'ui.place.', 'ui.finder.', 'ui.coverage.', 'ui.questions.', 'ui.notes.', 'ui.quality.', 'ui.changes.', 'ui.plan.', 'ui.prefs.', 'ui.help.', 'ui.connection', 'term.', 'question.', 'help.', 'status.', 'freshness.', 'glossary.provenance']) {
      expect(where.some((w) => w.startsWith(prefix)), prefix).toBe(true);
    }
  });

  it('includes every glossary term and the unknown entry', () => {
    const where = inventory('en').map((s) => s.where);
    for (const t of [...PLAIN_TERMS, UNKNOWN_TERM]) {
      expect(where).toContain(`term.${t.id}.term`);
      expect(where).toContain(`term.${t.id}.plain`);
    }
  });

  it('includes every question', () => {
    const where = inventory('fr').map((s) => s.where);
    for (const id of Object.keys(QUESTIONS)) expect(where).toContain(`question.${id}`);
  });

  it('includes what string-building functions say', () => {
    expect(inventory('en').some((s) => s.where.includes('()#'))).toBe(true);
  });

  it('has the same places in both languages', () => {
    expect(inventory('fr').map((s) => s.where)).toEqual(inventory('en').map((s) => s.where));
  });

  it('writes French glossary provenance in French', () => {
    expect(inventory('fr').find((s) => s.where === 'glossary.provenance')?.text).toContain('Rédigé pour l’App');
    expect(inventory('en').find((s) => s.where === 'glossary.provenance')?.text).not.toContain('Rédigé');
  });
});

describe('the registry of tables is complete', () => {
  const uiExports = Object.entries(pkg).filter(([name, v]) => /_UI$/.test(name) && typeof v === 'object' && v !== null && 'en' in v && 'fr' in v);

  it('finds the *_UI tables the package exports', () => {
    expect(uiExports.length).toBeGreaterThanOrEqual(8);
  });

  it('lists every exported *_UI table, so a new table cannot skip the audit', () => {
    const registered = new Set(Object.values(UI_TABLES));
    const missing = uiExports.filter(([, v]) => !registered.has(v as never)).map(([name]) => name);
    expect(missing).toEqual([]);
  });

  it('only lists tables that have both languages', () => {
    for (const [name, t] of [...Object.entries(UI_TABLES), ...Object.entries(STRING_TABLES)]) {
      expect(Object.keys(t).sort(), name).toEqual(['en', 'fr']);
    }
  });

  it('would notice a table that is not listed', () => {
    const fake = { en: { a: 'x' }, fr: { a: 'y' } };
    expect(new Set(Object.values(UI_TABLES)).has(fake as never)).toBe(false);
  });
});

describe('everything people can read passes the rules', () => {
  const every: readonly CopyString[] = LANGS.flatMap((l) => inventory(l));
  const show = (s: CopyString, extra: string): string => `${s.where} [${s.lang}] ${extra}: ${s.text}`;

  it('uses no word we never use (verified, real-time, partnership, guarantee and the rest)', () => {
    expect(every.flatMap((s) => lintCopy(s.text).map((v) => show(s, v.rule)))).toEqual([]);
  });

  it('makes no unsafe claim about a place', () => {
    expect(every.flatMap((s) => lintClaims(s.text).map((v) => show(s, `${v.rule} "${v.match}"`)))).toEqual([]);
  });

  it('hides nothing: no invisible characters, split words or spelled-out words', () => {
    expect(every.flatMap((s) => scanText(s.text).map((v) => show(s, `${v.rule} (${v.view})`)))).toEqual([]);
  });

  it('keeps French typography', () => {
    expect(every.filter((s) => s.lang === 'fr').flatMap((s) => frenchIssues(s.text).map((r) => show(s, r)))).toEqual([]);
  });

  it('keeps sentences short', () => {
    expect(every.flatMap((s) => plainLanguageIssues(s.text).map((i) => show(s, JSON.stringify(i))))).toEqual([]);
  });

  it('never says a place is accessible, only what sources report', () => {
    const bad = every.filter((s) => /\b(?:is|are|est|sont)\s+(?:fully\s+|entirely\s+)?(?:accessible|accessibles)\b/i.test(s.text));
    expect(bad.map((s) => show(s, 'says accessible'))).toEqual([]);
  });

  it('keeps Unknown as Unknown and Inconnu as Inconnu', () => {
    expect(UNKNOWN_TERM.en.term).toBe('Unknown');
    expect(UNKNOWN_TERM.fr.term).toBe('Inconnu');
    const en = inventory('en').filter((s) => s.where === 'status.unknown');
    const fr = inventory('fr').filter((s) => s.where === 'status.unknown');
    expect(en[0]?.text.toLowerCase()).toBe('unknown');
    expect(fr[0]?.text.toLowerCase()).toBe('inconnu');
  });

  it('never gives Unknown another name, such as unavailable, missing or n/a', () => {
    const rename = every.filter((s) => /^\s*(?:unavailable|missing|n\/a|none|indisponible|manquant|s\/o|aucun)\s*$/i.test(s.text));
    expect(rename.map((s) => show(s, 'renames Unknown'))).toEqual([]);
  });
});

describe('the rules do catch what they should', () => {
  const rejects = (text: string): boolean =>
    lintCopy(text).length + lintClaims(text).length + scanText(text).length > 0;

  it.each([
    'Verified by our team',
    'Vérifié par notre équipe',
    'Real-time updates',
    'Mis à jour en temps réel',
    'A partnership with the city',
    'We guarantee the entrance',
    'This place is fully accessible',
    'Ce lieu est accessible à tous',
    'Barrier-free washroom',
    'Safe to enter',
    'AODA compliant',
    'Official listing',
    'Ver­ified',
    'Veri​fied',
    'v e r i f i e d',
  ])('rejects %j', (text) => {
    expect(rejects(text)).toBe(true);
  });

  it.each([
    'Unknown means we have no information.',
    'Reported as available by one source.',
    'Source: City open data. Licence: CC0-1.0. Date: 2026-06-01.',
    'Information is old. Ask the place before you go.',
    'Inconnu veut dire que nous n’avons pas d’information.',
  ])('accepts %j', (text) => {
    expect(rejects(text)).toBe(false);
  });
});

describe('source files do not hide leftover wording', () => {
  // Files that must name the banned words in order to ban them, and files that are not copy.
  // terms.ts is the editorial catalogue of internal terms: it names words such as "verification" on
  // purpose, as guidance for writers, and is shown only in the term browser, never in help or place copy.
  const RULE_FILES = new Set(['terms.ts', 'copyRules.ts', 'claimRules.ts', 'deepScan.ts', 'parity.ts', 'links.ts', 'catalog.ts', 'plainLanguage.ts', 'frTypography.ts', 'auditHtml.ts', 'auditTerms.ts', 'auditCss.ts', 'audit.ts', 'auditTypes.ts']);
  const sources = readdirSync(dir).filter((f) => /\.(?:ts|tsx|css)$/.test(f) && !/\.test\.ts$/.test(f) && !RULE_FILES.has(f));

  it('looks at the source files', () => {
    expect(sources.length).toBeGreaterThan(30);
    expect(sources).toContain('helpCopy.ts');
  });

  it('has no banned wording in a comment, string or name', () => {
    const found: string[] = [];
    for (const f of sources) {
      const text = readFileSync(new URL(f, dir), 'utf8');
      for (const v of lintCopy(text)) found.push(`${f}: ${v.rule} "${v.match}"`);
    }
    expect(found).toEqual([]);
  });

  it('has no hidden or direction-changing characters in any source file', () => {
    const found: string[] = [];
    for (const f of readdirSync(dir).filter((x) => /\.(?:ts|tsx|css)$/.test(x) && !/\.test\.ts$/.test(x))) {
      const text = readFileSync(new URL(f, dir), 'utf8');
      const m = /[​-‏‪-‮⁠-⁤⁦-⁩﻿­]/u.exec(text);
      if (m !== null) found.push(`${f}: U+${(m[0].codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`);
    }
    expect(found).toEqual([]);
  });

  it('has no straight apostrophe in French text the audit reads, other than in code', () => {
    const text = readFileSync(new URL('helpCopy.ts', dir), 'utf8');
    const frLines = text.split('\n').filter((l) => /\bfr:/.test(l));
    expect(frLines.length).toBeGreaterThan(5);
    for (const l of frLines) expect(l).not.toMatch(/'[^']*[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ][^']*'/);
  });
});
