// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Violation } from "./audit";
import { CONTRIBUTOR_SOURCE } from "./facts";
import { exportNotes } from "./exchange";
import { FILE_COMPARE_COPY as C, comparedText, fileErrorText, openedText, shownText } from "./filecompare-copy";
import { MAX_FILE_BYTES, firstErrorText, mountFileCompare, readFileText, type FileCompareHandle, type FileReaderFn } from "./filecompare-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));

const FILE_A = exportNotes(
  [
    testNote("a1", "Library", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }]),
    testNote("a2", "Arena", [{ key: "automatic-door", value: "no" }], "5 Rink Rd"),
    testNote("a3", "Pool", [{ key: "accessible-washroom", value: "yes" }], "9 Lake Rd"),
    testNote("a4", "Library", [{ key: "elevator", value: "no", on: "2026-10-05" }]),
  ],
  "2026-11-01",
);
const FILE_B = exportNotes(
  [
    testNote("b1", "Library", [{ key: "elevator", value: "no", source: CONTRIBUTOR_SOURCE, on: "2026-11-10" }, { key: "step-free-entry", value: "yes" }]),
    testNote("b2", "Pool", [{ key: "accessible-washroom", value: "yes" }], "9 Lake Rd"),
    testNote("b3", "Rink", [], "5 Rink Rd"),
  ],
  "2026-11-15",
);

let root: HTMLElement;
let handle: FileCompareHandle | undefined;
let audits: Violation[][];

beforeEach(() => {
  document.documentElement.lang = "en";
  document.body.innerHTML =
    '<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><div id="host"></div></main>';
  root = document.getElementById("host") as HTMLElement;
  audits = [];
  window.localStorage.clear();
});

afterEach(() => {
  handle?.destroy();
  handle = undefined;
});

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileCompareHandle {
  document.documentElement.lang = locale;
  handle = mountFileCompare(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
  return handle;
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

const status = async (): Promise<string> => {
  await Promise.resolve();
  return document.querySelector('[role="status"][aria-live]')?.textContent ?? "";
};

const lastAudit = (): string[] => (audits.at(-1) ?? []).map((v) => `${v.rule}: ${v.detail}`);

function fill(a: string, b: string): void {
  $<HTMLTextAreaElement>("#fc-text-a").value = a;
  $<HTMLTextAreaElement>("#fc-text-b").value = b;
}

function submit(): void {
  $<HTMLFormElement>("#fc-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function compareBoth(locale: "en" | "fr" = "en"): FileCompareHandle {
  const h = mount(locale);
  fill(FILE_A, FILE_B);
  submit();
  return h;
}

/** Sets the files of a file input, as a browser does after the person picks one. */
function pickFile(sel: string, file: File): void {
  const input = $<HTMLInputElement>(sel);
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe("the form", () => {
  it("shows two labelled boxes, two file pickers, a compare button and a remove button", () => {
    mount();
    expect($("#fc-title").textContent).toBe(C.title.en);
    expect(root.querySelector('label[for="fc-text-a"]')?.textContent).toBe(C.pasteA.en);
    expect(root.querySelector('label[for="fc-open-b"]')?.textContent).toBe(C.openB.en);
    expect($<HTMLInputElement>("#fc-open-a").type).toBe("file");
    expect($('[data-action="fc-compare"]').getAttribute("type")).toBe("submit");
    expect($('[data-action="fc-clear"]').textContent).toBe(C.clear.en);
    expect(root.querySelector("#fc-results")).toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("says nothing is saved and nothing is sent", () => {
    mount();
    expect(root.textContent).toContain(C.privacy.en);
  });
});

describe("errors", () => {
  it("lists both empty boxes, moves focus to the list and marks each box", () => {
    mount();
    submit();
    expect(document.activeElement?.id).toBe("fc-errors");
    const items = Array.from(root.querySelectorAll("#fc-errors li")).map((li) => li.textContent);
    expect(items).toEqual([fileErrorText("a", "empty", "en"), fileErrorText("b", "empty", "en")]);
    for (const s of ["a", "b"]) {
      const box = $(`#fc-text-${s}`);
      expect(box.getAttribute("aria-invalid")).toBe("true");
      expect(box.getAttribute("aria-describedby")?.split(" ")).toContain(`e-fc-text-${s}`);
    }
    expect(lastAudit()).toEqual([]);
  });

  it("moves focus to the box when its error link is followed", () => {
    mount();
    submit();
    const link = root.querySelector<HTMLAnchorElement>('#fc-errors a[href="#fc-text-b"]');
    expect(link).not.toBeNull();
    link?.click();
    expect(document.activeElement?.id).toBe("fc-text-b");
  });

  it("keeps what was typed when a file is refused", () => {
    mount();
    fill(FILE_A, "not a notes file");
    submit();
    expect($<HTMLTextAreaElement>("#fc-text-a").value).toBe(FILE_A);
    expect($<HTMLTextAreaElement>("#fc-text-b").value).toBe("not a notes file");
    expect(root.querySelectorAll("#fc-errors li")).toHaveLength(1);
    expect($("#fc-text-a").getAttribute("aria-invalid")).toBeNull();
  });

  it("refuses the same file twice", () => {
    mount();
    fill(FILE_A, FILE_A);
    submit();
    expect($("#fc-errors").textContent).toContain(fileErrorText("b", "same-text", "en"));
  });

  it("gives hosts the first error in words", () => {
    expect(firstErrorText([{ side: "a", code: "not-json" }], "fr")).toBe(fileErrorText("a", "not-json", "fr"));
    expect(firstErrorText([], "en")).toBeUndefined();
  });
});

describe("a comparison", () => {
  it("moves focus to the results and announces the counts", async () => {
    const h = compareBoth();
    expect(document.activeElement?.id).toBe("fc-results");
    expect(await status()).toBe(comparedText(2, 1, 1, "en"));
    expect(h.comparison()?.both).toHaveLength(2);
    expect(lastAudit()).toEqual([]);
  });

  it("shows each file at a glance and the detail totals", () => {
    compareBoth();
    const glance = Array.from(root.querySelectorAll(".fc-glance tbody tr")).map((tr) => Array.from(tr.querySelectorAll("th, td")).map((c) => c.textContent));
    expect(glance[0]).toEqual([C.notesRow.en, "4", "3"]);
    expect(glance[1]).toEqual([C.placesRow.en, "3", "3"]);
    expect(glance[2]).toEqual([C.recordsRow.en, "5", "3"]);
    const total = Array.from(root.querySelectorAll(".fc-totals td")).reduce((n, td) => n + Number(td.textContent), 0);
    expect(total).toBe(2 * 4);
  });

  it("puts the place where the files differ first and shows each file's records with source, licence, date and tier", () => {
    compareBoth();
    const places = Array.from(root.querySelectorAll<HTMLElement>(".fc-place"));
    expect(places.map((p) => p.querySelector("h4")?.textContent)).toEqual(["Library", "Pool"]);
    expect(places.map((p) => p.dataset["differs"])).toEqual(["true", "false"]);
    const row = places[0]?.querySelector('tr[data-key="elevator"]');
    expect(row?.getAttribute("data-status")).toBe("different-answers");
    const a = row?.querySelector('td[data-side="a"]')?.textContent ?? "";
    const b = row?.querySelector('td[data-side="b"]')?.textContent ?? "";
    expect(a).toContain("Reports differ");
    expect(a).toContain("Recorded on 2026-10-05");
    expect(a).toContain("Tier 0, not reviewed");
    expect(b).toContain("No.");
    expect(b).toContain("Source: Contributor report");
    expect(b).toContain("Licence: CC0-1.0");
    expect(b).toContain("Recorded on 2026-11-10");
  });

  it("shows a detail with no record as Unknown with no source and no tier", () => {
    compareBoth();
    const cell = root.querySelector('.fc-place tr[data-key="automatic-door"] td[data-side="b"]');
    expect(cell?.querySelector("strong")?.textContent).toBe("Unknown");
    expect(cell?.textContent).not.toMatch(/Source|Licence|Tier/);
  });

  it("notes records found in both files", () => {
    compareBoth();
    const th = root.querySelector('.fc-place tr[data-key="step-free-entry"] th');
    expect(th?.textContent).toContain("1 record is in both files.");
  });

  it("lists places in one file only and possible matches, without joining them", () => {
    const h = compareBoth();
    expect(root.querySelector('.fc-only[data-side="a"]')?.textContent).toContain("Arena");
    expect(root.querySelector('.fc-only[data-side="b"]')?.textContent).toContain("Rink");
    expect(root.querySelector(".fc-maybe li")?.getAttribute("data-reason")).toBe("same-address");
    expect(h.comparison()?.onlyA.map((o) => o.place.name)).toEqual(["Arena"]);
  });

  it("offers the comparison as a text download", () => {
    compareBoth();
    const link = root.querySelector<HTMLAnchorElement>("a.linkbtn[download]");
    expect(link?.textContent).toBe(C.download.en);
    expect(link?.getAttribute("download")).toBe("file-comparison-2026-11-20.txt");
    expect(decodeURIComponent(link?.getAttribute("href") ?? "")).toContain("Comparison of two note files");
  });

  it("saves nothing on this device", () => {
    compareBoth();
    $<HTMLInputElement>("#fc-only-differing").click();
    $('[data-action="fc-clear"]').click();
    expect(window.localStorage.length).toBe(0);
  });
});

describe("showing only places that differ", () => {
  it("hides places where the files say the same, keeps focus on the box and announces the count", async () => {
    compareBoth();
    const box = $<HTMLInputElement>("#fc-only-differing");
    box.click();
    expect(document.activeElement?.id).toBe("fc-only-differing");
    expect($<HTMLInputElement>("#fc-only-differing").checked).toBe(true);
    expect(Array.from(root.querySelectorAll(".fc-place h4")).map((h) => h.textContent)).toEqual(["Library"]);
    expect(await status()).toBe(shownText(1, "en"));
    $<HTMLInputElement>("#fc-only-differing").click();
    expect(root.querySelectorAll(".fc-place")).toHaveLength(2);
  });

  it("keeps both boxes' text", () => {
    compareBoth();
    $<HTMLInputElement>("#fc-only-differing").click();
    expect($<HTMLTextAreaElement>("#fc-text-a").value).toBe(FILE_A);
    expect($<HTMLTextAreaElement>("#fc-text-b").value).toBe(FILE_B);
  });

  it("says so when no place differs", () => {
    mount();
    fill(exportNotes([testNote("a", "Pool")], "2026-11-01"), exportNotes([testNote("b", "Pool")], "2026-11-02"));
    submit();
    expect(root.textContent).toContain(C.agree.en);
    $<HTMLInputElement>("#fc-only-differing").click();
    expect($("#fc-both-list").textContent).toBe(C.noneDiffer.en);
  });

  it("has no filter when no place is in both files", () => {
    mount();
    fill(exportNotes([testNote("a", "Pool", [], "9 Lake Rd")], "2026-11-01"), exportNotes([testNote("b", "Arena", [], "5 Rink Rd")], "2026-11-01"));
    submit();
    expect(root.querySelector("#fc-only-differing")).toBeNull();
    expect($("#fc-both-list").textContent).toBe(C.noneInBoth.en);
    expect(lastAudit()).toEqual([]);
  });
});

describe("removing the files", () => {
  it("empties both boxes and the results, moves focus to the first box and announces it", async () => {
    const h = compareBoth();
    $('[data-action="fc-clear"]').click();
    expect($<HTMLTextAreaElement>("#fc-text-a").value).toBe("");
    expect($<HTMLTextAreaElement>("#fc-text-b").value).toBe("");
    expect(root.querySelector("#fc-results")).toBeNull();
    expect(h.comparison()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fc-text-a");
    expect(await status()).toBe(C.cleared.en);
  });
});

describe("opening a file", () => {
  it("puts the file's text in its box, drops an old comparison and announces it", async () => {
    const read: FileReaderFn = () => Promise.resolve(FILE_B);
    const h = mount("en", read);
    fill(FILE_A, exportNotes([testNote("x", "Zoo")], "2026-11-01"));
    submit();
    expect(h.comparison()).toBeDefined();
    pickFile("#fc-open-b", new File([FILE_B], "notes-2026-11-15.json", { type: "application/json" }));
    await tick();
    expect($<HTMLTextAreaElement>("#fc-text-b").value).toBe(FILE_B);
    expect($<HTMLTextAreaElement>("#fc-text-a").value).toBe(FILE_A);
    expect(h.comparison()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fc-text-b");
    expect(await status()).toBe(openedText("b", "en"));
  });

  it("reads the file on this device by default, with FileReader where File.text() is missing", async () => {
    mount();
    pickFile("#fc-open-a", new File([FILE_A], "a.json", { type: "application/json" }));
    await vi.waitFor(() => expect($<HTMLTextAreaElement>("#fc-text-a").value).toBe(FILE_A));
  });

  it("uses File.text() when the browser has it", async () => {
    const file = new File(["x"], "a.json");
    Object.defineProperty(file, "text", { value: () => Promise.resolve("from text()") });
    expect(await readFileText(file)).toBe("from text()");
  });

  it("says when a file cannot be read and keeps focus on its picker", async () => {
    mount("en", () => Promise.reject(new Error("unreadable")));
    pickFile("#fc-open-a", new File(["x"], "a.json"));
    await tick();
    expect($("#fc-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe("fc-open-a");
  });

  it("refuses a file that is too large before reading it", async () => {
    let reads = 0;
    mount("en", () => {
      reads++;
      return Promise.resolve("");
    });
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    pickFile("#fc-open-b", big);
    await tick();
    expect(reads).toBe(0);
    expect($("#fc-errors").textContent).toContain(fileErrorText("b", "too-large", "en"));
  });

  it("does nothing after the widget is removed", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    pickFile("#fc-open-a", new File(["x"], "a.json"));
    h.destroy();
    handle = undefined;
    finish(FILE_A);
    await tick();
    expect(root.innerHTML).toBe("");
  });
});

describe("language", () => {
  it("switches to French, keeps both texts and makes the comparison again", () => {
    const h = compareBoth();
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fc-title").textContent).toBe(C.title.fr);
    expect(h.texts()).toEqual({ a: FILE_A, b: FILE_B });
    expect(h.comparison()?.both).toHaveLength(2);
    expect(root.querySelector('.fc-place tr[data-key="automatic-door"] td[data-side="b"] strong')?.textContent).toBe("UNKNOWN");
    expect(lastAudit()).toEqual([]);
  });

  it("writes French errors and status with French typography", async () => {
    mount("fr");
    submit();
    expect($("#fc-errors h3").textContent).toBe(C.errorsTitle.fr);
    fill(FILE_A, FILE_B);
    submit();
    expect(await status()).toBe(comparedText(2, 1, 1, "fr"));
    expect(lastAudit()).toEqual([]);
  });
});

describe("destroy", () => {
  it("removes the widget and its own live region", () => {
    const h = mount();
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(1);
    h.destroy();
    handle = undefined;
    expect(root.innerHTML).toBe("");
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(0);
  });

  it("leaves a host's announcer in place", () => {
    const said: string[] = [];
    const host = { say: (m: string) => void said.push(m), destroy: () => undefined };
    handle = mountFileCompare(root, { locale: "en", today: TODAY, announcer: host });
    fill(FILE_A, FILE_B);
    submit();
    expect(said).toEqual([comparedText(2, 1, 1, "en")]);
    handle.destroy();
    handle = undefined;
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(0);
  });
});

// One axe run per language and screen, so no single test needs a long timeout.
describe("axe", () => {
  it.each(["en", "fr"] as const)("passes on the empty form (%s)", async (l) => {
    mount(l);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with errors (%s)", async (l) => {
    mount(l);
    submit();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the results (%s)", async (l) => {
    compareBoth(l);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
