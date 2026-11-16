/**
 * Review of saved observations before a person submits them to OpenStreetMap.
 * Pure: the date comes in as an argument, nothing is read from the clock, and
 * nothing is sent anywhere. The review lists things to look at. It does not
 * say an observation is right, and it never changes a status.
 */
import { metresBetween, nearPairs, pointPlaces, precisionMetres } from './coords.js';
import { isAcceptedLicence, sourceKind } from './licence.js';
import { tagIssueText, tagIssues, tagsFor } from './tags.js';
import type { ReviewLang } from './text.js';
import { daysBetween, fill, formatMetres, isIsoDay, pick, plural } from './text.js';

export interface ReviewRecord {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  wheelchair: 'yes' | 'limited' | 'no' | 'UNKNOWN';
  source: string;
  licence: string;
  observedOn: string;
}

/** blocker: do not submit yet. check: look again. note: for information. */
export type Severity = 'blocker' | 'check' | 'note';

export type IssueCode =
  | 'licence-not-accepted'
  | 'source-missing'
  | 'date-invalid'
  | 'date-future'
  | 'position-invalid'
  | 'source-link'
  | 'source-not-own'
  | 'date-old'
  | 'position-coarse'
  | 'near-duplicate'
  | 'tag-problem'
  | 'status-unknown'
  | 'no-name';

export interface Issue {
  code: IssueCode;
  severity: Severity;
  /** Free values used when the text is built. */
  detail: Readonly<Record<string, string | number>>;
}

export const SEVERITY_ORDER: readonly Severity[] = ['blocker', 'check', 'note'];

export interface ReviewOptions {
  /** Today as YYYY-MM-DD, supplied by the caller. */
  today: string;
  /** Observations older than this many days get a "look again" note. Default 365. */
  oldAfterDays?: number;
  /** Positions closer than this many metres are listed as possible duplicates. Default 15. */
  duplicateMetres?: number;
  /** Fewer decimal places than this is a coarse position. Default 5 (about a metre). */
  minPlaces?: number;
}

export const DEFAULT_OLD_AFTER_DAYS = 365;
export const DEFAULT_DUPLICATE_METRES = 15;
export const DEFAULT_MIN_PLACES = 5;

const SEVERITY_OF: Record<IssueCode, Severity> = {
  'licence-not-accepted': 'blocker',
  'source-missing': 'blocker',
  'date-invalid': 'blocker',
  'date-future': 'blocker',
  'position-invalid': 'blocker',
  'tag-problem': 'blocker',
  'source-link': 'check',
  'source-not-own': 'check',
  'date-old': 'check',
  'position-coarse': 'check',
  'near-duplicate': 'check',
  'status-unknown': 'note',
  'no-name': 'note',
};

function issue(code: IssueCode, detail: Issue['detail'] = {}): Issue {
  return { code, severity: SEVERITY_OF[code], detail };
}

export interface RecordReview {
  id: string;
  issues: Issue[];
  /** True when the record has no blocker. It does not mean the record is right. */
  canSubmit: boolean;
}

export interface BatchReview {
  records: RecordReview[];
  counts: Record<Severity, number>;
  /** Records with no blocker. */
  readyCount: number;
  /** Records with at least one blocker. */
  blockedCount: number;
  /** Records with no blocker and at least one "look again" item. */
  lookAgainCount: number;
  /** True when there is at least one record and none has a blocker. */
  allReady: boolean;
}

function nearIssues(records: readonly ReviewRecord[], metres: number): Map<string, Issue[]> {
  const byId = new Map<string, Issue[]>();
  const add = (id: string, other: string, distance: number) => {
    const list = byId.get(id) ?? [];
    list.push(issue('near-duplicate', { other, metres: Math.round(distance) }));
    byId.set(id, list);
  };
  for (const pair of nearPairs(records, (r) => ({ lat: r.lat, lon: r.lon }), metres)) {
    add(pair.a.id, pair.b.id, pair.metres);
    add(pair.b.id, pair.a.id, pair.metres);
  }
  return byId;
}

/** Reviews one record on its own. Near-duplicate checks need the whole batch, so they live in reviewBatch. */
export function reviewRecord(record: ReviewRecord, options: ReviewOptions): Issue[] {
  const issues: Issue[] = [];
  const oldAfter = options.oldAfterDays ?? DEFAULT_OLD_AFTER_DAYS;
  const minPlaces = options.minPlaces ?? DEFAULT_MIN_PLACES;

  if (!isAcceptedLicence(record.licence)) issues.push(issue('licence-not-accepted', { value: record.licence }));

  const kind = sourceKind(record.source);
  if (kind === 'empty') issues.push(issue('source-missing'));
  else if (kind === 'link') issues.push(issue('source-link'));
  else if (kind === 'other') issues.push(issue('source-not-own'));

  if (!isIsoDay(record.observedOn)) {
    issues.push(issue('date-invalid', { value: record.observedOn }));
  } else {
    const age = daysBetween(record.observedOn, options.today);
    if (age !== null && age < 0) issues.push(issue('date-future', { date: record.observedOn }));
    else if (age !== null && age > oldAfter) issues.push(issue('date-old', { days: age }));
  }

  if (!Number.isFinite(record.lat) || !Number.isFinite(record.lon) || Math.abs(record.lat) > 90 || Math.abs(record.lon) > 180) {
    issues.push(issue('position-invalid'));
  } else {
    const places = pointPlaces(record);
    if (places < minPlaces) issues.push(issue('position-coarse', { places, metres: Math.round(precisionMetres(places)) }));
  }

  const tagProblems = tagIssues(Object.entries(tagsFor(record)));
  for (const problem of tagProblems) issues.push(issue('tag-problem', { code: problem.code, key: problem.key }));

  if (record.wheelchair === 'UNKNOWN') issues.push(issue('status-unknown'));
  if ((record.name ?? '').trim() === '') issues.push(issue('no-name'));

  return issues;
}

function rank(severity: Severity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

export function reviewBatch(records: readonly ReviewRecord[], options: ReviewOptions): BatchReview {
  const near = nearIssues(records, options.duplicateMetres ?? DEFAULT_DUPLICATE_METRES);
  const reviews: RecordReview[] = records.map((record) => {
    const issues = [...reviewRecord(record, options), ...(near.get(record.id) ?? [])];
    issues.sort((a, b) => rank(a.severity) - rank(b.severity));
    return { id: record.id, issues, canSubmit: !issues.some((i) => i.severity === 'blocker') };
  });
  const counts: Record<Severity, number> = { blocker: 0, check: 0, note: 0 };
  for (const review of reviews) for (const i of review.issues) counts[i.severity] += 1;
  const readyCount = reviews.filter((r) => r.canSubmit).length;
  const lookAgainCount = reviews.filter((r) => r.canSubmit && r.issues.some((i) => i.severity === 'check')).length;
  return {
    records: reviews,
    counts,
    readyCount,
    blockedCount: reviews.length - readyCount,
    lookAgainCount,
    allReady: reviews.length > 0 && readyCount === reviews.length,
  };
}

const TEXT: Record<ReviewLang, Record<Exclude<IssueCode, 'tag-problem'>, string>> = {
  en: {
    'licence-not-accepted': 'Licence "{value}" is not one the App accepts.',
    'source-missing': 'No source is given. Say where this observation comes from.',
    'date-invalid': 'The date "{value}" is not a real date.',
    'date-future': 'The observation date {date} is after today.',
    'position-invalid': 'The position is outside the range of latitude and longitude.',
    'source-link': 'The source is a web address, not your own visit. Do not copy from other maps, listings or photos you do not own.',
    'source-not-own': 'The source does not say it was your own visit. If it was, say so.',
    'date-old': 'This observation is {days} days old. Look again before you submit it.',
    'position-coarse': 'The position has {places} decimal places, which can be off by about {metres} m. Add more digits if you have them.',
    'near-duplicate': 'This place is {metres} m from place {other}. They may be the same place. Look before you submit both.',
    'status-unknown': 'The status is UNKNOWN. It stays UNKNOWN and no access tag is written.',
    'no-name': 'No name. That is fine. The place will have no name tag.',
  },
  fr: {
    'licence-not-accepted': 'La licence «\u00a0{value}\u00a0» n’est pas acceptée par l’application.',
    'source-missing': 'Aucune source n’est indiquée. Dites d’où vient cette observation.',
    'date-invalid': 'La date «\u00a0{value}\u00a0» n’est pas une vraie date.',
    'date-future': 'La date d’observation {date} est après aujourd’hui.',
    'position-invalid': 'La position est hors des limites de latitude et de longitude.',
    'source-link': 'La source est une adresse web, pas votre propre visite. Ne copiez pas d’autres cartes, annonces ou photos qui ne sont pas à vous.',
    'source-not-own': 'La source ne dit pas qu’il s’agit de votre visite. Si c’est le cas, dites-le.',
    'date-old': 'Cette observation date de {days} jours. Revoyez-la avant de la soumettre.',
    'position-coarse': 'La position a {places} décimales, ce qui peut donner une erreur d’environ {metres}\u00a0m. Ajoutez des chiffres si vous les avez.',
    'near-duplicate': 'Ce lieu est à {metres}\u00a0m du lieu {other}. Ce pourrait être le même. Regardez avant de soumettre les deux.',
    'status-unknown': 'Le statut est UNKNOWN. Il reste UNKNOWN et aucune balise d’accès n’est écrite.',
    'no-name': 'Pas de nom. Ce n’est pas un problème. Le lieu n’aura pas de balise de nom.',
  },
};

export function issueText(entry: Issue, lang: ReviewLang): string {
  if (entry.code === 'tag-problem') {
    return tagIssueText({ code: entry.detail.code as Parameters<typeof tagIssueText>[0]['code'], key: String(entry.detail.key ?? '') }, lang);
  }
  return fill(TEXT[lang][entry.code], entry.detail);
}

export const SEVERITY_LABEL: Record<ReviewLang, Record<Severity, string>> = {
  en: { blocker: 'Fix before submitting', check: 'Look again', note: 'For information' },
  fr: { blocker: 'À corriger avant de soumettre', check: 'À revoir', note: 'À titre d’information' },
};

export function summaryText(batch: BatchReview, lang: ReviewLang): string {
  const total = batch.records.length;
  if (total === 0) return pick(lang, 'There are no saved observations to review.', 'Il n’y a aucune observation enregistrée à passer en revue.');
  const places = plural(lang, total, pick(lang, 'observation', 'observation'), pick(lang, 'observations', 'observations'));
  return fill(
    pick(
      lang,
      '{total} {places}: {blocked} to fix before submitting, {again} to look at again, {rest} with nothing to fix.',
      '{total} {places}\u00a0: {blocked} à corriger avant de soumettre, {again} à revoir, {rest} sans rien à corriger.',
    ),
    { total, places, blocked: batch.blockedCount, again: batch.lookAgainCount, rest: batch.readyCount - batch.lookAgainCount },
  );
}

/** Distance between two reviewed records, for display next to a near-duplicate note. */
export function distanceBetween(a: ReviewRecord, b: ReviewRecord, lang: ReviewLang): string {
  return formatMetres(metresBetween(a, b), lang);
}

