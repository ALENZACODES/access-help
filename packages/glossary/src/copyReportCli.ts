import { COPY_CHECKS, buildCopyReport, copyReportJson, formatCopyReport, countByCheck, type CopyCheck, type CopyReport } from './copyReport';

/**
 * The command line for the copy report: `--json` for JSON, `--only=<check>` (repeatable) to look at some
 * checks, `--help` for this text. Exit codes: 0 clean, 1 issues found, 2 the arguments make no sense.
 */
export const USAGE = [
  'Usage: copy-report [--json] [--only=<check>]...',
  `Checks: ${COPY_CHECKS.join(', ')}`,
  'Exit code: 0 no issues, 1 issues found, 2 bad arguments.',
].join('\n');

export interface CliOptions {
  readonly json: boolean;
  readonly only: readonly CopyCheck[];
  readonly help: boolean;
}

export type ParsedArgs = { readonly ok: true; readonly options: CliOptions } | { readonly ok: false; readonly error: string };

function isCheck(name: string): name is CopyCheck {
  return (COPY_CHECKS as readonly string[]).includes(name);
}

export function parseArgs(args: readonly string[]): ParsedArgs {
  let json = false;
  let help = false;
  const only: CopyCheck[] = [];
  for (const arg of args) {
    if (arg === '--json') json = true;
    else if (arg === '--help' || arg === '-h') help = true;
    else if (arg.startsWith('--only=')) {
      const name = arg.slice('--only='.length);
      if (!isCheck(name)) return { ok: false, error: `Unknown check "${name}". Checks: ${COPY_CHECKS.join(', ')}` };
      if (!only.includes(name)) only.push(name);
    } else return { ok: false, error: `Unknown argument "${arg}".` };
  }
  return { ok: true, options: { json, only, help } };
}

/** The report with only the chosen checks kept. No choice keeps everything. */
export function filterReport(report: CopyReport, only: readonly CopyCheck[]): CopyReport {
  if (only.length === 0) return report;
  const issues = report.issues.filter((i) => only.includes(i.check));
  return { issues, checked: report.checked, byCheck: countByCheck(issues) };
}

/** Runs the command. `report` is injectable so the command can be tested without scanning everything. */
export function runCopyReport(args: readonly string[], log: (line: string) => void, report: () => CopyReport = buildCopyReport): number {
  const parsed = parseArgs(args);
  if (!parsed.ok) {
    log(`${parsed.error}\n${USAGE}`);
    return 2;
  }
  if (parsed.options.help) {
    log(USAGE);
    return 0;
  }
  const result = filterReport(report(), parsed.options.only);
  log(parsed.options.json ? copyReportJson(result) : formatCopyReport(result));
  return result.issues.length > 0 ? 1 : 0;
}
