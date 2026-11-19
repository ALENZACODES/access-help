import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  AUDIT_LIMITATION,
  CENTRE_SCREENS,
  TARGET_MIN_PX,
  labelInName,
  validateAuditReport,
  type AuditFailure,
  type AuditLanguage,
  type AuditReport,
  type ControlCheck,
  type KeyboardScript,
} from "../src/audit/index.js";

/**
 * Day 17 audit of the help centre. It visits every centre screen in English
 * and French, runs a Tab script, measures every control, reads each control's
 * accessible name from Chrome's accessibility tree, and runs axe. The report
 * is written to test-results/audit/audit-report.json and checked with
 * validateAuditReport. It does not prove WCAG 2.2 AA.
 *
 * Each screen in each language is its own test, so a slow screen cannot push
 * the whole audit past one time limit, and a failure names the screen. Every
 * screen test writes its part of the report to disk; the last test joins the
 * parts and checks the whole report. Tests in this file run in order in one
 * worker (fullyParallel is off), and parts survive a worker restart after a
 * failed test because they are files, not memory.
 */

const ROOT = resolve(import.meta.dirname, "../..");
const BUILD_ID = /BUILD_ID = "([^"]+)"/.exec(readFileSync(resolve(ROOT, "apps/centre/src/build.ts"), "utf8"))?.[1] ?? "";

async function keyboardScript(page: Page): Promise<KeyboardScript> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const seen: string[] = [];
  let firstStop = "";
  let same = 0;
  let previous = "";
  for (let press = 0; press < 150; press += 1) {
    await page.keyboard.press("Tab");
    const key = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return "";
      if (!el.dataset.tabProbe) el.dataset.tabProbe = String(document.querySelectorAll("[data-tab-probe]").length);
      return `${el.dataset.tabProbe}|${(el.innerText || el.getAttribute("aria-label") || el.tagName).replace(/\s+/g, " ").trim()}`;
    });
    if (!key) break;
    if (!firstStop) firstStop = key.split("|")[1] ?? "";
    same = key === previous ? same + 1 : 0;
    if (same >= 2) return { firstStop, stops: seen.length, noTrap: false };
    previous = key;
    if (seen.includes(key)) break;
    seen.push(key);
  }
  return { firstStop, stops: seen.length, noTrap: true };
}

interface RawControl {
  index: number;
  tag: string;
  type: string;
  visibleLabel: string;
  width: number;
  height: number;
  inline: boolean;
  native: boolean;
  focusVisible: boolean;
}

async function measureControls(page: Page): Promise<RawControl[]> {
  return page.evaluate(() => {
    const selector = "a[href], button, input:not([type='hidden']), select, textarea, summary, [tabindex]:not([tabindex='-1'])";
    const controls = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((el) => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && !el.closest("[aria-hidden='true']") && !(el as HTMLButtonElement).disabled;
    });
    const look = (el: HTMLElement) => {
      const style = getComputedStyle(el);
      return [style.outlineStyle, style.outlineWidth, style.outlineColor, style.boxShadow, style.borderColor, style.backgroundColor].join("|");
    };
    return controls.map((el, index) => {
      el.dataset.auditIdx = String(index);
      const box = el.getBoundingClientRect();
      const tag = el.tagName.toLowerCase();
      let visibleLabel = "";
      if (tag === "input" || tag === "select" || tag === "textarea") {
        const field = el as HTMLInputElement;
        visibleLabel = field.labels?.[0]?.innerText ?? "";
        if (field.type === "submit" || field.type === "button") visibleLabel = field.value;
      } else if (tag === "a" || tag === "button" || tag === "summary") {
        visibleLabel = el.innerText;
      }
      // A focusable container such as a table scroller has no visible text label, so label-in-name does not apply.
      const parentText = (el.parentElement?.innerText ?? "").replace(/\s+/g, " ").trim();
      const ownText = (el.innerText ?? "").replace(/\s+/g, " ").trim();
      const inline = tag === "a" && getComputedStyle(el).display === "inline" && parentText.length > ownText.length + 10;
      (document.activeElement as HTMLElement | null)?.blur();
      const before = look(el);
      el.focus({ preventScroll: true });
      const focused = document.activeElement === el;
      const after = look(el);
      const style = getComputedStyle(el);
      const ring = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
      el.blur();
      const native = ["a", "button", "input", "select", "textarea", "summary"].includes(tag) && !el.hasAttribute("ondblclick") && el.getAttribute("draggable") !== "true";
      return {
        index,
        tag,
        type: (el as HTMLInputElement).type ?? "",
        visibleLabel: visibleLabel.replace(/\s+/g, " ").trim(),
        width: Math.round(box.width * 10) / 10,
        height: Math.round(box.height * 10) / 10,
        inline,
        native,
        focusVisible: focused && (ring || before !== after),
      };
    });
  });
}

/** Accessible names as Chrome computes them, read from the accessibility tree. */
async function accessibleNames(page: Page, count: number): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
  const names: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: `[data-audit-idx="${index}"]` });
    if (!nodeId) {
      names.push("");
      continue;
    }
    const tree = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
    const node = tree.nodes.find((item) => !item.ignored) ?? tree.nodes[0];
    names.push(String(node?.name?.value ?? ""));
  }
  await cdp.detach();
  return names;
}

function criterionFromTags(tags: string[]): string | null {
  for (const tag of tags) {
    const match = /^wcag(\d)(\d)(\d{1,2})$/.exec(tag);
    if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  }
  return null;
}

/** Returns true when it had to switch, so the caller can reload and start the Tab script from the top. */
async function setLanguage(page: Page, language: AuditLanguage): Promise<boolean> {
  const current = await page.evaluate(() => document.documentElement.lang);
  if (current.startsWith(language)) return false;
  // The centre's own switch. A screen can hold another language button of its own (the onboarding first-run shell does), so the name alone is not enough.
  await page.getByRole("group", { name: /^(Language|Langue)$/ }).getByRole("button", { name: language === "fr" ? "Français" : "English", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toMatch(new RegExp(`^${language}`));
  return true;
}

const AUDIT_DIR = resolve(ROOT, "qa/test-results/audit");
const PARTS_DIR = resolve(AUDIT_DIR, "parts");
const RUN_FILE = resolve(PARTS_DIR, "run.json");
const LANGUAGES = ["en", "fr"] as const;

/** One screen in one language: its row, its controls and what failed, before failure ids are given out. */
interface AuditPart {
  runId: string;
  screen: AuditReport["screens"][number];
  controls: ControlCheck[];
  failures: Array<Omit<AuditFailure, "id">>;
}

const partFile = (language: AuditLanguage, id: string): string => resolve(PARTS_DIR, `${language}-${id}.json`);

function currentRunId(): string {
  if (!existsSync(RUN_FILE)) return "";
  return String((JSON.parse(readFileSync(RUN_FILE, "utf8")) as { runId?: unknown }).runId ?? "");
}

async function auditScreen(page: Page, screen: (typeof CENTRE_SCREENS)[number], language: AuditLanguage): Promise<Omit<AuditPart, "runId">> {
  const failures: Array<Omit<AuditFailure, "id">> = [];
  const controls: ControlCheck[] = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(screen.path);
  if (await setLanguage(page, language)) await page.goto(screen.path);
  await expect(page.locator("#main h1").first()).toBeVisible();
  const keyboard = await keyboardScript(page);
  if (!keyboard.noTrap) {
    failures.push({ severity: "blocker", screen: screen.id, language, criterion: "2.1.2", reproduction: [`Open ${screen.path} in ${language}.`, "Press Tab repeatedly."], observed: "Focus stayed on one control for three presses." });
  }
  const raw = await measureControls(page);
  const names = await accessibleNames(page, raw.length);
  for (const control of raw) {
    const name = names[control.index] ?? "";
    const check: ControlCheck = {
      screen: screen.id,
      language,
      control: `${control.tag}${control.type ? `[${control.type}]` : ""}: ${control.visibleLabel || name}`.slice(0, 120),
      visibleLabel: control.visibleLabel,
      width: control.width,
      height: control.height,
      inline: control.inline,
      targetOk: control.inline || (control.width >= TARGET_MIN_PX && control.height >= TARGET_MIN_PX),
      singleActivation: control.native,
      focusVisible: control.focusVisible,
      labelInName: control.visibleLabel ? labelInName(control.visibleLabel, name) : null,
    };
    controls.push(check);
    const where = [`Open ${screen.path} in ${language === "fr" ? "French" : "English"} at 390 by 844.`, `Find ${check.control}.`];
    if (!check.targetOk) failures.push({ severity: "serious", screen: screen.id, language, criterion: "2.5.8", reproduction: where, observed: `Target is ${check.width} by ${check.height} CSS pixels.` });
    if (!check.focusVisible) failures.push({ severity: "serious", screen: screen.id, language, criterion: "2.4.7", reproduction: [...where, "Move focus to it with Tab."], observed: "No visible change when focused." });
    if (check.labelInName === false) failures.push({ severity: "serious", screen: screen.id, language, criterion: "2.5.3", reproduction: where, observed: `Accessible name "${name}" does not contain the visible label "${check.visibleLabel}".` });
  }
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  for (const violation of axe.violations) {
    failures.push({
      severity: violation.impact === "critical" ? "blocker" : "serious",
      screen: screen.id,
      language,
      criterion: criterionFromTags(violation.tags) ?? "4.1.2",
      reproduction: [`Open ${screen.path} in ${language}.`, `Run axe. Target: ${violation.nodes[0]?.target.join(" ") ?? "page"}.`],
      observed: `${violation.id}: ${violation.help}`,
    });
  }
  return { screen: { id: screen.id, language, axeViolations: axe.violations.map((violation) => violation.id), keyboard }, controls, failures };
}

test("Day 17: the audit starts a new run", () => {
  // Parts from an earlier run are removed, and every part of this run carries this run's id.
  rmSync(PARTS_DIR, { recursive: true, force: true });
  mkdirSync(PARTS_DIR, { recursive: true });
  const runId = `${Date.now()}-${process.pid}`;
  writeFileSync(RUN_FILE, `${JSON.stringify({ runId })}\n`);
  expect(currentRunId()).toBe(runId);
});

for (const language of LANGUAGES) {
  test.describe(`Day 17 audit in ${language === "fr" ? "French" : "English"}`, () => {
    for (const screen of CENTRE_SCREENS) {
      test(`${screen.id} (${screen.path})`, async ({ page }) => {
        const runId = currentRunId();
        expect(runId, "the run must start with the first test in this file").not.toBe("");
        const part = await auditScreen(page, screen, language);
        writeFileSync(partFile(language, screen.id), `${JSON.stringify({ runId, ...part } satisfies AuditPart, null, 2)}\n`);
        expect(part.screen.keyboard.firstStop, `${screen.id} ${language}`).toMatch(/^(Skip to main content|Aller au contenu principal)$/);
        expect(part.screen.keyboard.stops, `${screen.id} ${language}`).toBeGreaterThanOrEqual(1);
        expect(part.failures, JSON.stringify(part.failures, null, 2)).toEqual([]);
      });
    }
  });
}

test("Day 17: the help centre audit covers every screen in English and French", async ({}, testInfo) => {
  const runId = currentRunId();
  expect(runId, "the run must start with the first test in this file").not.toBe("");
  const report: AuditReport = {
    schemaVersion: "audit-report-1.0.0",
    buildId: BUILD_ID,
    ranAt: new Date().toISOString(),
    screens: [],
    controls: [],
    failures: [],
    retests: [],
    limitation: AUDIT_LIMITATION,
  };
  const missing: string[] = [];
  for (const language of LANGUAGES) {
    for (const screen of CENTRE_SCREENS) {
      const file = partFile(language, screen.id);
      const part = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as AuditPart) : undefined;
      if (!part || part.runId !== runId) {
        missing.push(`${screen.id} (${language})`);
        continue;
      }
      report.screens.push(part.screen);
      report.controls.push(...part.controls);
      for (const failure of part.failures) report.failures.push({ ...failure, id: `F${report.failures.length + 1}` });
    }
  }

  mkdirSync(AUDIT_DIR, { recursive: true });
  const file = resolve(AUDIT_DIR, "audit-report.json");
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  await testInfo.attach("audit-report.json", { path: file, contentType: "application/json" });

  expect(missing, "screens with no part from this run (see the failed screen tests above)").toEqual([]);
  expect(report.buildId).toBe("access-help-0.1.0");
  expect(validateAuditReport(report), "report shape").toEqual([]);
  for (const row of report.screens) expect(row.keyboard.firstStop, `${row.id} ${row.language}`).toMatch(/^(Skip to main content|Aller au contenu principal)$/);
  expect(report.failures, JSON.stringify(report.failures, null, 2)).toEqual([]);
  expect(report.controls.filter((control) => control.targetOk && control.singleActivation && control.focusVisible).length).toBeGreaterThanOrEqual(10);
  expect(report.controls.filter((control) => control.labelInName === true).length).toBeGreaterThanOrEqual(10);
});
