// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { addressOptions, defaultChoice, nameOptions, type CombineData } from "./combine";
import { auditDom, groupPlaces, type Locale, type Place } from "./index";
import { AXE_OPTIONS } from "./shelltest";
import { makeRng, randomNotes } from "./testkit";
import { renderCombine, renderMaybeSame } from "./views-combine";
import { renderRename, renderSplit } from "./views-placeedit";

const TODAY = new Date(Date.UTC(2030, 0, 1));

function mount(html: string, l: Locale): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1>${html}</main></div>`;
  return document.getElementById("r") as HTMLElement;
}

describe("random pairs of places", () => {
  it.each(["en", "fr"] as const)("render the combine page with the App's audit clean, ids unique and every choice offered once (%s)", (l) => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = makeRng(seed);
      const notes = randomNotes(rng, 12);
      const places = groupPlaces(notes, l);
      if (places.length < 2) continue;
      const [a, b] = [places[0] as Place, places[1] as Place];
      const data: CombineData = { notes, shortlist: [a.id, b.id], checklist: {}, asked: [], visits: [], dismissed: [] };
      const root = mount(renderCombine({ a, b, choice: defaultChoice(a, b), data, locale: l, today: TODAY }), l);
      expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`), `seed ${seed}`).toEqual([]);
      const ids = Array.from(root.querySelectorAll("[id]")).map((e) => e.id);
      expect(new Set(ids).size, `seed ${seed}`).toBe(ids.length);
      const radios = (name: string): number => root.querySelectorAll(`input[name="${name}"]`).length;
      const names = nameOptions(a, b).length;
      const addresses = addressOptions(a, b).length;
      expect([radios("combine-name"), radios("combine-address")], `seed ${seed}`).toEqual([names > 1 ? names : 0, addresses > 1 ? addresses : 0]);
      expect(root.querySelectorAll('input[type="radio"]:checked').length, `seed ${seed}`).toBe((names > 1 ? 1 : 0) + (addresses > 1 ? 1 : 0));
      expect(root.textContent, `seed ${seed}`).not.toMatch(/undefined|NaN/);
    }
  });

  it("pass axe on the combine, rename and split pages in both languages", async () => {
    const notes = randomNotes(makeRng(3), 10);
    for (const l of ["en", "fr"] as const) {
      const places = groupPlaces(notes, l);
      const [a, b] = [places[0] as Place, places[1] as Place];
      const data: CombineData = { notes, shortlist: [], checklist: {}, asked: [], visits: [], dismissed: [] };
      const edit = { name: a.name, address: "", chosen: [], errors: [], preview: undefined };
      for (const html of [
        renderCombine({ a, b, choice: defaultChoice(a, b), data, locale: l, today: TODAY }),
        renderRename({ place: a, edit, locale: l, statusMessage: undefined }),
        renderSplit({ place: a, edit, locale: l, statusMessage: undefined }),
      ]) {
        mount(html, l);
        const r = await axe.run(document.body, AXE_OPTIONS);
        expect(r.violations.map((v) => `${v.id}: ${v.help}`), l).toEqual([]);
      }
    }
  });
});

describe("the pages when a place has gone", () => {
  it("say so instead of showing a form", () => {
    for (const html of [
      renderCombine({ a: undefined, b: undefined, choice: undefined, data: { notes: [], shortlist: [], checklist: {}, asked: [], visits: [], dismissed: [] }, locale: "en", today: TODAY }),
      renderRename({ place: undefined, edit: { name: "", address: "", chosen: [], errors: [], preview: undefined }, locale: "en", statusMessage: undefined }),
      renderSplit({ place: undefined, edit: { name: "", address: "", chosen: [], errors: [], preview: undefined }, locale: "en", statusMessage: undefined }),
    ]) {
      const root = mount(html, "en");
      expect(root.querySelector("form")).toBeNull();
      expect(root.textContent).toContain("One of these places is no longer in your notes.");
    }
  });

  it("show nothing about places that may be the same when there are none", () => {
    expect(renderMaybeSame([], "en")).toBe("");
  });
});

describe("the rename and split pages' problems", () => {
  const notes = randomNotes(makeRng(9), 8);
  const place = groupPlaces(notes, "en").find((p) => p.notes.length > 1) ?? (groupPlaces(notes, "en")[0] as Place);
  const ALL = ["name-required", "name-too-long", "address-too-long", "control-chars", "personal-email", "personal-phone", "unchanged"] as const;

  it.each(["en", "fr"] as const)("link each problem in the summary to a field on the page, with the App's audit clean (%s)", (l) => {
    for (const errors of [ALL.map((e) => e), ["none-chosen" as const], ["all-chosen" as const, "unchanged" as const]]) {
      const edit = { name: place.name, address: "", chosen: [], errors, preview: undefined };
      const root = mount(renderSplit({ place, edit, locale: l, statusMessage: undefined }), l);
      const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("#error-summary a"));
      expect(links).toHaveLength(errors.length);
      for (const a of links) expect(root.querySelector(a.getAttribute("href") ?? "#none"), a.textContent ?? "").not.toBeNull();
      expect(root.querySelector("#pe-preview")).toBeNull();
      expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
    }
  });

  it("lists each of the place's notes once to choose from, with the person's own words marked as theirs", () => {
    const withText = { ...place, notes: place.notes.map((n, i) => (i === 0 ? { ...n, note: "Ramp at « side » door ; ok!" } : n)) };
    const root = mount(renderSplit({ place: withText, edit: { name: "", address: "", chosen: [withText.notes[0]?.id ?? ""], errors: [], preview: undefined }, locale: "fr", statusMessage: undefined }), "fr");
    const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="split-note"]'));
    expect(boxes.map((b) => b.value)).toEqual(withText.notes.map((n) => n.id));
    expect(boxes.filter((b) => b.checked)).toHaveLength(1);
    expect(Array.from(root.querySelectorAll("[data-user-content]")).map((e) => e.textContent)).toContain("Ramp at « side » door ; ok!");
    expect(auditDom(root, { locale: "fr" })).toEqual([]);
  });
});
