// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { placeId } from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";
import { VISITS_KEY, VISIT_COPY, VISIT_ERRORS, loadVisits, type Visit } from "./visits";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const LIB = placeId({ placeName: "Library", address: "1 Main St" });
const POOL = placeId({ placeName: "Pool", address: "1 Main St" });
const SAVED: Visit = {
  id: "v-saved1",
  placeId: LIB,
  placeName: "Library",
  address: "1 Main St",
  visitedOn: "2026-11-10",
  found: { elevator: "no" },
  words: "Lift out of order",
  writtenOn: "2026-11-10",
};
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([testNote("a", "Library", [{ key: "elevator", value: "yes" }]), testNote("b", "Pool", [])]);
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

function openList(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "visits"));
}

function pickFound(key: string, value: string): void {
  $<HTMLInputElement>(`input[name="found-${key}"][value="${value}"]`).checked = true;
}

describe("writing about a visit", () => {
  it("opens from My notes with no visits yet", () => {
    openList();
    expect(h.heading()).toBe(VISIT_COPY.title.en);
    expect(h.text()).toContain(VISIT_COPY.none.en);
  });

  it("asks for a place, and for something found or said, keeping what was typed", () => {
    openList();
    h.click(act("visit-new", ""));
    expect(h.heading()).toBe(VISIT_COPY.newTitle.en);
    expect($<HTMLInputElement>("#vs-date").value).toBe("2026-11-20");
    $<HTMLInputElement>("#vs-date").value = "2026-11-30";
    h.click(act("visit-save"));
    expect(document.activeElement?.id).toBe("error-summary");
    expect(Array.from(h.root.querySelectorAll("#error-summary li")).map((li) => li.textContent)).toEqual([
      VISIT_ERRORS["no-place"].en,
      VISIT_ERRORS["date-future"].en,
      VISIT_ERRORS.empty.en,
    ]);
    expect($("#vs-date").getAttribute("aria-invalid")).toBe("true");
    expect($<HTMLInputElement>("#vs-date").value).toBe("2026-11-30");
    expect(h.store.getItem(VISITS_KEY)).toBeNull();
  });

  it("saves a visit, says so, and lists it compared with the notes", async () => {
    openList();
    h.click(act("visit-new", ""));
    $<HTMLSelectElement>("#vs-place").value = LIB;
    $<HTMLInputElement>("#vs-date").value = "2026-11-19";
    pickFound("elevator", "no");
    $<HTMLTextAreaElement>("#vs-words").value = "Staff used the freight lift.";
    h.click(act("visit-save"));
    expect(h.heading()).toBe(VISIT_COPY.title.en);
    expect(await said()).toBe(VISIT_COPY.saved.en);
    const kept = loadVisits(h.store, TODAY);
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({ placeId: LIB, placeName: "Library", visitedOn: "2026-11-19", found: { elevator: "no" }, words: "Staff used the freight lift." });
    expect($("article.visit li").textContent).toBe("Elevator: No, not what your notes say.");
    expect($("article.visit [data-user-content]").textContent).toBe("Staff used the freight lift.");
  });

  it("starts from a place's page with that place chosen", () => {
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("open-place", POOL));
    h.click(act("visit-new", POOL));
    expect($<HTMLSelectElement>("#vs-place").value).toBe(POOL);
  });

  it("has its own addresses", () => {
    window.location.hash = "#/notes/visits/new";
    h.mount("fr", true);
    expect(h.heading()).toBe(VISIT_COPY.newTitle.fr);
  });
});

describe("with a saved visit", () => {
  beforeEach(() => h.store.setItem(VISITS_KEY, JSON.stringify([SAVED])));

  it("changes it in place, keeping its id", async () => {
    openList();
    h.click(act("visit-edit", SAVED.id));
    expect(h.heading()).toBe(VISIT_COPY.editTitle.en);
    expect($<HTMLInputElement>('input[name="found-elevator"][value="no"]').checked).toBe(true);
    expect($<HTMLTextAreaElement>("#vs-words").value).toBe("Lift out of order");
    pickFound("elevator", "yes");
    h.click(act("visit-save"));
    expect(await said()).toBe(VISIT_COPY.changed.en);
    expect(loadVisits(h.store, TODAY)).toEqual([{ ...SAVED, found: { elevator: "yes" }, writtenOn: "2026-11-20" }]);
    expect($("article.visit li").textContent).toBe("Elevator: Yes, same as your notes.");
  });

  it("opens a visit from its address, and the list for a visit that is not here", () => {
    window.location.hash = `#/notes/visits/${SAVED.id}`;
    h.mount("en", true);
    expect($<HTMLTextAreaElement>("#vs-words").value).toBe("Lift out of order");
    h.destroy();
    h = createHarness(TODAY);
    window.location.hash = "#/notes/visits/v-missing";
    h.mount("en", true);
    expect(h.heading()).toBe(VISIT_COPY.title.en);
  });

  it("asks before removing, names the visit, and can keep it", async () => {
    openList();
    h.click(act("visit-remove", SAVED.id));
    expect(document.activeElement?.getAttribute("data-action")).toBe("visit-remove-confirm");
    expect(document.activeElement?.getAttribute("aria-describedby")).toBe(`visit-${SAVED.id}`);
    h.click(act("visit-remove-cancel", SAVED.id));
    expect(document.activeElement?.textContent).toBe("Remove the visit to Library on 2026-11-10");
    h.click(act("visit-remove", SAVED.id));
    h.click(act("visit-remove-confirm", SAVED.id));
    expect(await said()).toBe(VISIT_COPY.removed.en);
    expect(h.store.getItem(VISITS_KEY)).toBeNull();
    expect(h.text()).toContain(VISIT_COPY.none.en);
  });

  it("starts a note from it, with the place, day and what was found, and no licence or words", () => {
    openList();
    h.click(act("visit-note", SAVED.id));
    expect($<HTMLInputElement>("#f-placeName").value).toBe("Library");
    expect($<HTMLInputElement>("#f-observedOn").value).toBe("2026-11-10");
    expect($<HTMLInputElement>('input[name="detail-elevator"][value="no"]').checked).toBe(true);
    expect($<HTMLSelectElement>("#f-licence").value).toBe("");
    expect(h.text()).not.toContain("Lift out of order");
  });

  it("is listed on its place's page, which can open My visits", () => {
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("open-place", LIB));
    expect($(".place-visits li").textContent).toBe("2026-11-10 \u2014 Elevator: No.");
    h.click(act("view", "visits"));
    expect(h.heading()).toBe(VISIT_COPY.title.en);
  });

  it("still reads well when its place has left the notes", () => {
    h.destroy();
    h = createHarness(TODAY);
    h.seed([testNote("b", "Pool", [])]);
    h.store.setItem(VISITS_KEY, JSON.stringify([SAVED]));
    openList();
    expect(h.text()).toContain(VISIT_COPY.gone.en);
    expect($("article.visit li").textContent).toBe("Elevator: No, your notes have nothing on this (UNKNOWN).");
    h.click(act("visit-edit", SAVED.id));
    expect($<HTMLSelectElement>("#vs-place").value).toBe(LIB);
    h.click(act("visit-save"));
    expect(loadVisits(h.store, TODAY)[0]?.placeName).toBe("Library");
  });

  it("is listed on the device page and can be cleared there", () => {
    h.mount("en");
    h.click(act("view", "help"));
    h.click(act("open-device"));
    expect($("#item-visits").textContent).toBe(VISIT_COPY.title.en);
    h.click(act("device-clear", "visits"));
    h.click(act("device-confirm", "visits"));
    expect(h.store.getItem(VISITS_KEY)).toBeNull();
  });

  it("lists what the newest visit found that the notes do not show, and asks the place about just that", () => {
    openList();
    expect(Array.from(h.root.querySelectorAll(".follow-ups li li")).map((li) => li.textContent)).toEqual(["Elevator: No, not what your notes say."]);
    h.click(act("visit-ask", SAVED.id));
    const checked = Array.from(h.root.querySelectorAll<HTMLInputElement>('[data-action="ask-key"]:checked')).map((c) => c.getAttribute("data-key"));
    expect(checked).toEqual(["elevator"]);
  });

  it("shows no follow-ups once a newer visit matches the notes", () => {
    h.store.setItem(VISITS_KEY, JSON.stringify([SAVED, { ...SAVED, id: "v-later", visitedOn: "2026-11-15", found: { elevator: "yes" }, words: "" }]));
    openList();
    expect(h.root.querySelector(".follow-ups")).toBeNull();
    expect(h.root.querySelectorAll("article.visit")).toHaveLength(2);
  });

  it("filters by place and by follow-ups, says how many are shown, and keeps focus on the control", async () => {
    h.store.setItem(VISITS_KEY, JSON.stringify([SAVED, { ...SAVED, id: "v-pool1", placeId: POOL, placeName: "Pool", visitedOn: "2026-11-12", found: {}, words: "Busy" }]));
    openList();
    expect($("#visit-shown").textContent).toBe("Showing 2 of 2 visits.");
    const select = $<HTMLSelectElement>("#visit-filter-place");
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(["Every place", "Library", "Pool"]);
    select.value = POOL;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.activeElement?.id).toBe("visit-filter-place");
    expect(Array.from(h.root.querySelectorAll("#visit-results article.visit h4")).map((x) => x.textContent)).toEqual(["Pool, 2026-11-12"]);
    expect(await said()).toBe("Showing 1 of 2 visits.");
    h.click('[data-action="visit-only-follow"]');
    expect(h.text()).toContain(VISIT_COPY.noneShown.en);
    expect(document.activeElement?.getAttribute("data-action")).toBe("visit-only-follow");
    $<HTMLSelectElement>("#visit-filter-place").value = "";
    $<HTMLSelectElement>("#visit-filter-place").dispatchEvent(new Event("change", { bubbles: true }));
    expect(Array.from(h.root.querySelectorAll("#visit-results article.visit h4")).map((x) => x.textContent)).toEqual(["Library, 2026-11-10"]);
  });

  it("offers the visits as a spreadsheet", () => {
    openList();
    const link = $<HTMLAnchorElement>("[data-visits-csv]");
    expect(link.getAttribute("download")).toBe("visits-2026-11-20.csv");
    const csv = decodeURIComponent((link.getAttribute("href") ?? "").split(",").slice(1).join(","));
    expect(csv).toContain("v-saved1,Library,1 Main St,2026-11-10,elevator,no,different,Lift out of order,2026-11-10");
  });

  it("offers the visits as a text file", () => {
    openList();
    const link = $<HTMLAnchorElement>("[data-visits-download]");
    expect(link.getAttribute("download")).toBe("my-visits.txt");
    expect(decodeURIComponent((link.getAttribute("href") ?? "").split(",").slice(1).join(","))).toContain("In my own words: Lift out of order");
  });

  it.each(["en", "fr"] as const)("the list, the form and its errors pass axe and the App's audit (%s)", async (l) => {
    h.store.setItem(VISITS_KEY, JSON.stringify([SAVED, { ...SAVED, id: "v-pool1", placeId: POOL, placeName: "Pool", visitedOn: "2026-11-12", found: { "automatic-door": "yes" }, words: "" }]));
    openList(l);
    expect(h.root.querySelectorAll(".follow-ups li li")).toHaveLength(2);
    h.click(act("visit-remove", SAVED.id));
    for (const step of [
      () => undefined,
      () => {
        h.click(act("visit-remove-cancel", SAVED.id));
        h.click(act("visit-new", ""));
      },
      () => h.click(act("visit-save")),
    ]) {
      step();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      expect(h.auditLines()).toEqual([]);
    }
  });
});

describe("with no notes", () => {
  it("explains that visits are about places in the notes", () => {
    h.destroy();
    h = createHarness(TODAY);
    openList();
    expect(h.text()).toContain(VISIT_COPY.noPlaces.en);
    expect(h.root.querySelector(act("visit-new", ""))).toBeNull();
  });
});
