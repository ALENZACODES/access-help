import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { licenceLabel } from './licenceInfo';
import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { OPEN_LICENCES, isIsoDate, isOpenLicence, type Provenance } from './provenance';
import { EMITTED_TIERS, TIER_UI, effectiveTier, isTier } from './sourceTier';
import { statusLabel, type FeatureClaim } from './status';
import { escapeHtml, normalise } from './text';

/**
 * Adding one record by hand: a place, a feature, what a source reports, and the source itself.
 * A record cannot be added without a source, an open licence and a real date, so nothing typed
 * here can show as "reported" without saying who reported it. The person chooses a tier label or
 * none; only the tiers this version can show are offered.
 */
export interface RecordDraft {
  readonly placeName: string;
  readonly termId: string;
  /** 'present' or 'absent'. A record that says "unknown" claims nothing, so it is not offered. */
  readonly status: string;
  readonly source: string;
  readonly licence: string;
  readonly date: string;
  /** '' for no tier. */
  readonly tier: string;
}

export const EMPTY_DRAFT: RecordDraft = { placeName: '', termId: '', status: '', source: '', licence: '', date: '', tier: '' };

export const MAX_PLACE_NAME = 80;
export const MAX_SOURCE_NAME = 120;

export type DraftField = keyof RecordDraft;
export type DraftProblem =
  | 'name-missing'
  | 'name-too-long'
  | 'feature-missing'
  | 'status-missing'
  | 'source-missing'
  | 'source-too-long'
  | 'licence-not-open'
  | 'date-invalid'
  | 'date-in-future'
  | 'tier-not-offered';

const FIELD_OF: Readonly<Record<DraftProblem, DraftField>> = {
  'name-missing': 'placeName',
  'name-too-long': 'placeName',
  'feature-missing': 'termId',
  'status-missing': 'status',
  'source-missing': 'source',
  'source-too-long': 'source',
  'licence-not-open': 'licence',
  'date-invalid': 'date',
  'date-in-future': 'date',
  'tier-not-offered': 'tier',
};

export function fieldOf(problem: DraftProblem): DraftField {
  return FIELD_OF[problem];
}

const KNOWN_TERMS: ReadonlySet<string> = new Set(TERMS.map((t) => t.id));

/** Trims every field and joins runs of spaces in the two names. */
export function cleanDraft(d: RecordDraft): RecordDraft {
  const one = (s: string): string => s.replace(/\s+/g, ' ').trim();
  return { placeName: one(d.placeName), termId: d.termId.trim(), status: d.status.trim(), source: one(d.source), licence: d.licence.trim(), date: d.date.trim(), tier: d.tier.trim() };
}

/** Everything that stops the record being added, in the order of the form. Empty means it can be added. */
export function draftProblems(draft: RecordDraft, today: string): readonly DraftProblem[] {
  const d = cleanDraft(draft);
  const out: DraftProblem[] = [];
  if (d.placeName === '') out.push('name-missing');
  else if (Array.from(d.placeName).length > MAX_PLACE_NAME) out.push('name-too-long');
  if (!KNOWN_TERMS.has(d.termId)) out.push('feature-missing');
  if (d.status !== 'present' && d.status !== 'absent') out.push('status-missing');
  if (d.source === '') out.push('source-missing');
  else if (Array.from(d.source).length > MAX_SOURCE_NAME) out.push('source-too-long');
  if (!isOpenLicence(d.licence)) out.push('licence-not-open');
  if (!isIsoDate(d.date)) out.push('date-invalid');
  else if (d.date > today) out.push('date-in-future');
  if (d.tier !== '' && !(isTier(d.tier) && EMITTED_TIERS.includes(d.tier))) out.push('tier-not-offered');
  return out;
}

/** An id made from the name: lower case, no accents, dashes. A number is added when the id is taken. */
export function placeIdFor(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'place';
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export type AddOutcome = 'added' | 'added-place' | 'duplicate' | 'invalid';

export interface AddResult {
  readonly outcome: AddOutcome;
  readonly places: readonly Place[];
  /** The place the record belongs to. '' when nothing was added. */
  readonly placeId: string;
  readonly problems: readonly DraftProblem[];
}

function sameRecord(a: FeatureClaim, b: FeatureClaim): boolean {
  return (
    a.termId === b.termId &&
    a.status === b.status &&
    a.provenance?.source === b.provenance?.source &&
    a.provenance?.licence === b.provenance?.licence &&
    a.provenance?.date === b.provenance?.date &&
    (a.provenance?.tier ?? '') === (b.provenance?.tier ?? '')
  );
}

/**
 * Adds the record. A place with the same name (whatever the case or accents) gets the record;
 * otherwise a new place is added at the end. The same record is never added twice. The list
 * given is not changed.
 */
export function addRecord(places: readonly Place[], draft: RecordDraft, today: string): AddResult {
  const problems = draftProblems(draft, today);
  if (problems.length > 0) return { outcome: 'invalid', places, placeId: '', problems };
  const d = cleanDraft(draft);
  const provenance: Provenance = d.tier === '' ? { source: d.source, licence: d.licence, date: d.date } : { source: d.source, licence: d.licence, date: d.date, tier: d.tier };
  const claim: FeatureClaim = { termId: d.termId, status: d.status === 'present' ? 'present' : 'absent', provenance };
  const at = places.findIndex((p) => normalise(p.name) === normalise(d.placeName));
  const existing = places[at];
  if (existing === undefined) {
    const id = placeIdFor(d.placeName, new Set(places.map((p) => p.id)));
    return { outcome: 'added-place', places: [...places, { id, name: d.placeName, claims: [claim] }], placeId: id, problems: [] };
  }
  if (existing.claims.some((c) => sameRecord(c, claim))) return { outcome: 'duplicate', places, placeId: existing.id, problems: [] };
  const next = places.map((p, i) => (i === at ? { ...p, claims: [...p.claims, claim] } : p));
  return { outcome: 'added', places: next, placeId: existing.id, problems: [] };
}

/** The form filled in from a record that is held, to change it. A status of unknown and a tier that cannot be shown are left empty. */
export function draftFromRecord(place: Place, claim: FeatureClaim): RecordDraft {
  const p = claim.provenance;
  return {
    placeName: place.name,
    termId: claim.termId,
    status: claim.status === 'unknown' ? '' : claim.status,
    source: p?.source.trim() ?? '',
    licence: p?.licence.trim() ?? '',
    date: p?.date.trim() ?? '',
    tier: effectiveTier(p) ?? '',
  };
}

export type ReplaceOutcome = 'changed' | 'same' | 'duplicate' | 'invalid' | 'missing';

export interface ReplaceResult {
  readonly outcome: ReplaceOutcome;
  readonly places: readonly Place[];
  readonly problems: readonly DraftProblem[];
}

/**
 * Puts the record in the form in place of the record at `claimIndex` of the place at `placeIndex`.
 * The place and its name stay as they are: the name in the form is not used. The changed record
 * must pass the same rules as a new one. If the place already has that exact record elsewhere,
 * nothing changes, so a record is never there twice.
 */
export function replaceRecord(places: readonly Place[], placeIndex: number, claimIndex: number, draft: RecordDraft, today: string): ReplaceResult {
  const place = places[placeIndex];
  const old = place?.claims[claimIndex];
  if (place === undefined || old === undefined) return { outcome: 'missing', places, problems: [] };
  const d = cleanDraft({ ...draft, placeName: place.name });
  const problems = draftProblems(d, today);
  if (problems.length > 0) return { outcome: 'invalid', places, problems };
  const provenance: Provenance = d.tier === '' ? { source: d.source, licence: d.licence, date: d.date } : { source: d.source, licence: d.licence, date: d.date, tier: d.tier };
  const kept = old.provenance?.url;
  const claim: FeatureClaim = { termId: d.termId, status: d.status === 'present' ? 'present' : 'absent', provenance: kept === undefined ? provenance : { ...provenance, url: kept } };
  if (sameRecord(old, claim)) return { outcome: 'same', places, problems: [] };
  if (place.claims.some((c, i) => i !== claimIndex && sameRecord(c, claim))) return { outcome: 'duplicate', places, problems: [] };
  const next = places.map((p, i) => (i === placeIndex ? { ...p, claims: p.claims.map((c, j) => (j === claimIndex ? claim : c)) } : p));
  return { outcome: 'changed', places: next, problems: [] };
}

/** What to keep in the form after a record was added: the source, so several records can be typed in a row. */
export function nextDraft(d: RecordDraft): RecordDraft {
  const c = cleanDraft(d);
  return { ...EMPTY_DRAFT, placeName: c.placeName, source: c.source, licence: c.licence, date: c.date, tier: c.tier };
}

export const RECORDFORM_UI = {
  en: {
    heading: 'Add a record by hand',
    intro: 'Type what a source reports. A record needs a source, an open licence and a date.',
    legend: 'New record',
    placeName: 'Name of the place',
    feature: 'Feature',
    status: 'What the source reports',
    source: 'Name of the source',
    licence: 'Licence of the source',
    date: 'Date of the source',
    tier: 'Tier label',
    choose: 'Choose one',
    noTier: 'No tier',
    add: 'Add the record',
    editLegend: 'Change this record',
    save: 'Save the change',
    cancel: 'Cancel the change',
    changed: (place: string, feature: string): string => `Changed a record for ${place}: ${feature}.`,
    unchanged: 'The record is the same as before. Nothing was changed.',
    gone: 'That record is no longer there. Nothing was changed.',
    cancelled: 'The change was cancelled.',
    added: (place: string, feature: string): string => `Added a record for ${place}: ${feature}.`,
    addedPlace: (place: string, feature: string): string => `Added ${place} with a record: ${feature}.`,
    duplicate: (place: string): string => `${place} already has that record. Nothing was added.`,
    invalid: (n: number): string => (n === 1 ? 'The record was not added. Fix 1 thing:' : `The record was not added. Fix ${n} things:`),
    problems: {
      'name-missing': 'Type the name of the place.',
      'name-too-long': 'The name of the place is too long.',
      'feature-missing': 'Choose a feature.',
      'status-missing': 'Choose what the source reports.',
      'source-missing': 'Type the name of the source.',
      'source-too-long': 'The name of the source is too long.',
      'licence-not-open': 'Choose an open licence.',
      'date-invalid': 'Choose the date of the source.',
      'date-in-future': 'The date cannot be in the future.',
      'tier-not-offered': 'Choose a tier from the list, or no tier.',
    },
  },
  fr: {
    heading: 'Ajouter une fiche à la main',
    intro: 'Écrivez ce qu’une source signale. Une fiche demande une provenance, une licence ouverte et une date.',
    legend: 'Nouvelle fiche',
    placeName: 'Nom du lieu',
    feature: 'Caractéristique',
    status: 'Ce que la source signale',
    source: 'Nom de la provenance',
    licence: 'Licence de la provenance',
    date: 'Date de la provenance',
    tier: 'Étiquette de niveau',
    choose: 'Choisissez',
    noTier: 'Aucun niveau',
    add: 'Ajouter la fiche',
    editLegend: 'Modifier cette fiche',
    save: 'Enregistrer le changement',
    cancel: 'Annuler le changement',
    changed: (place: string, feature: string): string => `Fiche modifiée pour ${place}\u00a0: ${feature}.`,
    unchanged: 'La fiche est la même qu’avant. Rien n’a été changé.',
    gone: 'Cette fiche n’est plus là. Rien n’a été changé.',
    cancelled: 'Le changement a été annulé.',
    added: (place: string, feature: string): string => `Fiche ajoutée pour ${place}\u00a0: ${feature}.`,
    addedPlace: (place: string, feature: string): string => `${place} ajouté avec une fiche\u00a0: ${feature}.`,
    duplicate: (place: string): string => `${place} a déjà cette fiche. Rien n’a été ajouté.`,
    invalid: (n: number): string => (n === 1 ? 'La fiche n’a pas été ajoutée. Corrigez 1 chose\u00a0:' : `La fiche n’a pas été ajoutée. Corrigez ${n} choses\u00a0:`),
    problems: {
      'name-missing': 'Écrivez le nom du lieu.',
      'name-too-long': 'Le nom du lieu est trop long.',
      'feature-missing': 'Choisissez une caractéristique.',
      'status-missing': 'Choisissez ce que la source signale.',
      'source-missing': 'Écrivez le nom de la provenance.',
      'source-too-long': 'Le nom de la provenance est trop long.',
      'licence-not-open': 'Choisissez une licence ouverte.',
      'date-invalid': 'Choisissez la date de la provenance.',
      'date-in-future': 'La date ne peut pas être dans le futur.',
      'tier-not-offered': 'Choisissez un niveau de la liste, ou aucun niveau.',
    },
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** What to say after trying to change a record. */
export function replaceMessage(result: ReplaceResult, draft: RecordDraft, lang: Lang): string {
  const ui = RECORDFORM_UI[lang];
  const d = cleanDraft(draft);
  if (result.outcome === 'invalid') return ui.invalid(result.problems.length);
  if (result.outcome === 'same') return ui.unchanged;
  if (result.outcome === 'missing') return ui.gone;
  if (result.outcome === 'duplicate') return fr(lang, ui.duplicate(d.placeName));
  return fr(lang, ui.changed(d.placeName, lookupTerm(d.termId, lang).term));
}

export const RECORDFORM_CANCEL_ID = 'gl-rec-cancel';

/** What to say after trying to add a record. */
export function addMessage(result: AddResult, draft: RecordDraft, lang: Lang): string {
  const ui = RECORDFORM_UI[lang];
  const d = cleanDraft(draft);
  const feature = lookupTerm(d.termId, lang).term;
  if (result.outcome === 'invalid') return ui.invalid(result.problems.length);
  if (result.outcome === 'duplicate') return fr(lang, ui.duplicate(d.placeName));
  return fr(lang, result.outcome === 'added-place' ? ui.addedPlace(d.placeName, feature) : ui.added(d.placeName, feature));
}

export const RECORDFORM_IDS: Readonly<Record<DraftField | 'add', string>> = {
  placeName: 'gl-rec-name',
  termId: 'gl-rec-feature',
  status: 'gl-rec-status',
  source: 'gl-rec-source',
  licence: 'gl-rec-licence',
  date: 'gl-rec-date',
  tier: 'gl-rec-tier',
  add: 'gl-rec-add',
};

export const DRAFT_FIELDS: readonly DraftField[] = ['placeName', 'termId', 'status', 'source', 'licence', 'date', 'tier'];

function option(value: string, text: string, current: string): string {
  return `<option value="${escapeHtml(value)}"${value === current ? ' selected' : ''}>${escapeHtml(text)}</option>`;
}

/**
 * The form. Each control has a label; a control with a problem is marked invalid and points to
 * the list of problems, which is in an alert so it is read out when it appears. With `editing`,
 * the form changes a record that is held: the place name cannot be typed over, and there is a
 * button to cancel.
 */
export function renderRecordForm(lang: Lang, draft: RecordDraft = EMPTY_DRAFT, message = '', problems: readonly DraftProblem[] = [], editing = false): string {
  const ui = RECORDFORM_UI[lang];
  const bad = new Set(problems.map(fieldOf));
  const mark = (f: DraftField): string => (bad.has(f) ? ' aria-invalid="true" aria-describedby="gl-rec-errors"' : '');
  const label = (f: DraftField, text: string): string => `<label for="${RECORDFORM_IDS[f]}">${escapeHtml(text)}</label>`;
  const text = (f: DraftField, labelText: string, max: number): string =>
    `${label(f, labelText)}<input type="text" id="${RECORDFORM_IDS[f]}" class="gl-input" maxlength="${max}" autocomplete="off" value="${escapeHtml(draft[f])}"${f === 'placeName' && editing ? ' readonly' : ''}${mark(f)}>`;
  const select = (f: DraftField, labelText: string, options: string): string =>
    `${label(f, labelText)}<select id="${RECORDFORM_IDS[f]}" class="gl-select"${mark(f)}>${options}</select>`;
  const features = option('', ui.choose, draft.termId) + TERMS.map((t) => option(t.id, lookupTerm(t.id, lang).term, draft.termId)).join('');
  const statuses = option('', ui.choose, draft.status) + (['present', 'absent'] as const).map((s) => option(s, statusLabel(s, lang), draft.status)).join('');
  const licences = option('', ui.choose, draft.licence) + OPEN_LICENCES.map((id) => option(id, licenceLabel(id), draft.licence)).join('');
  const tiers = option('', ui.noTier, draft.tier) + EMITTED_TIERS.map((t) => option(t, TIER_UI[lang].names[t], draft.tier)).join('');
  const errors =
    problems.length === 0
      ? ''
      : `<div id="gl-rec-errors" role="alert"><p>${escapeHtml(fr(lang, ui.invalid(problems.length)))}</p><ul>${problems.map((p) => `<li>${escapeHtml(ui.problems[p])}</li>`).join('')}</ul></div>`;
  const status = problems.length === 0 ? `<p role="status" data-gl-recform-msg>${escapeHtml(message)}</p>` : '';
  return (
    `<h4>${escapeHtml(ui.heading)}</h4><p>${escapeHtml(ui.intro)}</p><fieldset class="gl-fieldset"><legend>${escapeHtml(editing ? ui.editLegend : ui.legend)}</legend>` +
    text('placeName', ui.placeName, MAX_PLACE_NAME) +
    select('termId', ui.feature, features) +
    select('status', ui.status, statuses) +
    text('source', ui.source, MAX_SOURCE_NAME) +
    select('licence', ui.licence, licences) +
    `${label('date', ui.date)}<input type="date" id="${RECORDFORM_IDS.date}" class="gl-input" value="${escapeHtml(draft.date)}"${mark('date')}>` +
    select('tier', ui.tier, tiers) +
    `${errors}<div class="gl-actions"><button type="button" class="gl-btn" id="${RECORDFORM_IDS.add}">${escapeHtml(editing ? ui.save : ui.add)}</button>` +
    `${editing ? `<button type="button" class="gl-btn" id="${RECORDFORM_CANCEL_ID}">${escapeHtml(ui.cancel)}</button>` : ''}</div>${status}</fieldset>`
  );
}
