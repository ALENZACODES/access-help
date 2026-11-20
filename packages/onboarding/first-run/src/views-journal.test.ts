// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { auditDom, type Locale } from "./index";
import { ALL_KINDS, JOURNAL_KINDS, buildJournal, filterJournal } from "./journal";
import { AXE_OPTIONS } from "./shelltest";
import { makeRng, randomNotes } from "./testkit";
import { renderJournal } from "./views-journal";

const TODAY = new Date(Date.UTC(2030, 0, 1));

function mount(html: string, l: Locale): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1>${html}</main></div>`;
  return document.getElementById("r") as HTMLElement;
}

function randomList(seed: number, l: Locale): ReturnType<typeof buildJournal> {
  const rng = makeRng(seed);
  const notes = randomNotes(rng, 12);
  const bin = notes.filter(() => rng() < 0.2).map((n) => ({ note: { ...n, id: `${n.id}-r` }, removedOn: "2026-11-15" }));
  const corrections = notes.filter(() => rng() < 0.3).map((n) => ({ noteId: n.id, on: "2026-11-16", parts: ["address" as const], changes: [{ part: "address" as const, from: "", to: "1 Main St" }] }));
  return buildJournal({ notes, corrections, bin, visits: [], asked: [], sets: rng() < 0.5 ? [{ id: "s-a", name: "Set « A » ; ok!", needs: { elevator: "yes" }, savedOn: "2026-11-01" }] : [] }, l);
}

describe("random lists", () => {
  it.each(["en", "fr"] as const)("render with the App's audit clean, ids unique and every entry once (%s)", (l) => {
    for (let seed = 1; seed <= 30; seed++) {
      const entries = randomList(seed, l);
      for (const kinds of [JOURNAL_KINDS, JOURNAL_KINDS.filter((k) => k !== "note")]) {
        const filter = { ...ALL_KINDS, kinds };
        const root = mount(renderJournal({ entries, filter, locale: l, today: TODAY }), l);
        expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`), `seed ${seed}`).toEqual([]);
        const ids = Array.from(root.querySelectorAll("[id]")).map((e) => e.id);
        expect(new Set(ids).size, `seed ${seed}`).toBe(ids.length);
        expect(root.querySelectorAll(".journal-entry"), `seed ${seed}`).toHaveLength(filterJournal(entries, filter).length);
        expect(root.textContent, `seed ${seed}`).not.toMatch(/undefined|NaN/);
      }
    }
  });

  it("pass axe in both languages", async () => {
    for (const l of ["en", "fr"] as const) {
      mount(renderJournal({ entries: randomList(5, l), filter: ALL_KINDS, locale: l, today: TODAY }), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), l).toEqual([]);
    }
  });

  it("keep the person's own words marked as theirs", () => {
    const entries = buildJournal({ notes: [], corrections: [], bin: [], visits: [], asked: [], sets: [{ id: "s-a", name: "Set « A » ; ok!", needs: { elevator: "yes" }, savedOn: "2026-11-01" }] }, "fr");
    const root = mount(renderJournal({ entries, filter: ALL_KINDS, locale: "fr", today: TODAY }), "fr");
    expect(root.querySelector(".journal-entry [data-user-content]")?.textContent).toBe("Set « A » ; ok!");
    expect(auditDom(root, { locale: "fr" })).toEqual([]);
  });
});

describe("place names", () => {
  it("are marked as the person's own in headings and in the list of places, so any name passes the App's French audit", () => {
    const note = { id: "n1", placeName: "Café « Chez Lou » !", address: "1 rue X ; arrière", note: undefined, createdOn: "2026-11-01", licence: "CC0-1.0", facts: [] };
    const entries = buildJournal({ notes: [note], corrections: [], bin: [], visits: [], asked: [] }, "fr");
    const root = mount(renderJournal({ entries, filter: ALL_KINDS, locale: "fr", today: TODAY }), "fr");
    expect(root.querySelector(".journal-entry strong")?.textContent).toBe("Note ajoutée, 2026-11-01\u00A0: Café « Chez Lou » !, 1 rue X ; arrière");
    expect(root.querySelector(".journal-entry strong [data-user-content]")?.textContent).toBe("Café « Chez Lou » !, 1 rue X ; arrière");
    expect(auditDom(root, { locale: "fr" }).map((v) => v.detail)).toEqual([]);
  });
});
