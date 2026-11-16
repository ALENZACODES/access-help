import { describe, expect, it } from 'vitest';
import {
  buildIndex,
  checksum,
  isIndexCurrent,
  listFromIndex,
  loadOrBuildIndex,
  parseIndex,
  searchIndex,
  serialiseIndex,
  type IndexStore,
} from './index';
import { TERMS, type GlossaryTerm } from './plainTerms';

class MemoryStore implements IndexStore {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('checksum', () => {
  it('is stable and sensitive', () => {
    expect(checksum('abc')).toBe(checksum('abc'));
    expect(checksum('abc')).not.toBe(checksum('abd'));
    expect(checksum('')).toBe('811c9dc5');
    expect(checksum('abc')).toHaveLength(8);
  });
});

describe('buildIndex / parseIndex', () => {
  it('indexes every term in the requested language', () => {
    const fr = buildIndex('fr');
    expect(fr.entries).toHaveLength(TERMS.length);
    expect(fr.entries.find((e) => e.id === 'ramp')?.term).toBe('Rampe');
    expect(fr.entries.find((e) => e.id === 'grab-bar')?.name).toEqual(['barre', 'd', 'appui']);
  });

  it('round-trips through JSON', () => {
    const ix = buildIndex('en');
    expect(parseIndex(serialiseIndex(ix))).toEqual(ix);
  });

  it('rejects garbage, wrong shapes and edited content', () => {
    expect(parseIndex('not json')).toBeNull();
    expect(parseIndex('{}')).toBeNull();
    expect(parseIndex('null')).toBeNull();
    const ix = buildIndex('en');
    const tampered = serialiseIndex(ix).replace('Ramp', 'Rump');
    expect(parseIndex(tampered)).toBeNull();
    expect(parseIndex(JSON.stringify({ ...ix, version: 2 }))).toBeNull();
    expect(parseIndex(JSON.stringify({ ...ix, lang: 'de' }))).toBeNull();
    expect(parseIndex(JSON.stringify({ ...ix, entries: [{ id: 1 }] }))).toBeNull();
  });
});

describe('isIndexCurrent', () => {
  it('detects a changed glossary or a different language', () => {
    const ix = buildIndex('en');
    expect(isIndexCurrent(ix, 'en')).toBe(true);
    expect(isIndexCurrent(ix, 'fr')).toBe(false);
    const edited: GlossaryTerm[] = TERMS.map((t) =>
      t.id === 'ramp' ? { ...t, en: { ...t.en, plain: 'Changed.' } } : t,
    );
    expect(isIndexCurrent(ix, 'en', edited)).toBe(false);
  });
});

describe('searchIndex', () => {
  const en = buildIndex('en');
  const fr = buildIndex('fr');

  it('finds by name and ranks name matches above description matches', () => {
    const hits = searchIndex(en, 'door');
    expect(hits.map((h) => h.id)).toContain('automatic-door');
    expect(hits[0]?.score).toBeGreaterThanOrEqual(hits[hits.length - 1]?.score ?? 0);
    expect(searchIndex(en, 'ramp')[0]?.id).toBe('ramp');
  });

  it('matches prefixes', () => {
    expect(searchIndex(en, 'elev')[0]?.id).toBe('elevator');
  });

  it('ignores accents and case', () => {
    expect(searchIndex(fr, 'ENTREE')[0]?.id).toBe('step-free-entrance');
    expect(searchIndex(fr, 'ascenseur')[0]?.id).toBe('elevator');
  });

  it('requires every word to match', () => {
    expect(searchIndex(en, 'grab bar').map((h) => h.id)).toContain('grab-bar');
    expect(searchIndex(en, 'grab zebra')).toEqual([]);
  });

  it('returns nothing for empty queries and honours limit', () => {
    expect(searchIndex(en, '')).toEqual([]);
    expect(searchIndex(en, '   ')).toEqual([]);
    expect(searchIndex(en, 'a', 2).length).toBeLessThanOrEqual(2);
    expect(searchIndex(en, 'door', 0)).toEqual([]);
  });

  it('lists everything sorted', () => {
    const all = listFromIndex(en);
    expect(all).toHaveLength(TERMS.length);
    expect(all.map((h) => h.term)).toEqual([...all.map((h) => h.term)].sort((a, b) => a.localeCompare(b, 'en')));
  });
});

describe('loadOrBuildIndex', () => {
  it('builds with no store', () => {
    expect(loadOrBuildIndex('en').source).toBe('built');
  });

  it('caches, then reads from the cache', () => {
    const store = new MemoryStore();
    expect(loadOrBuildIndex('fr', store).source).toBe('built');
    expect(store.data.has('glossary-index-fr')).toBe(true);
    expect(loadOrBuildIndex('fr', store).source).toBe('cache');
  });

  it('replaces a corrupt or stale cache', () => {
    const store = new MemoryStore();
    store.setItem('glossary-index-en', '{"broken"');
    expect(loadOrBuildIndex('en', store).source).toBe('built');
    expect(loadOrBuildIndex('en', store).source).toBe('cache');
    const wrongLang = new MemoryStore();
    wrongLang.setItem('glossary-index-en', serialiseIndex(buildIndex('fr')));
    expect(loadOrBuildIndex('en', wrongLang).source).toBe('built');
  });

  it('survives storage that throws', () => {
    const hostile: IndexStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadOrBuildIndex('en', hostile).source).toBe('built');
  });
});
