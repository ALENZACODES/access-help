import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildExport,
  normalizeWheelchair,
  toGeoJson,
  toOsmChange,
  validateContribution,
  type Contribution,
} from './export';

const good: Contribution = {
  id: 'a1',
  lat: 43.85,
  lon: -79.43,
  name: 'Café <Test> & Co',
  wheelchair: 'yes',
  source: 'survey',
  licence: 'CC0-1.0',
  observedOn: '2026-11-14',
};

describe('contribution export', () => {
  it('keeps unknown as UNKNOWN and never infers', () => {
    expect(normalizeWheelchair(undefined)).toBe('UNKNOWN');
    expect(normalizeWheelchair('maybe')).toBe('UNKNOWN');
    expect(normalizeWheelchair('Yes')).toBe('UNKNOWN');
    expect(normalizeWheelchair('limited')).toBe('limited');
  });

  it('rejects closed licences, missing source and bad dates', () => {
    const errors = validateContribution({ ...good, licence: 'All rights reserved', source: ' ', observedOn: '2026-02-31' });
    expect(errors).toHaveLength(3);
    expect(buildExport([{ ...good, id: 'bad', licence: 'CC-BY-NC-4.0' }]).rejected[0]?.id).toBe('bad');
  });

  it('omits wheelchair tags for UNKNOWN and escapes XML', () => {
    const { records } = buildExport([good, { ...good, id: 'a2', wheelchair: undefined }]);
    const xml = toOsmChange(records);
    expect(xml).toContain('v="Café &lt;Test&gt; &amp; Co"');
    expect(xml.match(/k="wheelchair"/g)).toHaveLength(1);
    expect(xml).toContain('k="check_date:wheelchair" v="2026-11-14"');
    expect(xml).toContain('licence CC0-1.0');
  });

  it('keeps source, licence, date and UNKNOWN in GeoJSON', () => {
    const { records } = buildExport([{ ...good, wheelchair: undefined }]);
    const feature = toGeoJson(records).features[0];
    expect(feature?.geometry.coordinates).toEqual([-79.43, 43.85]);
    expect(feature?.properties).toMatchObject({
      wheelchair: 'UNKNOWN',
      source: 'survey',
      licence: 'CC0-1.0',
      observedOn: '2026-11-14',
    });
  });
});

describe('French guide typography', () => {
  const fr = readFileSync(fileURLToPath(new URL('./guide.fr.md', import.meta.url)), 'utf8');
  it('uses the curly apostrophe', () => {
    expect(fr).not.toContain("'");
  });
  it('has no plain space before ; ! ? or :', () => {
    expect(fr).not.toMatch(/ [;!?:]/);
  });
});
