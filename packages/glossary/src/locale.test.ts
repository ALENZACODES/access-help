import { describe, expect, it } from 'vitest';
import { DEFAULT_LANG, htmlLang, otherLang, pickLang } from './index';

describe('pickLang', () => {
  it('defaults to English', () => {
    expect(DEFAULT_LANG).toBe('en');
    expect(pickLang(null)).toBe('en');
    expect(pickLang(undefined)).toBe('en');
    expect(pickLang('')).toBe('en');
    expect(pickLang('de-DE,es;q=0.9')).toBe('en');
  });

  it('reads Accept-Language with q values', () => {
    expect(pickLang('fr-CA,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(pickLang('en-CA;q=0.7, fr;q=0.9')).toBe('fr');
    expect(pickLang('de, en;q=0.5, fr;q=0.4')).toBe('en');
  });

  it('breaks ties by order and ignores q=0', () => {
    expect(pickLang('fr, en')).toBe('fr');
    expect(pickLang('en, fr')).toBe('en');
    expect(pickLang('fr;q=0, en;q=0.1')).toBe('en');
  });

  it('accepts a navigator.languages style list', () => {
    expect(pickLang(['fr-CA', 'en-CA'])).toBe('fr');
    expect(pickLang(['de', 'en-US'])).toBe('en');
    expect(pickLang([])).toBe('en');
  });

  it('ignores malformed q values', () => {
    expect(pickLang('fr;q=abc, en;q=0.2')).toBe('fr');
  });
});

describe('otherLang / htmlLang', () => {
  it('swaps and maps', () => {
    expect(otherLang('en')).toBe('fr');
    expect(otherLang('fr')).toBe('en');
    expect(htmlLang('en')).toBe('en-CA');
    expect(htmlLang('fr')).toBe('fr-CA');
  });
});
