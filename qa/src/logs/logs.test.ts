import { OVERCLAIM_PATTERNS } from "@access/help";
import { describe, expect, it } from "vitest";
import { checklist, field, findTable, tables } from "./markdown.js";
import {
  DEMO_EXTRA_RULES,
  validateBuildLock,
  validateDemoScript,
  validateGateLog,
  validatePresenterChecklist,
  validateRehearsalLog,
} from "./validators.js";

// Every fixture below is synthetic test text. None is a real log.
const RULES = [...OVERCLAIM_PATTERNS, ...DEMO_EXTRA_RULES];
const D19 = ["D19-1", "D19-2", "D19-3"];
const rules = (problems: Array<{ rule: string }>) => problems.map((problem) => problem.rule);

describe("markdown readers", () => {
  it("reads pipe tables, fields, and task lists", () => {
    const text = "Intro\n\n| A | B |\n| --- | :---: |\n| 1 | two |\n| 3 |\n\nDecision: go\n- [x] done\n- [ ] open\n";
    expect(tables(text)).toEqual([{ headers: ["a", "b"], rows: [{ a: "1", b: "two" }, { a: "3", b: "" }] }]);
    expect(findTable(text, ["B"])?.rows).toHaveLength(2);
    expect(field(text, "Decision")).toBe("go");
    expect(field(text, "Reason")).toBeUndefined();
    expect(checklist(text)).toEqual([
      { done: true, text: "done" },
      { done: false, text: "open" },
    ]);
  });
});

describe("gate log", () => {
  const good = [
    "| Criterion | Verdict | Evidence |",
    "| --- | --- | --- |",
    "| D19-1 | PASS | synthetic |",
    "| D19-2 | PASS | synthetic |",
    "| D19-3 | CARRIED | synthetic |",
    "",
    "Decision: go with one carried defect",
    "Reason: synthetic reason",
    "Decision maker: synthetic name, human owner",
    "",
    "| Defect | Reason | Workaround | Fix day |",
    "| --- | --- | --- | --- |",
    "| Focus lost after save | synthetic | Presenter tabs once | Day 22 |",
  ].join("\n");

  it("passes a complete log", () => {
    expect(validateGateLog(good, D19, 19)).toEqual([]);
  });

  it("names each missing verdict, decision part, and carried-defect field", () => {
    const bad = good
      .replace("| D19-2 | PASS | synthetic |\n", "")
      .replace("Reason: synthetic reason", "Reason: TBD")
      .replace("synthetic name, human owner", "a reviewer")
      .replace("| Presenter tabs once | Day 22 |", "| — | Day 30 |");
    expect(rules(validateGateLog(bad, D19, 19))).toEqual(["verdict-missing", "decision-reason", "decision-maker", "carried-defects", "fix-day"]);
  });

  it("needs a defect row for every carried criterion", () => {
    const noTable = good.slice(0, good.indexOf("| Defect"));
    expect(rules(validateGateLog(noTable, D19, 19))).toEqual(["carried-defects"]);
    expect(rules(validateGateLog("Decision: go", D19, 19))).toEqual(["criteria-table"]);
  });
});

describe("demo script", () => {
  const good = [
    "| Section | Minutes | Fallback | Script |",
    "| --- | --- | --- | --- |",
    "| Opening | 3 | Slide 1 | Prototype. Every record is unverified. |",
    "| Journey | 12 | Recorded walkthrough | Unknown stays Unknown. |",
    "| Help | 10 | Offline copy | No medical advice. |",
    "| Questions | 5 | Written answers | No organisation has endorsed the App. |",
  ].join("\n");

  it("passes a 30-minute script where every section has a fallback", () => {
    expect(validateDemoScript(good, RULES)).toEqual([]);
  });

  it("names a wrong total, a missing fallback, and an overclaim", () => {
    const bad = good.replace("| 5 | Written answers |", "| 6 | none |").replace("Unknown stays Unknown.", "Every washroom is fully accessible, endorsed by SCIO, using AI.");
    expect(rules(validateDemoScript(bad, RULES))).toEqual([
      "fallback",
      "total",
      "overclaim:endorsed-by",
      "overclaim:guarantee",
      "overclaim:ai-mention",
    ]);
  });
});

describe("rehearsal log", () => {
  const good = [
    "Build: rc-synthetic",
    "",
    "| Finding | Severity | Script minute | Fix or script change |",
    "| --- | --- | --- | --- |",
    "| Journey section ran long | serious | 14 | Cut one example |",
    "| Typo on About | minor | 27 | Fixed in the build |",
  ].join("\n");

  it("passes when every finding has a severity, a minute, and a fix", () => {
    expect(validateRehearsalLog(good)).toEqual([]);
    expect(validateRehearsalLog("Build: rc\n\n| Finding | Severity | Script minute | Fix or script change |\n| --- | --- | --- | --- |\n| No findings | | | |")).toEqual([]);
  });

  it("names a bad severity, a minute outside the script, a missing fix, and a missing build", () => {
    const bad = good.replace("Build: rc-synthetic", "").replace("| serious | 14 |", "| high | 41 |").replace("Fixed in the build", "");
    expect(rules(validateRehearsalLog(bad))).toEqual(["build", "severity", "minute", "fix"]);
  });
});

describe("presenter checklist and build lock", () => {
  it("needs every item ticked and a dated human-owner signature", () => {
    const good = "- [x] Build identifier checked\n- [x] Fallback copy on the device\n\nSigned: synthetic name, human owner, 2026-11-21\n";
    expect(validatePresenterChecklist(good)).toEqual([]);
    expect(rules(validatePresenterChecklist(good.replace("- [x] Fallback", "- [ ] Fallback").replace(", 2026-11-21", "")))).toEqual(["unticked", "signature"]);
  });

  it("needs the locked build and an exception process", () => {
    expect(validateBuildLock("Build lock: rc-synthetic\nException process: only the human owner may approve a change, and it is recorded here.")).toEqual([]);
    expect(rules(validateBuildLock("Build lock: \nException process: ask"))).toEqual(["build-lock", "exception-process"]);
  });
});
