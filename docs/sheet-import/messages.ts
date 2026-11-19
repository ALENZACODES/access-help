/** Words for sheet problems, row problems and the plan. Every string exists in English and French. */
import { MAX_SHEET_ROWS, type SheetFailure } from './csv.js';
import type { Field } from './headers.js';
import type { PlanAction, PlanCounts } from './plan.js';
import { MAX_NAME, MAX_SOURCE, type RowIssue, type RowNote } from './row.js';
import { colon, fill, joinList, pick, type PreLang } from '../presubmit/text.js';

export function fieldLabel(field: Field, lang: PreLang): string {
  switch (field) {
    case 'id':
      return pick(lang, 'id', 'identifiant');
    case 'name':
      return pick(lang, 'name', 'nom');
    case 'status':
      return pick(lang, 'status', 'état');
    case 'latitude':
      return 'latitude';
    case 'longitude':
      return 'longitude';
    case 'source':
      return 'source';
    case 'licence':
      return 'licence';
    case 'observedOn':
      return pick(lang, 'date seen', 'date d’observation');
  }
}

export function sheetFailureText(code: SheetFailure, lang: PreLang): string {
  switch (code) {
    case 'empty':
      return pick(lang, 'The sheet is empty.', 'La feuille est vide.');
    case 'too-large':
      return pick(lang, 'The sheet is too large for this screen. Split it into smaller files.', 'La feuille est trop grande pour cet écran. Divisez-la en fichiers plus petits.');
    case 'too-many-rows':
      return fill(pick(lang, 'The sheet has more than {max} lines of places. Split it into smaller files.', 'La feuille compte plus de {max} lignes de lieux. Divisez-la en fichiers plus petits.'), { max: MAX_SHEET_ROWS });
    case 'unclosed-quote':
      return pick(lang, 'A quotation mark in the sheet is never closed. Save the sheet as CSV again.', 'Un guillemet de la feuille n’est jamais fermé. Enregistrez de nouveau la feuille en CSV.');
    case 'no-rows':
      return pick(lang, 'The sheet has a first line of column names and no places under it.', 'La feuille a une première ligne de noms de colonnes et aucun lieu dessous.');
  }
}

export function missingColumnsText(missing: readonly Field[], lang: PreLang): string {
  const names = joinList(missing.map((field) => fieldLabel(field, lang)), lang);
  return fill(
    pick(
      lang,
      'The sheet has no column for {names}. Every place needs a source, a licence, a date and coordinates.',
      'La feuille n’a pas de colonne pour {names}. Chaque lieu a besoin d’une source, d’une licence, d’une date et de coordonnées.',
    ),
    { names },
  );
}

export function unkeptColumnsText(unkept: readonly string[], lang: PreLang): string {
  if (unkept.length === 0) return '';
  return `${pick(lang, 'Columns that are not kept', 'Colonnes non conservées')}${colon(lang)}${joinList([...unkept], lang)}.`;
}

export function repeatedColumnsText(repeated: readonly string[], lang: PreLang): string {
  if (repeated.length === 0) return '';
  return `${pick(lang, 'Columns that repeat an earlier one and are not read', 'Colonnes qui répètent une colonne précédente et ne sont pas lues')}${colon(lang)}${joinList([...repeated], lang)}.`;
}

export function tierNoteText(hasTier: boolean, lang: PreLang): string {
  return hasTier
    ? pick(
        lang,
        'The sheet has a tier column. A saved observation carries no tier, so that column is not kept and the tier stays UNKNOWN.',
        'La feuille a une colonne de niveau. Une observation enregistrée ne porte pas de niveau, donc cette colonne n’est pas conservée et le niveau reste UNKNOWN.',
      )
    : pick(
        lang,
        'A saved observation carries no tier. The tier of each place stays UNKNOWN.',
        'Une observation enregistrée ne porte pas de niveau. Le niveau de chaque lieu reste UNKNOWN.',
      );
}

export function rowIssueText(issue: RowIssue, lang: PreLang): string {
  switch (issue.code) {
    case 'lat-missing':
      return pick(lang, 'The latitude is empty.', 'La latitude est vide.');
    case 'lat-invalid':
      return pick(lang, 'The latitude is not a number between -90 and 90.', 'La latitude n’est pas un nombre entre -90 et 90.');
    case 'lon-missing':
      return pick(lang, 'The longitude is empty.', 'La longitude est vide.');
    case 'lon-invalid':
      return pick(lang, 'The longitude is not a number between -180 and 180.', 'La longitude n’est pas un nombre entre -180 et 180.');
    case 'source-missing':
      return pick(lang, 'The source is empty. Say how you know this.', 'La source est vide. Dites comment vous le savez.');
    case 'source-too-long':
      return fill(pick(lang, 'The source is longer than {max} characters.', 'La source compte plus de {max} caractères.'), { max: MAX_SOURCE });
    case 'licence-missing':
      return pick(lang, 'The licence is empty. Use CC0-1.0 or ODbL-1.0.', 'La licence est vide. Utilisez CC0-1.0 ou ODbL-1.0.');
    case 'licence-not-open':
      return pick(lang, 'The licence is not CC0-1.0 or ODbL-1.0.', 'La licence n’est ni CC0-1.0 ni ODbL-1.0.');
    case 'date-missing':
      return pick(lang, 'The date seen is empty.', 'La date d’observation est vide.');
    case 'date-invalid':
      return pick(lang, 'The date seen is not a real day. Use YYYY-MM-DD.', 'La date d’observation n’est pas un vrai jour. Utilisez AAAA-MM-JJ.');
    case 'date-future':
      return pick(lang, 'The date seen is after today.', 'La date d’observation est après aujourd’hui.');
    case 'name-too-long':
      return fill(pick(lang, 'The name is longer than {max} characters.', 'Le nom compte plus de {max} caractères.'), { max: MAX_NAME });
    case 'id-invalid':
      return pick(lang, 'The id may hold only letters, digits, dots, dashes, underscores and colons, up to 64 characters.', 'L’identifiant ne peut contenir que des lettres, des chiffres, des points, des tirets, des traits de soulignement et des deux-points, jusqu’à 64 caractères.');
    case 'id-repeated':
      return pick(lang, 'An earlier line of the sheet has the same id.', 'Une ligne précédente de la feuille a le même identifiant.');
  }
}

export function rowNoteText(note: RowNote, lang: PreLang): string {
  switch (note.code) {
    case 'status-empty':
      return pick(lang, 'The status is empty, so it is kept as UNKNOWN.', 'L’état est vide, donc il est conservé comme UNKNOWN.');
    case 'status-unrecognised':
      return fill(
        pick(lang, 'The status “{value}” is not yes, limited, no or unknown, so it is kept as UNKNOWN.', 'L’état «\u202f{value}\u202f» n’est pas oui, limité, non ou inconnu, donc il est conservé comme UNKNOWN.'),
        { value: note.value ?? '' },
      );
    case 'id-made':
      return pick(lang, 'The line has no id, so one is made for it.', 'La ligne n’a pas d’identifiant, donc un identifiant est créé.');
  }
}

export function actionLabel(action: PlanAction | 'rejected', lang: PreLang): string {
  switch (action) {
    case 'add':
      return pick(lang, 'Will be added', 'Sera ajouté');
    case 'replace':
      return pick(lang, 'Will replace a saved observation', 'Remplacera une observation enregistrée');
    case 'same':
      return pick(lang, 'Already saved, no change', 'Déjà enregistré, aucun changement');
    case 'over-limit':
      return pick(lang, 'Not added: the device list is full', 'Non ajouté\u00a0: la liste de l’appareil est pleine');
    case 'rejected':
      return pick(lang, 'Not brought in', 'Non importé');
  }
}

export function planSummaryText(counts: PlanCounts, lang: PreLang): string {
  const part = (en: string, fr: string, n: number) => `${pick(lang, en, fr)}${colon(lang)}${n}.`;
  const parts = [
    part('Lines read', 'Lignes lues', counts.rows),
    part('To add', 'À ajouter', counts.add),
    part('To replace', 'À remplacer', counts.replace),
    part('Already saved', 'Déjà enregistrées', counts.same),
    part('With a problem', 'Avec un problème', counts.rejected),
  ];
  if (counts.overLimit > 0) parts.push(part('Over the device limit', 'Au-delà de la limite de l’appareil', counts.overLimit));
  parts.push(pick(lang, 'Nothing is saved until you confirm, and nothing is uploaded.', 'Rien n’est enregistré avant votre confirmation, et rien n’est envoyé.'));
  return parts.join(' ');
}

export function provenanceLine(record: { source: string; licence: string; observedOn: string }, lang: PreLang): string {
  return fill(
    pick(lang, 'Source: {source}. Licence: {licence}. Seen on {date}. Tier: UNKNOWN.', 'Source\u00a0: {source}. Licence\u00a0: {licence}. Vu le {date}. Niveau\u00a0: UNKNOWN.'),
    { source: record.source, licence: record.licence, date: record.observedOn },
  );
}
