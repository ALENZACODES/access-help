import { GROUP_UI } from './featureGroups';
import { fixFrench } from './frTypography';
import { featureName } from './mustHaves';
import { SEEN_UI } from './observationsRender';
import { unknownWord } from './placeInfo';
import { freshnessText, type Place } from './places';
import type { Lang } from './plainTerms';
import { QUESTIONS } from './questions';
import { recordCell } from './recordsCsv';
import { escapeHtml } from './text';
import {
  NAME_SORT,
  STEP_IDS,
  STEP_SCOPES,
  VISIT_SORT,
  firstOpenStep,
  mustOpen,
  pairTotals,
  overviewTotals,
  seenDiffers,
  stillUnknown,
  visitCounts,
  type OverviewRow,
  type PairedStep,
  type StepCounts,
  type StepFeature,
  type StepScope,
  type StepState,
  type VisitStep,
} from './visitSteps';

/** The words and the markup for "A visit, step by step": one place in steps, and every place in one table. */
export const STEPS_UI = {
  en: {
    heading: 'A visit, step by step',
    intro: 'Choose a place to see what the records report for each step of a visit. The steps do not say how easy a place is to use.',
    place: 'Place for the steps',
    choosePlace: 'Choose a place',
    noPlaces: 'Load places to see a visit step by step.',
    title: (place: string): string => `A visit to ${place}, step by step`,
    states: { available: 'reported as available', 'not-available': 'reported as not available', disagree: 'Unknown, because the sources disagree' },
    source: (source: string, date: string): string => `Source: ${source}, dated ${date}.`,
    must: 'This is one of your must-haves.',
    seen: (date: string, seen: string): string => `You saw for yourself on ${date}: ${seen}.`,
    outcomes: {
      'all-reported-available': 'Every feature of this step is reported as available.',
      'some-not-available': 'A feature of this step is reported as not available.',
      'some-unknown': 'Part of this step is still Unknown.',
    },
    counts: (available: number, notAvailable: number, unknown: number): string => `Features of this step that are reported as available: ${available}. Reported as not available: ${notAvailable}. Where it is Unknown: ${unknown}.`,
    visitStatus: (unknown: number, total: number): string => (unknown === 0 ? 'Nothing on this visit is Unknown.' : `Features on this visit that are still Unknown: ${unknown} of ${total}.`),
    firstOpen: (step: string): string => `The information first runs short at this step: ${step}.`,
    mustOpenHeading: 'Must-haves the records do not report as available',
    differsHeading: 'Where what you saw differs from the records',
    askHeading: 'Questions you could ask the place',
    exportSteps: 'Save these steps as text',
    madeOn: (date: string): string => `Made on ${date} from the loaded records.`,
    shown: (place: string): string => `Showing the steps of a visit to ${place}.`,
    compareLabel: 'Compare with another place',
    compareNone: 'No other place',
    compareHeading: (a: string, b: string): string => `${a} and ${b}, side by side`,
    compareSame: 'The records report the same for both places.',
    compareDiffer: (n: number, total: number): string => `Features where the records differ between the two places: ${n} of ${total}.`,
    compareBothUnknown: (n: number): string => `Features that are Unknown for both places: ${n}.`,
    compareCaption: (step: string): string => `${step}: what the records report for each place`,
    colFeature: 'Feature',
    overviewHeading: 'How much is known, place by place',
    overviewIntro: 'Each cell says how many features of a step have a usable record. It does not say what the records report.',
    scopeLabel: 'Places to list',
    scopes: { all: 'Every place', saved: 'Saved places', plan: 'Places in your plan' },
    scopeEmpty: { all: 'There are no places to list.', saved: 'You have no saved places.', plan: 'Your plan has no places.' },
    sortLabel: 'Order by',
    sortName: 'Name of the place',
    sortVisit: 'Most known for the whole visit',
    sortStep: (step: string): string => `Most known for: ${step}`,
    cell: (known: number, total: number): string => `${known} of ${total} known`,
    colPlace: 'Place',
    colVisit: 'Whole visit',
    colSee: 'Steps',
    see: 'See the steps',
    seeLabel: (place: string): string => `See the steps of a visit to ${place}`,
    caption: 'Features with a usable record, for each place and step',
    totals: (places: number, none: number, all: number): string => `Places listed: ${places}. Places where nothing is Unknown: ${none}. Places where everything is Unknown: ${all}.`,
    more: (n: number): string => (n === 1 ? '1 more place is not shown. The saved table has every place.' : `${n} more places are not shown. The saved table has every place.`),
    exportTable: 'Save the table of steps for a spreadsheet',
    csv: { available: 'reported as available', notAvailable: 'reported as not available' },
  },
  fr: {
    heading: 'Une visite, étape par étape',
    intro: 'Choisissez un lieu pour voir ce que les fiches signalent à chaque étape d’une visite. Les étapes ne disent pas si un lieu est facile à utiliser.',
    place: 'Lieu pour les étapes',
    choosePlace: 'Choisir un lieu',
    noPlaces: 'Chargez des lieux pour voir une visite étape par étape.',
    title: (place: string): string => `Une visite à ${place}, étape par étape`,
    states: { available: 'signalé comme disponible', 'not-available': 'signalé comme non disponible', disagree: 'UNKNOWN, car les sources ne concordent pas' },
    source: (source: string, date: string): string => `Source\u00a0: ${source}, date du ${date}.`,
    must: 'C’est l’un de vos incontournables.',
    seen: (date: string, seen: string): string => `Vous avez vu vous-même le ${date}\u00a0: ${seen}.`,
    outcomes: {
      'all-reported-available': 'Chaque caractéristique de cette étape est signalée comme disponible.',
      'some-not-available': 'Une caractéristique de cette étape est signalée comme non disponible.',
      'some-unknown': 'Une partie de cette étape reste UNKNOWN.',
    },
    counts: (available: number, notAvailable: number, unknown: number): string =>
      `Cas où une caractéristique de cette étape est signalée comme disponible\u00a0: ${available}. Signalée comme non disponible\u00a0: ${notAvailable}. Où elle est UNKNOWN\u00a0: ${unknown}.`,
    visitStatus: (unknown: number, total: number): string => (unknown === 0 ? 'Rien de cette visite n’est UNKNOWN.' : `Caractéristiques de cette visite qui restent UNKNOWN\u00a0: ${unknown} sur ${total}.`),
    firstOpen: (step: string): string => `L’information manque d’abord à cette étape\u00a0: ${step}.`,
    mustOpenHeading: 'Incontournables que les fiches ne signalent pas comme disponibles',
    differsHeading: 'Là où ce que vous avez vu diffère des fiches',
    askHeading: 'Questions que vous pourriez poser au lieu',
    exportSteps: 'Enregistrer ces étapes en texte',
    madeOn: (date: string): string => `Créé le ${date} à partir des fiches chargées.`,
    shown: (place: string): string => `Affichage des étapes d’une visite à ${place}.`,
    compareLabel: 'Comparer avec un autre lieu',
    compareNone: 'Aucun autre lieu',
    compareHeading: (a: string, b: string): string => `${a} et ${b}, côte à côte`,
    compareSame: 'Les fiches signalent la même chose pour les deux lieux.',
    compareDiffer: (n: number, total: number): string => `Caractéristiques où les fiches diffèrent entre les deux lieux\u00a0: ${n} sur ${total}.`,
    compareBothUnknown: (n: number): string => `Caractéristiques qui sont UNKNOWN pour les deux lieux\u00a0: ${n}.`,
    compareCaption: (step: string): string => `${step}\u00a0: ce que les fiches signalent pour chaque lieu`,
    colFeature: 'Caractéristique',
    overviewHeading: 'Ce qui est connu, lieu par lieu',
    overviewIntro: 'Chaque case indique combien de caractéristiques d’une étape ont une fiche utilisable. Elle ne dit pas ce que les fiches signalent.',
    scopeLabel: 'Lieux à afficher',
    scopes: { all: 'Tous les lieux', saved: 'Lieux enregistrés', plan: 'Lieux de votre plan' },
    scopeEmpty: { all: 'Il n’y a aucun lieu à afficher.', saved: 'Vous n’avez aucun lieu enregistré.', plan: 'Votre plan ne contient aucun lieu.' },
    sortLabel: 'Trier par',
    sortName: 'Nom du lieu',
    sortVisit: 'Le plus connu pour toute la visite',
    sortStep: (step: string): string => `Le plus connu pour\u00a0: ${step}`,
    cell: (known: number, total: number): string => `${known} sur ${total} connues`,
    colPlace: 'Lieu',
    colVisit: 'Toute la visite',
    colSee: 'Étapes',
    see: 'Voir les étapes',
    seeLabel: (place: string): string => `Voir les étapes d’une visite à ${place}`,
    caption: 'Caractéristiques avec une fiche utilisable, par lieu et par étape',
    totals: (places: number, none: number, all: number): string => `Lieux affichés\u00a0: ${places}. Lieux où rien n’est UNKNOWN\u00a0: ${none}. Lieux où tout est UNKNOWN\u00a0: ${all}.`,
    more: (n: number): string => (n === 1 ? '1 autre lieu n’est pas affiché. Le tableau enregistré contient tous les lieux.' : `${n} autres lieux ne sont pas affichés. Le tableau enregistré contient tous les lieux.`),
    exportTable: 'Enregistrer le tableau des étapes pour un tableur',
    csv: { available: 'signalé comme disponible', notAvailable: 'signalé comme non disponible' },
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const STEPS_IDS = {
  place: 'gl-steps-place',
  other: 'gl-steps-other',
  exportText: 'gl-steps-export',
  scope: 'gl-steps-scope',
  sort: 'gl-steps-sort',
  exportTable: 'gl-steps-table',
} as const;

const SEE_PREFIX = 'gl-steps-see-';

export function stepsSeeId(placeIndex: number): string {
  return `${SEE_PREFIX}${placeIndex}`;
}

export function parseStepsSeeId(id: string): number | null {
  if (!id.startsWith(SEE_PREFIX)) return null;
  const rest = id.slice(SEE_PREFIX.length);
  return /^\d{1,5}$/.test(rest) ? Number(rest) : null;
}

export const MAX_OVERVIEW_ROWS = 50;
export const STEPS_TEXT_MIME = 'text/plain;charset=utf-8';
export const STEPS_CSV_MIME = 'text/csv;charset=utf-8';

export function stepName(stepId: string, lang: Lang): string {
  const names: Readonly<Record<string, string>> = GROUP_UI[lang].names;
  return names[stepId] ?? stepId;
}

/** What the records report for a feature, in words. Unknown is the word of the list, and the token in French. */
export function stateText(state: StepState, lang: Lang): string {
  return state === 'unknown' ? unknownWord(lang) : STEPS_UI[lang].states[state];
}

/** "Ramp: reported as available." The feature and what the records report, and nothing more. */
export function stepFeatureLine(feature: Pick<StepFeature, 'termId' | 'state'>, lang: Lang): string {
  return fr(lang, `${featureName(feature.termId, lang)}${lang === 'fr' ? ' :' : ':'} ${stateText(feature.state, lang)}.`);
}

/** The line, its source and age, whether it is a must-have, and what the person saw. */
export function featureParts(feature: StepFeature, lang: Lang): readonly string[] {
  const ui = STEPS_UI[lang];
  const parts = [stepFeatureLine(feature, lang)];
  if (feature.source !== undefined) parts.push(ui.source(feature.source.source, feature.source.date));
  const age = freshnessText(feature.freshness, lang);
  if (age !== null) parts.push(age);
  if (feature.must) parts.push(ui.must);
  if (feature.seen !== undefined) parts.push(fr(lang, ui.seen(feature.seen.date, SEEN_UI[lang].seenText[feature.seen.seen])));
  return parts;
}

export function featureText(feature: StepFeature, lang: Lang): string {
  return featureParts(feature, lang).join(' ');
}

export function countsLine(counts: StepCounts, lang: Lang): string {
  return STEPS_UI[lang].counts(counts.available, counts.notAvailable, counts.unknown);
}

/** How much of the whole visit is still unknown, each feature counted once. */
export function visitStatusText(steps: readonly VisitStep[], lang: Lang): string {
  const counts = visitCounts(steps);
  return STEPS_UI[lang].visitStatus(counts.unknown, counts.available + counts.notAvailable + counts.unknown);
}

/** The step where the information first runs short, or null when every step is reported as available. */
export function firstOpenText(steps: readonly VisitStep[], lang: Lang): string | null {
  const step = steps[firstOpenStep(steps)];
  return step === undefined ? null : fr(lang, STEPS_UI[lang].firstOpen(stepName(step.id, lang)));
}

/** A question for each feature of the visit that is still unknown, when the glossary has one. */
export function visitQuestions(steps: readonly VisitStep[], lang: Lang): readonly string[] {
  const out: string[] = [];
  for (const termId of stillUnknown(steps)) {
    const q = QUESTIONS[termId]?.[lang];
    if (q !== undefined) out.push(q);
  }
  return out;
}

const option = (value: string, label: string, chosen: string): string => `<option value="${escapeHtml(value)}"${value === chosen ? ' selected' : ''}>${escapeHtml(label)}</option>`;
const labelFor = (id: string, text: string): string => `<label for="${id}">${escapeHtml(text)}</label>`;
const bullets = (heading: string, items: readonly string[], name: string): string =>
  items.length === 0 ? '' : `<h5>${escapeHtml(heading)}</h5><ul data-steps-list="${name}">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;

export interface StepsWalkView {
  readonly lang: Lang;
  readonly places: readonly Place[];
  /** The place whose visit is set out, by position, or null when none is chosen. */
  readonly placeIndex: number | null;
  /** The steps of the chosen place. Ignored when no place is chosen. */
  readonly steps: readonly VisitStep[];
  readonly canExport: boolean;
}

/** The list to choose a place, then its visit in order: each step, its features, and what is left to find out. */
export function renderStepsWalk(view: StepsWalkView): string {
  const ui = STEPS_UI[view.lang];
  if (view.places.length === 0) return `<p class="gl-note">${escapeHtml(ui.noPlaces)}</p>`;
  const place = view.placeIndex === null ? undefined : view.places[view.placeIndex];
  const chosen = place === undefined ? '' : String(view.placeIndex);
  const select =
    `${labelFor(STEPS_IDS.place, ui.place)}<select id="${STEPS_IDS.place}" class="gl-select">` +
    `${option('', ui.choosePlace, chosen)}${view.places.map((p, i) => option(String(i), p.name, chosen)).join('')}</select>`;
  if (place === undefined) return select;
  const steps = view.steps;
  const first = firstOpenText(steps, view.lang);
  const stepHtml = (step: VisitStep): string =>
    `<li data-step="${step.id}" data-outcome="${step.outcome}"><h5>${escapeHtml(stepName(step.id, view.lang))}</h5>` +
    `<p>${escapeHtml(ui.outcomes[step.outcome])}</p><p class="gl-note">${escapeHtml(countsLine(step.counts, view.lang))}</p>` +
    `<ul>${step.features.map((f) => `<li data-state="${f.state}">${escapeHtml(featureText(f, view.lang))}</li>`).join('')}</ul></li>`;
  const button = view.canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${STEPS_IDS.exportText}">${escapeHtml(ui.exportSteps)}</button></div>` : '';
  return (
    `${select}<h4 id="gl-steps-title" tabindex="-1">${escapeHtml(ui.title(place.name))}</h4>` +
    `<p role="status">${escapeHtml(visitStatusText(steps, view.lang))}</p>${first === null ? '' : `<p data-gl-steps-first>${escapeHtml(first)}</p>`}` +
    `<ol class="gl-steps">${steps.map(stepHtml).join('')}</ol>` +
    bullets(ui.mustOpenHeading, mustOpen(steps).map((f) => stepFeatureLine(f, view.lang)), 'must') +
    bullets(ui.differsHeading, seenDiffers(steps).map((f) => featureText(f, view.lang)), 'differs') +
    bullets(ui.askHeading, visitQuestions(steps, view.lang), 'ask') +
    button
  );
}

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** How the records of two places differ over the visit, each feature counted once. */
export function compareStatusText(paired: readonly PairedStep[], lang: Lang): string {
  const ui = STEPS_UI[lang];
  const totals = pairTotals(paired);
  const first = totals.differ === 0 ? ui.compareSame : ui.compareDiffer(totals.differ, totals.features);
  return totals.bothUnknown === 0 ? first : `${first} ${ui.compareBothUnknown(totals.bothUnknown)}`;
}

export interface StepsCompareView {
  readonly lang: Lang;
  readonly places: readonly Place[];
  /** The place whose steps are set out. The list to compare with is drawn only when there is one. */
  readonly placeIndex: number | null;
  /** The other place, by position, or null when none is chosen. */
  readonly otherIndex: number | null;
  /** The two visits side by side. Ignored when no other place is chosen. */
  readonly paired: readonly PairedStep[];
}

/**
 * A list to choose a second place, then the two visits side by side: one small table for each
 * step, with what the records report for each place. Cells that differ are marked in the markup
 * and counted in words. Nothing says which place is better.
 */
export function renderStepsCompare(view: StepsCompareView): string {
  const ui = STEPS_UI[view.lang];
  const place = view.placeIndex === null ? undefined : view.places[view.placeIndex];
  if (place === undefined || view.places.length < 2) return '';
  const other = view.otherIndex === null || view.otherIndex === view.placeIndex ? undefined : view.places[view.otherIndex];
  const chosen = other === undefined ? '' : String(view.otherIndex);
  const select =
    `${labelFor(STEPS_IDS.other, ui.compareLabel)}<select id="${STEPS_IDS.other}" class="gl-select">${option('', ui.compareNone, chosen)}` +
    `${view.places.map((p, i) => (i === view.placeIndex ? '' : option(String(i), p.name, chosen))).join('')}</select>`;
  if (other === undefined) return select;
  const cell = (state: StepState, differs: boolean): string => {
    const text = escapeHtml(capital(stateText(state, view.lang)));
    return `<td data-state="${state}">${differs ? `<strong>${text}</strong>` : text}</td>`;
  };
  const table = (step: PairedStep): string => {
    const caption = escapeHtml(fr(view.lang, ui.compareCaption(stepName(step.id, view.lang))));
    const rows = step.features
      .map((f) => `<tr data-differs="${f.differs}"><th scope="row">${escapeHtml(featureName(f.termId, view.lang))}</th>${cell(f.a, f.differs)}${cell(f.b, f.differs)}</tr>`)
      .join('');
    return (
      `<div class="gl-compare-wrap" role="region" aria-label="${caption}" tabindex="0"><table class="gl-compare" data-step="${step.id}"><caption>${caption}</caption>` +
      `<thead><tr><th scope="col">${escapeHtml(ui.colFeature)}</th><th scope="col">${escapeHtml(place.name)}</th><th scope="col">${escapeHtml(other.name)}</th></tr></thead><tbody>${rows}</tbody></table></div>`
    );
  };
  return (
    `${select}<h5 id="gl-steps-compare-title">${escapeHtml(ui.compareHeading(place.name, other.name))}</h5>` +
    `<p role="status" data-gl-steps-compare>${escapeHtml(fr(view.lang, compareStatusText(view.paired, view.lang)))}</p>${view.paired.map(table).join('')}`
  );
}

/** The two visits side by side as plain text, to add to the steps of the first place. */
export function compareToText(a: Pick<Place, 'name'>, b: Pick<Place, 'name'>, paired: readonly PairedStep[], lang: Lang): string {
  const ui = STEPS_UI[lang];
  const lines = [ui.compareHeading(a.name, b.name), compareStatusText(paired, lang)];
  for (const step of paired) {
    lines.push('', stepName(step.id, lang));
    for (const f of step.features) {
      const colon = lang === 'fr' ? ' :' : ':';
      lines.push(`- ${featureName(f.termId, lang)}${colon} ${a.name}${colon} ${stateText(f.a, lang)}. ${b.name}${colon} ${stateText(f.b, lang)}.`);
    }
  }
  return fr(lang, lines.join('\n') + '\n');
}

/** The visit to one place as plain text, in the same order as the page. */
export function stepsToText(place: Pick<Place, 'name'>, steps: readonly VisitStep[], lang: Lang, today: string): string {
  const ui = STEPS_UI[lang];
  const lines = [ui.title(place.name), ui.madeOn(today), '', visitStatusText(steps, lang)];
  const first = firstOpenText(steps, lang);
  if (first !== null) lines.push(first);
  steps.forEach((step, i) => {
    lines.push('', `${i + 1}. ${stepName(step.id, lang)}`, ui.outcomes[step.outcome]);
    for (const feature of step.features) lines.push(`- ${featureText(feature, lang)}`);
  });
  const section = (heading: string, items: readonly string[]): void => {
    if (items.length > 0) lines.push('', heading, ...items.map((i) => `- ${i}`));
  };
  section(ui.mustOpenHeading, mustOpen(steps).map((f) => stepFeatureLine(f, lang)));
  section(ui.differsHeading, seenDiffers(steps).map((f) => featureText(f, lang)));
  section(ui.askHeading, visitQuestions(steps, lang));
  return fr(lang, lines.join('\n') + '\n');
}

export function stepsFilename(lang: Lang): string {
  return `visit-step-by-step-${lang}.txt`;
}

export function knownOf(counts: StepCounts): number {
  return counts.available + counts.notAvailable;
}

export function cellText(counts: StepCounts, lang: Lang): string {
  return STEPS_UI[lang].cell(knownOf(counts), knownOf(counts) + counts.unknown);
}

export interface StepsOverviewView {
  readonly lang: Lang;
  /** The rows of the chosen places, already in order. */
  readonly rows: readonly OverviewRow[];
  readonly scope: StepScope;
  readonly sort: string;
  readonly canExport: boolean;
  readonly limit?: number;
}

/** Every place in one table: how many features of each step have a usable record, and a way to see the steps. */
export function renderStepsOverview(view: StepsOverviewView): string {
  const ui = STEPS_UI[view.lang];
  const limit = view.limit ?? MAX_OVERVIEW_ROWS;
  const scope = `${labelFor(STEPS_IDS.scope, ui.scopeLabel)}<select id="${STEPS_IDS.scope}" class="gl-select">${STEP_SCOPES.map((s) => option(s, ui.scopes[s], view.scope)).join('')}</select>`;
  const head = `<h4>${escapeHtml(ui.overviewHeading)}</h4><p>${escapeHtml(ui.overviewIntro)}</p>${scope}`;
  if (view.rows.length === 0) return `${head}<p class="gl-note" data-gl-steps-empty>${escapeHtml(ui.scopeEmpty[view.scope])}</p>`;
  const sorts =
    option(NAME_SORT, ui.sortName, view.sort) + option(VISIT_SORT, ui.sortVisit, view.sort) + STEP_IDS.map((id) => option(id, fr(view.lang, ui.sortStep(stepName(id, view.lang))), view.sort)).join('');
  const sort = `${labelFor(STEPS_IDS.sort, ui.sortLabel)}<select id="${STEPS_IDS.sort}" class="gl-select">${sorts}</select>`;
  const totals = overviewTotals(view.rows);
  const heads =
    `<th scope="col">${escapeHtml(ui.colPlace)}</th>${STEP_IDS.map((id) => `<th scope="col">${escapeHtml(stepName(id, view.lang))}</th>`).join('')}` +
    `<th scope="col">${escapeHtml(ui.colVisit)}</th><th scope="col">${escapeHtml(ui.colSee)}</th>`;
  const cell = (counts: StepCounts): string => `<td data-unknown="${counts.unknown}">${escapeHtml(cellText(counts, view.lang))}</td>`;
  const body = view.rows
    .slice(0, limit)
    .map(
      (r) =>
        `<tr><th scope="row">${escapeHtml(r.name)}</th>${r.steps.map(cell).join('')}${cell(r.visit)}` +
        `<td><button type="button" class="gl-btn" id="${stepsSeeId(r.placeIndex)}" aria-label="${escapeHtml(ui.seeLabel(r.name))}">${escapeHtml(ui.see)}</button></td></tr>`,
    )
    .join('');
  const hidden = view.rows.length - Math.min(view.rows.length, limit);
  const more = hidden > 0 ? `<p class="gl-note" data-gl-steps-more>${escapeHtml(ui.more(hidden))}</p>` : '';
  const button = view.canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${STEPS_IDS.exportTable}">${escapeHtml(ui.exportTable)}</button></div>` : '';
  return (
    `${head}${sort}<p role="status">${escapeHtml(fr(view.lang, ui.totals(totals.places, totals.nothingUnknown, totals.allUnknown)))}</p>` +
    `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(ui.caption)}" tabindex="0">` +
    `<table class="gl-compare"><caption>${escapeHtml(ui.caption)}</caption><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></div>${more}${button}`
  );
}

/**
 * The table for a spreadsheet: for each place and step, how many features are reported as
 * available, as not available, and how many are unknown. Every row is written, cells are made
 * safe for spreadsheets, and lines end with CRLF.
 */
export function overviewToCsv(rows: readonly OverviewRow[], lang: Lang): string {
  const ui = STEPS_UI[lang];
  const kinds = [
    ['available', ui.csv.available],
    ['notAvailable', ui.csv.notAvailable],
    ['unknown', unknownWord(lang)],
  ] as const;
  const columns = [...STEP_IDS.map((id) => stepName(id, lang)), ui.colVisit];
  const head = [ui.colPlace, ...columns.flatMap((name) => kinds.map(([, label]) => fr(lang, `${name}${lang === 'fr' ? ' :' : ':'} ${label}`)))];
  const lines = rows.map((r) => [r.name, ...[...r.steps, r.visit].flatMap((c) => kinds.map(([key]) => String(c[key])))]);
  return `${[head, ...lines].map((cells) => cells.map(recordCell).join(',')).join('\r\n')}\r\n`;
}

export function overviewFilename(lang: Lang): string {
  return `visit-steps-by-place-${lang}.csv`;
}
