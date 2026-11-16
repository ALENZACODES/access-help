import { describe, expect, it } from 'vitest';
import {
  PLAIN_TERMS,
  RELATED_PAIRS,
  RELATED_UI,
  auditHtml,
  frenchIssues,
  lintCopy,
  relatedIds,
  relatedSegments,
  relatedText,
  renderHelpPage,
  termHref,
  type Lang,
} from './index';

const ids = PLAIN_TERMS.map((t) => t.id);
const all = new Set(ids);

describe('RELATED_PAIRS', () => {
  it('only names features in the glossary', () => {
    for (const [a, b] of RELATED_PAIRS) {
      expect(all.has(a), a).toBe(true);
      expect(all.has(b), b).toBe(true);
    }
  });
  it('never pairs a feature with itself', () => {
    for (const [a, b] of RELATED_PAIRS) expect(a).not.toBe(b);
  });
  it('has no pair written twice, in either order', () => {
    const keys = RELATED_PAIRS.map(([a, b]) => [a, b].sort().join('|'));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('relatedIds', () => {
  it('works in both directions', () => {
    for (const [a, b] of RELATED_PAIRS) {
      expect(relatedIds(a)).toContain(b);
      expect(relatedIds(b)).toContain(a);
    }
  });
  it('lists each id once, in glossary order', () => {
    for (const id of ids) {
      const list = relatedIds(id);
      expect(new Set(list).size).toBe(list.length);
      const positions = list.map((x) => ids.indexOf(x));
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
      expect(list).not.toContain(id);
    }
  });
  it('is empty for an unknown id', () => {
    expect(relatedIds('nope')).toEqual([]);
    expect(relatedIds('')).toEqual([]);
  });
  it('gives the ramp its neighbours', () => {
    expect(relatedIds('ramp')).toEqual(['step-free-entrance', 'elevator']);
  });
});

describe('relatedSegments', () => {
  it.each(['en', 'fr'] as Lang[])('starts with the "See also" label in %s and ends with a full stop', (lang) => {
    const segs = relatedSegments('ramp', lang, all);
    const first = segs[0];
    expect(first?.kind === 'text' && first.text.startsWith(RELATED_UI[lang].seeAlso)).toBe(true);
    const last = segs[segs.length - 1];
    expect(last).toEqual({ kind: 'text', text: '.' });
  });
  it('puts a no-break-friendly space before the French colon', () => {
    const first = relatedSegments('ramp', 'fr', all)[0];
    expect(first?.kind === 'text' && first.text).toMatch(/^Voir aussi[\u202f\u00a0] ?: $/);
  });
  it('links a feature only when its definition is on the page', () => {
    const segs = relatedSegments('ramp', 'en', new Set(['elevator']));
    expect(segs.filter((s) => s.kind === 'term').map((s) => (s.kind === 'term' ? s.id : ''))).toEqual(['elevator']);
    expect(segs.some((s) => s.kind === 'text' && s.text === 'Step-free entrance')).toBe(true);
  });
  it('points every link at the definition', () => {
    for (const s of relatedSegments('ramp', 'en', all)) if (s.kind === 'term') expect(s.href).toBe(termHref(s.id));
  });
  it('is empty when nothing is related, or the id is unknown', () => {
    expect(relatedSegments('nope', 'en', all)).toEqual([]);
  });
  it('separates features with commas', () => {
    const text = relatedSegments('step-free-entrance', 'en', all).map((s) => (s.kind === 'term' ? s.label : s.text)).join('');
    expect(text.split(',').length).toBe(relatedIds('step-free-entrance').length);
  });
});

describe('relatedText', () => {
  it.each(['en', 'fr'] as Lang[])('is plain text with no markup in %s', (lang) => {
    for (const id of ids) {
      const text = relatedText(id, lang);
      expect(text).not.toMatch(/[<>[\]]/);
      expect(lintCopy(text)).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text)).toEqual([]);
    }
  });
  it('is empty for an unknown id', () => {
    expect(relatedText('nope', 'en')).toBe('');
  });
  it('matches the segments', () => {
    const joined = relatedSegments('grab-bar', 'en', all).map((s) => (s.kind === 'term' ? s.label : s.text)).join('');
    expect(relatedText('grab-bar', 'en')).toBe(joined);
  });
});

describe('termHref', () => {
  it('is an in-page anchor', () => {
    expect(termHref('ramp')).toBe('#gl-fd-ramp');
  });
});

describe('the help page shows See also', () => {
  it.each(['en', 'fr'] as Lang[])('under each related definition in %s, with links that land', (lang) => {
    const html = renderHelpPage(lang, '');
    expect(html).toContain(`${RELATED_UI[lang].seeAlso}`);
    for (const m of html.matchAll(/class="gl-term" href="#(gl-fd-[a-z-]+)"/g)) expect(html).toContain(`id="${m[1]}"`);
    expect(auditHtml(html, `help-related.${lang}`)).toEqual([]);
  });
  it('says nothing about any place', () => {
    expect(renderHelpPage('en', '')).not.toMatch(/accessible overall|verified/i);
  });
});
