import { describe, expect, it } from 'vitest';
import {
  COPY_CHECKS,
  buildCopyReport,
  copyExitCode,
  copyReportJson,
  countByCheck,
  formatCopyReport,
  catalogueStrings,
  inventory,
  issuesForText,
  type CopyIssue,
  type CopyReport,
} from './index';

const code = (...c: number[]): string => String.fromCharCode(...c);
const clean: CopyReport = { issues: [], checked: { en: 3, fr: 3 }, byCheck: countByCheck([]) };
const issue = (check: CopyIssue['check'], where = 'x.y'): CopyIssue => ({ check, where, lang: 'en', detail: 'rule: "text"' });
const dirty = (issues: CopyIssue[]): CopyReport => ({ issues, checked: { en: 3, fr: 3 }, byCheck: countByCheck(issues) });

describe('issuesForText', () => {
  it('is empty for plain copy', () => {
    expect(issuesForText('Ask the staff if there is a ramp.', 'a.b', 'en')).toEqual([]);
    expect(issuesForText('Demandez au personnel s’il y a une rampe.', 'a.b', 'fr')).toEqual([]);
  });
  it('reports banned wording with where and language', () => {
    const found = issuesForText('This place is verified.', 'page.title', 'en');
    expect(found.some((i) => i.check === 'banned' || i.check === 'claim')).toBe(true);
    expect(found.every((i) => i.where === 'page.title' && i.lang === 'en')).toBe(true);
  });
  it('reports a claim about a place', () => {
    expect(issuesForText('This place is accessible overall.', 'x', 'en').map((i) => i.check)).toContain('claim');
  });
  it('reports hidden text', () => {
    expect(issuesForText(`ver${code(0x200b)}ified place`, 'x', 'en').map((i) => i.check)).toContain('hidden');
  });
  it('reports French spacing only in French', () => {
    expect(issuesForText('Est-ce prêt?', 'x', 'fr').map((i) => i.check)).toContain('french');
    expect(issuesForText('Is it ready?', 'x', 'en').map((i) => i.check)).not.toContain('french');
  });
  it('reports a sentence that is too long', () => {
    const long = Array.from({ length: 30 }, () => 'word').join(' ') + '.';
    expect(issuesForText(long, 'x', 'en').map((i) => i.check)).toContain('sentence');
  });
  it('reports a plainer word', () => {
    expect(issuesForText('We utilize the door.', 'x', 'en').map((i) => i.check)).toContain('readability');
  });
});

describe('buildCopyReport', () => {
  const report = buildCopyReport();
  it('finds no issue in the shipped copy', () => {
    expect(report.issues).toEqual([]);
    expect(report.byCheck).toEqual(countByCheck([]));
  });
  it('checks every string of the inventory and of the term catalogue in both languages', () => {
    expect(report.checked.en).toBe(inventory('en').length + catalogueStrings('en').length);
    expect(report.checked.fr).toBe(inventory('fr').length + catalogueStrings('fr').length);
    expect(report.checked.en).toBe(report.checked.fr);
    expect(report.checked.en).toBeGreaterThan(200);
  });
  it('is the same every time', () => {
    expect(buildCopyReport()).toEqual(report);
  });
});

describe('countByCheck', () => {
  it('has every check, starting at zero', () => {
    expect(Object.keys(countByCheck([])).sort()).toEqual([...COPY_CHECKS].sort());
    expect(Object.values(countByCheck([])).every((n) => n === 0)).toBe(true);
  });
  it('counts each check', () => {
    const c = countByCheck([issue('claim'), issue('claim'), issue('parity')]);
    expect(c.claim).toBe(2);
    expect(c.parity).toBe(1);
    expect(c.banned).toBe(0);
  });
});

describe('formatCopyReport', () => {
  it('says there are no issues', () => {
    expect(formatCopyReport(clean)).toBe('Copy checked: 3 English and 3 French strings.\nNo copy issues.');
  });
  it('gives a count line then one line per issue', () => {
    const lines = formatCopyReport(dirty([issue('claim', 'a.b'), issue('parity', 'c.d')])).split('\n');
    expect(lines.length).toBe(4);
    expect(lines[1]).toBe('2 copy issue(s): claim 1, parity 1.');
    expect(lines[2]).toBe('CLAIM a.b [en]: rule: "text"');
    expect(lines[3]).toBe('PARITY c.d [en]: rule: "text"');
  });
  it('leaves out checks with no issue from the count line', () => {
    expect(formatCopyReport(dirty([issue('hidden')]))).not.toContain('banned 0');
  });
});

describe('copyReportJson', () => {
  it('round-trips and keeps a stable key order', () => {
    const json = copyReportJson(dirty([issue('french')]));
    const parsed = JSON.parse(json) as { checked: unknown; byCheck: Record<string, number>; issues: CopyIssue[] };
    expect(Object.keys(parsed)).toEqual(['checked', 'byCheck', 'issues']);
    expect(parsed.byCheck.french).toBe(1);
    expect(parsed.issues[0]?.check).toBe('french');
  });
  it('is valid JSON for a clean report', () => {
    expect(JSON.parse(copyReportJson(clean))).toEqual({ checked: { en: 3, fr: 3 }, byCheck: countByCheck([]), issues: [] });
  });
});

describe('copyExitCode', () => {
  it('is 0 and logs once for a clean report', () => {
    const lines: string[] = [];
    expect(copyExitCode(clean, (l) => lines.push(l))).toBe(0);
    expect(lines.length).toBe(1);
  });
  it('is 1 for any issue', () => {
    const lines: string[] = [];
    expect(copyExitCode(dirty([issue('banned')]), (l) => lines.push(l))).toBe(1);
    expect(lines[0]).toContain('BANNED');
  });
});
