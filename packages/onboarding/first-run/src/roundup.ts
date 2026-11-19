import type { Locale } from "../../switch-first/src/index";
import { entryFor, type Checklist } from "./checklist";
import { COPY, NB, t } from "./copy";
import type { Requirement } from "./filter";
import type { Place } from "./places";
import { buildPlan, itemDetail, plannedQuestions, statusLabel, type Plan, type PlanStatus, type PlannedQuestion } from "./plan";

/**
 * The shortlist round-up: every shortlisted place, in the order it was added,
 * checked against the saved must-haves, with the questions still to ask and
 * what the person noted when they asked. It is a to-do list for calls and
 * visits. It does not rank the places, it does not say any place suits anyone,
 * and the person's notes never become reports: a detail stays UNKNOWN until a
 * report with a source, licence and date is added.
 */
export const PLAN_STATUSES: readonly PlanStatus[] = ["matches", "not-met", "differ", "unknown"];

export interface RoundupQuestion extends PlannedQuestion {
  readonly asked: boolean;
  /** What the place said, as the person typed it. Empty when nothing was noted. */
  readonly answer: string;
}

export interface RoundupPlace {
  readonly place: Place;
  readonly plan: Plan;
  readonly questions: readonly RoundupQuestion[];
  readonly asked: number;
  readonly answered: number;
}

export interface RoundupTotals {
  readonly places: number;
  readonly questions: number;
  readonly asked: number;
  readonly answered: number;
  /** Places with at least one question, every one of them asked. */
  readonly allAsked: number;
  /** Places with no question to ask about the must-haves. */
  readonly noQuestions: number;
  readonly statuses: Readonly<Record<PlanStatus, number>>;
}

export interface Roundup {
  readonly places: readonly RoundupPlace[];
  /** Shortlist ids with no place in the notes any more. They are skipped, not guessed. */
  readonly missing: number;
  readonly totals: RoundupTotals;
}

function roundupPlace(place: Place, needs: Requirement, checklist: Checklist, locale: Locale, today: Date): RoundupPlace {
  const plan = buildPlan(place, needs);
  const questions = plannedQuestions(plan, locale, today).map((q): RoundupQuestion => {
    const e = entryFor(checklist, place.id, q.key);
    return { ...q, asked: e.asked, answer: e.answer };
  });
  return {
    place,
    plan,
    questions,
    asked: questions.filter((q) => q.asked).length,
    answered: questions.filter((q) => q.answer.trim() !== "").length,
  };
}

/** Builds the round-up in shortlist order. The same inputs always give the same round-up. */
export function buildRoundup(places: readonly Place[], shortlist: readonly string[], needs: Requirement, checklist: Checklist, locale: Locale, today: Date): Roundup {
  const byId = new Map(places.map((p) => [p.id, p] as const));
  const seen = new Set<string>();
  const out: RoundupPlace[] = [];
  let missing = 0;
  for (const id of shortlist) {
    if (seen.has(id)) continue;
    seen.add(id);
    const place = byId.get(id);
    if (!place) {
      missing += 1;
      continue;
    }
    out.push(roundupPlace(place, needs, checklist, locale, today));
  }
  const statuses: Record<PlanStatus, number> = { matches: 0, "not-met": 0, differ: 0, unknown: 0 };
  for (const p of out) for (const s of PLAN_STATUSES) statuses[s] += p.plan.counts[s];
  return {
    places: out,
    missing,
    totals: {
      places: out.length,
      questions: out.reduce((n, p) => n + p.questions.length, 0),
      asked: out.reduce((n, p) => n + p.asked, 0),
      answered: out.reduce((n, p) => n + p.answered, 0),
      allAsked: out.filter((p) => p.questions.length > 0 && p.asked === p.questions.length).length,
      noQuestions: out.filter((p) => p.questions.length === 0).length,
      statuses,
    },
  };
}

/** True when a place still has a question nobody ticked as asked. */
export function hasQuestionsLeft(p: RoundupPlace): boolean {
  return p.asked < p.questions.length;
}

/** The same round-up with only the places that still have a question to ask. Totals are counted again. */
export function onlyQuestionsLeft(r: Roundup): Roundup {
  const places = r.places.filter(hasQuestionsLeft);
  const statuses: Record<PlanStatus, number> = { matches: 0, "not-met": 0, differ: 0, unknown: 0 };
  for (const p of places) for (const s of PLAN_STATUSES) statuses[s] += p.plan.counts[s];
  return {
    places,
    missing: r.missing,
    totals: {
      places: places.length,
      questions: places.reduce((n, p) => n + p.questions.length, 0),
      asked: places.reduce((n, p) => n + p.asked, 0),
      answered: places.reduce((n, p) => n + p.answered, 0),
      allAsked: 0,
      noQuestions: 0,
      statuses,
    },
  };
}

/** "Asked 2 of 5", "Posées : 2 sur 5". */
export function askedText(asked: number, total: number, locale: Locale): string {
  return locale === "fr" ? `Posées${NB}: ${asked} sur ${total}` : `Asked ${asked} of ${total}`;
}

/** "Matches 2; Does not match 1" — only statuses that occur, in a fixed order. */
export function statusCountsLine(counts: Readonly<Record<PlanStatus, number>>, locale: Locale): string {
  return PLAN_STATUSES.filter((s) => counts[s] > 0)
    .map((s) => `${statusLabel(s, locale)} ${counts[s]}`)
    .join(locale === "fr" ? "\u202F; " : "; ");
}

const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

/** The round-up as plain text, to print or read out on a call. */
export function roundupToText(r: Roundup, hasNeeds: boolean, locale: Locale, today: Date, onlyLeft = false): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(COPY.roundup.title, l);
  const lines: string[] = [title, rule(title), "", t(COPY.roundup.intro, l), t(COPY.shortlist.intro, l), t(COPY.checklist.notReports, l), ""];
  if (r.places.length === 0) {
    lines.push(t(COPY.roundup.empty, l), "");
  } else if (!hasNeeds) {
    lines.push(t(COPY.roundup.noNeeds, l), "");
  } else {
    if (onlyLeft) lines.push(t(COPY.roundup.showingLeft, l));
    lines.push(`${t(COPY.roundup.placesLabel, l)}${colon} ${r.totals.places}`);
    lines.push(`${t(COPY.roundup.questionsLabel, l)}${colon} ${askedText(r.totals.asked, r.totals.questions, l)}`);
    lines.push("");
    r.places.forEach((p, i) => {
      const head = `${i + 1}. ${p.place.name}`;
      lines.push(head, rule(head, "-"));
      if (p.place.address) lines.push(p.place.address);
      const counts = statusCountsLine(p.plan.counts, l);
      if (counts !== "") lines.push(`${counts}.`);
      for (const item of p.plan.items) lines.push(`- ${t(COPY.facts[item.key], l)}${colon} ${statusLabel(item.status, l)}. ${itemDetail(item, l, today)}`);
      if (p.questions.length === 0) {
        lines.push(t(COPY.roundup.noQuestions, l));
      } else {
        lines.push(`${t(COPY.plan.questionsTitle, l)} (${askedText(p.asked, p.questions.length, l)})${colon}`);
        p.questions.forEach((q, n) => {
          lines.push(`  ${n + 1}. [${q.asked ? "x" : " "}] ${q.text}`);
          if (q.answer.trim() !== "") lines.push(`     ${t(COPY.checklist.saidLabel, l)}${colon} ${q.answer}`);
        });
      }
      lines.push("");
    });
  }
  if (r.missing > 0) lines.push(t(COPY.roundup.missing, l), "");
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function roundupFilename(today: Date, locale: Locale): string {
  return `${locale === "fr" ? "liste-courte-bilan" : "shortlist-round-up"}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}
