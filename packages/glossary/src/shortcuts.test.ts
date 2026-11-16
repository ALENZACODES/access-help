import { describe, expect, it } from 'vitest';
import {
  SHORTCUTS,
  SHORTCUTS_TOGGLE_ID,
  SHORTCUT_UI,
  auditHtml,
  frenchIssues,
  interpretKey,
  parseShortcuts,
  renderShortcuts,
  serialiseShortcuts,
  type Lang,
} from './index';

describe('interpretKey', () => {
  it('does nothing while shortcuts are off', () => {
    for (const s of SHORTCUTS) expect(interpretKey({ key: s.key }, false)).toBeNull();
  });
  it('maps each shortcut key when on', () => {
    expect(interpretKey({ key: '/' }, true)).toBe('focus-search');
    expect(interpretKey({ key: 's' }, true)).toBe('only-saved');
    expect(interpretKey({ key: 'r' }, true)).toBe('only-recent');
  });
  it('ignores case', () => {
    expect(interpretKey({ key: 'S' }, true)).toBe('only-saved');
  });
  it('ignores other keys and named keys', () => {
    for (const key of ['a', 'Enter', 'Tab', 'Escape', 'ArrowDown', '', ' ']) expect(interpretKey({ key }, true), key).toBeNull();
  });
  it('never acts while typing in a field', () => {
    for (const targetTag of ['INPUT', 'input', 'TEXTAREA', 'Select']) expect(interpretKey({ key: 's', targetTag }, true), targetTag).toBeNull();
    expect(interpretKey({ key: 's', editable: true }, true)).toBeNull();
  });
  it('acts on a button or the page body', () => {
    expect(interpretKey({ key: 's', targetTag: 'BUTTON' }, true)).toBe('only-saved');
    expect(interpretKey({ key: 's', targetTag: 'BODY' }, true)).toBe('only-saved');
  });
  it('never acts with Ctrl, Alt or Meta held', () => {
    for (const mod of ['ctrlKey', 'altKey', 'metaKey'] as const) expect(interpretKey({ key: 's', [mod]: true }, true), mod).toBeNull();
  });
  it('still acts with Shift (a typed "/" can need it on some keyboards)', () => {
    expect(interpretKey({ key: '/' }, true)).toBe('focus-search');
  });
});

describe('SHORTCUTS', () => {
  it('has unique single-character keys', () => {
    expect(new Set(SHORTCUTS.map((s) => s.key)).size).toBe(SHORTCUTS.length);
    for (const s of SHORTCUTS) expect(s.key.length).toBe(1);
  });
  it('has a description in both languages for every action', () => {
    for (const lang of ['en', 'fr'] as Lang[]) for (const s of SHORTCUTS) expect(SHORTCUT_UI[lang].actions[s.action], `${lang} ${s.action}`).toBeTruthy();
  });
  it('does not use the keys of the browser or screen readers with a modifier', () => {
    for (const s of SHORTCUTS) expect(s.key).toMatch(/^[a-z/]$/);
  });
});

describe('storing the setting', () => {
  it('round-trips', () => {
    expect(parseShortcuts(serialiseShortcuts(true))).toBe(true);
    expect(parseShortcuts(serialiseShortcuts(false))).toBe(false);
  });
  it('treats anything but "on" as off', () => {
    for (const raw of ['', 'true', '1', 'ON', 'yes', 'null']) expect(parseShortcuts(raw), raw).toBe(false);
  });
});

describe('renderShortcuts', () => {
  it.each(['en', 'fr'] as Lang[])('is only the switch while off, in %s', (lang) => {
    const html = renderShortcuts(false, lang);
    expect(html).toContain(`id="${SHORTCUTS_TOGGLE_ID}"`);
    expect(html).not.toContain('checked');
    expect(html).not.toContain('<kbd');
    expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'shortcuts-off')).toEqual([]);
  });
  it.each(['en', 'fr'] as Lang[])('lists the keys while on, in %s', (lang) => {
    const html = renderShortcuts(true, lang);
    expect(html).toContain(' checked');
    expect(html.match(/<kbd/g)?.length).toBe(SHORTCUTS.length);
    expect(html).toContain(SHORTCUT_UI[lang].actions['focus-search']);
    expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'shortcuts-on')).toEqual([]);
  });
  it('is clean French', () => {
    for (const s of SHORTCUTS) {
      expect(frenchIssues(SHORTCUT_UI.fr.actions[s.action])).toEqual([]);
      expect(frenchIssues(SHORTCUT_UI.fr.keyLabel(s.key))).toEqual([]);
    }
  });
});
