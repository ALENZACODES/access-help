import { fixFrench } from './frTypography';
import { licenceLabel } from './licenceInfo';
import { featureName } from './mustHaves';
import {
  AGAINST_VALUES,
  MAX_SEEN_NOTE,
  SEEN_FILTERS,
  SEEN_VALUES,
  againstCounts,
  filterSeenRows,
  observationsOf,
  seenFieldOf,
  type Observation,
  type Observations,
  type Seen,
  type SeenDraft,
  type SeenField,
  type SeenFilter,
  type SeenOutcome,
  type SeenProblem,
  type SeenRow,
} from './observations';
import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { OPEN_LICENCES, isOpenLicence } from './provenance';
import { MAX_SOURCE_NAME } from './recordForm';
import { recordsToCsv } from './recordsCsv';
import type { FeatureClaim } from './status';
import { escapeHtml } from './text';

/**
 * The words and the markup for "What you saw": the form, the list beside the records, the lines
 * under a place, and the two ways to take the notes away from this device (as text, and as a
 * table of records that names the person as its source).
 */
export const SEEN_UI = {
  en: {
    heading: 'What you saw',
    intro: 'Keep your own notes of what you saw at a place. They stay on this device. They are not records and do not change the list.',
    formHeading: 'Add what you saw',
    legend: 'Your note',
    place: 'Place',
    choosePlace: 'Choose a place',
    feature: 'Feature',
    chooseFeature: 'Choose a feature',
    seen: 'What you saw there',
    chooseSeen: 'Choose one',
    seenNames: { there: 'It was there', 'not-there': 'It was not there', 'not-sure': 'I could not tell' },
    seenText: { there: 'it was there', 'not-there': 'it was not there', 'not-sure': 'you could not tell' },
    date: 'Day you saw it (year-month-day)',
    note: 'A few words, if you like',
    save: 'Save what I saw',
    noPlaces: 'Load places before you add what you saw.',
    pickFirst: 'Choose a place first.',
    invalid: (n: number): string => (n === 1 ? 'There is 1 thing to fix before this can be saved.' : `There are ${n} things to fix before this can be saved.`),
    problems: {
      'feature-missing': 'Choose a feature.',
      'seen-missing': 'Choose what you saw.',
      'date-invalid': 'Give a real date as year-month-day, such as 2026-06-01.',
      'date-in-future': 'The date cannot be after today.',
      'note-too-long': `Use ${MAX_SEEN_NOTE} characters or fewer for the note.`,
    },
    added: (place: string, feature: string): string => `Saved what you saw at ${place}: ${feature}.`,
    changed: (place: string, feature: string): string => `Changed what you saw at ${place}: ${feature}.`,
    same: 'You already have this note.',
    full: 'You have as many notes as this page keeps. Remove one before you add another.',
    removed: (place: string, feature: string): string => `Removed what you saw at ${place}: ${feature}.`,
    none: 'You have not added anything you saw.',
    count: (n: number): string => (n === 1 ? 'You have 1 note of what you saw.' : `You have ${n} notes of what you saw.`),
    notLoaded: (n: number): string => (n === 1 ? '1 more note is for a place that is not loaded now.' : `${n} more notes are for places that are not loaded now.`),
    line: (feature: string, seen: string, date: string): string => `${feature}: ${seen}. Seen on ${date}.`,
    noteLine: (note: string): string => `Your words: “${note}”.`,
    against: {
      same: 'The records say the same.',
      different: 'The records say something else.',
      'records-unknown': 'The records show this feature as Unknown.',
      'records-disagree': 'The sources in the records disagree about this feature.',
    },
    countsHeading: 'Your notes beside the records',
    countNames: {
      same: 'The records say the same',
      different: 'The records say something else',
      'records-unknown': 'The records show Unknown',
      'records-disagree': 'The sources in the records disagree',
      'not-compared': 'You could not tell',
    },
    filterLabel: 'Notes to list',
    filters: { all: 'Everything you saw', different: 'Only where the records say something else', 'records-unknown': 'Only where the records show Unknown' },
    filterEmpty: 'Nothing you saw matches this choice.',
    remove: 'Remove',
    removeLabel: (place: string, feature: string): string => `Remove what you saw at ${place}: ${feature}`,
    cardIntro: 'Your own notes, which are not records:',
    exportText: 'Save what you saw as text',
    title: 'What you saw',
    madeOn: (date: string): string => `Made on ${date}. These are a person’s own notes, not records.`,
    shareHeading: 'Share what you saw as a table of records',
    shareIntro: 'This makes a table that anyone can load as records. It names you as the source. Share only what you saw yourself.',
    shareName: 'Your name, or a name for the source',
    shareLicence: 'Licence you offer your notes under',
    chooseLicence: 'Choose a licence',
    share: 'Save the table',
    shareProblems: {
      'name-missing': 'Give a name for the source.',
      'name-too-long': `Use ${MAX_SOURCE_NAME} characters or fewer for the name.`,
      'licence-not-open': 'Choose an open licence from the list.',
      'nothing-to-share': 'There is nothing to share. Notes where you could not tell are left out.',
    },
    shared: (n: number): string => (n === 1 ? 'Saved a table with 1 record.' : `Saved a table with ${n} records.`),
  },
  fr: {
    heading: 'Ce que vous avez vu',
    intro: 'Gardez vos propres notes sur ce que vous avez vu dans un lieu. Elles restent sur cet appareil. Ce ne sont pas des fiches et elles ne changent pas la liste.',
    formHeading: 'Ajouter ce que vous avez vu',
    legend: 'Votre note',
    place: 'Lieu',
    choosePlace: 'Choisir un lieu',
    feature: 'Caractéristique',
    chooseFeature: 'Choisir une caractéristique',
    seen: 'Ce que vous avez vu sur place',
    chooseSeen: 'Choisir une réponse',
    seenNames: { there: 'C’était là', 'not-there': 'Ce n’était pas là', 'not-sure': 'Je n’ai pas pu le savoir' },
    seenText: { there: 'c’était là', 'not-there': 'ce n’était pas là', 'not-sure': 'vous n’avez pas pu le savoir' },
    date: 'Jour où vous l’avez vu (année-mois-jour)',
    note: 'Quelques mots, si vous voulez',
    save: 'Enregistrer ce que j’ai vu',
    noPlaces: 'Chargez des lieux avant d’ajouter ce que vous avez vu.',
    pickFirst: 'Choisissez d’abord un lieu.',
    invalid: (n: number): string => (n === 1 ? 'Il y a 1 élément à corriger avant l’enregistrement.' : `Il y a ${n} éléments à corriger avant l’enregistrement.`),
    problems: {
      'feature-missing': 'Choisissez une caractéristique.',
      'seen-missing': 'Choisissez ce que vous avez vu.',
      'date-invalid': 'Donnez une vraie date sous la forme année-mois-jour, par exemple 2026-06-01.',
      'date-in-future': 'La date ne peut pas être après aujourd’hui.',
      'note-too-long': `Utilisez ${MAX_SEEN_NOTE} caractères ou moins pour la note.`,
    },
    added: (place: string, feature: string): string => `Note enregistrée pour ${place}\u00a0: ${feature}.`,
    changed: (place: string, feature: string): string => `Note modifiée pour ${place}\u00a0: ${feature}.`,
    same: 'Vous avez déjà cette note.',
    full: 'Vous avez autant de notes que cette page en garde. Retirez-en une avant d’en ajouter une autre.',
    removed: (place: string, feature: string): string => `Note retirée pour ${place}\u00a0: ${feature}.`,
    none: 'Vous n’avez rien ajouté de ce que vous avez vu.',
    count: (n: number): string => (n === 1 ? 'Vous avez 1 note sur ce que vous avez vu.' : `Vous avez ${n} notes sur ce que vous avez vu.`),
    notLoaded: (n: number): string => (n === 1 ? '1 autre note concerne un lieu qui n’est pas chargé.' : `${n} autres notes concernent des lieux qui ne sont pas chargés.`),
    line: (feature: string, seen: string, date: string): string => `${feature}\u00a0: ${seen}. Vu le ${date}.`,
    noteLine: (note: string): string => `Vos mots\u00a0: «\u202f${note}\u202f».`,
    against: {
      same: 'Les fiches disent la même chose.',
      different: 'Les fiches disent autre chose.',
      'records-unknown': 'Les fiches indiquent UNKNOWN pour cette caractéristique.',
      'records-disagree': 'Les sources des fiches ne concordent pas pour cette caractéristique.',
    },
    countsHeading: 'Vos notes à côté des fiches',
    countNames: {
      same: 'Les fiches disent la même chose',
      different: 'Les fiches disent autre chose',
      'records-unknown': 'Les fiches indiquent UNKNOWN',
      'records-disagree': 'Les sources des fiches ne concordent pas',
      'not-compared': 'Vous n’avez pas pu le savoir',
    },
    filterLabel: 'Notes à afficher',
    filters: { all: 'Tout ce que vous avez vu', different: 'Seulement là où les fiches disent autre chose', 'records-unknown': 'Seulement là où les fiches indiquent UNKNOWN' },
    filterEmpty: 'Rien de ce que vous avez vu ne correspond à ce choix.',
    remove: 'Retirer',
    removeLabel: (place: string, feature: string): string => `Retirer la note pour ${place}\u00a0: ${feature}`,
    cardIntro: 'Vos propres notes, qui ne sont pas des fiches\u00a0:',
    exportText: 'Enregistrer ce que vous avez vu en texte',
    title: 'Ce que vous avez vu',
    madeOn: (date: string): string => `Créé le ${date}. Ce sont les notes d’une personne, pas des fiches.`,
    shareHeading: 'Partager ce que vous avez vu sous forme de tableau de fiches',
    shareIntro: 'Cela crée un tableau que chacun peut charger comme fiches. Il vous nomme comme source. Partagez seulement ce que vous avez vu vous-même.',
    shareName: 'Votre nom, ou un nom pour la source',
    shareLicence: 'Licence sous laquelle vous offrez vos notes',
    chooseLicence: 'Choisir une licence',
    share: 'Enregistrer le tableau',
    shareProblems: {
      'name-missing': 'Donnez un nom pour la source.',
      'name-too-long': `Utilisez ${MAX_SOURCE_NAME} caractères ou moins pour le nom.`,
      'licence-not-open': 'Choisissez une licence ouverte dans la liste.',
      'nothing-to-share': 'Il n’y a rien à partager. Les notes où vous n’avez pas pu le savoir sont laissées de côté.',
    },
    shared: (n: number): string => (n === 1 ? 'Tableau enregistré avec 1 fiche.' : `Tableau enregistré avec ${n} fiches.`),
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const SEEN_IDS = {
  place: 'gl-seen-place',
  termId: 'gl-seen-feature',
  seen: 'gl-seen-what',
  date: 'gl-seen-date',
  note: 'gl-seen-note',
  save: 'gl-seen-save',
  filter: 'gl-seen-filter',
  exportText: 'gl-seen-export',
  shareName: 'gl-seen-name',
  shareLicence: 'gl-seen-licence',
  share: 'gl-seen-share',
} as const;

const REMOVE_PREFIX = 'gl-seen-rm-';

export function seenRemoveId(index: number): string {
  return `${REMOVE_PREFIX}${index}`;
}

export function parseSeenRemoveId(id: string): number | null {
  if (!id.startsWith(REMOVE_PREFIX)) return null;
  const rest = id.slice(REMOVE_PREFIX.length);
  return /^\d{1,4}$/.test(rest) ? Number(rest) : null;
}

/** "Ramp: it was there. Seen on 2026-11-15." */
export function seenLine(observation: Pick<Observation, 'termId' | 'seen' | 'date'>, lang: Lang): string {
  const ui = SEEN_UI[lang];
  return fr(lang, ui.line(featureName(observation.termId, lang), ui.seenText[observation.seen], observation.date));
}

/** The line, the person's own words when there are any, and how the note stands against the records. */
export function seenRowText(row: SeenRow, lang: Lang): string {
  const ui = SEEN_UI[lang];
  const parts = [seenLine(row.observation, lang)];
  if (row.observation.note !== undefined) parts.push(fr(lang, ui.noteLine(row.observation.note)));
  if (row.against !== 'not-compared') parts.push(ui.against[row.against]);
  return parts.join(' ');
}

/** What to say after a note is saved. Nothing for a draft with problems: the form lists them. */
export function seenMessage(outcome: SeenOutcome, placeName: string, termId: string, lang: Lang): string {
  const ui = SEEN_UI[lang];
  if (outcome === 'added') return fr(lang, ui.added(placeName, featureName(termId, lang)));
  if (outcome === 'changed') return fr(lang, ui.changed(placeName, featureName(termId, lang)));
  if (outcome === 'same') return ui.same;
  if (outcome === 'full') return ui.full;
  if (outcome === 'no-place') return ui.pickFirst;
  return '';
}

export function seenRemovedMessage(placeName: string, termId: string, lang: Lang): string {
  return fr(lang, SEEN_UI[lang].removed(placeName, featureName(termId, lang)));
}

const option = (value: string, label: string, chosen: string): string => `<option value="${escapeHtml(value)}"${value === chosen ? ' selected' : ''}>${escapeHtml(label)}</option>`;
const labelFor = (id: string, text: string): string => `<label for="${id}">${escapeHtml(text)}</label>`;

export interface SeenFormView {
  readonly lang: Lang;
  readonly places: readonly Place[];
  /** The place the note is about, by position, or null when none is chosen. */
  readonly placeIndex: number | null;
  readonly draft: SeenDraft;
  readonly message?: string | undefined;
  readonly problems?: readonly SeenProblem[] | undefined;
}

/** The form: the place, the feature, what the person saw, the day, a few words, and the button. */
export function renderSeenForm(view: SeenFormView): string {
  const ui = SEEN_UI[view.lang];
  const head = `<h4>${escapeHtml(ui.formHeading)}</h4>`;
  if (view.places.length === 0) return `${head}<p class="gl-note">${escapeHtml(ui.noPlaces)}</p>`;
  const problems = view.problems ?? [];
  const bad = new Set(problems.map(seenFieldOf));
  const mark = (f: SeenField): string => (bad.has(f) ? ' aria-invalid="true" aria-describedby="gl-seen-errors"' : '');
  const d = view.draft;
  const chosenPlace = view.placeIndex !== null && view.places[view.placeIndex] !== undefined ? String(view.placeIndex) : '';
  const placeOptions = option('', ui.choosePlace, chosenPlace) + view.places.map((p, i) => option(String(i), p.name, chosenPlace)).join('');
  const features = option('', ui.chooseFeature, d.termId) + TERMS.map((t) => option(t.id, featureName(t.id, view.lang), d.termId)).join('');
  const seen = option('', ui.chooseSeen, d.seen) + SEEN_VALUES.map((s) => option(s, ui.seenNames[s], d.seen)).join('');
  const errors =
    problems.length === 0
      ? ''
      : `<div id="gl-seen-errors" role="alert"><p>${escapeHtml(ui.invalid(problems.length))}</p><ul>${problems.map((p) => `<li>${escapeHtml(ui.problems[p])}</li>`).join('')}</ul></div>`;
  const status = problems.length === 0 ? `<p role="status" data-gl-seen-msg>${escapeHtml(view.message ?? '')}</p>` : '';
  return (
    `${head}<fieldset class="gl-fieldset"><legend>${escapeHtml(ui.legend)}</legend>` +
    `${labelFor(SEEN_IDS.place, ui.place)}<select id="${SEEN_IDS.place}" class="gl-select">${placeOptions}</select>` +
    `${labelFor(SEEN_IDS.termId, ui.feature)}<select id="${SEEN_IDS.termId}" class="gl-select"${mark('termId')}>${features}</select>` +
    `${labelFor(SEEN_IDS.seen, ui.seen)}<select id="${SEEN_IDS.seen}" class="gl-select"${mark('seen')}>${seen}</select>` +
    `${labelFor(SEEN_IDS.date, ui.date)}<input type="text" id="${SEEN_IDS.date}" class="gl-input" maxlength="10" autocomplete="off" value="${escapeHtml(d.date)}"${mark('date')}>` +
    `${labelFor(SEEN_IDS.note, ui.note)}<input type="text" id="${SEEN_IDS.note}" class="gl-input" maxlength="${MAX_SEEN_NOTE * 2}" autocomplete="off" value="${escapeHtml(d.note)}"${mark('note')}>` +
    `${errors}${status}<div class="gl-actions"><button type="button" class="gl-btn" id="${SEEN_IDS.save}">${escapeHtml(ui.save)}</button></div></fieldset>`
  );
}

export interface SeenListView {
  readonly lang: Lang;
  /** Every row, before the choice of which to list. */
  readonly rows: readonly SeenRow[];
  readonly filter: SeenFilter;
  readonly notLoaded: number;
  readonly canExport: boolean;
}

/** How the notes stand against the records, as a short list. Lines with none are left out. */
export function renderSeenCounts(rows: readonly SeenRow[], lang: Lang): string {
  if (rows.length === 0) return '';
  const ui = SEEN_UI[lang];
  const counts = againstCounts(rows);
  const items = AGAINST_VALUES.filter((a) => counts[a] > 0).map((a) => `<li data-against="${a}">${escapeHtml(fr(lang, `${ui.countNames[a]}${lang === 'fr' ? ' :' : ':'} ${counts[a]}`))}</li>`);
  return `<h4>${escapeHtml(ui.countsHeading)}</h4><ul class="gl-seen-counts">${items.join('')}</ul>`;
}

/** The notes for the loaded places, each beside what the records say, with a button to remove it. */
export function renderSeenList(view: SeenListView): string {
  const ui = SEEN_UI[view.lang];
  const more = view.notLoaded > 0 ? `<p class="gl-note" data-gl-seen-more>${escapeHtml(ui.notLoaded(view.notLoaded))}</p>` : '';
  if (view.rows.length === 0) return `<p role="status">${escapeHtml(ui.none)}</p>${more}`;
  const shown = filterSeenRows(view.rows, view.filter);
  const filter =
    `${labelFor(SEEN_IDS.filter, ui.filterLabel)}<select id="${SEEN_IDS.filter}" class="gl-select">` +
    `${SEEN_FILTERS.map((f) => option(f, ui.filters[f], view.filter)).join('')}</select>`;
  const item = (row: SeenRow): string => {
    const feature = featureName(row.observation.termId, view.lang);
    return (
      `<li data-against="${row.against}" data-seen="${row.observation.seen}"><strong>${escapeHtml(row.placeName)}</strong> ` +
      `<span>${escapeHtml(seenRowText(row, view.lang))}</span>` +
      `<div class="gl-actions"><button type="button" class="gl-btn" id="${seenRemoveId(row.index)}" aria-label="${escapeHtml(fr(view.lang, ui.removeLabel(row.placeName, feature)))}">${escapeHtml(ui.remove)}</button></div></li>`
    );
  };
  const list = shown.length === 0 ? `<p class="gl-note">${escapeHtml(ui.filterEmpty)}</p>` : `<ul class="gl-seen-list">${shown.map(item).join('')}</ul>`;
  const save = view.canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${SEEN_IDS.exportText}">${escapeHtml(ui.exportText)}</button></div>` : '';
  return `<p role="status">${escapeHtml(ui.count(view.rows.length))}</p>${more}${renderSeenCounts(view.rows, view.lang)}${filter}${list}${save}`;
}

/** The person's notes for one place, under its card. Nothing when the person has none for it. */
export function renderSeenCard(list: Observations, placeId: string, lang: Lang): string {
  const own = observationsOf(list, placeId);
  if (own.length === 0) return '';
  const lines = own.map((o) => `<li data-seen="${o.seen}">${escapeHtml(seenLine(o, lang))}</li>`).join('');
  return `<div class="gl-seen"><p class="gl-note">${escapeHtml(SEEN_UI[lang].cardIntro)}</p><ul>${lines}</ul></div>`;
}

/** Plain text of every note for a loaded place, grouped by place. */
export function seenToText(rows: readonly SeenRow[], lang: Lang, today: string): string {
  const ui = SEEN_UI[lang];
  const lines = [`${ui.title} (${rows.length})`, ui.madeOn(today), ''];
  let last = -1;
  for (const row of rows) {
    if (row.placeIndex !== last) {
      if (last !== -1) lines.push('');
      lines.push(row.placeName);
      last = row.placeIndex;
    }
    lines.push(`- ${seenRowText(row, lang)}`);
  }
  return fr(lang, lines.join('\n') + '\n');
}

export function seenTextFilename(lang: Lang): string {
  return `what-you-saw-${lang}.txt`;
}

export const SEEN_RECORDS_FILENAME = 'what-you-saw-records.csv';

export type ShareProblem = 'name-missing' | 'name-too-long' | 'licence-not-open' | 'nothing-to-share';

const STATUS_OF: Readonly<Record<Exclude<Seen, 'not-sure'>, FeatureClaim['status']>> = { there: 'present', 'not-there': 'absent' };

export function cleanShareName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/**
 * The notes as places with records: one record per note, with the person as the source, the
 * licence the person chose, and the day the person saw it. A note where the person could not
 * tell makes no record, and nothing is given a tier. The person's own words are left out.
 */
export function seenAsRecords(rows: readonly SeenRow[], name: string, licence: string): readonly Place[] {
  const source = cleanShareName(name);
  const out: Place[] = [];
  const at = new Map<number, number>();
  for (const row of rows) {
    const seen = row.observation.seen;
    if (seen === 'not-sure') continue;
    const claim: FeatureClaim = { termId: row.observation.termId, status: STATUS_OF[seen], provenance: { source, licence, date: row.observation.date } };
    const held = at.get(row.placeIndex);
    if (held === undefined) {
      at.set(row.placeIndex, out.length);
      out.push({ id: row.observation.placeId, name: row.placeName, claims: [claim] });
    } else {
      const place = out[held] as Place;
      out[held] = { ...place, claims: [...place.claims, claim] };
    }
  }
  return out;
}

export function shareProblems(rows: readonly SeenRow[], name: string, licence: string): readonly ShareProblem[] {
  const out: ShareProblem[] = [];
  const source = cleanShareName(name);
  if (source === '') out.push('name-missing');
  else if (source.length > MAX_SOURCE_NAME) out.push('name-too-long');
  if (!isOpenLicence(licence)) out.push('licence-not-open');
  if (!rows.some((r) => r.observation.seen !== 'not-sure')) out.push('nothing-to-share');
  return out;
}

export interface ShareResult {
  readonly ok: boolean;
  readonly problems: readonly ShareProblem[];
  readonly csv: string;
  readonly records: number;
}

/** The table of records for the notes, or the reasons there is none. */
export function shareSeen(rows: readonly SeenRow[], name: string, licence: string): ShareResult {
  const problems = shareProblems(rows, name, licence);
  if (problems.length > 0) return { ok: false, problems, csv: '', records: 0 };
  const places = seenAsRecords(rows, name, licence);
  return { ok: true, problems: [], csv: recordsToCsv(places), records: places.reduce((n, p) => n + p.claims.length, 0) };
}

export interface SeenShareView {
  readonly lang: Lang;
  readonly rows: readonly SeenRow[];
  readonly name: string;
  readonly licence: string;
  readonly problems?: readonly ShareProblem[] | undefined;
  readonly message?: string | undefined;
}

/** The small form to save the notes as a table of records. Nothing when there are no notes. */
export function renderSeenShare(view: SeenShareView): string {
  if (view.rows.length === 0) return '';
  const ui = SEEN_UI[view.lang];
  const problems = view.problems ?? [];
  const nameBad = problems.includes('name-missing') || problems.includes('name-too-long');
  const licenceBad = problems.includes('licence-not-open');
  const mark = (bad: boolean): string => (bad ? ' aria-invalid="true" aria-describedby="gl-seen-share-errors"' : '');
  const licences = option('', ui.chooseLicence, view.licence) + OPEN_LICENCES.map((id) => option(id, licenceLabel(id), view.licence)).join('');
  const errors = problems.length === 0 ? '' : `<div id="gl-seen-share-errors" role="alert"><ul>${problems.map((p) => `<li>${escapeHtml(ui.shareProblems[p])}</li>`).join('')}</ul></div>`;
  const status = problems.length === 0 ? `<p role="status" data-gl-seen-share-msg>${escapeHtml(view.message ?? '')}</p>` : '';
  return (
    `<h4>${escapeHtml(ui.shareHeading)}</h4><p>${escapeHtml(ui.shareIntro)}</p>` +
    `${labelFor(SEEN_IDS.shareName, ui.shareName)}<input type="text" id="${SEEN_IDS.shareName}" class="gl-input" maxlength="${MAX_SOURCE_NAME * 2}" autocomplete="off" value="${escapeHtml(view.name)}"${mark(nameBad)}>` +
    `${labelFor(SEEN_IDS.shareLicence, ui.shareLicence)}<select id="${SEEN_IDS.shareLicence}" class="gl-select"${mark(licenceBad)}>${licences}</select>` +
    `${errors}${status}<div class="gl-actions"><button type="button" class="gl-btn" id="${SEEN_IDS.share}">${escapeHtml(ui.share)}</button></div>`
  );
}
