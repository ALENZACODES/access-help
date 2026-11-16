import { describe, expect, it } from 'vitest';
import {
  INDEX_UI,
  LETTER_ID_PREFIX,
  anchorTermIds,
  auditHtml,
  auditLinks,
  frenchIssues,
  groupByLetter,
  indexLetter,
  indexLinks,
  letterId,
  listTerms,
  renderIndexNav,
  type Lang,
  type ResolvedTerm,
} from './index';

const fake = (id: string, term: string): ResolvedTerm => ({ id, term, plain: 'x', known: true } as ResolvedTerm);
const sample = [fake('a', 'Apple'), fake('b', 'Banana'), fake('a2', 'avocado'), fake('e', 'Écran'), fake('n', '3 doors')];

describe('indexLetter', () => {
  it.each([
    ['Ramp', 'R'],
    ['ramp', 'R'],
    ['Écran', 'E'],
    ['  élevé', 'E'],
    ['3 doors', '#'],
    ['', '#'],
    ['¿Qué?', '#'],
    ['Œuvre', 'O'],
  ])('%s is under %s', (name, letter) => expect(indexLetter(name)).toBe(letter));
});

describe('groupByLetter', () => {
  const groups = groupByLetter(sample);
  it('lists letters in order with "#" last', () => {
    expect(groups.map((g) => g.letter)).toEqual(['A', 'B', 'E', '#']);
  });
  it('keeps the given order inside a letter', () => {
    expect(groups[0]?.terms.map((t) => t.id)).toEqual(['a', 'a2']);
  });
  it('has every term exactly once', () => {
    expect(groups.flatMap((g) => g.terms).length).toBe(sample.length);
  });
  it('is empty for no terms', () => {
    expect(groupByLetter([])).toEqual([]);
  });
});

describe('letterId and anchorTermIds', () => {
  it('makes safe ids', () => {
    expect(letterId('R')).toBe(`${LETTER_ID_PREFIX}r`);
    expect(letterId('#')).toBe(`${LETTER_ID_PREFIX}other`);
  });
  it('anchors the first term of each letter', () => {
    const anchors = anchorTermIds(groupByLetter(sample));
    expect(anchors.get('a')).toBe('gl-az-a');
    expect(anchors.has('a2')).toBe(false);
    expect(anchors.get('n')).toBe('gl-az-other');
    expect(anchors.size).toBe(4);
  });
});

describe('indexLinks', () => {
  it('says how many terms each letter has', () => {
    const links = indexLinks(sample, 'en');
    expect(links[0]).toMatchObject({ letter: 'A', href: '#gl-az-a', count: 2, label: 'A, 2 terms' });
    expect(links[1]?.label).toBe('B, 1 term');
  });
  it('uses French words and spacing', () => {
    const links = indexLinks(sample, 'fr');
    expect(links[1]?.label).toBe('B, 1 terme');
    for (const l of links) expect(frenchIssues(l.label)).toEqual([]);
  });
});

describe('renderIndexNav', () => {
  it('is empty for nothing to jump between', () => {
    expect(renderIndexNav([], 'en')).toBe('');
    expect(renderIndexNav([fake('a', 'Apple'), fake('a2', 'Ant')], 'en')).toBe('');
  });
  it.each(['en', 'fr'] as Lang[])('is a labelled navigation with a link per letter in %s', (lang) => {
    const html = renderIndexNav(listTerms(lang), lang);
    expect(html).toContain(`<nav aria-label="${INDEX_UI[lang].label}">`);
    expect(html.match(/<a /g)?.length).toBe(groupByLetter(listTerms(lang)).length);
  });
  it('lands every link when the anchors are on the page', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const terms = listTerms(lang);
      const anchors = [...anchorTermIds(groupByLetter(terms)).values()].map((id) => `<p id="${id}">x</p>`).join('');
      const html = `<div lang="${lang}">${renderIndexNav(terms, lang)}${anchors}</div>`;
      expect(auditHtml(html, 'index')).toEqual([]);
      expect(auditLinks(html, 'index')).toEqual([]);
    }
  });
  it('fails the link audit when an anchor is missing', () => {
    const html = `<div lang="en">${renderIndexNav(sample, 'en')}</div>`;
    expect(auditLinks(html, 'index').length).toBeGreaterThan(0);
  });
});

describe('the shipped glossary index', () => {
  it.each(['en', 'fr'] as Lang[])('has every term under one letter in %s', (lang) => {
    const terms = listTerms(lang);
    expect(groupByLetter(terms).flatMap((g) => g.terms).map((t) => t.id).sort()).toEqual(terms.map((t) => t.id).sort());
  });
});
