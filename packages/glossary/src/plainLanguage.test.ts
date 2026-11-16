import { describe, expect, it } from 'vitest';
import { countWords, plainLanguageIssues, splitSentences } from './index';

describe('splitSentences / countWords', () => {
  it('splits on sentence ends and keeps French spacing intact', () => {
    expect(splitSentences('One two. Three four!  Five?')).toEqual(['One two.', 'Three four!', 'Five?']);
    expect(splitSentences('Vraiment ? Oui.')).toEqual(['Vraiment ?', 'Oui.']);
  });

  it('counts words across ordinary and no-break spaces', () => {
    expect(countWords('a b c d')).toBe(4);
    expect(countWords('   ')).toBe(0);
  });
});

describe('plainLanguageIssues', () => {
  const long = Array.from({ length: 25 }, (_, i) => `w${i}`).join(' ') + '.';

  it('flags sentences over the limit', () => {
    const issues = plainLanguageIssues(long);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ rule: 'long-sentence', words: 25 });
  });

  it('honours maxWords', () => {
    expect(plainLanguageIssues(long, { maxWords: 30 })).toEqual([]);
    expect(plainLanguageIssues('One two three four.', { maxWords: 3 })).toHaveLength(1);
  });

  it('flags shouting words but allows listed ones', () => {
    expect(plainLanguageIssues('Please NOTE this.')[0]).toMatchObject({ rule: 'all-caps-word', text: 'NOTE' });
    expect(plainLanguageIssues('See WCAG here.', { allow: ['wcag'] })).toEqual([]);
    expect(plainLanguageIssues('Use the CBC or the ER.')).toHaveLength(0);
  });

  it('passes short plain text', () => {
    expect(plainLanguageIssues('A gently sloped surface used instead of steps.')).toEqual([]);
  });
});
