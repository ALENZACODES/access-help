import { describe, expect, it } from 'vitest';
import { checkAll, fixedFree } from './batch.js';
import { rec, TODAY } from './fixtures.js';

const list = () => [
  rec({ id: 'clear', observedOn: '2026-11-10' }),
  rec({ id: 'fix', source: '', lat: 43.80123, observedOn: '2026-11-12' }),
  rec({ id: 'look', name: 'LIBRARY', lat: 43.90123, observedOn: '2026-11-05' }),
  rec({ id: 'note', wheelchair: 'UNKNOWN', lat: 43.95123, observedOn: '2026-11-02' }),
];

describe('checkAll', () => {
  const report = checkAll(list(), TODAY);
  it('orders fix, look, note, clear', () => expect(report.items.map((i) => i.record.id)).toEqual(['fix', 'look', 'note', 'clear']));
  it('counts each group', () => expect(report.counts).toEqual({ total: 4, fix: 1, look: 1, note: 1, clear: 1 }));
  it('breaks ties by day, then id', () => {
    const out = checkAll([rec({ id: 'b', observedOn: '2026-11-02' }), rec({ id: 'a', observedOn: '2026-11-02', lat: 43.9 }), rec({ id: 'c', observedOn: '2026-11-01', lat: 44 })], TODAY);
    expect(out.items.map((i) => i.record.id)).toEqual(['c', 'a', 'b']);
  });
  it('attaches tags to each item', () => expect(report.items.find((i) => i.record.id === 'clear')?.tags).toHaveLength(2));
  it('finds close pairs on both records', () => {
    const out = checkAll([rec({ id: 'p' }), rec({ id: 'q', lat: 43.85128 })], TODAY);
    for (const item of out.items) expect(item.findings.map((f) => f.code)).toContain('near-other');
  });
  it('counts by licence, sorted', () => {
    const out = checkAll([rec({ id: 'a', licence: 'ODbL-1.0' }), rec({ id: 'b', lat: 44.00123 }), rec({ id: 'c', lat: 45.00123 })], TODAY);
    expect(out.byLicence).toEqual([{ licence: 'CC0-1.0', count: 2 }, { licence: 'ODbL-1.0', count: 1 }]);
  });
  it('is empty and calm with no records', () => {
    const out = checkAll([], TODAY);
    expect(out.items).toEqual([]);
    expect(out.counts).toEqual({ total: 0, fix: 0, look: 0, note: 0, clear: 0 });
    expect(out.byLicence).toEqual([]);
  });
  it('does not change its input', () => {
    const input = list();
    const copy = JSON.parse(JSON.stringify(input));
    checkAll(input, TODAY);
    expect(input).toEqual(copy);
  });
  it('keeps every record', () => expect(report.items).toHaveLength(4));
});

describe('fixedFree', () => {
  it('drops the records that need fixing', () => {
    expect(fixedFree(checkAll(list(), TODAY)).map((r) => r.id)).toEqual(['look', 'note', 'clear']);
  });
});
