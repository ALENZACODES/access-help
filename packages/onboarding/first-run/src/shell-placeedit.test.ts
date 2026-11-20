// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PLACE_TEXT_ERRORS, RENAME_COPY, SPLIT_COPY, SPLIT_ERRORS } from "./combine";
import { CORRECTIONS_KEY } from "./noteedit";
import { loadNotes } from "./outbox";
import { placeId } from "./places";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const LIB = placeId({ placeName: "Library", address: "1 Main St" });
const POOL = placeId({ placeName: "Pool", address: "2 Side Rd" });
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([
    testNote("a1", "Library", [{ key: "elevator", value: "yes" }]),
    testNote("a2", "Library", [{ key: "automatic-door", value: "no" }]),
    testNote("p1", "Pool", [], "2 Side Rd"),
  ]);
  h.store.setItem("app.onboarding.shortlist.v1", JSON.stringify([LIB]));
});

afterEach(() => h.destroy());

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = h.root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

const said = async (): Promise<string> => {
  await Promise.resolve();
  return h.status();
};

function openPlace(id: string, locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("open-place", id));
}

function type(name: string, address: string): void {
  $<HTMLInputElement>("#pe-name").value = name;
  $<HTMLInputElement>("#pe-address").value = address;
}

function submit(id: string): void {
  $<HTMLFormElement>(id).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

describe("changing a place's name or address", () => {
  it("opens from the place with its name and address filled in", () => {
    openPlace(LIB);
    h.click(act("open-rename", LIB));
    expect(h.heading()).toBe(RENAME_COPY.title.en);
    expect([$<HTMLInputElement>("#pe-name").value, $<HTMLInputElement>("#pe-address").value]).toEqual(["Library", "1 Main St"]);
    expect(h.root.querySelector(act("rename-run"))).toBeNull();
  });

  it("says what is wrong, at the field, with focus on the list of problems", () => {
    openPlace(LIB);
    h.click(act("open-rename", LIB));
    submit("#rename-form");
    expect(document.activeElement?.id).toBe("error-summary");
    expect($("#e-pe-name").textContent).toBe(PLACE_TEXT_ERRORS.unchanged.en);
    type("", "1 Main St");
    submit("#rename-form");
    expect($("#pe-name").getAttribute("aria-invalid")).toBe("true");
    expect($("#e-pe-name").textContent).toBe(PLACE_TEXT_ERRORS["name-required"].en);
  });

  it("shows what will change, then renames every note, moves the shortlist, logs it and offers to undo", async () => {
    openPlace(LIB);
    h.click(act("open-rename", LIB));
    type("Central Library", "1 Main St");
    submit("#rename-form");
    expect(document.activeElement?.id).toBe("pe-preview");
    expect($("#pe-preview li").textContent).toBe("2 of 2 notes will be named “Central Library, 1 Main St”.");
    h.click(act("rename-run"));
    expect(await said()).toBe(RENAME_COPY.done.en);
    expect(loadNotes(h.store).notes.map((n) => n.placeName)).toEqual(["Central Library", "Central Library", "Pool"]);
    const target = placeId({ placeName: "Central Library", address: "1 Main St" });
    expect(JSON.parse(h.store.getItem("app.onboarding.shortlist.v1") ?? "[]")).toEqual([target]);
    expect((JSON.parse(h.store.getItem(CORRECTIONS_KEY) ?? "[]") as unknown[]).length).toBe(2);
    expect(h.text()).toContain(RENAME_COPY.done.en);
    h.click(act("combine-undo"));
    expect(await said()).toBe(RENAME_COPY.undone.en);
    expect(loadNotes(h.store).notes.map((n) => n.placeName)).toEqual(["Library", "Library", "Pool"]);
    expect(JSON.parse(h.store.getItem("app.onboarding.shortlist.v1") ?? "[]")).toEqual([LIB]);
  });

  it("looks again instead of saving when the typing changed after the preview", () => {
    openPlace(LIB);
    h.click(act("open-rename", LIB));
    type("Central Library", "1 Main St");
    submit("#rename-form");
    type("Main Library", "1 Main St");
    h.click(act("rename-run"));
    expect(loadNotes(h.store).notes[0]?.placeName).toBe("Library");
    expect(h.text()).toContain(RENAME_COPY.changed.en);
    expect($("#pe-preview li").textContent).toContain("Main Library");
  });

  it("says when the new name joins a place already there", () => {
    openPlace(POOL);
    h.click(act("open-rename", POOL));
    type("Library", "1 Main St");
    submit("#rename-form");
    expect($("#pe-preview li").textContent).toBe(RENAME_COPY.joins.en);
  });
});

describe("moving some notes to another place", () => {
  it("is offered only for a place with more than one note", () => {
    openPlace(POOL);
    expect(h.root.querySelector(act("open-split", POOL))).toBeNull();
    h.click(act("view", "places"));
    h.click(act("open-place", LIB));
    expect(h.root.querySelector(act("open-split", LIB))).not.toBeNull();
  });

  it("needs some notes, not all, and a new name or address", () => {
    openPlace(LIB);
    h.click(act("open-split", LIB));
    expect(h.heading()).toBe(SPLIT_COPY.title.en);
    type("Library annex", "1 Main St");
    submit("#split-form");
    expect($("#e-pe-notes").textContent).toBe(SPLIT_ERRORS["none-chosen"].en);
    for (const box of Array.from(h.root.querySelectorAll<HTMLInputElement>('input[name="split-note"]'))) box.checked = true;
    submit("#split-form");
    expect($("#e-pe-notes").textContent).toBe(SPLIT_ERRORS["all-chosen"].en);
    expect($<HTMLInputElement>("#pe-name").value).toBe("Library annex");
  });

  it("moves the chosen note only, keeps the shortlist with the place, and can be undone", async () => {
    openPlace(LIB);
    h.click(act("open-split", LIB));
    expect(Array.from(h.root.querySelectorAll("#pe-notes li")).map((li) => li.textContent)).toEqual([
      "Added on 2026-10-01: Elevator: Yes",
      "Added on 2026-10-01: Automatic door: No",
    ]);
    $<HTMLInputElement>('input[name="split-note"][value="a2"]').checked = true;
    type("Library annex", "1 Main St");
    submit("#split-form");
    expect($("#pe-preview li").textContent).toBe("1 of 1 note will be named “Library annex, 1 Main St”.");
    h.click(act("split-run"));
    expect(await said()).toBe(SPLIT_COPY.done.en);
    expect(loadNotes(h.store).notes.map((n) => n.placeName)).toEqual(["Library", "Library annex", "Pool"]);
    expect(JSON.parse(h.store.getItem("app.onboarding.shortlist.v1") ?? "[]")).toEqual([LIB]);
    expect(h.root.querySelector(act("combine-undo"))?.textContent).toBe(SPLIT_COPY.undo.en);
    h.click(act("combine-undo"));
    expect(await said()).toBe(SPLIT_COPY.undone.en);
    expect(loadNotes(h.store).notes.map((n) => n.placeName)).toEqual(["Library", "Library", "Pool"]);
  });
});

describe("joining a place already there", () => {
  it("moves notes into it when the new name and address are its own", async () => {
    openPlace(LIB);
    h.click(act("open-split", LIB));
    $<HTMLInputElement>('input[name="split-note"][value="a2"]').checked = true;
    type("Pool", "2 Side Rd");
    submit("#split-form");
    expect(Array.from(h.root.querySelectorAll("#pe-preview li")).map((li) => li.textContent)).toEqual([SPLIT_COPY.joins.en, "1 of 1 note will be named “Pool, 2 Side Rd”."]);
    h.click(act("split-run"));
    expect(await said()).toBe(SPLIT_COPY.done.en);
    h.click(act("view", "places"));
    h.click(act("open-place", POOL));
    expect(h.root.querySelectorAll("dl.facts dd")).not.toHaveLength(0);
    expect(loadNotes(h.store).notes.filter((n) => n.placeName === "Pool").map((n) => n.id)).toEqual(["a2", "p1"]);
  });
});

describe("from the comparison of two places", () => {
  it("offers to combine them, and only when there are two", () => {
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    for (const id of [LIB, POOL]) h.click(act("toggle-compare", id));
    h.click(act("open-compare"));
    const key = LIB < POOL ? `${LIB}|${POOL}` : `${POOL}|${LIB}`;
    expect(h.root.querySelector(act("similar-combine", key))?.textContent).toBe("Combine these two places");
    h.click(act("similar-combine", key));
    expect(h.heading()).toBe("Combine two places");
  });
});

describe("in French", () => {
  it("says each problem with French typography and keeps what was typed", () => {
    openPlace(LIB, "fr");
    h.click(act("open-rename", LIB));
    type("joe@example.com", "1 Main St");
    submit("#rename-form");
    expect($("#e-pe-name").textContent).toBe(PLACE_TEXT_ERRORS["personal-email"].fr);
    expect(PLACE_TEXT_ERRORS["personal-email"].fr).toContain("\u00A0:");
    expect($<HTMLInputElement>("#pe-name").value).toBe("joe@example.com");
    type("Bibliothèque centrale", "1 Main St");
    submit("#rename-form");
    expect($("#pe-preview li").textContent).toBe("2 notes sur 2 prendront le nom «\u202FBibliothèque centrale, 1 Main St\u202F».");
    expect(h.auditLines()).toEqual([]);
  });
});

describe("addresses and accessibility", () => {
  it("has its own addresses", () => {
    window.location.hash = `#/places/${LIB}/split`;
    h.mount("fr", true);
    expect(h.heading()).toBe(SPLIT_COPY.title.fr);
    expect(h.root.querySelectorAll('input[name="split-note"]')).toHaveLength(2);
  });

  it.each(["en", "fr"] as const)("both pages, with errors and with a preview, pass axe and the App's audit (%s)", async (l) => {
    openPlace(LIB, l);
    for (const [open, form, fill] of [
      ["open-rename", "#rename-form", () => type("Central", "")],
      ["open-split", "#split-form", () => {
        $<HTMLInputElement>('input[name="split-note"][value="a1"]').checked = true;
        type("Annex", "");
      }],
    ] as const) {
      // The second page is reached with the first page's "Back to the place".
      if (open === "open-split") h.click(act("open-place", LIB));
      h.click(act(open, LIB));
      submit(form);
      fill();
      submit(form);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), open).toEqual([]);
      expect(h.auditLines(), open).toEqual([]);
    }
  });
});
