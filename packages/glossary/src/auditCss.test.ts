import { describe, expect, it } from 'vitest';
import { auditCss, parseRules, toPx } from './index';

const FOCUS = '.x:focus-visible { outline: 2px solid; }\n';
const rules = (css: string): string[] => auditCss(FOCUS + css).map((f) => f.rule);

describe('toPx', () => {
  it('converts px, rem and em, and refuses the rest', () => {
    expect(toPx('44px')).toBe(44);
    expect(toPx('2.75rem')).toBe(44);
    expect(toPx('1em')).toBe(16);
    expect(toPx(' 0.875rem ')).toBe(14);
    for (const v of ['auto', '100%', 'calc(1px + 2px)', 'var(--x)', '', '44']) expect(toPx(v)).toBeNull();
  });
});

describe('parseRules', () => {
  it('keeps rules inside @media and ignores comments', () => {
    const r = parseRules('/* c { a: b } */ a { color: red } @media (x) { b { margin: 0 !important } }');
    expect(r.map((x) => x.selector)).toEqual(['a', 'b']);
    expect(r[1]?.decls.get('margin')).toEqual({ value: '0', important: true });
  });
});

describe('auditCss: target size', () => {
  it('passes controls that are at least 44px tall', () => {
    expect(rules('button { min-height: 44px; }')).toEqual([]);
    expect(rules('button { min-height: 2.75rem; }')).toEqual([]);
    expect(rules('input { height: 48px; }')).toEqual([]);
  });

  it('fails short controls', () => {
    expect(rules('button { min-height: 30px; }')).toEqual(['target-size']);
    expect(rules('input { min-height: 2.5rem; }')).toEqual(['target-size']);
  });

  it('fails controls with no height at all, or one it cannot measure', () => {
    expect(rules('button { padding: 4px; }')).toEqual(['target-size']);
    expect(rules('select { min-height: auto; }')).toEqual(['target-size']);
    expect(rules("[role='button'] { color: red; }")).toEqual(['target-size']);
    expect(rules('.save-btn { color: red; }')).toEqual(['target-size']);
  });

  it('does not judge state rules, hidden inputs, checkboxes or non-controls', () => {
    expect(rules('button:hover { color: red; }')).toEqual([]);
    expect(rules("input[type='hidden'] { display: none; }")).toEqual([]);
    expect(rules("input[type='checkbox'] { margin: 0; }")).toEqual([]);
    expect(rules('p { color: red; }')).toEqual([]);
  });
});

describe('auditCss: focus', () => {
  it('requires a :focus-visible style somewhere', () => {
    expect(auditCss('button { min-height: 44px; }').map((f) => f.rule)).toEqual(['focus-visible-missing']);
  });

  it('flags removed outlines unless focus-visible keeps its own', () => {
    expect(rules('a:focus { outline: none; }')).toEqual(['outline-removed']);
    expect(rules('a { outline: 0; }')).toEqual(['outline-removed']);
    expect(rules('a { outline-width: 0px; }')).toEqual(['outline-removed']);
    expect(rules('a:focus:not(:focus-visible) { outline: none; }')).toEqual([]);
  });
});

describe('auditCss: text and motion', () => {
  it('flags text under 14px', () => {
    expect(rules('p { font-size: 12px; }')).toEqual(['small-text']);
    expect(rules('p { font-size: 0.75rem; }')).toEqual(['small-text']);
    expect(rules('p { font-size: 0.875rem; }')).toEqual([]);
    expect(rules('p { font-size: 1rem; }')).toEqual([]);
    expect(rules('p { font-size: larger; }')).toEqual([]);
  });

  it('does not let page styles lock text spacing', () => {
    expect(rules('p { line-height: 1.5 !important; }')).toEqual(['text-spacing-locked']);
    expect(rules('p { letter-spacing: 0.1em !important; }')).toEqual(['text-spacing-locked']);
    expect(rules('p { line-height: 1.5; }')).toEqual([]);
  });

  it('requires a reduced-motion rule when anything moves', () => {
    expect(rules('p { transition: color 1s; }')).toEqual(['motion-not-reducible']);
    expect(rules('p { animation: spin 1s; }')).toEqual(['motion-not-reducible']);
    expect(rules('p { transition: none; }')).toEqual([]);
    expect(
      rules('@media (prefers-reduced-motion: no-preference) { p { transition: color 1s; } }'),
    ).toEqual([]);
  });
});

describe('auditCss: reporting', () => {
  it('names the offending selector and uses error severity', () => {
    const [f] = auditCss(FOCUS + 'button { min-height: 30px; }', 'demo');
    expect(f).toMatchObject({ rule: 'target-size', where: 'button', severity: 'error' });
    expect(f?.detail).toContain('30px');
  });

  it('reports every problem, not only the first', () => {
    expect(rules('button { min-height: 10px; } p { font-size: 10px; } a { outline: none; }').sort()).toEqual([
      'outline-removed',
      'small-text',
      'target-size',
    ]);
  });
});
