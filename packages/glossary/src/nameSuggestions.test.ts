import { describe, expect, it } from 'vitest';
import {
  MAX_NAME_SUGGESTIONS,
  MIN_NAME_QUERY,
  NAME_UI,
  auditHtml,
  frenchIssues,
  mountPlaceFinder,
  nameId,
  nameRank,
  parseNameId,
  renderNameSuggestions,
  suggestNames,
  type FinderElement,
  type FinderRoot,
  type Lang,
  type Place,
} from './index';

const place = (name: string, id = name): Place => ({ id, name, claims: [] });
const names = (...list: string[]): Place[] => list.map((n, i) => place(n, `p${i}`));

describe('nameRank', () => {
  it('ranks a start, a word start and an inside match', () => {
    expect(nameRank('Café Nord', 'caf')).toBe(0);
    expect(nameRank('The Café Nord', 'caf')).toBe(1);
    expect(nameRank('Nord Café', 'nord caf')).toBe(0);
    expect(nameRank('Bibliothèque', 'lio')).toBe(2);
  });
  it('ignores case, accents and apostrophes', () => {
    expect(nameRank('Église Saint-Jean', 'EGLISE')).toBe(0);
    expect(nameRank("L'Aréna", 'larena')).toBe(0);
  });
  it('matches several words typed in order from a word start', () => {
    expect(nameRank('City Hall East', 'hall east')).toBe(1);
    expect(nameRank('City Hall East', 'east hall')).toBeNull();
  });
  it('needs at least two letters and a real match', () => {
    expect(MIN_NAME_QUERY).toBe(2);
    expect(nameRank('Library', 'l')).toBeNull();
    expect(nameRank('Library', '')).toBeNull();
    expect(nameRank('Library', 'zz')).toBeNull();
  });
});

describe('suggestNames', () => {
  const list = names('Library East', 'Café Nord', 'Cafe Sud', 'The Library', 'Gymnase', 'Bibliothèque');
  it('puts starts before word starts before inside matches', () => {
    expect(suggestNames(list, 'lib', 'en')).toEqual(['Library East', 'The Library']);
    expect(suggestNames(list, 'blio', 'en')).toEqual(['Bibliothèque']);
    expect(suggestNames(names('Oblique', 'Blio Hall', 'Hall Blio'), 'blio', 'en')).toEqual(['Blio Hall', 'Hall Blio']);
  });
  it('sorts equal ranks by name for the language', () => {
    expect(suggestNames(list, 'caf', 'fr')).toEqual(['Café Nord', 'Cafe Sud']);
  });
  it('offers nothing for a query that is too short or matches nothing', () => {
    expect(suggestNames(list, 'l', 'en')).toEqual([]);
    expect(suggestNames(list, 'zzz', 'en')).toEqual([]);
    expect(suggestNames([], 'lib', 'en')).toEqual([]);
  });
  it('does not offer a name that is already what was typed', () => {
    expect(suggestNames(list, 'café nord', 'en')).toEqual([]);
    expect(suggestNames(list, 'CAFE NORD', 'en')).toEqual([]);
  });
  it('offers a repeated name once', () => {
    expect(suggestNames(names('Gym A', 'Gym A', 'gym a2'), 'gym', 'en')).toEqual(['Gym A', 'gym a2']);
  });
  it('offers at most MAX_NAME_SUGGESTIONS', () => {
    const many = names(...Array.from({ length: 12 }, (_, i) => `Park ${i}`));
    expect(suggestNames(many, 'park', 'en').length).toBe(MAX_NAME_SUGGESTIONS);
  });
  it('keeps the name as written', () => {
    expect(suggestNames(names('ÉCOLE du Parc'), 'eco', 'fr')).toEqual(['ÉCOLE du Parc']);
  });
});

describe('name ids', () => {
  it('round-trips', () => {
    expect(parseNameId(nameId(2))).toBe(2);
  });
  it('rejects others', () => {
    for (const bad of ['gl-ns-', 'gl-ns-x', 'gl-ns-label', 'gl-sg-ramp', 'gl-ns-1x']) expect(parseNameId(bad), bad).toBeNull();
  });
});

describe('renderNameSuggestions', () => {
  it('is empty for no names', () => {
    expect(renderNameSuggestions([], 'en')).toBe('');
  });
  it.each(['en', 'fr'] as Lang[])('is a labelled group of buttons in %s', (lang) => {
    const html = renderNameSuggestions(['Café Nord', 'Cafe Sud'], lang);
    expect(html).toContain('id="gl-ns-0"');
    expect(html).toContain('id="gl-ns-1"');
    expect(html).toContain(NAME_UI[lang].label);
    expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'names')).toEqual([]);
  });
  it('escapes names', () => {
    const html = renderNameSuggestions(['<b>x</b> & y'], 'en');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;');
  });
  it('labels each button with what it does', () => {
    expect(renderNameSuggestions(['Gym'], 'en')).toContain('aria-label="Search for Gym"');
  });
  it('is clean French', () => {
    expect(frenchIssues(NAME_UI.fr.label)).toEqual([]);
    expect(frenchIssues(NAME_UI.fr.pick('Café'))).toEqual([]);
  });
});

class El implements FinderElement {
  innerHTML = '';
  checked = false;
  value = '';
  focused = 0;
  focus(): void {
    this.focused += 1;
  }
}
class Root implements FinderRoot {
  innerHTML = '';
  readonly els = new Map<string, El>();
  readonly handlers = new Map<string, ((e: { readonly target: unknown }) => void)[]>();
  querySelector(selector: string): El {
    let el = this.els.get(selector);
    if (el === undefined) {
      el = new El();
      this.els.set(selector, el);
    }
    return el;
  }
  addEventListener(type: string, listener: (e: { readonly target: unknown }) => void): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), listener]);
  }
  fire(type: string, target: unknown): void {
    for (const h of this.handlers.get(type) ?? []) h({ target });
  }
}

describe('the finder: name suggestions', () => {
  const places = names('Library East', 'Café Nord', 'Cafe Sud');
  const mount = () => {
    const root = new Root();
    const finder = mountPlaceFinder(root, { lang: 'en', places, today: '2026-11-15' });
    return { root, finder };
  };
  it('shows matching names as the person types', () => {
    const { root } = mount();
    expect(root.querySelector('[data-gl-names]').innerHTML).toBe('');
    root.fire('input', { id: 'gl-pq', value: 'caf' });
    expect(root.querySelector('[data-gl-names]').innerHTML).toContain('Café Nord');
  });
  it('searches for the name chosen and moves focus to the box', () => {
    const { root, finder } = mount();
    root.fire('input', { id: 'gl-pq', value: 'caf' });
    root.fire('click', { id: 'gl-ns-0' });
    expect(finder.getState().query).toBe('Café Nord');
    expect(root.querySelector('#gl-pq').value).toBe('Café Nord');
    expect(root.querySelector('#gl-pq').focused).toBeGreaterThan(0);
    expect(root.querySelector('[data-gl-names]').innerHTML).toBe('');
  });
  it('ignores a button that is not there', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-ns-3' });
    expect(finder.getState().query).toBe('');
  });
  it('is on the first paint when a search was restored', () => {
    const root = new Root();
    mountPlaceFinder(root, { lang: 'en', places, today: '2026-11-15', hash: { get: () => '#q=caf', set: () => undefined } });
    expect(root.innerHTML).toContain('id="gl-ns-0"');
  });
});
