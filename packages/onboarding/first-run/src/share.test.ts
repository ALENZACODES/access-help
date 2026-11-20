// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, placeId, auditCopy, auditDom, importNotes, loadNotes, type Locale, type Note } from "./index";
import { SHARE_COPY, filterNotes, hasOtherSources, shortlistNoteIds, pick, pickLabel, pickedText, placesCount, shareFilename, shareStrings, shareText, sharedNotes } from "./share";
import { renderShare, type ShareContext } from "./views-share";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const mine = (id: string, name: string, address: string | null, text?: string): Note => ({
  ...testNote(id, name, [{ key: "elevator", value: "yes", source: CONTRIBUTOR_SOURCE }], address),
  ...(text ? { note: text } : {}),
});
const NOTES = (): Note[] => [
  mine("a", "Library", "1 Main St", "My cousin works here"),
  mine("b", "Café Bleu", "5 King St"),
  mine("c", "Library", "1 Main St"),
  testNote("d", "Arena", [{ key: "elevator", value: "no" }], "9 Bay St"),
];

describe("picking", () => {
  it("filters by place or address, ignoring case and accents", () => {
    expect(filterNotes(NOTES(), "cafe").map((n) => n.id)).toEqual(["b"]);
    expect(filterNotes(NOTES(), "MAIN").map((n) => n.id)).toEqual(["a", "c"]);
    expect(filterNotes(NOTES(), "  ").map((n) => n.id)).toEqual(["a", "b", "c", "d"]);
    expect(filterNotes(NOTES(), "zzz")).toEqual([]);
  });

  it("adds and removes picks, in the notes' order, each once", () => {
    expect(pick([], ["c", "a", "a"], true, NOTES())).toEqual(["a", "c"]);
    expect(pick(["a", "c"], ["a"], false, NOTES())).toEqual(["c"]);
    expect(pick(["a"], ["gone"], true, NOTES())).toEqual(["a"]);
  });

  it("counts places, not notes", () => {
    expect(placesCount(NOTES(), ["a", "c"])).toBe(1);
    expect(placesCount(NOTES(), ["a", "b", "d"])).toBe(3);
    expect(pickedText(2, 1, "en")).toBe("2 notes picked, about 1 place");
    expect(pickedText(1, 1, "fr")).toBe("1 note choisie, sur 1 lieu");
    expect(pickedText(3, 2, "fr")).toBe("3 notes choisies, sur 2 lieux");
  });

  it("names each note so two notes on one place are told apart", () => {
    expect(pickLabel(NOTES()[0] as Note, "en")).toBe("Library, 1 Main St (added 2026-10-01)");
    expect(pickLabel(mine("x", "Kiosk", null), "fr")).toBe("Kiosk (ajoutée le 2026-10-01)");
  });
});

describe("the shared file", () => {
  it("holds only the picked notes, leaving out the extra text unless asked", () => {
    const without = sharedNotes(NOTES(), ["a", "b"], false);
    expect(without.map((n) => n.id)).toEqual(["a", "b"]);
    expect(without[0]?.note).toBeUndefined();
    expect("note" in (without[0] as object)).toBe(false);
    expect(sharedNotes(NOTES(), ["a"], true)[0]?.note).toBe("My cousin works here");
  });

  it("is the App's own notes format, which the usual notes import reads back with every source", () => {
    const text = shareText(NOTES(), ["a", "d"], false, TODAY);
    const r = importNotes(text);
    expect(r.error).toBeUndefined();
    expect(r.notes).toEqual(sharedNotes(NOTES(), ["a", "d"], false));
    expect(r.notes[1]?.facts.find((f) => f.key === "elevator")?.provenance?.source).toBe("City survey");
    expect(text).not.toContain("My cousin");
  });

  it("says when notes from other sources are in it", () => {
    expect(hasOtherSources(sharedNotes(NOTES(), ["a", "b"], false))).toBe(false);
    expect(hasOtherSources(sharedNotes(NOTES(), ["a", "d"], false))).toBe(true);
  });

  it("is named for the day and how many notes", () => {
    expect(shareFilename(TODAY, 3)).toBe("shared-notes-2026-11-20-3.json");
  });

  it("passes the App's copy audit", () => {
    expect(auditCopy(shareStrings())).toEqual([]);
  });
});

describe("the screen", () => {
  function ctx(more: Partial<ShareContext> = {}): ShareContext {
    return { notes: NOTES(), query: "", picked: [], withText: false, locale: "en", today: TODAY, statusMessage: undefined, ...more };
  }

  function mount(html: string, l: Locale): HTMLElement {
    document.documentElement.lang = l;
    document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1>${html}</main></div>`;
    return document.getElementById("r") as HTMLElement;
  }

  it.each(["en", "fr"] as const)("passes axe and the App's audit: nothing picked, some picked, nothing shown (%s)", async (l) => {
    for (const c of [ctx({ locale: l }), ctx({ locale: l, picked: ["a", "d"], withText: true }), ctx({ locale: l, query: "zzz" })]) {
      const root = mount(renderShare(c), l);
      expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
  });

  it("offers the file only once something is picked, and warns about other sources", () => {
    const none = mount(renderShare(ctx()), "en");
    expect(none.querySelector("[data-share-download]")).toBeNull();
    expect(none.querySelector("[data-share-none]")?.textContent).toBe(SHARE_COPY.pickFirst.en);
    const some = mount(renderShare(ctx({ picked: ["a", "d"] })), "en");
    expect(some.querySelector("[data-share-count]")?.textContent).toBe("2 notes picked, about 2 places");
    expect(some.querySelector("[data-share-others]")?.textContent).toBe(SHARE_COPY.fromOthers.en);
    expect(some.querySelector("[data-share-download]")?.getAttribute("download")).toBe("shared-notes-2026-11-20-2.json");
  });
});

describe("the shortlist", () => {
  it("picks the notes about shortlisted places, in the notes' order", () => {
    const lib = placeId({ placeName: "Library", address: "1 Main St" });
    expect(shortlistNoteIds(NOTES(), [lib])).toEqual(["a", "c"]);
    expect(shortlistNoteIds(NOTES(), ["nowhere-00000000"])).toEqual([]);
    expect(shortlistNoteIds(NOTES(), [])).toEqual([]);
  });

  it("is offered only when the shortlist has notes, and picks them in the App", () => {
    const lib = placeId({ placeName: "Library", address: "1 Main St" });
    document.body.innerHTML = renderShare({ notes: NOTES(), query: "", picked: [], withText: false, locale: "en", today: TODAY, statusMessage: undefined, shortlist: [] });
    expect(document.querySelector('[data-action="share-shortlist"]')).toBeNull();
    const h = createHarness(TODAY);
    h.seed(NOTES());
    h.store.setItem("app.onboarding.shortlist.v1", JSON.stringify([lib]));
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "share"));
    h.click(act("share-shortlist"));
    expect(document.activeElement?.getAttribute("data-action")).toBe("share-shortlist");
    expect(Array.from(h.root.querySelectorAll<HTMLInputElement>('[data-action="share-pick"]:checked')).map((c) => c.dataset["value"])).toEqual(["a", "c"]);
    expect(h.root.querySelector('[data-action="share-shortlist"]')?.textContent).toBe(SHARE_COPY.shortlist.en);
    h.destroy();
  });
});

describe("in the App", () => {
  let h: Harness;
  beforeEach(() => {
    h = createHarness(TODAY);
    h.seed(NOTES());
  });
  afterEach(() => {
    h.destroy();
  });

  const fileText = (): string => {
    const href = h.root.querySelector("[data-share-download]")?.getAttribute("href") ?? "";
    return decodeURIComponent(href.slice("data:application/json;charset=utf-8,".length));
  };

  function open(): void {
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "share"));
  }

  it("opens from My notes and picks one note, keeping focus on its box", () => {
    open();
    expect(h.heading()).toBe(SHARE_COPY.title.en);
    h.root.querySelector<HTMLInputElement>('[data-action="share-pick"][data-value="b"]')?.click();
    expect(document.activeElement?.getAttribute("data-value")).toBe("b");
    expect(importNotes(fileText()).notes.map((n) => n.id)).toEqual(["b"]);
  });

  it("filters, then picks all shown, then none", () => {
    open();
    (h.root.querySelector("#share-q") as HTMLInputElement).value = "main";
    h.root.querySelector<HTMLButtonElement>('[data-action="share-filter"]')?.click();
    expect(document.activeElement?.id).toBe("share-pick");
    h.click(act("share-all"));
    expect(importNotes(fileText()).notes.map((n) => n.id)).toEqual(["a", "c"]);
    h.click(act("share-none"));
    expect(h.root.querySelector("[data-share-download]")).toBeNull();
  });

  it("includes the extra text only when asked", () => {
    open();
    h.root.querySelector<HTMLInputElement>('[data-action="share-pick"][data-value="a"]')?.click();
    expect(fileText()).not.toContain("My cousin");
    h.root.querySelector<HTMLInputElement>('[data-action="share-text"]')?.click();
    expect(fileText()).toContain("My cousin works here");
  });

  it("has its own address, forgets picks when leaving, and changes no notes", () => {
    window.location.hash = "#/notes/share";
    h.mount("fr", true);
    expect(h.heading()).toBe(SHARE_COPY.title.fr);
    h.root.querySelector<HTMLInputElement>('[data-action="share-pick"][data-value="a"]')?.click();
    h.click(act("view", "notes"));
    h.click(act("view", "share"));
    expect(h.root.querySelectorAll('[data-action="share-pick"]:checked')).toHaveLength(0);
    expect(loadNotes(h.store).notes).toHaveLength(4);
    expect(h.auditLines()).toEqual([]);
  });

  it("is not offered when there are no notes", () => {
    h.destroy();
    h = createHarness(TODAY);
    h.mount("en");
    h.click(act("view", "notes"));
    expect(h.root.querySelector('[data-action="view"][data-value="share"]')).toBeNull();
  });
});

describe("in French", () => {
  it("counts, names and warns with French copy and typography", () => {
    document.documentElement.lang = "fr";
    document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Passer</a><main id="main" lang="fr"><h1>L’App</h1>${renderShare({
      notes: NOTES(),
      query: "",
      picked: ["a", "c", "d"],
      withText: false,
      locale: "fr",
      today: TODAY,
      statusMessage: undefined,
    })}</main></div>`;
    const root = document.getElementById("r") as HTMLElement;
    expect(root.querySelector("[data-share-count]")?.textContent).toBe("3 notes choisies, sur 2 lieux");
    expect(root.querySelector("[data-share-others]")?.textContent).toBe(SHARE_COPY.fromOthers.fr);
    expect(root.querySelector('[data-action="share-pick"][data-value="a"]')?.closest("label")?.textContent).toBe("Library, 1 Main St (ajoutée le 2026-10-01)");
    expect(SHARE_COPY.intro.fr).toContain("\u202F;");
    expect(auditDom(root, { locale: "fr" }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });
});

describe("picking with a filter", () => {
  it("unpicks only the notes shown, and keeps picks made before filtering", () => {
    const h = createHarness(TODAY);
    h.seed(NOTES());
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "share"));
    h.root.querySelector<HTMLInputElement>('[data-action="share-pick"][data-value="d"]')?.click();
    (h.root.querySelector("#share-q") as HTMLInputElement).value = "library";
    h.root.querySelector<HTMLButtonElement>('[data-action="share-filter"]')?.click();
    h.click(act("share-all"));
    h.click(act("share-none"));
    // Arena is not shown, so "unpick all" leaves it picked.
    const href = h.root.querySelector("[data-share-download]")?.getAttribute("href") ?? "";
    expect(importNotes(decodeURIComponent(href.slice(href.indexOf(",") + 1))).notes.map((n) => n.id)).toEqual(["d"]);
    expect(h.root.querySelector("[data-share-count]")?.textContent).toBe("1 note picked, about 1 place");
    h.destroy();
  });
});
