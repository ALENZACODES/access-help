import { describe, expect, it } from 'vitest';
import {
  COPY_CHECKS,
  USAGE,
  countByCheck,
  filterReport,
  parseArgs,
  runCopyReport,
  type CopyIssue,
  type CopyReport,
} from './index';

const issue = (check: CopyIssue['check'], where = 'a.b'): CopyIssue => ({ check, where, lang: 'fr', detail: 'rule: "x"' });
const make = (issues: CopyIssue[]): CopyReport => ({ issues, checked: { en: 2, fr: 2 }, byCheck: countByCheck(issues) });
const run = (args: string[], report: CopyReport): { code: number; out: string[] } => {
  const out: string[] = [];
  return { code: runCopyReport(args, (l) => out.push(l), () => report), out };
};

describe('parseArgs', () => {
  it('has defaults', () => {
    expect(parseArgs([])).toEqual({ ok: true, options: { json: false, only: [], help: false } });
  });
  it('reads --json and --help', () => {
    expect(parseArgs(['--json', '-h'])).toEqual({ ok: true, options: { json: true, only: [], help: true } });
    expect(parseArgs(['--help'])).toMatchObject({ ok: true, options: { help: true } });
  });
  it('collects --only, once each', () => {
    expect(parseArgs(['--only=claim', '--only=parity', '--only=claim'])).toEqual({ ok: true, options: { json: false, only: ['claim', 'parity'], help: false } });
  });
  it('rejects an unknown check and an unknown argument', () => {
    expect(parseArgs(['--only=nope'])).toMatchObject({ ok: false });
    expect(parseArgs(['--verbose'])).toMatchObject({ ok: false, error: 'Unknown argument "--verbose".' });
    expect(parseArgs(['--only='])).toMatchObject({ ok: false });
  });
  it('lists every check in the usage text', () => {
    for (const c of COPY_CHECKS) expect(USAGE).toContain(c);
  });
});

describe('filterReport', () => {
  const report = make([issue('claim'), issue('parity'), issue('claim')]);
  it('keeps everything when nothing is chosen', () => {
    expect(filterReport(report, [])).toBe(report);
  });
  it('keeps only the chosen checks and recounts', () => {
    const r = filterReport(report, ['claim']);
    expect(r.issues.length).toBe(2);
    expect(r.byCheck.claim).toBe(2);
    expect(r.byCheck.parity).toBe(0);
    expect(r.checked).toEqual(report.checked);
  });
  it('can leave nothing', () => {
    expect(filterReport(report, ['hidden']).issues).toEqual([]);
  });
});

describe('runCopyReport', () => {
  it('is 0 for a clean report', () => {
    const { code, out } = run([], make([]));
    expect(code).toBe(0);
    expect(out.join('\n')).toContain('No copy issues.');
  });
  it('is 1 when there are issues, and prints them', () => {
    const { code, out } = run([], make([issue('french')]));
    expect(code).toBe(1);
    expect(out[0]).toContain('FRENCH a.b [fr]');
  });
  it('prints JSON with --json', () => {
    const { out } = run(['--json'], make([issue('hidden')]));
    expect((JSON.parse(out[0] ?? '{}') as { issues: unknown[] }).issues.length).toBe(1);
  });
  it('lets --only decide the exit code', () => {
    expect(run(['--only=parity'], make([issue('claim')])).code).toBe(0);
    expect(run(['--only=claim'], make([issue('claim')])).code).toBe(1);
  });
  it('is 2 for bad arguments and does not build the report', () => {
    const out: string[] = [];
    let built = false;
    const code = runCopyReport(['--nope'], (l) => out.push(l), () => {
      built = true;
      return make([]);
    });
    expect(code).toBe(2);
    expect(built).toBe(false);
    expect(out[0]).toContain(USAGE);
  });
  it('prints the usage for --help and exits 0', () => {
    const { code, out } = run(['--help'], make([issue('claim')]));
    expect(code).toBe(0);
    expect(out).toEqual([USAGE]);
  });
  it('is clean on the shipped copy with no injected report', () => {
    const out: string[] = [];
    expect(runCopyReport([], (l) => out.push(l))).toBe(0);
    expect(out[0]).toContain('No copy issues.');
  });
});
