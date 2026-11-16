import { describe, expect, it } from 'vitest';
import {
  HELP_CSS,
  HELP_TOPICS,
  HELP_UI,
  PLAIN_TERMS,
  anchorIds,
  auditHtml,
  auditLinks,
  auditMarkup,
  fullGlossaryCss,
  helpCountText,
  htmlLinks,
  mountHelp,
  plainText,
  renderHelpPage,
  renderHelpSection,
  renderHelpTopic,
  renderRefs,
  sampleMarkup,
  scanMarkup,
  searchHelp,
  termHref,
  type FinderRoot,
  type HelpTopic,
} from './index';

class El {
  innerHTML = '';
  focus(): void {}
}

class Root implements FinderRoot {
  innerHTML = '';
  readonly els: Record<string, El> = { '[data-gl-help-results]': new El(), '[data-gl-help-count]': new El() };
  readonly listeners = new Map<string, Array<(e: { readonly target: unknown }) => void>>();
  querySelector(selectors: string): El | null {
    return this.els[selectors] ?? null;
  }
  addEventListener(type: string, listener: (e: { readonly target: unknown }) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  fire(type: string, target: unknown): void {
    for (const l of this.listeners.get(type) ?? []) l({ target });
  }
}

const LANGS = ['en', 'fr'] as const;
const topic = (id: string): HelpTopic => HELP_TOPICS.find((t) => t.id === id) as HelpTopic;

describe('termHref', () => {
  it('points at the definition with the same id', () => {
    expect(termHref('ramp')).toBe('#gl-fd-ramp');
  });
});

describe('renderRefs', () => {
  it('links a known term and keeps the words around it', () => {
    expect(renderRefs('Use [[ramp|a ramp]] here.', 'en')).toBe('Use <a class="gl-term" href="#gl-fd-ramp">a ramp</a> here.');
  });

  it('uses the glossary name when no words are given, in the right language', () => {
    expect(renderRefs('[[ramp]]', 'en')).toContain('>Ramp<');
    expect(renderRefs('[[ramp]]', 'fr')).toContain('>Rampe<');
  });

  it('turns an unknown term into plain words, never a dead link', () => {
    expect(renderRefs('See [[nonsense|this]].', 'en')).toBe('See this.');
    expect(renderRefs('[[a ramp|ramp]]', 'en')).not.toContain('<a');
  });

  it('escapes anything that is not a reference', () => {
    expect(renderRefs('<b>x</b> & "y"', 'en')).toBe('&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;');
  });

  it('escapes the label and the address it is given', () => {
    const html = renderRefs('[[ramp|<i>r</i>]]', 'en', () => '"><script>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<i>');
    expect(html).toContain('&lt;i&gt;');
  });

  it('lets the caller choose where links go', () => {
    expect(renderRefs('[[ramp]]', 'en', (id) => `/glossary#${id}`)).toContain('href="/glossary#ramp"');
  });

  it('handles text with no references and empty text', () => {
    expect(renderRefs('Plain.', 'en')).toBe('Plain.');
    expect(renderRefs('', 'en')).toBe('');
  });
});

describe('plainText', () => {
  it('removes link markup and keeps the words', () => {
    expect(plainText('Use [[ramp|a ramp]] or [[elevator]].', 'en')).toBe('Use a ramp or Elevator.');
  });
});

describe('renderHelpTopic', () => {
  it('is a labelled section with a heading, paragraphs and its kind', () => {
    const html = renderHelpTopic(topic('unknown'), 'en');
    expect(html).toContain('id="gl-help-unknown"');
    expect(html).toContain('aria-labelledby="gl-help-unknown-t"');
    expect(html).toContain('<h3 id="gl-help-unknown-t">What “Unknown” means</h3>');
    expect(html).toContain('data-kind="about"');
    expect((html.match(/<p>/g) ?? []).length).toBe(topic('unknown').body.en.length);
  });

  it('writes French in French', () => {
    expect(renderHelpTopic(topic('unknown'), 'fr')).toContain('Inconnu');
  });
});

describe('renderHelpSection', () => {
  it.each(LANGS)('is one collapsed section with every topic (%s)', (lang) => {
    const html = renderHelpSection(lang);
    expect(html.startsWith('<details class="gl-help"')).toBe(true);
    expect(html).toContain(`<summary>${HELP_UI[lang].summary}</summary>`);
    for (const t of HELP_TOPICS) expect(html).toContain(`id="gl-help-${t.id}"`);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
  });

  it('declares its language', () => {
    expect(renderHelpSection('en')).toContain('lang="en-CA"');
    expect(renderHelpSection('fr')).toContain('lang="fr-CA"');
  });
});

describe('searchHelp', () => {
  it('returns every topic, in order, for an empty search', () => {
    expect(searchHelp('', 'en')).toEqual(HELP_TOPICS);
    expect(searchHelp('   ', 'fr')).toEqual(HELP_TOPICS);
  });

  it('finds topics by words in the title or text', () => {
    expect(searchHelp('unknown', 'en').map((t) => t.id)).toContain('unknown');
    expect(searchHelp('offline', 'en').map((t) => t.id)).toContain('offline');
  });

  it('matches the start of the last word and ignores case and accents', () => {
    expect(searchHelp('INCONN', 'fr').map((t) => t.id)).toContain('unknown');
    expect(searchHelp('caracteristiques', 'fr').length).toBeGreaterThan(0);
  });

  it('needs every word to match', () => {
    expect(searchHelp('unknown zzzzzz', 'en')).toEqual([]);
  });

  it('searches the words people read, not the link markup', () => {
    expect(searchHelp('gl-fd', 'en')).toEqual([]);
    expect(searchHelp('[[ramp', 'en').length).toBe(searchHelp('ramp', 'en').length);
  });

  it('searches only the chosen language', () => {
    expect(searchHelp('Inconnu', 'en')).toEqual([]);
  });
});

describe('helpCountText', () => {
  it('says none, one and many in both languages', () => {
    expect(helpCountText('en', 0)).toBe('No help topics match.');
    expect(helpCountText('en', 1)).toBe('1 topic shown');
    expect(helpCountText('en', 4)).toBe('4 topics shown');
    expect(helpCountText('fr', 0)).toBe('Aucun sujet d’aide ne correspond.');
    expect(helpCountText('fr', 1)).toBe('1 sujet affiché');
    expect(helpCountText('fr', 4)).toBe('4 sujets affichés');
  });
});

describe('renderHelpPage', () => {
  it.each(LANGS)('has a heading, a labelled search box, a live count and every definition (%s)', (lang) => {
    const html = renderHelpPage(lang);
    expect(html).toContain('<h2 id="gl-help-title">');
    expect(html).toContain('<label for="gl-hq">');
    expect(html).toContain('id="gl-hq"');
    expect(html).toContain('role="status" aria-live="polite" data-gl-help-count');
    for (const t of PLAIN_TERMS) expect(html).toContain(`id="gl-fd-${t.id}"`);
  });

  it('shows the matching topics and says how many', () => {
    const html = renderHelpPage('en', 'offline');
    expect(html).toContain('id="gl-help-offline"');
    expect(html).not.toContain('id="gl-help-compare"');
    expect(html).toContain(helpCountText('en', searchHelp('offline', 'en').length));
  });

  it('says so when nothing matches', () => {
    const html = renderHelpPage('en', 'zzzzzz');
    expect(html).toContain('class="gl-empty"');
    expect(html).toContain('No help topics match.');
  });

  it('keeps what was typed in the box, safely', () => {
    expect(renderHelpPage('en', '"><script>x</script>')).not.toContain('<script>');
    expect(renderHelpPage('en', 'ramp')).toContain('value="ramp"');
  });

  it('passes the markup, accessibility, link and wording audits in both languages', () => {
    for (const lang of LANGS) {
      for (const query of ['', 'unknown', 'zzzzzz']) {
        const html = renderHelpPage(lang, query);
        const name = `help-page.${lang}.${query}`;
        expect(auditHtml(html, name), name).toEqual([]);
        expect(auditMarkup(name, html, lang), name).toEqual([]);
        expect(auditLinks(html, name), name).toEqual([]);
        expect(scanMarkup(html), name).toEqual([]);
      }
    }
  });

  it('has a link for every term it mentions and a definition for every link', () => {
    for (const lang of LANGS) {
      const html = renderHelpPage(lang);
      const ids = anchorIds(html);
      for (const l of htmlLinks(html)) expect(ids.has(l.href.slice(1)), l.href).toBe(true);
    }
  });
});

describe('mountHelp', () => {
  it('paints the page into the root and returns a controller', () => {
    const root = new Root();
    const c = mountHelp(root, { lang: 'en' });
    expect(root.innerHTML).toBe(renderHelpPage('en'));
    expect(c.getLang()).toBe('en');
  });

  it('searches and reports how many topics are shown', () => {
    const root = new Root();
    const c = mountHelp(root, { lang: 'en' });
    expect(c.search('offline')).toBe(searchHelp('offline', 'en').length);
    expect(root.els['[data-gl-help-results]']?.innerHTML).toContain('id="gl-help-offline"');
    expect(root.els['[data-gl-help-count]']?.innerHTML).toBe(helpCountText('en', searchHelp('offline', 'en').length));
  });

  it('follows typing in the search box, on input and on change', () => {
    const root = new Root();
    mountHelp(root, { lang: 'en' });
    root.fire('input', { id: 'gl-hq', value: 'zzzzzz' });
    expect(root.els['[data-gl-help-count]']?.innerHTML).toBe('No help topics match.');
    root.fire('change', { id: 'gl-hq', value: '' });
    expect(root.els['[data-gl-help-count]']?.innerHTML).toBe(helpCountText('en', HELP_TOPICS.length));
  });

  it('ignores events from other controls and odd targets', () => {
    const root = new Root();
    mountHelp(root, { lang: 'en' });
    const before = root.els['[data-gl-help-count]']?.innerHTML;
    root.fire('input', { id: 'other', value: 'x' });
    root.fire('input', { id: 'gl-hq', value: 5 });
    root.fire('input', null);
    root.fire('input', 'text');
    expect(root.els['[data-gl-help-count]']?.innerHTML).toBe(before);
  });

  it('keeps the French count in correct French typography', () => {
    const root = new Root();
    const c = mountHelp(root, { lang: 'fr' });
    c.search('zzzzzz');
    expect(root.els['[data-gl-help-count]']?.innerHTML).toBe('Aucun sujet d’aide ne correspond.');
  });

  it('switches language and keeps the search', () => {
    const root = new Root();
    const c = mountHelp(root, { lang: 'en' });
    c.search('unknown');
    c.setLang('fr');
    expect(c.getLang()).toBe('fr');
    expect(root.innerHTML).toBe(renderHelpPage('fr', 'unknown'));
    expect(root.innerHTML).toContain('Aide');
  });

  it('uses the link function it is given', () => {
    const root = new Root();
    mountHelp(root, { lang: 'en', linkFor: (id) => `/glossary#${id}` });
    expect(root.innerHTML).toContain('href="/glossary#ramp"');
  });

  it('copes with a page that has no results area', () => {
    const root = new Root();
    delete root.els['[data-gl-help-results]'];
    delete root.els['[data-gl-help-count]'];
    const c = mountHelp(root, { lang: 'en' });
    expect(c.search('unknown')).toBe(searchHelp('unknown', 'en').length);
  });
});

describe('help in the finder', () => {
  it.each(LANGS)('is part of the finder shell the audit looks at (%s)', (lang) => {
    const finder = sampleMarkup(lang).find((m) => m.name === `finder.${lang}`);
    expect(finder?.html).toContain('class="gl-help"');
    expect(finder?.html).toContain(HELP_UI[lang].summary);
  });

  it('has its own audited sample pages', () => {
    for (const lang of LANGS) {
      const names = sampleMarkup(lang).map((m) => m.name);
      expect(names).toContain(`help-page.${lang}`);
      expect(names).toContain(`help-page-search.${lang}`);
    }
  });

  it('is styled, and the styles reach the page', () => {
    expect(HELP_CSS).toContain('.gl-help-topic');
    expect(fullGlossaryCss()).toContain(HELP_CSS);
  });
});
