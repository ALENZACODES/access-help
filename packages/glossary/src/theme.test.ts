import { describe, expect, it } from 'vitest';
import { GLOSSARY_CSS, PLACE_CSS, THEME_CSS, auditCss, fullGlossaryCss } from './index';

describe('fullGlossaryCss', () => {
  it('joins the three style sheets', () => {
    const css = fullGlossaryCss();
    for (const part of [GLOSSARY_CSS, PLACE_CSS, THEME_CSS]) expect(css).toContain(part);
  });

  it('passes the stylesheet audit', () => {
    expect(auditCss(fullGlossaryCss())).toEqual([]);
  });

  it('responds to contrast, forced-colour, reduced-motion and print settings', () => {
    expect(THEME_CSS).toContain('prefers-contrast: more');
    expect(THEME_CSS).toContain('forced-colors: active');
    expect(THEME_CSS).toContain('prefers-reduced-motion');
    expect(THEME_CSS).toContain('@media print');
  });

  it('keeps the focus ring visible in forced-colour mode', () => {
    expect(THEME_CSS).toMatch(/\.gl-input:focus-visible \{ outline-color: Highlight/);
  });
});
