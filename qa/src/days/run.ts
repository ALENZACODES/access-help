import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { auditArticles, HELP_ARTICLES, OVERCLAIM_PATTERNS } from "@access/help";
import {
  ATTENDANT_SERVICES_NOTE,
  DEMONSTRATION_EVENTS,
  MODERATION_EXPLAINER,
  NO_ENDORSEMENT,
  NO_REPLACEMENT,
  PROGRAMMES,
  programmeLinkDefects,
  PROTOTYPE_SKELETON,
  runSchemaExamples,
} from "@access/community";
import {
  SYNTHETIC_RECORD,
  sortDefects,
  validateRecord,
  validateRegressionRun,
  validateThankYou,
  type FollowUpRecord,
} from "@access/followup";
import { ACCEPTANCE_CHECKS, type AcceptanceCheck } from "./catalog.js";

export type CheckStatus = "pass" | "fail" | "manual" | "playwright" | "blocked";

export interface CheckResult {
  id: string;
  day: number;
  status: CheckStatus;
  detail: string;
}

const ROOT = resolve(import.meta.dirname, "../../..");

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "test-results") {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const SECRET = /AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk_live_[0-9A-Za-z]+|xox[baprs]-[0-9A-Za-z-]+/;

function repoSecrets(): CheckResult {
  const hits: string[] = [];
  for (const file of walk(ROOT)) {
    if (file.endsWith(".png") || file.endsWith(".woff2")) continue;
    const text = readFileSync(file, "utf8");
    if (SECRET.test(text)) hits.push(relative(ROOT, file));
    if (statSync(file).size > 50 * 1024 * 1024) hits.push(`${relative(ROOT, file)} exceeds 50 MB`);
  }
  const packages = walk(ROOT).filter((file) => file.endsWith("package.json"));
  const banned = ["pa11y", "openrouteservice", "opentripplanner", "@opentripplanner", "nominatim"];
  for (const file of packages) {
    const json = readFileSync(file, "utf8");
    for (const name of banned) {
      if (json.includes(`"${name}"`)) hits.push(`${relative(ROOT, file)} depends on ${name}`);
    }
  }
  return {
    id: "repo-secrets",
    day: 0,
    status: hits.length === 0 ? "pass" : "fail",
    detail: hits.length === 0 ? "No credential pattern, banned dependency, or oversized file." : hits.join("; "),
  };
}

function schemas(which: "all" | "missing" | "verified"): CheckResult {
  const reports = runSchemaExamples();
  const expectFail = new Set(["missing-tier.json", "verified-tier.json", "verified-event.json"]);
  const problems = reports.filter((report) => report.valid === expectFail.has(report.file));
  const relevant =
    which === "missing"
      ? reports.filter((report) => report.file === "missing-tier.json")
      : which === "verified"
        ? reports.filter((report) => report.file.startsWith("verified"))
        : reports;
  const bad =
    which === "all"
      ? problems
      : relevant.filter((report) => (expectFail.has(report.file) ? report.valid : !report.valid));
  return {
    id: which === "all" ? "lane-schemas" : which === "missing" ? "lane-missing-tier" : "lane-no-verified",
    day: 1,
    status: bad.length === 0 ? "pass" : "fail",
    detail:
      bad.length === 0
        ? relevant.map((report) => `${report.file}:${report.valid ? "valid" : "invalid"}`).join(", ")
        : bad.map((report) => `${report.file} unexpected`).join(", "),
  };
}

function verificationDoc(): CheckResult {
  const text = read("docs/verification-tiers.md");
  const needed = [
    "Canonical tiers",
    "PROTOTYPE-UNVERIFIED",
    "SEEDED-OPEN-DATA",
    "COMMUNITY-REPORTED",
    "VERIFIED",
    "not used on a prototype record",
  ];
  const missing = needed.filter((phrase) => !text.includes(phrase));
  const restriction = /reject tier 3/.test(text) && /VERIFIED/.test(text);
  const ok = missing.length === 0 && restriction;
  return {
    id: "verification-tiers-doc",
    day: 1,
    status: ok ? "pass" : "fail",
    detail: ok
      ? "Canonical tiers 0–4 and E, the prototype labels, and the VERIFIED restriction are in docs/verification-tiers.md."
      : `Missing: ${missing.join(", ") || "restriction"}`,
  };
}

function helpArticles(): CheckResult {
  const defects = auditArticles(HELP_ARTICLES);
  const needed = ["journey-planner", "finders", "profile", "offline", "games-hub", "community-skeleton"];
  const ids = new Set(HELP_ARTICLES.map((article) => article.id));
  const absent = needed.filter((id) => !ids.has(id));
  const ok = defects.length === 0 && absent.length === 0;
  return {
    id: "help-articles",
    day: 20,
    status: ok ? "pass" : "fail",
    detail: ok
      ? `${HELP_ARTICLES.length} articles passed the does / does-not / data audit.`
      : [...defects.map((defect) => `${defect.articleId}:${defect.rule}`), ...absent.map((id) => `missing ${id}`)].join("; "),
  };
}

function helpOverclaims(): CheckResult {
  // The style guides name the banned phrases on purpose. Scan user-facing copy only.
  const files = ["apps/centre/src/App.tsx"];
  const blobs = [HELP_ARTICLES.map((article) => JSON.stringify(article)).join("\n"), ...files.map((file) => read(file))];
  const hits: string[] = [];
  blobs.forEach((blob, index) => {
    for (const rule of OVERCLAIM_PATTERNS) {
      if (rule.pattern.test(blob)) hits.push(`${index === 0 ? "articles" : files[index - 1]}:${rule.id}`);
    }
  });
  return {
    id: "help-overclaims",
    day: 20,
    status: hits.length === 0 ? "pass" : "fail",
    detail: hits.length === 0 ? "No overclaim pattern in help articles or the About screen." : hits.join("; "),
  };
}

function aboutStatements(): CheckResult {
  const about = read("apps/centre/src/App.tsx");
  const demo = read("docs/demo-data.md");
  const need = [
    "Build identifier",
    "does not give medical advice",
    "has not endorsed the App",
    "No record in this prototype is VERIFIED",
    "Hand-entered demonstration data",
  ];
  const missing = need.filter((phrase) => !(about.includes(phrase) || demo.includes(phrase)));
  const countsAgree = about.includes("Demonstration events") && demo.includes("demo-virtual-peer");
  return {
    id: "about-statements",
    day: 20,
    status: missing.length === 0 && countsAgree ? "pass" : "fail",
    detail: missing.length === 0 ? "About and demo-data include the required statements." : missing.join("; "),
  };
}

function demoData(): CheckResult {
  const text = read("docs/demo-data.md");
  const missing = DEMONSTRATION_EVENTS.map((event) => event.id).filter((id) => !text.includes(id));
  const labelled = /hand-entered/i.test(text) && text.includes("PROTOTYPE-UNVERIFIED");
  const honestZero = /count here is 0|0 in this repository/i.test(text) || /not in this repository/i.test(text);
  const ok = missing.length === 0 && labelled && honestZero;
  return {
    id: "demo-data-file",
    day: 20,
    status: ok ? "pass" : "fail",
    detail: ok ? "Demonstration events are listed as hand-entered. Other seeds are not invented." : `Missing ${missing.join(", ")}`,
  };
}

function shellFrench(): CheckResult {
  const text = read("apps/centre/src/strings.ts");
  const en = [...text.matchAll(/en: \{([\s\S]*?)\n  \},/g)][0]?.[1] ?? "";
  const fr = [...text.matchAll(/fr: \{([\s\S]*?)\n  \},/g)][0]?.[1] ?? "";
  const keys = [...en.matchAll(/^\s{4}(\w+):/gm)].map((match) => match[1]);
  const missing = keys.filter((key) => !new RegExp(`\\b${key}:`).test(fr));
  return {
    id: "shell-french",
    day: 21,
    status: missing.length === 0 && keys.length > 8 ? "pass" : "fail",
    detail: missing.length === 0 ? `${keys.length} shell strings have French.` : `Missing French: ${missing.join(", ")}`,
  };
}

function shellOffline(): CheckResult {
  const strings = read("apps/centre/src/strings.ts");
  const language = read("packages/help/src/language.ts");
  const fetches = /\bfetch\s*\(/.test(strings) || /\bfetch\s*\(/.test(language);
  return {
    id: "shell-offline",
    day: 21,
    status: fetches ? "fail" : "pass",
    detail: fetches ? "Language modules call fetch." : "Shell strings and the language preference do not call the network.",
  };
}

function skeletonDirectory(): CheckResult {
  const attendantListed = PROGRAMMES.some((item) => /attendant services/i.test(item.name.en));
  const linkDefects = programmeLinkDefects();
  const ok =
    linkDefects.length === 0 &&
    PROGRAMMES.every((item) => item.description.en.length > 40 && item.links.every((link) => link.retrieved === "2026-11-13")) &&
    /does not replace/.test(NO_REPLACEMENT.en) &&
    !attendantListed &&
    /Not listed as a current programme/.test(ATTENDANT_SERVICES_NOTE.en);
  return {
    id: "skeleton-directory",
    day: 16,
    status: ok ? "pass" : "fail",
    detail: ok
      ? "Eight programmes link to checked pages, with a French page from the French interface. Membership is not listed. Attendant services are not listed as current."
      : `Directory check failed: ${linkDefects.join("; ") || "wording"}.`,
  };
}

function skeletonEvents(): CheckResult {
  const ok =
    DEMONSTRATION_EVENTS.length === 3 &&
    DEMONSTRATION_EVENTS.every(
      (event) =>
        event.demonstration &&
        /demonstration/i.test(event.title.en) &&
        /Unknown/.test(event.entrance) &&
        event.registrationUrl === "https://sciontario.org/" &&
        event.inAppRegistration === false,
    );
  return {
    id: "skeleton-events",
    day: 16,
    status: ok ? "pass" : "fail",
    detail: ok ? "Three demonstration events, unknown accessibility notes, external registration only." : "Event skeleton check failed.",
  };
}

function skeletonExplainer(): CheckResult {
  const ids = new Set(MODERATION_EXPLAINER.map((section) => section.id));
  const needed = ["staffing", "safety", "reporting", "accessibility", "agreement"];
  const ok = needed.every((id) => ids.has(id as (typeof MODERATION_EXPLAINER)[number]["id"])) && MODERATION_EXPLAINER.every((section) => section.notRunning);
  return {
    id: "skeleton-explainer",
    day: 16,
    status: ok ? "pass" : "fail",
    detail: ok ? "Explainer covers staffing, safety, reporting, accessibility, and agreement, each marked not running." : "Explainer is incomplete.",
  };
}

function skeletonNoLivePath(): CheckResult {
  const kinds = new Set(PROTOTYPE_SKELETON.flatMap((screen) => screen.actions.map((action) => action.kind)));
  const app = read("apps/centre/src/App.tsx");
  const nav = app.slice(app.indexOf("<nav"), app.indexOf("</nav>"));
  const practiceInNav = nav.includes("/practice");
  const messaging = /export function (sendMessage|matchPeer|registerForEvent)\b/.test(read("packages/community/src/index.ts"));
  const ok = kinds.size === 1 && kinds.has("link_out") && !practiceInNav && !messaging;
  return {
    id: "skeleton-no-live-path",
    day: 16,
    status: ok ? "pass" : "fail",
    detail: ok
      ? "Skeleton actions are link-outs. /practice is outside the primary navigation. No message, match, or registration export."
      : "A live path was found on the skeleton.",
  };
}

function skeletonEndorsement(): CheckResult {
  const blob = `${NO_ENDORSEMENT.en}\n${NO_REPLACEMENT.en}\n${PROGRAMMES.map((item) => item.description.en).join("\n")}`;
  const bad = /\bendorsed by\b|\bin partnership with\b|\bofficial scio app\b/i.test(blob);
  const ok = !bad && /No endorsement/.test(NO_ENDORSEMENT.en);
  return {
    id: "skeleton-no-endorsement",
    day: 16,
    status: ok ? "pass" : "fail",
    detail: ok ? "No endorsement claim. The no-endorsement statement is present." : "Endorsement language found.",
  };
}

/**
 * Self-test of the Day 25 to 30 record rules on the synthetic record. It
 * proves the rules refuse what the plan forbids. It says nothing about a real
 * demonstration.
 */
function followupRules(): CheckResult {
  const problems: string[] = [];
  if (validateRecord(SYNTHETIC_RECORD, 30).length > 0) problems.push("the synthetic record should pass");
  const questions = SYNTHETIC_RECORD.demoDay!.questions;
  const endorsed = validateThankYou({ language: "en", text: "Thank you. SCIO has endorsed this prototype.", followUpIds: ["Q02", "Q03"] }, questions);
  if (!endorsed.some((defect) => defect.rule === "text-endorsement")) problems.push("endorsement not refused");
  const unmade = validateThankYou({ language: "en", text: "Thank you for seeing the prototype.", followUpIds: ["Q01", "Q02", "Q03"] }, questions);
  if (!unmade.some((defect) => defect.rule === "unmade-commitment")) problems.push("unmade commitment not refused");
  const untriaged = structuredClone(SYNTHETIC_RECORD);
  untriaged.triage!.items = untriaged.triage!.items.filter((item) => item.origin.ref !== "Q02");
  if (!validateRecord(untriaged, 26).some((defect) => defect.rule === "follow-up-untriaged")) problems.push("untriaged follow-up not refused");
  const run = structuredClone(SYNTHETIC_RECORD.regressionRuns![0]!);
  run.checks[0]!.buildId = "synthetic-build-1";
  if (!validateRegressionRun(run).some((defect) => defect.rule === "evidence-from-other-build")) problems.push("evidence from another build not refused");
  return {
    id: "followup-rules",
    day: 25,
    status: problems.length === 0 ? "pass" : "fail",
    detail: problems.length === 0 ? "The record rules accept the synthetic record and refuse the four forbidden cases." : problems.join("; "),
  };
}

export const FOLLOWUP_RECORD_PATH = "docs/follow-up/record.json";

/**
 * Validates the filed Day 25 to 30 record for one day. When nothing is filed,
 * the check stays manual: the record is typed from the session, so this
 * repository does not create one.
 */
export function followupRecordCheck(day: number, path = join(ROOT, FOLLOWUP_RECORD_PATH)): CheckResult {
  const id = `followup-record-${day}`;
  if (!existsSync(path)) {
    return { id, day, status: "manual", detail: `No record is filed at ${FOLLOWUP_RECORD_PATH}. It is typed from the session, and nothing is filled in for it.` };
  }
  let record: FollowUpRecord;
  try {
    record = JSON.parse(readFileSync(path, "utf8")) as FollowUpRecord;
  } catch (error) {
    return { id, day, status: "fail", detail: `${FOLLOWUP_RECORD_PATH} is not JSON: ${(error as Error).message}` };
  }
  const defects = sortDefects(validateRecord(record, day)).filter((defect) => defect.severity !== "review");
  return {
    id,
    day,
    status: defects.length === 0 ? "pass" : "fail",
    detail:
      defects.length === 0
        ? `${FOLLOWUP_RECORD_PATH} meets the Day ${day} record rules.`
        : defects.map((defect) => `${defect.part}:${defect.ref}:${defect.rule}`).join("; "),
  };
}

const AUTOMATED: Record<string, () => CheckResult> = {
  "followup-rules": followupRules,
  "followup-record-25": () => followupRecordCheck(25),
  "followup-record-26": () => followupRecordCheck(26),
  "followup-record-27": () => followupRecordCheck(27),
  "followup-record-28": () => followupRecordCheck(28),
  "followup-record-29": () => followupRecordCheck(29),
  "followup-record-30": () => followupRecordCheck(30),
  "repo-secrets": repoSecrets,
  "lane-schemas": () => schemas("all"),
  "lane-missing-tier": () => schemas("missing"),
  "lane-no-verified": () => schemas("verified"),
  "verification-tiers-doc": verificationDoc,
  "help-articles": helpArticles,
  "help-overclaims": helpOverclaims,
  "about-statements": aboutStatements,
  "demo-data-file": demoData,
  "shell-french": shellFrench,
  "shell-offline": shellOffline,
  "skeleton-directory": skeletonDirectory,
  "skeleton-events": skeletonEvents,
  "skeleton-explainer": skeletonExplainer,
  "skeleton-no-live-path": skeletonNoLivePath,
  "skeleton-no-endorsement": skeletonEndorsement,
};

/** A sibling counts as present only when it is a package, not an empty directory. */
export function foreignDisposition(sibling: { directory: boolean; packageJson: boolean }): "blocked" | "manual" {
  return sibling.directory && sibling.packageJson ? "manual" : "blocked";
}

function siblingPackage(owner: AcceptanceCheck["owner"]): { directory: boolean; packageJson: boolean } {
  if (owner === "access-help" || owner === "cross") return { directory: true, packageJson: true };
  const candidates = [resolve(ROOT, "..", owner), resolve(ROOT, owner)];
  for (const path of candidates) {
    try {
      if (!statSync(path).isDirectory()) continue;
      const packageJson = existsSync(resolve(path, "package.json"));
      return { directory: true, packageJson };
    } catch {
      // Try the next candidate path.
    }
  }
  return { directory: false, packageJson: false };
}

export function runAcceptance(): CheckResult[] {
  const produced = new Map<string, CheckResult>();
  for (const [id, fn] of Object.entries(AUTOMATED)) {
    produced.set(id, fn());
  }
  return ACCEPTANCE_CHECKS.map((check) => {
    if (check.checkId && produced.has(check.checkId) && check.kind === "automated") {
      const result = produced.get(check.checkId)!;
      return { ...result, id: check.id, day: check.day };
    }
    if (check.kind === "playwright") {
      return {
        id: check.id,
        day: check.day,
        status: "playwright",
        detail: "Covered by npm run test:e2e (Playwright and axe). Not counted as a unit-test pass.",
      };
    }
    if (check.owner !== "access-help" && check.owner !== "cross") {
      const disposition = foreignDisposition(siblingPackage(check.owner));
      return {
        id: check.id,
        day: check.day,
        status: disposition,
        detail:
          disposition === "blocked"
            ? `${check.owner} is not checked out beside this repository. ${check.planText}`
            : `${check.owner} is checked out. This harness does not run that repository's suite. ${check.planText}`,
      };
    }
    return {
      id: check.id,
      day: check.day,
      status: "manual",
      detail: check.planText,
    };
  });
}

export function summarise(results: CheckResult[]): { pass: number; fail: number; manual: number; playwright: number; blocked: number } {
  const summary = { pass: 0, fail: 0, manual: 0, playwright: 0, blocked: 0 };
  for (const result of results) summary[result.status] += 1;
  return summary;
}
