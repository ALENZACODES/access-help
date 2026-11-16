/**
 * Sources and licences for the places on this device, taken from the packs.
 * Counts are of merged places, one per id, so a place that appears in two
 * packs is counted once under the record the App shows.
 */
import { packAttribution } from "./docs-bridge.js";
import { moreText } from "./moreStrings.js";
import { mergePacks } from "./packs.js";
import type { Language, ParsedPack } from "./types.js";

export interface CountedName {
  name: string;
  count: number;
}

export interface PackSummary {
  packId: string;
  generatedOn: string;
  count: number;
  licences: string[];
  sources: string[];
}

export interface SourceSummary {
  packs: PackSummary[];
  licences: CountedName[];
  sources: CountedName[];
  /** null when there are no places. */
  oldest: string | null;
  newest: string | null;
}

function counted(values: readonly string[]): CountedName[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en"));
}

export function summarizeSources(packs: readonly ParsedPack[]): SourceSummary {
  const merged = mergePacks(packs);
  const dates = merged.records.map((record) => record.observedOn).sort();
  return {
    packs: packs.map((pack) => ({
      packId: pack.manifest.packId,
      generatedOn: pack.manifest.generatedOn,
      count: pack.records.length,
      licences: [...pack.manifest.licences],
      sources: [...pack.manifest.sources],
    })),
    licences: counted(merged.records.map((record) => record.licence)),
    sources: counted(merged.records.map((record) => record.source)),
    oldest: dates[0] ?? null,
    newest: dates[dates.length - 1] ?? null,
  };
}

/** One block of text a person can paste next to anything they share. */
export function attributionText(packs: readonly ParsedPack[], language: Language): string {
  return packs.map((pack) => `${pack.manifest.packId}\n${packAttribution(pack.manifest, language)}`).join("\n\n");
}

export function licenceNotes(summary: SourceSummary, language: Language): string[] {
  const notes: string[] = [];
  const count = (licence: string) => summary.licences.find((item) => item.name === licence)?.count ?? 0;
  if (count("ODbL-1.0") > 0) notes.push(moreText(language, "sourcesOdbl", { count: count("ODbL-1.0") }));
  if (count("CC0-1.0") > 0) notes.push(moreText(language, "sourcesCc0", { count: count("CC0-1.0") }));
  return notes;
}
