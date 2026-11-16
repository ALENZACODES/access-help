import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE,
  MAX_QUERY_LENGTH,
  TERMS,
  decodeState,
  encodeState,
  isEmptyState,
  normaliseState,
  parseStoredState,
  serialiseState,
  toggleFeature,
  type FinderState,
} from './index';

const state = (over: Partial<FinderState> = {}): FinderState => normaliseState({ ...EMPTY_STATE, ...over });

describe('normaliseState', () => {
  it('keeps only known features, once each, in glossary order', () => {
    const s = normaliseState({ features: ['elevator', 'nope', 'ramp', 'elevator'] });
    const order = TERMS.map((t) => t.id);
    expect(s.features.every((f) => order.includes(f))).toBe(true);
    expect(new Set(s.features).size).toBe(2);
    expect(s.features).toEqual(order.filter((id) => id === 'ramp' || id === 'elevator'));
  });

  it('caps the query and requires a real boolean for the flag', () => {
    expect(normaliseState({ query: 'x'.repeat(500) }).query).toHaveLength(MAX_QUERY_LENGTH);
    expect(normaliseState({ hideNotAvailable: 'yes' as unknown as boolean }).hideNotAvailable).toBe(false);
    expect(normaliseState({}).hideNotAvailable).toBe(false);
  });
});

describe('isEmptyState / toggleFeature', () => {
  it('knows when nothing is chosen', () => {
    expect(isEmptyState(EMPTY_STATE)).toBe(true);
    expect(isEmptyState(state({ query: '   ' }))).toBe(true);
    expect(isEmptyState(state({ query: 'a' }))).toBe(false);
    expect(isEmptyState(state({ hideNotAvailable: true }))).toBe(false);
    expect(isEmptyState(state({ features: ['ramp'] }))).toBe(false);
  });

  it('adds and removes a feature without touching the rest', () => {
    const on = toggleFeature(state({ query: 'lib' }), 'ramp');
    expect(on.features).toEqual(['ramp']);
    expect(on.query).toBe('lib');
    expect(toggleFeature(on, 'ramp').features).toEqual([]);
  });

  it('ignores toggling an unknown id', () => {
    expect(toggleFeature(EMPTY_STATE, 'nope').features).toEqual([]);
  });
});

describe('encodeState / decodeState', () => {
  it('is empty for an empty state', () => {
    expect(encodeState(EMPTY_STATE)).toBe('');
    expect(decodeState('')).toEqual(EMPTY_STATE);
  });

  it('round-trips features, query and flag', () => {
    const s = state({ features: ['ramp', 'elevator'], query: 'café & bar = ok', hideNotAvailable: true });
    const encoded = encodeState(s);
    expect(encoded).toContain('f=');
    expect(encoded).not.toContain(' ');
    expect(decodeState(encoded)).toEqual(s);
    expect(decodeState(`#${encoded}`)).toEqual(s);
    expect(decodeState(`?${encoded}`)).toEqual(s);
  });

  it('drops unknown features, unknown keys and broken parts', () => {
    expect(decodeState('f=ramp,nope&zzz=1&bad&h=0').features).toEqual(['ramp']);
    expect(decodeState('h=1').hideNotAvailable).toBe(true);
    expect(decodeState('h=0').hideNotAvailable).toBe(false);
  });

  it('survives bad percent-encoding and treats + as a space', () => {
    expect(decodeState('q=%E0%A4%A').query).toBe('');
    expect(decodeState('q=a+b').query).toBe('a b');
  });

  it('does not emit a blank query', () => {
    expect(encodeState(state({ query: '   ' }))).toBe('');
  });
});

describe('stored state', () => {
  it('round-trips', () => {
    const s = state({ features: ['grab-bar'], query: 'x', hideNotAvailable: true });
    expect(parseStoredState(serialiseState(s))).toEqual(s);
  });

  it('rejects anything we did not write', () => {
    for (const bad of ['', 'nope', 'null', '[]', '{}', '{"features":"ramp","query":"","hideNotAvailable":false}', '{"features":[1],"query":"","hideNotAvailable":false}', '{"features":[],"query":1,"hideNotAvailable":false}', '{"features":[],"query":"","hideNotAvailable":"no"}']) {
      expect(parseStoredState(bad), bad).toBeNull();
    }
  });

  it('cleans unknown feature ids from stored data', () => {
    expect(parseStoredState('{"features":["ramp","zzz"],"query":"","hideNotAvailable":false}')?.features).toEqual(['ramp']);
  });
});
