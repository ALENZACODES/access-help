import { describe, expect, it } from 'vitest';
import {
  AGAINST_VALUES,
  MAX_OBSERVATIONS,
  MAX_SEEN_NOTE,
  SEEN_FIELDS,
  SEEN_FILTERS,
  SEEN_STORE_KEY,
  SEEN_VALUES,
  againstCounts,
  cleanSeenDraft,
  cleanSeenNote,
  compareSeen,
  emptySeenDraft,
  filterSeenRows,
  findObservation,
  insertObservation,
  isSeen,
  isSeenFilter,
  notLoadedCount,
  observationFromDraft,
  observationsOf,
  parseObservations,
  pruneObservations,
  recordSide,
  removeObservation,
  sameObservation,
  seenDraftProblems,
  seenFieldOf,
  seenRows,
  serialiseObservations,
  setObservation,
  type FeatureClaim,
  type Observation,
  type Observations,
  type Place,
  type Provenance,
  type SeenDraft,
  type SeenProblem,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('elevator', 'absent', city)] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
  { id: 'hall', name: 'Hall', claims: [c('ramp', 'present', city), c('ramp', 'absent', transit), c('grab-bar', 'present')] },
];
const good: SeenDraft = { termId: 'ramp', seen: 'there', date: '2026-11-15', note: '' };
const draft = (o: Partial<SeenDraft> = {}): SeenDraft => ({ ...good, ...o });
const o = (placeId: string, termId: string, seen: Observation['seen'], date = '2026-11-15', note?: string): Observation =>
  note === undefined ? { placeId, termId, seen, date } : { placeId, termId, seen, date, note };
const list: Observations = [o('lib', 'ramp', 'there'), o('lib', 'elevator', 'there', '2026-11-10', 'Near the back'), o('hall', 'ramp', 'not-there'), o('cafe', 'ramp', 'not-sure'), o('cafe', 'elevator', 'not-there')];

describe('what counts as a note', () => {
  it('knows the three answers', () => {
    expect([...SEEN_VALUES]).toEqual(['there', 'not-there', 'not-sure']);
    for (const value of SEEN_VALUES) expect(isSeen(value)).toBe(true);
    for (const value of ['present', 'yes', '', 'There', null, 1, undefined]) expect(isSeen(value), String(value)).toBe(false);
  });
  it('tidies the spaces of a note and cuts nothing', () => {
    expect(cleanSeenNote('  by   the\tside \n door ')).toBe('by the side door');
    expect(cleanSeenNote('x'.repeat(300))).toHaveLength(300);
  });
  it('starts a draft on today', () => {
    expect(emptySeenDraft(today)).toEqual({ termId: '', seen: '', date: today, note: '' });
    expect(Object.keys(emptySeenDraft(today))).toEqual([...SEEN_FIELDS]);
  });
});

describe('seenDraftProblems', () => {
  const problems = (d: Partial<SeenDraft>): readonly SeenProblem[] => seenDraftProblems(draft(d), today);
  it('accepts a feature, an answer and a real day up to today', () => {
    expect(problems({})).toEqual([]);
    expect(problems({ date: today })).toEqual([]);
    expect(problems({ seen: 'not-sure', note: 'x'.repeat(MAX_SEEN_NOTE) })).toEqual([]);
    expect(problems({ termId: ' ramp ', date: ' 2026-11-15 ' })).toEqual([]);
  });
  it('wants a feature of the glossary', () => {
    expect(problems({ termId: '' })).toEqual(['feature-missing']);
    expect(problems({ termId: 'moat' })).toEqual(['feature-missing']);
    expect(problems({ termId: 'unknown' })).toEqual(['feature-missing']);
  });
  it('wants one of the three answers', () => {
    expect(problems({ seen: '' })).toEqual(['seen-missing']);
    expect(problems({ seen: 'present' })).toEqual(['seen-missing']);
  });
  it('wants a real day that is not after today', () => {
    expect(problems({ date: '' })).toEqual(['date-invalid']);
    expect(problems({ date: '2026-02-30' })).toEqual(['date-invalid']);
    expect(problems({ date: '15/11/2026' })).toEqual(['date-invalid']);
    expect(problems({ date: '2026-11-20' })).toEqual(['date-in-future']);
  });
  it('reports a note that is too long and does not shorten it', () => {
    expect(problems({ note: 'x'.repeat(MAX_SEEN_NOTE + 1) })).toEqual(['note-too-long']);
    expect(problems({ note: `${'x'.repeat(MAX_SEEN_NOTE)}   ` })).toEqual([]);
  });
  it('lists every problem at once, in the order of the form', () => {
    expect(seenDraftProblems({ termId: '', seen: '', date: 'soon', note: 'x'.repeat(200) }, today)).toEqual(['feature-missing', 'seen-missing', 'date-invalid', 'note-too-long']);
  });
  it('knows which box each problem belongs to', () => {
    const all: SeenProblem[] = ['feature-missing', 'seen-missing', 'date-invalid', 'date-in-future', 'note-too-long'];
    expect(all.map(seenFieldOf)).toEqual(['termId', 'seen', 'date', 'date', 'note']);
  });
});

describe('drafts and notes', () => {
  it('cleans a draft', () => {
    expect(cleanSeenDraft({ termId: ' ramp ', seen: ' there ', date: ' 2026-11-15 ', note: '  a   b ' })).toEqual({ termId: 'ramp', seen: 'there', date: '2026-11-15', note: 'a b' });
  });
  it('makes a note from a draft, with the words only when there are some', () => {
    expect(observationFromDraft('lib', good)).toEqual({ placeId: 'lib', termId: 'ramp', seen: 'there', date: '2026-11-15' });
    expect('note' in observationFromDraft('lib', draft({ note: '   ' }))).toBe(false);
    expect(observationFromDraft('lib', draft({ note: ' side  door ' })).note).toBe('side door');
  });
  it('tells two notes apart by every part', () => {
    const a = o('lib', 'ramp', 'there');
    expect(sameObservation(a, { ...a })).toBe(true);
    expect(sameObservation(a, { ...a, note: '' })).toBe(true);
    expect(sameObservation(a, { ...a, seen: 'not-there' })).toBe(false);
    expect(sameObservation(a, { ...a, date: '2026-11-14' })).toBe(false);
    expect(sameObservation(a, { ...a, note: 'x' })).toBe(false);
    expect(sameObservation(a, { ...a, placeId: 'hall' })).toBe(false);
    expect(sameObservation(a, { ...a, termId: 'elevator' })).toBe(false);
  });
});

describe('setObservation', () => {
  it('adds a note at the end and leaves the list it was given alone', () => {
    const before = JSON.stringify(list);
    const result = setObservation(list, 'hall', draft({ termId: 'elevator' }), today);
    expect(result.outcome).toBe('added');
    expect(result.list).toHaveLength(list.length + 1);
    expect(result.list.at(-1)).toEqual(o('hall', 'elevator', 'there'));
    expect(JSON.stringify(list)).toBe(before);
  });
  it('replaces the note for the same place and feature, in the same position', () => {
    const result = setObservation(list, 'lib', draft({ seen: 'not-there', date: '2026-11-18' }), today);
    expect(result.outcome).toBe('changed');
    expect(result.before).toEqual(list[0]);
    expect(result.list[0]).toEqual(o('lib', 'ramp', 'not-there', '2026-11-18'));
    expect(result.list.slice(1)).toEqual(list.slice(1));
  });
  it('says so when the note is already held', () => {
    const result = setObservation(list, 'lib', draft({ termId: 'elevator', date: '2026-11-10', note: ' Near  the back ' }), today);
    expect(result.outcome).toBe('same');
    expect(result.list).toBe(list);
  });
  it('keeps nothing for a draft with a problem, or without a place', () => {
    const invalid = setObservation(list, 'lib', draft({ seen: '', date: '2030-01-01' }), today);
    expect(invalid.outcome).toBe('invalid');
    expect(invalid.problems).toEqual(['seen-missing', 'date-in-future']);
    expect(invalid.list).toBe(list);
    const none = setObservation(list, '', good, today);
    expect(none.outcome).toBe('no-place');
    expect(none.list).toBe(list);
  });
  it('stops at the limit, and still lets a held note change', () => {
    const full: Observations = Array.from({ length: MAX_OBSERVATIONS }, (_, i) => o(`p${i}`, 'ramp', 'there'));
    const more = setObservation(full, 'new', good, today);
    expect(more.outcome).toBe('full');
    expect(more.list).toBe(full);
    expect(setObservation(full, 'p3', draft({ seen: 'not-there' }), today).outcome).toBe('changed');
  });
});

describe('removing and putting back', () => {
  it('removes one note by its position', () => {
    const result = removeObservation(list, 1);
    expect(result.removed).toEqual(list[1]);
    expect(result.position).toBe(1);
    expect(result.list).toEqual([list[0], list[2], list[3], list[4]]);
  });
  it('removes nothing for a position that is not in the list', () => {
    for (const index of [-1, 5, 0.5, Number.NaN]) {
      const result = removeObservation(list, index);
      expect(result.removed, String(index)).toBeNull();
      expect(result.list).toBe(list);
    }
  });
  it('puts a note back where it was', () => {
    const result = removeObservation(list, 1);
    expect(insertObservation(result.list, result.removed as Observation, result.position)).toEqual(list);
    expect(insertObservation(result.list, result.removed as Observation, 99).at(-1)).toEqual(list[1]);
    expect(insertObservation(result.list, result.removed as Observation, -3)[0]).toEqual(list[1]);
  });
  it('gives way to the note put back when a newer one was made for the same place and feature', () => {
    const removed = removeObservation(list, 0);
    const again = setObservation(removed.list, 'lib', draft({ seen: 'not-there' }), today).list;
    const back = insertObservation(again, removed.removed as Observation, removed.position);
    expect(back).toEqual(list);
  });
  it('finds a note by place and feature', () => {
    expect(findObservation(list, 'hall', 'ramp')).toBe(2);
    expect(findObservation(list, 'hall', 'elevator')).toBe(-1);
  });
});

describe('notes by place', () => {
  it('lists the notes of one place in the order of the glossary', () => {
    const reversed: Observations = [o('lib', 'elevator', 'there'), o('lib', 'ramp', 'there'), o('hall', 'ramp', 'there')];
    const own = observationsOf(reversed, 'lib').map((x) => x.termId);
    expect([...own].sort()).toEqual(['elevator', 'ramp']);
    expect(own).toEqual(observationsOf([reversed[1] as Observation, reversed[0] as Observation], 'lib').map((x) => x.termId));
    expect(observationsOf(reversed, 'nowhere')).toEqual([]);
  });
  it('keeps only the notes of the given places', () => {
    expect(pruneObservations(list, ['lib'])).toEqual([list[0], list[1]]);
    expect(pruneObservations(list, ['lib', 'hall', 'cafe', 'extra'])).toBe(list);
    expect(pruneObservations(list, [])).toEqual([]);
  });
  it('counts the notes whose place is not loaded', () => {
    expect(notLoadedCount(list, places)).toBe(0);
    expect(notLoadedCount(list, places.slice(0, 1))).toBe(3);
    expect(notLoadedCount(list, [])).toBe(list.length);
  });
});

describe('storing the notes', () => {
  it('has its own key', () => {
    expect(SEEN_STORE_KEY).toBe('glossary-seen');
  });
  it('round-trips', () => {
    expect(parseObservations(serialiseObservations(list))).toEqual(list);
    expect(parseObservations(serialiseObservations([]))).toEqual([]);
  });
  it('writes only the parts of a note', () => {
    const extra = [{ ...o('lib', 'ramp', 'there'), secret: 'x' } as Observation];
    expect(serialiseObservations(extra)).toBe('[{"placeId":"lib","termId":"ramp","seen":"there","date":"2026-11-15"}]');
  });
  it('gives null for text that is not a list', () => {
    for (const text of ['', 'x', '{}', '"a"', '3', 'null']) expect(parseObservations(text), text).toBeNull();
  });
  it('leaves out lines that are not notes', () => {
    const ok = o('lib', 'ramp', 'there');
    const bad: unknown[] = [
      null,
      'x',
      [],
      { ...ok, placeId: '' },
      { ...ok, placeId: 7 },
      { ...ok, placeId: 'x'.repeat(201) },
      { ...ok, termId: 'moat' },
      { ...ok, seen: 'present' },
      { ...ok, date: '2026-13-01' },
      { ...ok, date: 20261115 },
      { ...ok, note: 5 },
      { ...ok, note: 'x'.repeat(MAX_SEEN_NOTE + 1) },
    ];
    expect(parseObservations(JSON.stringify([...bad, ok]))).toEqual([ok]);
  });
  it('tidies stored words and drops empty ones', () => {
    const parsed = parseObservations(JSON.stringify([{ ...o('lib', 'ramp', 'there'), note: '  a   b ' }, { ...o('hall', 'ramp', 'there'), note: '   ' }]));
    expect(parsed?.[0]?.note).toBe('a b');
    expect('note' in (parsed?.[1] as Observation)).toBe(false);
  });
  it('keeps the first of two lines for the same place and feature', () => {
    const parsed = parseObservations(JSON.stringify([o('lib', 'ramp', 'there'), o('lib', 'ramp', 'not-there'), o('lib', 'elevator', 'there')]));
    expect(parsed).toEqual([o('lib', 'ramp', 'there'), o('lib', 'elevator', 'there')]);
  });
  it('stops at the limit', () => {
    const many = Array.from({ length: MAX_OBSERVATIONS + 20 }, (_, i) => o(`p${i}`, 'ramp', 'there'));
    expect(parseObservations(JSON.stringify(many))).toHaveLength(MAX_OBSERVATIONS);
  });
});

describe('a note beside the records', () => {
  const lib = places[0] as Place;
  const cafe = places[1] as Place;
  const hall = places[2] as Place;
  it('reads what the records report by the rules of the list', () => {
    expect(recordSide(lib, 'ramp')).toEqual({ status: 'present', conflict: false });
    expect(recordSide(lib, 'elevator')).toEqual({ status: 'absent', conflict: false });
    expect(recordSide(cafe, 'ramp')).toEqual({ status: 'unknown', conflict: false });
    expect(recordSide(hall, 'ramp')).toEqual({ status: 'unknown', conflict: true });
    expect(recordSide(hall, 'grab-bar')).toEqual({ status: 'unknown', conflict: false });
  });
  it('says the same when both report it there, or both report it not there', () => {
    expect(compareSeen(lib, { termId: 'ramp', seen: 'there' })).toBe('same');
    expect(compareSeen(lib, { termId: 'elevator', seen: 'not-there' })).toBe('same');
  });
  it('says different when they do not match', () => {
    expect(compareSeen(lib, { termId: 'ramp', seen: 'not-there' })).toBe('different');
    expect(compareSeen(lib, { termId: 'elevator', seen: 'there' })).toBe('different');
  });
  it('keeps unknown as unknown: a record with no usable source is not an answer', () => {
    expect(compareSeen(cafe, { termId: 'ramp', seen: 'there' })).toBe('records-unknown');
    expect(compareSeen(hall, { termId: 'grab-bar', seen: 'there' })).toBe('records-unknown');
  });
  it('says so when the sources in the records disagree, whatever the person saw', () => {
    expect(compareSeen(hall, { termId: 'ramp', seen: 'there' })).toBe('records-disagree');
    expect(compareSeen(hall, { termId: 'ramp', seen: 'not-there' })).toBe('records-disagree');
  });
  it('does not compare a note where the person could not tell', () => {
    for (const place of places) expect(compareSeen(place, { termId: 'ramp', seen: 'not-sure' })).toBe('not-compared');
  });
  it('never changes the places', () => {
    const before = JSON.stringify(places);
    seenRows(list, places, 'en');
    expect(JSON.stringify(places)).toBe(before);
  });
});

describe('seenRows', () => {
  const rows = seenRows(list, places, 'en');
  it('gives one row per note of a loaded place, by place name', () => {
    expect(rows.map((r) => `${r.placeName}:${r.observation.termId}`).filter((x) => x.startsWith('Café'))).toHaveLength(2);
    expect(rows.map((r) => r.placeName)).toEqual(['Café Nord', 'Café Nord', 'Hall', 'Library', 'Library']);
    expect(rows).toHaveLength(5);
  });
  it('remembers where each note is in the stored list, and where its place is', () => {
    for (const row of rows) {
      expect(list[row.index]).toBe(row.observation);
      expect(places[row.placeIndex]?.id).toBe(row.observation.placeId);
    }
  });
  it('sets each note beside the records', () => {
    const by = new Map(rows.map((r) => [`${r.observation.placeId}:${r.observation.termId}`, r.against] as const));
    expect(by.get('lib:ramp')).toBe('same');
    expect(by.get('lib:elevator')).toBe('different');
    expect(by.get('hall:ramp')).toBe('records-disagree');
    expect(by.get('cafe:ramp')).toBe('not-compared');
    expect(by.get('cafe:elevator')).toBe('records-unknown');
  });
  it('leaves out the notes of places that are not loaded, and keeps them stored', () => {
    const fewer = seenRows(list, places.slice(0, 1), 'en');
    expect(fewer.map((r) => r.observation.placeId)).toEqual(['lib', 'lib']);
    expect(seenRows(list, [], 'en')).toEqual([]);
  });
  it('uses the first of two loaded places that share an id', () => {
    const twice = [...places, { id: 'lib', name: 'Library copy', claims: [] }];
    expect(seenRows(list, twice, 'en').filter((r) => r.placeName === 'Library copy')).toEqual([]);
  });
  it('counts how the notes stand', () => {
    expect(againstCounts(rows)).toEqual({ same: 1, different: 1, 'records-unknown': 1, 'records-disagree': 1, 'not-compared': 1 });
    expect(againstCounts([])).toEqual({ same: 0, different: 0, 'records-unknown': 0, 'records-disagree': 0, 'not-compared': 0 });
    expect(Object.keys(againstCounts([]))).toEqual([...AGAINST_VALUES]);
  });
  it('narrows the rows to where the records say something else, or show unknown', () => {
    expect(filterSeenRows(rows, 'all')).toBe(rows);
    expect(filterSeenRows(rows, 'different').map((r) => r.against).sort()).toEqual(['different', 'records-disagree']);
    expect(filterSeenRows(rows, 'records-unknown').map((r) => r.against)).toEqual(['records-unknown']);
  });
  it('knows the choices of rows', () => {
    for (const f of SEEN_FILTERS) expect(isSeenFilter(f)).toBe(true);
    for (const f of ['same', '', undefined, 3]) expect(isSeenFilter(f)).toBe(false);
  });
});
