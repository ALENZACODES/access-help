import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { htmlLang } from './locale';
import type { Place } from './places';
import { PRINT_CSS, PRINT_MIME } from './printPlan';
import type { Lang } from './plainTerms';
import { formatProvenance, type Provenance } from './provenance';
import type { PlaceList } from './savedLists';
import { mergeClaims, statusLabel } from './status';
import { escapeHtml } from './text';
import type { ExportFile } from './textExport';

/**
 * One list as a page that prints well: black on white, large type, no scripts. Under each place it shows what
 * the sources report for the chosen features, and says Unknown where they say nothing.
 */
export const LISTPRINT_UI = {
  en: {
    date: (d: string): string => `Printed on ${d}`,
    note: 'This page shows what each place’s sources report. Unknown means the sources say nothing.',
    empty: 'No places on this list yet.',
    noFeatures: 'No features were chosen when this page was made.',
    exportPrint: 'Copy printable list',
    exportLabel: (list: string): string => `Copy the list ${list} as a printable page`,
  },
  fr: {
    date: (d: string): string => `Imprimé le ${d}`,
    note: 'Cette page montre ce que les sources de chaque lieu indiquent. Inconnu veut dire que les sources ne disent rien.',
    empty: 'Aucun lieu dans cette liste pour le moment.',
    noFeatures: 'Aucune caractéristique n’était choisie quand cette page a été faite.',
    exportPrint: 'Copier la liste à imprimer',
    exportLabel: (list: string): string => `Copier la liste ${list} comme page à imprimer`,
  },
} as const;

export interface ListPrintOptions {
  readonly lang: Lang;
  /** YYYY-MM-DD. */
  readonly today: string;
  /** The chosen features. */
  readonly termIds: readonly string[];
  readonly provenance?: Provenance | null;
}

export function renderListPrintPage(list: PlaceList, places: readonly Place[], options: ListPrintOptions): string {
  const { lang } = options;
  const ui = LISTPRINT_UI[lang];
  const fx = (s: string): string => (lang === 'fr' ? fixFrench(s) : s);
  const colon = lang === 'fr' ? '\u00a0:' : ':';
  const byId = new Map(places.map((p) => [p.id, p] as const));
  const members = list.ids.flatMap((id) => {
    const p = byId.get(id);
    return p === undefined ? [] : [p];
  });
  const sections = members.map((p) => {
    const rows =
      options.termIds.length === 0
        ? ''
        : `<ul>${mergeClaims(options.termIds, p.claims)
            .map((c) => `<li>${escapeHtml(fx(`${lookupTerm(c.termId, lang).term}${colon} ${statusLabel(c.status, lang, c.conflict)}`))}</li>`)
            .join('')}</ul>`;
    return `<section><h2>${escapeHtml(p.name)}</h2>${rows}</section>`;
  });
  const body =
    members.length === 0
      ? `<p>${escapeHtml(ui.empty)}</p>`
      : (options.termIds.length === 0 ? `<p class="note">${escapeHtml(ui.noFeatures)}</p>` : '') + sections.join('');
  const source = options.provenance === undefined || options.provenance === null ? '' : `<p class="note">${escapeHtml(formatProvenance(options.provenance, lang))}</p>`;
  return (
    `<!doctype html><html lang="${htmlLang(lang)}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(list.name)}</title>` +
    `<style>${PRINT_CSS}</style></head>` +
    `<body><main><h1>${escapeHtml(list.name)}</h1><p class="note">${escapeHtml(fx(ui.date(options.today)))}</p><p class="note">${escapeHtml(fx(ui.note))}</p>${body}${source}</main></body></html>`
  );
}

export function listPrintFilename(list: PlaceList, lang: Lang): string {
  const slug = list.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'list';
  return `list-${slug}-${lang}.html`;
}

export function listPrintFile(list: PlaceList, places: readonly Place[], options: ListPrintOptions): ExportFile {
  return { text: renderListPrintPage(list, places, options), filename: listPrintFilename(list, options.lang), mime: PRINT_MIME };
}

export function printListId(list: number): string {
  return `gl-lprint-${list}`;
}

export function parsePrintListId(id: string): number | null {
  const m = /^gl-lprint-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

export function printListButton(list: number, name: string, lang: Lang): string {
  const label = LISTPRINT_UI[lang].exportLabel(name);
  return `<button type="button" class="gl-btn" id="${printListId(list)}" aria-label="${escapeHtml(lang === 'fr' ? fixFrench(label) : label)}">${escapeHtml(LISTPRINT_UI[lang].exportPrint)}</button>`;
}
