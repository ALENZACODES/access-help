import { describe, expect, it } from 'vitest';
import {
  RECENT_STORE_KEY,
  auditHtml,
  mountPlaceFinder,
  renderFinderShell,
  EMPTY_STATE,
  PLAIN_TERMS,
  PRINT_MIME,
  withoutCode,
  visibleText,
  spacedText,
  type ExportFile,
  type FeatureClaim,
  type FinderElement,
  type FinderRoot,
  type IndexStore,
  type Lang,
  type Place,
} from './index';
import { readFileSync } from 'node:fs';

const prov = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' } as const;
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp')] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
];
const today = '2026-11-15';

class El implements FinderElement {
  innerHTML = '';
  checked = false;
  value = '';
  focused = 0;
  focus(): void {
    this.focused += 1;
  }
}
type Listener = (e: { readonly target: unknown }) => void;
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
const mount = (extra: Partial<Parameters<typeof mountPlaceFinder>[1]> = {}) => {
  const root = new Root();
  const finder = mountPlaceFinder(root, { lang: 'en', places, today, ...extra });
  return { root, finder };
};
const search = (root: Root, value: string): void => {
  root.fire('input', { id: 'gl-pq', value });
  root.fire('change', { id: 'gl-pq', value });
};

describe('the finder: quick choices', () => {
  it('chooses the features of a group and ticks the boxes', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-grp-moving-inside' });
    expect(finder.getState().features).toEqual(PLAIN_TERMS.map((t) => t.id).filter((id) => id === 'elevator' || id === 'clear-door-width'));
    expect(root.querySelector('#gl-f-elevator').checked).toBe(true);
    expect(root.querySelector('[data-gl-groups]').innerHTML).toContain('id="gl-grp-moving-inside" aria-pressed="true"');
  });
  it('unchooses them on a second press', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-grp-moving-inside' });
    root.fire('click', { id: 'gl-grp-moving-inside' });
    expect(finder.getState().features).toEqual([]);
    expect(root.querySelector('#gl-f-elevator').checked).toBe(false);
  });
  it('ignores a group that does not exist', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-grp-nope' });
    expect(finder.getState().features).toEqual([]);
  });
  it('keeps what was typed', () => {
    const { root, finder } = mount();
    search(root, 'café');
    root.fire('click', { id: 'gl-grp-arriving' });
    expect(finder.getState().query).toBe('café');
  });
});

describe('the finder: summary', () => {
  it('is empty at first and follows the choices', () => {
    const { root } = mount();
    expect(root.querySelector('[data-gl-summary]').innerHTML).toBe('');
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    expect(root.querySelector('[data-gl-summary]').innerHTML).toContain('Ranking by: Ramp.');
    root.fire('input', { id: 'gl-pq', value: 'lib' });
    expect(root.querySelector('[data-gl-summary]').innerHTML).toContain('Name contains “lib”.');
  });
  it('follows the list settings', () => {
    const { root } = mount();
    root.fire('change', { id: 'gl-only-saved', checked: true });
    expect(root.querySelector('[data-gl-summary]').innerHTML).toContain('Only saved places.');
  });
  it('clears with the choices', () => {
    const { root } = mount();
    root.fire('change', { id: 'gl-hide', checked: true });
    root.fire('click', { id: 'gl-clear' });
    expect(root.querySelector('[data-gl-summary]').innerHTML).toBe('');
  });
});

describe('the finder: recent searches', () => {
  it('remembers a search when the box is left, not on every key', () => {
    const store = new Mem();
    const { root } = mount({ store });
    root.fire('input', { id: 'gl-pq', value: 'caf' });
    expect(store.getItem(RECENT_STORE_KEY)).toBeNull();
    root.fire('change', { id: 'gl-pq', value: 'café' });
    expect(JSON.parse(store.getItem(RECENT_STORE_KEY) ?? '[]')).toEqual(['café']);
    expect(root.querySelector('[data-gl-recent-searches]').innerHTML).toContain('id="gl-rs-0"');
  });
  it('does not remember a search that is too short', () => {
    const store = new Mem();
    const { root } = mount({ store });
    search(root, 'a');
    expect(store.getItem(RECENT_STORE_KEY)).toBeNull();
  });
  it('searches again with one press and moves focus to the box', () => {
    const { root, finder } = mount();
    search(root, 'library');
    search(root, 'café');
    root.fire('click', { id: 'gl-rs-1' });
    expect(finder.getState().query).toBe('library');
    expect(root.querySelector('#gl-pq').value).toBe('library');
    expect(root.querySelector('#gl-pq').focused).toBeGreaterThan(0);
  });
  it('ignores a position that is not there', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-rs-4' });
    expect(finder.getState().query).toBe('');
  });
  it('clears the list and the store', () => {
    const store = new Mem();
    const { root } = mount({ store });
    search(root, 'café');
    root.fire('click', { id: 'gl-rs-clear' });
    expect(root.querySelector('[data-gl-recent-searches]').innerHTML).toBe('');
    expect(store.getItem(RECENT_STORE_KEY)).toBe('[]');
  });
  it('comes back on the next visit', () => {
    const store = new Mem();
    search(mount({ store }).root, 'café');
    expect(mount({ store }).root.innerHTML).toContain('id="gl-rs-0"');
  });
  it('is not cleared by "Clear choices"', () => {
    const { root } = mount();
    search(root, 'café');
    root.fire('click', { id: 'gl-clear' });
    expect(root.querySelector('[data-gl-recent-searches]').innerHTML).toContain('id="gl-rs-0"');
  });
  it('shows the list in French', () => {
    const root = new Root();
    mountPlaceFinder(root, { lang: 'fr', places, today });
    search(root, 'café');
    expect(root.querySelector('[data-gl-recent-searches]').innerHTML).toContain('Recherches récentes');
  });
});

describe('the finder: printable plan', () => {
  const ready = (lang: Lang = 'en') => {
    const files: ExportFile[] = [];
    const root = new Root();
    mountPlaceFinder(root, { lang, places, today, onExport: (f) => files.push(f) });
    root.fire('click', { id: 'gl-save-1' });
    return { root, files };
  };
  it('shows the button only when export is on and there is a plan', () => {
    const { root } = ready();
    expect(root.querySelector('[data-gl-plan]').innerHTML).toContain('id="gl-print-plan"');
    const plain = mount();
    plain.root.fire('click', { id: 'gl-save-1' });
    expect(plain.root.querySelector('[data-gl-plan]').innerHTML).not.toContain('gl-print-plan');
  });
  it('hands the host an HTML file', () => {
    const { root, files } = ready();
    root.fire('click', { id: 'gl-print-plan' });
    expect(files).toHaveLength(1);
    expect(files[0]?.filename).toBe('visit-plan-en.html');
    expect(files[0]?.mime).toBe(PRINT_MIME);
    expect(files[0]?.text.startsWith('<!doctype html>')).toBe(true);
    expect(files[0]?.text).toContain('Café Nord');
  });
  it('follows the language', () => {
    const { root, files } = ready('fr');
    root.fire('click', { id: 'gl-print-plan' });
    expect(files[0]?.filename).toBe('visit-plan-fr.html');
    expect(files[0]?.text).toContain('Plan de visite');
  });
  it('sends nothing without a host', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-print-plan' });
    expect(root.innerHTML).not.toBe('');
  });
});

describe('the finder shell with the new controls', () => {
  it.each(['en', 'fr'] as Lang[])('is clean markup in %s', (lang) => {
    const html = renderFinderShell({ lang, state: EMPTY_STATE, places, today, recent: ['café'], canExport: true, saved: ['cafe'] });
    expect(auditHtml(html, `shell.${lang}`)).toEqual([]);
    expect(html).toContain('data-gl-groups');
    expect(html).toContain('data-gl-summary');
    expect(html).toContain('data-gl-recent-searches');
  });
});

describe('visibleText ignores code', () => {
  it('drops style and script blocks', () => {
    const html = '<style>a { color: red; }</style><p>Hello</p><script>var x = "a : b";</script>';
    expect(visibleText(html)).toBe('Hello');
    expect(spacedText(html).trim()).toBe('Hello');
  });
  it('is case-insensitive and tolerates attributes and spaces in the closing tag', () => {
    expect(withoutCode('<STYLE type="text/css">x</STYLE >ok')).toBe('ok');
  });
  it('keeps the title and ordinary text', () => {
    expect(visibleText('<title>Plan</title><p>One</p>')).toBe('PlanOne');
  });
  it('does not remove text between two code blocks', () => {
    expect(withoutCode('<style>a</style>middle<style>b</style>')).toBe('middle');
  });
});

describe('the live /glossary route: A to Z index', () => {
  const page = readFileSync(new URL('../../../apps/centre/src/GlossaryPage.tsx', import.meta.url), 'utf8');
  it('draws the index and anchors the first term of each letter', () => {
    expect(page).toContain('renderIndexNav(terms, language)');
    expect(page).toContain('anchorTermIds(groupByLetter(terms))');
    expect(page).toContain('id={anchors.get(term.id)}');
  });
  it('offers the suggestion as a button of at least 44px', () => {
    expect(page).toContain('help.suggestionText');
    expect(page).toMatch(/minHeight: 44[^]*help\.suggestionText/);
  });
});

describe('the finder: ages and spreadsheet file', () => {
  const dated: Place[] = [
    { id: 'lib', name: 'Library', claims: [yes('ramp')] },
    { id: 'cafe', name: 'Café Nord', claims: [] },
  ];
  it('says how old the information is, and follows the list', () => {
    const root = new Root();
    mountPlaceFinder(root, { lang: 'en', places: dated, today });
    expect(root.innerHTML).toContain('Of 2 places: 1 with information from the last year and 1 with no dated information.');
    root.fire('change', { id: 'gl-only-saved', checked: true });
    expect(root.querySelector('[data-gl-ages]').innerHTML).toBe('');
  });
  it('counts every match, not only the page on screen', () => {
    const many: Place[] = Array.from({ length: 30 }, (_, i) => ({ id: `p${i}`, name: `Place ${i}`, claims: [] }));
    const root = new Root();
    mountPlaceFinder(root, { lang: 'en', places: many, today });
    expect(root.innerHTML).toContain('Of 30 places: 30 with no dated information.');
  });
  it('hands the host a CSV file with the byte-order mark', () => {
    const files: ExportFile[] = [];
    const root = new Root();
    mountPlaceFinder(root, { lang: 'en', places: dated, today, onExport: (f) => files.push(f) });
    root.fire('click', { id: 'gl-save-1' });
    expect(root.querySelector('[data-gl-plan]').innerHTML).toContain('id="gl-export-plan-csv"');
    root.fire('click', { id: 'gl-export-plan-csv' });
    expect(files[0]?.filename).toBe('visit-plan-en.csv');
    expect(files[0]?.mime).toBe('text/csv;charset=utf-8');
    expect(files[0]?.text.charCodeAt(0)).toBe(0xfeff);
    expect(files[0]?.text).toContain('Café Nord');
  });
  it('has no CSV button without export or a plan', () => {
    const root = new Root();
    mountPlaceFinder(root, { lang: 'en', places: dated, today });
    root.fire('click', { id: 'gl-save-1' });
    expect(root.querySelector('[data-gl-plan]').innerHTML).not.toContain('gl-export-plan-csv');
  });
});
