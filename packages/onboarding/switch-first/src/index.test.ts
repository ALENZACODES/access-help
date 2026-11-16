import { describe, expect, it } from "vitest";
import {
  COPY,
  COPY_META,
  FORBIDDEN_TERMS,
  MIN_TOUCH_TARGET_PX,
  SCAN_INTERVALS_MS,
  frenchTypographyIssues,
  initialState,
  isActivationKey,
  nextFocusIndex,
  reduce,
  renderStep,
  secondsLabel,
  visibleSteps,
  type FirstRunState,
  type Locale,
} from "./index";

function allCopy(): Array<[string, { en: string; fr: string }]> {
  const out: Array<[string, { en: string; fr: string }]> = [];
  const walk = (path: string, v: unknown): void => {
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o["en"] === "string" && typeof o["fr"] === "string") {
        out.push([path, { en: o["en"], fr: o["fr"] }]);
      } else {
        for (const [k, c] of Object.entries(o)) walk(`${path}.${k}`, c);
      }
    }
  };
  walk("COPY", COPY);
  return out;
}

describe("flow", () => {
  it("starts with mode UNKNOWN and no scan setting", () => {
    const s = initialState();
    expect(s.mode).toBeUndefined();
    expect(s.scanMs).toBeUndefined();
  });

  it("shows the scan step only for single-switch", () => {
    let s = initialState();
    expect(visibleSteps(s)).toEqual(["mode", "finish"]);
    s = reduce(s, { type: "choose-mode", mode: "switch" });
    expect(visibleSteps(s)).toEqual(["mode", "scan", "finish"]);
    s = reduce(s, { type: "next" });
    expect(s.step).toBe("scan");
    s = reduce(s, { type: "set-scan", ms: 3000 });
    expect(s.scanMs).toBe(3000);
    s = reduce(s, { type: "back" });
    s = reduce(s, { type: "choose-mode", mode: "keyboard" });
    expect(s.scanMs).toBeUndefined();
  });

  it("ignores set-scan unless single-switch", () => {
    const s = reduce(initialState(), { type: "set-scan", ms: 1000 });
    expect(s.scanMs).toBeUndefined();
  });

  it("skip jumps to finish and leaves choices unset", () => {
    const s = reduce(initialState(), { type: "skip" });
    expect(s.step).toBe("finish");
    expect(s.mode).toBeUndefined();
    expect(renderStep(s, "en")).toContain("Movement: unknown");
    expect(renderStep(s, "fr")).toContain("Déplacement\u00A0: inconnu");
  });

  it("never moves past the ends", () => {
    let s: FirstRunState = initialState();
    s = reduce(s, { type: "back" });
    expect(s.step).toBe("mode");
    s = reduce(reduce(s, { type: "next" }), { type: "next" });
    expect(s.step).toBe("finish");
  });
});

describe("keyboard", () => {
  it("roves focus with arrows, Home and End, and leaves Tab alone", () => {
    expect(nextFocusIndex(0, 3, "ArrowRight")).toBe(1);
    expect(nextFocusIndex(2, 3, "ArrowDown")).toBe(0);
    expect(nextFocusIndex(0, 3, "ArrowLeft")).toBe(2);
    expect(nextFocusIndex(1, 3, "Home")).toBe(0);
    expect(nextFocusIndex(0, 3, "End")).toBe(2);
    expect(nextFocusIndex(1, 3, "Tab")).toBe(1);
    expect(isActivationKey("Enter")).toBe(true);
    expect(isActivationKey(" ")).toBe(true);
    expect(isActivationKey("a")).toBe(false);
  });
});

describe("rendered markup", () => {
  const locales: Locale[] = ["en", "fr"];
  const states: FirstRunState[] = [
    initialState(),
    { step: "scan", mode: "switch", scanMs: undefined },
    { step: "finish", mode: "switch", scanMs: 2000 },
    { step: "finish", mode: undefined, scanMs: undefined },
  ];

  it("gives every control a 44px minimum size and no positive tabindex", () => {
    for (const s of states) {
      for (const l of locales) {
        const html = renderStep(s, l);
        const buttons = html.match(/<button\b[^>]*>/g) ?? [];
        expect(buttons.length).toBeGreaterThan(0);
        for (const b of buttons) {
          expect(b).toContain(`min-width:${MIN_TOUCH_TARGET_PX}px`);
          expect(b).toContain(`min-height:${MIN_TOUCH_TARGET_PX}px`);
        }
        expect(html).not.toMatch(/tabindex="[1-9]/);
        expect(html).toContain(`lang="${l}"`);
      }
    }
    expect(MIN_TOUCH_TARGET_PX).toBeGreaterThanOrEqual(44);
  });

  it("offers every scan interval as a button", () => {
    const html = renderStep(states[1] as FirstRunState, "en");
    for (const ms of SCAN_INTERVALS_MS) {
      expect(html).toContain(`data-value="${ms}"`);
    }
    expect(secondsLabel(1000, "fr")).toBe("1 seconde");
    expect(secondsLabel(2000, "fr")).toBe("2 secondes");
  });
});

describe("copy", () => {
  it("has EN and FR for everything, with clean French typography", () => {
    const items = allCopy();
    expect(items.length).toBeGreaterThan(10);
    for (const [label, l] of items) {
      expect(l.en.trim(), label).not.toBe("");
      expect(l.fr.trim(), label).not.toBe("");
      expect(frenchTypographyIssues(l.fr), label).toEqual([]);
    }
    for (const ms of SCAN_INTERVALS_MS) {
      expect(frenchTypographyIssues(secondsLabel(ms, "fr"))).toEqual([]);
    }
    for (const s of states2()) {
      expect(frenchTypographyIssues(textOf(renderStep(s, "fr"))), s.step).toEqual([]);
    }
  });

  it("avoids forbidden wording and records provenance", () => {
    for (const [label, l] of allCopy()) {
      for (const re of FORBIDDEN_TERMS) {
        expect(re.test(l.en), `${label} ${re}`).toBe(false);
        expect(re.test(l.fr), `${label} ${re}`).toBe(false);
      }
    }
    expect(COPY_META.licence).toBe("CC0-1.0");
    expect(COPY_META.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("honesty of first-run copy", () => {
  it("does not promise a later settings screen or a live scanner", () => {
    const texts = allCopy().flatMap(([, l]) => [l.en, l.fr]);
    for (const text of texts) {
      expect(text).not.toMatch(/You can change it later/i);
      expect(text).not.toMatch(/You can change any of them later/i);
      expect(text).not.toMatch(/Vous pourrez le modifier plus tard/);
      expect(text).not.toMatch(/Vous pouvez les modifier plus tard/);
      expect(text).not.toMatch(/until you start it/i);
      expect(text).not.toMatch(/ne le lancez pas/);
      expect(text).not.toMatch(/start scanning/i);
      expect(text).not.toMatch(/lancer le balayage/i);
    }
    expect(COPY.mode.body.en).not.toMatch(/change it later/i);
    expect(COPY.scan.body.en).toMatch(/preference only/i);
    expect(COPY.scan.body.en).toMatch(/does not run a scanner/i);
    expect(COPY.finish.body.en).toMatch(/no later settings screen/i);
    const html = renderStep({ step: "scan", mode: "switch", scanMs: undefined }, "en");
    expect(html).toContain("does not run a scanner");
    expect(html).not.toContain("You can change it later");
  });
});


function states2(): FirstRunState[] {
  return [
    initialState(),
    { step: "scan", mode: "switch", scanMs: undefined },
    { step: "finish", mode: "switch", scanMs: 2000 },
    { step: "finish", mode: undefined, scanMs: undefined },
  ];
}

/** Visible text only (drops tags), for typography checks on rendered output. */
function textOf(html: string): string {
  return html.replace(/<[^>]*>/g, "\n");
}
