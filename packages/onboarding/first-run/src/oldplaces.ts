import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import { FACT_KEYS, monthsSince } from "./facts";
import { button, esc } from "./html";
import type { Place } from "./places";

/**
 * Places whose newest record is two years old or more. An old record is not
 * wrong; it may simply be worth asking again. Places with no record are left
 * out here, because they have nothing to date: they stay UNKNOWN and appear on
 * the no-record page instead.
 */
export const OLD_PLACE_MONTHS = 24;

export const OLD_PLACES_COPY = {
  title: { en: "Places whose newest record is 2 years old or more", fr: "Lieux dont la donnée la plus récente date de 2 ans ou plus" },
  intro: {
    en: "An old record is not wrong. It may be worth asking the place again.",
    fr: "Une donnée ancienne n’est pas fausse. Il peut valoir la peine de redemander au lieu.",
  },
  none: { en: "Every place with a record has one newer than 2 years.", fr: "Chaque lieu avec une donnée en a une de moins de 2 ans." },
  newest: { en: "Newest record", fr: "Donnée la plus récente" },
} as const satisfies Record<string, Pair>;

export interface OldPlace {
  readonly place: Place;
  readonly newest: string;
  readonly months: number;
}

/** The newest record date for a place, or undefined when it has no record. */
export function newestRecord(place: Place): string | undefined {
  let newest: string | undefined;
  for (const k of FACT_KEYS) {
    const r = place.resolutions[k];
    if (r.kind === "unknown") continue;
    for (const o of r.observations) if (newest === undefined || o.provenance.recordedOn > newest) newest = o.provenance.recordedOn;
  }
  return newest;
}

/** Oldest first, then by name and id, so the order is stable. */
export function oldPlaces(places: readonly Place[], today: Date): OldPlace[] {
  const out: OldPlace[] = [];
  for (const place of places) {
    const newest = newestRecord(place);
    if (newest === undefined) continue;
    const months = monthsSince(newest, today);
    if (months >= OLD_PLACE_MONTHS) out.push({ place, newest, months });
  }
  return out.sort((a, b) => a.newest.localeCompare(b.newest) || a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id));
}

export function renderOldPlaces(places: readonly Place[], locale: Locale, today: Date): string {
  const l = locale;
  const list = oldPlaces(places, today);
  const colon = l === "fr" ? `${NB}:` : ":";
  const head = `<h3 id="old-places-title">${esc(t(OLD_PLACES_COPY.title, l))}</h3><p>${esc(t(OLD_PLACES_COPY.intro, l))}</p>`;
  if (list.length === 0) return `<section class="old-places" aria-labelledby="old-places-title">${head}<p data-old-none>${esc(t(OLD_PLACES_COPY.none, l))}</p></section>`;
  const items = list
    .map((o, i) => {
      const nameId = `old-place-${i}`;
      return (
        `<li data-place="${esc(o.place.id)}"><span id="${nameId}" data-user-content>${esc(o.place.name)}</span> · ` +
        `${esc(t(OLD_PLACES_COPY.newest, l))}${colon} ${esc(o.newest)} ` +
        button(t(COPY.places.viewHistory, l), { "data-action": "open-history", "data-value": o.place.id, "aria-describedby": nameId, class: "secondary" }) +
        `</li>`
      );
    })
    .join("");
  return `<section class="old-places" aria-labelledby="old-places-title">${head}<ul>${items}</ul></section>`;
}

/**
 * The same list as text lines for the record ages file: one line per place
 * with its address, newest record date and age in months. Empty list → the
 * "none" sentence, so the file always says what it found.
 */
export function oldPlacesLines(places: readonly Place[], locale: Locale, today: Date): string[] {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(OLD_PLACES_COPY.title, l);
  const lines = [title, "-".repeat(Math.min(title.length, 72)), t(OLD_PLACES_COPY.intro, l)];
  const list = oldPlaces(places, today);
  if (list.length === 0) lines.push(t(OLD_PLACES_COPY.none, l));
  for (const o of list) {
    const where = o.place.address ? ` (${o.place.address})` : "";
    lines.push(`- ${o.place.name}${where} · ${t(OLD_PLACES_COPY.newest, l)}${colon} ${o.newest} · ${monthsText(o.months, l)}`);
  }
  lines.push("");
  return lines;
}

/** "26 months ago", "il y a 26 mois". */
export function monthsText(months: number, locale: Locale): string {
  if (locale === "fr") return `il y a ${months} mois`;
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}

export function oldPlacesStrings(): Array<[string, Pair]> {
  return Object.entries(OLD_PLACES_COPY).map(([k, p]): [string, Pair] => [`OLD_PLACES_COPY.${k}`, p]);
}
