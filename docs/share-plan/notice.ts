/**
 * Writes the notice that goes beside a map or a list made from a set of records. ODbL-1.0 asks
 * for such a notice. CC0-1.0 does not, and the notice says so plainly. A short summary to help,
 * not legal advice.
 */
import { creditLineText, creditLines, type CreditLine } from '../licence-guide/index.js';
import type { PlanRecord } from './sources.js';
import { fill, joinList, pick, plural, type PreLang } from '../presubmit/text.js';

export type NoticeForm = 'short' | 'full';

export const NOTICE_FORMS: readonly NoticeForm[] = ['short', 'full'];
export const NOTICE_SOURCES_SHOWN = 4;
/** A length that fits under most maps. The notice says when it runs longer. */
export const SHORT_NOTICE_MAX = 200;

export interface Notice {
  form: NoticeForm;
  /** True when a licence on the records asks for a notice. */
  asked: boolean;
  text: string;
  /** Sources named in the notice. */
  named: string[];
  /** Sources that exist but were not named in the short form. */
  notNamed: number;
  /** Characters in the text, counted as a reader sees them. */
  length: number;
  fitsShort: boolean;
}

function names(lines: readonly CreditLine[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.source.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line.source);
  }
  return out;
}

function sourceList(all: readonly string[], lang: PreLang): { text: string; named: string[]; notNamed: number } {
  const named = all.slice(0, NOTICE_SOURCES_SHOWN);
  const notNamed = all.length - named.length;
  const items = [...named];
  if (notNamed > 0) {
    items.push(
      fill(pick(lang, '{n} other {sources}', '{n} {sources}'), {
        n: notNamed,
        sources: plural(lang, notNamed, pick(lang, 'source', 'autre source'), pick(lang, 'sources', 'autres sources')),
      }),
    );
  }
  return { text: joinList(items, lang), named, notNamed };
}

export function noticeLength(text: string): number {
  return [...text].length;
}

export function buildNotice(records: readonly PlanRecord[], lang: PreLang, form: NoticeForm): Notice {
  const lines = creditLines(records);
  const asking = lines.filter((line) => line.required);
  const quiet = lines.filter((line) => !line.required);
  const asked = asking.length > 0;
  const done = (text: string, named: string[], notNamed: number): Notice => {
    const length = noticeLength(text);
    return { form, asked, text, named, notNamed, length, fitsShort: length <= SHORT_NOTICE_MAX };
  };
  if (lines.length === 0) return done('', [], 0);

  if (form === 'short') {
    if (asked) {
      const list = sourceList(names(asking), lang);
      const head = fill(pick(lang, 'Contains data from {sources}, under ODbL-1.0.', 'Contient des données de {sources}, sous ODbL-1.0.'), { sources: list.text });
      const tail = quiet.length > 0 ? pick(lang, ' Other data is CC0-1.0.', ' Les autres données sont en CC0-1.0.') : '';
      return done(`${head}${tail}`, list.named, list.notNamed);
    }
    const list = sourceList(names(quiet), lang);
    return done(fill(pick(lang, 'Data from {sources}, CC0-1.0. Credit is not required.', 'Données de {sources}, CC0-1.0. La mention n’est pas exigée.'), { sources: list.text }), list.named, list.notNamed);
  }

  const out: string[] = [];
  if (asked) {
    out.push(pick(lang, 'This contains data under ODbL-1.0 from:', 'Ceci contient des données sous ODbL-1.0 provenant de\u00a0:'));
    for (const line of asking) out.push(`- ${creditLineText(line, lang)}`);
    out.push(pick(lang, 'A changed database shared in public stays under ODbL-1.0.', 'Une base modifiée partagée publiquement reste sous ODbL-1.0.'));
  }
  if (quiet.length > 0) {
    if (out.length > 0) out.push('');
    out.push(pick(lang, 'Data under CC0-1.0 (credit not required) from:', 'Données sous CC0-1.0 (mention non exigée) provenant de\u00a0:'));
    for (const line of quiet) out.push(`- ${creditLineText(line, lang)}`);
  }
  out.push('', pick(lang, 'The data comes with no promise that it is right or complete.', 'Les données sont fournies sans promesse qu’elles soient justes ou complètes.'));
  return done(out.join('\n'), names(lines), 0);
}

/** Says whether the notice is asked for, and whether the short one fits. */
export function noticeHint(notice: Notice, lang: PreLang): string {
  if (notice.text === '') return pick(lang, 'There is no source to name, so there is no notice.', 'Il n’y a aucune source à nommer, donc aucun avis.');
  const asked = notice.asked
    ? pick(lang, 'ODbL-1.0 asks for a notice like this beside a map or a list made from the data.', 'ODbL-1.0 demande un avis comme celui-ci à côté d’une carte ou d’une liste tirée des données.')
    : pick(lang, 'CC0-1.0 does not ask for a notice. This one is a kindness to the next reader.', 'CC0-1.0 ne demande pas d’avis. Celui-ci est une attention pour la personne qui lira ensuite.');
  if (notice.form !== 'short') return asked;
  const more =
    notice.notNamed > 0
      ? pick(lang, ' Not every source is named here. The full notice names them all.', ' Toutes les sources ne sont pas nommées ici. L’avis complet les nomme toutes.')
      : '';
  const long = notice.fitsShort ? '' : fill(pick(lang, ' It is longer than {max} characters.', ' Il dépasse {max} caractères.'), { max: SHORT_NOTICE_MAX });
  return `${asked}${more}${long}`;
}

export function noticeFilename(form: NoticeForm, today: string): string {
  return `notice-${form}-${today}.txt`;
}
