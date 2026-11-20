// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { placeId } from "./places";
import { act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

/**
 * Names people type can hold anything: « », ; ! ? with or without spaces. The
 * App's French typography check is for the App's own words, so every page that
 * shows a typed name must mark it as the person's. This walks the pages added
 * in the last rounds with such names, in French, and runs the App's audit.
 */
const TODAY = new Date(Date.UTC(2026, 10, 20));
const NAME = "Café « Lou » ; ouvert!";
const ADDRESS = "1 rue X ; arrière?";
const A = placeId({ placeName: NAME, address: ADDRESS });
const B = placeId({ placeName: NAME, address: undefined });
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([testNote("a1", NAME, [{ key: "elevator", value: "yes" }], ADDRESS), testNote("b1", NAME, [{ key: "elevator", value: "no" }], null)]);
  h.store.setItem("app.onboarding.visits.v1", JSON.stringify([{ id: "v-1", placeId: A, placeName: NAME, address: ADDRESS, visitedOn: "2026-11-02", found: { elevator: "no" }, words: "Fermé ; dommage!", writtenOn: "2026-11-02" }]));
  h.store.setItem("app.onboarding.needsets.v1", JSON.stringify([{ id: "s-1", name: "Avec « le fauteuil » !", needs: { elevator: "yes" }, savedOn: "2026-11-01" }]));
  h.mount("fr");
  h.click(act("view", "notes"));
});

afterEach(() => h.destroy());

const audit = (where: string): void => {
  expect(h.auditLines(), where).toEqual([]);
};

describe("typed names on the newer pages, in French", () => {
  it("never trip the App's audit", () => {
    h.click(act("view", "visits"));
    audit("My visits");
    h.click(act("visit-edit", "v-1"));
    audit("a visit");
    h.click(act("view", "visits"));
    h.click(act("view", "notes"));
    h.click(act("view", "journal"));
    audit("What I did");
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    audit("places with a set to filter with");
    h.click(act("open-place", A));
    audit("the place's page");
    h.click(act("open-rename", A));
    audit("rename");
    h.click(act("open-place", A));
    h.click(act("similar-combine", A < B ? `${A}|${B}` : `${B}|${A}`));
    audit("combine");
    h.click(act("combine-run"));
    audit("after combining");
  });
});
