import { describe, expect, it } from 'vitest';
import {
  HELP_TOPICS,
  PLAIN_TERMS,
  frenchIssues,
  helpStrings,
  helpTopic,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  scanText,
  sourceLinks,
  checkLinks,
  type HelpTopic,
} from './index';

const LANGS = ['en', 'fr'] as const;
const ids = HELP_TOPICS.map((t) => t.id);

describe('help topics: shape', () => {
  it('has the topics people need, once each, in a stable order', () => {
    expect(ids).toEqual(['unknown', 'sources', 'age', 'disagree', 'features', 'questions', 'outing', 'compare', 'saved', 'offline', 'display', 'terms', 'language', 'limits']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every topic a kind, a title and at least one paragraph in both languages', () => {
    for (const t of HELP_TOPICS) {
      expect(['about', 'how-to', 'limits']).toContain(t.kind);
      for (const lang of LANGS) {
        expect(t.title[lang].trim(), `${t.id} title ${lang}`).not.toBe('');
        expect(t.body[lang].length, `${t.id} body ${lang}`).toBeGreaterThan(0);
        for (const p of t.body[lang]) expect(p.trim(), `${t.id} ${lang}`).not.toBe('');
      }
    }
  });

  it('keeps the two languages the same length so nothing is left out', () => {
    for (const t of HELP_TOPICS) expect(t.body.en.length, t.id).toBe(t.body.fr.length);
  });

  it('finds a topic by id and returns nothing for an unknown id', () => {
    expect(helpTopic('unknown')?.kind).toBe('about');
    expect(helpTopic('nope')).toBeUndefined();
    expect(helpTopic('')).toBeUndefined();
  });

  it('says the same thing about Unknown and Inconnu', () => {
    const t = helpTopic('unknown') as HelpTopic;
    expect(t.title.en).toContain('Unknown');
    expect(t.title.fr).toContain('Inconnu');
    expect(t.body.en.join(' ')).toContain('no information');
    expect(t.body.fr.join(' ')).toContain('pas d’information');
  });

  it('has a topic that says what the App cannot tell you', () => {
    const t = helpTopic('limits') as HelpTopic;
    expect(t.kind).toBe('limits');
    expect(t.body.en.join(' ')).toMatch(/not (?:a|an|medical)/i);
    expect(t.body.fr.join(' ')).toMatch(/n’est pas|ne /);
  });

  it('lists every glossary feature in the terms topic, in both languages', () => {
    const t = helpTopic('terms') as HelpTopic;
    for (const lang of LANGS) {
      const text = t.body[lang].join(' ');
      for (const term of PLAIN_TERMS) expect(text, `${lang} ${term.id}`).toContain(`[[${term.id}]]`);
    }
  });
});

describe('help topics: wording rules', () => {
  const all = LANGS.flatMap((lang) => helpStrings(lang).map((s) => ({ ...s, lang })));

  it('is a real body of copy', () => {
    expect(all.length).toBeGreaterThan(60);
  });

  it.each(all.map((s) => [s.where + ' ' + s.lang, s] as const))('%s has no banned wording', (_name, s) => {
    expect(lintCopy(s.text)).toEqual([]);
  });

  it('has no unsafe claim about a place anywhere', () => {
    expect(all.flatMap((s) => lintClaims(s.text).map((v) => `${s.where} ${s.lang}: ${v.rule} "${v.match}"`))).toEqual([]);
  });

  it('survives the deep scan, including hidden characters and split words', () => {
    expect(all.flatMap((s) => scanText(s.text).map((f) => `${s.where} ${s.lang}: ${f.rule}`))).toEqual([]);
  });

  it('keeps sentences short and plain', () => {
    const issues = all.flatMap((s) => plainLanguageIssues(s.text).map((i) => `${s.where} ${s.lang}: ${JSON.stringify(i)}`));
    expect(issues).toEqual([]);
  });

  it('follows French typography in the French copy', () => {
    const bad = all.filter((s) => s.lang === 'fr').flatMap((s) => frenchIssues(s.text).map((r) => `${s.where}: ${r}`));
    expect(bad).toEqual([]);
  });

  it('never uses a straight apostrophe or quote in the text people read', () => {
    for (const s of all) expect(s.text, s.where).not.toMatch(/['"]/);
  });

  it('never calls a place accessible, safe or suitable', () => {
    for (const s of all) expect(s.text.toLowerCase(), s.where).not.toMatch(/\b(?:is|are|est|sont) (?:fully |totally |entièrement )?(?:accessible|safe|sûr|sécuritaire)\b/);
  });
});

describe('help topics: links', () => {
  it('refers only to real glossary terms, written as [[id]] or [[id|words]]', () => {
    for (const t of HELP_TOPICS) {
      for (const lang of LANGS) {
        const found = t.body[lang].flatMap((p) => sourceLinks(p));
        expect(checkLinks(found), `${t.id} ${lang}`).toEqual([]);
      }
    }
  });

  it('uses the same terms in both languages', () => {
    for (const t of HELP_TOPICS) {
      const refs = (lang: 'en' | 'fr'): string[] => t.body[lang].flatMap((p) => sourceLinks(p)).map((l) => l.href).sort();
      expect(refs('fr'), t.id).toEqual(refs('en'));
    }
  });

  it('has no markdown link to another site', () => {
    for (const t of HELP_TOPICS) for (const lang of LANGS) for (const p of t.body[lang]) expect(p).not.toMatch(/\]\(/);
  });
});

describe('helpStrings', () => {
  it('names where each string came from', () => {
    const s = helpStrings('en');
    expect(s[0]).toEqual({ where: 'help.unknown.title', text: 'What “Unknown” means' });
    expect(s[1]?.where).toBe('help.unknown.0');
  });

  it('returns a title and every paragraph for every topic', () => {
    for (const lang of LANGS) {
      const expected = HELP_TOPICS.reduce((n, t) => n + 1 + t.body[lang].length, 0);
      expect(helpStrings(lang)).toHaveLength(expected);
    }
  });

  it('gives French strings in French, with a narrow no-break space inside the quotes', () => {
    expect(helpStrings('fr')[0]?.text).toBe('Ce que veut dire «\u202fInconnu\u202f»');
  });
});
