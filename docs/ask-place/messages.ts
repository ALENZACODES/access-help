/** Words for the asking page: channels, statuses, counts and the comparison. English and French. */
import type { FactCompare, FactRow } from './compare.js';
import { compareCounts, stillOpen } from './compare.js';
import { SHORT_MESSAGE_MAX, type Channel, type Letter, type LetterLanguage } from './letter.js';
import { MAX_ASKS_PER_PLACE, daysWaiting, type AskCounts, type AskEntry, type AskIssue, type AskStatus } from './log.js';
import { questionShort } from './questions.js';
import { formatCm } from '../place-measures/index.js';
import { colon, fill, joinList, pick, plural, type PreLang } from '../presubmit/text.js';

export function channelLabel(channel: Channel, lang: PreLang): string {
  switch (channel) {
    case 'email':
      return pick(lang, 'Email', 'Courriel');
    case 'message':
      return pick(lang, 'Short message or contact form', 'Message court ou formulaire de contact');
    case 'phone':
      return pick(lang, 'Phone call', 'Appel téléphonique');
    case 'in-person':
      return pick(lang, 'In person', 'En personne');
  }
}

export function letterLanguageLabel(language: LetterLanguage, lang: PreLang): string {
  switch (language) {
    case 'en':
      return pick(lang, 'English', 'Anglais');
    case 'fr':
      return pick(lang, 'French', 'Français');
    case 'both':
      return pick(lang, 'English and French', 'Anglais et français');
  }
}

export function statusLabel(status: AskStatus, lang: PreLang): string {
  switch (status) {
    case 'waiting':
      return pick(lang, 'Waiting for an answer', 'En attente d’une réponse');
    case 'answered':
      return pick(lang, 'You said it was answered', 'Vous avez dit avoir reçu une réponse');
    case 'no-reply':
      return pick(lang, 'Closed with no reply', 'Fermée sans réponse');
  }
}

/** One ask as a sentence: when, how, what was asked and where it stands. */
export function askLine(entry: AskEntry, today: string, lang: PreLang): string {
  const c = colon(lang);
  const asked = fill(pick(lang, 'Asked on {day}', 'Demandé le {day}'), { day: entry.askedOn });
  const questions = joinList(entry.questions.map((key) => questionShort(key, lang).toLowerCase()), lang);
  const parts = [`${asked}. ${pick(lang, 'How', 'Comment')}${c}${channelLabel(entry.channel, lang).toLowerCase()}.`, `${pick(lang, 'Asked about', 'Questions sur')}${c}${questions}.`, `${statusLabel(entry.status, lang)}.`];
  const days = daysWaiting(entry, today);
  if (days !== null) parts.push(`${pick(lang, 'Days since you asked', 'Jours depuis votre demande')}${c}${days}.`);
  else if (entry.closedOn !== null) parts.push(fill(pick(lang, 'Closed on {day}.', 'Fermée le {day}.'), { day: entry.closedOn }));
  return parts.join(' ');
}

/** Counts only. The App does not say when to ask again. */
export function askCountsText(counts: AskCounts, lang: PreLang): string {
  const c = colon(lang);
  return [
    `${pick(lang, 'Times you asked', 'Demandes faites')}${c}${counts.total}.`,
    `${pick(lang, 'Waiting', 'En attente')}${c}${counts.waiting}.`,
    `${pick(lang, 'Answered', 'Avec réponse')}${c}${counts.answered}.`,
    `${pick(lang, 'No reply', 'Sans réponse')}${c}${counts.noReply}.`,
  ].join(' ');
}

export function askIssueText(issue: AskIssue, lang: PreLang): string {
  switch (issue) {
    case 'date-invalid':
      return pick(lang, 'Write the day as year-month-day, such as 2026-11-19.', 'Écrivez le jour sous la forme année-mois-jour, par exemple 2026-11-19.');
    case 'date-future':
      return pick(lang, 'The day is after today.', 'Le jour est après aujourd’hui.');
    case 'no-question':
      return pick(lang, 'Choose at least one question first.', 'Choisissez d’abord au moins une question.');
    case 'too-many-for-place':
      return fill(pick(lang, 'The App keeps {max} asks for one place. Remove one before you add another.', 'L’application garde {max} demandes pour un lieu. Retirez-en une avant d’en ajouter une autre.'), { max: MAX_ASKS_PER_PLACE });
    case 'log-full':
      return pick(lang, 'Your list of asks is full. Remove some before you add more.', 'Votre liste de demandes est pleine. Retirez-en avant d’en ajouter.');
  }
}

export function letterNote(letter: Letter, lang: PreLang): string {
  if (letter.text === '') return pick(lang, 'Choose at least one question to get a draft.', 'Choisissez au moins une question pour obtenir un brouillon.');
  const head = `${pick(lang, 'Length', 'Longueur')}${colon(lang)}${letter.length} ${plural(lang, letter.length, pick(lang, 'character', 'caractère'), pick(lang, 'characters', 'caractères'))}.`;
  if (!letter.tooLongForForm) return head;
  return `${head} ${fill(pick(lang, 'Many contact forms stop near {max}. Ask fewer questions at a time, or send an email.', 'Beaucoup de formulaires de contact s’arrêtent vers {max}. Posez moins de questions à la fois, ou envoyez un courriel.'), { max: SHORT_MESSAGE_MAX })}`;
}

export function compareLabel(kind: FactCompare, lang: PreLang): string {
  switch (kind) {
    case 'neither':
      return pick(lang, 'UNKNOWN from both', 'UNKNOWN des deux côtés');
    case 'does-not-apply':
      return pick(lang, 'Does not apply here', 'Ne s’applique pas ici');
    case 'only-measured':
      return pick(lang, 'Only you measured it', 'Vous seul l’avez mesuré');
    case 'only-told':
      return pick(lang, 'Only the place said it', 'Seul le lieu l’a dit');
    case 'same':
      return pick(lang, 'The same', 'Identique');
    case 'differs':
      return pick(lang, 'Differs', 'Diffère');
  }
}

/** For a row that differs: by how much, for lengths. Neither side is called wrong. */
export function differenceText(row: FactRow, lang: PreLang): string {
  if (row.kind !== 'differs') return '';
  if (row.differenceCm === null) return pick(lang, 'The two answers are not the same.', 'Les deux réponses ne sont pas les mêmes.');
  const size = formatCm(Math.abs(row.differenceCm), lang);
  return row.differenceCm > 0
    ? fill(pick(lang, 'The place said {size} more than you measured.', 'Le lieu a dit {size} de plus que votre mesure.'), { size })
    : fill(pick(lang, 'The place said {size} less than you measured.', 'Le lieu a dit {size} de moins que votre mesure.'), { size });
}

export function compareSummary(rows: readonly FactRow[], lang: PreLang): string {
  const counts = compareCounts(rows);
  const c = colon(lang);
  const head = [
    `${pick(lang, 'The same', 'Identiques')}${c}${counts.same}.`,
    `${pick(lang, 'Different', 'Différents')}${c}${counts.differs}.`,
    `${pick(lang, 'Only you', 'Vous seul')}${c}${counts['only-measured']}.`,
    `${pick(lang, 'Only the place', 'Le lieu seul')}${c}${counts['only-told']}.`,
    `${pick(lang, 'UNKNOWN from both', 'UNKNOWN des deux côtés')}${c}${counts.neither}.`,
  ].join(' ');
  const open = stillOpen(rows);
  if (open.length === 0) return head;
  return `${head} ${pick(lang, 'Still to ask or measure', 'Encore à demander ou à mesurer')}${c}${joinList(open.map((key) => questionShort(key, lang).toLowerCase()), lang)}.`;
}

export function toldNoteText(lang: PreLang): string {
  return pick(
    lang,
    'What a place tells you is kept apart from what you measured. It is not something you saw, so it is never among the tags for OpenStreetMap. Go and look before you add it to the map.',
    'Ce qu’un lieu vous dit est gardé à part de ce que vous avez mesuré. Ce n’est pas quelque chose que vous avez vu, donc ce n’est jamais parmi les balises pour OpenStreetMap. Allez voir avant de l’ajouter à la carte.',
  );
}

export function privacyNoteText(lang: PreLang): string {
  return pick(
    lang,
    'The draft says nothing about you, your health or your body. Add only what you choose to. The App sends nothing: you copy the words and send them yourself.',
    'Le brouillon ne dit rien sur vous, votre santé ou votre corps. Ajoutez seulement ce que vous choisissez. L’application n’envoie rien\u00a0: vous copiez les mots et les envoyez vous-même.',
  );
}
