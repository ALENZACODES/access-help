import { isWcagAaCriterion, TARGET_MIN_PX } from "./wcag.js";

export type Severity = "blocker" | "serious" | "minor";
export const SEVERITIES: readonly Severity[] = ["blocker", "serious", "minor"];

/** Every screen the centre serves. A Day 17 audit has to cover each one, in both languages. */
export const CENTRE_SCREENS = [
  { id: "home", path: "/" },
  { id: "help-article", path: "/help/labels" },
  { id: "help-table", path: "/help/clinical-boundaries" },
  { id: "community", path: "/community" },
  { id: "events", path: "/community/events" },
  { id: "event", path: "/community/events/demo-virtual-peer" },
  { id: "safety", path: "/community/safety" },
  { id: "practice", path: "/practice" },
  { id: "about", path: "/about" },
] as const;
export type ScreenId = (typeof CENTRE_SCREENS)[number]["id"];
export type AuditLanguage = "en" | "fr";

export interface AuditFailure {
  id: string;
  severity: Severity;
  screen: string;
  language: AuditLanguage;
  /** A WCAG 2.2 Level A or AA success criterion, for example "2.5.8". */
  criterion: string;
  reproduction: string[];
  /** What the check found, in plain words. */
  observed: string;
}

export interface ControlCheck {
  screen: string;
  language: AuditLanguage;
  /** Short locator description, for example "button: Français". */
  control: string;
  visibleLabel: string;
  width: number;
  height: number;
  /** True when WCAG 2.5.8's inline exception applies (a link inside a sentence). */
  inline: boolean;
  targetOk: boolean;
  /** A native button, link, or form control that acts on one click, tap, Enter, or Space. */
  singleActivation: boolean;
  focusVisible: boolean;
  /** Accessible name contains the visible label (WCAG 2.5.3). Null when there is no visible text label. */
  labelInName: boolean | null;
}

export interface Retest {
  failureId: string;
  /** Build the failure was found on. */
  foundOn: string;
  /** Build the fix was checked on. */
  retestedOn: string;
  result: "pass" | "fail";
}

export interface AuditReport {
  schemaVersion: "audit-report-1.0.0";
  buildId: string;
  /** ISO date-time the audit ran. */
  ranAt: string;
  screens: Array<{ id: string; language: AuditLanguage; axeViolations: string[]; keyboard: KeyboardScript }>;
  controls: ControlCheck[];
  failures: AuditFailure[];
  retests: Retest[];
  /** Always present. axe and these scripts do not prove WCAG 2.2 AA. */
  limitation: string;
}

export interface KeyboardScript {
  /** First Tab stop on the screen. */
  firstStop: string;
  /** Tab stops reached before focus came back round or left the page. */
  stops: number;
  /** True when Tab kept moving: focus was never stuck on one element for 3 presses. */
  noTrap: boolean;
}

export const AUDIT_LIMITATION =
  "Automated checks find some failures. They do not prove WCAG 2.2 AA. Testing with people who use switch, voice, eye gaze, one hand, and screen readers, in English and French, is still required.";

export interface AuditIssue {
  rule: string;
  detail: string;
}

function blank(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Checks a Day 17 audit report against the pass sentences: every screen in
 * both languages, each failure with severity, screen, criterion, and
 * reproduction steps, the build identifier, ten controls meeting target size,
 * single activation, and visible focus, ten controls whose name matches the
 * visible label, and every fixed blocker retested on a later build.
 */
export function validateAuditReport(report: AuditReport, screens: readonly { id: string }[] = CENTRE_SCREENS): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (report.schemaVersion !== "audit-report-1.0.0") issues.push({ rule: "schema", detail: `Unknown schema ${String(report.schemaVersion)}` });
  if (blank(report.buildId)) issues.push({ rule: "build-id", detail: "The report does not state a build identifier." });
  if (Number.isNaN(Date.parse(report.ranAt))) issues.push({ rule: "ran-at", detail: "ranAt is not a date-time." });
  if (!/do not prove WCAG 2\.2 AA/.test(report.limitation)) issues.push({ rule: "limitation", detail: "The report must say the checks do not prove WCAG 2.2 AA." });

  for (const screen of screens) {
    for (const language of ["en", "fr"] as const) {
      const row = report.screens.find((item) => item.id === screen.id && item.language === language);
      if (!row) {
        issues.push({ rule: "coverage", detail: `${screen.id} (${language}) was not audited.` });
        continue;
      }
      if (!row.keyboard.noTrap) issues.push({ rule: "keyboard", detail: `${screen.id} (${language}) traps keyboard focus.` });
      if (row.keyboard.stops < 1) issues.push({ rule: "keyboard", detail: `${screen.id} (${language}) has no Tab stop.` });
    }
  }

  const known = new Set(screens.map((screen) => screen.id));
  const ids = new Set<string>();
  for (const failure of report.failures) {
    if (ids.has(failure.id)) issues.push({ rule: "failure-id", detail: `Duplicate failure id ${failure.id}.` });
    ids.add(failure.id);
    if (!SEVERITIES.includes(failure.severity)) issues.push({ rule: "failure-severity", detail: `${failure.id} has no valid severity.` });
    if (!known.has(failure.screen)) issues.push({ rule: "failure-screen", detail: `${failure.id} names unknown screen "${failure.screen}".` });
    if (!isWcagAaCriterion(failure.criterion)) issues.push({ rule: "failure-criterion", detail: `${failure.id} criterion "${failure.criterion}" is not a WCAG 2.2 A or AA success criterion.` });
    if (failure.reproduction.filter((step) => !blank(step)).length === 0) issues.push({ rule: "failure-reproduction", detail: `${failure.id} has no reproduction steps.` });
    if (blank(failure.observed)) issues.push({ rule: "failure-observed", detail: `${failure.id} does not say what was observed.` });
  }

  const fullControls = report.controls.filter((control) => control.targetOk && control.singleActivation && control.focusVisible);
  if (fullControls.length < 10) {
    issues.push({ rule: "controls-target", detail: `Only ${fullControls.length} controls meet target size, single activation, and visible focus. Ten are required.` });
  }
  for (const control of report.controls) {
    const meets = control.inline || (control.width >= TARGET_MIN_PX && control.height >= TARGET_MIN_PX);
    if (control.targetOk !== meets) issues.push({ rule: "controls-target", detail: `${control.control} on ${control.screen} has targetOk that does not match its size.` });
  }
  const named = report.controls.filter((control) => control.labelInName === true);
  if (named.length < 10) issues.push({ rule: "controls-name", detail: `Only ${named.length} controls have a name that matches the visible label. Ten are required.` });

  for (const retest of report.retests) {
    const failure = report.failures.find((item) => item.id === retest.failureId);
    if (!failure) issues.push({ rule: "retest", detail: `Retest ${retest.failureId} has no matching failure.` });
    if (retest.foundOn === retest.retestedOn) issues.push({ rule: "retest", detail: `Retest ${retest.failureId} was not run on a different build.` });
    if (retest.retestedOn !== report.buildId) issues.push({ rule: "retest", detail: `Retest ${retest.failureId} names ${retest.retestedOn}, not this build ${report.buildId}.` });
  }
  return issues;
}

/** Failures that are blockers and not yet retested as passing on this build. */
export function openBlockers(report: AuditReport): AuditFailure[] {
  return report.failures.filter(
    (failure) =>
      failure.severity === "blocker" &&
      !report.retests.some((retest) => retest.failureId === failure.id && retest.result === "pass" && retest.retestedOn === report.buildId),
  );
}

/** WCAG 2.5.3 Label in Name: the accessible name contains the visible text, ignoring case, spacing, and punctuation at the ends. */
export function labelInName(visible: string, accessibleName: string): boolean {
  const tidy = (value: string) =>
    value
      .normalize("NFC")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "")
      .toLocaleLowerCase();
  const label = tidy(visible);
  if (!label) return false;
  return tidy(accessibleName).includes(label);
}
