// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NEEDS_KEY } from "./needs";
import { NEED_SETS_KEY, SETS_COPY, SET_NAME_ERRORS, loadSets } from "./needsets";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const CHAIR = { id: "s-chair", name: "With the power chair", needs: { "step-free-entry": "yes", elevator: "yes" }, savedOn: "2026-11-01" };
const WALKER = { id: "s-walker", name: "With the walker", needs: { elevator: "yes" }, savedOn: "2026-11-02" };
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([testNote("a", "Library", [{ key: "elevator", value: "yes" }])]);
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
  h.click(act("view", "musthaves"));
}

function choose(key: string, value: string): void {
  const radio = $<HTMLInputElement>(`input[name="need-${key}"][value="${value}"]`);
  radio.checked = true;
  radio.dispatchEvent(new Event("change", { bubbles: true }));
}

function submit(id: string): void {
  $<HTMLFormElement>(id).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

describe("saved sets of must-haves", () => {
  it("shows none at first, and asks for must-haves before saving a set", async () => {
    open();
    expect(h.text()).toContain(SETS_COPY.none.en);
    $<HTMLInputElement>("#set-name").value = "Walker";
    submit("#set-new-form");
    expect($("#e-set-name").textContent).toBe(SET_NAME_ERRORS["empty-needs"].en);
    expect(document.activeElement?.id).toBe("set-name");
    expect($<HTMLInputElement>("#set-name").value).toBe("Walker");
    expect(await said()).toBe(SET_NAME_ERRORS["empty-needs"].en);
  });

  it("saves the must-haves in use as a named set, marked as in use", async () => {
    open();
    choose("elevator", "yes");
    $<HTMLInputElement>("#set-name").value = "With the walker";
    submit("#set-new-form");
    expect(await said()).toBe(SETS_COPY.saved.en);
    expect(loadSets(h.store, TODAY).map((s) => [s.name, s.needs])).toEqual([["With the walker", { elevator: "yes" }]]);
    expect($(".need-sets li [data-in-use]").textContent).toBe(SETS_COPY.inUse.en);
    expect($<HTMLInputElement>("#set-name").value).toBe("");
  });

  it("switches the must-haves in use to another set, and back", async () => {
    h.store.setItem(NEED_SETS_KEY, JSON.stringify([CHAIR, WALKER]));
    h.store.setItem(NEEDS_KEY, JSON.stringify(WALKER.needs));
    open();
    expect(h.root.querySelector(act("set-use", "s-walker"))).toBeNull();
    h.click(act("set-use", "s-chair"));
    expect(await said()).toBe(SETS_COPY.used.en);
    expect(JSON.parse(h.store.getItem(NEEDS_KEY) ?? "{}")).toEqual(CHAIR.needs);
    expect($<HTMLInputElement>('input[name="need-step-free-entry"][value="yes"]').checked).toBe(true);
    h.click(act("set-use", "s-walker"));
    expect(JSON.parse(h.store.getItem(NEEDS_KEY) ?? "{}")).toEqual(WALKER.needs);
  });

  it("puts the must-haves in use into a set", async () => {
    h.store.setItem(NEED_SETS_KEY, JSON.stringify([WALKER]));
    open();
    choose("automatic-door", "yes");
    h.click(act("set-update", "s-walker"));
    expect(await said()).toBe(SETS_COPY.updated.en);
    expect(loadSets(h.store, TODAY)[0]?.needs).toEqual({ "automatic-door": "yes" });
  });

  it("renames a set, refusing a name another set has, and can keep the old name", async () => {
    h.store.setItem(NEED_SETS_KEY, JSON.stringify([CHAIR, WALKER]));
    open();
    h.click(act("set-rename", "s-walker"));
    expect(document.activeElement?.id).toBe("set-rename");
    $<HTMLInputElement>("#set-rename").value = "with the power chair";
    submit("#set-rename-form");
    expect($("#e-set-rename").textContent).toBe(SET_NAME_ERRORS.taken.en);
    expect($("#set-rename").getAttribute("aria-invalid")).toBe("true");
    $<HTMLInputElement>("#set-rename").value = "Rollator";
    submit("#set-rename-form");
    expect(await said()).toBe(SETS_COPY.renamed.en);
    expect(loadSets(h.store, TODAY).map((s) => s.name)).toEqual(["With the power chair", "Rollator"]);
    expect(document.activeElement?.textContent).toBe("Rename Rollator");
    h.click(act("set-rename", "s-walker"));
    h.click(act("set-rename-cancel", "s-walker"));
    expect(h.root.querySelector("#set-rename")).toBeNull();
  });

  it("asks before removing a set, names it, and leaves the must-haves in use", async () => {
    h.store.setItem(NEED_SETS_KEY, JSON.stringify([CHAIR]));
    h.store.setItem(NEEDS_KEY, JSON.stringify(CHAIR.needs));
    open();
    expect(document.querySelector(act("set-remove", "s-chair"))?.textContent).toBe("Remove the set With the power chair");
    h.click(act("set-remove", "s-chair"));
    expect(document.activeElement?.getAttribute("data-action")).toBe("set-remove-confirm");
    h.click(act("set-remove-cancel", "s-chair"));
    expect(document.activeElement?.getAttribute("data-action")).toBe("set-remove");
    h.click(act("set-remove", "s-chair"));
    h.click(act("set-remove-confirm", "s-chair"));
    expect(await said()).toBe(SETS_COPY.removed.en);
    expect(h.store.getItem(NEED_SETS_KEY)).toBeNull();
    expect(JSON.parse(h.store.getItem(NEEDS_KEY) ?? "{}")).toEqual(CHAIR.needs);
  });

  it("offers each set as a filter on Places, which also makes it the must-haves in use", async () => {
    h.seed([testNote("b", "Pool", [{ key: "elevator", value: "no" }], "2 Side Rd")]);
    h.store.setItem(NEED_SETS_KEY, JSON.stringify([CHAIR, WALKER]));
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    expect(Array.from(h.root.querySelectorAll('[data-action="set-filter"]')).map((b) => b.textContent)).toEqual(["Filter with With the power chair", "Filter with With the walker"]);
    h.click(act("set-filter", "s-walker"));
    expect(await said()).toBe("Places filtered with With the walker.");
    expect(document.activeElement?.getAttribute("data-value")).toBe("s-walker");
    expect(JSON.parse(h.store.getItem(NEEDS_KEY) ?? "{}")).toEqual(WALKER.needs);
    // Places are grouped by the filter: the Library meets it, the Pool does not.
    const groupOf = (name: string): string | null | undefined => {
      const card = Array.from(h.root.querySelectorAll("article.card")).find((c) => c.querySelector("h4")?.textContent === name);
      let el = card?.previousElementSibling;
      while (el && el.tagName !== "H3") el = el.previousElementSibling;
      return el?.textContent;
    };
    expect(groupOf("Library")).toMatch(/^Matches/);
    expect(groupOf("Pool")).not.toMatch(/^Matches/);
  });

  it("is listed on the device page and can be cleared there", () => {
    h.store.setItem(NEED_SETS_KEY, JSON.stringify([CHAIR]));
    h.mount("en");
    h.click(act("view", "help"));
    h.click(act("open-device"));
    expect($("#item-need-sets").textContent).toBe(SETS_COPY.title.en);
    h.click(act("device-clear", "need-sets"));
    h.click(act("device-confirm", "need-sets"));
    expect(h.store.getItem(NEED_SETS_KEY)).toBeNull();
  });

  it.each(["en", "fr"] as const)("passes axe and the App's audit with sets, a rename and a problem (%s)", async (l) => {
    h.store.setItem(NEED_SETS_KEY, JSON.stringify([CHAIR, WALKER]));
    h.store.setItem(NEEDS_KEY, JSON.stringify(WALKER.needs));
    open(l);
    for (const step of [
      () => undefined,
      () => h.click(act("set-rename", "s-chair")),
      () => {
        $<HTMLInputElement>("#set-rename").value = "";
        submit("#set-rename-form");
      },
      () => {
        h.click(act("set-rename-cancel", "s-chair"));
        h.click(act("set-remove", "s-chair"));
      },
    ]) {
      step();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      expect(h.auditLines()).toEqual([]);
    }
  });
});
