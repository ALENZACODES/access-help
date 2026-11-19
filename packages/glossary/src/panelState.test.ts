import { describe, expect, it } from 'vitest';
import { MAX_OPEN_PANELS, applyOpenPanels, openPanelsIn, panelFromTarget, togglePanel, uniquePanels } from './index';

const details = (className: string, open: boolean, tagName = 'DETAILS'): unknown => ({ tagName, className, open });
const PAGE =
  '<section><details class="gl-a-panel"><summary>A</summary></details>' +
  '<details class="gl-b-panel" open><summary>B</summary></details>' +
  '<ul><li><details class="gl-records"><summary>1</summary></details></li><li><details class="gl-records"><summary>2</summary></details></li></ul>' +
  '<details class="gl-recsearch"><summary>C</summary><details class="gl-inner"><summary>D</summary></details></details></section>';

describe('panelFromTarget', () => {
  it('reads the first class and the open state of a details element', () => {
    expect(panelFromTarget(details('gl-tidy-panel', true))).toEqual({ name: 'gl-tidy-panel', open: true });
    expect(panelFromTarget(details('  gl-recsearch  extra ', false, 'details'))).toEqual({ name: 'gl-recsearch', open: false });
  });
  it('is null for anything that is not a finder panel', () => {
    for (const t of [null, undefined, 3, 'x', {}, details('gl-a', true, 'DIV'), details('other', true), details('', true), details('gl-A', true), { tagName: 'DETAILS', className: 'gl-a' }, { tagName: 'DETAILS', open: true }]) {
      expect(panelFromTarget(t)).toBeNull();
    }
  });
  it('does not accept a class name that could break out of an attribute', () => {
    expect(panelFromTarget(details('gl-a"onclick="x', true))).toBeNull();
    expect(panelFromTarget(details('gl-a><b', true))).toBeNull();
  });
});

describe('togglePanel', () => {
  it('adds a panel that was opened and removes one that was closed', () => {
    const one = togglePanel(new Set(), { name: 'gl-a-panel', open: true });
    expect([...one]).toEqual(['gl-a-panel']);
    expect([...togglePanel(one, { name: 'gl-a-panel', open: false })]).toEqual([]);
  });
  it('gives back the same set when nothing changes', () => {
    const one: ReadonlySet<string> = new Set(['gl-a-panel']);
    expect(togglePanel(one, { name: 'gl-a-panel', open: true })).toBe(one);
    expect(togglePanel(one, { name: 'gl-b-panel', open: false })).toBe(one);
    expect(togglePanel(one, { name: 'not a class', open: true })).toBe(one);
  });
  it('does not change the set it was given', () => {
    const one: ReadonlySet<string> = new Set(['gl-a-panel']);
    togglePanel(one, { name: 'gl-b-panel', open: true });
    expect([...one]).toEqual(['gl-a-panel']);
  });
  it('stops growing at the limit, and can still close a panel', () => {
    let set: ReadonlySet<string> = new Set();
    for (let i = 0; i < MAX_OPEN_PANELS + 5; i++) set = togglePanel(set, { name: `gl-p${i}`, open: true });
    expect(set.size).toBe(MAX_OPEN_PANELS);
    expect(togglePanel(set, { name: 'gl-p0', open: false }).size).toBe(MAX_OPEN_PANELS - 1);
  });
});

describe('uniquePanels', () => {
  it('finds the classes used by exactly one details element', () => {
    expect([...uniquePanels(PAGE)].sort()).toEqual(['gl-a-panel', 'gl-b-panel', 'gl-inner', 'gl-recsearch']);
    expect(uniquePanels('<p>none</p>').size).toBe(0);
  });
});

describe('applyOpenPanels', () => {
  it('leaves the markup alone when no panel is remembered', () => {
    expect(applyOpenPanels(PAGE, new Set())).toBe(PAGE);
  });
  it('draws a remembered panel open', () => {
    const html = applyOpenPanels(PAGE, new Set(['gl-a-panel', 'gl-recsearch']));
    expect(html).toContain('<details class="gl-a-panel" open><summary>A</summary>');
    expect(html).toContain('<details class="gl-recsearch" open><summary>C</summary>');
    expect(html).toContain('<details class="gl-inner"><summary>D</summary>');
  });
  it('keeps a panel the page drew open, without a second attribute', () => {
    const html = applyOpenPanels(PAGE, new Set(['gl-b-panel']));
    expect(html).toBe(PAGE);
    expect(html).not.toContain('open open');
  });
  it('never opens blocks that share a class', () => {
    const html = applyOpenPanels(PAGE, new Set(['gl-records']));
    expect(html).toBe(PAGE);
  });
  it('ignores a remembered panel that is not on the page', () => {
    expect(applyOpenPanels(PAGE, new Set(['gl-gone-panel']))).toBe(PAGE);
  });
  it('changes nothing but the opening tags', () => {
    const html = applyOpenPanels(PAGE, new Set(['gl-a-panel']));
    expect(html.replace('<details class="gl-a-panel" open>', '<details class="gl-a-panel">')).toBe(PAGE);
  });
  it('is the same when applied twice', () => {
    const open = new Set(['gl-a-panel', 'gl-recsearch']);
    const once = applyOpenPanels(PAGE, open);
    expect(applyOpenPanels(once, open)).toBe(once);
  });
});

describe('openPanelsIn', () => {
  it('lists the open panels that have a class of their own', () => {
    expect(openPanelsIn(PAGE)).toEqual(['gl-b-panel']);
    expect(openPanelsIn(applyOpenPanels(PAGE, new Set(['gl-a-panel', 'gl-inner'])))).toEqual(['gl-a-panel', 'gl-b-panel', 'gl-inner']);
  });
});
