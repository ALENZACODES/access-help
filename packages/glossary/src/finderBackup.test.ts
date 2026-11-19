import { describe, expect, it } from 'vitest';
import {
  BACKUP_UI,
  NOTES_STORE_KEY,
  PLAN_STORE_KEY,
  RECENT_STORE_KEY,
  SAVED_STORE_KEY,
  VISITS_STORE_KEY,
  mountPlaceFinder,
  parseBackup,
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
const mount = (store: Mem = new Mem(), files: ExportFile[] = []) => {
  const root = new Root();
  const finder = mountPlaceFinder(root, { lang: 'en', places, today, store, onExport: (f) => files.push(f) });
  return { root, finder, store, files };
};
const panel = (root: Root): string => root.querySelector('[data-gl-data]').innerHTML;

describe('the finder: your data', () => {
  it('shows what is kept, starting empty', () => {
    expect(mount().root.innerHTML).toContain(BACKUP_UI.en.none);
  });
  it('counts what the person has done', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-save-0' });
    root.fire('click', { id: 'gl-visit-1' });
    expect(panel(root)).toContain('1 saved places, 1 visit marks');
  });

  it('copies the data as a file that can be read back', () => {
    const { root, files } = mount();
    root.fire('click', { id: 'gl-save-1' });
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    root.fire('click', { id: 'gl-visit-0' });
    root.fire('click', { id: 'gl-backup-export' });
    expect(files).toHaveLength(1);
    expect(files[0]?.filename).toBe(`glossary-backup-${today}.json`);
    expect(files[0]?.mime).toBe('application/json;charset=utf-8');
    const result = parseBackup(files[0]?.text ?? '');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.saved).toEqual(['cafe']);
      expect(result.backup.state.features).toEqual(['ramp']);
      expect(result.backup.visits).toEqual({ lib: today });
    }
  });

  it('loads a copy on another device', () => {
    const first = mount();
    first.root.fire('click', { id: 'gl-save-1' });
    first.root.fire('change', { id: 'gl-f-ramp', checked: true });
    first.root.fire('click', { id: 'gl-visit-1' });
    first.root.fire('change', { id: 'gl-pq', value: 'café' });
    first.root.fire('click', { id: 'gl-backup-export' });
    const text = first.files[0]?.text ?? '';

    const second = mount();
    second.root.querySelector('#gl-backup-text').value = text;
    second.root.fire('click', { id: 'gl-backup-import' });
    expect(second.finder.getSaved()).toEqual(['cafe']);
    expect(second.finder.getState().features).toEqual(['ramp']);
    expect(second.root.innerHTML).toContain('id="gl-visit-1" data-visited="yes"');
    expect(second.root.innerHTML).toContain('Loaded');
    expect(JSON.parse(second.store.getItem(SAVED_STORE_KEY) ?? '[]')).toEqual(['cafe']);
    expect(JSON.parse(second.store.getItem(VISITS_STORE_KEY) ?? '{}')).toEqual({ cafe: today });
    expect(JSON.parse(second.store.getItem(RECENT_STORE_KEY) ?? '[]')).toEqual(['café']);
  });

  it('changes nothing when the text is not a copy', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-save-0' });
    for (const [text, message] of [['', BACKUP_UI.en.errors.empty], ['hello', BACKUP_UI.en.errors['not-json']], ['{}', BACKUP_UI.en.errors['wrong-format']]] as const) {
      root.querySelector('#gl-backup-text').value = text;
      root.fire('click', { id: 'gl-backup-import' });
      expect(panel(root)).toContain(message);
      expect(finder.getSaved()).toEqual(['lib']);
    }
  });

  it('drops saved places that are not in the loaded data', () => {
    const { root, finder } = mount();
    root.querySelector('#gl-backup-text').value = JSON.stringify({ format: 'glossary-backup', version: 1, saved: ['lib', 'gone'] });
    root.fire('click', { id: 'gl-backup-import' });
    expect(finder.getSaved()).toEqual(['lib']);
  });

  it('keeps notes and visits for places that are not loaded yet', () => {
    const { root, finder } = mount();
    root.querySelector('#gl-backup-text').value = JSON.stringify({ format: 'glossary-backup', version: 1, notes: { later: 'x' } });
    root.fire('click', { id: 'gl-backup-import' });
    expect(finder.getNotes()).toEqual({ later: 'x' });
  });

  it('clears the undo offer after loading', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-save-0' });
    root.fire('click', { id: 'gl-save-0' });
    root.querySelector('#gl-backup-text').value = JSON.stringify({ format: 'glossary-backup', version: 1 });
    root.fire('click', { id: 'gl-backup-import' });
    expect(root.innerHTML).not.toContain('id="gl-undo"');
  });
});

describe('the finder: forget everything', () => {
  const filled = () => {
    const m = mount();
    m.root.fire('click', { id: 'gl-save-0' });
    m.root.fire('click', { id: 'gl-visit-1' });
    m.root.fire('change', { id: 'gl-pq', value: 'café' });
    m.root.fire('change', { id: 'gl-ask-0-ramp', checked: true });
    m.root.fire('input', { id: 'gl-note-0', value: 'a note' });
    return m;
  };
  it('asks first, and focuses the safe button', () => {
    const { root, finder } = filled();
    root.fire('click', { id: 'gl-forget' });
    expect(panel(root)).toContain('id="gl-forget-sure"');
    expect(root.querySelector('#gl-forget-cancel').focused).toBe(1);
    expect(finder.getSaved()).toEqual(['lib']);
  });
  it('keeps everything when the person says no', () => {
    const { root, finder } = filled();
    root.fire('click', { id: 'gl-forget' });
    root.fire('click', { id: 'gl-forget-cancel' });
    expect(panel(root)).toContain('id="gl-forget"');
    expect(panel(root)).not.toContain('gl-forget-sure');
    expect(finder.getSaved()).toEqual(['lib']);
    expect(root.querySelector('#gl-forget').focused).toBe(1);
  });
  it('removes the saved data from the finder and the store when the person says yes', () => {
    const { root, finder, store } = filled();
    root.fire('click', { id: 'gl-forget' });
    root.fire('click', { id: 'gl-forget-sure' });
    expect(finder.getSaved()).toEqual([]);
    expect(finder.getNotes()).toEqual({});
    expect(finder.getPlan()).toEqual({});
    for (const key of [SAVED_STORE_KEY, RECENT_STORE_KEY]) expect(JSON.parse(store.getItem(key) ?? 'null')).toEqual([]);
    for (const key of [NOTES_STORE_KEY, PLAN_STORE_KEY, VISITS_STORE_KEY]) expect(JSON.parse(store.getItem(key) ?? 'null')).toEqual({});
    expect(root.innerHTML).toContain(BACKUP_UI.en.forgotten);
    expect(root.innerHTML).toContain(BACKUP_UI.en.none);
    expect(root.innerHTML).toContain('id="gl-visit-1" data-visited="no"');
  });
  it('does not ask again after forgetting', () => {
    const { root } = filled();
    root.fire('click', { id: 'gl-forget' });
    root.fire('click', { id: 'gl-forget-sure' });
    expect(root.innerHTML).toContain('id="gl-forget"');
    expect(root.innerHTML).not.toContain('id="gl-forget-sure"');
  });
  it('never forgets unless the question was asked first', () => {
    const { root, finder } = filled();
    root.fire('click', { id: 'gl-forget-sure' });
    expect(finder.getSaved()).toEqual(['lib']);
  });
});
