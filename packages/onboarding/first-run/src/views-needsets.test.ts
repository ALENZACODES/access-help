// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { auditDom, type Locale } from "./index";
import { MAX_SETS, type NeedSet } from "./needsets";
import { AXE_OPTIONS } from "./shelltest";
import { renderNeedSets, type NeedSetsContext } from "./views-needsets";

const sets: NeedSet[] = Array.from({ length: MAX_SETS }, (_, i) => ({ id: `s-${i}`, name: `Set « ${i} » ; ok!`, needs: i % 2 === 0 ? { elevator: "yes" } : { "step-free-entry": "yes", "automatic-door": "no" }, savedOn: "2026-11-01" }));

function mount(html: string, l: Locale): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1><h2>Must-haves</h2>${html}</main></div>`;
  return document.getElementById("r") as HTMLElement;
}

const ctx = (more: Partial<NeedSetsContext> = {}): NeedSetsContext => ({ sets, needs: { elevator: "yes" }, locale: "en", pendingRemove: undefined, renaming: undefined, errors: [], draft: "", ...more });

describe("the sets section", () => {
  it.each(["en", "fr"] as const)("passes the App's audit and axe with every set, a rename, a removal and a problem (%s)", async (l) => {
    for (const c of [ctx({ locale: l }), ctx({ locale: l, renaming: "s-1", errors: ["taken"], draft: "Set « 2 » ; ok!" }), ctx({ locale: l, pendingRemove: "s-3", errors: ["required"] })]) {
      const root = mount(renderNeedSets(c), l);
      expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
      const ids = Array.from(root.querySelectorAll("[id]")).map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
  });

  it("marks the set in use, which offers neither Use nor Put", () => {
    const root = mount(renderNeedSets(ctx()), "en");
    const inUse = Array.from(root.querySelectorAll(".need-sets li")).filter((li) => li.querySelector("[data-in-use]"));
    expect(inUse).toHaveLength(1);
    expect(inUse[0]?.querySelector('[data-action="set-use"], [data-action="set-update"]')).toBeNull();
    expect(root.querySelectorAll('[data-action="set-use"]')).toHaveLength(MAX_SETS - 1);
  });

  it("gives every button a name no other button has", () => {
    const root = mount(renderNeedSets(ctx()), "fr");
    const names = Array.from(root.querySelectorAll("button")).map((b) => b.textContent);
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps a typed name when it has a problem, on the right form", () => {
    const adding = mount(renderNeedSets(ctx({ errors: ["too-long"], draft: "x".repeat(41) })), "en");
    expect(adding.querySelector<HTMLInputElement>("#set-name")?.value).toHaveLength(41);
    expect(adding.querySelector("#set-name")?.getAttribute("aria-invalid")).toBe("true");
    const renaming = mount(renderNeedSets(ctx({ renaming: "s-0", errors: ["too-long"], draft: "y" })), "en");
    expect(renaming.querySelector("#set-name")?.getAttribute("aria-invalid")).toBeNull();
    expect(renaming.querySelector<HTMLInputElement>("#set-rename")?.value).toBe("y");
  });
});

describe("buttons that hold a typed name", () => {
  it("mark that name as the person's own and keep the visible name exactly", async () => {
    const { namedButton } = await import("./html");
    const html = namedButton("Use Set « A » ; ok!", "Set « A » ; ok!", { "data-action": "x" });
    const root = mount(`<p>${html}</p>`, "fr");
    const b = root.querySelector("button");
    expect(b?.textContent).toBe("Use Set « A » ; ok!");
    expect(b?.querySelector("[data-user-content]")?.textContent).toBe("Set « A » ; ok!");
    expect(namedButton("Use <x>", "", { "data-action": "x" })).toContain(">Use &lt;x&gt;</button>");
    expect(namedButton("Use A", "B", { "data-action": "x" })).not.toContain("data-user-content");
    // The name is found where it ends the label, even when the same words come earlier.
    const twice = mount(`<p>${namedButton("Use Use", "Use", { "data-action": "x" })}</p>`, "en");
    expect(twice.querySelector("button")?.innerHTML).toBe('Use <span data-user-content="">Use</span>');
  });
});
