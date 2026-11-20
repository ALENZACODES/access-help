// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { auditDom, type Locale } from "./index";
import { ASKED_COPY, markNoReply, markReplied, recordAsk, type AskRecord } from "./asked";
import { removeAskedLabel, renderAsked, renderSentBlock, type AskedContext } from "./views-asked";
import { AXE_OPTIONS } from "./shelltest";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const LIB = { id: "library-1a2b3c4d", name: "Library", address: "1 Main St" };
const CAFE = { id: "cafe-5e6f7a8b", name: "Cafe", address: undefined };
const POOL = { id: "pool-22222222", name: "Pool", address: undefined };

function list(): AskRecord[] {
  let l: AskRecord[] = [];
  for (const [p, d] of [[LIB, "2026-11-01"], [CAFE, "2026-11-10"], [POOL, "2026-10-01"]] as const) {
    const next = recordAsk(l, p, ["elevator"], "email", new Date(`${d}T12:00:00Z`));
    if (next === "full") throw new Error("full");
    l = next;
  }
  return markNoReply(markReplied(l, POOL.id, TODAY), CAFE.id, TODAY);
}

function ctx(more: Partial<AskedContext> = {}): AskedContext {
  return { list: list(), locale: "en", today: TODAY, statusMessage: undefined, knownIds: new Set([LIB.id, CAFE.id]), ...more };
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

describe("the questions sent page", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's audit, full and empty (%s)", async (l) => {
    await clean(renderAsked(ctx({ locale: l })), l);
    await clean(renderAsked(ctx({ locale: l, list: [] })), l);
  });

  it("puts waiting places first and the rest under Done", () => {
    const root = mount(renderAsked(ctx()), "en");
    expect(root.querySelector("#asked-waiting")?.textContent).toBe("Waiting for an answer (1)");
    expect(root.querySelector("#asked-closed")?.textContent).toBe("Done (2)");
    expect(Array.from(root.querySelectorAll("[data-asked]")).map((li) => `${li.getAttribute("data-asked")}:${li.getAttribute("data-state")}`)).toEqual([
      `${LIB.id}:waiting`,
      `${CAFE.id}:no-reply`,
      `${POOL.id}:replied`,
    ]);
  });

  it("offers reading the reply for a waiting place still in the notes, and asking again for a closed one", () => {
    const root = mount(renderAsked(ctx()), "en");
    const lib = root.querySelector(`[data-asked="${LIB.id}"]`);
    expect(Array.from(lib?.querySelectorAll("button") ?? []).map((b) => b.getAttribute("data-action"))).toEqual(["read-reply", "asked-replied", "asked-noreply", "asked-remove"]);
    const cafe = root.querySelector(`[data-asked="${CAFE.id}"]`);
    expect(Array.from(cafe?.querySelectorAll("button") ?? []).map((b) => b.getAttribute("data-action"))).toEqual(["open-ask", "asked-waiting", "asked-remove"]);
    // The pool is no longer in the notes: nothing that needs the place is offered.
    const pool = root.querySelector(`[data-asked="${POOL.id}"]`);
    expect(Array.from(pool?.querySelectorAll("button") ?? []).map((b) => b.getAttribute("data-action"))).toEqual(["asked-waiting", "asked-remove"]);
    expect(pool?.querySelector("[data-closed]")?.textContent).toBe("They replied, noted on 2026-11-19.");
  });

  it("names each remove button after what it removes, and ties the other buttons to the place", () => {
    const root = mount(renderAsked(ctx()), "en");
    expect(root.querySelector(`[data-asked="${LIB.id}"] [data-action="asked-remove"]`)?.textContent).toBe("Remove Library (1 Main St) from this list");
    const replied = root.querySelector<HTMLElement>(`[data-asked="${LIB.id}"] [data-action="asked-replied"]`);
    expect(root.querySelector(`#${replied?.getAttribute("aria-describedby") ?? "x"}`)?.textContent).toBe("Library");
    expect(removeAskedLabel(list()[1] as AskRecord, "fr")).toBe("Retirer Cafe de cette liste");
  });

  it("says when nothing is waiting", () => {
    const all = markReplied(list(), LIB.id, TODAY);
    expect(mount(renderAsked(ctx({ list: all, locale: "fr" })), "fr").textContent).toContain(ASKED_COPY.noneWaiting.fr);
  });
});

describe("the block on the ask page", () => {
  it.each(["en", "fr"] as const)("offers the ways of asking with none chosen, and passes the audits (%s)", async (l) => {
    const html = `<h2 id="view-title">Ask</h2>${renderSentBlock(LIB.id, undefined, false, undefined, l, TODAY)}`;
    const root = mount(html, l);
    expect(root.querySelectorAll('input[name="asked-way"]:checked')).toHaveLength(0);
    expect(root.querySelectorAll('input[name="asked-way"]')).toHaveLength(4);
    await clean(html, l);
  });

  it("shows the error on the group when no way was chosen", async () => {
    const html = `<h2 id="view-title">Ask</h2>${renderSentBlock(LIB.id, undefined, true, undefined, "en", TODAY)}`;
    const root = mount(html, "en");
    expect(root.querySelector("#asked-way")?.getAttribute("aria-describedby")).toBe("asked-way-error");
    expect(root.querySelector("#asked-way-error")?.textContent).toBe(ASKED_COPY.chooseWay.en);
    await clean(html, "en");
  });

  it("says when the place was last asked", () => {
    const current = list().find((r) => r.id === LIB.id) as AskRecord;
    const root = mount(renderSentBlock(LIB.id, "phone", false, current, "en", TODAY), "en");
    expect(root.querySelector("[data-asked-current]")?.textContent).toBe("Asked by email on 2026-11-01, 18 days ago.");
    expect(root.querySelector<HTMLInputElement>('input[value="phone"]')?.checked).toBe(true);
  });
});
