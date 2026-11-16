/**
 * The visit plan: questions to ask a place before going, for the places a
 * person saved. The questions are the same neutral list for every place. What
 * changes is the lead line, which says what the packs record, and whether the
 * record is old. A place whose status is UNKNOWN is never described as open
 * or closed to anyone. The App gives no medical or eligibility advice.
 */
import { freshness } from "./docs-bridge.js";
import { coordinatesText } from "./detail.js";
import { QUESTION_KEYS, moreText, type MoreKey } from "./moreStrings.js";
import type { ResolvedSaved } from "./saved.js";
import type { Language, Wheelchair } from "./types.js";

export interface PlanItem {
  id: string;
  name: string;
  status: Wheelchair;
  lead: string;
  /** Set when the record is older than a year or its date is UNKNOWN. */
  staleNote: string | null;
  questions: string[];
  note: string;
  coordinates: string | null;
}

export function leadKey(resolved: ResolvedSaved): MoreKey {
  if (resolved.place === null) return "leadNotLoaded";
  if (resolved.place.conflict !== null) return "leadConflict";
  switch (resolved.status) {
    case "yes":
      return "leadYes";
    case "limited":
      return "leadLimited";
    case "no":
      return "leadNo";
    default:
      return "leadUnknown";
  }
}

export function buildPlan(resolved: readonly ResolvedSaved[], pickedIds: ReadonlySet<string>, today: string, language: Language): PlanItem[] {
  const t = (key: MoreKey, vars?: Record<string, string | number>) => moreText(language, key, vars);
  const fallbackName = language === "fr" ? "Lieu sans nom" : "Unnamed place";
  return resolved
    .filter((item) => pickedIds.has(item.saved.id))
    .map((item) => {
      const record = item.place?.record ?? null;
      const status: Wheelchair = item.place?.conflict ? "UNKNOWN" : item.status;
      const stale = record === null ? false : freshness(record.observedOn, today) !== "recent";
      return {
        id: item.saved.id,
        name: record?.name ?? item.saved.name ?? fallbackName,
        status,
        lead: t(leadKey(item), { date: record?.observedOn ?? "" }),
        staleNote: stale ? t("staleNote") : null,
        questions: QUESTION_KEYS.map((key) => t(key)),
        note: item.saved.note,
        coordinates: record === null ? null : coordinatesText(record.lat, record.lon, language),
      };
    });
}

/** The plan as plain text, for copying into a message or a note. */
export function planText(items: readonly PlanItem[], today: string, language: Language): string {
  const t = (key: MoreKey, vars?: Record<string, string | number>) => moreText(language, key, vars);
  const out: string[] = [t("planTitle"), t("planMadeOn", { date: today }), ""];
  for (const item of items) {
    out.push(item.name, item.lead);
    if (item.staleNote !== null) out.push(item.staleNote);
    if (item.coordinates !== null) out.push(t("detailCoordinates", { coords: item.coordinates }));
    if (item.note !== "") out.push(t("planNoteLine", { note: item.note }));
    item.questions.forEach((question, index) => out.push(`${index + 1}. ${question}`));
    out.push("");
  }
  out.push(t("planFooter"));
  return out.join("\n");
}
