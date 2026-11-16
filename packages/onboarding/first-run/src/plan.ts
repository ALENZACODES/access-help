import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { Checklist } from "./checklist";
import { FACT_KEYS, STALE_AFTER_MONTHS, ageText, monthsSince, type FactKey } from "./facts";
import type { Requirement } from "./filter";
import type { Place, Resolution } from "./places";
import { reportCount } from "./places";

/**
 * A visit plan lists the details a person asked about for one place, what the
 * notes say about each, and the questions to put to the place for every detail
 * that has no answer or conflicting answers. It does not judge whether a place
 * is suitable for anyone.
 */
export type PlanStatus = "matches" | "not-met" | "unknown" | "differ";

export interface PlanItem {
  readonly key: FactKey;
  readonly wanted: "yes" | "no";
  readonly status: PlanStatus;
  readonly resolution: Resolution;
}

export interface Plan {
  readonly items: readonly PlanItem[];
  readonly counts: Readonly<Record<PlanStatus, number>>;
}

export function statusOf(r: Resolution, wanted: "yes" | "no"): PlanStatus {
  if (r.kind === "unknown") return "unknown";
  if (r.kind === "differ") return "differ";
  return r.value === wanted ? "matches" : "not-met";
}

export function buildPlan(place: Place, req: Requirement): Plan {
  const items: PlanItem[] = [];
  const counts: Record<PlanStatus, number> = { matches: 0, "not-met": 0, unknown: 0, differ: 0 };
  for (const key of FACT_KEYS) {
    const wanted = req[key];
    if (!wanted) continue;
    const resolution = place.resolutions[key];
    const status = statusOf(resolution, wanted);
    counts[status] += 1;
    items.push({ key, wanted, status, resolution });
  }
  return { items, counts };
}

export const QUESTIONS: Record<FactKey, Pair> = {
  "step-free-entry": {
    en: "Is there an entrance with no steps? Where is it?",
    fr: `Y a-t-il une entrée sans marche${NN}? Où se trouve-t-elle${NN}?`,
  },
  "accessible-washroom": {
    en: "Is there an accessible washroom? How do I get to it?",
    fr: `Y a-t-il des toilettes accessibles${NN}? Comment s’y rend-on${NN}?`,
  },
  "automatic-door": {
    en: "Does the entrance have an automatic door?",
    fr: `L’entrée a-t-elle une porte automatique${NN}?`,
  },
  elevator: {
    en: "Is there an elevator, and is it working today?",
    fr: `Y a-t-il un ascenseur, et fonctionne-t-il aujourd’hui${NN}?`,
  },
};

/** One question for each detail with no answer or with reports that differ. */
export function questionsFor(plan: Plan, locale: Locale): string[] {
  return plan.items.filter((i) => i.status === "unknown" || i.status === "differ").map((i) => QUESTIONS[i.key][locale]);
}

export type QuestionReason = "unknown" | "differ" | "old";

export interface PlannedQuestion {
  readonly key: FactKey;
  readonly reason: QuestionReason;
  readonly text: string;
}

/** Months since the newest report for an item, or undefined when nothing is recorded. */
export function newestReportAge(item: PlanItem, today: Date): number | undefined {
  const r = item.resolution;
  if (r.kind === "unknown") return undefined;
  const newest = r.observations[0];
  return newest ? monthsSince(newest.provenance.recordedOn, today) : undefined;
}

/** A recorded answer whose newest report is a year old or more. The App does not treat it as wrong. */
export function isOld(item: PlanItem, today: Date): boolean {
  if (item.status !== "matches" && item.status !== "not-met") return false;
  const age = newestReportAge(item, today);
  return age !== undefined && age >= STALE_AFTER_MONTHS;
}

function oldQuestion(item: PlanItem, locale: Locale, today: Date): string {
  const label = t(COPY.facts[item.key], locale);
  const months = newestReportAge(item, today) ?? STALE_AFTER_MONTHS;
  return locale === "fr"
    ? `Est-ce toujours le cas${NN}: ${label}${NN}? Le rapport le plus récent date de ${months} mois.`
    : `Is this still the case: ${label}? The newest report is ${months} months old.`;
}

/**
 * Questions for unknown and differing details, then a "still the case?" check
 * for recorded answers that are a year old or more.
 */
export function plannedQuestions(plan: Plan, locale: Locale, today: Date): PlannedQuestion[] {
  const out: PlannedQuestion[] = [];
  for (const i of plan.items) {
    if (i.status === "unknown" || i.status === "differ") out.push({ key: i.key, reason: i.status, text: QUESTIONS[i.key][locale] });
  }
  for (const i of plan.items) {
    if (isOld(i, today)) out.push({ key: i.key, reason: "old", text: oldQuestion(i, locale, today) });
  }
  return out;
}

export function statusLabel(s: PlanStatus, locale: Locale): string {
  switch (s) {
    case "matches":
      return t(COPY.plan.matches, locale);
    case "not-met":
      return t(COPY.plan.notMet, locale);
    case "unknown":
      return t(COPY.plan.unknown, locale);
    case "differ":
      return t(COPY.places.differ, locale);
  }
}

/** Summary line for one plan item, used on screen and in the shareable text. */
export function itemDetail(item: PlanItem, locale: Locale, today: Date): string {
  const colon = locale === "fr" ? `${NB}: ` : ": ";
  const r = item.resolution;
  if (r.kind === "unknown") return locale === "fr" ? "Aucune donnée enregistrée." : "No record.";
  if (r.kind === "differ") return t({ en: `${reportCount(r)} reports disagree.`, fr: `${reportCount(r)} rapports divergent.` }, locale);
  const p = (r.observations[0] as NonNullable<(typeof r.observations)[0]>).provenance;
  const source = p.source === "Contributor report" && locale === "fr" ? "Rapport d’un contributeur" : p.source;
  const months = monthsSince(p.recordedOn, today);
  const answer = t(COPY.values[r.value], locale);
  return locale === "fr"
    ? `Réponse${colon}${answer}. Source${colon}${source}. Licence${colon}${p.licence}. Saisi le ${p.recordedOn} (${ageText(months, locale)}).`
    : `Answer${colon}${answer}. Source${colon}${source}. Licence${colon}${p.licence}. Recorded on ${p.recordedOn} (${ageText(months, locale)}).`;
}

/** Plain text a person can copy or read aloud. Uses the same words as the screen. */
export function planToText(place: Place, plan: Plan, locale: Locale, today: Date, checklist: Checklist = {}): string {
  const fr = locale === "fr";
  const colon = fr ? `${NB}: ` : ": ";
  const lines: string[] = [];
  lines.push(`${t(COPY.plan.title, locale)}${colon}${place.name}`);
  lines.push(`${fr ? "Préparé le" : "Prepared on"} ${today.toISOString().slice(0, 10)}`);
  if (place.address) lines.push(`${fr ? "Adresse" : "Address"}${colon}${place.address}`);
  lines.push("");
  lines.push(`${t(COPY.plan.whatMatters, locale)}${fr ? `${NB}:` : ":"}`);
  for (const item of plan.items) {
    lines.push(`- ${t(COPY.facts[item.key], locale)}${colon}${statusLabel(item.status, locale)}. ${itemDetail(item, locale, today)}`);
  }
  const questions = plannedQuestions(plan, locale, today);
  lines.push("");
  if (questions.length > 0) {
    lines.push(`${t(COPY.plan.questionsTitle, locale)}${fr ? `${NB}:` : ":"}`);
    questions.forEach((q, i) => {
      const e = checklist[place.id]?.[q.key];
      const mark = e?.asked ? (fr ? " [posée]" : " [asked]") : "";
      lines.push(`${i + 1}. ${q.text}${mark}`);
      if (e && e.answer !== "") lines.push(`   ${t(COPY.checklist.saidLabel, locale)}${fr ? `${NB}: ` : ": "}${e.answer}`);
    });
    lines.push(t(COPY.checklist.notReports, locale));
  } else {
    lines.push(t(COPY.plan.noQuestions, locale));
  }
  lines.push("");
  lines.push(t(COPY.plan.footer, locale));
  return lines.join("\n");
}
