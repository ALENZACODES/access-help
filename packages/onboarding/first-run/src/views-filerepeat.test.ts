// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { importNotes } from "./exchange";
import { FILE_REPEAT_COPY as C, repeatErrorText } from "./filerepeat-copy";
import { parseNote, type Note } from "./model";
import { DEFAULT_REPEATS, checkRepeats, findRepeats, groupId, removeRepeats, repeatFiles, sortGroups, type RepeatGroup } from "./repeatnotes";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import {
  ANY_DAY_ID,
  WITHIN_ID,
  REPEAT_TEXT_ID,
  renderFileRepeat,
  renderGroups,
  renderOptions,
  renderOutcome,
  tickId,
  type FileRepeatContext,
  type RepeatOutcome,
} from "./views-filerepeat";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const n = (id: string, name: string, address: string | null): Note => {
  const x = parseNote(testNote(id, name, [{ key: "elevator", value: "yes" }], address));
  if (!x) throw new Error("bad note");
  return x;
};
const NOTES = [n("a1", "<b>Café</b>", "12 King St W"), n("a2", "<b>Café</b>", "12 King St W"), n("k1", "Kiosk", null), n("k2", "Kiosk", null), n("k3", "Kiosk", null), n("b", "Bakery", "1 A St")];
const groups = (l: "en" | "fr" = "en"): RepeatGroup[] => sortGroups(findRepeats(NOTES, DEFAULT_REPEATS), l);

function outcome(keys = groups().map((g) => g.key)): RepeatOutcome {
  const removal = removeRepeats(NOTES, groups(), keys);
  const files = repeatFiles(removal, TODAY);
  return { removal, check: checkRepeats(files.copy, NOTES, removal), copy: files.copy, removed: files.removed };
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileRepeatContext> = {}): FileRepeatContext => ({
  text: "",
  error: undefined,
  loaded: true,
  options: DEFAULT_REPEATS,
  groups: groups(l),
  ticked: groups(l).map(groupId),
  noneTicked: false,
  outcome: undefined,
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  ...over,
});

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><h2>Tool</h2>${inner}</main>`;
  return document.body;
}

describe("renderOptions", () => {
  it("shows the day option with its hint on a 44 pixel label", () => {
    const el = page(renderOptions(ctx("en", { options: { anyDay: true, within: false } })), "en");
    const box = el.querySelector<HTMLInputElement>(`#${ANY_DAY_ID}`);
    expect(box?.checked).toBe(true);
    expect(box?.getAttribute("aria-describedby")).toBe(`h-${ANY_DAY_ID}`);
    expect(box?.closest("label")?.style.minHeight).toBe("44px");
    const within = el.querySelector<HTMLInputElement>(`#${WITHIN_ID}`);
    expect(within?.checked).toBe(false);
    expect(within?.getAttribute("aria-describedby")).toBe(`h-${WITHIN_ID}`);
    expect(el.querySelector(`#h-${WITHIN_ID}`)?.textContent).toBe(C.withinHint.en);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("passes the App's audit in French with both options ticked", () => {
    const el = page(renderOptions(ctx("fr", { options: { anyDay: true, within: true } })), "fr");
    expect(el.querySelector<HTMLInputElement>(`#${WITHIN_ID}`)?.checked).toBe(true);
    expect(el.querySelector(`label[for="${WITHIN_ID}"]`)?.textContent).toBe(C.withinLabel.fr);
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("renderGroups", () => {
  it("lists each group with a tick box that names it and a description tied to it", () => {
    const el = page(renderGroups(groups(), ctx()), "en");
    expect(el.querySelector("#frp-found")?.textContent).toBe("2 groups of repeated notes: 3 notes repeat another one.");
    const boxes = Array.from(el.querySelectorAll<HTMLInputElement>(".frp-groups input"));
    expect(boxes.map((b) => b.closest("label")?.textContent)).toEqual(["Remove the repeat of “<b>Café</b>, 12 King St W”", "Remove the 2 repeats of “Kiosk, No address”"]);
    for (const b of boxes) {
      expect(b.checked).toBe(true);
      expect(el.querySelector(`#${b.getAttribute("aria-describedby") ?? "none"}`)?.textContent).toContain("Made on 2026-10-01.");
    }
    expect(el.querySelector('[data-action="frp-remove"]')?.textContent).toBe("Remove 3 repeated notes from the copy");
    expect(el.querySelector("b")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows every note of a group, the kept one first, behind a disclosure with a 44 pixel summary", () => {
    const el = page(renderGroups(groups(), ctx()), "en");
    const kiosk = el.querySelectorAll<HTMLDetailsElement>("details.frp-notes")[1];
    expect(kiosk?.open).toBe(false);
    const summary = kiosk?.querySelector("summary");
    expect(summary?.textContent).toBe("Show the notes about “Kiosk, No address” (3)");
    expect(summary?.style.minHeight).toBe("44px");
    expect(Array.from(kiosk?.querySelectorAll(":scope > ul > li > p") ?? []).map((p) => p.textContent)).toEqual([
      "Kept: made on 2026-10-01",
      "Taken out: made on 2026-10-01",
      "Taken out: made on 2026-10-01",
    ]);
    expect(kiosk?.querySelector(":scope > ul > li > ul > li")?.textContent).toBe("Elevator: Yes (City survey, 2026-10-01)");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("counts only the ticked groups in the button", () => {
    const g = groups();
    const el = page(renderGroups(g, ctx("en", { ticked: [groupId(g[0] as RepeatGroup)] })), "en");
    expect(el.querySelector('[data-action="frp-remove"]')?.textContent).toBe("Remove 1 repeated note from the copy");
    expect(el.querySelector<HTMLInputElement>(`#${tickId(g[1] as RepeatGroup)}`)?.checked).toBe(false);
  });

  it("offers to tick or untick every group when there is more than one", () => {
    const el = page(renderGroups(groups(), ctx()), "en");
    expect(el.querySelector('[data-action="frp-tick-all"]')?.textContent).toBe(C.tickAll.en);
    expect(el.querySelector('[data-action="frp-untick-all"]')?.textContent).toBe(C.untickAll.en);
    const one = groups().slice(0, 1);
    expect(page(renderGroups(one, ctx("en", { groups: one })), "en").querySelector('[data-action="frp-tick-all"]')).toBeNull();
  });

  it("says when no note repeats another, with nothing to tick", () => {
    const el = page(renderGroups([], ctx("en", { groups: [], ticked: [] })), "en");
    expect(el.querySelector("#frp-found")?.textContent).toBe(C.none.en);
    expect(el.querySelector("#frp-remove-form")).toBeNull();
  });

  it("ties the no-group problem to the list, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderGroups(groups(l), ctx(l, { ticked: [], noneTicked: true })), l);
      expect(el.querySelector("fieldset")?.getAttribute("aria-describedby")).toBe("e-frp-groups");
      expect(el.querySelector("#e-frp-groups")?.textContent).toBe(C.problems.none[l]);
      expect(el.querySelector('[data-action="frp-remove"]')?.textContent).toBe(C.removeNone[l]);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("renderOutcome", () => {
  it("offers the copy, the repeats taken out and the list when the copy read back", () => {
    const el = page(renderOutcome(outcome(), ctx()), "en");
    expect(el.querySelector("#frp-summary")?.textContent).toBe("3 repeated notes taken out; 3 notes kept.");
    expect(el.querySelector("#frp-check")?.textContent).toBe(C.checkOk.en);
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("a.linkbtn"));
    expect(links.map((a) => a.getAttribute("download"))).toEqual([
      "notes-without-3-repeats-2026-11-21.json",
      "notes-taken-out-3-repeats-2026-11-21.json",
      "list-3-repeats-2026-11-21.txt",
      "table-3-repeats-2026-11-21.csv",
    ]);
    const csv = decodeURIComponent((links[3]?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv.split("\r\n")).toHaveLength(5);
    const data = (a: HTMLAnchorElement | undefined): string => decodeURIComponent((a?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));
    expect(importNotes(data(links[0])).notes.map((x) => x.id)).toEqual(["a1", "k1", "b"]);
    expect(importNotes(data(links[1])).notes.map((x) => x.id)).toEqual(["a2", "k2", "k3"]);
    expect(decodeTextExportHref(links[2]?.getAttribute("href") ?? "")).toContain("- Kiosk, No address\n");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("offers nothing when the copy did not read back", () => {
    const o = { ...outcome(), check: { ok: false as const, reason: "answers" as const } };
    const el = page(renderOutcome(o, ctx("fr")), "fr");
    expect(el.querySelector("#frp-check")?.textContent).toBe(C.checkFailed.fr);
    expect(el.querySelector("a.linkbtn")).toBeNull();
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("renderFileRepeat", () => {
  it("shows only the file form before a file is read", () => {
    const el = page(renderFileRepeat(ctx("en", { loaded: false, groups: undefined })), "en");
    expect(el.querySelector("#frp-options-form")).toBeNull();
    expect(el.querySelector('[data-action="frp-clear"]')?.textContent).toBe("Remove the file from the page");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("links a file error to the box", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileRepeat(ctx(l, { loaded: false, groups: undefined, text: "{", error: "not-json" })), l);
      expect(el.querySelector("#frp-errors a")?.getAttribute("href")).toBe(`#${REPEAT_TEXT_ID}`);
      expect(el.querySelector("#frp-errors a")?.textContent).toBe(repeatErrorText("not-json", l));
      expect(el.querySelector(`#${REPEAT_TEXT_ID}`)?.getAttribute("aria-invalid")).toBe("true");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("links the no-group problem to the first group", () => {
    const el = page(renderFileRepeat(ctx("en", { ticked: [], noneTicked: true })), "en");
    expect(el.querySelector("#frp-errors a")?.getAttribute("href")).toBe(`#${tickId(groups()[0] as RepeatGroup)}`);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows the options, the groups and the copy, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileRepeat(ctx(l, { outcome: outcome(), statusMessage: C.opened[l] })), l);
      expect(el.querySelector("#frp-status")?.textContent).toBe(C.opened[l]);
      expect(el.querySelectorAll(".frp-groups > li")).toHaveLength(2);
      expect(el.querySelector("#frp-copy")).not.toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});
