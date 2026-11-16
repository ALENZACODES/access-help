import { describe, expect, it } from 'vitest';
import {
  ORDER_UI,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  moveId,
  parseMoveId,
  plainLanguageIssues,
  positionOf,
  renderMoveButtons,
  swapSaved,
  type Lang,
} from './index';

describe('swapSaved', () => {
  it('swaps two places', () => {
    expect(swapSaved(['a', 'b', 'c'], 'a', 'c')).toEqual(['c', 'b', 'a']);
    expect(swapSaved(['a', 'b', 'c'], 'b', 'a')).toEqual(['b', 'a', 'c']);
  });
  it('changes nothing for the same place or a place that is not saved', () => {
    const saved = ['a', 'b'];
    expect(swapSaved(saved, 'a', 'a')).toBe(saved);
    expect(swapSaved(saved, 'a', 'z')).toBe(saved);
    expect(swapSaved(saved, 'z', 'a')).toBe(saved);
    expect(swapSaved([], 'a', 'b')).toEqual([]);
  });
  it('does not change its input', () => {
    const saved = ['a', 'b', 'c'];
    swapSaved(saved, 'a', 'b');
    expect(saved).toEqual(['a', 'b', 'c']);
  });
  it('keeps every place once', () => {
    const out = swapSaved(['a', 'b', 'c', 'd'], 'b', 'd');
    expect([...out].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('positionOf', () => {
  it('counts from one and gives zero when absent', () => {
    expect(positionOf(['a', 'b'], 'a')).toBe(1);
    expect(positionOf(['a', 'b'], 'b')).toBe(2);
    expect(positionOf(['a', 'b'], 'z')).toBe(0);
  });
});

describe('ids', () => {
  it('round-trips', () => {
    expect(parseMoveId(moveId('earlier', 4))).toEqual({ direction: 'earlier', index: 4 });
    expect(parseMoveId(moveId('later', 12))).toEqual({ direction: 'later', index: 12 });
  });
  it('rejects other ids', () => {
    for (const id of ['', 'gl-up-', 'gl-up-x', 'gl-left-1', 'gl-more', 'gl-up-1-2']) expect(parseMoveId(id), id).toBeNull();
  });
});

describe('renderMoveButtons', () => {
  it('gives the first place only "later"', () => {
    const html = renderMoveButtons(3, 'Library', 1, 3, 'en');
    expect(html).toContain('id="gl-down-3"');
    expect(html).not.toContain('gl-up-3');
  });
  it('gives the last place only "earlier"', () => {
    const html = renderMoveButtons(3, 'Library', 3, 3, 'en');
    expect(html).toContain('id="gl-up-3"');
    expect(html).not.toContain('gl-down-3');
  });
  it('gives a middle place both', () => {
    const html = renderMoveButtons(3, 'Library', 2, 3, 'en');
    expect(html).toContain('gl-up-3');
    expect(html).toContain('gl-down-3');
  });
  it('gives a lone place nothing', () => {
    expect(renderMoveButtons(0, 'Library', 1, 1, 'en')).toBe('');
  });
  it('names the place in each button', () => {
    const html = renderMoveButtons(3, 'Library', 2, 3, 'en');
    expect(html).toContain('aria-label="Move Library earlier in the visit plan"');
    expect(html).toContain('aria-label="Move Library later in the visit plan"');
  });
  it.each(['en', 'fr'] as Lang[])('is valid markup in %s', (lang) => {
    expect(auditHtml(`<div lang="${lang}">${renderMoveButtons(1, 'Café <Nord>', 2, 3, lang)}</div>`, 'order')).toEqual([]);
    expect(renderMoveButtons(1, '<b>', 2, 3, lang)).not.toContain('<b>');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = ORDER_UI[lang];
    for (const t of [ui.earlier, ui.later, ui.earlierLabel('Library'), ui.laterLabel('Library'), ui.group]) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});
