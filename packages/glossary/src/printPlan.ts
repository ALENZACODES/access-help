import { fixFrench } from './frTypography';
import { htmlLang } from './locale';
import type { PlanEntry } from './plan';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * The visit plan as a page that prints well: black on white, large type, no scripts, no images, boxes that
 * can be ticked with a pen. It holds questions to ask and says nothing about any place.
 */
export const PRINT_UI = {
  en: {
    title: 'Visit plan',
    date: (d: string): string => `Printed on ${d}`,
    note: 'This list holds questions to ask. It says nothing about the places.',
    empty: 'No saved places yet.',
    progress: (asked: number, total: number): string => `${asked} of ${total} questions asked`,
    asked: 'Asked',
    toAsk: 'To ask',
    exportPrint: 'Copy printable plan',
  },
  fr: {
    title: 'Plan de visite',
    date: (d: string): string => `Imprimé le ${d}`,
    note: 'Cette liste contient des questions à poser. Elle ne dit rien sur les lieux.',
    empty: 'Aucun lieu enregistré pour le moment.',
    progress: (asked: number, total: number): string => `${asked} questions sur ${total} posées`,
    asked: 'Posée',
    toAsk: 'À poser',
    exportPrint: 'Copier le plan à imprimer',
  },
} as const;

/** Plain, high-contrast print styles. Sizes are in points; focus styles are kept for the screen. */
export const PRINT_CSS = `body { margin: 0; padding: 24px; font: 14pt/1.5 Georgia, 'Times New Roman', serif; color: #000000; background: #ffffff; }
main { max-width: 40rem; margin: 0 auto; }
h1 { font-size: 22pt; margin: 0 0 8px; }
h2 { font-size: 16pt; margin: 24px 0 8px; break-after: avoid; }
ul { list-style: none; margin: 0; padding: 0; }
li { margin: 8px 0; padding-inline-start: 2em; text-indent: -2em; break-inside: avoid; }
a:focus-visible { outline: 3px solid #000000; outline-offset: 2px; }
.note { font-size: 12pt; }
@media print { body { padding: 0; } }
`;

export interface PrintOptions {
  readonly lang: Lang;
  /** YYYY-MM-DD. */
  readonly today: string;
}

const TICKED = '☑';
const BLANK = '☐';

function line(entry: PlanEntry['items'][number], lang: Lang): string {
  const ui = PRINT_UI[lang];
  const box = entry.asked ? TICKED : BLANK;
  const state = entry.asked ? ui.asked : ui.toAsk;
  return `<li><span aria-hidden="true">${box}</span> <span class="sr">${escapeHtml(state)}${lang === 'fr' ? '\u00a0' : ''}: </span>${escapeHtml(entry.question)}</li>`;
}

/** The whole printable document as one string. */
export function renderPrintPage(entries: readonly PlanEntry[], options: PrintOptions): string {
  const { lang } = options;
  const ui = PRINT_UI[lang];
  const total = entries.reduce((n, e) => n + e.items.length, 0);
  const asked = entries.reduce((n, e) => n + e.items.filter((i) => i.asked).length, 0);
  const body =
    entries.length === 0
      ? `<p>${escapeHtml(ui.empty)}</p>`
      : entries.map((e) => `<section><h2>${escapeHtml(e.name)}</h2><ul>${e.items.map((i) => line(i, lang)).join('')}</ul></section>`).join('') +
        `<p class="note">${escapeHtml(lang === 'fr' ? fixFrench(ui.progress(asked, total)) : ui.progress(asked, total))}</p>`;
  const date = lang === 'fr' ? fixFrench(ui.date(options.today)) : ui.date(options.today);
  return (
    `<!doctype html><html lang="${htmlLang(lang)}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(ui.title)}</title>` +
    `<style>${PRINT_CSS}.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }</style></head>` +
    `<body><main><h1>${escapeHtml(ui.title)}</h1><p class="note">${escapeHtml(date)}</p><p class="note">${escapeHtml(lang === 'fr' ? fixFrench(ui.note) : ui.note)}</p>${body}</main></body></html>`
  );
}

export const PRINT_MIME = 'text/html;charset=utf-8';

export function printFilename(lang: Lang): string {
  return `visit-plan-${lang}.html`;
}
