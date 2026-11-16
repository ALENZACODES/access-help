import { describe, expect, it } from 'vitest';
import {
  OPEN_LICENCES,
  formatProvenance,
  isIsoDate,
  isOpenLicence,
  validateProvenance,
  type Provenance,
} from './index';

const good: Provenance = {
  source: 'Municipal open data, entrance survey',
  licence: 'OGL-Canada-2.0',
  date: '2026-11-01',
  url: 'https://example.org/data',
};

describe('isIsoDate', () => {
  it('accepts real dates only', () => {
    expect(isIsoDate('2026-11-15')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-1-1')).toBe(false);
    expect(isIsoDate('15/11/2026')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });
});

describe('isOpenLicence', () => {
  it('accepts listed SPDX ids and nothing else', () => {
    for (const l of OPEN_LICENCES) expect(isOpenLicence(l)).toBe(true);
    expect(isOpenLicence('All rights reserved')).toBe(false);
    expect(isOpenLicence('cc0-1.0')).toBe(false);
    expect(isOpenLicence('')).toBe(false);
  });
});

describe('validateProvenance', () => {
  it('passes a complete record', () => {
    expect(validateProvenance(good, '2026-11-15')).toEqual([]);
  });

  it('flags a missing record as every required problem', () => {
    expect(validateProvenance(null)).toEqual(['source-missing', 'licence-not-open', 'date-invalid']);
    expect(validateProvenance(undefined)).toHaveLength(3);
  });

  it('flags each problem on its own', () => {
    expect(validateProvenance({ ...good, source: '  ' })).toEqual(['source-missing']);
    expect(validateProvenance({ ...good, licence: 'Proprietary' })).toEqual(['licence-not-open']);
    expect(validateProvenance({ ...good, date: '2026-02-30' })).toEqual(['date-invalid']);
    expect(validateProvenance({ ...good, date: '2027-01-01' }, '2026-11-15')).toEqual(['date-in-future']);
    expect(validateProvenance({ ...good, url: 'http://example.org' })).toEqual(['url-invalid']);
  });

  it('allows a record without a url', () => {
    const { url: _unused, ...rest } = good;
    expect(validateProvenance(rest)).toEqual([]);
  });
});

describe('formatProvenance', () => {
  it('formats EN', () => {
    expect(formatProvenance(good, 'en')).toBe(
      'Source: Municipal open data, entrance survey. Licence: OGL-Canada-2.0. Date: 2026-11-01.',
    );
  });

  it('formats FR with no-break spaces before colons', () => {
    const fr = formatProvenance(good, 'fr');
    expect(fr).toBe(
      'Source : Municipal open data, entrance survey. Licence : OGL-Canada-2.0. Date : 2026-11-01.',
    );
  });
});
