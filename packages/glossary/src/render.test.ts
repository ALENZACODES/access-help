import { describe, expect, it } from 'vitest';
import {
  GLOSSARY_CSS,
  buildIndex,
  countText,
  mountGlossary,
  renderResults,
  renderShell,
  resultsFor,
  searchIndex,
  type FeatureClaim,
  type IndexStore,
  type MountElement,
  type MountRoot,
} from './index';
import { TERMS } from './plainTerms';
import { UI } from './render';

class FakeEl implements MountElement {
  innerHTML = '';
  value = '';
  private readonly listeners = new Map<string, Array<() => void>>();
  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  fire(type: string): void {
    for (const l of this.listeners.get(type) ?? []) l();
  }
}

class FakeRoot implements MountRoot {
  innerHTML = '';
  readonly els: Record<string, FakeEl> = {
    '#gl-q': new FakeEl(),
    '[data-gl-results]': new FakeEl(),
    '[data-gl-count]': new FakeEl(),
  };
  querySelector(selectors: string): MountElement | null {
    return this.els[selectors] ?? null;
  }
}

const prov = { source: 'Site survey notes', licence: 'CC-BY-4.0', date: '2026-10-01' };

describe('countText', () => {
  it('handles none, one and many in both languages', () => {
    expect(countText('en', 0)).toBe('No terms match.');
    expect(countText('en', 1)).toBe('1 term shown');
    expect(countText('en', 5)).toBe('5 terms shown');
    expect(countText('fr', 0)).toBe('Aucun terme ne correspond.');
    expect(countText('fr', 1)).toBe('1 terme affiché');
    expect(countText('fr', 5)).toBe('5 termes affichés');
  });
});

describe('GLOSSARY_CSS', () => {
  it('keeps the search box at least 44px tall and shows a focus ring', () => {
    expect(GLOSSARY_CSS).toMatch(/\.gl-input \{[^}]*min-height: 44px/);
    expect(GLOSSARY_CSS).toContain('.gl-input:focus-visible');
  });
});

describe('renderResults', () => {
  const index = buildIndex('en');

  it('renders a definition list with anchors', () => {
    const html = renderResults(resultsFor(index, ''), 'en');
    expect(html.startsWith('<dl class="gl-list">')).toBe(true);
    expect(html).toContain('id="glossary-ramp"');
    expect((html.match(/<dt /g) ?? []).length).toBe(TERMS.length);
  });

  it('renders an empty message', () => {
    expect(renderResults([], 'fr')).toBe('<p class="gl-empty">Aucun terme ne correspond.</p>');
  });

  it('shows unknown for every term when claims are given but empty', () => {
    const html = renderResults(resultsFor(index, 'ramp'), 'en', []);
    expect(html).toContain('data-status="unknown"');
    expect(html).toContain('Ramp: unknown.');
    expect(html).not.toContain('data-status="present"');
  });

  it('shows a sourced claim and its source line', () => {
    const claims: FeatureClaim[] = [{ termId: 'ramp', status: 'present', provenance: prov }];
    const html = renderResults(resultsFor(index, 'ramp'), 'en', claims);
    expect(html).toContain('data-status="present"');
    expect(html).toContain('Ramp: reported as available.');
    expect(html).toContain('Source: Site survey notes. Licence: CC-BY-4.0. Date: 2026-10-01.');
  });

  it('does not show a claim without a source as present', () => {
    const claims: FeatureClaim[] = [{ termId: 'ramp', status: 'present' }];
    const html = renderResults(resultsFor(index, 'ramp'), 'en', claims);
    expect(html).toContain('data-status="unknown"');
    expect(html).not.toContain('reported as available');
  });

  it('escapes hostile text', () => {
    const html = renderResults([{ id: 'x"><script>', term: '<b>', plain: '&', score: 0 }], 'en');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('&amp;');
  });
});

describe('renderShell', () => {
  it('labels the search box, sets the language and announces the count politely', () => {
    const html = renderShell({ lang: 'fr', index: buildIndex('fr') });
    expect(html).toContain('lang="fr-CA"');
    expect(html).toContain('<label for="gl-q">Rechercher un terme</label>');
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).toContain(UI.fr.many(TERMS.length));
    expect(html).toContain('Source\u00a0: Rédigé pour l’App par l’équipe du projet. Licence\u00a0: Même licence que ce dépôt.');
  });

  it('escapes the query and narrows the results', () => {
    const html = renderShell({ lang: 'en', index: buildIndex('en'), query: '"><img src=x>' });
    expect(html).not.toContain('<img');
    expect(html).toContain(UI.en.none);
  });

  it('filters by query', () => {
    const html = renderShell({ lang: 'en', index: buildIndex('en'), query: 'elevator' });
    expect(html).toContain('id="glossary-elevator"');
    expect(html).not.toContain('id="glossary-ramp"');
  });
});

describe('mountGlossary', () => {
  it('paints the shell and updates results on input', () => {
    const root = new FakeRoot();
    mountGlossary(root, { lang: 'en' });
    expect(root.innerHTML).toContain('<section class="gl"');
    const input = root.els['#gl-q'];
    expect(input).toBeDefined();
    if (input === undefined) return;
    input.value = 'ramp';
    input.fire('input');
    expect(root.els['[data-gl-results]']?.innerHTML).toContain('id="glossary-ramp"');
    expect(root.els['[data-gl-results]']?.innerHTML).not.toContain('id="glossary-elevator"');
    expect(root.els['[data-gl-count]']?.innerHTML).toBe('1 term shown');
    input.value = 'zzz';
    input.fire('input');
    expect(root.els['[data-gl-count]']?.innerHTML).toBe('No terms match.');
  });

  it('search() returns the number of terms shown', () => {
    const root = new FakeRoot();
    const g = mountGlossary(root, { lang: 'en' });
    expect(g.search('')).toBe(TERMS.length);
    expect(g.search('door')).toBe(searchIndex(buildIndex('en'), 'door').length);
    expect(g.search('zzz')).toBe(0);
  });

  it('switches language and keeps the query', () => {
    const root = new FakeRoot();
    const g = mountGlossary(root, { lang: 'en' });
    g.search('ramp');
    g.setLang('fr');
    expect(g.getLang()).toBe('fr');
    expect(root.innerHTML).toContain('lang="fr-CA"');
    expect(root.innerHTML).toContain('Rampe');
  });

  it('uses and fills the offline store', () => {
    const data = new Map<string, string>();
    const store: IndexStore = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
    };
    mountGlossary(new FakeRoot(), { lang: 'fr', store });
    expect(data.has('glossary-index-fr')).toBe(true);
  });

  it('shows claims in the painted shell', () => {
    const root = new FakeRoot();
    mountGlossary(root, { lang: 'en', claims: [] });
    expect(root.innerHTML).toContain('data-status="unknown"');
  });

  it('shows an offline banner when isOnline says false, and drops it when back online', () => {
    let online = false;
    const root = new FakeRoot();
    const g = mountGlossary(root, { lang: 'en', isOnline: () => online });
    expect(root.innerHTML).toContain('data-gl-offline');
    expect(root.innerHTML).toContain('You are offline. Showing saved information.');
    online = true;
    g.refreshConnection();
    expect(root.innerHTML).not.toContain('data-gl-offline');
  });

  it('shows no banner when isOnline is not given', () => {
    const root = new FakeRoot();
    mountGlossary(root, { lang: 'fr' });
    expect(root.innerHTML).not.toContain('data-gl-offline');
  });
});

describe('renderShell offline banner', () => {
  it('is a polite status message in the page language', () => {
    const html = renderShell({ lang: 'fr', index: buildIndex('fr'), offline: true });
    expect(html).toContain('<p class="gl-offline" role="status" data-gl-offline>Vous êtes hors ligne.');
    expect(renderShell({ lang: 'fr', index: buildIndex('fr') })).not.toContain('gl-offline');
  });
});
