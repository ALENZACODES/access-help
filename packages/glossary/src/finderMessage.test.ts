import { describe, expect, it } from 'vitest';
import {
  auditHtml,
  buildPlan,
  frenchIssues,
  lintClaims,
  lintCopy,
  mountPlaceFinder,
  renderPlan,
  MESSAGE_UI,
  type ExportFile,
  type FeatureClaim,
  type FinderElement,
  type FinderRoot,
  type Lang,
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
  focus(): void {}
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
const mount = (lang: Lang = 'en', withExport = true) => {
  const files: ExportFile[] = [];
  const root = new Root();
  const finder = mountPlaceFinder(root, { lang, places, today, ...(withExport ? { onExport: (f: ExportFile) => files.push(f) } : {}) });
  return { root, finder, files };
};
const planEl = (root: Root): string => root.querySelector('[data-gl-plan]').innerHTML;

describe('renderPlan: message buttons', () => {
  const entries = buildPlan(places, ['lib', 'cafe'], ['ramp', 'elevator'], today, 'en', { lib: ['elevator', 'ramp'] });

  it('has no message button unless asked for', () => {
    expect(renderPlan(entries, 2, 'en')).not.toContain('gl-msg-');
  });
  it('adds one only for a place with a question left', () => {
    const html = renderPlan(entries, 2, 'en', true);
    expect(html).toContain('id="gl-msg-1"');
    expect(html).not.toContain('id="gl-msg-0"');
  });
  it.each(['en', 'fr'] as Lang[])('labels the button with the place name in %s', (lang) => {
    const html = renderPlan(buildPlan(places, ['cafe'], ['ramp'], today, lang, {}), 1, lang, true);
    expect(html).toContain(MESSAGE_UI[lang].copy('Café Nord'));
  });
  it('is clean markup', () => {
    expect(auditHtml(`<div lang="en">${renderPlan(entries, 2, 'en', true)}</div>`, 'plan-message')).toEqual([]);
  });
});

describe('the finder: copy a message', () => {
  it('shows the button only when export is on, and only for a place with questions left', () => {
    const off = mount('en', false);
    off.root.fire('click', { id: 'gl-save-1' });
    expect(planEl(off.root)).not.toContain('gl-msg-');
    const on = mount();
    on.root.fire('click', { id: 'gl-save-1' });
    expect(planEl(on.root)).toContain('id="gl-msg-1"');
  });

  it('hands the host an email with the questions not yet ticked', () => {
    const { root, files } = mount();
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    root.fire('change', { id: 'gl-f-elevator', checked: true });
    root.fire('click', { id: 'gl-save-1' });
    root.fire('change', { id: 'gl-ask-1-ramp', checked: true });
    root.fire('click', { id: 'gl-msg-1' });
    expect(files).toHaveLength(1);
    expect(files[0]?.filename).toBe('message-cafe-nord-en.txt');
    expect(files[0]?.text).toContain('Café Nord');
    expect(files[0]?.text).toContain('elevator');
    expect(files[0]?.text).not.toMatch(/1\. Is there a ramp/);
  });

  it('sends nothing when every question has been asked', () => {
    const { root, files } = mount();
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    root.fire('click', { id: 'gl-save-1' });
    root.fire('change', { id: 'gl-ask-1-ramp', checked: true });
    root.fire('click', { id: 'gl-msg-1' });
    expect(files).toHaveLength(0);
  });

  it('ignores a place that does not exist, and a host that cannot export', () => {
    const { root, files } = mount();
    root.fire('click', { id: 'gl-msg-9' });
    expect(files).toHaveLength(0);
    const plain = mount('en', false);
    plain.root.fire('click', { id: 'gl-msg-1' });
    expect(plain.files).toHaveLength(0);
  });

  it('writes French with the French file name', () => {
    const { root, files } = mount('fr');
    root.fire('click', { id: 'gl-save-1' });
    root.fire('click', { id: 'gl-msg-1' });
    expect(files[0]?.filename).toBe('message-cafe-nord-fr.txt');
    expect(frenchIssues(files[0]?.text ?? '')).toEqual([]);
  });

  it('never says anything about the place', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const { root, files } = mount(lang);
      root.fire('click', { id: 'gl-save-1' });
      root.fire('click', { id: 'gl-msg-1' });
      const text = files[0]?.text ?? '';
      expect(text).not.toBe('');
      expect(lintCopy(text)).toEqual([]);
      expect(lintClaims(text)).toEqual([]);
    }
  });

  it('does not stop the other buttons working', () => {
    const { root, files, finder } = mount();
    root.fire('click', { id: 'gl-save-1' });
    root.fire('click', { id: 'gl-export-plan' });
    root.fire('change', { id: 'gl-ask-1-ramp', checked: true });
    expect(files).toHaveLength(1);
    expect(finder.getPlan()).toEqual({ cafe: ['ramp'] });
  });
});
