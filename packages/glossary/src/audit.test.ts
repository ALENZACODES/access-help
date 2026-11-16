import { describe, expect, it } from 'vitest';
import {
  AuditError,
  GLOSSARY_META,
  REPO_LICENCE,
  PLAIN_TERMS,
  assertAudit,
  auditCss,
  auditExitCode,
  auditHtml,
  auditTerms,
  collectUserStrings,
  finding,
  formatReport,
  fullGlossaryCss,
  lintCopy,
  makeReport,
  runAudit,
  sampleMarkup,
  type GlossaryTerm,
} from './index';

/**
 * This is the CI gate. If shipped copy, data, styles or markup break a rule,
 * the first test below fails and prints every finding.
 */
describe('shipped content passes the audit', () => {
  const report = runAudit();

  it('has no errors', () => {
    expect(formatReport({ ...report, findings: report.findings.filter((f) => f.severity === 'error') })).toBe(
      'Audit clean: no findings.',
    );
    expect(report.errors).toBe(0);
  });

  it('assertAudit does not throw', () => {
    expect(() => assertAudit(report)).not.toThrow();
  });

  it('warns only about the licence not being pinned to an SPDX id', () => {
    if (GLOSSARY_META.licence === REPO_LICENCE) {
      expect(report.findings.map((f) => `${f.severity}:${f.rule}`)).toEqual(['warning:provenance']);
    } else {
      expect(report.warnings).toBe(0);
    }
  });

  it('looks at both languages and every kind of markup', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(sampleMarkup(lang).map((m) => m.name)).toEqual([`shell.${lang}`, `shell-offline.${lang}`, `places.${lang}`]);
      expect(collectUserStrings(lang).length).toBeGreaterThan(15);
    }
  });

  it('shows the offline banner and the unknown state in the audited markup', () => {
    expect(sampleMarkup('en')[1]?.html).toContain('data-gl-offline');
    expect(sampleMarkup('fr')[0]?.html).toContain('inconnu');
  });
});

describe('the audit fails on violations', () => {
  it('fails when extra findings are added', () => {
    const r = runAudit([finding('demo', 'somewhere', 'broken')]);
    expect(r.errors).toBe(1);
    expect(() => assertAudit(r)).toThrow(AuditError);
  });

  it('carries the report on the error', () => {
    const r = makeReport([finding('demo', 'here', 'bad')]);
    try {
      assertAudit(r);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AuditError);
      expect((e as AuditError).report).toBe(r);
      expect((e as AuditError).message).toContain('ERROR demo @ here: bad');
    }
  });

  it('does not throw for warnings alone', () => {
    expect(() => assertAudit(makeReport([finding('demo', 'x', 'meh', 'warning')]))).not.toThrow();
  });

  it('catches a stylesheet that loses its focus style or shrinks a target', () => {
    const css = fullGlossaryCss();
    expect(auditCss(css.replaceAll(':focus-visible', ':hover')).map((f) => f.rule)).toContain('focus-visible-missing');
    expect(auditCss(css.replace('min-height: 44px', 'min-height: 20px')).map((f) => f.rule)).toContain('target-size');
  });

  it('catches markup that loses its label, lang or heading order', () => {
    const html = sampleMarkup('en')[0]?.html ?? '';
    expect(auditHtml(html.replace('<label for="gl-q">Search terms</label>', '')).map((f) => f.rule)).toContain('label-missing');
    expect(auditHtml(html.replace(' lang="en-CA"', '')).map((f) => f.rule)).toContain('missing-lang');
    expect(auditHtml(html.replace('</h2>', '</h2><h4>x</h4>')).map((f) => f.rule)).toContain('heading-skip');
  });

  it('catches a term that breaks the wording rules', () => {
    const bad: GlossaryTerm = {
      id: 'bad-term',
      en: { term: 'Bad', plain: 'Verified by our partners in real-time.' },
      fr: { term: 'Mauvais', plain: 'Vérifié par nos partenaires en temps réel.' },
    };
    const r = makeReport(auditTerms([...PLAIN_TERMS, bad]));
    expect(r.errors).toBeGreaterThanOrEqual(6);
    expect(() => assertAudit(r)).toThrow(/copy-rule @ bad-term \[en\]/);
  });

  it('catches every word we never use, in user strings too', () => {
    for (const w of ['verified', 'vérifié', 'real-time', 'partnership', 'guarantee']) {
      expect(lintCopy(`Our ${w} data`).length, w).toBeGreaterThan(0);
    }
  });
});

describe('report helpers', () => {
  it('counts errors and warnings', () => {
    const r = makeReport([finding('a', 'x', 'd'), finding('b', 'y', 'd', 'warning'), finding('c', 'z', 'd')]);
    expect(r).toMatchObject({ errors: 2, warnings: 1 });
  });

  it('formats findings one per line', () => {
    const r = makeReport([finding('a', 'x', 'bad'), finding('b', 'y', 'meh', 'warning')]);
    expect(formatReport(r)).toBe('1 error(s), 1 warning(s)\nERROR a @ x: bad\nWARNING b @ y: meh');
    expect(formatReport(makeReport([]))).toBe('Audit clean: no findings.');
  });

  it('returns an exit code for CI and logs the report', () => {
    const lines: string[] = [];
    expect(auditExitCode(makeReport([finding('a', 'x', 'bad')]), (l) => lines.push(l))).toBe(1);
    expect(auditExitCode(makeReport([finding('a', 'x', 'meh', 'warning')]), (l) => lines.push(l))).toBe(0);
    expect(auditExitCode(makeReport([]), (l) => lines.push(l))).toBe(0);
    expect(lines).toHaveLength(3);
  });
});
