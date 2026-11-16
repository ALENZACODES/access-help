// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  DEFAULT_NAME_SECTION,
  LONG_NAME_WORDS,
  NAME_SECTIONS,
  controlKind,
  distinctNames,
  isNameSection,
  kindWord,
  labelInName,
  listControls,
  matchForm,
  namesFilename,
  namesToText,
  summarise,
  visibleLabel,
  wordCount,
} from "./names";

function dom(html: string): HTMLElement {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d;
}

describe("matchForm and labelInName", () => {
  it("ignores case, punctuation, apostrophes and odd spaces", () => {
    expect(matchForm("  Add\u00A0a   Note! ")).toBe("add a note");
    expect(matchForm("Won’t save")).toBe("wont save");
    expect(matchForm("Plus de détails…")).toBe("plus de détails");
  });

  it("accepts a name that contains the visible words, and nothing written means nothing to match", () => {
    expect(labelInName("Save", "Save note")).toBe(true);
    expect(labelInName("save", "SAVE")).toBe(true);
    expect(labelInName("", "Anything")).toBe(true);
    expect(labelInName("Remove", "Close")).toBe(false);
    expect(labelInName("Retour à la liste", "Retour à la liste des guides")).toBe(true);
  });

  it("does not treat a partial word as a match across a word boundary it invented", () => {
    expect(labelInName("Add note", "Add")).toBe(false);
  });
});

describe("controlKind and visibleLabel", () => {
  it("tells links, buttons, fields and choices apart", () => {
    const d = dom('<a href="#/x">a</a><button>b</button><input id="i"><select></select><textarea></textarea><input type="checkbox"><input type="radio"><summary>s</summary>');
    expect(Array.from(d.querySelectorAll("a, button, input, select, textarea, summary")).map(controlKind)).toEqual(["link", "button", "field", "field", "field", "choice", "choice", "button"]);
  });

  it("reads a field's label from a for attribute or a wrapping label", () => {
    const d = dom('<label for="a">First</label><input id="a"><label>Second <input id="b"></label>');
    expect(visibleLabel(d.querySelector("#a") as Element)).toBe("First");
    expect(visibleLabel(d.querySelector("#b") as Element)).toBe("Second");
  });
});

describe("listControls", () => {
  it("lists controls in reading order with their kind", () => {
    const d = dom('<button>One</button><a href="#/x">Two</a><label for="f">Three</label><input id="f">');
    expect(listControls(d).map((c) => [c.name, c.kind])).toEqual([["One", "button"], ["Two", "link"], ["Three", "field"]]);
  });

  it("works on a tree that is not on the page, including labelledby and label for", () => {
    const d = dom('<span id="lbl">Named by span</span><input aria-labelledby="lbl"><label for="q">Search</label><input id="q" type="search">');
    expect(document.contains(d)).toBe(false);
    expect(listControls(d).map((c) => c.name)).toEqual(["Named by span", "Search"]);
  });

  it("leaves out hidden inputs, hidden parts and controls with no name", () => {
    const d = dom('<input type="hidden" name="x"><div hidden><button>Gone</button></div><button></button><button>Here</button>');
    expect(listControls(d).map((c) => c.name)).toEqual(["Here"]);
  });

  it("flags repeated names and says nothing about unique ones", () => {
    const d = dom("<button>Save</button><button>save</button><button>Cancel</button>");
    expect(listControls(d).map((c) => c.duplicate)).toEqual([true, true, false]);
  });

  it("does not count a field and a button with the same words as a repeat", () => {
    const d = dom('<button>Search</button><label for="s">Search</label><input id="s">');
    expect(listControls(d).every((c) => !c.duplicate)).toBe(true);
  });

  it("flags a name that drops the visible words", () => {
    const d = dom('<button aria-label="Close">Remove</button><button aria-label="Remove note">Remove</button>');
    expect(listControls(d).map((c) => c.mismatch)).toEqual([true, false]);
  });

  it("flags a long name only above the limit", () => {
    const ok = Array.from({ length: LONG_NAME_WORDS }, (_, i) => `w${i}`).join(" ");
    const d = dom(`<button>${ok}</button><button>${ok} more</button>`);
    expect(listControls(d).map((c) => c.long)).toEqual([false, true]);
  });
});

describe("summarise, distinctNames and wordCount", () => {
  it("counts each kind of problem and says when there are none", () => {
    expect(summarise([])).toEqual({ total: 0, duplicates: 0, mismatches: 0, long: 0, clean: true });
    const d = dom('<button>A</button><button>A</button><button aria-label="Z">Y</button>');
    const s = summarise(listControls(d));
    expect(s).toMatchObject({ total: 3, duplicates: 2, mismatches: 1, long: 0, clean: false });
  });

  it("keeps the first spelling of each name", () => {
    const d = dom("<button>Save</button><button>SAVE</button><button>Go</button>");
    expect(distinctNames(listControls(d))).toEqual(["Save", "Go"]);
  });

  it("counts words the way a person would", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("  one   two\u00A0three ")).toBe(3);
  });
});

describe("sections", () => {
  it("accepts exactly the four screens", () => {
    expect([...NAME_SECTIONS]).toEqual(["setup", "notes", "help", "display"]);
    for (const s of NAME_SECTIONS) expect(isNameSection(s)).toBe(true);
    for (const bad of [undefined, "", "Notes", "practice", "notes/", "places"]) expect(isNameSection(bad as string | undefined), String(bad)).toBe(false);
    expect(isNameSection(DEFAULT_NAME_SECTION)).toBe(true);
  });

  it("builds a file name from the screen and language", () => {
    expect(namesFilename("help", "en")).toBe("names-help-en.txt");
    expect(namesFilename("display", "fr")).toBe("names-display-fr.txt");
  });
});

describe("namesToText", () => {
  const list = listControls(dom('<button>Save</button><button>Save</button><a href="#/x">Home</a>'));

  it("numbers the names, gives the kind and marks repeats", () => {
    const text = namesToText("Names", list, "en", "Intro.");
    const lines = text.split("\n");
    expect(lines[0]).toBe("Names");
    expect(lines).toContain("1. Save (button): name repeated");
    expect(lines).toContain("3. Home (link)");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("uses French words and a no-break space before the colon", () => {
    const text = namesToText("Noms", list, "fr", "Intro.");
    expect(text).toContain("1. Save (bouton)\u00A0: nom répété");
    expect(text).toContain("3. Home (lien)");
    expect(text).not.toMatch(/[^\u00A0]:/);
  });

  it("has a word for every kind in both languages", () => {
    for (const k of ["button", "link", "field", "choice"] as const) {
      expect(kindWord(k, "en")).not.toBe("");
      expect(kindWord(k, "fr")).not.toBe(kindWord(k, "en"));
    }
    expect(controlKind(document.createElement("button"))).toBe("button");
  });
});
