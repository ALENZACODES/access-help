import { eventSourceProblems, isIsoDate } from "./source";
import { UNKNOWN_DATE, type EventOutingSource, type EventPlan, type PlanItem, type PlanTiming } from "./types";

export const MAX_OWN_ITEM = 200;
export const MAX_OWN_ITEMS = 50;

export const planIdFor = (eventId: string): string => `plan:${eventId}`;

/**
 * Start a plan from an event source. One checklist line is made for each item the event record
 * leaves Unknown, and none for anything else: the plan never fills a gap with a guess.
 */
export function buildPlan(source: EventOutingSource, today: string): EventPlan {
  const problems = eventSourceProblems(source);
  if (problems.length > 0) throw new Error(`event source is not valid: ${problems.join("; ")}`);
  if (!isIsoDate(today)) throw new Error("today must be an ISO date");
  return {
    id: planIdFor(source.eventId),
    eventId: source.eventId,
    eventLabel: { en: source.label.en, fr: source.label.fr },
    eventDate: source.eventDate,
    demonstration: source.demonstration,
    createdOn: today,
    sourcePreparedOn: source.preparedOn,
    sourceTotalFields: source.totalFields,
    items: source.unknownItems.map((unknown) => ({
      id: `ask:${unknown.fieldId}`,
      kind: "ask_organiser",
      fieldId: unknown.fieldId,
      label: { en: unknown.label.en, fr: unknown.label.fr },
      done: false,
    })),
  };
}

export function setItemDone(plan: EventPlan, itemId: string, done: boolean): EventPlan {
  return { ...plan, items: plan.items.map((item) => (item.id === itemId ? { ...item, done } : item)) };
}

export type OwnItemProblem = "empty" | "too_long" | "too_many";

/** Add a line the person wrote themselves. The text is kept as typed, trimmed. */
export function addOwnItem(plan: EventPlan, text: string): { ok: true; plan: EventPlan } | { ok: false; problem: OwnItemProblem } {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return { ok: false, problem: "empty" };
  if (clean.length > MAX_OWN_ITEM) return { ok: false, problem: "too_long" };
  const own = plan.items.filter((item) => item.kind === "own");
  if (own.length >= MAX_OWN_ITEMS) return { ok: false, problem: "too_many" };
  const used = new Set(plan.items.map((item) => item.id));
  let n = own.length + 1;
  while (used.has(`own:${n}`)) n += 1;
  const item: PlanItem = { id: `own:${n}`, kind: "own", text: clean, done: false };
  return { ok: true, plan: { ...plan, items: [...plan.items, item] } };
}

/** Remove a line the person added. Lines that come from the event record stay. */
export function removeOwnItem(plan: EventPlan, itemId: string): EventPlan {
  return { ...plan, items: plan.items.filter((item) => item.kind !== "own" || item.id !== itemId) };
}

export interface PlanProgress {
  total: number;
  done: number;
  open: number;
  /** Questions for the organiser not yet ticked. */
  openQuestions: number;
}

export function planProgress(plan: EventPlan): PlanProgress {
  const done = plan.items.filter((item) => item.done).length;
  return {
    total: plan.items.length,
    done,
    open: plan.items.length - done,
    openQuestions: plan.items.filter((item) => item.kind === "ask_organiser" && !item.done).length,
  };
}

/** Where the event sits against today. A plan with no event date is "undated", never "upcoming". */
export function planTiming(plan: Pick<EventPlan, "eventDate">, today: string): PlanTiming {
  if (!isIsoDate(today)) throw new Error("today must be an ISO date");
  if (plan.eventDate === UNKNOWN_DATE || !isIsoDate(plan.eventDate)) return "undated";
  if (plan.eventDate === today) return "today";
  return plan.eventDate > today ? "upcoming" : "past";
}

/** Today's date on this device, YYYY-MM-DD in local time. */
export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
