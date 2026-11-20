// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { FACT_KEYS, auditDom, groupPlaces, type Locale } from "./index";
import { AXE_OPTIONS } from "./shelltest";
import { makeRng, randomNotes } from "./testkit";
import { renderPlaceVisits, renderVisitForm, renderVisits } from "./views-visits";
import { NO_FILTER, emptyVisitDraft, sortVisits, type Visit } from "./visits";

const TODAY = new Date(Date.UTC(2026, 10, 20));

function mount(html: string, l: Locale): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1>${html}</main></div>`;
  return document.getElementById("r") as HTMLElement;
}

/** Random visits to random places from random notes: some places gone, some details not looked at. */
function randomVisits(seed: number): { visits: Visit[]; places: ReturnType<typeof groupPlaces> } {
  const rng = makeRng(seed);
  const places = groupPlaces(randomNotes(rng, 12), "en");
  const visits: Visit[] = [];
  const n = Math.floor(rng() * 8);
  for (let i = 0; i < n; i++) {
    const place = places[Math.floor(rng() * places.length)];
    const gone = !place || rng() < 0.2;
    const found: Partial<Record<(typeof FACT_KEYS)[number], "yes" | "no">> = {};
    for (const k of FACT_KEYS) if (rng() < 0.5) found[k] = rng() < 0.5 ? "yes" : "no";
    const words = Object.keys(found).length === 0 || rng() < 0.4 ? `Visit ${i}: « ok » ; fine!` : "";
    visits.push({
      id: `v-${seed}x${i}`,
      placeId: gone ? `gone-${i}` : (place?.id ?? "x"),
      placeName: gone ? `Gone ${i}` : (place?.name ?? "x"),
      address: undefined,
      visitedOn: `2026-${String(1 + Math.floor(rng() * 10)).padStart(2, "0")}-0${1 + Math.floor(rng() * 9)}`,
      found,
      words,
      writtenOn: "2026-11-19",
    });
  }
  return { visits: sortVisits(visits), places };
}

describe("random visits", () => {
  it.each(["en", "fr"] as const)("render with the App's audit clean, ids unique and nothing undefined (%s)", (l) => {
    for (let seed = 1; seed <= 40; seed++) {
      const { visits, places } = randomVisits(seed);
      for (const onlyFollow of [false, true]) {
        const root = mount(renderVisits({ visits, places, locale: l, pendingRemove: visits[0]?.id, statusMessage: undefined, filter: { ...NO_FILTER, onlyFollow }, today: TODAY }), l);
        expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`), `seed ${seed}`).toEqual([]);
        const ids = Array.from(root.querySelectorAll("[id]")).map((e) => e.id);
        expect(new Set(ids).size, `seed ${seed}`).toBe(ids.length);
        expect(root.textContent, `seed ${seed}`).not.toMatch(/undefined|NaN|\[object/);
        // Each visit that is shown has one heading and, unless it is the one being removed, a button naming it.
        for (const a of Array.from(root.querySelectorAll("article.visit"))) expect(a.querySelectorAll("h4")).toHaveLength(1);
      }
    }
  });

  it("pass axe in both languages, with the form beside them", async () => {
    const { visits, places } = randomVisits(7);
    for (const l of ["en", "fr"] as const) {
      mount(
        renderVisits({ visits, places, locale: l, pendingRemove: undefined, statusMessage: undefined, filter: NO_FILTER, today: TODAY }) +
          renderVisitForm({ draft: emptyVisitDraft(TODAY), errors: [{ field: "found", code: "empty" }], places, editing: undefined, locale: l }).replace('id="view-title"', 'id="form-title"').replace('aria-labelledby="view-title"', 'aria-labelledby="form-title"'),
        l,
      );
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), l).toEqual([]);
    }
  });
});

describe("a place's visits", () => {
  it("lists only that place's visits, newest first, and always offers to write one", () => {
    const { places } = randomVisits(3);
    const place = places[0];
    if (!place) throw new Error("no place");
    const mine = (id: string, on: string): Visit => ({ id, placeId: place.id, placeName: place.name, address: undefined, visitedOn: on, found: { elevator: "yes" }, words: "", writtenOn: on });
    const root = mount(renderPlaceVisits(place, sortVisits([mine("v-a", "2026-10-01"), mine("v-b", "2026-11-01"), { ...mine("v-c", "2026-11-05"), placeId: "other" }]), "en"), "en");
    expect(Array.from(root.querySelectorAll("li")).map((li) => li.textContent)).toEqual(["2026-11-01 \u2014 Elevator: Yes.", "2026-10-01 \u2014 Elevator: Yes."]);
    expect(root.querySelector('[data-action="visit-new"]')?.getAttribute("data-value")).toBe(place.id);
    // On a place's page the section sits under the place's own heading.
    const none = mount(`<h2>Lieu</h2>${renderPlaceVisits(place, [], "fr")}`, "fr");
    expect(none.querySelector("ul")).toBeNull();
    expect(none.querySelector('[data-value="visits"]')).toBeNull();
    expect(auditDom(none, { locale: "fr" })).toEqual([]);
  });
});

describe("the form", () => {
  it("keeps a visit's place while changing it, even when that place has left the notes", () => {
    const v: Visit = { id: "v-x1", placeId: "gone-1", placeName: "Arena", address: undefined, visitedOn: "2026-11-01", found: {}, words: "Shut", writtenOn: "2026-11-01" };
    const root = mount(renderVisitForm({ draft: { ...emptyVisitDraft(TODAY), placeId: "gone-1", words: "Shut" }, errors: [], places: [], editing: v, locale: "en" }), "en");
    const select = root.querySelector<HTMLSelectElement>("#vs-place");
    expect(select?.value).toBe("gone-1");
    expect(Array.from(select?.options ?? []).map((o) => o.textContent)).toEqual(["Choose a place", "Arena"]);
    expect(root.querySelector("h2")?.textContent).toBe("Change a visit");
  });

  it("marks each field with a problem and links the summary to it", () => {
    const root = mount(
      renderVisitForm({
        draft: emptyVisitDraft(TODAY),
        errors: [
          { field: "place", code: "no-place" },
          { field: "date", code: "date-future" },
          { field: "words", code: "too-long" },
          { field: "found", code: "empty" },
        ],
        places: [],
        editing: undefined,
        locale: "fr",
      }),
      "fr",
    );
    for (const id of ["vs-place", "vs-date", "vs-words", "vs-found"]) {
      expect(root.querySelector(`#${id}`)?.getAttribute("aria-invalid"), id).toBe("true");
      expect(root.querySelector(`#error-summary a[href="#${id}"]`), id).not.toBeNull();
      expect(root.querySelector(`#e-${id}`), id).not.toBeNull();
    }
    expect(auditDom(root, { locale: "fr" }).map((v) => v.rule)).toEqual([]);
  });
});

describe("buttons that name a place", () => {
  it("mark the place's name as typed by the person, so a French page passes the App's audit whatever the name", () => {
    const v: Visit = { id: "v-q1", placeId: "cafe-1", placeName: "Café « Chez Lou » !", address: undefined, visitedOn: "2026-11-01", found: { elevator: "yes" }, words: "", writtenOn: "2026-11-01" };
    const root = mount(renderVisits({ visits: [v], places: [], locale: "fr", pendingRemove: undefined, statusMessage: undefined, filter: NO_FILTER, today: TODAY }), "fr");
    const names = Array.from(root.querySelectorAll('button[data-action^="visit-"] [data-user-content]')).map((s) => s.textContent);
    expect(names).toEqual(["Café « Chez Lou » !", "Café « Chez Lou » !", "Café « Chez Lou » !"]);
    expect(auditDom(root, { locale: "fr" }).map((x) => x.rule)).toEqual([]);
  });
});
