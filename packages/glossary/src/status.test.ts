import { describe, expect, it } from 'vitest';
import {
  describeFeature,
  effectiveStatus,
  mergeClaims,
  normaliseStatus,
  statusSummary,
  type FeatureClaim,
  type Provenance,
} from './index';

const prov: Provenance = { source: 'Site survey notes', licence: 'CC-BY-4.0', date: '2026-10-01' };
const prov2: Provenance = { source: 'Municipal open data', licence: 'OGL-Canada-2.0', date: '2026-09-15' };

const present: FeatureClaim = { termId: 'ramp', status: 'present', provenance: prov };
const absent: FeatureClaim = { termId: 'ramp', status: 'absent', provenance: prov2 };

describe('normaliseStatus', () => {
  it('accepts only exact present/absent or booleans', () => {
    expect(normaliseStatus('present')).toBe('present');
    expect(normaliseStatus(true)).toBe('present');
    expect(normaliseStatus('absent')).toBe('absent');
    expect(normaliseStatus(false)).toBe('absent');
  });

  it('turns everything else into unknown', () => {
    for (const v of [null, undefined, '', 'yes', 'no', 'maybe', 0, 1, {}, [], 'Present']) {
      expect(normaliseStatus(v)).toBe('unknown');
    }
  });
});

describe('effectiveStatus', () => {
  it('keeps present/absent only with a valid source, open licence and date', () => {
    expect(effectiveStatus(present)).toBe('present');
    expect(effectiveStatus(absent)).toBe('absent');
  });

  it('downgrades claims with no or bad provenance to unknown', () => {
    expect(effectiveStatus({ termId: 'ramp', status: 'present' })).toBe('unknown');
    expect(
      effectiveStatus({ termId: 'ramp', status: 'present', provenance: { ...prov, licence: 'Proprietary' } }),
    ).toBe('unknown');
    expect(
      effectiveStatus({ termId: 'ramp', status: 'absent', provenance: { ...prov, date: 'last week' } }),
    ).toBe('unknown');
  });
});

describe('mergeClaims', () => {
  it('returns one claim per term and never infers missing ones', () => {
    const out = mergeClaims(['ramp', 'elevator'], [present]);
    expect(out.map((c) => [c.termId, c.status])).toEqual([
      ['ramp', 'present'],
      ['elevator', 'unknown'],
    ]);
  });

  it('keeps provenance on firm claims', () => {
    expect(mergeClaims(['ramp'], [present])[0]?.provenance).toEqual(prov);
  });

  it('marks disagreeing sources as unknown with a conflict', () => {
    const [c] = mergeClaims(['ramp'], [present, absent]);
    expect(c).toMatchObject({ status: 'unknown', conflict: true });
  });

  it('lets agreeing sources through and ignores unsourced claims', () => {
    const second: FeatureClaim = { termId: 'ramp', status: 'present', provenance: prov2 };
    expect(mergeClaims(['ramp'], [present, second])[0]).toMatchObject({ status: 'present', conflict: false });
    const unsourced: FeatureClaim = { termId: 'ramp', status: 'absent' };
    expect(mergeClaims(['ramp'], [present, unsourced])[0]).toMatchObject({ status: 'present' });
  });
});

describe('statusSummary', () => {
  it('counts using effective status', () => {
    expect(
      statusSummary([present, absent, { termId: 'x', status: 'present' }, { termId: 'y', status: 'unknown' }]),
    ).toEqual({ present: 1, absent: 1, unknown: 2 });
  });
});

describe('describeFeature', () => {
  it('describes present and absent with a source line', () => {
    const p = describeFeature(present, 'en');
    expect(p.text).toBe('Ramp: reported as available.');
    expect(p.source).toBe('Source: Site survey notes. Licence: CC-BY-4.0. Date: 2026-10-01.');
    expect(describeFeature(absent, 'en').text).toBe('Ramp: reported as not available.');
  });

  it('uses French typography', () => {
    expect(describeFeature(present, 'fr').text).toBe('Rampe : signalé comme disponible.');
    expect(describeFeature({ termId: 'ramp', status: 'unknown' }, 'fr').text).toBe('Rampe : inconnu.');
  });

  it('says unknown, with no source, when it is unknown', () => {
    const d = describeFeature({ termId: 'ramp', status: 'present' }, 'en');
    expect(d).toEqual({ text: 'Ramp: unknown.', status: 'unknown' });
  });

  it('reports a conflict', () => {
    const [c] = mergeClaims(['ramp'], [present, absent]);
    expect(c).toBeDefined();
    if (c === undefined) return;
    expect(describeFeature(c, 'en').text).toBe('Ramp: sources disagree.');
    expect(describeFeature(c, 'fr').text).toBe('Rampe : les sources ne concordent pas.');
  });

  it('falls back to the unknown entry for an unrecognised term id', () => {
    expect(describeFeature({ termId: 'nope', status: 'present', provenance: prov }, 'en')).toMatchObject({
      status: 'unknown',
      text: expect.stringContaining('We do not have information'),
    });
  });
});
