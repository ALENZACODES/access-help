import { describe, expect, it } from 'vitest';
import {
  buildExport,
  buildPackManifest,
  explainRecord,
  freshness,
  packAttribution,
  recentWindowDays,
  RECENT_WINDOWS_DAYS,
  serializePack,
  type Contribution,
  type ExplainableRecord,
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

  it('uses Unknown copy when observedOn is null, and never interpolates null', () => {
    const r: ExplainableRecord = { ...records[0]!, observedOn: null };
    const en = explainRecord(r, '2026-11-15', 'en');
    const fr = explainRecord(r, '2026-11-15', 'fr');
    expect(en).toContain('Observed date unknown (date unknown)');
    expect(fr).toContain('Date d’observation inconnue (date inconnue)');
    expect(en).not.toMatch(/null/i);
    expect(fr).not.toMatch(/null/i);
    expect(fr).not.toMatch(frBad);
  });

  it('aligns recent windows with the plan per category', () => {
    expect(RECENT_WINDOWS_DAYS.washroom).toBe(90);
    expect(RECENT_WINDOWS_DAYS.charging).toBe(90);
    expect(RECENT_WINDOWS_DAYS.benefits).toBe(90);
    expect(RECENT_WINDOWS_DAYS.venue).toBe(180);
    expect(RECENT_WINDOWS_DAYS.parking).toBe(180);
    expect(RECENT_WINDOWS_DAYS.repair).toBe(180);
    expect(RECENT_WINDOWS_DAYS.policy).toBe(180);
    expect(RECENT_WINDOWS_DAYS.status).toBe(30);
    expect(RECENT_WINDOWS_DAYS.default).toBe(365);
    expect(recentWindowDays('washroom')).toBe(90);
    expect(recentWindowDays('missing')).toBe(365);
    expect(recentWindowDays(null)).toBe(365);

    // 90-day washroom window: 16 Aug 2026 is 91 days before 15 Nov 2026.
    expect(freshness('2026-08-17', '2026-11-15', 'washroom')).toBe('recent');
    expect(freshness('2026-08-16', '2026-11-15', 'washroom')).toBe('older');
    expect(freshness('2026-08-16', '2026-11-15', 'venue')).toBe('recent');
    expect(freshness('2026-10-16', '2026-11-15', 'status')).toBe('recent');
    expect(freshness('2026-10-15', '2026-11-15', 'status')).toBe('older');
    expect(freshness('2025-11-15', '2026-11-15')).toBe('recent');
    expect(freshness('2025-11-14', '2026-11-15')).toBe('older');

    const washroom: ExplainableRecord = {
      ...records[0]!,
      observedOn: '2026-08-16',
      category: 'washroom',
    };
    expect(explainRecord(washroom, '2026-11-15', 'en')).toContain('older, may be out of date');
    const venue: ExplainableRecord = { ...washroom, category: 'venue' };
    expect(explainRecord(venue, '2026-11-15', 'en')).toContain('(recent)');
  });
});
