import { runCopyReport } from './copyReportCli';

/** Entry for `npm run copy-report -w @access/glossary -- --json`. */
const host = globalThis as unknown as { process: { argv: string[]; exitCode?: number } };
host.process.exitCode = runCopyReport(host.process.argv.slice(2), (line) => console.log(line));
