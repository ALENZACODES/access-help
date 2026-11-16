import { fixFrench } from './frTypography';
import { connectionText } from './offlineCache';
import { htmlLang } from './locale';
import {
  listFromIndex,
  loadOrBuildIndex,
  searchIndex,
  type IndexStore,
  type OfflineIndex,
  type SearchHit,
} from './offlineIndex';
import { formatProvenance } from './provenance';
import { describeFeature, mergeClaims, type FeatureClaim } from './status';
import { TERMS, glossaryProvenanceFor, type Lang } from './plainTerms';
import { escapeHtml } from './text';

/** UI strings. The French ones follow the typography rules (checked in tests). */
export const UI = {
  en: {
    title: 'Glossary',
    searchLabel: 'Search terms',
    none: 'No terms match.',
    one: '1 term shown',
    many: (n: number): string => `${n} terms shown`,
  },
  fr: {
    title: 'Glossaire',
    searchLabel: 'Rechercher un terme',
    none: 'Aucun terme ne correspond.',
    one: '1 terme affiché',
    many: (n: number): string => `${n} termes affichés`,
  },
} as const;

/**
 * Targets are at least 44px. Inline links inside running text (.gl-term) are the
 * one exception allowed by WCAG 2.2 SC 2.5.8 and carry an underline, not colour alone.
 */
export const GLOSSARY_CSS = `.gl { max-width: 40rem; line-height: 1.5; }
.gl-input { display: block; box-sizing: border-box; width: 100%; min-height: 44px; padding: 8px 12px; font: inherit; border: 2px solid currentColor; border-radius: 4px; }
.gl-input:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-list { margin: 16px 0; padding: 0; }
.gl-item { margin: 0 0 16px; padding: 12px; border: 1px solid currentColor; border-radius: 4px; scroll-margin-block: 4rem; }
.gl-item:target { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-name { font-weight: 700; }
.gl-def { margin: 4px 0 0; }
.gl-claim { margin: 8px 0 0; padding-inline-start: 8px; border-inline-start: 4px solid currentColor; }
.gl-claim[data-status='unknown'] { border-inline-start-style: dashed; }
.gl-source { margin: 4px 0 0; font-size: 0.875rem; }
.gl-term { text-decoration: underline; text-underline-offset: 2px; }
`;

export function countText(lang: Lang, n: number): string {
  const ui = UI[lang];
  if (n === 0) return ui.none;
  return n === 1 ? ui.one : ui.many(n);
}

export function resultsFor(index: OfflineIndex, query: string): readonly SearchHit[] {
  return query.trim() === '' ? listFromIndex(index) : searchIndex(index, query, 50);
}

/** The list (or the empty message). Claims, when given, add a status line to every term. */
export function renderResults(
  hits: readonly SearchHit[],
  lang: Lang,
  claims?: readonly FeatureClaim[],
): string {
  if (hits.length === 0) return `<p class="gl-empty">${escapeHtml(UI[lang].none)}</p>`;
  const resolved =
    claims === undefined
      ? new Map()
      : new Map(
          mergeClaims(
            TERMS.map((t) => t.id),
            claims,
          ).map((c) => [c.termId, c] as const),
        );
  const items = hits.map((h) => {
    const claim = resolved.get(h.id);
    let status = '';
    if (claim !== undefined) {
      const d = describeFeature(claim, lang);
      const source = d.source === undefined ? '' : `<p class="gl-source">${escapeHtml(d.source)}</p>`;
      status = `<p class="gl-claim" data-status="${d.status}">${escapeHtml(d.text)}</p>${source}`;
    }
    return (
      `<div class="gl-item" id="glossary-${escapeHtml(h.id)}">` +
      `<dt class="gl-name">${escapeHtml(h.term)}</dt>` +
      `<dd class="gl-def">${escapeHtml(h.plain)}${status}</dd></div>`
    );
  });
  return `<dl class="gl-list">${items.join('')}</dl>`;
}

export interface ShellOptions {
  readonly lang: Lang;
  readonly index: OfflineIndex;
  readonly query?: string;
  readonly claims?: readonly FeatureClaim[];
  /** true shows the offline banner. */
  readonly offline?: boolean;
}

/** Whole glossary section: heading, search box, live count, results, source line. */
export function renderShell(opts: ShellOptions): string {
  const { lang, index } = opts;
  const query = opts.query ?? '';
  const ui = UI[lang];
  const hits = resultsFor(index, query);
  const source = formatProvenance(glossaryProvenanceFor(lang), lang);
  const offlineText = connectionText(opts.offline !== true, lang);
  const banner =
    offlineText === null ? '' : `<p class="gl-offline" role="status" data-gl-offline>${escapeHtml(offlineText)}</p>`;
  return (
    `<section class="gl" lang="${htmlLang(lang)}" aria-labelledby="gl-title">` +
    `<h2 id="gl-title">${escapeHtml(ui.title)}</h2>` +
    banner +
    `<label for="gl-q">${escapeHtml(ui.searchLabel)}</label>` +
    `<input id="gl-q" class="gl-input" type="search" autocomplete="off" spellcheck="false" ` +
    `enterkeyhint="search" aria-describedby="gl-count" value="${escapeHtml(query)}">` +
    `<p id="gl-count" role="status" aria-live="polite" data-gl-count>${escapeHtml(countText(lang, hits.length))}</p>` +
    `<div data-gl-results>${renderResults(hits, lang, opts.claims)}</div>` +
    `<p class="gl-source">${escapeHtml(lang === 'fr' ? fixFrench(source) : source)}</p>` +
    `</section>`
  );
}

/** What mountGlossary needs from a DOM element. HTMLElement satisfies it. */
export interface MountElement {
  innerHTML: string;
  addEventListener(type: string, listener: () => void): void;
}

export interface MountRoot {
  innerHTML: string;
  querySelector(selectors: string): MountElement | null;
}

export interface MountOptions {
  readonly lang: Lang;
  readonly claims?: readonly FeatureClaim[];
  /** For example window.localStorage, so the index survives offline. */
  readonly store?: IndexStore;
  /** Asked on every paint; return false to show the offline banner (for example () => navigator.onLine). */
  readonly isOnline?: () => boolean;
}

export interface GlossaryController {
  /** Runs a search programmatically and returns the number of terms shown. */
  search(query: string): number;
  setLang(lang: Lang): void;
  getLang(): Lang;
  /** Repaints so the offline banner matches the current connection. */
  refreshConnection(): void;
}

function readValue(el: MountElement): string {
  return 'value' in el && typeof el.value === 'string' ? el.value : '';
}

/**
 * Renders the glossary into `root` and keeps the results and the live count
 * in step with the search box. Works offline: the index comes from the store
 * when it is valid and current, otherwise it is rebuilt from bundled data.
 */
export function mountGlossary(root: MountRoot, options: MountOptions): GlossaryController {
  let lang = options.lang;
  let index = loadOrBuildIndex(lang, options.store).index;
  let query = '';

  function draw(): number {
    const hits = resultsFor(index, query);
    const results = root.querySelector('[data-gl-results]');
    const count = root.querySelector('[data-gl-count]');
    if (results !== null) results.innerHTML = renderResults(hits, lang, options.claims);
    if (count !== null) count.innerHTML = escapeHtml(countText(lang, hits.length));
    return hits.length;
  }

  function paint(): void {
    root.innerHTML = renderShell({
      lang,
      index,
      query,
      offline: options.isOnline?.() === false,
      ...(options.claims !== undefined ? { claims: options.claims } : {}),
    });
    const input = root.querySelector('#gl-q');
    if (input !== null) {
      input.addEventListener('input', () => {
        query = readValue(input);
        draw();
      });
    }
  }

  paint();
  return {
    search(q: string): number {
      query = q;
      return draw();
    },
    setLang(next: Lang): void {
      lang = next;
      index = loadOrBuildIndex(lang, options.store).index;
      paint();
    },
    getLang(): Lang {
      return lang;
    },
    refreshConnection(): void {
      paint();
    },
  };
}
