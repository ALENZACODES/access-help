import { describe, expect, it } from 'vitest';
import {
  frenchIssues,
  lintCopy,
  plainLanguageIssues,
  renderShell,
  buildIndex,
  type Lang,
} from './index';
import { GLOSSARY_META, TERMS, UNKNOWN_TERM } from './plainTerms';
import { UI } from './render';

const langs: readonly Lang[] = ['en', 'fr'];
const all = [...TERMS, UNKNOWN_TERM];

/** Runs the shared copy rules over every user-facing string the package ships. */
describe('shipped copy', () => {
  it('passes the wording rules in EN and FR', () => {
    for (const t of all) {
      for (const l of langs) {
        expect(lintCopy(`${t[l].term} ${t[l].plain}`)).toEqual([]);
      }
    }
    for (const l of langs) {
      const ui = UI[l];
      expect(lintCopy([ui.title, ui.searchLabel, ui.none, ui.one, ui.many(3)].join(' '))).toEqual([]);
    }
  });

  it('follows French typography', () => {
    for (const t of all) expect(frenchIssues(`${t.fr.term} ${t.fr.plain}`)).toEqual([]);
    const fr = UI.fr;
    for (const s of [fr.title, fr.searchLabel, fr.none, fr.one, fr.many(3)]) {
      expect(frenchIssues(s)).toEqual([]);
    }
  });

  it('is written in plain language', () => {
    for (const t of all) {
      for (const l of langs) expect(plainLanguageIssues(t[l].plain)).toEqual([]);
    }
  });

  it('renders shells that also pass', () => {
    for (const l of langs) {
      const text = renderShell({ lang: l, index: buildIndex(l), claims: [] }).replace(/<[^>]+>/g, ' ');
      expect(lintCopy(text)).toEqual([]);
      if (l === 'fr') expect(frenchIssues(text.replace(/\s+/g, ' ').trim())).not.toContain('straight-apostrophe');
    }
  });

  it('records where the glossary text came from', () => {
    expect(GLOSSARY_META.source.length).toBeGreaterThan(0);
    expect(GLOSSARY_META.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
