import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HELP_TOPICS,
  PLAIN_TERMS,
  checkLinks,
  helpCountText,
  helpTermIds,
  helpView,
  lintClaims,
  lintCopy,
  scanText,
  searchHelp,
  segmentRefs,
  type HelpSegment,
} from './index';

const all = new Set(PLAIN_TERMS.map((t) => t.id));
const none = new Set<string>();
const text = (segs: readonly HelpSegment[]): string => segs.map((s) => (s.kind === 'term' ? s.label : s.text)).join('');

describe('segmentRefs', () => {
  it('splits words and term links', () => {
    expect(segmentRefs('Use [[ramp|a ramp]] here.', 'en', all)).toEqual([
      { kind: 'text', text: 'Use ' },
      { kind: 'term', id: 'ramp', label: 'a ramp', href: '#gl-fd-ramp' },
      { kind: 'text', text: ' here.' },
    ]);
  });

  it('uses the glossary name in the right language when no words are given', () => {
    expect(segmentRefs('[[ramp]]', 'en', all)).toEqual([{ kind: 'term', id: 'ramp', label: 'Ramp', href: '#gl-fd-ramp' }]);
    expect(segmentRefs('[[ramp]]', 'fr', all)).toEqual([{ kind: 'term', id: 'ramp', label: 'Rampe', href: '#gl-fd-ramp' }]);
  });

  it('keeps plain words when the definition is not on the page, so there is no dead link', () => {
    expect(segmentRefs('Use [[ramp|a ramp]] here.', 'en', none)).toEqual([{ kind: 'text', text: 'Use a ramp here.' }]);
  });

  it('does the same for a term that does not exist', () => {
    expect(segmentRefs('See [[nonsense|this]].', 'en', all)).toEqual([{ kind: 'text', text: 'See this.' }]);
  });

  it('handles several references, none and empty text', () => {
    expect(segmentRefs('[[ramp]], [[elevator]]', 'en', all).map((s) => s.kind)).toEqual(['term', 'text', 'term']);
    expect(segmentRefs('Plain.', 'en', all)).toEqual([{ kind: 'text', text: 'Plain.' }]);
    expect(segmentRefs('', 'en', all)).toEqual([]);
  });

  it('gives only text and term segments with no markup to escape', () => {
    const segs = segmentRefs('<b>x</b> [[ramp]]', 'en', all);
    expect(segs[0]).toEqual({ kind: 'text', text: '<b>x</b> ' });
  });
});

describe('helpView', () => {
  it.each(['en', 'fr'] as const)('has a title, a search label, a count and every topic (%s)', (lang) => {
    const v = helpView('', lang, all);
    expect(v.title).not.toBe('');
    expect(v.searchLabel).not.toBe('');
    expect(v.empty).toBe(false);
    expect(v.count).toBe(helpCountText(lang, HELP_TOPICS.length));
    expect(v.topics.map((t) => t.id)).toEqual(HELP_TOPICS.map((t) => t.id));
  });

  it('follows the search', () => {
    const v = helpView('offline', 'en', all);
    expect(v.topics.map((t) => t.id).sort()).toEqual(searchHelp('offline', 'en').map((t) => t.id).sort());
    expect(v.count).toBe(helpCountText('en', v.topics.length));
  });

  it('says so when nothing matches', () => {
    const v = helpView('zzzzzz', 'fr', all);
    expect(v.empty).toBe(true);
    expect(v.topics).toEqual([]);
    expect(v.count).toBe('Aucun sujet d’aide ne correspond.');
  });

  it('keeps paragraphs in order with the same count as the copy', () => {
    for (const t of helpView('', 'en', all).topics) {
      expect(t.paragraphs.length).toBe(HELP_TOPICS.find((x) => x.id === t.id)?.body.en.length);
    }
  });

  it('never links to a definition that is not on the page', () => {
    for (const lang of ['en', 'fr'] as const) {
      const shown = new Set(['ramp', 'elevator']);
      const links = helpView('', lang, shown).topics.flatMap((t) => t.paragraphs.flat()).filter((s) => s.kind === 'term');
      expect(links.length).toBeGreaterThan(0);
      for (const l of links) if (l.kind === 'term') expect(shown.has(l.id), l.id).toBe(true);
    }
  });

  it('has no links at all when no definitions are shown', () => {
    const links = helpView('', 'en', none).topics.flatMap((t) => t.paragraphs.flat()).filter((s) => s.kind === 'term');
    expect(links).toEqual([]);
  });

  it('shows the same words with or without links', () => {
    const a = helpView('', 'en', all).topics.map((t) => t.paragraphs.map(text));
    const b = helpView('', 'en', none).topics.map((t) => t.paragraphs.map(text));
    expect(b).toEqual(a);
  });

  it('shows words that pass every wording rule', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const t of helpView('', lang, all).topics) {
        for (const p of t.paragraphs) {
          const line = text(p);
          expect(lintCopy(line), line).toEqual([]);
          expect(lintClaims(line), line).toEqual([]);
          expect(scanText(line), line).toEqual([]);
        }
      }
    }
  });

  it('has links the link checker accepts', () => {
    const links = helpView('', 'en', all).topics.flatMap((t) => t.paragraphs.flat()).flatMap((s) => (s.kind === 'term' ? [{ kind: 'html' as const, href: s.href, label: s.label }] : []));
    const ids = new Set(PLAIN_TERMS.map((t) => `gl-fd-${t.id}`));
    expect(checkLinks(links, { ids })).toEqual([]);
  });
});

describe('helpView: highlighted matches', () => {
  const flat = (v: ReturnType<typeof helpView>): string => v.topics.flatMap((t) => t.paragraphs.flat()).map((s) => ('text' in s ? s.text : s.label)).join(' ');
  it('marks the words typed in the paragraphs and the title', () => {
    const v = helpView('unknown', 'en', all);
    expect(v.topics.length).toBeGreaterThan(0);
    expect(v.topics.some((t) => t.paragraphs.some((p) => p.some((s) => s.kind === 'mark')))).toBe(true);
    expect(v.topics.every((t) => t.titlePieces.map((p) => p.text).join('') === t.title)).toBe(true);
  });
  it('marks nothing for an empty search', () => {
    const v = helpView('', 'en', all);
    expect(v.topics.some((t) => t.paragraphs.some((p) => p.some((s) => s.kind === 'mark')))).toBe(false);
    expect(v.topics.every((t) => t.titlePieces.every((p) => !p.match))).toBe(true);
  });
  it('keeps the words of every paragraph when marking', () => {
    expect(flat(helpView('place', 'en', all)).length).toBeGreaterThan(0);
    const plain = helpView('', 'en', all).topics.find((t) => t.id === 'unknown');
    const marked = helpView('unknown', 'en', all).topics.find((t) => t.id === 'unknown');
    const words = (t: typeof plain): string => (t?.paragraphs ?? []).flat().map((s) => ('text' in s ? s.text : s.label)).join('').replace(/\s+/g, ' ');
    expect(words(marked)).toBe(words(plain));
  });
  it('ranks a title match first', () => {
    const v = helpView('sources', 'en', all);
    expect(v.topics[0]?.title.toLowerCase()).toContain('source');
  });
  it('finds a feature by the name a French reader sees', () => {
    expect(helpView('rampe', 'fr', all).topics.map((t) => t.id)).toContain('terms');
  });
});

describe('helpTermIds', () => {
  it('lists the terms the help copy links to, all real', () => {
    const ids = helpTermIds();
    expect(ids.size).toBeGreaterThan(5);
    for (const id of ids) expect(all.has(id), id).toBe(true);
  });
});

describe('the live /glossary route', () => {
  const page = readFileSync(new URL('../../../apps/centre/src/GlossaryPage.tsx', import.meta.url), 'utf8');

  it('shows the help topics from this package', () => {
    expect(page).toContain('helpView');
    expect(page).toContain('"@access/glossary"');
  });

  it('gives each definition the id that the help links point to', () => {
    expect(page).toContain('id={`gl-fd-${term.id}`}');
  });

  it('labels the help search box and announces the count politely', () => {
    expect(page).toContain('htmlFor="gl-hq"');
    expect(page).toContain('aria-live="polite"');
  });

  it('links to a term only while its definition is listed', () => {
    expect(page).toMatch(/const listed = useMemo\(\(\) => new Set\(terms\.map/);
    expect(page).toContain('helpView(helpQuery, language, listed)');
  });

  it('keeps its own text free of banned wording', () => {
    expect(lintCopy(page)).toEqual([]);
  });
});
