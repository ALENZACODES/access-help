// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { placeId } from "./index";
import { ASKED_COPY, ASKED_KEY, loadAsked } from "./asked";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([testNote("a", "Library", [{ key: "elevator", value: "yes" }])]);
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

function openAsk(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("open-place", LIBRARY));
  h.click(act("open-ask", LIBRARY));
}

function sendBy(way: string): void {
  $<HTMLInputElement>(`[data-action="asked-way"][data-value="${way}"]`).click();
  h.click(act("asked-add", LIBRARY));
}

describe("noting that a place was asked", () => {
  it("asks how the question went out before adding it, with focus on the choices", async () => {
    openAsk();
    h.click(act("asked-add", LIBRARY));
    expect(document.activeElement?.getAttribute("data-action")).toBe("asked-way");
    expect($("#asked-way-error").textContent).toBe(ASKED_COPY.chooseWay.en);
    expect(await said()).toBe(ASKED_COPY.chooseWay.en);
    expect(loadAsked(h.store)).toEqual([]);
  });

  it("adds the place with the details being asked, and says so", async () => {
    openAsk();
    sendBy("email");
    expect(await said()).toBe("Added to your questions sent: Library");
    expect(document.activeElement?.getAttribute("data-action")).toBe("asked-add");
    const [r] = loadAsked(h.store);
    expect(r).toMatchObject({ id: LIBRARY, way: "email", askedOn: "2026-11-19", state: "waiting", keys: ["step-free-entry", "accessible-washroom", "automatic-door"] });
    expect($("[data-asked-current]").textContent).toBe("Asked by email on 2026-11-19, today.");
  });

  it("shows the count on My notes and lists the place", () => {
    openAsk();
    sendBy("phone");
    h.click(act("view", "notes"));
    expect($('[data-action="view"][data-value="asked"]').textContent).toBe("Questions you sent (1 waiting for an answer)");
    h.click(act("view", "asked"));
    expect(h.heading()).toBe(ASKED_COPY.title.en);
    expect($(`[data-asked="${LIBRARY}"]`).getAttribute("data-state")).toBe("waiting");
  });
});

describe("the list", () => {
  function list(): void {
    openAsk();
    sendBy("email");
    h.click(act("view", "asked"));
  }

  it("marks replied and no reply, and back to waiting, keeping it on the device", async () => {
    list();
    h.click(act("asked-replied", LIBRARY));
    expect(await said()).toBe("Marked as replied: Library");
    expect(document.activeElement?.id).toBe("asked-waiting");
    expect(loadAsked(h.store)[0]).toMatchObject({ state: "replied", closedOn: "2026-11-19" });
    h.click(act("asked-waiting", LIBRARY));
    expect(loadAsked(h.store)[0]?.state).toBe("waiting");
    h.click(act("asked-noreply", LIBRARY));
    expect($(`[data-asked="${LIBRARY}"]`).getAttribute("data-state")).toBe("no-reply");
  });

  it("removes a place, and the device keeps nothing once the list is empty", async () => {
    list();
    h.click(act("asked-remove", LIBRARY));
    expect(await said()).toBe("Removed from your questions sent: Library");
    expect(h.store.getItem(ASKED_KEY)).toBeNull();
    expect(h.text()).toContain(ASKED_COPY.none.en);
  });

  it("marks the place replied when a note is saved from its reply", async () => {
    list();
    h.click(act("read-reply", LIBRARY));
    $<HTMLTextAreaElement>("#st-text").value = "We have an accessible washroom.";
    h.click(act("statement-read"));
    $<HTMLInputElement>('input[name="answer-accessible-washroom"][value="yes"]').checked = true;
    $<HTMLSelectElement>("#st-licence").value = "CC0-1.0";
    h.click(act("statement-save"));
    expect(await said()).toBe("Saved a note for Library.");
    expect(loadAsked(h.store)[0]).toMatchObject({ state: "replied", closedOn: "2026-11-19" });
  });

  it("does not mark replied when a note is saved from the place's page", () => {
    list();
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("open-place", LIBRARY));
    h.click(act("read-page", LIBRARY));
    $<HTMLTextAreaElement>("#st-text").value = "We have an accessible washroom.";
    h.click(act("statement-read"));
    $<HTMLInputElement>('input[name="answer-accessible-washroom"][value="yes"]').checked = true;
    $<HTMLSelectElement>("#st-licence").value = "CC0-1.0";
    h.click(act("statement-save"));
    expect(loadAsked(h.store)[0]?.state).toBe("waiting");
  });

  it("asks again from a closed place, starting with the same way", () => {
    list();
    h.click(act("asked-noreply", LIBRARY));
    h.click(act("open-ask", LIBRARY));
    expect($<HTMLInputElement>('[data-action="asked-way"][data-value="email"]').checked).toBe(true);
    h.click(act("asked-add", LIBRARY));
    expect(loadAsked(h.store)[0]?.state).toBe("waiting");
  });

  it("has its own address and shows on the device page, where it can be cleared", () => {
    openAsk();
    sendBy("other");
    window.location.hash = "#/notes/asked";
    h.mount("fr", true);
    expect(h.heading()).toBe(ASKED_COPY.title.fr);
    h.click(act("view", "help"));
    h.click(act("open-device"));
    expect($("#item-asked").textContent).toBe(ASKED_COPY.deviceTitle.fr);
    h.click(act("device-clear", "asked"));
    h.click(act("device-confirm", "asked"));
    expect(h.store.getItem(ASKED_KEY)).toBeNull();
    h.click(act("view", "notes"));
    expect($('[data-action="view"][data-value="asked"]').textContent).toBe("Questions envoyées (0 en attente de réponse)");
  });
});

describe("accessibility", () => {
  it.each(["en", "fr"] as const)("the ask page and the list pass axe and the App's audit (%s)", async (l) => {
    openAsk(l);
    for (const step of [
      () => h.click(act("asked-add", LIBRARY)),
      () => sendBy("email"),
      () => h.click(act("view", "asked")),
      () => h.click(act("asked-noreply", LIBRARY)),
    ]) {
      step();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
    expect(h.auditLines()).toEqual([]);
  });
});
