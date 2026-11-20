// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  CUES,
  CUE_COPY,
  STATEMENT_COPY,
  emptyStatementForm,
  mountShell,
  mountStatementReader,
  readStatement,
  renderStatement,
  statementNote,
  statementStrings,
  validateStatement,
} from "./index.js";

/**
 * The package's own entry point carries the page reader, so a host such as
 * the help centre can mount it next to the first-run shell without reaching
 * into the package's folders.
 */
describe("the package entry point", () => {
  it("exports the reader, its copy and its parts", () => {
    expect(typeof mountStatementReader).toBe("function");
    expect(typeof mountShell).toBe("function");
    expect(CUES).toEqual(["has", "lacks", "changes", "mentions"]);
    for (const c of CUES) expect(CUE_COPY[c].en).not.toBe("");
    expect(statementStrings().some(([k]) => k === "statement.title")).toBe(true);
    expect(STATEMENT_COPY.title.fr).toBe("Lire la page d’accessibilité d’un lieu");
  });

  it("mounts, reads and saves through the entry point alone", () => {
    document.documentElement.lang = "en";
    document.body.innerHTML = '<a class="skip-link" href="#main">Skip</a><main id="main"><h1>Help centre</h1><div id="host"></div></main>';
    const host = document.getElementById("host") as HTMLElement;
    const kept = new Map<string, string>();
    const store = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), removeItem: (k: string) => void kept.delete(k) };
    const handle = mountStatementReader(host, { locale: "en", store, today: new Date(Date.UTC(2026, 10, 19)) });
    expect(host.querySelector("h2")?.textContent).toBe(STATEMENT_COPY.title.en);
    handle.destroy();
    expect(host.innerHTML).toBe("");

    const today = new Date(Date.UTC(2026, 10, 19));
    const form = { ...emptyStatementForm(today), placeName: "Arena", text: "There is an elevator.", licence: "CC0-1.0", answers: { ...emptyStatementForm(today).answers, elevator: "yes" as const } };
    expect(validateStatement(form, today, "en")).toEqual([]);
    expect(statementNote(form, today, "en", () => "a1").facts.find((f) => f.key === "elevator")?.value).toBe("yes");
    expect(readStatement(form.text).find((f) => f.key === "elevator")?.mentions[0]?.cue).toBe("has");
    expect(renderStatement({ form, findings: undefined, errors: [], locale: "fr", statusMessage: undefined })).toContain('lang="fr"');
  });
});
