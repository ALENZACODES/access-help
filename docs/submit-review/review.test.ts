import { describe, expect, it } from 'vitest';
import type { ReviewRecord } from './review.js';
import { SEVERITY_LABEL, distanceBetween, issueText, reviewBatch, reviewRecord, summaryText } from './review.js';

const TODAY = '2026-11-16';
const good: ReviewRecord = {
  id: 'p1',
  lat: 43.856123,
  lon: -79.452341,
  name: 'Corner café',
  wheelchair: 'yes',
  source: 'own site visit',
  licence: 'ODbL-1.0',
  observedOn: '2026-11-01',
};
const codes = (r: ReviewRecord) => reviewRecord(r, { today: TODAY }).map((i) => i.code);

describe('reviewRecord', () => {
  it('has nothing to say about a complete record', () => {
    expect(codes(good)).toEqual([]);
  });
  it('blocks a licence the App does not accept', () => {
    expect(codes({ ...good, licence: 'MIT' })).toEqual(['licence-not-accepted']);
  });
  it('blocks a missing source and flags a link or an unclear one', () => {
    expect(codes({ ...good, source: ' ' })).toEqual(['source-missing', 'tag-problem'].filter((c) => c !== 'tag-problem'));
    expect(codes({ ...good, source: 'https://example.org' })).toEqual(['source-link']);
    expect(codes({ ...good, source: 'a friend' })).toEqual(['source-not-own']);
  });
  it('blocks an invalid or future date and flags an old one', () => {
    expect(codes({ ...good, observedOn: '2026-13-01' })).toContain('date-invalid');
    expect(codes({ ...good, observedOn: '2026-11-17' })).toContain('date-future');
    expect(codes({ ...good, observedOn: TODAY })).toEqual([]);
    expect(codes({ ...good, observedOn: '2025-11-16' })).toEqual([]);
    expect(codes({ ...good, observedOn: '2025-11-15' })).toEqual(['date-old']);
  });
  it('lets the caller change the age limit', () => {
    expect(reviewRecord({ ...good, observedOn: '2026-10-01' }, { today: TODAY, oldAfterDays: 30 }).map((i) => i.code)).toEqual(['date-old']);
  });
  it('blocks an out-of-range position and flags a coarse one', () => {
    expect(codes({ ...good, lat: 91 })).toContain('position-invalid');
    expect(codes({ ...good, lon: Number.NaN })).toContain('position-invalid');
    const coarse = reviewRecord({ ...good, lat: 43.85, lon: -79.45 }, { today: TODAY }).find((i) => i.code === 'position-coarse');
    expect(coarse?.detail.places).toBe(2);
    expect(coarse?.detail.metres).toBe(1113);
  });
  it('notes an UNKNOWN status and a missing name without blocking', () => {
    const issues = reviewRecord({ ...good, wheelchair: 'UNKNOWN', name: null }, { today: TODAY });
    expect(issues.map((i) => i.code).sort()).toEqual(['no-name', 'status-unknown']);
    expect(issues.every((i) => i.severity === 'note')).toBe(true);
  });
  it('gives each issue the severity of its kind', () => {
    const sev = Object.fromEntries(reviewRecord({ ...good, licence: 'x', source: 'https://a.b', wheelchair: 'UNKNOWN' }, { today: TODAY }).map((i) => [i.code, i.severity]));
    expect(sev).toEqual({ 'licence-not-accepted': 'blocker', 'source-link': 'check', 'status-unknown': 'note' });
  });
});

describe('reviewBatch', () => {
  it('is not ready when there are no records', () => {
    const batch = reviewBatch([], { today: TODAY });
    expect(batch.allReady).toBe(false);
    expect(batch.readyCount).toBe(0);
    expect(batch.records).toEqual([]);
  });
  it('is ready when no record has a blocker, even with notes and checks', () => {
    const batch = reviewBatch([good, { ...good, id: 'p2', lat: 44.123456, lon: -80.123456, wheelchair: 'UNKNOWN', source: 'a friend' }], { today: TODAY });
    expect(batch.allReady).toBe(true);
    expect(batch.counts).toEqual({ blocker: 0, check: 1, note: 1 });
    expect(batch.lookAgainCount).toBe(1);
  });
  it('counts blocked records and sorts issues by severity', () => {
    const batch = reviewBatch([{ ...good, id: 'p0', lat: 44.512345, lon: -80.512345, licence: 'x', wheelchair: 'UNKNOWN' }, good], { today: TODAY });
    expect(batch.blockedCount).toBe(1);
    expect(batch.readyCount).toBe(1);
    expect(batch.records[0]?.canSubmit).toBe(false);
    expect(batch.records[0]?.issues.map((i) => i.severity)).toEqual(['blocker', 'note']);
  });
  it('flags near duplicates on both records', () => {
    const batch = reviewBatch([good, { ...good, id: 'p2', lat: good.lat + 0.00005 }], { today: TODAY });
    const first = batch.records[0]?.issues.find((i) => i.code === 'near-duplicate');
    expect(first?.detail.other).toBe('p2');
    expect(batch.records[1]?.issues.find((i) => i.code === 'near-duplicate')?.detail.other).toBe('p1');
    expect(batch.records[0]?.canSubmit).toBe(true);
  });
  it('does not flag records that are far apart, and honours the radius', () => {
    const far = { ...good, id: 'p2', lat: good.lat + 0.001 };
    expect(reviewBatch([good, far], { today: TODAY }).counts.check).toBe(0);
    expect(reviewBatch([good, far], { today: TODAY, duplicateMetres: 500 }).counts.check).toBe(2);
  });
  it('never changes a status', () => {
    const records = [{ ...good, wheelchair: 'UNKNOWN' as const }];
    reviewBatch(records, { today: TODAY });
    expect(records[0]?.wheelchair).toBe('UNKNOWN');
  });
});

describe('text', () => {
  it('writes issue text with its details', () => {
    expect(issueText({ code: 'date-old', severity: 'check', detail: { days: 400 } }, 'en')).toContain('400 days');
    expect(issueText({ code: 'near-duplicate', severity: 'check', detail: { metres: 7, other: 'p9' } }, 'fr')).toContain('p9');
    expect(issueText({ code: 'tag-problem', severity: 'blocker', detail: { code: 'bad-key', key: 'Bad' } }, 'en')).toContain('Bad');
  });
  it('labels each severity', () => {
    expect(SEVERITY_LABEL.en.blocker).toBe('Fix before submitting');
    expect(SEVERITY_LABEL.fr.note).toContain('information');
  });
  it('summarises a batch without saying anything is correct', () => {
    const batch = reviewBatch([good, { ...good, id: 'p2', lat: 44.512345, lon: -80.512345, licence: 'x' }], { today: TODAY });
    expect(summaryText(batch, 'en')).toBe('2 observations: 1 to fix before submitting, 0 to look at again, 1 with nothing to fix.');
    expect(summaryText(reviewBatch([], { today: TODAY }), 'fr')).toContain('aucune observation');
    expect(summaryText(reviewBatch([good], { today: TODAY }), 'fr')).toContain('1 observation :');
  });
  it('formats the distance between two records', () => {
    expect(distanceBetween(good, { ...good, lat: good.lat + 0.0001 }, 'en')).toBe('11 m');
  });
});
