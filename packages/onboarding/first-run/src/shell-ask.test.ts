// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, QUESTIONS, decodeTextExportHref, groupPlaces, loadNotes, placeId } from "./index";
import { ASK_COPY, parseMailto } from "./askplace";
import { STATEMENT_COPY } from "./statement-copy";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([
    testNote("a", "Library", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }]),
    testNote("b", "Library", [{ key: "step-free-entry", value: "no" }]),
  ]);
});

afterEach(() => {
  h.destroy();
});

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = h.root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

const said = async (): Promise<string> => {
  await Promise.resolve();
  return h.status();
};

function openPlace(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("open-place", LIBRARY));
}

function openAsk(locale = "en"): void {
  openPlace(locale);
  h.click(act("open-ask", LIBRARY));
}

const message = (): string => $<HTMLTextAreaElement>("#ask-text").value;

describe("asking a place in writing", () => {
  it("opens from the place page with the open details chosen", () => {
    openAsk();
    expect(h.heading()).toBe(`${ASK_COPY.title.en}: Library`);
    const checked = Array.from(h.root.querySelectorAll<HTMLInputElement>('[data-action="ask-key"]')).filter((c) => c.checked).map((c) => c.dataset["key"]);
    expect(checked).toEqual(["step-free-entry", "accessible-washroom", "automatic-door"]);
    expect(message()).toContain(QUESTIONS["step-free-entry"].en);
    expect(message()).not.toContain(QUESTIONS.elevator.en);
  });

  it("adds and removes a detail, keeping focus on the box", () => {
    openAsk();
    $<HTMLInputElement>('[data-action="ask-key"][data-key="elevator"]').click();
    expect(document.activeElement?.getAttribute("data-key")).toBe("elevator");
    expect(message()).toContain(`4. ${QUESTIONS.elevator.en}`);
    for (const k of ["step-free-entry", "accessible-washroom", "automatic-door", "elevator"]) $<HTMLInputElement>(`[data-action="ask-key"][data-key="${k}"]`).click();
    expect(h.root.querySelector("#ask-text")).toBeNull();
    expect($("[data-ask-none]").textContent).toBe(ASK_COPY.noneChosen.en);
  });

  it("writes the message in French while the App stays in English", () => {
    openAsk();
    $<HTMLInputElement>('[data-action="ask-lang"][data-value="fr"]').click();
    expect(document.activeElement?.getAttribute("data-value")).toBe("fr");
    expect($("#ask-text").getAttribute("lang")).toBe("fr");
    expect(message().startsWith("Bonjour,")).toBe(true);
    expect($("[data-ask-subject]").textContent).toBe("Questions sur l’accessibilité\u00A0: Library");
    expect(h.heading()).toBe(`${ASK_COPY.title.en}: Library`);
  });

  it("offers the person's email app, a text file and a way to select the text", () => {
    openAsk();
    const mail = parseMailto($<HTMLAnchorElement>("[data-ask-email]").getAttribute("href") ?? "");
    expect(mail?.subject).toBe("Accessibility questions about Library");
    expect(mail?.body).toBe(message());
    const file = $<HTMLAnchorElement>("a[download]");
    expect(file.getAttribute("download")).toBe(`message-${LIBRARY}-en.txt`);
    expect(decodeTextExportHref(file.getAttribute("href") ?? "")).toBe(`Subject: Accessibility questions about Library\n\n${message()}\n`);
    h.click(act("select-text", "ask-text"));
    expect(document.activeElement?.id).toBe("ask-text");
  });

  it("has its own address and goes back to the place", () => {
    window.location.hash = `#/places/${LIBRARY}/ask`;
    h.mount("fr", true);
    expect(h.heading()).toBe(`${ASK_COPY.title.fr}\u00A0: Library`);
    h.click(act("open-place", LIBRARY));
    expect(window.location.hash).toBe(`#/places/${LIBRARY}`);
  });

  it("says when the place is not in the notes", () => {
    window.location.hash = "#/places/nowhere-00000000/ask";
    h.mount("en", true);
    expect(h.text()).toContain("not");
    expect(h.root.querySelector("#ask-text")).toBeNull();
  });
});

describe("reading the reply", () => {
  it("opens the reader for the place's reply, with the place filled in and no web address field", () => {
    openAsk();
    h.click(act("read-reply", LIBRARY));
    expect(h.heading()).toBe(STATEMENT_COPY.replyTitle.en);
    expect(document.activeElement).toBe(h.root.querySelector("h2"));
    expect($<HTMLInputElement>("#st-name").value).toBe("Library");
    expect($<HTMLInputElement>("#st-address").value).toBe("1 Main St");
    expect(h.root.querySelector("#st-url")).toBeNull();
    expect(window.location.hash).toBe("");
  });

  it("saves a note that says it came from the reply, and the places list sees it at once", async () => {
    openAsk();
    h.click(act("read-reply", LIBRARY));
    $<HTMLTextAreaElement>("#st-text").value = "Yes, our washroom on the main floor is accessible. Our automatic door is out of order this week.";
    h.click(act("statement-read"));
    expect(await said()).toBe("Found sentences for 2 of 4 details.");
    expect($('[data-finding="accessible-washroom"] [data-notes-say]').textContent).toBe("In your notes: Unknown, no record");
    $<HTMLInputElement>('input[name="answer-accessible-washroom"][value="yes"]').checked = true;
    $<HTMLSelectElement>("#st-licence").value = "CC0-1.0";
    h.click(act("statement-save"));
    expect(await said()).toBe("Saved a note for Library.");
    const newest = loadNotes(h.store).notes[0];
    expect(newest?.note).toBe("Read from the place’s written reply.");
    expect(newest?.facts.find((f) => f.key === "accessible-washroom")?.provenance?.source).toBe(CONTRIBUTOR_SOURCE);
    // Back to the place, which now shows the reply's answer.
    h.click(act("open-place", LIBRARY));
    expect(h.heading()).toBe("Library");
    const place = groupPlaces(loadNotes(h.store).notes, "en").find((p) => p.id === LIBRARY);
    expect(place?.resolutions["accessible-washroom"].kind).toBe("agree");
    expect(h.root.querySelector('[data-resolution="accessible-washroom"]')?.textContent ?? h.text()).toContain("Yes");
  });
});

describe("reading a page from the shell", () => {
  it("opens from the add-a-note form and from a place, and has its own address", () => {
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("add-note"));
    h.click(act("open-statement"));
    expect(h.heading()).toBe(STATEMENT_COPY.title.en);
    expect($<HTMLInputElement>("#st-name").value).toBe("");
    expect(h.root.querySelector("nav [aria-current]")?.getAttribute("data-value")).toBe("notes");
    // Opened on its own, the way back is to the notes.
    h.click(`main ${act("view", "notes")}`);
    expect(h.heading()).toBe("My notes");

    h.click(act("view", "places"));
    h.click(act("open-place", LIBRARY));
    h.click(act("read-page", LIBRARY));
    expect(h.heading()).toBe(STATEMENT_COPY.title.en);
    expect($<HTMLInputElement>("#st-name").value).toBe("Library");
    expect(h.root.querySelector("#st-url")).not.toBeNull();
  });

  it("opens by its address", () => {
    window.location.hash = "#/notes/read-page";
    h.mount("fr", true);
    expect(h.heading()).toBe(STATEMENT_COPY.title.fr);
  });

  it("keeps one live region on the page and takes the reader away when leaving", () => {
    openPlace();
    h.click(act("read-page", LIBRARY));
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(1);
    h.click(act("view", "help"));
    expect(h.root.querySelector(".statement-app")).toBeNull();
    // Its click handler went with it: a stray reader action does nothing.
    expect(() => h.root.dispatchEvent(new Event("click", { bubbles: true }))).not.toThrow();
  });
});

describe("accessibility", () => {
  it.each(["en", "fr"] as const)("the ask and reply screens pass axe and the App's audit (%s)", async (l) => {
    openAsk(l);
    for (const step of [
      () => undefined,
      () => $<HTMLInputElement>('[data-action="ask-lang"][data-value="en"]').click(),
      () => h.click(act("read-reply", LIBRARY)),
      () => {
        $<HTMLTextAreaElement>("#st-text").value = "There is no elevator.";
        h.click(act("statement-read"));
      },
    ]) {
      step();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
    expect(h.auditLines()).toEqual([]);
  });
});
