import { describe, expect, it } from 'vitest';
import {
  HOST_RECORDS_KEY,
  PLACES_HASH,
  WORDING_HASH,
  VIEWS,
  downloadFile,
  finderHash,
  hashForView,
  loadStoredPlaces,
  openStorage,
  safeFilename,
  safeStore,
  speakText,
  speechTag,
  storePlaces,
  todayIso,
  viewFromHash,
  withFinderHash,
  type DownloadHost,
  type SpeechHost,
  type StorageLike,
} from './browserHost';
import type { Place } from './places';

class Mem implements StorageLike {
  readonly m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}
const broken: StorageLike = {
  getItem(): string | null {
    throw new Error('denied');
  },
  setItem(): void {
    throw new Error('full');
  },
};

describe('safeStore', () => {
  it('reads and writes through to storage', () => {
    const mem = new Mem();
    const store = safeStore(mem);
    store.setItem('k', 'v');
    expect(mem.m.get('k')).toBe('v');
    expect(store.getItem('k')).toBe('v');
    expect(store.getItem('other')).toBeNull();
  });
  it('keeps values for the visit when storage refuses', () => {
    const store = safeStore(broken);
    expect(store.getItem('k')).toBeNull();
    store.setItem('k', 'v');
    expect(store.getItem('k')).toBe('v');
  });
  it('works with no storage at all', () => {
    for (const none of [null, undefined]) {
      const store = safeStore(none);
      store.setItem('k', 'v');
      expect(store.getItem('k')).toBe('v');
      expect(store.getItem('x')).toBeNull();
    }
  });
  it('goes back to storage once it takes writes again', () => {
    let full = true;
    const mem = new Mem();
    const flaky: StorageLike = {
      getItem: (k) => mem.getItem(k),
      setItem: (k, v) => {
        if (full) throw new Error('full');
        mem.setItem(k, v);
      },
    };
    const store = safeStore(flaky);
    store.setItem('k', 'one');
    expect(mem.m.has('k')).toBe(false);
    full = false;
    store.setItem('k', 'two');
    expect(mem.m.get('k')).toBe('two');
    expect(store.getItem('k')).toBe('two');
  });
  it('keeps separate stores apart', () => {
    const a = safeStore(null);
    const b = safeStore(null);
    a.setItem('k', 'v');
    expect(b.getItem('k')).toBeNull();
  });
});

describe('openStorage', () => {
  it('gives the storage, or null when the browser throws or has none', () => {
    const mem = new Mem();
    expect(openStorage(() => mem)).toBe(mem);
    expect(openStorage(() => null)).toBeNull();
    expect(openStorage(() => undefined)).toBeNull();
    expect(
      openStorage(() => {
        throw new Error('SecurityError');
      }),
    ).toBeNull();
  });
});

describe('todayIso', () => {
  it('is the local date with leading zeros', () => {
    expect(todayIso(new Date(2026, 10, 19, 3, 22))).toBe('2026-11-19');
    expect(todayIso(new Date(2027, 0, 5, 23, 59))).toBe('2027-01-05');
  });
  it('does not move to the next day late in the evening', () => {
    expect(todayIso(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
  });
});

describe('views and addresses', () => {
  it('has three views', () => {
    expect(VIEWS).toEqual(['terms', 'places', 'wording']);
  });
  it('reads the wording check from its own address only', () => {
    expect(viewFromHash(WORDING_HASH)).toBe('wording');
    expect(hashForView('wording')).toBe('#wording');
    for (const other of ['#wording?x=1', '#Wording', '#wordings', 'wording', '#wording ']) expect(viewFromHash(other), other).toBe('terms');
    expect(finderHash('#wording')).toBe('');
  });
  it('reads the view from the address', () => {
    expect(viewFromHash('#places')).toBe('places');
    expect(viewFromHash('#places?f=ramp')).toBe('places');
    for (const other of ['', '#', '#terms', '#main', '#placesx', '#place', 'places', '#Places']) expect(viewFromHash(other), other).toBe('terms');
  });
  it('writes the address for a view', () => {
    expect(hashForView('places')).toBe(PLACES_HASH);
    expect(hashForView('terms')).toBe('#terms');
    for (const v of VIEWS) expect(viewFromHash(hashForView(v))).toBe(v);
  });
  it('gives the finder its own part of the address', () => {
    expect(finderHash('#places?f=ramp&q=lib')).toBe('f=ramp&q=lib');
    expect(finderHash('#places')).toBe('');
    expect(finderHash('#terms?f=ramp')).toBe('');
    expect(finderHash('')).toBe('');
  });
  it('puts the finder choices after the view, with no stray marks', () => {
    expect(withFinderHash('f=ramp')).toBe('#places?f=ramp');
    expect(withFinderHash('#f=ramp')).toBe('#places?f=ramp');
    expect(withFinderHash('')).toBe('#places');
    expect(withFinderHash('#')).toBe('#places');
    expect(finderHash(withFinderHash('f=ramp&q=a'))).toBe('f=ramp&q=a');
  });
});

describe('places kept on the device', () => {
  const places: Place[] = [
    { id: 'lib', name: 'Library', claims: [{ termId: 'ramp', status: 'present', provenance: { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' } }] },
    { id: 'cafe', name: 'Café Nord', claims: [] },
  ];
  it('comes back as it was stored, each record with its source, licence, date and tier', () => {
    const store = safeStore(new Mem());
    storePlaces(store, places);
    expect(loadStoredPlaces(store)).toEqual(places);
  });
  it('is empty when nothing is stored or the stored table cannot be read', () => {
    const store = safeStore(new Mem());
    expect(loadStoredPlaces(store)).toEqual([]);
    store.setItem(HOST_RECORDS_KEY, '');
    expect(loadStoredPlaces(store)).toEqual([]);
    store.setItem(HOST_RECORDS_KEY, 'not,a,table\n1,2,3\n');
    expect(loadStoredPlaces(store)).toEqual([]);
  });
  it('still works for the visit when storage refuses', () => {
    const store = safeStore(broken);
    storePlaces(store, places);
    expect(loadStoredPlaces(store)).toEqual(places);
  });
});

describe('saving a file', () => {
  const file = { text: 'hello', filename: 'my week (1).txt', mime: 'text/plain;charset=utf-8' };
  const host = (): DownloadHost & { log: string[] } => {
    const log: string[] = [];
    return { log, createUrl: (t, m) => (log.push(`create:${t}:${m}`), 'blob:1'), revokeUrl: (u) => void log.push(`revoke:${u}`), click: (u, n) => void log.push(`click:${u}:${n}`) };
  };
  it('makes an address, clicks it with a safe name, then lets the address go', () => {
    const h = host();
    expect(downloadFile(file, h)).toBe(true);
    expect(h.log).toEqual(['create:hello:text/plain;charset=utf-8', 'click:blob:1:my-week-1-.txt', 'revoke:blob:1']);
  });
  it('returns false and throws nothing when the page cannot do it', () => {
    const h = host();
    h.click = () => {
      throw new Error('blocked');
    };
    expect(downloadFile(file, h)).toBe(false);
    expect(h.log.at(-1)).toBe('revoke:blob:1');
    const none = host();
    none.createUrl = () => {
      throw new Error('no blob');
    };
    expect(downloadFile(file, none)).toBe(false);
    expect(none.log).toEqual([]);
  });
  it('is not stopped by a failure to let the address go', () => {
    const h = host();
    h.revokeUrl = () => {
      throw new Error('gone');
    };
    expect(downloadFile(file, h)).toBe(true);
  });
  it('makes file names safe', () => {
    expect(safeFilename('records-en.csv')).toBe('records-en.csv');
    expect(safeFilename('../../etc/passwd')).toBe('etc-passwd');
    expect(safeFilename('a b/c\\d:e.txt')).toBe('a-b-c-d-e.txt');
    expect(safeFilename('...')).toBe('file.txt');
    expect(safeFilename('')).toBe('file.txt');
    expect(safeFilename('x'.repeat(300))).toHaveLength(100);
  });
});

describe('reading aloud', () => {
  const host = (): SpeechHost & { log: string[] } => {
    const log: string[] = [];
    return { log, cancel: () => void log.push('cancel'), speak: (t, l) => void log.push(`${l}:${t}`) };
  };
  it('stops what is being said, then says the text in the right language', () => {
    const h = host();
    expect(speakText('  Ramp:\n reported  ', 'en', h)).toBe(true);
    expect(h.log).toEqual(['cancel', 'en-CA:Ramp: reported']);
    const f = host();
    speakText('Rampe', 'fr', f);
    expect(f.log).toEqual(['cancel', 'fr-CA:Rampe']);
  });
  it('only stops for empty text', () => {
    const h = host();
    expect(speakText('  ', 'en', h)).toBe(false);
    expect(h.log).toEqual(['cancel']);
  });
  it('returns false and throws nothing when the browser cannot speak', () => {
    const h = host();
    h.speak = () => {
      throw new Error('no voice');
    };
    expect(speakText('x', 'en', h)).toBe(false);
  });
  it('has a language tag for each language', () => {
    expect(speechTag('en')).toBe('en-CA');
    expect(speechTag('fr')).toBe('fr-CA');
  });
});
