import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import type { Requirement } from "./filter";
import { gapsOfPlace, needKeys } from "./gaps";
import type { Note } from "./model";
import { checkNotes } from "./notecheck";
import { groupPlaces } from "./places";
import { REVIEW_REASONS, reviewCounts } from "./review";
import { findSimilar } from "./similar";
import { collectSources } from "./sources";

/**
 * What a short-path step will find on this device right now: a count, read
 * from the person's own notes, must-haves and shortlist. It describes what is
 * there; it never says a step is required, and nothing here changes data.
 * Steps that happen away from the App have no status.
 */
export interface StepInputs {
  readonly notes: readonly Note[];
  readonly needs: Requirement;
  readonly shortlist: readonly string[];
  readonly dismissed: readonly string[];
  readonly locale: Locale;
  readonly today: Date;
}

export type StepStatusKind =
  | "needs"
  | "shortlist"
  | "roundup"
  | "gaps"
  | "notes"
  | "notecheck"
  | "records"
  | "similar"
  | "review";

export interface StepStatus {
  readonly kind: StepStatusKind;
  /** The number the line is about. */
  readonly count: number;
  /** One plain sentence for the step page. */
  readonly text: string;
}

/** Which status each in-App step shows. */
const STEP_KIND: Readonly<Record<string, StepStatusKind>> = {
  "plan-a-visit.must-haves": "needs",
  "plan-a-visit.shortlist": "shortlist",
  "plan-a-visit.round-up": "roundup",
  "ask-about-unknown.find-gaps": "gaps",
  "ask-about-unknown.add-note": "notes",
  "tidy-my-notes.check": "notecheck",
  "tidy-my-notes.copy": "notes",
  "check-the-sources.sources": "records",
  "check-the-sources.ages": "records",
  "check-the-sources.latest": "records",
  "find-doubles.similar": "similar",
  "find-doubles.repeats": "records",
  "find-doubles.decide": "notes",
  "keep-details-current.review": "review",
  "keep-details-current.add-note": "notes",
};

export function stepStatusKind(pathId: string, stepId: string): StepStatusKind | undefined {
  return STEP_KIND[`${pathId}.${stepId}`];
}

type Noun = "place" | "note" | "detail" | "record" | "pair";

/** Singular and plural in each language. French counts 0 and 1 as singular. */
const NOUNS: Readonly<Record<Noun, { en: [string, string]; fr: [string, string] }>> = {
  place: { en: ["place", "places"], fr: ["lieu", "lieux"] },
  note: { en: ["note", "notes"], fr: ["note", "notes"] },
  detail: { en: ["detail", "details"], fr: ["détail", "détails"] },
  record: { en: ["record", "records"], fr: ["donnée", "données"] },
  pair: { en: ["pair", "pairs"], fr: ["paire", "paires"] },
};

/** "1 place", "2 places"; "1 lieu", "2 lieux". */
export function counted(n: number, noun: Noun, l: Locale): string {
  const [one, many] = NOUNS[noun][l];
  const singular = l === "fr" ? n <= 1 : n === 1;
  return `${n} ${singular ? one : many}`;
}

export function stepStatus(pathId: string, stepId: string, input: StepInputs): StepStatus | undefined {
  const kind = stepStatusKind(pathId, stepId);
  if (!kind) return undefined;
  const l = input.locale;
  const S = COPY.stepStatus;
  const places = (): ReturnType<typeof groupPlaces> => groupPlaces(input.notes, l);
  switch (kind) {
    case "needs": {
      const n = needKeys(input.needs).length;
      return { kind, count: n, text: n === 0 ? t(S.noNeeds, l) : `${t(S.needsSaved, l)} ${counted(n, "detail", l)}.` };
    }
    case "shortlist": {
      const ids = new Set(places().map((p) => p.id));
      const n = input.shortlist.filter((id) => ids.has(id)).length;
      return { kind, count: n, text: n === 0 ? t(S.noShortlist, l) : `${t(S.shortlistHas, l)} ${counted(n, "place", l)}.` };
    }
    case "roundup": {
      const ids = new Set(places().map((p) => p.id));
      const listed = input.shortlist.filter((id) => ids.has(id)).length;
      const needs = needKeys(input.needs).length;
      const n = needs > 0 ? listed : 0;
      const text = needs === 0 ? t(S.roundupNeedsFirst, l) : listed === 0 ? t(S.noShortlist, l) : `${t(S.roundupReady, l)} ${counted(listed, "place", l)}.`;
      return { kind, count: n, text };
    }
    case "gaps": {
      const n = places().filter((p) => gapsOfPlace(p).length > 0).length;
      return { kind, count: n, text: n === 0 ? t(S.noGaps, l) : `${t(S.gapsAt, l)} ${counted(n, "place", l)}.` };
    }
    case "notes": {
      const n = input.notes.length;
      return { kind, count: n, text: n === 0 ? t(S.noNotes, l) : `${t(S.notesHave, l)} ${counted(n, "note", l)}.` };
    }
    case "notecheck": {
      const n = checkNotes(input.notes, input.today).flagged.length;
      return { kind, count: n, text: n === 0 ? t(S.noFlags, l) : `${t(S.flagsOn, l)} ${counted(n, "note", l)}.` };
    }
    case "records": {
      const n = collectSources(input.notes, input.today).recorded;
      return { kind, count: n, text: n === 0 ? t(S.noRecords, l) : `${t(S.recordsHave, l)} ${counted(n, "record", l)}.` };
    }
    case "similar": {
      const n = findSimilar(places(), new Set(input.dismissed)).length;
      return { kind, count: n, text: n === 0 ? t(S.noPairs, l) : `${t(S.pairsFound, l)} ${counted(n, "pair", l)}.` };
    }
    case "review": {
      const c = reviewCounts(places(), input.today);
      const n = REVIEW_REASONS.reduce((sum, r) => sum + c[r], 0);
      return { kind, count: n, text: n === 0 ? t(S.noReview, l) : `${t(S.reviewHas, l)} ${counted(n, "detail", l)}.` };
    }
  }
}
