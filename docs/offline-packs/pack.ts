/**
 * Offline pack builder. Pure functions: no network access, no tile servers.
 * A pack is the reviewed records as GeoJSON plus a manifest that keeps every
 * source, licence and observation date. UNKNOWN values are carried as UNKNOWN.
 */
import { toGeoJson, type ExportRecord } from '../mapping-day/export';

export type Lang = 'en' | 'fr';

export interface PackManifest {
  packId: string;
  /** YYYY-MM-DD */
  generatedOn: string;
  recordCount: number;
  unknownCount: number;
  licences: string[];
  sources: string[];
  oldestObservation: string | null;
  newestObservation: string | null;
}

const NBSP = ' ';

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export function buildPackManifest(
  packId: string,
  records: readonly ExportRecord[],
  generatedOn: string,
): PackManifest {
  if (packId.trim() === '') throw new RangeError('packId is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(generatedOn)) throw new RangeError('generatedOn must be YYYY-MM-DD');
  const dates = records.map((r) => r.observedOn).sort();
  return {
    packId,
    generatedOn,
    recordCount: records.length,
    unknownCount: records.filter((r) => r.wheelchair === 'UNKNOWN').length,
    licences: sortedUnique(records.map((r) => r.licence)),
    sources: sortedUnique(records.map((r) => r.source)),
    oldestObservation: dates[0] ?? null,
    newestObservation: dates[dates.length - 1] ?? null,
  };
}

export function serializePack(records: readonly ExportRecord[], manifest: PackManifest): string {
  return JSON.stringify({ manifest, data: toGeoJson(records) }, null, 2);
}

/** Short attribution line to show next to an offline pack. */
export function packAttribution(manifest: PackManifest, lang: Lang): string {
  const licences = manifest.licences.join(', ');
  const sources = manifest.sources.join(', ');
  if (lang === 'fr') {
    return `Licences${NBSP}: ${licences}. Sources${NBSP}: ${sources}. Données du ${manifest.generatedOn}.`;
  }
  return `Licences: ${licences}. Sources: ${sources}. Data as of ${manifest.generatedOn}.`;
}
