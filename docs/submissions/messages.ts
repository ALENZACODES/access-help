/**
 * Wording for the submissions modules, in English and French. The wording says what the
 * person told the App. It never says a submission was received, accepted or checked, because
 * the App cannot see OpenStreetMap.
 */
import type { ChangesetFailure } from './changeset.js';
import type { EntryIssue, EntryIssueCode } from './ledger.js';
import type { FollowUp } from './follow-up.js';
import type { RestoreFailure } from './files.js';
import type { SubmissionStatus } from './ledger.js';
import { fill, pick, plural, type SubLang } from './text.js';

const ISSUE: Record<SubLang, Record<EntryIssueCode, string>> = {
  en: {
    'date-invalid': 'Enter a real date as YYYY-MM-DD.',
    'date-future': 'The date is after today. Enter the day you submitted.',
    'date-before-seen': 'The date is before the day you saw the place. Enter a day on or after it.',
    'date-before-marked': 'The date is before the day you marked it submitted.',
    'changeset-not-a-number': 'The changeset number should be digits only, such as 123456. You can leave it empty.',
    'changeset-too-long': 'The changeset number has too many digits.',
    'changeset-zero': 'The changeset number cannot be zero.',
    'note-too-long': 'The note is too long. Keep it under 200 characters.',
    'ledger-full': 'This device keeps up to 400 marks. Remove one first.',
  },
  fr: {
    'date-invalid': 'Entrez une vraie date sous la forme AAAA-MM-JJ.',
    'date-future': 'La date est après aujourd’hui. Entrez le jour où vous avez soumis.',
    'date-before-seen': 'La date est avant le jour où vous avez vu le lieu. Entrez un jour égal ou postérieur.',
    'date-before-marked': 'La date est avant le jour où vous l’avez marqué comme soumis.',
    'changeset-not-a-number': 'Le numéro de lot de modifications ne doit contenir que des chiffres, par exemple 123456. Vous pouvez le laisser vide.',
    'changeset-too-long': 'Le numéro de lot de modifications a trop de chiffres.',
    'changeset-zero': 'Le numéro de lot de modifications ne peut pas être zéro.',
    'note-too-long': 'La note est trop longue. Gardez-la sous 200 caractères.',
    'ledger-full': 'Cet appareil garde jusqu’à 400 marques. Retirez-en une d’abord.',
  },
};

export function entryIssueText(issue: EntryIssue, lang: SubLang): string {
  return ISSUE[lang][issue.code];
}

const CHANGESET: Record<SubLang, Record<Exclude<ChangesetFailure, 'empty'>, string>> = {
  en: { 'not-a-number': 'Not a changeset number.', 'too-long': 'Too many digits.', zero: 'Zero is not a changeset number.' },
  fr: { 'not-a-number': 'Pas un numéro de lot de modifications.', 'too-long': 'Trop de chiffres.', zero: 'Zéro n’est pas un numéro de lot de modifications.' },
};

export function changesetFailureText(code: Exclude<ChangesetFailure, 'empty'>, lang: SubLang): string {
  return CHANGESET[lang][code];
}

export function statusText(status: SubmissionStatus, lang: SubLang): string {
  return status === 'marked'
    ? pick(lang, 'You marked this as submitted', 'Vous l’avez marqué comme soumis')
    : pick(lang, 'Not marked as submitted', 'Non marqué comme soumis');
}

export function followUpText(item: FollowUp, lang: SubLang): string {
  const days = item.days;
  const unit = plural(lang, days, pick(lang, 'day', 'jour'), pick(lang, 'days', 'jours'));
  return item.reason === 'never-looked'
    ? fill(
        pick(
          lang,
          'You marked this {days} {unit} ago and have not noted a second look. You may want to look at the place on the map again.',
          'Vous l’avez marqué il y a {days} {unit} et n’avez pas noté de second regard. Vous voudrez peut-être revoir le lieu sur la carte.',
        ),
        { days, unit },
      )
    : fill(
        pick(
          lang,
          'You last looked at this {days} {unit} ago. You may want to look again.',
          'Vous l’avez revu pour la dernière fois il y a {days} {unit}. Vous voudrez peut-être le revoir.',
        ),
        { days, unit },
      );
}

const RESTORE: Record<SubLang, Record<RestoreFailure, string>> = {
  en: {
    'too-large': 'The file is larger than this device will read.',
    'not-json': 'The file is not valid JSON.',
    'wrong-shape': 'The file is not a backup from this screen.',
  },
  fr: {
    'too-large': 'Le fichier est plus gros que ce que cet appareil lira.',
    'not-json': 'Le fichier n’est pas du JSON valide.',
    'wrong-shape': 'Le fichier n’est pas une sauvegarde de cet écran.',
  },
};

export function restoreFailureText(code: RestoreFailure, lang: SubLang): string {
  return RESTORE[lang][code];
}

export function restoreSummaryText(added: number, replaced: number, skipped: number, dropped: number, lang: SubLang): string {
  return fill(
    pick(
      lang,
      'Restored: {added} added, {replaced} updated. {skipped} left out because the place is not saved here. {dropped} left out because they were not well formed.',
      'Restauré\u00a0: {added} ajoutées, {replaced} mises à jour. {skipped} laissées de côté parce que le lieu n’est pas enregistré ici. {dropped} laissées de côté parce qu’elles étaient mal formées.',
    ),
    { added, replaced, skipped, dropped },
  );
}
