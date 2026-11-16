import { describe, expect, it } from 'vitest';
import {
  HELP_TOPICS,
  UI_TABLES,
  STRING_TABLES,
  allParity,
  glossaryParity,
  recordParity,
  stringPair,
  tableParity,
  topicParity,
  type HelpTopic,
  type ParityRule,
} from './index';

const rules = (issues: readonly { readonly rule: ParityRule }[]): ParityRule[] => issues.map((i) => i.rule);

describe('stringPair', () => {
  it('passes a real translation', () => {
    expect(stringPair('x', 'Search places by name', 'Chercher des lieux par nom')).toEqual([]);
  });

  it('flags an empty string in either language', () => {
    expect(rules(stringPair('x', '', 'Rampe'))).toEqual(['empty']);
    expect(rules(stringPair('x', 'Ramp', '  '))).toEqual(['empty']);
    expect(stringPair('x', '', 'Rampe')[0]?.detail).toBe('English is empty.');
    expect(stringPair('x', 'Ramp', '')[0]?.detail).toBe('French is empty.');
  });

  it('flags French that is just the English again, whatever the case', () => {
    expect(rules(stringPair('x', 'Save places', 'Save places'))).toContain('untranslated');
    expect(rules(stringPair('x', 'Unknown', 'unknown'))).toContain('untranslated');
  });

  it('lets listed names, symbols and numbers stay the same', () => {
    expect(stringPair('x', 'CSV', 'CSV', { sameOk: ['CSV'] })).toEqual([]);
    expect(stringPair('x', '·', '·')).toEqual([]);
    expect(stringPair('x', '12', '12')).toEqual([]);
  });

  it('flags English function words inside French', () => {
    const found = stringPair('x', 'Save your places', 'Enregistrez your lieux');
    expect(rules(found)).toContain('english-in-french');
    expect(found.find((f) => f.rule === 'english-in-french')?.detail).toContain('your');
  });

  it('flags French letters inside English', () => {
    expect(rules(stringPair('x', 'Entrée', 'Entrée à gauche'))).toContain('french-in-english');
  });

  it('flags numbers that differ between the languages', () => {
    expect(rules(stringPair('x', 'Up to 5 places', 'Jusqu’à 6 lieux'))).toEqual(['placeholder-mismatch']);
    expect(stringPair('x', 'Up to 5 places', 'Jusqu’à 5 lieux')).toEqual([]);
  });

  it('names where the problem is', () => {
    expect(stringPair('ui.finder.title', '', 'x')[0]?.where).toBe('ui.finder.title');
  });
});

describe('tableParity', () => {
  const ok = { en: { a: 'Save', b: (n: number) => `${n} places` }, fr: { a: 'Enregistrer', b: (n: number) => `${n} lieux` } };

  it('passes a matching table with string-building functions', () => {
    expect(tableParity('t', ok)).toEqual([]);
  });

  it('flags a key that only one language has', () => {
    const found = tableParity('t', { en: { a: 'Save', extra: 'Extra' }, fr: { a: 'Enregistrer' } });
    expect(found).toEqual([{ rule: 'missing-key', where: 't.extra', detail: 'Only English has "extra".' }]);
    expect(tableParity('t', { en: { a: 'Save' }, fr: { a: 'Enregistrer', b: 'Autre' } })[0]?.detail).toBe('Only French has "b".');
  });

  it('flags a string in one language and a function in the other', () => {
    expect(rules(tableParity('t', { en: { a: 'x' }, fr: { a: () => 'x' } }))).toEqual(['type-mismatch']);
  });

  it('flags a French string left in English', () => {
    expect(rules(tableParity('t', { en: { a: 'Save places' }, fr: { a: 'Save places' } }))).toEqual(['untranslated']);
  });

  it('checks the text a function builds, not just that it exists', () => {
    const bad = { en: { b: (n: number) => `${n} places shown` }, fr: { b: (n: number) => `${n} places shown` } };
    expect(rules(tableParity('t', bad))).toContain('untranslated');
  });

  it('flags a function whose French output is missing for an input the English handles', () => {
    const bad = { en: { b: (n: number) => `${n} places` }, fr: { b: (n: number) => (n > 100 ? 'x' : (undefined as never)) } };
    expect(rules(tableParity('t', bad))).toContain('placeholder-mismatch');
  });

  it('does not call a label made only of a name untranslated', () => {
    const t = { en: { label: (name: string) => name }, fr: { label: (name: string) => name } };
    expect(tableParity('t', t)).toEqual([]);
  });

  it('walks nested tables', () => {
    const found = tableParity('t', { en: { deep: { a: 'Save places' } }, fr: { deep: { a: 'Save places' } } });
    expect(found[0]?.where).toBe('t.deep.a');
  });
});

describe('recordParity', () => {
  it('checks each id', () => {
    const found = recordParity('q', { a: { en: 'Is there a ramp?', fr: 'Is there a ramp?' }, b: { en: 'Is there a lift?', fr: 'Y a-t-il un ascenseur ?' } });
    expect(found.map((f) => f.where)).toEqual(['q.a', 'q.a']);
  });
});

describe('topicParity', () => {
  const base = HELP_TOPICS[0] as HelpTopic;

  it('passes the help copy we ship', () => {
    expect(topicParity()).toEqual([]);
  });

  it('flags topics with a different number of paragraphs', () => {
    const t: HelpTopic = { ...base, body: { en: ['One.', 'Two.'], fr: ['Un.'] } };
    expect(topicParity([t])).toEqual([{ rule: 'paragraph-count', where: `help.${t.id}`, detail: '2 English and 1 French paragraphs.' }]);
  });

  it('flags a link that one language has and the other lacks', () => {
    const t: HelpTopic = { ...base, body: { en: ['Use [[ramp|a ramp]] here.'], fr: ['Utilisez une rampe ici.'] } };
    expect(rules(topicParity([t]))).toContain('link-mismatch');
  });

  it('flags a link to a different term', () => {
    const t: HelpTopic = { ...base, body: { en: ['Use [[ramp|a ramp]] here.'], fr: ['Utilisez [[elevator|un ascenseur]] ici.'] } };
    expect(rules(topicParity([t]))).toContain('link-mismatch');
  });

  it('flags an untranslated title and untranslated paragraphs', () => {
    const t: HelpTopic = { ...base, title: { en: 'Saved places', fr: 'Saved places' }, body: { en: ['Save places.'], fr: ['Save places.'] } };
    expect(rules(topicParity([t])).filter((r) => r === 'untranslated')).toHaveLength(2);
  });
});

describe('glossaryParity', () => {
  it('passes every glossary entry', () => {
    expect(glossaryParity()).toEqual([]);
  });
});

describe('allParity: everything the package ships', () => {
  it('has nothing untranslated, missing, mismatched or in the wrong language', () => {
    const issues = allParity(UI_TABLES).map((i) => `${i.rule} ${i.where}: ${i.detail}`);
    expect(issues).toEqual([]);
  });

  it('covers every table and fails when a table is broken', () => {
    const broken = { ...UI_TABLES, extra: { en: { a: 'Save places' }, fr: { a: 'Save places' } } };
    expect(allParity(broken).map((i) => i.where)).toContain('ui.extra.a');
  });

  it('checks the small string tables too', () => {
    for (const [name, t] of Object.entries(STRING_TABLES)) {
      expect(stringPair(name, t.en, t.fr), name).toEqual([]);
    }
  });
});
