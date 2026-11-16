import { describe, expect, it } from 'vitest';
import { auditHtml } from './index';

const wrap = (inner: string): string => `<section lang="en">${inner}</section>`;
const rules = (html: string): string[] => auditHtml(html).map((f) => f.rule);

describe('auditHtml: clean markup', () => {
  it('passes a well-formed fragment', () => {
    const html = wrap(
      '<h2 id="t">Title</h2><label for="q">Search</label><input id="q" type="search">' +
        '<button type="button">Go</button><a href="/x">Link</a><img src="a.png" alt="Logo">',
    );
    expect(auditHtml(html)).toEqual([]);
  });
});

describe('auditHtml: language', () => {
  it('requires lang on the first element', () => {
    expect(rules('<section><h2>T</h2></section>')).toEqual(['missing-lang']);
    expect(rules('<section lang=""><h2>T</h2></section>')).toEqual(['missing-lang']);
  });

  it('can skip the check', () => {
    expect(auditHtml('<section><h2>T</h2></section>', 'x', { requireLang: false })).toEqual([]);
  });
});

describe('auditHtml: ids and references', () => {
  it('flags duplicate ids', () => {
    expect(rules(wrap('<h2 id="a">A</h2><p id="a">b</p>'))).toEqual(['duplicate-id']);
  });

  it('flags aria references to ids that do not exist', () => {
    expect(rules(wrap('<h2>T</h2><p aria-describedby="nope">x</p>'))).toEqual(['dangling-reference']);
    expect(rules(wrap('<h2>T</h2><p aria-labelledby="a nope"><i id="a">x</i></p>'))).toEqual(['dangling-reference']);
  });

  it('accepts aria references that resolve', () => {
    expect(rules(wrap('<h2 id="a">T</h2><p aria-describedby="a">x</p>'))).toEqual([]);
  });

  it('flags a label for a missing id', () => {
    expect(rules(wrap('<h2>T</h2><label for="zzz">Name</label>'))).toEqual(['dangling-reference']);
  });
});

describe('auditHtml: form controls', () => {
  it('flags a control with no accessible name', () => {
    expect(rules(wrap('<h2>T</h2><input id="q" type="text">'))).toEqual(['label-missing']);
    expect(rules(wrap('<h2>T</h2><select id="s"></select>'))).toEqual(['label-missing']);
    expect(rules(wrap('<h2>T</h2><textarea></textarea>'))).toEqual(['label-missing']);
  });

  it('accepts label[for], wrapping labels, aria-label and aria-labelledby', () => {
    expect(rules(wrap('<h2>T</h2><label for="q">Name</label><input id="q">'))).toEqual([]);
    expect(rules(wrap('<h2>T</h2><label>Name <input></label>'))).toEqual([]);
    expect(rules(wrap('<h2>T</h2><input aria-label="Name">'))).toEqual([]);
    expect(rules(wrap('<h2 id="h">T</h2><input aria-labelledby="h">'))).toEqual([]);
  });

  it('does not ask for labels on hidden or button-like inputs', () => {
    expect(rules(wrap('<h2>T</h2><input type="hidden"><input type="submit" value="Go">'))).toEqual([]);
  });

  it('flags an empty label', () => {
    expect(rules(wrap('<h2>T</h2><label for="q"> </label><input id="q">'))).toEqual(['label-missing', 'label-missing']);
  });
});

describe('auditHtml: names for buttons and links', () => {
  it('flags unnamed buttons and links', () => {
    expect(rules(wrap('<h2>T</h2><button></button>'))).toEqual(['button-name']);
    expect(rules(wrap('<h2>T</h2><a href="/x"><span></span></a>'))).toEqual(['link-name']);
  });

  it('accepts text, aria-label and image alt as the name', () => {
    expect(rules(wrap('<h2>T</h2><button aria-label="Close"></button>'))).toEqual([]);
    expect(rules(wrap('<h2>T</h2><a href="/x"><img src="a" alt="Home"></a>'))).toEqual([]);
    expect(rules(wrap('<h2>T</h2><button><b>Go</b></button>'))).toEqual([]);
  });

  it('ignores anchors without href', () => {
    expect(rules(wrap('<h2>T</h2><a name="top"></a>'))).toEqual([]);
  });

  it('warns about target=_blank without rel', () => {
    const f = auditHtml(wrap('<h2>T</h2><a href="/x" target="_blank">Go</a>'));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ rule: 'target-blank', severity: 'warning' });
    expect(rules(wrap('<h2>T</h2><a href="/x" target="_blank" rel="noopener">Go</a>'))).toEqual([]);
  });
});

describe('auditHtml: images, headings and focus order', () => {
  it('flags images without alt (an empty alt is allowed)', () => {
    expect(rules(wrap('<h2>T</h2><img src="a.png">'))).toEqual(['img-alt']);
    expect(rules(wrap('<h2>T</h2><img src="a.png" alt="">'))).toEqual([]);
  });

  it('flags skipped heading levels but not going back up', () => {
    expect(rules(wrap('<h2>A</h2><h4>B</h4>'))).toEqual(['heading-skip']);
    expect(rules(wrap('<h2>A</h2><h3>B</h3><h2>C</h2>'))).toEqual([]);
  });

  it('flags empty headings', () => {
    expect(rules(wrap('<h2></h2>'))).toEqual(['empty-heading']);
    expect(rules(wrap('<h2> <span></span> </h2>'))).toEqual(['empty-heading']);
  });

  it('flags positive tabindex only', () => {
    expect(rules(wrap('<h2>T</h2><div tabindex="3">x</div>'))).toEqual(['positive-tabindex']);
    expect(rules(wrap('<h2>T</h2><div tabindex="0">x</div>'))).toEqual([]);
    expect(rules(wrap('<h2>T</h2><div tabindex="-1">x</div>'))).toEqual([]);
  });
});

describe('auditHtml: reporting', () => {
  it('names where the problem is', () => {
    const [f] = auditHtml(wrap('<h2>T</h2><input id="q">'), 'shell.en');
    expect(f).toMatchObject({ rule: 'label-missing', where: 'shell.en <input#q>', severity: 'error' });
  });

  it('reports several problems at once', () => {
    expect(rules('<div><img src="a"><button></button><h3>x</h3><h5>y</h5></div>').sort()).toEqual([
      'button-name',
      'heading-skip',
      'img-alt',
      'missing-lang',
    ]);
  });

  it('copes with attributes in single quotes and unquoted values', () => {
    expect(rules("<section lang='en'><h2>T</h2><input aria-label=Name></section>")).toEqual([]);
  });

  it('returns nothing for empty input', () => {
    expect(auditHtml('')).toEqual([]);
  });
});
