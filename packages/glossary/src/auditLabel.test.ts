import { describe, expect, it } from 'vitest';
import { auditHtml } from './index';

const rules = (html: string): string[] => auditHtml(`<div lang="en">${html}</div>`, 't').map((f) => f.rule);

describe('shown text must be inside the accessible name', () => {
  it('passes when the aria-label contains the text that is shown', () => {
    expect(rules('<button type="button" aria-label="Read aloud: Library">Read aloud</button>')).toEqual([]);
    expect(rules('<button type="button" aria-label="Show Library in the list">Show</button>')).toEqual([]);
  });
  it('fails when the name is worded another way', () => {
    expect(rules('<button type="button" aria-label="Read Library aloud">Read aloud</button>')).toEqual(['label-content-mismatch']);
    expect(rules('<a href="#x" aria-label="Go to the list">Places</a>')).toEqual(['label-content-mismatch']);
  });
  it('checks summaries too', () => {
    expect(rules('<details><summary aria-label="Report a problem about Library">Report a problem with this</summary></details>')).toEqual(['label-content-mismatch']);
    expect(rules('<details><summary aria-label="Report a problem: Library">Report a problem</summary></details>')).toEqual([]);
  });
  it('ignores case, spacing and non-breaking spaces', () => {
    expect(rules('<button type="button" aria-label="copier en texte\u00a0: Library">Copier  en texte</button>')).toEqual([]);
  });
  it('compares escaped text as the person hears and sees it', () => {
    expect(rules('<button type="button" aria-label="Remove &lt;b&gt; from A &amp; B">Remove &lt;b&gt;</button>')).toEqual([]);
  });
  it('says nothing when there is no aria-label, or no text is shown', () => {
    expect(rules('<button type="button">Save</button>')).toEqual([]);
    expect(rules('<button type="button" aria-label="Close"></button>')).toEqual([]);
    expect(rules('<details><summary>More</summary></details>')).toEqual([]);
  });
  it('names the element in the finding', () => {
    const found = auditHtml('<div lang="en"><button type="button" id="b1" aria-label="Other">Text</button></div>', 'page');
    expect(found[0]).toMatchObject({ rule: 'label-content-mismatch', where: 'page <button#b1>', severity: 'error' });
  });
});
