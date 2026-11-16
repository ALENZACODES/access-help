import { finding, type Finding } from './auditTypes';
import { decodeEntities } from './deepScan';
import { TERMS } from './plainTerms';
import { fold } from './text';

/** A link found in rendered markup or in help source text. */
export interface FoundLink {
  readonly kind: 'html' | 'markdown' | 'term';
  readonly href: string;
  readonly label: string;
}

export type LinkRule =
  | 'link-empty-href'
  | 'link-unsafe-scheme'
  | 'link-insecure'
  | 'link-external'
  | 'link-broken-anchor'
  | 'link-unknown-term'
  | 'link-empty-label'
  | 'link-vague-label';

export interface LinkProblem {
  readonly rule: LinkRule;
  readonly href: string;
  readonly label: string;
  readonly detail: string;
}

/** Links in rendered HTML: label is the text between the tags. */
export function htmlLinks(html: string): readonly FoundLink[] {
  const out: FoundLink[] = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[1] ?? '');
    const label = decodeEntities((m[2] ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
    const aria = /\saria-label\s*=\s*"([^"]*)"/i.exec(m[1] ?? '');
    out.push({
      kind: 'html',
      href: decodeEntities(href?.[1] ?? href?.[2] ?? href?.[3] ?? ''),
      label: label !== '' ? label : decodeEntities(aria?.[1] ?? ''),
    });
  }
  return out;
}

/** [label](href) links and [[term-id]] or [[term-id|label]] references in help source text. */
export function sourceLinks(text: string): readonly FoundLink[] {
  const out: FoundLink[] = [];
  for (const m of text.matchAll(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g)) {
    const id = (m[1] ?? '').trim();
    out.push({ kind: 'term', href: id, label: (m[2] ?? id).trim() });
  }
  const withoutTerms = text.replace(/\[\[[^\]]*\]\]/g, '');
  for (const m of withoutTerms.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)) {
    out.push({ kind: 'markdown', href: (m[2] ?? '').trim(), label: (m[1] ?? '').trim() });
  }
  return out;
}

/** Every id="..." in a piece of markup. */
export function anchorIds(html: string): ReadonlySet<string> {
  return new Set([...html.matchAll(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => m[1] ?? m[2] ?? ''));
}

const VAGUE = new Set(
  [
    'click here',
    'here',
    'read more',
    'more',
    'link',
    'this link',
    'learn more',
    'details',
    'cliquez ici',
    'ici',
    'en savoir plus',
    'lire la suite',
    'plus',
    'lien',
    'ce lien',
    'détails',
  ].map((s) => fold(s)),
);

export interface LinkContext {
  /** Ids that exist in the same document, for #anchors. */
  readonly ids?: ReadonlySet<string>;
  /** Term ids that [[term]] references may use. Defaults to the glossary terms. */
  readonly termIds?: ReadonlySet<string>;
  /** Hosts that may be linked over https. None by default: the App links to no other site from help or glossary copy. */
  readonly allowedHosts?: readonly string[];
}

const SAFE_SCHEMES = new Set(['https']);

/** Strips what browsers ignore inside a scheme ("java\tscript:"), then lower-cases. */
function cleanHref(href: string): string {
  return href.replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, '').toLowerCase();
}

export function checkLink(link: FoundLink, ctx: LinkContext = {}): readonly LinkProblem[] {
  const out: LinkProblem[] = [];
  const problem = (rule: LinkRule, detail: string): void => void out.push({ rule, href: link.href, label: link.label, detail });
  const termIds = ctx.termIds ?? new Set(TERMS.map((t) => t.id));

  if (link.kind === 'term') {
    if (!termIds.has(link.href)) problem('link-unknown-term', `No glossary term "${link.href}".`);
    return out;
  }
  if (link.label.trim() === '') problem('link-empty-label', 'Link has no text.');
  else if (VAGUE.has(fold(link.label.replace(/[.:!?…]+$/u, '').trim()))) problem('link-vague-label', `"${link.label}" does not say where the link goes.`);

  const clean = cleanHref(link.href);
  if (clean === '') {
    problem('link-empty-href', 'Link has no address.');
    return out;
  }
  if (clean.startsWith('#')) {
    const id = link.href.trim().slice(1);
    if (id === '' || (ctx.ids !== undefined && !ctx.ids.has(id))) problem('link-broken-anchor', `No element with id "${id}".`);
    return out;
  }
  if (clean.startsWith('/') && !clean.startsWith('//')) return out;
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(clean);
  if (clean.startsWith('//')) {
    problem('link-external', 'Protocol-relative link to another site.');
  } else if (scheme === null) {
    return out;
  } else if (scheme[1] === 'http') {
    problem('link-insecure', 'Link uses http instead of https.');
  } else if (!SAFE_SCHEMES.has(scheme[1] ?? '')) {
    problem('link-unsafe-scheme', `Link scheme "${scheme[1]}:" is not allowed.`);
  } else {
    const host = /^https:\/\/([^/?#:]+)/.exec(clean)?.[1] ?? '';
    if (!(ctx.allowedHosts ?? []).some((h) => h.toLowerCase() === host)) problem('link-external', `Link goes to another site (${host}).`);
  }
  return out;
}

export function checkLinks(links: readonly FoundLink[], ctx: LinkContext = {}): readonly LinkProblem[] {
  return links.flatMap((l) => checkLink(l, ctx));
}

/** Audit findings for every link in rendered markup. #anchors must match an id in the same markup. */
export function auditLinks(html: string, name: string, options: Omit<LinkContext, 'ids'> = {}): readonly Finding[] {
  const ctx: LinkContext = { ...options, ids: anchorIds(html) };
  return checkLinks(htmlLinks(html), ctx).map((p) => finding(p.rule, `${name} <a href="${p.href}">`, p.detail));
}
