import { describe, expect, it } from 'vitest';
import {
  FINDER_STORE_KEY,
  PLAIN_TERMS as TERMS,
  buildDataset,
  mountPlaceFinder,
  type FeatureClaim,
  type FinderElement,
  type FinderRoot,
  type HashHost,
  type IndexStore,
  type Place,
} from './index';

class El implements FinderElement {
  innerHTML = '';
  checked = false;
  value = '';
  focused = 0;
  focus(): void {
    this.focused += 1;
  }
}

type Listener = (event: { readonly target: unknown }) => void;

class Root implements FinderRoot {
  innerHTML = '';
  readonly els = new Map<string, El>();
  readonly handlers = new Map<string, Listener[]>();
  querySelector(selector: string): El {
    let el = this.els.get(selector);
    if (el === undefined) {
      el = new El();
      this.els.set(selector, el);
    }
    return el;
  }
  addEventListener(type: string, listener: Listener): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), listener]);
  }
  fire(type: string, target: unknown): void {
    for (const h of this.handlers.get(type) ?? []) h({ target });
  }
  el(selector: string): El {
    return this.querySelector(selector);
  }
}

class Mem implements IndexStore {
  readonly m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}

class Hash implements HashHost {
  value: string;
  readonly writes: string[] = [];
  constructor(initial = '') {
    this.value = initial;
  }
  get(): string {
    return this.value;
  }
  set(h: string): void {
    this.value = h;
    this.writes.push(h);
  }
}

const prov = { source: 'City open data', licence: 'OGL-Canada-2.0', date: '2026-10-01' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const no = (termId: string): FeatureClaim => ({ termId, status: 'absent', provenance: prov });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp'), yes('elevator')] },
  { id: 'cafe', name: 'Café Nord', claims: [yes('ramp'), no('elevator')] },
  { id: 'gym', name: 'Gym', claims: [] },
];
const today = '2026-11-15';
const mount = (extra: Partial<Parameters<typeof mountPlaceFinder>[1]> = {}) => {
  const root = new Root();
  const finder = mountPlaceFinder(root, { lang: 'en', places, today, ...extra });
  return { root, finder };
};
const check = (root: Root, id: string, checked: boolean): void => {
  root.fire('change', { id: `gl-f-${id}`, checked });
};

describe('mountPlaceFinder: first paint', () => {
  it('paints the finder with every place', () => {
    const { root, finder } = mount();
    expect(root.innerHTML).toContain('<section class="gl-finder"');
    expect(root.innerHTML).toContain('3 places shown');
    expect(finder.getState()).toEqual({ features: [], query: '', hideNotAvailable: false });
    expect(finder.getComparison()).toEqual([]);
  });

  it('uses the places of a dataset and shows its source', () => {
    const dataset = buildDataset(places, prov).dataset!;
    const root = new Root();
    mountPlaceFinder(root, { lang: 'en', dataset, today });
    expect(root.innerHTML).toContain('3 places shown');
    expect(root.innerHTML).toContain('Source: City open data');
  });

  it('copes with no data at all', () => {
    const root = new Root();
    mountPlaceFinder(root, { lang: 'fr', today });
    expect(root.innerHTML).toContain('Aucun lieu ne correspond.');
    expect(root.innerHTML).toContain('Aucune donnée de lieu chargée.');
  });

  it('listens for input, change, click and keydown on the root', () => {
    const { root } = mount();
    expect([...root.handlers.keys()].sort()).toEqual(['change', 'click', 'input', 'keydown']);
  });
});

describe('mountPlaceFinder: choosing features', () => {
  it('updates state, ranking, count and results when a feature is checked', () => {
    const { root, finder } = mount();
    check(root, 'ramp', true);
    check(root, 'elevator', true);
    expect(finder.getState().features).toEqual(['ramp', 'elevator'].sort((a, b) => TERMS.findIndex((t) => t.id === a) - TERMS.findIndex((t) => t.id === b)));
    const list = root.el('[data-gl-presults]').innerHTML;
    expect(list.indexOf('Library')).toBeLessThan(list.indexOf('Gym'));
    expect(list.indexOf('Gym')).toBeLessThan(list.indexOf('Café'));
    expect(root.el('[data-gl-pcount]').innerHTML).toBe('3 places shown');
  });

  it('removes a feature when unchecked', () => {
    const { root, finder } = mount();
    check(root, 'ramp', true);
    check(root, 'ramp', false);
    expect(finder.getState().features).toEqual([]);
  });

  it('does not repeat work when input, change and click all fire for one change', () => {
    const hash = new Hash();
    const { root } = mount({ hash });
    for (const type of ['input', 'change', 'click']) root.fire(type, { id: 'gl-f-ramp', checked: true });
    expect(hash.writes).toEqual(['#f=ramp']);
  });

  it('ignores unknown feature ids', () => {
    const { root, finder } = mount();
    check(root, 'nope', true);
    expect(finder.getState().features).toEqual([]);
  });

  it('filters by name and updates the live count', () => {
    const { root, finder } = mount();
    root.fire('input', { id: 'gl-pq', value: 'caf' });
    expect(finder.getState().query).toBe('caf');
    expect(root.el('[data-gl-pcount]').innerHTML).toBe('1 place shown');
    root.fire('input', { id: 'gl-pq', value: 'zzz' });
    expect(root.el('[data-gl-pcount]').innerHTML).toBe('No places match.');
    expect(root.el('[data-gl-presults]').innerHTML).toContain('No places match.');
  });

  it('hides places with a feature reported as not available, keeping unknown ones', () => {
    const { root } = mount();
    check(root, 'elevator', true);
    root.fire('change', { id: 'gl-hide', checked: true });
    const list = root.el('[data-gl-presults]').innerHTML;
    expect(list).toContain('Library');
    expect(list).toContain('Gym');
    expect(list).not.toContain('Café');
    expect(root.el('[data-gl-pcount]').innerHTML).toBe('2 places shown');
  });
});

describe('mountPlaceFinder: ignoring bad events', () => {
  it('does nothing for missing, odd or unrelated targets', () => {
    const { root, finder } = mount();
    const before = JSON.stringify(finder.getState());
    for (const target of [null, undefined, 'x', 3, {}, { id: '' }, { id: 7 }, { id: 'other' }, { id: 'gl-pq' }, { id: 'gl-f-ramp' }, { id: 'gl-hide', checked: 'yes' }, { id: 'gl-cmp-x' }]) {
      root.fire('click', target);
    }
    expect(JSON.stringify(finder.getState())).toBe(before);
  });
});

describe('mountPlaceFinder: clear', () => {
  it('resets state, controls and comparison, and keeps focus on the clear button', () => {
    const hash = new Hash();
    const { root, finder } = mount({ hash });
    check(root, 'ramp', true);
    root.fire('input', { id: 'gl-pq', value: 'lib' });
    root.fire('change', { id: 'gl-hide', checked: true });
    root.fire('click', { id: 'gl-cmp-0' });
    root.el('#gl-pq').value = 'lib';
    root.el('#gl-hide').checked = true;
    root.el('#gl-f-ramp').checked = true;
    root.fire('click', { id: 'gl-clear' });
    expect(finder.getState()).toEqual({ features: [], query: '', hideNotAvailable: false });
    expect(finder.getComparison()).toEqual([]);
    expect(root.el('#gl-pq').value).toBe('');
    expect(root.el('#gl-hide').checked).toBe(false);
    expect(root.el('#gl-f-ramp').checked).toBe(false);
    expect(root.el('#gl-clear').focused).toBe(1);
    expect(hash.value).toBe('');
    expect(root.el('[data-gl-pcount]').innerHTML).toBe('3 places shown');
  });

  it('can be called from code', () => {
    const { root, finder } = mount();
    check(root, 'ramp', true);
    finder.clear();
    expect(finder.getState().features).toEqual([]);
  });
});

describe('mountPlaceFinder: comparison', () => {
  it('selects up to two places, keeps focus on the pressed button, and shows the table', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-cmp-0' });
    expect(finder.getComparison()).toEqual(['lib']);
    expect(root.el('[data-gl-compare]').innerHTML).toContain('Choose two places to compare.');
    expect(root.el('#gl-cmp-0').focused).toBe(1);
    root.fire('click', { id: 'gl-cmp-1' });
    expect(finder.getComparison()).toEqual(['lib', 'cafe']);
    expect(root.el('[data-gl-compare]').innerHTML).toContain('<table class="gl-compare">');
  });

  it('replaces the oldest selection when a third is chosen', () => {
    const { root, finder } = mount();
    for (const i of [0, 1, 2]) root.fire('click', { id: `gl-cmp-${i}` });
    expect(finder.getComparison()).toEqual(['cafe', 'gym']);
  });

  it('deselects on a second click', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-cmp-0' });
    root.fire('click', { id: 'gl-cmp-0' });
    expect(finder.getComparison()).toEqual([]);
    expect(root.el('[data-gl-compare]').innerHTML).toBe('');
  });

  it('ignores buttons for places that do not exist', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-cmp-99' });
    expect(finder.getComparison()).toEqual([]);
  });

  it('compares the chosen features only', () => {
    const { root } = mount();
    check(root, 'elevator', true);
    root.fire('click', { id: 'gl-cmp-0' });
    root.fire('click', { id: 'gl-cmp-1' });
    const html = root.el('[data-gl-compare]').innerHTML;
    expect(html).toContain('<th scope="row">Elevator');
    expect(html).not.toContain('<th scope="row">Ramp');
  });
});

describe('mountPlaceFinder: saving choices', () => {
  it('writes the URL hash and the store as choices change', () => {
    const hash = new Hash();
    const store = new Mem();
    const { root } = mount({ hash, store });
    check(root, 'ramp', true);
    root.fire('input', { id: 'gl-pq', value: 'caf' });
    expect(hash.value).toBe('#f=ramp&q=caf');
    expect(JSON.parse(store.m.get(FINDER_STORE_KEY) ?? 'null')).toEqual({ features: ['ramp'], query: 'caf', hideNotAvailable: false });
  });

  it('starts from the URL hash first', () => {
    const store = new Mem();
    store.setItem(FINDER_STORE_KEY, JSON.stringify({ features: ['elevator'], query: '', hideNotAvailable: false }));
    const { finder, root } = mount({ hash: new Hash('#f=ramp&h=1'), store });
    expect(finder.getState()).toEqual({ features: ['ramp'], query: '', hideNotAvailable: true });
    expect(root.innerHTML).toMatch(/id="gl-f-ramp" checked/);
  });

  it('falls back to the store, then to empty', () => {
    const store = new Mem();
    store.setItem(FINDER_STORE_KEY, JSON.stringify({ features: ['elevator'], query: 'x', hideNotAvailable: false }));
    expect(mount({ hash: new Hash(''), store }).finder.getState().features).toEqual(['elevator']);
    store.setItem(FINDER_STORE_KEY, '{broken');
    expect(mount({ store }).finder.getState().features).toEqual([]);
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
    const { root, finder } = mount({ store: hostile });
    check(root, 'ramp', true);
    expect(finder.getState().features).toEqual(['ramp']);
  });
});

describe('mountPlaceFinder: language, data and connection', () => {
  it('switches language and keeps the choices', () => {
    const { root, finder } = mount();
    check(root, 'ramp', true);
    finder.setLang('fr');
    expect(root.innerHTML).toContain('lang="fr-CA"');
    expect(root.innerHTML).toContain('Rampe');
    expect(root.innerHTML).toMatch(/id="gl-f-ramp" checked/);
  });

  it('replaces the places, clears the comparison and shows the new source', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-cmp-0' });
    const next: Place[] = [{ id: 'z', name: 'Zoo', claims: [] }];
    finder.setPlaces(next, buildDataset(next, prov).dataset);
    expect(finder.getComparison()).toEqual([]);
    expect(root.innerHTML).toContain('1 place shown');
    expect(root.innerHTML).toContain('Zoo');
    expect(root.innerHTML).toContain('Source: City open data');
  });

  it('shows and hides the offline banner', () => {
    let online = false;
    const { root, finder } = mount({ isOnline: () => online });
    expect(root.innerHTML).toContain('data-gl-offline');
    online = true;
    finder.refreshConnection();
    expect(root.innerHTML).not.toContain('data-gl-offline');
  });
});
