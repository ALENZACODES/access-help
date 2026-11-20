// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COMBINE_COPY } from "./combine";
import { CORRECTIONS_KEY } from "./noteedit";
import { loadNotes } from "./outbox";
import { placeId } from "./places";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";
import { VISITS_KEY, loadVisits } from "./visits";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const A = placeId({ placeName: "Library", address: "1 Main St" });
const B = placeId({ placeName: "Library", address: undefined });
const KEY = A < B ? `${A}|${B}` : `${B}|${A}`;
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([testNote("a1", "Library", [{ key: "elevator", value: "yes" }], "1 Main St"), testNote("b1", "Library", [{ key: "automatic-door", value: "no" }], null)]);
  h.store.setItem("app.onboarding.shortlist.v1", JSON.stringify([B]));
  h.store.setItem(VISITS_KEY, JSON.stringify([{ id: "v-b1", placeId: B, placeName: "Library", visitedOn: "2026-11-01", found: { elevator: "yes" }, words: "", writtenOn: "2026-11-01" }]));
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

function open(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("view", "similar"));
  h.click(act("similar-combine", KEY));
}

describe("combining two places", () => {
  it("opens from a pair that may be the same, with both places and a choice of address", () => {
    open();
    expect(h.heading()).toBe(COMBINE_COPY.title.en);
    // The pair's first place is the one whose id sorts first.
    const [first, second] = A < B ? ["Library, 1 Main St", "Library"] : ["Library", "Library, 1 Main St"];
    expect(Array.from(h.root.querySelectorAll(".combine-side h3")).map((x) => x.textContent)).toEqual([`First place: ${first}`, `Second place: ${second}`]);
    expect(h.root.querySelector('input[name="combine-name"]')).toBeNull();
    expect(h.root.querySelectorAll('input[name="combine-address"]')).toHaveLength(2);
  });

  it("updates what will change when the address chosen changes, keeping focus on the choice", () => {
    open();
    const radios = Array.from(h.root.querySelectorAll<HTMLInputElement>('input[name="combine-address"]'));
    const other = radios.find((r) => !r.checked) as HTMLInputElement;
    const before = $("#combine-preview").textContent;
    h.click(`[data-action="combine-address"][data-value="${other.getAttribute("data-value") ?? ""}"]`);
    expect(document.activeElement?.getAttribute("data-value")).toBe(other.getAttribute("data-value"));
    expect($("#combine-preview").textContent).not.toBe(before);
  });

  it("combines, logs the renamed note, moves the shortlist and the visit, and offers to undo", async () => {
    open();
    const chosen = h.root.querySelector<HTMLInputElement>('input[name="combine-address"]:checked');
    const address = chosen?.closest("label")?.textContent === COMBINE_COPY.noAddress.en ? "" : (chosen?.closest("label")?.textContent ?? "");
    h.click(act("combine-run"));
    expect(await said()).toBe(COMBINE_COPY.done.en);
    const target = placeId({ placeName: "Library", address: address || undefined });
    const notes = loadNotes(h.store).notes;
    expect(new Set(notes.map((n) => n.address ?? ""))).toEqual(new Set([address]));
    expect(JSON.parse(h.store.getItem("app.onboarding.shortlist.v1") ?? "[]")).toEqual([target]);
    expect(loadVisits(h.store, TODAY)[0]?.placeId).toBe(target);
    const log = JSON.parse(h.store.getItem(CORRECTIONS_KEY) ?? "[]") as Array<{ parts: string[] }>;
    expect(log.map((c) => c.parts)).toEqual([["address"]]);
    expect(h.root.querySelectorAll("dl.facts dd")).not.toHaveLength(0);
    expect(h.root.querySelector(act("combine-undo"))?.textContent).toBe(COMBINE_COPY.undo.en);
  });

  it("undoes everything at once, notes, lists, visits and the log", async () => {
    open();
    const before = { notes: h.store.getItem("app.onboarding.notes.v1"), shortlist: h.store.getItem("app.onboarding.shortlist.v1"), visits: h.store.getItem(VISITS_KEY) };
    h.click(act("combine-run"));
    h.click(act("combine-undo"));
    expect(await said()).toBe(COMBINE_COPY.undone.en);
    expect(JSON.parse(h.store.getItem("app.onboarding.notes.v1") ?? "null")).toEqual(JSON.parse(before.notes ?? "null"));
    expect(h.store.getItem("app.onboarding.shortlist.v1")).toBe(before.shortlist);
    expect(JSON.parse(h.store.getItem(VISITS_KEY) ?? "null")).toEqual(JSON.parse(before.visits ?? "null"));
    expect(JSON.parse(h.store.getItem(CORRECTIONS_KEY) ?? "[]")).toEqual([]);
    expect(h.heading()).not.toBe(COMBINE_COPY.title.en);
  });

  it("is offered on a place's page too, for each place that may be the same", () => {
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("open-place", A));
    expect(Array.from(h.root.querySelectorAll(".maybe-same button")).map((b) => b.textContent)).toEqual(["Combine with Library"]);
    h.click(act("similar-combine", KEY));
    expect(h.heading()).toBe(COMBINE_COPY.title.en);
  });

  it("renames removed notes too, so one put back joins the combined place, and undo puts them back as they were", () => {
    h.store.setItem("app.onboarding.bin.v1", JSON.stringify([{ note: testNote("r1", "Library", [{ key: "elevator", value: "no" }], null), removedOn: "2026-11-18" }]));
    open();
    const chosen = h.root.querySelector<HTMLInputElement>('input[name="combine-address"]:checked');
    const address = chosen?.closest("label")?.textContent === COMBINE_COPY.noAddress.en ? undefined : chosen?.closest("label")?.textContent;
    h.click(act("combine-run"));
    const bin = (): Array<{ note: { address?: string } }> => JSON.parse(h.store.getItem("app.onboarding.bin.v1") ?? "[]");
    expect(bin()[0]?.note.address).toBe(address);
    h.click(act("combine-undo"));
    expect(bin()[0]?.note.address).toBeUndefined();
  });

  it("leaves the pair off Possible matches once combined, and shows the change on the renamed note", () => {
    open();
    h.click(act("combine-run"));
    h.click(act("view", "places"));
    h.click(act("view", "similar"));
    expect(h.root.querySelector(act("similar-combine", KEY))).toBeNull();
    h.click(act("view", "notes"));
    const renamed = Array.from(h.root.querySelectorAll("li, article")).find((el) => (el.textContent ?? "").includes("Corrected on 2026-11-20"));
    expect(renamed?.textContent).toContain("Corrected on 2026-11-20: address");
  });

  it("stops offering undo once the person moves on", () => {
    open();
    h.click(act("combine-run"));
    h.click(act("view", "places"));
    expect(h.root.querySelector(act("combine-undo"))).toBeNull();
  });

  it("offers the two names when the same address has two, and says which answers only one place keeps", () => {
    h.destroy();
    h = createHarness(TODAY);
    h.seed([testNote("x1", "Town Hall", [], "5 King St"), testNote("y1", "City Hall", [], "5 King St")]);
    const x = placeId({ placeName: "Town Hall", address: "5 King St" });
    const y = placeId({ placeName: "City Hall", address: "5 King St" });
    h.store.setItem("app.onboarding.checklist.v1", JSON.stringify({ [x]: { elevator: { asked: true, answer: "Yes" } }, [y]: { elevator: { asked: true, answer: "No" } } }));
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("view", "similar"));
    h.click(act("similar-combine", x < y ? `${x}|${y}` : `${y}|${x}`));
    const names = Array.from(h.root.querySelectorAll<HTMLInputElement>('input[name="combine-name"]')).map((r) => r.closest("label")?.textContent);
    expect([...names].sort()).toEqual(["City Hall", "Town Hall"]);
    expect(h.root.querySelector('input[name="combine-address"]')).toBeNull();
    expect($("#combine-preview li").textContent).toBe("Both places have a different answer to a visit-plan question (Elevator): the answer of the place whose name you keep stays.");
    const town = Array.from(h.root.querySelectorAll<HTMLInputElement>('input[name="combine-name"]')).find((r) => r.closest("label")?.textContent === "Town Hall") as HTMLInputElement;
    h.click(`[data-action="combine-name"][data-value="${town.getAttribute("data-value") ?? ""}"]`);
    h.click(act("combine-run"));
    expect(loadNotes(h.store).notes.map((n) => n.placeName)).toEqual(["Town Hall", "Town Hall"]);
    expect(JSON.parse(h.store.getItem("app.onboarding.checklist.v1") ?? "{}")).toEqual({ [x]: { elevator: { asked: true, answer: "Yes" } } });
  });

  it("says so when one of the places has gone, and has its own address", () => {
    window.location.hash = `#/places/combine/${A},library-00000000`;
    h.mount("fr", true);
    expect(h.heading()).toBe(COMBINE_COPY.title.fr);
    expect(h.text()).toContain(COMBINE_COPY.gone.fr);
  });

  it.each(["en", "fr"] as const)("passes axe and the App's audit (%s)", async (l) => {
    open(l);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(h.auditLines()).toEqual([]);
  });
});
