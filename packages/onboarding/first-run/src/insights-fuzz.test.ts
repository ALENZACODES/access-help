// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { FACT_KEYS, auditDom, findBanned, groupPlaces, type Locale, type Requirement } from "./index";
import { callListText, renderCallListLink } from "./calllist";
import { renderCallScript, scriptText } from "./callscript";
import { renderBehind } from "./compare-records";
import { coverageLines, coverageSpread, renderCoverage } from "./coverage";
import { oldPlaces, oldPlacesLines, renderOldPlaces } from "./oldplaces";
import { placeQuestionKeys, placeQuestions } from "./placequestions";
import { buildRoundup } from "./roundup";
import { renderSourceCoverage } from "./source-coverage";
import { whyLines, whyOf } from "./standing-why";
import { placeSources, renderWhoRecorded, whoRecordedLines } from "./who-recorded";
import { makeRng, randomNotes } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const LOCALES: readonly Locale[] = ["en", "fr"];

function audit(inner: string, locale: Locale): string[] {
  document.documentElement.lang = locale;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${locale}"><h1>Title</h1><h2 id="view-title">Page</h2>${inner}</main></div>`;
  return auditDom(document.getElementById("r") as HTMLElement, { locale }).map((v) => `${v.rule}: ${v.detail}`);
}

const plainFrench = (text: string): boolean => !/\binconnu/i.test(text) && !/[^\u00A0\u202F\d](?=[:;?!])/u.test(text.replace(/https?:\/\/\S+/g, ""));

describe("the new sections on random notes", () => {
  it("pass the App's own audit in both languages", () => {
    for (let seed = 1; seed <= 15; seed++) {
      const rng = makeRng(seed);
      const notes = randomNotes(rng, 8);
      const places = groupPlaces(notes, "en");
      const needs: Requirement = Object.fromEntries(FACT_KEYS.filter(() => rng() < 0.5).map((k) => [k, rng() < 0.5 ? "yes" : "no"]));
      for (const l of LOCALES) {
        const blocks = [
          renderCoverage(places, l),
          renderBehind(places.slice(0, 3), needs, l),
          renderSourceCoverage(notes, l),
          renderOldPlaces(places, l, TODAY),
          ...places.slice(0, 1).map((p) => renderWhoRecorded(p, l)),
          ...FACT_KEYS.map((k) => renderCallListLink(k, places.slice(0, 2), l, TODAY)),
        ];
        expect(audit(blocks.join(""), l), `${seed} ${l}`).toEqual([]);
      }
    }
  });

  it("give call scripts that pass the audit and keep French typography", () => {
    for (let seed = 1; seed <= 15; seed++) {
      const rng = makeRng(seed);
      const places = groupPlaces(randomNotes(rng, 6), "en");
      const needs: Requirement = { elevator: "yes", "step-free-entry": "yes" };
      for (const l of LOCALES) {
        const r = buildRoundup(places, places.map((p) => p.id), needs, {}, l, TODAY);
        const html = r.places.map((p, i) => `<article aria-labelledby="roundup-place-${i}"><h3 id="roundup-place-${i}">${i}</h3>${renderCallScript(p, i, l, TODAY)}</article>`).join("");
        expect(audit(html, l), `${seed} ${l}`).toEqual([]);
        for (const p of places) {
          const text = scriptText(p, placeQuestions(p, l), l, TODAY);
          expect(findBanned(text), `${seed}`).toBeUndefined();
          if (l === "fr") expect(plainFrench(text.replace(p.name, "").replace(p.address ?? "", "")), `${seed}`).toBe(true);
        }
      }
    }
  });

  it("give call lists and why-lines that stay plain in both languages", () => {
    for (let seed = 1; seed <= 15; seed++) {
      const rng = makeRng(seed);
      const places = groupPlaces(randomNotes(rng, 6), "en");
      for (const l of LOCALES) {
        for (const k of FACT_KEYS) {
          const text = callListText(k, places, l, TODAY);
          const own = places.reduce((s, p) => s.replace(p.name, "").replace(p.address ?? "", ""), text);
          expect(findBanned(own)).toBeUndefined();
          if (l === "fr") expect(plainFrench(own), `${seed} ${k}`).toBe(true);
        }
        for (const p of places) {
          for (const line of whyLines(whyOf(p, { elevator: "yes", "automatic-door": "no" }), l)) {
            if (l === "fr") expect(plainFrench(line), line).toBe(true);
          }
        }
      }
    }
  });
});

describe("placeQuestionKeys", () => {
  it("asks about every detail that is not one agreed answer", () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const p of groupPlaces(randomNotes(makeRng(seed), 8), "en")) {
        const keys = placeQuestionKeys(p);
        for (const k of FACT_KEYS) expect(keys.includes(k), `${seed} ${k}`).toBe(p.resolutions[k].kind !== "agree");
        expect(placeQuestions(p, "fr")).toHaveLength(keys.length);
      }
    }
  });
});

describe("the text lines on random notes", () => {
  it("keep French typography, avoid banned words and never say inconnu", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = makeRng(seed * 7);
      const notes = randomNotes(rng, 10);
      for (const l of LOCALES) {
        const places = groupPlaces(notes, l);
        const text = [
          ...coverageLines(places, l),
          ...oldPlacesLines(places, l, TODAY),
          ...places.flatMap((p) => whoRecordedLines(p, l)),
        ].join("\n");
        expect(findBanned(text), `seed ${seed} ${l}`).toBeUndefined();
        if (l === "fr") expect(plainFrench(text), `seed ${seed}`).toBe(true);
      }
    }
  });

  it("agree with the counts they come from", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const notes = randomNotes(makeRng(seed * 11), 12);
      const places = groupPlaces(notes, "en");
      const spread = coverageSpread(places);
      expect(spread.reduce((a, b) => a + b, 0)).toBe(places.length);
      const counted = coverageLines(places, "en")
        .slice(4)
        .map((x) => Number(/: (\d+) place/.exec(x)?.[1]));
      expect(counted).toEqual([...spread].reverse());
      const olds = oldPlacesLines(places, "en", TODAY).filter((x) => x.startsWith("- "));
      expect(olds).toHaveLength(oldPlaces(places, TODAY).length);
      for (const p of places) {
        const who = whoRecordedLines(p, "en").filter((x) => x.startsWith("* "));
        expect(who).toHaveLength(placeSources(p).length);
        const records = placeSources(p).reduce((a, s) => a + s.records, 0);
        const observations = FACT_KEYS.reduce((a, k) => {
          const r = p.resolutions[k];
          return a + (r.kind === "unknown" ? 0 : r.observations.length);
        }, 0);
        expect(records).toBe(observations);
      }
    }
  });
});
