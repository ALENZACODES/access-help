import { describe, expect, it } from 'vitest';
import { lic, mixed } from './fixtures.js';
import { acceptedOnly, countLicences, mixOf } from './mix.js';

describe('countLicences', () => {
  it('counts each licence, accepted ones first', () => {
    expect(countLicences([...mixed(), lic({ id: 'x', licence: 'CC-BY-4.0' })])).toEqual([
      { licence: 'CC0-1.0', count: 2, accepted: true },
      { licence: 'ODbL-1.0', count: 2, accepted: true },
      { licence: 'CC-BY-4.0', count: 1, accepted: false },
    ]);
  });
  it('is empty for no records', () => expect(countLicences([])).toEqual([]));
});

describe('mixOf', () => {
  it('is empty with no records and asks nothing', () => {
    expect(mixOf([])).toMatchObject({ kind: 'empty', duties: [], combinedLicence: null, total: 0 });
  });
  it('asks nothing for CC0-1.0 only', () => {
    expect(mixOf([lic(), lic({ id: 'r2' })])).toMatchObject({ kind: 'cc0-only', duties: [], combinedLicence: 'CC0-1.0' });
  });
  it('asks for credit, the same licence and an open copy for ODbL-1.0 only', () => {
    expect(mixOf([lic({ licence: 'ODbL-1.0' })])).toMatchObject({ kind: 'odbl-only', duties: ['credit-sources', 'same-licence', 'keep-open'], combinedLicence: 'ODbL-1.0' });
  });
  it('treats a mix of the two like ODbL-1.0', () => {
    expect(mixOf(mixed())).toMatchObject({ kind: 'cc0-and-odbl', duties: ['credit-sources', 'same-licence', 'keep-open'], combinedLicence: 'ODbL-1.0', total: 4 });
  });
  it('does not guess for a licence the App does not accept', () => {
    const mix = mixOf([...mixed(), lic({ id: 'x', licence: 'CC-BY-4.0' }), lic({ id: 'y', licence: '' })]);
    expect(mix).toMatchObject({ kind: 'has-other', duties: ['do-not-share-yet'], combinedLicence: null });
    expect(mix.otherIds).toEqual(['x', 'y']);
  });
  it('is case-sensitive about licence ids, like the rest of the App', () => {
    expect(mixOf([lic({ licence: 'cc0-1.0' })]).kind).toBe('has-other');
  });
  it('does not change its input', () => {
    const records = mixed();
    const copy = JSON.parse(JSON.stringify(records));
    mixOf(records);
    expect(records).toEqual(copy);
  });
});

describe('acceptedOnly', () => {
  it('leaves out records under other licences', () => {
    expect(acceptedOnly([...mixed(), lic({ id: 'x', licence: 'CC-BY-4.0' })]).map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4']);
  });
  it('makes a set the guide can speak about', () => {
    expect(mixOf(acceptedOnly([lic(), lic({ id: 'x', licence: 'nope' })])).kind).toBe('cc0-only');
  });
});
