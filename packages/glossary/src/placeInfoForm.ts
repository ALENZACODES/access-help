import { fixFrench } from './frTypography';
import { licenceLabel } from './licenceInfo';
import { MAX_AREA_LENGTH, PLACEINFO_UI, PLACE_KINDS, cleanArea, infoKey, isPlaceKind, withInfo } from './placeInfo';
import type { Place, PlaceInfo } from './places';
import type { Lang } from './plainTerms';
import { OPEN_LICENCES, validateProvenance, type Provenance } from './provenance';
import { MAX_SOURCE_NAME } from './recordForm';
import { EMITTED_TIERS, TIER_UI, isTier } from './sourceTier';
import { escapeHtml } from './text';

/**
 * A small form to say what kind of place something is and what area it is in. The kind and area
 * need the same things as a record: a source, an open licence and a real date that is not in the
 * future. Without them nothing is saved, so the list never shows a kind or an area that nobody
 * can trace. The form can also take the kind and area away again.
 */
export interface InfoDraft {
  readonly kind: string;
  readonly area: string;
  readonly source: string;
  readonly licence: string;
  readonly date: string;
  readonly tier: string;
}

export const EMPTY_INFO_DRAFT: InfoDraft = { kind: '', area: '', source: '', licence: '', date: '', tier: '' };
export const INFO_FIELDS = ['kind', 'area', 'source', 'licence', 'date', 'tier'] as const;
export type InfoField = (typeof INFO_FIELDS)[number];

export type InfoProblem = 'nothing-given' | 'kind-not-known' | 'area-too-long' | 'source-missing' | 'source-too-long' | 'licence-not-open' | 'date-invalid' | 'date-in-future' | 'tier-not-known';

export function infoFieldOf(problem: InfoProblem): InfoField {
  if (problem === 'nothing-given' || problem === 'kind-not-known') return 'kind';
  if (problem === 'area-too-long') return 'area';
  if (problem === 'source-missing' || problem === 'source-too-long') return 'source';
  if (problem === 'licence-not-open') return 'licence';
  return problem === 'tier-not-known' ? 'tier' : 'date';
}

/** The draft with spaces tidied. The area is not cut here, so a long one is reported, not shortened. */
export function cleanInfoDraft(d: InfoDraft): InfoDraft {
  const tidy = (s: string): string => s.replace(/\s+/g, ' ').trim();
  return { kind: d.kind.trim(), area: tidy(d.area), source: tidy(d.source), licence: d.licence.trim(), date: d.date.trim(), tier: d.tier.trim() };
}

/** Everything that stops the draft from being saved, in the order of the form. */
export function infoDraftProblems(draft: InfoDraft, today: string): readonly InfoProblem[] {
  const d = cleanInfoDraft(draft);
  const out: InfoProblem[] = [];
  if (d.kind === '' && d.area === '') out.push('nothing-given');
  if (d.kind !== '' && !isPlaceKind(d.kind)) out.push('kind-not-known');
  if (Array.from(d.area).length > MAX_AREA_LENGTH) out.push('area-too-long');
  if (Array.from(d.source).length > MAX_SOURCE_NAME) out.push('source-too-long');
  for (const issue of validateProvenance({ source: d.source, licence: d.licence, date: d.date }, today)) {
    if (issue === 'source-missing' || issue === 'licence-not-open' || issue === 'date-invalid' || issue === 'date-in-future') out.push(issue);
  }
  if (d.tier !== '' && !(isTier(d.tier) && EMITTED_TIERS.includes(d.tier))) out.push('tier-not-known');
  return out;
}

/** The info a clean, valid draft stands for. */
export function infoFromDraft(draft: InfoDraft): PlaceInfo {
  const d = cleanInfoDraft(draft);
  const provenance: Provenance = { source: d.source, licence: d.licence, date: d.date, ...(d.tier === '' ? {} : { tier: d.tier }) };
  return { ...(d.kind === '' ? {} : { kind: d.kind }), ...(d.area === '' ? {} : { area: cleanArea(d.area) }), provenance };
}

/** The draft that shows what a place holds now, or an empty draft when it holds nothing. */
export function draftFromInfo(info: PlaceInfo | undefined): InfoDraft {
  if (info === undefined) return EMPTY_INFO_DRAFT;
  const p = info.provenance;
  return { kind: info.kind ?? '', area: info.area ?? '', source: p?.source ?? '', licence: p?.licence ?? '', date: p?.date ?? '', tier: typeof p?.tier === 'string' ? p.tier : '' };
}

export type InfoOutcome = 'saved' | 'same' | 'invalid' | 'missing' | 'removed' | 'nothing-to-remove';

export interface InfoResult {
  readonly outcome: InfoOutcome;
  readonly places: readonly Place[];
  readonly problems: readonly InfoProblem[];
}

/** Sets the kind and area of one place. The places are returned as they were unless the outcome is "saved". */
export function setPlaceInfo(places: readonly Place[], index: number, draft: InfoDraft, today: string): InfoResult {
  const place = places[index];
  if (place === undefined) return { outcome: 'missing', places, problems: [] };
  const problems = infoDraftProblems(draft, today);
  if (problems.length > 0) return { outcome: 'invalid', places, problems };
  const info = infoFromDraft(draft);
  if (infoKey(info) === infoKey(place.info)) return { outcome: 'same', places, problems: [] };
  return { outcome: 'saved', places: places.map((p, i) => (i === index ? withInfo(p, info) : p)), problems: [] };
}

/** Takes the kind and area of one place away. */
export function removePlaceInfo(places: readonly Place[], index: number): InfoResult {
  const place = places[index];
  if (place === undefined) return { outcome: 'missing', places, problems: [] };
  if (place.info === undefined) return { outcome: 'nothing-to-remove', places, problems: [] };
  return { outcome: 'removed', places: places.map((p, i) => (i === index ? withInfo(p, undefined) : p)), problems: [] };
}

export const INFOFORM_UI = {
  en: {
    heading: 'Set the kind and area of a place',
    intro: 'Say what kind of place it is and where it is. Like a record, this needs a source, an open licence and a date.',
    legend: 'Kind and area',
    place: 'Place',
    choosePlace: 'Choose a place',
    kind: 'Kind of place',
    noKind: 'Not given',
    area: 'Area, such as a town or a neighbourhood',
    source: 'Source of the kind and area',
    licence: 'Licence of the source',
    chooseLicence: 'Choose a licence',
    date: 'Date of the source, as year-month-day',
    tier: 'Tier of the source',
    noTier: 'No tier',
    save: 'Save the kind and area',
    remove: 'Remove the kind and area',
    noPlaces: 'Add a place before you set its kind and area.',
    pickFirst: 'Choose a place first.',
    invalid: (n: number): string => (n === 1 ? 'There is 1 thing to fix before this can be saved.' : `There are ${n} things to fix before this can be saved.`),
    problems: {
      'nothing-given': 'Give a kind of place, an area, or both.',
      'kind-not-known': 'Choose a kind of place from the list.',
      'area-too-long': 'The area is too long. Use 60 characters or fewer.',
      'source-missing': 'Name the source of the kind and area.',
      'source-too-long': 'The name of the source is too long.',
      'licence-not-open': 'Choose an open licence from the list.',
      'date-invalid': 'Give a real date as year-month-day, such as 2026-06-01.',
      'date-in-future': 'The date cannot be after today.',
      'tier-not-known': 'Choose a tier from the list, or no tier.',
    },
    saved: (name: string): string => `Saved the kind and area of ${name}.`,
    same: 'The place already has this kind and area.',
    removed: (name: string): string => `Removed the kind and area of ${name}.`,
    nothingToRemove: 'This place has no kind or area to remove.',
  },
  fr: {
    heading: 'Indiquer le type et le secteur d’un lieu',
    intro: 'Dites de quel type de lieu il s’agit et où il se trouve. Comme une fiche, cela demande une source, une licence ouverte et une date.',
    legend: 'Type et secteur',
    place: 'Lieu',
    choosePlace: 'Choisissez un lieu',
    kind: 'Type de lieu',
    noKind: 'Non indiqué',
    area: 'Secteur, par exemple une ville ou un quartier',
    source: 'Source du type et du secteur',
    licence: 'Licence de la source',
    chooseLicence: 'Choisissez une licence',
    date: 'Date de la source, sous la forme année-mois-jour',
    tier: 'Niveau de la source',
    noTier: 'Aucun niveau',
    save: 'Enregistrer le type et le secteur',
    remove: 'Retirer le type et le secteur',
    noPlaces: 'Ajoutez un lieu avant d’indiquer son type et son secteur.',
    pickFirst: 'Choisissez d’abord un lieu.',
    invalid: (n: number): string => (n === 1 ? 'Il y a 1 élément à corriger avant l’enregistrement.' : `Il y a ${n} éléments à corriger avant l’enregistrement.`),
    problems: {
      'nothing-given': 'Indiquez un type de lieu, un secteur, ou les deux.',
      'kind-not-known': 'Choisissez un type de lieu dans la liste.',
      'area-too-long': 'Le secteur est trop long. Utilisez 60 caractères ou moins.',
      'source-missing': 'Nommez la source du type et du secteur.',
      'source-too-long': 'Le nom de la source est trop long.',
      'licence-not-open': 'Choisissez une licence ouverte dans la liste.',
      'date-invalid': 'Donnez une vraie date sous la forme année-mois-jour, par exemple 2026-06-01.',
      'date-in-future': 'La date ne peut pas être après aujourd’hui.',
      'tier-not-known': 'Choisissez un niveau dans la liste, ou aucun niveau.',
    },
    saved: (name: string): string => `Type et secteur enregistrés pour ${name}.`,
    same: 'Le lieu a déjà ce type et ce secteur.',
    removed: (name: string): string => `Type et secteur retirés pour ${name}.`,
    nothingToRemove: 'Ce lieu n’a ni type ni secteur à retirer.',
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const INFOFORM_IDS = {
  place: 'gl-pi-place',
  kind: 'gl-pi-kind',
  area: 'gl-pi-area',
  source: 'gl-pi-source',
  licence: 'gl-pi-licence',
  date: 'gl-pi-date',
  tier: 'gl-pi-tier',
  save: 'gl-pi-save',
  remove: 'gl-pi-remove',
} as const;

/** What to say after the form was used. Empty for an invalid draft: the list of things to fix says it. */
export function infoMessage(result: InfoResult, placeName: string, lang: Lang): string {
  const ui = INFOFORM_UI[lang];
  switch (result.outcome) {
    case 'saved':
      return fr(lang, ui.saved(placeName));
    case 'same':
      return ui.same;
    case 'removed':
      return fr(lang, ui.removed(placeName));
    case 'nothing-to-remove':
      return ui.nothingToRemove;
    case 'missing':
      return ui.pickFirst;
    default:
      return '';
  }
}

export interface InfoFormView {
  readonly lang: Lang;
  readonly places: readonly Place[];
  /** The place the form is about, by position, or null when none is chosen. */
  readonly placeIndex: number | null;
  readonly draft: InfoDraft;
  readonly message?: string | undefined;
  readonly problems?: readonly InfoProblem[] | undefined;
}

/** The form: the place, its kind and area, the source, licence, date and tier, and the two buttons. */
export function renderInfoForm(view: InfoFormView): string {
  const ui = INFOFORM_UI[view.lang];
  const head = `<h4>${escapeHtml(ui.heading)}</h4><p>${escapeHtml(ui.intro)}</p>`;
  if (view.places.length === 0) return `${head}<p class="gl-note">${escapeHtml(ui.noPlaces)}</p>`;
  const problems = view.problems ?? [];
  const bad = new Set(problems.map(infoFieldOf));
  const mark = (f: InfoField): string => (bad.has(f) ? ' aria-invalid="true" aria-describedby="gl-pi-errors"' : '');
  const option = (value: string, label: string, chosen: string): string => `<option value="${escapeHtml(value)}"${value === chosen ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  const d = view.draft;
  const chosenPlace = view.placeIndex !== null && view.places[view.placeIndex] !== undefined ? String(view.placeIndex) : '';
  const placeOptions = option('', ui.choosePlace, chosenPlace) + view.places.map((p, i) => option(String(i), p.name, chosenPlace)).join('');
  const kinds = option('', ui.noKind, d.kind) + PLACE_KINDS.map((k) => option(k, PLACEINFO_UI[view.lang].kinds[k], d.kind)).join('');
  const licences = option('', ui.chooseLicence, d.licence) + OPEN_LICENCES.map((id) => option(id, licenceLabel(id), d.licence)).join('');
  const tiers = option('', ui.noTier, d.tier) + EMITTED_TIERS.map((t) => option(t, TIER_UI[view.lang].names[t], d.tier)).join('');
  const label = (id: string, text: string): string => `<label for="${id}">${escapeHtml(text)}</label>`;
  const input = (f: 'area' | 'source' | 'date', text: string, max: number): string =>
    `${label(INFOFORM_IDS[f], text)}<input type="text" id="${INFOFORM_IDS[f]}" class="gl-input" maxlength="${max}" autocomplete="off" value="${escapeHtml(d[f])}"${mark(f)}>`;
  const select = (f: 'kind' | 'licence' | 'tier', text: string, options: string): string =>
    `${label(INFOFORM_IDS[f], text)}<select id="${INFOFORM_IDS[f]}" class="gl-select"${mark(f)}>${options}</select>`;
  const errors =
    problems.length === 0
      ? ''
      : `<div id="gl-pi-errors" role="alert"><p>${escapeHtml(fr(view.lang, ui.invalid(problems.length)))}</p><ul>${problems.map((p) => `<li>${escapeHtml(ui.problems[p])}</li>`).join('')}</ul></div>`;
  const status = problems.length === 0 ? `<p role="status" data-gl-pi-msg>${escapeHtml(view.message ?? '')}</p>` : '';
  const hasInfo = view.placeIndex !== null && view.places[view.placeIndex]?.info !== undefined;
  const remove = hasInfo ? `<button type="button" class="gl-btn" id="${INFOFORM_IDS.remove}">${escapeHtml(ui.remove)}</button>` : '';
  return (
    `${head}<fieldset class="gl-fieldset"><legend>${escapeHtml(ui.legend)}</legend>` +
    `${label(INFOFORM_IDS.place, ui.place)}<select id="${INFOFORM_IDS.place}" class="gl-select">${placeOptions}</select>` +
    select('kind', ui.kind, kinds) +
    input('area', ui.area, MAX_AREA_LENGTH * 2) +
    input('source', ui.source, MAX_SOURCE_NAME) +
    select('licence', ui.licence, licences) +
    input('date', ui.date, 10) +
    select('tier', ui.tier, tiers) +
    `${errors}${status}<div class="gl-actions"><button type="button" class="gl-btn" id="${INFOFORM_IDS.save}">${escapeHtml(ui.save)}</button>${remove}</div></fieldset>`
  );
}
