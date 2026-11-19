import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t } from "./copy";
import { FACT_KEYS, STALE_AFTER_MONTHS, monthsSince, type FactKey } from "./facts";
import { QUESTIONS } from "./plan";
import type { Place } from "./places";
import { reportCount } from "./places";
import { newestRecord } from "./summary";

/**
 * A list of details worth asking about again, across every place: details
 * whose reports differ, details whose newest record is a year old or more, and
 * details with no record. It is a to-ask list. It does not say a record is
 * wrong, and it does not change any note.
 */
export type ReviewReason = "differ" | "old" | "unknown";

export const REVIEW_REASONS: readonly ReviewReason[] = ["differ", "old", "unknown"];
export const REVIEW_PAGE = 10;

export function isReviewReason(v: string | undefined): v is ReviewReason {
  return v === "differ" || v === "old" || v === "unknown";
}

export interface ReviewItem {
  readonly key: FactKey;
  readonly reason: ReviewReason;
  /** Newest recorded date, undefined for a detail with no record. */
  readonly newest: string | undefined;
  /** Whole months since the newest record. */
  readonly months: number | undefined;
  readonly reports: number;
}

export interface ReviewPlace {
  readonly place: Place;
  readonly items: readonly ReviewItem[];
}

export type ReviewCounts = Readonly<Record<ReviewReason, number>>;

/** The reason a detail is on the list, or undefined when it has a recent record that all reports agree on. */
export function reasonFor(place: Place, key: FactKey, today: Date): ReviewReason | undefined {
  const r = place.resolutions[key];
  if (r.kind === "unknown") return "unknown";
  if (r.kind === "differ") return "differ";
  const newest = newestRecord(r);
  return newest !== undefined && monthsSince(newest, today) >= STALE_AFTER_MONTHS ? "old" : undefined;
}

export function reviewItems(place: Place, today: Date): ReviewItem[] {
  const out: ReviewItem[] = [];
  for (const key of FACT_KEYS) {
    const reason = reasonFor(place, key, today);
    if (reason === undefined) continue;
    const r = place.resolutions[key];
    const newest = newestRecord(r);
    out.push({ key, reason, newest, months: newest === undefined ? undefined : monthsSince(newest, today), reports: reportCount(r) });
  }
  return out;
}

const WEIGHT: Record<ReviewReason, number> = { differ: 0, old: 1, unknown: 2 };

function firstWeight(p: ReviewPlace): number {
  return Math.min(...p.items.map((i) => WEIGHT[i.reason]));
}

/**
 * Places with something to ask, in a fixed order: places with differing
 * reports first, then places with old records, then places with only unknown
 * details; inside each group by name. This orders the questions, not the places.
 */
export function buildReview(places: readonly Place[], today: Date, only?: ReviewReason): ReviewPlace[] {
  const out: ReviewPlace[] = [];
  for (const place of places) {
    const all = reviewItems(place, today);
    const items = only === undefined ? all : all.filter((i) => i.reason === only);
    if (items.length > 0) out.push({ place, items });
  }
  return out.sort(
    (a, b) => firstWeight(a) - firstWeight(b) || a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id),
  );
}

export function reviewCounts(places: readonly Place[], today: Date): ReviewCounts {
  const c = { differ: 0, old: 0, unknown: 0 };
  for (const place of places) for (const i of reviewItems(place, today)) c[i.reason] += 1;
  return c;
}

export function totalItems(list: readonly ReviewPlace[]): number {
  return list.reduce((n, p) => n + p.items.length, 0);
}

/** How many places to show: at least one page, never more than there are, always a whole number of pages or the full list. */
export function clampShown(shown: number, total: number): number {
  if (!Number.isInteger(shown) || shown < REVIEW_PAGE) return Math.min(REVIEW_PAGE, total);
  return Math.min(shown, total);
}

/** "1 place shown, out of 1." or "10 places shown, out of 23.", with the right plural in each language. */
export function shownText(shown: number, total: number, locale: Locale): string {
  if (locale === "fr") return `${shown} ${shown > 1 ? "lieux affichés" : "lieu affiché"}, sur ${total}.`;
  return `${shown} ${shown === 1 ? "place" : "places"} shown, out of ${total}.`;
}

export function reasonLabel(reason: ReviewReason, locale: Locale): string {
  return t(reason === "differ" ? COPY.review.differ : reason === "old" ? COPY.review.old : COPY.review.unknown, locale);
}

/** Why the detail is listed, in one sentence, with the date when there is one. */
export function itemReason(item: ReviewItem, locale: Locale): string {
  const l = locale;
  if (item.reason === "unknown") return t(COPY.review.whyUnknown, l);
  if (item.reason === "differ") {
    return l === "fr"
      ? `${item.reports} rapports ne disent pas la même chose. Le plus récent date du ${item.newest ?? ""}.`
      : `${item.reports} reports do not say the same thing. The newest is from ${item.newest ?? ""}.`;
  }
  return l === "fr"
    ? `La donnée la plus récente date du ${item.newest ?? ""}, il y a ${item.months ?? STALE_AFTER_MONTHS} mois.`
    : `The newest record is from ${item.newest ?? ""}, ${item.months ?? STALE_AFTER_MONTHS} months ago.`;
}

/** The question to ask the place. An old record gets a "still the case" question; the others get the usual one. */
export function itemQuestion(item: ReviewItem, locale: Locale): string {
  if (item.reason !== "old") return QUESTIONS[item.key][locale];
  const label = t(COPY.facts[item.key], locale);
  return locale === "fr" ? `Est-ce toujours le cas${NB}: ${label}${NN}?` : `Is this still the case: ${label}?`;
}

const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

export function reviewToText(list: readonly ReviewPlace[], locale: Locale, today: Date, only?: ReviewReason): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(COPY.review.title, l);
  const lines: string[] = [title, rule(title), "", t(COPY.review.intro, l), t(COPY.review.notWrong, l)];
  if (only !== undefined) lines.push(`${t(COPY.review.showing, l)}${colon} ${reasonLabel(only, l)}`);
  lines.push("");
  if (list.length === 0) lines.push(t(COPY.review.none, l), "");
  for (const p of list) {
    lines.push(p.place.name, rule(p.place.name, "-"));
    if (p.place.address) lines.push(p.place.address);
    for (const i of p.items) {
      lines.push(`- ${t(COPY.facts[i.key], l)}${colon} ${reasonLabel(i.reason, l)}. ${itemReason(i, l)}`, `  ${itemQuestion(i, l)}`);
    }
    lines.push("");
  }
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function reviewFilename(today: Date, locale: Locale, only?: ReviewReason): string {
  const base = locale === "fr" ? "a-redemander" : "ask-again";
  return `${base}${only === undefined ? "" : `-${only}`}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}
