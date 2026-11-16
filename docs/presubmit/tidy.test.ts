import { describe, expect, it } from 'vitest';
import { rec } from './fixtures.js';
import { needsTidy, tidyChanges, tidyRecord, tidyText } from './tidy.js';

describe('tidyText', () => {
  it('trims and collapses spaces', () => expect(tidyText('  A   B \t C ')).toBe('A B C'));
  it('turns control and zero-width characters into spaces', () => {
    expect(tidyText('A​B')).toBe('A B');
    expect(tidyText('A\u0007B')).toBe('A B');
  });
  it('composes accents', () => expect(tidyText('Café')).toBe('Café'));
  it('leaves a clean name alone', () => expect(tidyText('Sample Library')).toBe('Sample Library'));
});

describe('tidyChanges and tidyRecord', () => {
  it('reports nothing for a clean record', () => {
    expect(tidyChanges(rec())).toEqual([]);
    expect(needsTidy(rec())).toBe(false);
  });
  it('reports each field it would change', () => {
    const r = rec({ name: ' Sample  Library', source: 'own  visit ' });
    expect(tidyChanges(r)).toEqual([
      { field: 'name', before: ' Sample  Library', after: 'Sample Library' },
      { field: 'source', before: 'own  visit ', after: 'own visit' },
    ]);
  });
  it('does not turn a name into nothing', () => {
    expect(tidyChanges(rec({ name: '   ' }))).toEqual([]);
  });
  it('leaves a missing name missing', () => expect(tidyRecord(rec({ name: null })).name).toBeNull());
  it('applies the changes to a copy and keeps every other field', () => {
    const r = rec({ name: ' A  B', wheelchair: 'limited' });
    const out = tidyRecord(r);
    expect(out).toEqual({ ...r, name: 'A B' });
    expect(r.name).toBe(' A  B');
  });
  it('never changes the status or the coordinates', () => {
    const r = rec({ name: ' X ', wheelchair: 'UNKNOWN' });
    const out = tidyRecord(r);
    expect([out.wheelchair, out.lat, out.lon]).toEqual([r.wheelchair, r.lat, r.lon]);
  });
  it('is idempotent', () => {
    const once = tidyRecord(rec({ name: ' A  B ', source: ' s  s' }));
    expect(tidyRecord(once)).toEqual(once);
  });
});
