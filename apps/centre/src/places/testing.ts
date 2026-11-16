/** Test helpers. Every place built here is Sample data made up for the tests. */
import { buildExport, buildPackManifest, serializePack, type Contribution, type ExportRecord } from "./docs-bridge.js";
import type { KeyValueStorage } from "./store.js";

export const SAMPLE_TODAY = "2026-11-15";

const base: Contribution = {
  id: "s1",
  lat: 43.85,
  lon: -79.43,
  name: "Sample Library",
  wheelchair: "yes",
  source: "sample data for tests",
  licence: "CC0-1.0",
  observedOn: "2026-11-01",
};

export function sampleContributions(): Contribution[] {
  return [
    base,
    { ...base, id: "s2", name: "Sample Café", wheelchair: "limited", observedOn: "2025-06-10" },
    { ...base, id: "s3", name: "Sample Arena", wheelchair: "no", lat: 43.7, lon: -79.4, observedOn: "2023-01-20" },
    { ...base, id: "s4", name: "Sample Clinic Annex", wheelchair: undefined, licence: "ODbL-1.0", observedOn: "2026-10-30" },
    { ...base, id: "s5", name: undefined, wheelchair: "yes", source: "sample field notes", lat: 45.42, lon: -75.69 },
  ];
}

export function sampleRecords(): ExportRecord[] {
  return buildExport(sampleContributions()).records;
}

export function samplePackText(records: readonly ExportRecord[] = sampleRecords()): string {
  return serializePack(records, buildPackManifest("sample-pack", records, SAMPLE_TODAY));
}

export class MemoryStorage implements KeyValueStorage {
  readonly data = new Map<string, string>();
  failWith: Error | null = null;
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWith) throw this.failWith;
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}
