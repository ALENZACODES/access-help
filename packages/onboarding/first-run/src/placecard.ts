import type { Locale } from "../../switch-first/src/index";
import { t, type Pair } from "./copy";
import { hasRequirement, type Requirement } from "./filter";
import { esc } from "./html";
import type { Place } from "./places";
import { placeQuestions } from "./placequestions";
import { whyLines, whyOf } from "./standing-why";
import { passportHtml, type Passport } from "./passport";
import { renderResolutionList } from "./views-places";

/**
 * Printed cards for a visit: one card per place, with every detail as the App
 * knows it (value, source, licence, date, or UNKNOWN), the questions still
 * open at that place, how it stands against the person's must-haves, and the
 * day the card was made, so an old printout is never mistaken for a new one.
 *
 * The same cards go on the screen (with "Print" and "Larger text"), and into a
 * self-contained web page the person can download and print or read later,
 * with no connection. The page has its own print styles and nothing that runs.
 */
export const CARD_COPY = {
  openOne: { en: "Print a card for this place", fr: "Imprimer une fiche pour ce lieu" },
  openShortlist: { en: "Print cards for my shortlist", fr: "Imprimer les fiches de ma présélection" },
  title: { en: "Cards to print", fr: "Fiches à imprimer" },
  intro: {
    en: "One card per place, with where each detail came from and the questions still open. Print it, or download it as a page to print or read later, offline.",
    fr: "Une fiche par lieu, avec la provenance de chaque détail et les questions encore ouvertes. Imprimez-la, ou téléchargez-la comme page à imprimer ou à lire plus tard, hors ligne.",
  },
  print: { en: "Print", fr: "Imprimer" },
  larger: { en: "Larger text on the cards", fr: "Texte plus grand sur les fiches" },
  download: { en: "Download the cards as a web page", fr: "Télécharger les fiches comme page Web" },
  none: { en: "There is no place to print.", fr: "Il n’y a aucun lieu à imprimer." },
  questionsTitle: { en: "To ask there", fr: "À demander sur place" },
  noQuestions: { en: "Every detail has reports that agree.", fr: "Chaque détail a des rapports qui concordent." },
  needsTitle: { en: "Against your must-haves", fr: "Selon vos essentiels" },
  needsMet: { en: "Matches every must-have you set.", fr: "Correspond à chacun de vos essentiels." },
  madeOn: { en: "Card made on", fr: "Fiche créée le" },
  fromNotes: {
    en: "From notes kept on one device. Things may have changed since.",
    fr: "D’après des notes gardées sur un appareil. Les choses ont pu changer depuis.",
  },
  back: { en: "Back", fr: "Retour" },
} as const satisfies Record<string, Pair>;

export interface CardOptions {
  readonly needs: Requirement;
  readonly locale: Locale;
  readonly today: Date;
}

/** The must-have lines for a place: what does not match or is not known, or that all match. Nothing when no must-have is set. */
export function cardNeedsLines(place: Place, needs: Requirement, l: Locale): string[] {
  if (!hasRequirement(needs)) return [];
  const lines = whyLines(whyOf(place, needs), l);
  return lines.length > 0 ? lines : [t(CARD_COPY.needsMet, l)];
}

/**
 * The card for one place, as markup. Its heading is at `level` (3 under a
 * view's h2 on screen, 2 under the downloaded page's h1), its parts one below.
 */
export function cardHtml(place: Place, index: number, o: CardOptions, level: 2 | 3 = 3): string {
  const h = `h${level}`;
  const sub = `h${level + 1}`;
  const l = o.locale;
  const id = `card-${index}`;
  const questions = placeQuestions(place, l);
  const needs = cardNeedsLines(place, o.needs, l);
  return (
    `<article class="place-card" aria-labelledby="${id}" data-card="${esc(place.id)}">` +
    `<${h} id="${id}"><span data-user-content>${esc(place.name)}</span></${h}>` +
    (place.address ? `<p class="card-address"><span data-user-content>${esc(place.address)}</span></p>` : "") +
    renderResolutionList(place, l, o.today) +
    (needs.length > 0
      ? `<${sub}>${esc(t(CARD_COPY.needsTitle, l))}</${sub}><ul class="card-needs">${needs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
      : "") +
    `<${sub}>${esc(t(CARD_COPY.questionsTitle, l))}</${sub}>` +
    (questions.length > 0
      ? `<ol class="card-questions">${questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>`
      : `<p>${esc(t(CARD_COPY.noQuestions, l))}</p>`) +
    `<p class="card-made">${esc(`${t(CARD_COPY.madeOn, l)} ${o.today.toISOString().slice(0, 10)}. ${t(CARD_COPY.fromNotes, l)}`)}</p>` +
    `</article>`
  );
}

/** Every card, in the order given. */
export function cardsHtml(places: readonly Place[], o: CardOptions, level: 2 | 3 = 3): string {
  return places.map((p, i) => cardHtml(p, i, o, level)).join("");
}

/** Print styles: one card per page when printed, the App's menus and buttons hidden, and larger text when asked. */
export function cardCss(large: boolean): string {
  return (
    `.place-card{border:1px solid currentColor;border-radius:.5rem;padding:1rem;margin-block:1rem}` +
    `.place-card dl.facts dd{margin-inline-start:0;margin-block-end:.5rem}` +
    (large ? `.place-card{font-size:150%}` : "") +
    `@media print{body{background:#fff;color:#000}.no-print,nav,header,.skip-link{display:none!important}` +
    `.place-card{break-inside:avoid;page-break-inside:avoid;border-color:#000}.place-card+.place-card{break-before:page}}`
  );
}

/**
 * The cards as one self-contained web page: its own language, title and print
 * styles, and no script, so it opens and prints the same anywhere, offline.
 */
export function cardsDocument(places: readonly Place[], o: CardOptions, large: boolean, passport?: Passport): string {
  const l = o.locale;
  const title = places.length === 1 && places[0] ? `${t(CARD_COPY.title, l)} – ${places[0].name}` : t(CARD_COPY.title, l);
  const body = places.length === 0 ? `<p>${esc(t(CARD_COPY.none, l))}</p>` : (passport ? passportHtml(passport, l, 2) : "") + cardsHtml(places, o, 2);
  return (
    `<!DOCTYPE html><html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${esc(title)}</title><style>body{font:1rem/1.5 system-ui,sans-serif;margin:1rem;max-width:48rem}${cardCss(large)}</style></head>` +
    `<body><main><h1>${esc(t(CARD_COPY.title, l))}</h1><p class="no-print">${esc(t(CARD_COPY.intro, l))}</p>${body}</main></body></html>`
  );
}

/** "cards-library-1a2b3c4d-2026-11-20.html", or "cards-shortlist-…" for several places. */
export function cardsFilename(places: readonly Place[], today: Date): string {
  const which = places.length === 1 && places[0] ? places[0].id : "shortlist";
  return `cards-${which}-${today.toISOString().slice(0, 10)}.html`;
}

/** A data address for the page, for a download link. */
export function cardsHref(html: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export function cardStrings(): Array<[string, Pair]> {
  return Object.entries(CARD_COPY).map(([k, p]): [string, Pair] => [`card.${k}`, p]);
}
