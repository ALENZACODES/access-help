import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_TERMS,
  MIN_TOUCH_TARGET_PX,
  ONBOARDING_PATHS,
  PATHS_META,
  allStrings,
  frenchTypographyIssues,
  getPath,
  localizePath,
} from "./paths";

describe("onboarding paths", () => {
  it("are short (2-4 steps) with unique ids", () => {
    const ids = ONBOARDING_PATHS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of ONBOARDING_PATHS) {
      expect(p.steps.length).toBeGreaterThanOrEqual(2);
      expect(p.steps.length).toBeLessThanOrEqual(4);
      const stepIds = p.steps.map((s) => s.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
    }
  });

  it("have non-empty EN and FR for every string", () => {
    for (const p of ONBOARDING_PATHS) {
      for (const [label, l] of allStrings(p)) {
        expect(l.en.trim(), `${label} en`).not.toBe("");
        expect(l.fr.trim(), `${label} fr`).not.toBe("");
        expect(l.fr, `${label} differs`).not.toBe(l.en);
      }
    }
  });

  it("French strings follow typography rules", () => {
    for (const p of ONBOARDING_PATHS) {
      for (const [label, l] of allStrings(p)) {
        expect(frenchTypographyIssues(l.fr), label).toEqual([]);
      }
    }
  });

  it("contain no forbidden terms in either language", () => {
    for (const p of ONBOARDING_PATHS) {
      for (const [label, l] of allStrings(p)) {
        for (const re of FORBIDDEN_TERMS) {
          expect(re.test(l.en), `${label} en ${re}`).toBe(false);
          expect(re.test(l.fr), `${label} fr ${re}`).toBe(false);
        }
      }
    }
  });

  it("keeps the unknown-stays-unknown step in both languages", () => {
    const step = getPath("find-a-place")?.steps.find(
      (s) => s.id === "unknown-means-unknown",
    );
    expect(step).toBeDefined();
    expect(step?.body.en).toMatch(/Do not assume it is accessible/);
    expect(step?.body.fr).toMatch(/Ne présumez pas/);
  });

  it("localizes a path", () => {
    const p = getPath("get-help");
    expect(p).toBeDefined();
    if (!p) return;
    expect(localizePath(p, "en").title).toBe("Get help");
    expect(localizePath(p, "fr").title).toBe("Obtenir de l’aide");
    expect(getPath("nope")).toBeUndefined();
  });

  it("records source, licence and date; touch target is 44px", () => {
    expect(PATHS_META.source).not.toBe("");
    expect(PATHS_META.licence).toBe("CC0-1.0");
    expect(PATHS_META.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(MIN_TOUCH_TARGET_PX).toBeGreaterThanOrEqual(44);
  });

  it("does not overclaim help-centre behaviour", () => {
    const texts = ONBOARDING_PATHS.flatMap((path) =>
      allStrings(path).flatMap(([, l]) => [l.en, l.fr]),
    );
    for (const text of texts) {
      expect(text).not.toMatch(/It will be shown/i);
      expect(text).not.toMatch(/Elle sera affichée/i);
      expect(text).not.toMatch(/use the contact form/i);
      expect(text).not.toMatch(/utilisez le formulaire de contact/i);
      expect(text).not.toMatch(/Search the map/i);
      expect(text).not.toMatch(/Chercher sur la carte/i);
    }
    const search = getPath("find-a-place")?.steps.find((s) => s.id === "search");
    expect(search?.href).toBe("/");
    expect(search?.linkLabel?.en).toMatch(/help search/i);
    const details = getPath("find-a-place")?.steps.find((s) => s.id === "read-details");
    expect(details?.body.en).toMatch(/map in the App/i);
    expect(details?.body.en).not.toMatch(/open its page/i);
    expect(details?.body.fr).toMatch(/carte dans l’App/);
    expect(details?.body.fr).not.toMatch(/ouvrez sa page/i);
    const contact = getPath("get-help")?.steps.find((s) => s.id === "contact");
    expect(contact?.href).toBe("/about");
    const pick = getPath("add-a-detail")?.steps.find((s) => s.id === "pick-place");
    expect(pick?.body.en).toMatch(/map in the App/i);
    expect(pick?.body.en).toMatch(/no place pages/i);
    expect(pick?.body.en).not.toMatch(/Search for the place, then open its page/i);
    expect(pick?.body.fr).toMatch(/carte dans l’App/);
    expect(pick?.body.fr).toMatch(/pas de pages de lieu/);
    expect(pick?.body.fr).not.toMatch(/Cherchez le lieu, puis ouvrez sa page/);
    const submit = getPath("add-a-detail")?.steps.find((s) => s.id === "submit");
    expect(submit?.body.en).toMatch(/Export a note file/i);
    expect(submit?.body.fr).toMatch(/fichier de note/i);
  });
});

describe("frenchTypographyIssues", () => {
  it("flags bad and accepts good text", () => {
    expect(frenchTypographyIssues("l'aide")).not.toEqual([]);
    expect(frenchTypographyIssues("Note: ok")).not.toEqual([]);
    expect(frenchTypographyIssues("Note\u00A0: ok")).toEqual([]);
    expect(frenchTypographyIssues("Quoi?")).not.toEqual([]);
    expect(frenchTypographyIssues("Quoi\u202F?")).toEqual([]);
    expect(frenchTypographyIssues("«inconnu»")).not.toEqual([]);
    expect(frenchTypographyIssues("«\u202Finconnu\u202F»")).toEqual([]);
  });
});

describe("keyboard, switch and voice routes", () => {
  const ROUTES = ["move-with-keyboard", "move-with-switch", "use-voice-control"];

  it("has the three routes, each with three steps and no step that depends on a pointer", () => {
    for (const id of ROUTES) {
      const p = getPath(id);
      expect(p, id).toBeDefined();
      expect(p?.steps.length, id).toBe(3);
      for (const s of p?.steps ?? []) {
        const text = `${s.title.en} ${s.body.en}`;
        expect(/\b(click|tap|swipe|drag|hover|pinch)\b/i.test(text), `${id}: ${text}`).toBe(false);
      }
    }
  });

  it("names the keys or the device in each step, so the step can be done without a pointer", () => {
    const keyboard = getPath("move-with-keyboard")?.steps.map((s) => s.body.en).join(" ") ?? "";
    for (const k of ["Tab", "Shift", "Enter", "Space", "Home", "End"]) expect(keyboard, k).toContain(k);
    const voice = getPath("use-voice-control")?.steps.map((s) => s.body.en).join(" ") ?? "";
    expect(voice).toContain("your device");
  });

  it("says in both languages that the App does not run a scanner and does not listen", () => {
    const sw = getPath("move-with-switch")?.steps.map((s) => s.body) ?? [];
    expect(sw.map((b) => b.en).join(" ")).toMatch(/does not run a scanner/);
    expect(sw.map((b) => b.fr).join(" ")).toMatch(/n’exécute pas de balayage/);
    const voice = getPath("use-voice-control")?.steps.map((s) => s.body) ?? [];
    expect(voice.map((b) => b.en).join(" ")).toMatch(/does not listen/);
    expect(voice.map((b) => b.fr).join(" ")).toMatch(/n’écoute pas/);
  });

  it("has distinct titles in each language and French typography throughout", () => {
    for (const lang of ["en", "fr"] as const) {
      const titles = ONBOARDING_PATHS.map((p) => p.title[lang].toLowerCase());
      expect(new Set(titles).size, lang).toBe(titles.length);
    }
    for (const id of ROUTES) {
      const p = getPath(id);
      for (const [label, l] of p ? allStrings(p) : []) expect(frenchTypographyIssues(l.fr), `${id} ${label}`).toEqual([]);
    }
  });
});

describe("forbidden organisation names", () => {
  // The names are assembled from parts, so they never appear as plain text in any file.
  const names = [["Spin", "al C", "ord Inj", "ury ", "Ont", "ario"], ["SC", "IO"], ["sci", "ontario"]].map((p) => p.join(""));

  it("are caught by FORBIDDEN_TERMS in any letter case", () => {
    for (const n of names) {
      for (const text of [n, n.toUpperCase(), n.toLowerCase(), `About ${n}.`]) {
        expect(FORBIDDEN_TERMS.some((re) => re.test(text)), text).toBe(true);
      }
    }
    expect(FORBIDDEN_TERMS.some((re) => re.test("A plain help sentence."))).toBe(false);
  });

  it("do not appear in any path text, in either language", () => {
    for (const p of ONBOARDING_PATHS) {
      for (const [label, l] of allStrings(p)) {
        for (const lang of ["en", "fr"] as const) {
          for (const re of FORBIDDEN_TERMS) expect(re.test(l[lang]), `${label} ${lang}`).toBe(false);
        }
      }
    }
  });
});

describe("the place-tool paths", () => {
  const ids = ["plan-a-visit", "ask-about-unknown", "tidy-my-notes"];

  it("exist with three steps each and unique step ids", () => {
    for (const id of ids) {
      const p = getPath(id);
      expect(p, id).toBeDefined();
      expect(p?.steps).toHaveLength(3);
      expect(new Set(p?.steps.map((s) => s.id)).size, id).toBe(3);
    }
  });

  it("point each in-App step at a hash route, and keep pointer-free text", () => {
    for (const id of ids) {
      for (const s of getPath(id)?.steps ?? []) {
        if (s.appRoute !== undefined) expect(s.appRoute, `${id}.${s.id}`).toMatch(/^#\/(places|notes)(\/[a-z-]+)*$/);
        for (const text of [s.body.en, s.body.fr]) expect(text, `${id}.${s.id}`).not.toMatch(/\b(click|tap|cliquez|touchez)\b/i);
      }
    }
    expect(getPath("plan-a-visit")?.steps.map((s) => s.appRoute)).toEqual(["#/places/must-haves", "#/places/shortlist", "#/places/shortlist-round-up"]);
    expect(getPath("ask-about-unknown")?.steps.find((s) => s.id === "ask")?.appRoute).toBeUndefined();
  });

  it("keep UNKNOWN as the French status word and never say inconnu", () => {
    for (const id of ids) {
      for (const [label, l] of allStrings(getPath(id) as NonNullable<ReturnType<typeof getPath>>)) {
        expect(l.fr, label).not.toMatch(/\binconnu/i);
        expect(frenchTypographyIssues(l.fr), label).toEqual([]);
      }
    }
    const ask = getPath("ask-about-unknown");
    expect(ask?.title.fr).toContain("UNKNOWN");
    expect(ask?.steps.find((s) => s.id === "ask")?.body.fr).toContain("reste UNKNOWN");
    expect(ask?.steps.find((s) => s.id === "ask")?.body.en).toContain("stays Unknown");
  });

  it("say that answers keep their source, and that removing asks twice", () => {
    const add = getPath("ask-about-unknown")?.steps.find((s) => s.id === "add-note");
    expect(add?.body.en).toMatch(/source/i);
    expect(add?.body.fr).toMatch(/source/i);
    const decide = getPath("tidy-my-notes")?.steps.find((s) => s.id === "decide");
    expect(decide?.body.en).toMatch(/asks twice/);
    expect(decide?.body.fr).toMatch(/deux fois/);
  });

  it("carry the route into a localized path", () => {
    const lp = localizePath(getPath("plan-a-visit") as NonNullable<ReturnType<typeof getPath>>, "fr");
    expect(lp.steps.map((s) => s.appRoute)).toEqual(["#/places/must-haves", "#/places/shortlist", "#/places/shortlist-round-up"]);
    expect(lp.title).toBe("Préparer une visite, étape par étape");
    const plain = localizePath(getPath("get-help") as NonNullable<ReturnType<typeof getPath>>, "en");
    for (const s of plain.steps) expect("appRoute" in s).toBe(false);
  });
});

describe("the record-checking paths", () => {
  const ids = ["check-the-sources", "find-doubles", "keep-details-current"];

  it("exist with three steps and point at the record pages", () => {
    expect(getPath("check-the-sources")?.steps.map((s) => s.appRoute)).toEqual(["#/places/sources", "#/places/record-ages", "#/places/latest"]);
    expect(getPath("find-doubles")?.steps.map((s) => s.appRoute)).toEqual(["#/places/similar", "#/places/repeated-records", "#/notes"]);
    expect(getPath("keep-details-current")?.steps.map((s) => s.appRoute)).toEqual(["#/places/ask-again", undefined, "#/notes/new"]);
  });

  it("never claim a record is wrong, never merge for the person, and keep old records", () => {
    const text = (id: string): string => allStrings(getPath(id) as NonNullable<ReturnType<typeof getPath>>).map(([, l]) => `${l.en}\n${l.fr}`).join("\n");
    expect(text("check-the-sources")).toMatch(/is not wrong/);
    expect(text("check-the-sources")).toMatch(/n’est pas fausse/);
    expect(text("find-doubles")).toMatch(/never merges anything/);
    expect(text("find-doubles")).toMatch(/ne fusionne jamais rien/);
    expect(text("keep-details-current")).toMatch(/does not drop it/);
    expect(text("keep-details-current")).toMatch(/ne la retire pas/);
  });

  it("keep French typography and distinct titles", () => {
    for (const id of ids) {
      for (const [label, l] of allStrings(getPath(id) as NonNullable<ReturnType<typeof getPath>>)) {
        expect(frenchTypographyIssues(l.fr), label).toEqual([]);
        for (const re of FORBIDDEN_TERMS) expect(`${l.en} ${l.fr}`, label).not.toMatch(re);
      }
    }
    const titles = ONBOARDING_PATHS.map((p) => p.title.en);
    expect(new Set(titles).size).toBe(titles.length);
    const fr = ONBOARDING_PATHS.map((p) => p.title.fr);
    expect(new Set(fr).size).toBe(fr.length);
  });
});
