import type { FinderRoot } from './finderMount';
import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { HELP_TOPICS, type HelpTopic } from './helpCopy';
import { htmlLang } from './locale';
import { TERMS, type Lang } from './plainTerms';
import { relatedSegments } from './related';
import { escapeHtml, tokenise } from './text';
import { termHref } from './termLinks';

export const HELP_UI = {
  en: {
    title: 'Help',
    summary: 'How to read this page',
    searchLabel: 'Search help',
    none: 'No help topics match.',
    one: '1 topic shown',
    many: (n: number): string => `${n} topics shown`,
    termsHeading: 'Features',
  },
  fr: {
    title: 'Aide',
    summary: 'Comment lire cette page',
    searchLabel: 'Rechercher dans l’aide',
    none: 'Aucun sujet d’aide ne correspond.',
    one: '1 sujet affiché',
    many: (n: number): string => `${n} sujets affichés`,
    termsHeading: 'Caractéristiques',
  },
} as const;

export const HELP_CSS = `.gl-help, .gl-helppage { max-width: 40rem; line-height: 1.5; }
.gl-help-topic { margin: 16px 0; }
.gl-help-topic p { margin: 4px 0; }
.gl-help-topic h3 { margin: 0 0 4px; }
`;

export { termHref } from './termLinks';

export type LinkFor = (termId: string) => string;

/** Turns [[id]] and [[id|words]] into glossary links. A reference to an unknown term becomes plain words, never a dead link. */
export function renderRefs(text: string, lang: Lang, linkFor: LinkFor = termHref): string {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g)) {
    out += escapeHtml(text.slice(last, m.index));
    last = (m.index ?? 0) + m[0].length;
    const id = (m[1] ?? '').trim();
    const term = lookupTerm(id, lang);
    const label = (m[2] ?? '').trim() || term.term;
    out += term.known ? `<a class="gl-term" href="${escapeHtml(linkFor(id))}">${escapeHtml(label)}</a>` : escapeHtml(label);
  }
  return out + escapeHtml(text.slice(last));
}

/** The text of a topic without link markup, for search and plain text. */
export function plainText(text: string, lang: Lang): string {
  return text.replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_w, id: string, label: string | undefined) => (label ?? '').trim() || lookupTerm(id.trim(), lang).term);
}

export function renderHelpTopic(topic: HelpTopic, lang: Lang, linkFor: LinkFor = termHref): string {
  const id = `gl-help-${topic.id}`;
  const paragraphs = topic.body[lang].map((p) => `<p>${renderRefs(p, lang, linkFor)}</p>`).join('');
  return (
    `<section class="gl-help-topic" id="${id}" aria-labelledby="${id}-t" data-kind="${topic.kind}">` +
    `<h3 id="${id}-t">${escapeHtml(topic.title[lang])}</h3>${paragraphs}</section>`
  );
}

/** A collapsed section for the finder: every topic, in the order written. */
export function renderHelpSection(lang: Lang, linkFor: LinkFor = termHref): string {
  const ui = HELP_UI[lang];
  return (
    `<details class="gl-help" lang="${htmlLang(lang)}"><summary>${escapeHtml(ui.summary)}</summary>` +
    HELP_TOPICS.map((t) => renderHelpTopic(t, lang, linkFor)).join('') +
    `</details>`
  );
}

/** Topics whose title or text contains every word typed (the last word may be unfinished). Order is kept. */
export function searchHelp(query: string, lang: Lang): readonly HelpTopic[] {
  const words = tokenise(query);
  if (words.length === 0) return HELP_TOPICS;
  return HELP_TOPICS.filter((t) => {
    const hay = tokenise([t.title[lang], ...t.body[lang].map((p) => plainText(p, lang))].join(' '));
    return words.every((w) => hay.some((h) => h === w || (w.length >= 3 && h.startsWith(w))));
  });
}

export function helpCountText(lang: Lang, n: number): string {
  const ui = HELP_UI[lang];
  return n === 0 ? ui.none : n === 1 ? ui.one : ui.many(n);
}

const ALL_IDS: ReadonlySet<string> = new Set(TERMS.map((t) => t.id));

function termList(lang: Lang): string {
  const items = TERMS.map((t) => {
    const term = lookupTerm(t.id, lang);
    const see = relatedSegments(t.id, lang, ALL_IDS)
      .map((seg) => (seg.kind === 'term' ? `<a class="gl-term" href="${escapeHtml(seg.href)}">${escapeHtml(seg.label)}</a>` : escapeHtml(seg.text)))
      .join('');
    return `<dt>${escapeHtml(term.term)}</dt><dd id="gl-fd-${t.id}">${escapeHtml(term.plain)}${see === '' ? '' : `<br><span class="gl-note">${see}</span>`}</dd>`;
  });
  return `<h3>${escapeHtml(HELP_UI[lang].termsHeading)}</h3><dl>${items.join('')}</dl>`;
}

/** A whole help page: search, the matching topics, and the feature definitions the links point to. */
export function renderHelpPage(lang: Lang, query = '', linkFor: LinkFor = termHref): string {
  const ui = HELP_UI[lang];
  const topics = searchHelp(query, lang);
  return (
    `<section class="gl-helppage" lang="${htmlLang(lang)}" aria-labelledby="gl-help-title">` +
    `<h2 id="gl-help-title">${escapeHtml(ui.title)}</h2>` +
    `<label for="gl-hq">${escapeHtml(ui.searchLabel)}</label>` +
    `<input id="gl-hq" class="gl-input" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" value="${escapeHtml(query)}">` +
    `<p role="status" aria-live="polite" data-gl-help-count>${escapeHtml(helpCountText(lang, topics.length))}</p>` +
    `<div data-gl-help-results>${helpResults(topics, lang, linkFor)}</div>` +
    termList(lang) +
    `</section>`
  );
}

function helpResults(topics: readonly HelpTopic[], lang: Lang, linkFor: LinkFor): string {
  return topics.length === 0
    ? `<p class="gl-empty">${escapeHtml(HELP_UI[lang].none)}</p>`
    : topics.map((t) => renderHelpTopic(t, lang, linkFor)).join('');
}

export interface HelpController {
  /** Runs a search and returns the number of topics shown. */
  search(query: string): number;
  setLang(lang: Lang): void;
  getLang(): Lang;
}

/** A live help page: type in the search box and the topics follow. Works with fakes or a real element. */
export function mountHelp(root: FinderRoot, options: { readonly lang: Lang; readonly linkFor?: LinkFor }): HelpController {
  let lang = options.lang;
  let query = '';
  const linkFor = options.linkFor ?? termHref;
  const draw = (): number => {
    const topics = searchHelp(query, lang);
    const results = root.querySelector('[data-gl-help-results]');
    const count = root.querySelector('[data-gl-help-count]');
    if (results !== null) results.innerHTML = helpResults(topics, lang, linkFor);
    if (count !== null) {
      const t = helpCountText(lang, topics.length);
      count.innerHTML = escapeHtml(lang === 'fr' ? fixFrench(t) : t);
    }
    return topics.length;
  };
  const paint = (): void => {
    root.innerHTML = renderHelpPage(lang, query, linkFor);
  };
  paint();
  const onEvent = (event: { readonly target: unknown }): void => {
    const t = event.target as { id?: unknown; value?: unknown } | null;
    if (t !== null && typeof t === 'object' && t.id === 'gl-hq' && typeof t.value === 'string') {
      query = t.value;
      draw();
    }
  };
  for (const type of ['input', 'change']) root.addEventListener(type, onEvent);
  return {
    search(q: string): number {
      query = q;
      return draw();
    },
    setLang(next: Lang): void {
      lang = next;
      paint();
    },
    getLang: () => lang,
  };
}
