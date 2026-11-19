import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE,
  NOTES_STORE_KEY,
  auditHtml,
  frenchIssues,
  mountPlaceFinder,
  renderFinderShell,
  resultsView,
  type ExportFile,
  type FeatureClaim,
  type FinderElement,
  type FinderRoot,
  type IndexStore,
  type Place,
} from './index';

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
  addEventListener(type: string, l: (e: { readonly target: unknown }) => void): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), l]);
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

describe('place cards: questions and notes', () => {
  it('shows questions for unknown features and none for answered ones', () => {
    const r = resultsView(places, { ...EMPTY_STATE, features: ['ramp', 'elevator'] }, 'en', today, []);
    const [lib, cafe] = r.list.split('</li><li>');
    expect(lib).toContain('Questions to ask this place (1)');
    expect(lib).toContain('Is there an elevator?');
    expect(lib).not.toContain('Is there a ramp?');
    expect(cafe).toContain('Questions to ask this place (2)');
  });

  it('asks about every feature when none is chosen', () => {
    const r = resultsView([places[1] as Place], EMPTY_STATE, 'en', today, []);
    expect(r.list).toContain('Questions to ask this place (8)');
  });

  it('gives each place a labelled note box that holds the saved note', () => {
    const r = resultsView(places, EMPTY_STATE, 'en', today, [], { notes: { lib: 'Side <door>' } });
    expect(r.list).toContain('<label for="gl-note-0">Your note about Library (kept on this device)</label>');
    expect(r.list).toContain('id="gl-note-0" class="gl-textarea"');
    expect(r.list).toContain('Side &lt;door&gt;</textarea>');
    expect(r.list).toContain('aria-describedby="gl-note-hint-1"');
  });

  it('limits the note length in the box', () => {
    expect(resultsView(places, EMPTY_STATE, 'en', today, []).list).toContain('maxlength="500"');
  });

  it('adds a named "copy as text" button only when export is on', () => {
    expect(resultsView(places, EMPTY_STATE, 'en', today, []).list).not.toContain('gl-copy-0');
    const r = resultsView(places, EMPTY_STATE, 'fr', today, [], { canExport: true });
    expect(r.list).toContain('id="gl-copy-0" aria-label="Copier en texte\u00a0: Library"');
  });

  it('passes the HTML audit in both languages with notes, questions and copy buttons', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = renderFinderShell({ lang, state: EMPTY_STATE, places, today, canExport: true, notes: { cafe: 'Appeler avant' } });
      expect(auditHtml(`<main lang="${lang === 'en' ? 'en-CA' : 'fr-CA'}">${html}</main>`, `finder-notes.${lang}`).filter((f) => f.severity === 'error')).toEqual([]);
    }
  });

  it('keeps French spacing in the new French strings of a French card', () => {
    const r = resultsView(places, EMPTY_STATE, 'fr', today, []);
    const text = r.list.replace(/<[^>]+>/g, '\n').split('\n').filter((l) => l.includes('?') || l.includes(':'));
    for (const line of text) expect(frenchIssues(line)).toEqual([]);
  });
});

describe('mountPlaceFinder: notes', () => {
  it('saves a note as the person types, without redrawing the list', () => {
    const store = new Mem();
    const { root, finder } = mount({ store });
    const before = root.querySelector('[data-gl-presults]').innerHTML;
    root.fire('input', { id: 'gl-note-1', value: '  Call first  ' });
    expect(finder.getNotes()).toEqual({ cafe: 'Call first' });
    expect(store.getItem(NOTES_STORE_KEY)).toBe('{"cafe":"Call first"}');
    expect(root.querySelector('[data-gl-presults]').innerHTML).toBe(before);
  });

  it('removes the note when the box is emptied', () => {
    const { root, finder } = mount();
    root.fire('input', { id: 'gl-note-0', value: 'x' });
    root.fire('input', { id: 'gl-note-0', value: '   ' });
    expect(finder.getNotes()).toEqual({});
  });

  it('shows saved notes on the next visit', () => {
    const store = new Mem();
    mount({ store }).root.fire('input', { id: 'gl-note-0', value: 'Ask about the ramp' });
    const next = mount({ store });
    expect(next.finder.getNotes()).toEqual({ lib: 'Ask about the ramp' });
    expect(next.root.innerHTML).toContain('Ask about the ramp</textarea>');
  });

  it('keeps notes when data arrives later, and ignores notes for places that do not exist', () => {
    const store = new Mem();
    store.setItem(NOTES_STORE_KEY, '{"lib":"kept"}');
    const root = new Root();
    const finder = mountPlaceFinder(root, { lang: 'en', today, store });
    finder.setPlaces(places);
    expect(finder.getNotes()).toEqual({ lib: 'kept' });
    root.fire('input', { id: 'gl-note-99', value: 'nobody' });
    expect(finder.getNotes()).toEqual({ lib: 'kept' });
  });

  it('keeps notes out of the claims: a note never changes what is reported', () => {
    const { root } = mount();
    root.fire('input', { id: 'gl-note-1', value: 'There is a lift and a ramp' });
    const r = resultsView(places, EMPTY_STATE, 'en', today, [], { notes: { cafe: 'There is a lift and a ramp' } });
    expect(r.list).toContain('Questions to ask this place (8)');
  });

  it('survives storage that throws', () => {
    const broken: IndexStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    const { root, finder } = mount({ store: broken });
    root.fire('input', { id: 'gl-note-0', value: 'still here' });
    expect(finder.getNotes()).toEqual({ lib: 'still here' });
  });
});

describe('mountPlaceFinder: copy one place', () => {
  it('hands the host a text file with the note and the questions', () => {
    const files: ExportFile[] = [];
    const { root } = mount({ onExport: (f) => files.push(f) });
    root.fire('input', { id: 'gl-note-1', value: 'Ask about parking' });
    root.fire('click', { id: 'gl-copy-1' });
    expect(files).toHaveLength(1);
    expect(files[0]?.filename).toBe('place-cafe-en.txt');
    expect(files[0]?.mime).toContain('text/plain');
    expect(files[0]?.text).toContain('Café Nord');
    expect(files[0]?.text).toContain('Ramp: Unknown');
    expect(files[0]?.text).toContain('Your note:\nAsk about parking');
  });

  it('uses the chosen features', () => {
    const files: ExportFile[] = [];
    const { root } = mount({ onExport: (f) => files.push(f) });
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    root.fire('click', { id: 'gl-copy-0' });
    expect(files[0]?.text).toContain('Ramp: Reported as available');
    expect(files[0]?.text).not.toContain('Elevator');
  });

  it('does nothing without onExport or for a place that does not exist', () => {
    const files: ExportFile[] = [];
    const { root } = mount();
    root.fire('click', { id: 'gl-copy-0' });
    const withExport = mount({ onExport: (f) => files.push(f) });
    withExport.root.fire('click', { id: 'gl-copy-9' });
    expect(files).toEqual([]);
  });

  it('writes French files in French', () => {
    const files: ExportFile[] = [];
    const root = new Root();
    mountPlaceFinder(root, { lang: 'fr', places, today, onExport: (f) => files.push(f) });
    root.fire('click', { id: 'gl-copy-0' });
    expect(files[0]?.filename).toBe('place-lib-fr.txt');
    expect(files[0]?.text).toContain('Rampe : Signalé comme disponible');
  });
});

describe('mountPlaceFinder: data updates', () => {
  it('starts with no change message', () => {
    const { root, finder } = mount();
    expect(finder.getChanges()).toEqual({ added: [], removed: [], changed: [] });
    expect(root.innerHTML).not.toContain('class="gl-changes"');
  });

  it('says what a new copy of the data changed', () => {
    const { root, finder } = mount();
    finder.setPlaces([
      { id: 'lib', name: 'Library', claims: [yes('ramp'), yes('elevator')] },
      { id: 'gym', name: 'Gym', claims: [] },
    ]);
    expect(finder.getChanges().added.map((p) => p.id)).toEqual(['gym']);
    expect(finder.getChanges().removed.map((p) => p.id)).toEqual(['cafe']);
    expect(root.innerHTML).toContain('Data updated: 1 place added, 1 place removed, 1 feature changed.');
    expect(root.innerHTML).toContain('Library: Elevator changed from unknown to reported as available.');
  });

  it('clears the message when the next copy is the same', () => {
    const { root, finder } = mount();
    finder.setPlaces([...places, { id: 'new', name: 'New', claims: [] }]);
    finder.setPlaces([...places, { id: 'new', name: 'New', claims: [] }]);
    expect(finder.getChanges().added).toEqual([]);
    expect(root.innerHTML).not.toContain('Data updated');
  });

  it('shows data notes for the places it has', () => {
    const old: Place[] = [{ id: 'o', name: 'Old hall', claims: [{ termId: 'ramp', status: 'present', provenance: { ...prov, date: '2021-01-01' } }] }];
    const { root } = mount({ places: old });
    expect(root.innerHTML).toContain('Data notes');
    expect(root.innerHTML).toContain('1 of 1 places have a source problem');
  });
});

describe('mountPlaceFinder: visit plan', () => {
  const planEl = (root: Root): string => root.querySelector('[data-gl-plan]').innerHTML;

  it('asks the person to save a place first', () => {
    const { root } = mount();
    expect(root.innerHTML).toContain('Save a place to plan what to ask.');
  });

  it('builds the plan from saved places and updates when one is saved or unsaved', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-save-1' });
    expect(planEl(root)).toContain('<legend>Café Nord</legend>');
    root.fire('click', { id: 'gl-save-1' });
    expect(planEl(root)).toContain('Save a place to plan what to ask.');
  });

  it('ticks a question, saves the tick and keeps focus on the box', () => {
    const store = new Mem();
    const { root, finder } = mount({ store });
    root.fire('click', { id: 'gl-save-1' });
    root.fire('change', { id: 'gl-ask-1-ramp', checked: true });
    expect(finder.getPlan()).toEqual({ cafe: ['ramp'] });
    expect(store.getItem('glossary-visit-plan')).toBe('{"cafe":["ramp"]}');
    expect(planEl(root)).toMatch(/id="gl-ask-1-ramp" checked/);
    expect(root.querySelector('#gl-ask-1-ramp').focused).toBe(1);
    root.fire('change', { id: 'gl-ask-1-ramp', checked: false });
    expect(finder.getPlan()).toEqual({});
  });

  it('restores ticks on the next visit', () => {
    const store = new Mem();
    const first = mount({ store });
    first.root.fire('click', { id: 'gl-save-1' });
    first.root.fire('change', { id: 'gl-ask-1-ramp', checked: true });
    const next = mount({ store });
    expect(next.root.innerHTML).toMatch(/id="gl-ask-1-ramp" checked/);
  });

  it('follows the chosen features', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-save-1' });
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    expect(planEl(root).match(/type="checkbox"/g)).toHaveLength(1);
  });

  it('ignores ticks for places that do not exist and ids it does not know', () => {
    const { root, finder } = mount();
    root.fire('change', { id: 'gl-ask-9-ramp', checked: true });
    root.fire('change', { id: 'gl-ask-nonsense', checked: true });
    root.fire('change', { id: 'gl-ask-1-ramp' });
    expect(finder.getPlan()).toEqual({});
  });

  it('copies the plan as text only when export is on and there is something to copy', () => {
    const files: ExportFile[] = [];
    const { root } = mount({ onExport: (f) => files.push(f) });
    expect(planEl(root)).not.toContain('gl-export-plan');
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    root.fire('click', { id: 'gl-save-1' });
    root.fire('change', { id: 'gl-ask-1-ramp', checked: true });
    expect(planEl(root)).toContain('id="gl-export-plan"');
    root.fire('click', { id: 'gl-export-plan' });
    expect(files[0]?.filename).toBe('visit-plan-en.txt');
    expect(files[0]?.text).toContain('Café Nord:\n  [x] Is there a ramp?');
    const plain = mount();
    plain.root.fire('click', { id: 'gl-export-plan' });
    expect(files).toHaveLength(1);
  });

  it('shows the plan in French', () => {
    const root = new Root();
    const finder = mountPlaceFinder(root, { lang: 'fr', places, today });
    root.fire('click', { id: 'gl-save-1' });
    expect(finder.getPlan()).toEqual({});
    expect(root.querySelector('[data-gl-plan]').innerHTML).toContain('Plan de visite');
  });
});
