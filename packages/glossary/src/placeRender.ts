import { highlightName } from './highlightName';
import { htmlLang } from './locale';
import { claimFreshness, freshnessText, summarisePlace, verdictText, type PlaceMatch } from './places';
import { describeFeature } from './status';
import type { Lang } from './plainTerms';
import { escapeHtml, fold } from './text';

export const PLACE_UI = {
  en: { heading: 'Places', none: 'No places to show.', features: 'Features' },
  fr: { heading: 'Lieux', none: 'Aucun lieu à afficher.', features: 'Caractéristiques' },
} as const;

export const PLACE_CSS = `.gl-places { list-style: none; margin: 16px 0; padding: 0; }
.gl-places > li { margin: 0 0 16px; }
.gl-place { padding: 12px; border: 1px solid currentColor; border-radius: 4px; }
.gl-verdict { margin: 4px 0; font-weight: 700; }
.gl-features { margin: 8px 0 0; padding-inline-start: 20px; }
.gl-features li { margin: 4px 0; padding-block: 4px; }
.gl-features li[data-outcome='unknown'] { font-style: italic; }
.gl-note { display: block; font-size: 0.875rem; }
`;

function slug(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'place';
}

/** One place: name, one-sentence verdict, counts, then each chosen feature with its source. */
export function renderPlaceCard(match: PlaceMatch, lang: Lang, today: string, index = 0, query = ''): string {
  const id = `place-${index}-${slug(match.place.id)}`;
  const items = match.results.map((r) => {
    const d = describeFeature(r.claim, lang);
    const fresh = freshnessText(claimFreshness(r.claim, today), lang);
    const notes = [
      d.source === undefined ? '' : `<span class="gl-note">${escapeHtml(d.source)}</span>`,
      fresh === null ? '' : `<span class="gl-note">${escapeHtml(fresh)}</span>`,
    ].join('');
    return `<li data-outcome="${r.outcome}">${escapeHtml(d.text)}${notes}</li>`;
  });
  const list =
    items.length === 0
      ? ''
      : `<h4 class="gl-note">${escapeHtml(PLACE_UI[lang].features)}</h4><ul class="gl-features">${items.join('')}</ul>`;
  return (
    `<article class="gl-place" aria-labelledby="${id}">` +
    `<h3 id="${id}">${highlightName(match.place.name, query)}</h3>` +
    `<p class="gl-verdict" data-verdict="${match.verdict}">${escapeHtml(verdictText(match, lang))}</p>` +
    `<p class="gl-counts">${escapeHtml(summarisePlace(match.place, lang))}</p>` +
    `${list}</article>`
  );
}

/** A list of already-ranked matches (see rankPlaces). */
export function renderPlaceList(matches: readonly PlaceMatch[], lang: Lang, today: string): string {
  const ui = PLACE_UI[lang];
  const body =
    matches.length === 0
      ? `<p class="gl-empty">${escapeHtml(ui.none)}</p>`
      : `<ul class="gl-places">${matches
          .map((m, i) => `<li>${renderPlaceCard(m, lang, today, i)}</li>`)
          .join('')}</ul>`;
  return (
    `<section class="gl-section" lang="${htmlLang(lang)}" aria-labelledby="gl-places-title">` +
    `<h2 id="gl-places-title">${escapeHtml(ui.heading)}</h2>${body}</section>`
  );
}
