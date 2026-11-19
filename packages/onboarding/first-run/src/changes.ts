import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import type { FactKey, Provenance } from "./facts";
import type { PlaceHistory } from "./history";
import { esc } from "./html";
import { recordLine, recordParts } from "./tier";

/**
 * The moments in a place's record history when a record gave a different
 * answer from the record just before it, in date order. Each change shows both
 * records in full, so the person can see who said what and when. A change is
 * not a correction: the App does not say the later record is right, and it
 * does not drop the earlier one.
 */
export interface AnswerChange {
  readonly key: FactKey;
  readonly from: { readonly value: "yes" | "no"; readonly provenance: Provenance };
  readonly to: { readonly value: "yes" | "no"; readonly provenance: Provenance };
  /** True when both records carry the same date, so their order says nothing about time. */
  readonly sameDay: boolean;
}

export const CHANGE_COPY = {
  title: { en: "When the answer changed", fr: "Quand la réponse a changé" },
  intro: {
    en: "Each item is a record that gave a different answer from the record just before it.",
    fr: "Chaque élément est une donnée qui donne une autre réponse que la donnée juste avant.",
  },
  notCorrection: {
    en: "A newer record is not a correction. Both records are kept, and the App does not say which is right.",
    fr: "Une donnée plus récente n’est pas une correction. Les deux données sont gardées, et l’App ne dit pas laquelle a raison.",
  },
  none: { en: "No record gave a different answer from the one before it.", fr: "Aucune donnée ne donne une autre réponse que la précédente." },
  before: { en: "Before", fr: "Avant" },
  after: { en: "After", fr: "Après" },
  sameDay: {
    en: "Both records have the same date, so their order does not say which came first.",
    fr: "Les deux données ont la même date, donc leur ordre ne dit pas laquelle est venue en premier.",
  },
  count: { en: "Changes of answer", fr: "Changements de réponse" },
} as const satisfies Record<string, Pair>;

/**
 * Changes in date order, oldest first, across every detail. A detail's history
 * holds its entries newest first, each marked against the record before it.
 */
export function answerChanges(history: PlaceHistory): AnswerChange[] {
  const out: AnswerChange[] = [];
  for (const d of history.details) {
    const chronological = [...d.entries].reverse();
    for (let i = 1; i < chronological.length; i++) {
      const prev = chronological[i - 1];
      const cur = chronological[i];
      if (!prev || !cur || cur.change !== "different") continue;
      out.push({
        key: d.key,
        from: { value: prev.value, provenance: prev.provenance },
        to: { value: cur.value, provenance: cur.provenance },
        sameDay: prev.provenance.recordedOn === cur.provenance.recordedOn,
      });
    }
  }
  // Oldest change first; on the same day the usual detail order (the order of history.details) is kept.
  return out
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (a.c.to.provenance.recordedOn === b.c.to.provenance.recordedOn ? a.i - b.i : a.c.to.provenance.recordedOn < b.c.to.provenance.recordedOn ? -1 : 1))
    .map((x) => x.c);
}

/** "Elevator: Yes, then No." */
export function changeHeadline(c: AnswerChange, locale: Locale): string {
  const colon = locale === "fr" ? `${NB}:` : ":";
  const then = locale === "fr" ? "puis" : "then";
  return `${t(COPY.facts[c.key], locale)}${colon} ${t(COPY.values[c.from.value], locale)}, ${then} ${t(COPY.values[c.to.value], locale)}.`;
}

function side(label: Pair, value: "yes" | "no", p: Provenance, l: Locale): string {
  const r = recordParts(p, l);
  const colon = l === "fr" ? `${NB}:` : ":";
  return (
    `<li>${esc(t(label, l))}${colon} <strong>${esc(t(COPY.values[value], l))}</strong>. ` +
    `<span data-user-content>${esc(r.source)}</span> · ${esc(r.licence)} · ${esc(r.date)} · ${esc(r.tier)}.</li>`
  );
}

/** The section on the record history page. */
export function renderChanges(history: PlaceHistory, locale: Locale): string {
  const l = locale;
  const changes = answerChanges(history);
  const head =
    `<h3 id="changes-title">${esc(t(CHANGE_COPY.title, l))}</h3>` +
    `<p>${esc(t(CHANGE_COPY.intro, l))}</p><p class="notice" data-changes-note>${esc(t(CHANGE_COPY.notCorrection, l))}</p>`;
  if (changes.length === 0) return `<section class="changes" aria-labelledby="changes-title">${head}<p data-changes-none>${esc(t(CHANGE_COPY.none, l))}</p></section>`;
  const items = changes
    .map(
      (c, i) =>
        `<li data-key="${c.key}" data-same-day="${c.sameDay}"><p id="change-${i}"><strong>${esc(changeHeadline(c, l))}</strong></p>` +
        `<ul aria-labelledby="change-${i}">${side(CHANGE_COPY.before, c.from.value, c.from.provenance, l)}${side(CHANGE_COPY.after, c.to.value, c.to.provenance, l)}</ul>` +
        (c.sameDay ? `<p class="hint">${esc(t(CHANGE_COPY.sameDay, l))}</p>` : "") +
        `</li>`,
    )
    .join("");
  const colon = l === "fr" ? `${NB}:` : ":";
  return (
    `<section class="changes" aria-labelledby="changes-title">${head}` +
    `<p>${esc(t(CHANGE_COPY.count, l))}${colon} <strong data-changes-count>${changes.length}</strong></p>` +
    `<ol class="changes-list">${items}</ol></section>`
  );
}

/** The same section as plain text lines. Change lines start with "* " so they never read as record lines. */
export function changesToText(history: PlaceHistory, locale: Locale): string[] {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(CHANGE_COPY.title, l);
  const lines = [title, "-".repeat(Math.min(Math.max(title.length, 3), 72)), t(CHANGE_COPY.notCorrection, l)];
  const changes = answerChanges(history);
  if (changes.length === 0) lines.push(t(CHANGE_COPY.none, l));
  for (const c of changes) {
    lines.push(`* ${changeHeadline(c, l)}`);
    lines.push(`  ${t(CHANGE_COPY.before, l)}${colon} ${t(COPY.values[c.from.value], l)}. ${recordLine(c.from.provenance, l)}.`);
    lines.push(`  ${t(CHANGE_COPY.after, l)}${colon} ${t(COPY.values[c.to.value], l)}. ${recordLine(c.to.provenance, l)}.`);
    if (c.sameDay) lines.push(`  ${t(CHANGE_COPY.sameDay, l)}`);
  }
  lines.push("");
  return lines;
}

/** Every string pair in this module, for the copy audit. */
export function changeStrings(): Array<[string, Pair]> {
  return Object.entries(CHANGE_COPY).map(([k, p]): [string, Pair] => [`CHANGE_COPY.${k}`, p]);
}
