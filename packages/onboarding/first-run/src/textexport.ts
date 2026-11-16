import type { Locale } from "../../switch-first/src/index";
import { compareRows } from "./compare";
import { COPY, t } from "./copy";
import { FACT_KEYS, describeFact, type Fact, type FactKey } from "./facts";
import type { Requirement } from "./filter";
import { statusLabel } from "./plan";
import type { Observation, Place, Resolution } from "./places";

/**
 * Plain text versions of a place and of a comparison, to keep, print or read
 * in another program. They are built from the same places the screens show, so
 * a detail that is Unknown here is Unknown on the screen, and every Yes or No
 * carries its source, licence and date. Nothing is sent anywhere.
 */
const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

function asFact(key: FactKey, o: Observation): Fact {
  return { key, value: o.value, provenance: o.provenance };
}

function describe(key: FactKey, r: Resolution, l: Locale, today: Date): string[] {
  const colon = l === "fr" ? "\u00A0:" : ":";
  if (r.kind === "unknown") {
    const v = describeFact({ key, value: "unknown", provenance: undefined }, l, today);
    return [`${t(COPY.facts[key], l)}${colon} ${v.value}. ${v.detail}`];
  }
  if (r.kind === "agree") {
    const v = describeFact(asFact(key, r.observations[0] as Observation), l, today);
    const n = r.observations.length;
    const more = n > 1 ? ` (${n} ${l === "fr" ? "rapports concordent" : "reports agree"})` : "";
    return [`${t(COPY.facts[key], l)}${colon} ${v.value}. ${v.detail}${more}`];
  }
  const lines = [`${t(COPY.facts[key], l)}${colon} ${t(COPY.places.differ, l)}`];
  for (const o of r.observations) {
    const v = describeFact(asFact(key, o), l, today);
    lines.push(`  - ${v.value}. ${v.detail}`);
  }
  return lines;
}

/** The lines for one place: name, address, every detail and the notes. Shared by the place and shortlist files. */
export function placeBlock(place: Place, l: Locale, today: Date, intro?: string): string[] {
  const lines: string[] = [place.name, rule(place.name)];
  if (place.address) lines.push(place.address);
  lines.push("");
  if (intro) lines.push(intro, "");
  for (const k of FACT_KEYS) lines.push(...describe(k, place.resolutions[k], l, today));
  const withNotes = place.notes.filter((n) => n.note);
  if (withNotes.length > 0) {
    lines.push("", t(COPY.places.notesTitle, l));
    for (const n of withNotes) lines.push(`- ${n.createdOn} · ${n.licence}${l === "fr" ? "\u00A0:" : ":"} ${n.note}`);
  }
  return lines;
}

export function placeToText(place: Place, locale: Locale, today: Date): string {
  const l = locale;
  const lines = placeBlock(place, l, today, t(COPY.textExport.placeIntro, l));
  return [...lines, "", `${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`].join("\n") + "\n";
}

/** Shortlisted places one after another, in the order given. It keeps their order and does not rank them. */
export function shortlistToText(places: readonly Place[], locale: Locale, today: Date): string {
  const l = locale;
  const title = t(COPY.textExport.shortlistTitle, l);
  const lines: string[] = [title, rule(title), "", t(COPY.shortlist.intro, l), ""];
  for (const p of places) lines.push(...placeBlock(p, l, today), "", "* * *", "");
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function shortlistFilename(count: number, locale: Locale): string {
  return `shortlist-${count}-places-${locale}.txt`;
}

export function placeFilename(place: Place, locale: Locale): string {
  return `place-${place.id}-${locale}.txt`;
}

export function compareToText(places: readonly Place[], req: Requirement, locale: Locale, today: Date): string {
  const l = locale;
  const title = t(COPY.compare.title, l);
  const lines: string[] = [title, rule(title), "", places.map((p) => p.name).join(" | "), "", t(COPY.textExport.compareIntro, l), ""];
  for (const row of compareRows(places, req)) {
    const asked = row.wanted ? ` (${t(COPY.compare.wanted, l)}${l === "fr" ? "\u00A0" : ""}: ${t(COPY.values[row.wanted], l)})` : "";
    lines.push(`${t(COPY.facts[row.key], l)}${asked}`, rule(t(COPY.facts[row.key], l), "-"));
    row.cells.forEach((c, i) => {
      const p = places[i] as Place;
      const body = describe(row.key, c.resolution, l, today);
      lines.push(`${p.name}`, ...body.map((b) => `  ${b}`));
      if (c.status) lines.push(`  ${statusLabel(c.status, l)}`);
    });
    lines.push("");
  }
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function compareFilename(places: readonly Place[], locale: Locale): string {
  return `compare-${places.length}-places-${locale}.txt`;
}

export function textExportHref(text: string): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
}

export function decodeTextExportHref(href: string): string | undefined {
  const prefix = "data:text/plain;charset=utf-8,";
  if (!href.startsWith(prefix)) return undefined;
  try {
    return decodeURIComponent(href.slice(prefix.length));
  } catch {
    return undefined;
  }
}
