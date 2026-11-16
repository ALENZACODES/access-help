import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFS,
  PREFS_STORE_KEY,
  PREFS_UI,
  TEXT_SCALES,
  auditCss,
  createPrefs,
  frenchIssues,
  fullGlossaryCss,
  htmlLang,
  isDefaultPrefs,
  lintCopy,
  normalisePrefs,
  parsePrefs,
  prefsCss,
  renderPrefsPanel,
  serialisePrefs,
  auditHtml,
  type IndexStore,
  type Prefs,
} from './index';

class Mem implements IndexStore {
  readonly data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

const all: Prefs = { textScale: 200, wideSpacing: true, highContrast: true, reduceMotion: true };

describe('normalisePrefs', () => {
  it('keeps valid values and fixes bad ones field by field', () => {
    expect(normalisePrefs({ textScale: 150, wideSpacing: true, highContrast: 'yes' })).toEqual({
      textScale: 150,
      wideSpacing: true,
      highContrast: false,
      reduceMotion: false,
    });
    expect(normalisePrefs({ textScale: 175 }).textScale).toBe(100);
  });

  it.each([null, 3, 'x', []])('uses defaults for %j', (v) => {
    expect(normalisePrefs(v)).toEqual(DEFAULT_PREFS);
  });

  it('round-trips and rejects non-objects', () => {
    expect(parsePrefs(serialisePrefs(all))).toEqual(all);
    expect(parsePrefs('oops')).toBeNull();
    expect(parsePrefs('[]')).toBeNull();
    expect(isDefaultPrefs(DEFAULT_PREFS)).toBe(true);
    expect(isDefaultPrefs(all)).toBe(false);
  });
});

describe('prefsCss', () => {
  it('is empty for the defaults', () => {
    expect(prefsCss(DEFAULT_PREFS)).toBe('');
  });

  it('sets text size on the scope', () => {
    expect(prefsCss({ ...DEFAULT_PREFS, textScale: 150 })).toContain('.gl-finder { font-size: 150%; }');
  });

  it('uses the WCAG text-spacing values without !important', () => {
    const css = prefsCss({ ...DEFAULT_PREFS, wideSpacing: true });
    expect(css).toContain('line-height: 1.8');
    expect(css).toContain('letter-spacing: 0.12em');
    expect(css).toContain('word-spacing: 0.16em');
    expect(css).toContain('margin-block-end: 2em');
    expect(css).not.toContain('!important');
  });

  it('adds a strong focus outline and underlined links for high contrast', () => {
    const css = prefsCss({ ...DEFAULT_PREFS, highContrast: true });
    expect(css).toContain('outline: 4px solid #000');
    expect(css).toContain('text-decoration: underline');
  });

  it('turns off transitions and animations for reduced motion', () => {
    const css = prefsCss({ ...DEFAULT_PREFS, reduceMotion: true });
    expect(css).toContain('transition: none !important');
    expect(css).toContain('animation: none !important');
  });

  it('uses a custom scope and refuses scopes that could break out of a rule', () => {
    expect(prefsCss({ ...DEFAULT_PREFS, textScale: 125 }, '#help .box')).toContain('#help .box { font-size: 125%; }');
    expect(() => prefsCss(all, '} body { display:none')).toThrow(RangeError);
    expect(() => prefsCss(all, '')).toThrow(RangeError);
  });

  it('passes the CSS audit with every setting on', () => {
    const errors = auditCss(fullGlossaryCss() + prefsCss(all), 'prefs').filter((f) => f.severity === 'error');
    expect(errors).toEqual([]);
  });
});

describe('renderPrefsPanel', () => {
  it('has labelled controls and passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = renderPrefsPanel(all, lang);
      expect(html).toContain(`lang="${htmlLang(lang)}"`);
      for (const id of ['gl-pref-size', 'gl-pref-spacing', 'gl-pref-contrast', 'gl-pref-motion', 'gl-pref-reset']) {
        expect(html).toContain(`id="${id}"`);
      }
      expect(auditHtml(`<main lang="${lang === 'en' ? 'en-CA' : 'fr-CA'}">${html}</main>`, `prefs.${lang}`).filter((f) => f.severity === 'error')).toEqual([]);
    }
  });

  it('marks the current choices', () => {
    const html = renderPrefsPanel({ ...DEFAULT_PREFS, textScale: 125, reduceMotion: true }, 'en');
    expect(html).toContain('<option value="125" selected>');
    expect(html).toMatch(/id="gl-pref-motion" checked/);
    expect(html).not.toMatch(/id="gl-pref-contrast" checked/);
    expect(TEXT_SCALES).toContain(125);
  });

  it('uses clean wording and French typography', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of Object.values(PREFS_UI[lang])) {
        expect(lintCopy(text)).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text)).toEqual([]);
      }
    }
  });
});

describe('createPrefs', () => {
  it('applies the defaults once at the start', () => {
    const calls: string[] = [];
    createPrefs({ apply: (c) => calls.push(c) });
    expect(calls).toEqual(['']);
  });

  it('follows the system reduce-motion setting until something is saved', () => {
    const p = createPrefs({ systemReducedMotion: () => true });
    expect(p.get().reduceMotion).toBe(true);
    const saved = new Mem();
    saved.setItem(PREFS_STORE_KEY, serialisePrefs(DEFAULT_PREFS));
    expect(createPrefs({ store: saved, systemReducedMotion: () => true }).get().reduceMotion).toBe(false);
  });

  it('changes, saves and applies each setting', () => {
    const store = new Mem();
    const calls: string[] = [];
    const p = createPrefs({ store, apply: (c) => calls.push(c) });
    expect(p.handle({ id: 'gl-pref-size', value: '150' })).toBe(true);
    expect(p.handle({ id: 'gl-pref-spacing', checked: true })).toBe(true);
    expect(p.handle({ id: 'gl-pref-contrast', checked: true })).toBe(true);
    expect(p.handle({ id: 'gl-pref-motion', checked: true })).toBe(true);
    expect(p.get()).toEqual({ textScale: 150, wideSpacing: true, highContrast: true, reduceMotion: true });
    expect(parsePrefs(store.getItem(PREFS_STORE_KEY) ?? '')).toEqual(p.get());
    expect(calls.at(-1)).toContain('font-size: 150%');
  });

  it('ignores invalid sizes and unchanged values', () => {
    const calls: string[] = [];
    const p = createPrefs({ apply: (c) => calls.push(c) });
    p.handle({ id: 'gl-pref-size', value: '175' });
    p.handle({ id: 'gl-pref-size', value: '100' });
    p.handle({ id: 'gl-pref-spacing', checked: false });
    p.handle({ id: 'gl-pref-spacing' });
    expect(p.get()).toEqual(DEFAULT_PREFS);
    expect(calls).toHaveLength(1);
  });

  it('claims only its own ids', () => {
    const p = createPrefs();
    expect(p.handle({ id: 'gl-pq', value: 'x' })).toBe(false);
    expect(p.handle({ id: 'gl-pref-unknown' })).toBe(false);
  });

  it('resets to defaults and saves that', () => {
    const store = new Mem();
    const p = createPrefs({ store });
    p.handle({ id: 'gl-pref-contrast', checked: true });
    p.handle({ id: 'gl-pref-reset' });
    expect(p.get()).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(store.getItem(PREFS_STORE_KEY) ?? '')).toEqual(DEFAULT_PREFS);
  });

  it('loads saved settings and ignores damaged ones', () => {
    const good = new Mem();
    good.setItem(PREFS_STORE_KEY, serialisePrefs(all));
    expect(createPrefs({ store: good }).get()).toEqual(all);
    const bad = new Mem();
    bad.setItem(PREFS_STORE_KEY, '{{');
    expect(createPrefs({ store: bad }).get()).toEqual(DEFAULT_PREFS);
  });

  it('keeps working when storage throws', () => {
    const broken: IndexStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    const p = createPrefs({ store: broken });
    p.handle({ id: 'gl-pref-motion', checked: true });
    expect(p.get().reduceMotion).toBe(true);
  });
});
