import { exportNotes } from "./exchange";
import { FACT_KEYS, isIsoDate, type FactKey } from "./facts";
import { parseNote, type Note } from "./model";
import type { Observation, Place } from "./places";

/**
 * "As it stood on a day": what a notes export said on one day in the past,
 * judged only by the date each record was recorded on. A record dated after
 * that day is left out, so a detail it was the only record of is Unknown
 * again. The App does not guess what was known on a day from anything else.
 */

export type DayState = "yes" | "no" | "differ" | "unknown";
export const DAY_STATES: readonly DayState[] = ["yes", "no", "differ", "unknown"];

export type DayProblem = "empty" | "not-date" | "after-today";

export interface DetailOnDay {
  readonly key: FactKey;
  /** Places in each state on that day. */
  readonly counts: Readonly<Record<DayState, number>>;
}

export interface FileOnDay {
  readonly day: string;
  readonly places: number;
  /** Places × details: every detail that could have a record. */
  readonly details: number;
  /** Details of places with at least one record dated on or before the day. */
  readonly recorded: number;
  readonly differing: number;
  /** Records dated after the day, left out. */
  readonly later: number;
  readonly byDetail: readonly DetailOnDay[];
}

/** What is wrong with a typed day, if anything. A day must be written like 2026-03-31 and not be after today. */
export function dayProblem(day: string, today: Date): DayProblem | undefined {
  const d = day.trim();
  if (d === "") return "empty";
  if (!isIsoDate(d)) return "not-date";
  if (d > today.toISOString().slice(0, 10)) return "after-today";
  return undefined;
}

/** The state of one detail of one place on the day, from its records dated on or before it. */
export function stateOn(observations: readonly Observation[], day: string): DayState {
  const known = observations.filter((o) => o.provenance.recordedOn <= day);
  const first = known[0];
  if (!first) return "unknown";
  return known.every((o) => o.value === first.value) ? first.value : "differ";
}

export function placesOnDay(places: readonly Place[], day: string): FileOnDay {
  const counts = new Map<FactKey, Record<DayState, number>>(FACT_KEYS.map((k) => [k, { yes: 0, no: 0, differ: 0, unknown: 0 }]));
  let later = 0;
  for (const place of places) {
    for (const key of FACT_KEYS) {
      const r = place.resolutions[key];
      const obs = r.kind === "unknown" ? [] : r.observations;
      later += obs.filter((o) => o.provenance.recordedOn > day).length;
      const c = counts.get(key);
      if (c) c[stateOn(obs, day)] += 1;
    }
  }
  const byDetail = FACT_KEYS.map((key): DetailOnDay => ({ key, counts: counts.get(key) ?? { yes: 0, no: 0, differ: 0, unknown: 0 } }));
  const sum = (s: DayState): number => byDetail.reduce((n, d) => n + d.counts[s], 0);
  return { day, places: places.length, details: places.length * FACT_KEYS.length, recorded: sum("yes") + sum("no") + sum("differ"), differing: sum("differ"), later, byDetail };
}

export interface NotesOnDay {
  readonly notes: readonly Note[];
  /** Yes or No answers set back to Unknown because their record is dated after the day. */
  readonly cleared: number;
}

/**
 * The places' notes as they stood on the day: every note stays, with its
 * name, address, licence and date; a Yes or No whose record is dated after
 * the day becomes Unknown. Notes go through the App's own reader, so the copy
 * holds nothing the App would refuse.
 */
export function notesOnDay(places: readonly Place[], day: string): NotesOnDay {
  let cleared = 0;
  const notes: Note[] = [];
  for (const n of places.flatMap((p) => p.notes)) {
    const facts = n.facts.map((f) => {
      if (f.value === "unknown" || !f.provenance || f.provenance.recordedOn <= day) return f;
      cleared += 1;
      return { key: f.key, value: "unknown" as const };
    });
    // A note the App read once reads again with fewer answers; if it ever did not, it is left out
    // rather than kept with records dated after the day.
    const next = parseNote({ ...n, facts });
    if (next) notes.push(next);
  }
  return { notes, cleared };
}

/** The copy as a notes file, dated today. */
export function fileOnDay(places: readonly Place[], day: string, today: Date): string {
  return exportNotes([...notesOnDay(places, day).notes], today.toISOString().slice(0, 10));
}
