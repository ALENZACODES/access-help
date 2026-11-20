// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { LIMITS, auditCopy, auditDom, memoryStore, type Locale, type Note } from "./index";
import {
  BIN_COPY,
  BIN_DAYS,
  BIN_KEY,
  MAX_BIN,
  addToBin,
  binLine,
  binStrings,
  countBinEntries,
  daysLeft,
  deleteFromBin,
  deleteLabel,
  expireBin,
  loadBin,
  parseBin,
  putBackLabel,
  restoreFromBin,
  saveBin,
  type BinEntry,
} from "./bin";
import { renderBin, type BinContext } from "./views-bin";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const day = (iso: string): Date => new Date(`${iso}T12:00:00Z`);
const A = (): Note => testNote("a", "Library", [{ key: "elevator", value: "yes" }]);
const B = (): Note => testNote("b", "Cafe", [{ key: "automatic-door", value: "no" }], null);

describe("moving notes in and out", () => {
  it("adds newest first, and a note removed again replaces its older entry", () => {
    let bin = addToBin([], A(), day("2026-11-01"));
    bin = addToBin(bin, B(), day("2026-11-05"));
    bin = addToBin(bin, A(), TODAY);
    expect(bin.map((e) => [e.note.id, e.removedOn])).toEqual([
      ["a", "2026-11-19"],
      ["b", "2026-11-05"],
    ]);
  });

  it("keeps at most 50, dropping the oldest", () => {
    let bin: BinEntry[] = [];
    for (let i = 0; i < MAX_BIN + 5; i++) bin = addToBin(bin, testNote(`n${i}`, `P${i}`, [{ key: "elevator", value: "yes" }]), TODAY);
    expect(bin).toHaveLength(MAX_BIN);
    expect(bin[MAX_BIN - 1]?.note.id).toBe("n5");
  });

  it("puts a note back unchanged at the top of the notes", () => {
    const bin = addToBin([], A(), TODAY);
    const r = restoreFromBin(bin, [B()], "a");
    expect(r).toEqual({ ok: true, bin: [], notes: [A(), B()] });
  });

  it("will not put back past the notes limit, over a note with the same id, or one that is not there", () => {
    const bin = addToBin([], A(), TODAY);
    const full = Array.from({ length: LIMITS.notes }, (_, i) => testNote(`f${i}`, `F${i}`, [{ key: "elevator", value: "yes" }]));
    expect(restoreFromBin(bin, full, "a")).toEqual({ ok: false, reason: "full" });
    expect(restoreFromBin(bin, [A()], "a")).toEqual({ ok: false, reason: "exists" });
    expect(restoreFromBin(bin, [], "zzz")).toEqual({ ok: false, reason: "missing" });
  });

  it("removes one entry for good", () => {
    const bin = addToBin(addToBin([], A(), TODAY), B(), TODAY);
    expect(deleteFromBin(bin, "a").map((e) => e.note.id)).toEqual(["b"]);
  });
});

describe("the 30 days", () => {
  it("counts down from 30 on the day removed to 1 on the last day", () => {
    expect(daysLeft({ note: A(), removedOn: "2026-11-19" }, TODAY)).toBe(BIN_DAYS);
    expect(daysLeft({ note: A(), removedOn: "2026-10-21" }, TODAY)).toBe(1);
    expect(daysLeft({ note: A(), removedOn: "2026-10-20" }, TODAY)).toBe(0);
  });

  it("drops entries past their 30 days", () => {
    const bin: BinEntry[] = [
      { note: A(), removedOn: "2026-10-21" },
      { note: B(), removedOn: "2026-10-20" },
    ];
    expect(expireBin(bin, TODAY).map((e) => e.note.id)).toEqual(["a"]);
  });

  it("says when it was removed and how long is left", () => {
    expect(binLine({ note: A(), removedOn: "2026-11-19" }, "en", TODAY)).toBe("Removed on 2026-11-19 · 30 days left");
    expect(binLine({ note: A(), removedOn: "2026-10-21" }, "en", TODAY)).toBe("Removed on 2026-10-21 · 1 day left");
    expect(binLine({ note: A(), removedOn: "2026-10-21" }, "fr", TODAY)).toBe("Retirée le 2026-10-21 · 1 jour restant");
    expect(binLine({ note: A(), removedOn: "2026-11-18" }, "fr", TODAY)).toBe("Retirée le 2026-11-18 · 29 jours restants");
  });
});

describe("kept on this device", () => {
  it("saves and reads back, removes the key when empty, and says when the device will not keep it", () => {
    const store = memoryStore();
    const bin = addToBin([], A(), TODAY);
    expect(saveBin(store, bin)).toBe("saved");
    expect(loadBin(store, TODAY)).toEqual(bin);
    expect(saveBin(store, [])).toBe("saved");
    expect(store.getItem(BIN_KEY)).toBeNull();
    expect(saveBin(undefined, bin)).toBe("unavailable");
    expect(saveBin({ getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => undefined }, bin)).toBe("unavailable");
    expect(loadBin({ getItem: () => { throw new Error("no"); }, setItem: () => undefined, removeItem: () => undefined }, TODAY)).toEqual([]);
  });

  it("reads defensively: bad notes, bad or future dates and repeats are dropped, old ones expire", () => {
    const raw = JSON.stringify([
      { note: A(), removedOn: "2026-11-19" },
      { note: { ...B(), licence: "All rights reserved" }, removedOn: "2026-11-19" },
      { note: B(), removedOn: "2026-02-30" },
      { note: B(), removedOn: "2026-12-01" },
      { note: A(), removedOn: "2026-11-18" },
      { note: testNote("old", "Old", [{ key: "elevator", value: "yes" }]), removedOn: "2026-01-01" },
      "junk",
    ]);
    expect(parseBin(raw, TODAY).map((e) => e.note.id)).toEqual(["a"]);
    // The device page counts what is written, whatever the date: the future-dated and old entries are still there.
    expect(countBinEntries(raw)).toBe(3);
    expect(parseBin("{", TODAY)).toEqual([]);
    expect(parseBin('{"a":1}', TODAY)).toEqual([]);
    expect(countBinEntries(null)).toBe(0);
  });
});

describe("words and copy", () => {
  it("names each button after the place", () => {
    expect(putBackLabel("Library", "en")).toBe("Put back the note about Library");
    expect(deleteLabel("Library", "fr")).toBe("Retirer définitivement la note sur Library");
  });

  it("passes the App's copy audit", () => {
    expect(auditCopy(binStrings())).toEqual([]);
    expect(BIN_COPY.confirmEmpty.fr).toContain("\u202F?");
  });
});

describe("the page", () => {
  function ctx(more: Partial<BinContext> = {}): BinContext {
    return { bin: addToBin(addToBin([], A(), TODAY), B(), day("2026-11-10")), locale: "en", today: TODAY, statusMessage: undefined, confirmDelete: undefined, confirmEmpty: false, ...more };
  }

  function mount(html: string, l: Locale): HTMLElement {
    document.documentElement.lang = l;
    document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1>${html}</main></div>`;
    return document.getElementById("r") as HTMLElement;
  }

  async function clean(html: string, l: Locale): Promise<void> {
    const root = mount(html, l);
    expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  }

  it.each(["en", "fr"] as const)("passes axe and the App's audit: list, empty, asking one, asking all (%s)", async (l) => {
    await clean(renderBin(ctx({ locale: l })), l);
    await clean(renderBin(ctx({ locale: l, bin: [] })), l);
    await clean(renderBin(ctx({ locale: l, confirmDelete: "a" })), l);
    await clean(renderBin(ctx({ locale: l, confirmEmpty: true })), l);
  });

  it("shows each note as it was, with where its details came from", () => {
    const root = mount(renderBin(ctx()), "en");
    const a = root.querySelector('[data-bin="a"]');
    expect(a?.querySelector("[data-bin-left]")?.textContent).toBe("Removed on 2026-11-19 · 30 days left");
    expect(a?.querySelector("dl.facts")?.textContent).toContain("Source");
    expect(Array.from(a?.querySelectorAll("button") ?? []).map((b) => b.textContent)).toEqual([
      "Put back the note about Library, 1 Main St",
      "Remove the note about Library, 1 Main St for good",
    ]);
  });

  it("asks before removing one for good, in place of its buttons", () => {
    const root = mount(renderBin(ctx({ confirmDelete: "a" })), "en");
    const a = root.querySelector('[data-bin="a"]');
    expect(a?.textContent).toContain(BIN_COPY.confirmDelete.en);
    expect(a?.querySelector('[data-action="bin-delete-confirm"]')).not.toBeNull();
    expect(a?.querySelector('[data-action="bin-restore"]')).toBeNull();
    expect(root.querySelector('[data-bin="b"] [data-action="bin-restore"]')).not.toBeNull();
  });
});
