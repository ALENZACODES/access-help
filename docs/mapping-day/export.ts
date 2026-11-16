/**
 * Contribution export for mapping day.
 *
 * Pure functions only: no network access and no upload. The output is a
 * draft file that a person reviews and submits to OpenStreetMap themselves.
 * Anything not explicitly observed stays UNKNOWN and is never written as a tag.
 */

export type Wheelchair = 'yes' | 'limited' | 'no' | 'UNKNOWN';

export const OPEN_LICENCES = ['CC0-1.0', 'ODbL-1.0'] as const;
export type OpenLicence = (typeof OPEN_LICENCES)[number];

export interface Contribution {
  id: string;
  lat: number;
  lon: number;
  name?: string;
  wheelchair?: string;
  source: string;
  licence: string;
  /** Date the place was observed, YYYY-MM-DD. */
  observedOn: string;
}

export interface ExportRecord {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  wheelchair: Wheelchair;
  source: string;
  licence: OpenLicence;
  observedOn: string;
}

export interface ExportResult {
  records: ExportRecord[];
  rejected: { id: string; errors: string[] }[];
}

export function normalizeWheelchair(value: string | undefined): Wheelchair {
  return value === 'yes' || value === 'limited' || value === 'no' ? value : 'UNKNOWN';
}

function isOpenLicence(value: string): value is OpenLicence {
  return (OPEN_LICENCES as readonly string[]).includes(value);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateContribution(c: Contribution): string[] {
  const errors: string[] = [];
  if (c.id.trim() === '') errors.push('id is required');
  if (!Number.isFinite(c.lat) || c.lat < -90 || c.lat > 90) errors.push('lat out of range');
  if (!Number.isFinite(c.lon) || c.lon < -180 || c.lon > 180) errors.push('lon out of range');
  if (c.source.trim() === '') errors.push('source is required');
  if (!isOpenLicence(c.licence)) errors.push(`licence must be one of: ${OPEN_LICENCES.join(', ')}`);
  if (!isIsoDate(c.observedOn)) errors.push('observedOn must be a real YYYY-MM-DD date');
  return errors;
}

export function buildExport(input: readonly Contribution[]): ExportResult {
  const records: ExportRecord[] = [];
  const rejected: ExportResult['rejected'] = [];
  for (const c of input) {
    const errors = validateContribution(c);
    if (errors.length > 0 || !isOpenLicence(c.licence)) {
      rejected.push({ id: c.id, errors });
      continue;
    }
    const name = c.name?.trim() ?? '';
    records.push({
      id: c.id,
      lat: c.lat,
      lon: c.lon,
      name: name === '' ? null : name,
      wheelchair: normalizeWheelchair(c.wheelchair),
      source: c.source.trim(),
      licence: c.licence,
      observedOn: c.observedOn,
    });
  }
  return { records, rejected };
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tag(k: string, v: string): string {
  return `      <tag k="${escapeXml(k)}" v="${escapeXml(v)}"/>`;
}

/** osmChange draft for review in an OSM editor. Not uploaded by this code. */
export function toOsmChange(records: readonly ExportRecord[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<osmChange version="0.6" generator="mapping-day-export">',
    '  <create>',
  ];
  records.forEach((r, i) => {
    lines.push(`    <!-- licence ${r.licence}, observed ${r.observedOn} -->`);
    lines.push(`    <node id="${-(i + 1)}" lat="${r.lat}" lon="${r.lon}" version="1">`);
    if (r.name !== null) lines.push(tag('name', r.name));
    if (r.wheelchair !== 'UNKNOWN') {
      lines.push(tag('wheelchair', r.wheelchair));
      lines.push(tag('check_date:wheelchair', r.observedOn));
    }
    lines.push(tag('source', r.source));
    lines.push('    </node>');
  });
  lines.push('  </create>', '</osmChange>', '');
  return lines.join('\n');
}

/** GeoJSON copy that keeps source, licence and date, including UNKNOWN values. */
export function toGeoJson(records: readonly ExportRecord[]) {
  return {
    type: 'FeatureCollection' as const,
    features: records.map((r) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [r.lon, r.lat] },
      properties: {
        id: r.id,
        name: r.name,
        wheelchair: r.wheelchair,
        source: r.source,
        licence: r.licence,
        observedOn: r.observedOn,
      },
    })),
  };
}
