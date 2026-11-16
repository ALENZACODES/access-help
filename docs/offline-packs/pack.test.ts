import { describe, expect, it } from 'vitest';
import {
  buildExport,
  buildPackManifest,
  explainRecord,
  freshness,
  packAttribution,
  serializePack,
  type Contribution,
} from '../index';

const base: Contribution = {
  id: 'a',
  lat: 43.85,
  lon: -79.43,
  name: 'Library',
  wheelchair: 'yes',
  source: 'survey',
  licence: 'CC0-1.0',
  observedOn: '2026-11-14',
};

const { records } = buildExport([
  base,
  { ...base, id: 'b', name: undefined, wheelchair: undefined, source: 'field notes', licence: 'ODbL-1.0', observedOn: '2024-01-05' },
]);

const frBad = / [;!?:]|'/;

describe('offline pack', () => {
  it('builds a manifest that keeps sources, licences, dates and UNKNOWN count', () => {
    const m = buildPackManifest('york-demo', records, '2026-11-15');
    expect(m).toMatchObject({
      recordCount: 2,
      unknownCount: 1,
      licences: ['CC0-1.0', 'ODbL-1.0'],
      sources: ['field notes', 'survey'],
      oldestObservation: '2024-01-05',
      newestObservation: '2026-11-14',
    });
  });

  it('rejects a bad id or date and handles an empty pack', () => {
    expect(() => buildPackManifest(' ', records, '2026-11-15')).toThrow(RangeError);
    expect(() => buildPackManifest('x', records, '15/11/2026')).toThrow(RangeError);
    expect(buildPackManifest('x', [], '2026-11-15').newestObservation).toBeNull();
  });

  it('serializes manifest and GeoJSON together, UNKNOWN intact', () => {
    const parsed = JSON.parse(serializePack(records, buildPackManifest('p', records, '2026-11-15')));
    expect(parsed.data.features[1].properties.wheelchair).toBe('UNKNOWN');
    expect(parsed.manifest.packId).toBe('p');
  });

  it('writes attribution in French typography', () => {
    const m = buildPackManifest('p', records, '2026-11-15');
    expect(packAttribution(m, 'fr')).toContain('Licences : CC0-1.0');
    expect(packAttribution(m, 'fr')).not.toMatch(frBad);
    expect(packAttribution(m, 'en')).toContain('Data as of 2026-11-15');
  });
});

describe('data-status explainer', () => {
  it('classifies freshness without guessing', () => {
    expect(freshness('2026-11-14', '2026-11-15')).toBe('recent');
    expect(freshness('2024-01-05', '2026-11-15')).toBe('older');
    expect(freshness(null, '2026-11-15')).toBe('unknown');
    expect(freshness('2027-01-01', '2026-11-15')).toBe('unknown');
    expect(freshness('not a date', '2026-11-15')).toBe('unknown');
  });

  it('says UNKNOWN out loud in both languages', () => {
    const r = records[1]!;
    expect(explainRecord(r, '2026-11-15', 'en')).toContain('UNKNOWN (not observed yet)');
    expect(explainRecord(r, '2026-11-15', 'fr')).toContain('UNKNOWN (pas encore observé)');
  });

  it('keeps French sentences within typography rules and avoids banned wording', () => {
    for (const r of records) {
      const fr = explainRecord(r, '2026-11-15', 'fr');
      expect(fr).not.toMatch(frBad);
      for (const lang of ['en', 'fr'] as const) {
        expect(explainRecord(r, '2026-11-15', lang)).not.toMatch(/verified|vérifié|AAA/i);
      }
    }
    expect(explainRecord(records[0]!, '2026-11-15', 'fr')).toContain('Library : accès de plain-pied signalé');
  });
});
