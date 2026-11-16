import type { Lang } from './plainTerms';

export const DEFAULT_LANG: Lang = 'en';

interface Weighted {
  readonly lang: Lang;
  readonly q: number;
  readonly order: number;
}

function primary(tag: string): Lang | null {
  const p = tag.trim().toLowerCase().split('-')[0];
  return p === 'en' || p === 'fr' ? p : null;
}

/**
 * Picks EN or FR from an Accept-Language string or a navigator.languages-style
 * list. Highest q wins, ties go to the earlier entry. Anything else is EN.
 */
export function pickLang(input: string | readonly string[] | null | undefined): Lang {
  if (input === null || input === undefined) return DEFAULT_LANG;
  const parts = typeof input === 'string' ? input.split(',') : input;
  const found: Weighted[] = [];
  parts.forEach((part, order) => {
    const [tag = '', ...params] = part.split(';');
    const lang = primary(tag);
    if (lang === null) return;
    let q = 1;
    for (const param of params) {
      const m = /^\s*q\s*=\s*([0-9.]+)\s*$/.exec(param);
      if (m !== null) q = Number(m[1]);
    }
    if (Number.isFinite(q) && q > 0) found.push({ lang, q, order });
  });
  found.sort((a, b) => b.q - a.q || a.order - b.order);
  return found[0]?.lang ?? DEFAULT_LANG;
}

export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'fr' : 'en';
}

/** Value for the HTML lang attribute. */
export function htmlLang(lang: Lang): string {
  return lang === 'fr' ? 'fr-CA' : 'en-CA';
}
