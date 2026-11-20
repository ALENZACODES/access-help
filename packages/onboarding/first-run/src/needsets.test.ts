import { describe, expect, it } from "vitest";
import { auditCopy, memoryStore } from "./index";
import type { Requirement } from "./filter";
import {
  MAX_SETS,
  NEED_SETS_KEY,
  addSet,
  checkSetName,
  cleanNeeds,
  filteredText,
  loadSets,
  parseSet,
  parseSets,
  removeSet,
  renameSet,
  sameNeeds,
  saveSets,
  setInUse,
  setLabel,
  setSummary,
  setsStrings,
  updateSet,
  type NeedSet,
} from "./needsets";
import { makeRng } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 11, 1));
const chair: NeedSet = { id: "s-chair", name: "With the power chair", needs: { "step-free-entry": "yes", elevator: "yes" }, savedOn: "2026-11-01" };
const walker: NeedSet = { id: "s-walker", name: "With the walker", needs: { elevator: "yes" }, savedOn: "2026-11-02" };

describe("names", () => {
  it("must be given, short, plain, and not used by another set", () => {
    expect(checkSetName("Rollator days", [chair])).toEqual([]);
    expect(checkSetName("  ", [])).toEqual(["required"]);
    expect(checkSetName("x".repeat(41), [])).toEqual(["too-long"]);
    expect(checkSetName("tab\there", [])).toEqual(["control-chars"]);
    expect(checkSetName("me@example.com", [])).toEqual(["personal-email"]);
    expect(checkSetName("call 416 555 0199", [])).toEqual(["personal-phone"]);
    expect(checkSetName(" with THE power chair ", [chair])).toEqual(["taken"]);
    expect(checkSetName("With the power chair", [chair], "s-chair")).toEqual([]);
  });
});

describe("keeping sets", () => {
  it("adds a set holding only the details with a must-have", () => {
    // Must-haves read from elsewhere may carry other values; only Yes and No are kept.
    const r = addSet([chair], "  Walker  ", { elevator: "yes", "automatic-door": "maybe" } as unknown as Requirement, TODAY, "s-new");
    expect(r).toEqual({ ok: true, sets: [chair, { id: "s-new", name: "Walker", needs: { elevator: "yes" }, savedOn: "2026-12-01" }] });
  });

  it("refuses a set with no must-haves, a taken name, or one past the limit, saying every reason", () => {
    expect(addSet([chair], "With the power chair", {}, TODAY, "s-x")).toEqual({ ok: false, errors: ["taken", "empty-needs"] });
    const full = Array.from({ length: MAX_SETS }, (_, i): NeedSet => ({ ...walker, id: `s-${i}`, name: `Set ${i}` }));
    expect(addSet(full, "One more", { elevator: "no" }, TODAY, "s-x")).toEqual({ ok: false, errors: ["full"] });
  });

  it("renames, updates and removes one set, leaving the others", () => {
    const sets = [chair, walker];
    const renamed = renameSet(sets, "s-walker", "Walker", TODAY);
    expect(renamed.ok && renamed.sets.map((s) => s.name)).toEqual(["With the power chair", "Walker"]);
    expect(renameSet(sets, "s-walker", "with the power chair", TODAY)).toEqual({ ok: false, errors: ["taken"] });
    const updated = updateSet(sets, "s-walker", { "automatic-door": "yes" }, TODAY);
    expect(updated.ok && updated.sets[1]).toEqual({ ...walker, needs: { "automatic-door": "yes" }, savedOn: "2026-12-01" });
    expect(updateSet(sets, "s-walker", {}, TODAY)).toEqual({ ok: false, errors: ["empty-needs"] });
    expect(removeSet(sets, "s-chair")).toEqual([walker]);
  });

  it("knows which set is in use", () => {
    expect(setInUse([chair, walker], { elevator: "yes" })).toEqual(walker);
    expect(setInUse([chair, walker], { elevator: "yes", "step-free-entry": "yes" })).toEqual(chair);
    expect(setInUse([chair, walker], { elevator: "no" })).toBeUndefined();
    expect(setInUse([chair], {})).toBeUndefined();
    expect(sameNeeds({ elevator: "yes" }, { elevator: "yes" })).toBe(true);
    expect(sameNeeds({ elevator: "yes" }, { elevator: "no" })).toBe(false);
    expect(cleanNeeds({ elevator: "yes", "automatic-door": "maybe" } as unknown as Requirement)).toEqual({ elevator: "yes" });
  });
});

describe("words", () => {
  it("sum up a set and name the set on every button", () => {
    expect(setSummary(chair, "en")).toBe("Step-free entrance: Yes; Elevator: Yes");
    expect(setSummary(chair, "fr")).toBe("Entrée sans marche\u00A0: Oui\u202F; Ascenseur\u00A0: Oui");
    expect([setLabel("use", walker, "en"), setLabel("update", walker, "en"), setLabel("rename", walker, "fr"), setLabel("remove", walker, "fr")]).toEqual([
      "Use With the walker",
      "Put the must-haves in use into With the walker",
      "Renommer With the walker",
      "Retirer l’ensemble With the walker",
    ]);
  });

  it("say which set filters the places", () => {
    expect([setLabel("filter", walker, "en"), setLabel("filter", walker, "fr")]).toEqual(["Filter with With the walker", "Filtrer avec With the walker"]);
    expect([filteredText(walker, "en"), filteredText(walker, "fr")]).toEqual(["Places filtered with With the walker.", "Lieux filtrés avec With the walker."]);
  });

  it("pass the App's copy audit", () => {
    expect(auditCopy(setsStrings())).toEqual([]);
  });
});

describe("kept on this device", () => {
  it("saves and reads back, and clears the key when there are none", () => {
    const store = memoryStore();
    expect(saveSets(store, [chair, walker])).toBe("saved");
    expect(loadSets(store, TODAY)).toEqual([chair, walker]);
    saveSets(store, []);
    expect(store.getItem(NEED_SETS_KEY)).toBeNull();
    expect(saveSets(undefined, [chair])).toBe("unavailable");
    expect(loadSets({ getItem: () => { throw new Error("no"); }, setItem: () => undefined, removeItem: () => undefined }, TODAY)).toEqual([]);
  });

  it("drops broken, repeated and empty sets, and any past the limit", () => {
    expect(parseSets("{", TODAY)).toEqual([]);
    expect(parseSets("{}", TODAY)).toEqual([]);
    const raw = JSON.stringify([chair, { ...chair, id: "s-other" }, { ...walker, name: "with the power chair" }, { ...walker, id: "BAD" }, { ...walker, id: "s-e", needs: {} }, { ...walker, id: "s-n", name: "x".repeat(41) }, walker]);
    expect(parseSets(raw, TODAY)).toEqual([chair, walker]);
    expect(parseSet({ ...walker, savedOn: "2099-01-01" }, TODAY)?.savedOn).toBe("2026-12-01");
    expect(parseSet({ ...walker, needs: { elevator: "maybe", "automatic-door": "no" } }, TODAY)?.needs).toEqual({ "automatic-door": "no" });
    const many = Array.from({ length: MAX_SETS + 3 }, (_, i) => ({ ...walker, id: `s-${i}`, name: `Set ${i}` }));
    expect(parseSets(JSON.stringify(many), TODAY)).toHaveLength(MAX_SETS);
  });

  it("reads back every random list it saved", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = makeRng(seed);
      let sets: NeedSet[] = [];
      for (let i = 0; i < 12; i++) {
        const needs = Object.fromEntries((["step-free-entry", "accessible-washroom", "automatic-door", "elevator"] as const).filter(() => rng() < 0.5).map((k) => [k, rng() < 0.5 ? "yes" : "no"]));
        const r = addSet(sets, `Set ${Math.floor(rng() * 8)}`, needs, TODAY, `s-${seed}x${i}`);
        if (r.ok) sets = r.sets;
      }
      const store = memoryStore();
      saveSets(store, sets);
      expect(loadSets(store, TODAY), `seed ${seed}`).toEqual(sets);
      expect(sets.length, `seed ${seed}`).toBeLessThanOrEqual(MAX_SETS);
    }
  });
});
