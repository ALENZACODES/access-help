import { describe, expect, it } from 'vitest';
import {
  anchorIds,
  auditLinks,
  checkLink,
  checkLinks,
  htmlLinks,
  renderHelpPage,
  sampleMarkup,
  sourceLinks,
  type FoundLink,
  type LinkRule,
} from './index';

const html = (href: string, label = 'Where to find the entrance'): FoundLink => ({ kind: 'html', href, label });
const rules = (link: FoundLink, ctx = {}): LinkRule[] => checkLink(link, ctx).map((p) => p.rule);

describe('htmlLinks', () => {
  it('reads href and text, dropping tags inside the link', () => {
    expect(htmlLinks('<p><a class="x" href="#gl-fd-ramp">the <b>ramp</b> entry</a></p>')).toEqual([
      { kind: 'html', href: '#gl-fd-ramp', label: 'the ramp entry' },
    ]);
  });

  it('reads single-quoted and unquoted addresses and decodes entities', () => {
    const found = htmlLinks("<a href='/a?x=1&amp;y=2'>A</a><a href=/b>B</a>");
    expect(found.map((l) => l.href)).toEqual(['/a?x=1&y=2', '/b']);
  });

  it('falls back to aria-label when the link has no text', () => {
    expect(htmlLinks('<a href="/x" aria-label="Open the saved list"><svg></svg></a>')[0]?.label).toBe('Open the saved list');
  });

  it('reports a missing href as an empty address', () => {
    expect(htmlLinks('<a>Text</a>')[0]?.href).toBe('');
  });

  it('is empty when there are no links', () => {
    expect(htmlLinks('<p>No links</p>')).toEqual([]);
  });
});

describe('sourceLinks', () => {
  it('finds term references with and without a label', () => {
    expect(sourceLinks('See [[ramp]] and [[step-free|no steps]].')).toEqual([
      { kind: 'term', href: 'ramp', label: 'ramp' },
      { kind: 'term', href: 'step-free', label: 'no steps' },
    ]);
  });

  it('finds markdown links without mistaking term references for them', () => {
    expect(sourceLinks('A [page](/help) and [[ramp|a ramp]].').map((l) => l.kind)).toEqual(['term', 'markdown']);
  });

  it('keeps the label order straight: id first, label second', () => {
    const [first] = sourceLinks('[[a ramp|ramp]]');
    expect(first).toEqual({ kind: 'term', href: 'a ramp', label: 'ramp' });
  });
});

describe('anchorIds', () => {
  it('collects every id', () => {
    expect([...anchorIds('<h2 id="a"></h2><p id=\'b\'></p><div id="a"></div>')].sort()).toEqual(['a', 'b']);
  });
});

describe('checkLink: addresses', () => {
  it('accepts on-site paths and relative paths', () => {
    expect(rules(html('/help/saved'))).toEqual([]);
    expect(rules(html('saved.html'))).toEqual([]);
    expect(rules(html('?lang=fr'))).toEqual([]);
  });

  it('rejects an empty address, including one made only of invisible characters', () => {
    expect(rules(html(''))).toEqual(['link-empty-href']);
    expect(rules(html('   '))).toEqual(['link-empty-href']);
    expect(rules(html('​'))).toEqual(['link-empty-href']);
  });

  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)', ' javascript:x', 'data:text/html,hi', 'vbscript:x', 'file:///etc/passwd', 'mailto:a@b.c', 'tel:+14165550100', 'blob:abc'])(
    'rejects the scheme in %j',
    (href) => {
      expect(rules(html(href))).toContain('link-unsafe-scheme');
    },
  );

  it('rejects http and protocol-relative links', () => {
    expect(rules(html('http://example.org/x'))).toEqual(['link-insecure']);
    expect(rules(html('//example.org/x'))).toEqual(['link-external']);
  });

  it('rejects other sites unless the host is allowed', () => {
    expect(rules(html('https://example.org/x'))).toEqual(['link-external']);
    expect(rules(html('https://example.org/x'), { allowedHosts: ['Example.org'] })).toEqual([]);
    expect(rules(html('https://evil.example.org/x'), { allowedHosts: ['example.org'] })).toEqual(['link-external']);
    expect(rules(html('https://example.org.evil.test/x'), { allowedHosts: ['example.org'] })).toEqual(['link-external']);
  });

  it('does not let a port or userinfo trick pass as an allowed host', () => {
    expect(rules(html('https://example.org@evil.test/x'), { allowedHosts: ['example.org'] })).toEqual(['link-external']);
  });
});

describe('checkLink: anchors', () => {
  const ids = new Set(['gl-fd-ramp', 'top']);

  it('accepts an anchor that exists', () => {
    expect(rules(html('#gl-fd-ramp'), { ids })).toEqual([]);
  });

  it('flags an anchor that does not exist', () => {
    expect(checkLink(html('#gl-fd-nowhere'), { ids })[0]).toMatchObject({ rule: 'link-broken-anchor', detail: 'No element with id "gl-fd-nowhere".' });
  });

  it('flags a bare # even when it cannot know the ids', () => {
    expect(rules(html('#'))).toEqual(['link-broken-anchor']);
  });

  it('cannot judge an anchor without ids, so it lets it through', () => {
    expect(rules(html('#anything'))).toEqual([]);
  });
});

describe('checkLink: labels', () => {
  it.each(['Click here', 'click here.', 'Here', 'Read more', 'Learn more…', 'link', 'This link', 'Details', 'Cliquez ici', 'Ici', 'En savoir plus', 'Lire la suite', 'Plus', 'Lien', 'Ce lien', 'Détails', 'DETAILS'])(
    'flags the vague label %j',
    (label) => {
      expect(rules(html('/help', label))).toEqual(['link-vague-label']);
    },
  );

  it('flags a link with no text', () => {
    expect(rules(html('/help', ''))).toEqual(['link-empty-label']);
    expect(rules(html('/help', '   '))).toEqual(['link-empty-label']);
  });

  it('accepts labels that say where the link goes', () => {
    expect(rules(html('/help', 'About the offline list'))).toEqual([]);
    expect(rules(html('/aide', 'À propos de la liste hors ligne'))).toEqual([]);
  });
});

describe('checkLink: term references', () => {
  it('accepts a real glossary id', () => {
    expect(rules({ kind: 'term', href: 'ramp', label: 'ramp' })).toEqual([]);
  });

  it('flags an id that is not a glossary term', () => {
    expect(rules({ kind: 'term', href: 'a ramp', label: 'ramp' })).toEqual(['link-unknown-term']);
    expect(rules({ kind: 'term', href: '', label: '' })).toEqual(['link-unknown-term']);
  });

  it('can be told which ids are allowed', () => {
    expect(rules({ kind: 'term', href: 'ramp', label: 'ramp' }, { termIds: new Set(['elevator']) })).toEqual(['link-unknown-term']);
  });
});

describe('checkLinks and auditLinks', () => {
  it('collects problems from every link', () => {
    const found = [html('/ok'), html('http://x.test/'), html('#no', 'Here')];
    expect(checkLinks(found, { ids: new Set() }).map((p) => p.rule)).toEqual(['link-insecure', 'link-vague-label', 'link-broken-anchor']);
  });

  it('turns problems into audit findings that name the address', () => {
    const f = auditLinks('<h2 id="a">A</h2><a href="#b">Go to B</a>', 'demo');
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ rule: 'link-broken-anchor', severity: 'error' });
    expect(f[0]?.where).toContain('demo');
    expect(f[0]?.where).toContain('#b');
  });

  it('finds anchors in the same markup', () => {
    expect(auditLinks('<h2 id="b">B</h2><a href="#b">Go to B</a>', 'demo')).toEqual([]);
  });

  it('passes the allowed hosts through', () => {
    const page = '<a href="https://example.org/a">The city page</a>';
    expect(auditLinks(page, 'demo')).toHaveLength(1);
    expect(auditLinks(page, 'demo', { allowedHosts: ['example.org'] })).toEqual([]);
  });
});

describe('links in what the package ships', () => {
  const pages = (lang: 'en' | 'fr'): string[] => [renderHelpPage(lang), renderHelpPage(lang, 'unknown'), ...sampleMarkup(lang).map((m) => m.html)];

  it.each(['en', 'fr'] as const)('has no broken, unsafe, external or vaguely labelled link in %s', (lang) => {
    for (const [i, page] of pages(lang).entries()) {
      expect(auditLinks(page, `page-${i}.${lang}`), `page ${i}`).toEqual([]);
    }
  });

  it('every in-page term link on the help page points at a definition on that page', () => {
    for (const lang of ['en', 'fr'] as const) {
      const page = renderHelpPage(lang);
      const ids = anchorIds(page);
      const targets = htmlLinks(page).filter((l) => l.href.startsWith('#gl-fd-'));
      expect(targets.length).toBeGreaterThan(5);
      for (const t of targets) expect(ids.has(t.href.slice(1)), t.href).toBe(true);
    }
  });
});
