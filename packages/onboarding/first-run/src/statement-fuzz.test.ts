// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { FACT_KEYS, auditDom, type Locale, type Tri } from "./index";
import {
  CUES,
  MAX_PER_DETAIL,
  MAX_SENTENCE,
  emptyStatementForm,
  foldKeepLength,
  readStatement,
  splitSentences,
  statementNote,
  validateStatement,
  WORDS,
} from "./statement";
import { renderStatement } from "./views-statement";
import { makeRng, type Rng } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 10, 19));

/** Real phrasings from access pages, in both languages, plus things that are not about access at all. */
const PARTS = [
  "Our main entrance is step-free",
  "There are two steps at the entrance",
  "A ramp is available on request",
  "L’entrée est de plain-pied",
  "Il y a trois marches à l’entrée",
  "Accessible washrooms on every floor",
  "The washroom is not accessible",
  "Toilettes accessibles au sous-sol",
  "Automatic door at the north entrance",
  "There is no automatic door",
  "Porte automatique côté rue",
  "An elevator serves all floors",
  "The elevator is out of service",
  "Il n’y a pas d’ascenseur",
  "Lift up the latch",
  "We sell bread",
  "Ouvert le dimanche !",
  "Call us at the front desk",
  "<b>bold</b> & \"quoted\"",
  "Café ; thé ? oui",
  "",
];
const ENDS = [". ", "! ", "? ", "; ", "\n", "\n- ", " ", "\r\n• "];

function randomText(rng: Rng): string {
  const n = 1 + Math.floor(rng() * 25);
  let out = "";
  for (let i = 0; i < n; i++) out += PARTS[Math.floor(rng() * PARTS.length)] + (ENDS[Math.floor(rng() * ENDS.length)] ?? " ");
  return out;
}

describe("random pages", () => {
  it("are read without error, and every listed sentence names its detail where it is marked", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const text = randomText(makeRng(seed));
      const sentences = splitSentences(text);
      for (const s of sentences) expect(s.length).toBeLessThanOrEqual(MAX_SENTENCE);
      const findings = readStatement(text);
      expect(findings.map((f) => f.key)).toEqual(FACT_KEYS);
      for (const f of findings) {
        expect(f.mentions.length).toBeLessThanOrEqual(MAX_PER_DETAIL);
        expect(f.more).toBeGreaterThanOrEqual(0);
        for (const m of f.mentions) {
          expect(sentences).toContain(m.sentence);
          expect(CUES).toContain(m.cue);
          expect(m.start).toBeGreaterThanOrEqual(0);
          expect(m.end).toBeGreaterThan(m.start);
          expect(m.end).toBeLessThanOrEqual(m.sentence.length);
          // The sentence names the detail somewhere: its topic words match.
          const folded = foldKeepLength(m.sentence);
          expect(WORDS[f.key].topic.some((re) => new RegExp(re.source).test(folded)), `${seed} ${f.key}: ${m.sentence}`).toBe(true);
        }
      }
    }
  });

  it("render as markup that passes the App's audit in both languages", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const text = randomText(makeRng(seed * 7));
      for (const l of ["en", "fr"] as Locale[]) {
        document.documentElement.lang = l;
        document.body.innerHTML =
          `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1>` +
          renderStatement({ form: { ...emptyStatementForm(TODAY), text }, findings: readStatement(text), errors: [], locale: l, statusMessage: undefined }) +
          `</main></div>`;
        const root = document.getElementById("r") as HTMLElement;
        expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`), `seed ${seed} ${l}`).toEqual([]);
        // Pasted markup is shown as text, never as elements.
        expect(root.querySelector("b")).toBeNull();
      }
    }
  });

  it("save exactly the answers chosen, whatever the text says", () => {
    const TRIS: readonly Tri[] = ["yes", "no", "unknown"];
    for (let seed = 1; seed <= 60; seed++) {
      const rng = makeRng(seed * 31);
      const answers = Object.fromEntries(FACT_KEYS.map((k) => [k, TRIS[Math.floor(rng() * 3)] ?? "unknown"])) as Record<(typeof FACT_KEYS)[number], Tri>;
      const form = { ...emptyStatementForm(TODAY), placeName: `Place ${seed}`, text: randomText(rng), licence: "CC0-1.0", answers };
      const errors = validateStatement(form, TODAY, "en");
      const anyAnswer = FACT_KEYS.some((k) => answers[k] !== "unknown");
      expect(errors.map((e) => e.code)).toEqual(anyAnswer ? [] : ["needs-one-detail"]);
      if (!anyAnswer) continue;
      const note = statementNote(form, TODAY, "en", () => `f${seed}`);
      for (const f of note.facts) expect(f.value).toBe(answers[f.key]);
    }
  });
});
