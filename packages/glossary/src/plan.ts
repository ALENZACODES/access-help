import { fixFrench } from './frTypography';
import { htmlLang } from './locale';
import { questionsFor, reasonText, type QuestionReason } from './questions';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * A visit plan: for each saved place, the questions the data cannot answer, with a box to
 * tick when the person has asked. A tick is the person's own record. It is not a source and
 * it never changes what is reported about the place.
 */
export type PlanState = Readonly<Record<string, readonly string[]>>;

export const PLAN_STORE_KEY = 'glossary-visit-plan';
export const MAX_PLAN_PLACES = 200;

export interface PlanItem {
  readonly termId: string;
  readonly term: string;
  readonly question: string;
  readonly reason: QuestionReason;
  readonly asked: boolean;
}

export interface PlanEntry {
  readonly placeId: string;
  readonly name: string;
  /** Index of the place in the list given to buildPlan (used in control ids). */
  readonly index: number;
  readonly items: readonly PlanItem[];
  readonly asked: number;
}

/** Ticks or unticks one question. Ticking nothing for a place removes its entry. */
export function setAsked(plan: PlanState, placeId: string, termId: string, asked: boolean): PlanState {
  const current = Object.prototype.hasOwnProperty.call(plan, placeId) ? (plan[placeId] ?? []) : [];
  const has = current.includes(termId);
  if (has === asked) return plan;
  const next = asked ? [...current, termId] : current.filter((t) => t !== termId);
  const out: Record<string, readonly string[]> = { ...plan };
  delete out[placeId];
  if (next.length > 0) out[placeId] = next;
  const ids = Object.keys(out);
  if (ids.length > MAX_PLAN_PLACES) for (const id of ids.slice(0, ids.length - MAX_PLAN_PLACES)) delete out[id];
  return out;
}

export function isAsked(plan: PlanState, placeId: string, termId: string): boolean {
  return Object.prototype.hasOwnProperty.call(plan, placeId) && (plan[placeId] ?? []).includes(termId);
}

export function serialisePlan(plan: PlanState): string {
  return JSON.stringify(plan);
}

/** Null unless the text is a JSON object of string lists. Bad entries are dropped and lists de-duplicated. */
export function parsePlan(json: string): PlanState | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    let out: PlanState = {};
    for (const [id, list] of Object.entries(raw)) {
      if (!Array.isArray(list)) continue;
      for (const t of new Set(list.filter((x): x is string => typeof x === 'string'))) out = setAsked(out, id, t, true);
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * One entry per saved place that has something to ask, in the order saved. Saved ids that are
 * not in `places` are skipped. Ticks for questions that no longer apply are ignored.
 */
export function buildPlan(
  places: readonly Place[],
  savedIds: readonly string[],
  termIds: readonly string[],
  today: string,
  lang: Lang,
  plan: PlanState,
): readonly PlanEntry[] {
  const out: PlanEntry[] = [];
  for (const id of savedIds) {
    const index = places.findIndex((p) => p.id === id);
    const place = places[index];
    if (place === undefined) continue;
    const items = questionsFor(place, termIds, today, lang).map((q) => ({
      termId: q.termId,
      term: q.term,
      question: q.question,
      reason: q.reason,
      asked: isAsked(plan, place.id, q.termId),
    }));
    if (items.length === 0) continue;
    out.push({ placeId: place.id, name: place.name, index, items, asked: items.filter((i) => i.asked).length });
  }
  return out;
}

export function planTotals(entries: readonly PlanEntry[]): { readonly asked: number; readonly total: number } {
  return {
    asked: entries.reduce((n, e) => n + e.asked, 0),
    total: entries.reduce((n, e) => n + e.items.length, 0),
  };
}

export const PLAN_UI = {
  en: {
    heading: 'Visit plan',
    intro: 'Questions to ask the places you saved. Tick a question when you have asked it. Your ticks stay on this device.',
    noSaved: 'Save a place to plan what to ask.',
    nothing: 'Nothing to ask: your saved places have recent answers for these features.',
    progress: (asked: number, total: number): string => `${asked} of ${total} questions asked`,
    placeProgress: (name: string, asked: number, total: number): string => `${name}: ${asked} of ${total} asked`,
    exportPlan: 'Copy visit plan as text',
    title: 'Visit plan',
    checkLabel: (question: string, term: string): string => `${question} (${term})`,
  },
  fr: {
    heading: 'Plan de visite',
    intro: 'Questions à poser aux lieux que vous avez enregistrés. Cochez une question quand vous l’avez posée. Vos coches restent sur cet appareil.',
    noSaved: 'Enregistrez un lieu pour planifier vos questions.',
    nothing: 'Rien à demander\u00a0: vos lieux enregistrés ont des réponses récentes pour ces caractéristiques.',
    progress: (asked: number, total: number): string =>
      `${asked} question${asked > 1 ? 's posées' : ' posée'} sur ${total}`,
    placeProgress: (name: string, asked: number, total: number): string =>
      `${name}\u00a0: ${asked} question${asked > 1 ? 's posées' : ' posée'} sur ${total}`,
    exportPlan: 'Copier le plan de visite en texte',
    title: 'Plan de visite',
    checkLabel: (question: string, term: string): string => `${question} (${term})`,
  },
} as const;

export function progressText(asked: number, total: number, lang: Lang): string {
  const t = PLAN_UI[lang].progress(asked, total);
  return lang === 'fr' ? fixFrench(t) : t;
}

export function placeProgressText(name: string, asked: number, total: number, lang: Lang): string {
  const t = PLAN_UI[lang].placeProgress(name, asked, total);
  return lang === 'fr' ? fixFrench(t) : t;
}

/** Control id for one tick box. `index` is the place's index in the finder's place list. */
export function askId(index: number, termId: string): string {
  return `gl-ask-${index}-${termId}`;
}

/** Splits an id made by askId. Null for anything else. */
export function parseAskId(id: string): { readonly index: number; readonly termId: string } | null {
  const m = /^gl-ask-(\d+)-([a-z0-9-]+)$/.exec(id);
  return m === null ? null : { index: Number(m[1]), termId: m[2] ?? '' };
}

/** The whole section: heading, one group of tick boxes per saved place, and progress. */
export function renderPlan(entries: readonly PlanEntry[], savedCount: number, lang: Lang): string {
  const ui = PLAN_UI[lang];
  const fix = (s: string): string => (lang === 'fr' ? fixFrench(s) : s);
  let body: string;
  if (savedCount === 0) body = `<p class="gl-note">${escapeHtml(fix(ui.noSaved))}</p>`;
  else if (entries.length === 0) body = `<p class="gl-note">${escapeHtml(fix(ui.nothing))}</p>`;
  else {
    const totals = planTotals(entries);
    const groups = entries
      .map((e) => {
        const boxes = e.items
          .map((i) => {
            const id = askId(e.index, i.termId);
            const label = fix(ui.checkLabel(i.question, i.term));
            return (
              `<label class="gl-check" for="${id}"><input class="gl-box" type="checkbox" id="${id}"${i.asked ? ' checked' : ''}>` +
              `<span>${escapeHtml(label)}<span class="gl-note">${escapeHtml(fix(`${i.term} : ${reasonText(i.reason, lang)}`))}</span></span></label>`
            );
          })
          .join('');
        return (
          `<fieldset class="gl-fieldset"><legend>${escapeHtml(e.name)}</legend>${boxes}` +
          `<p class="gl-note">${escapeHtml(placeProgressText(e.name, e.asked, e.items.length, lang))}</p></fieldset>`
        );
      })
      .join('');
    body =
      `<p class="gl-note">${escapeHtml(fix(ui.intro))}</p>${groups}` +
      `<p role="status" aria-live="polite">${escapeHtml(progressText(totals.asked, totals.total, lang))}</p>`;
  }
  return (
    `<section class="gl-plan" lang="${htmlLang(lang)}" aria-labelledby="gl-plan-title">` +
    `<h3 id="gl-plan-title">${escapeHtml(ui.heading)}</h3>${body}</section>`
  );
}

/** Plain-text plan with [x] / [ ] marks. Empty plan gives only the title. */
export function planToText(entries: readonly PlanEntry[], lang: Lang): string {
  const colon = lang === 'fr' ? ' :' : ':';
  const lines: string[] = [PLAN_UI[lang].title, ''];
  for (const e of entries) {
    lines.push(`${e.name}${colon}`);
    for (const i of e.items) lines.push(`  [${i.asked ? 'x' : ' '}] ${i.question}`);
    lines.push('');
  }
  const totals = planTotals(entries);
  if (entries.length > 0) lines.push(progressText(totals.asked, totals.total, lang));
  const text = lines.join('\n').trimEnd() + '\n';
  return lang === 'fr' ? fixFrench(text) : text;
}
