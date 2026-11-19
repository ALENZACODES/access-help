/**
 * A short list of things to do before sharing a set of records, worked out from the licences and
 * sources on them. The person ticks the items themselves; the App does not know what was done
 * and never says the sharing is in order.
 */
import type { Mix } from '../licence-guide/index.js';
import type { SplitPlan } from './split.js';
import { fill, pick, plural, type PreLang } from '../presubmit/text.js';

export const CHECK_IDS = ['read-licence', 'credit-placed', 'same-licence', 'open-copy', 'other-left-out', 'no-source-left-out', 'own-eyes-map'] as const;
export type CheckId = (typeof CHECK_IDS)[number];

export interface CheckItem {
  id: CheckId;
  text: string;
  why: string;
}

function item(id: CheckId, lang: PreLang, values: Readonly<Record<string, string | number>> = {}): CheckItem {
  const copy: Record<CheckId, [string, string, string, string]> = {
    'read-licence': [
      'I read the licence text for the records I am sharing.',
      'J’ai lu le texte de la licence des fiches que je partage.',
      'The App gives a short summary. The licence text is what counts.',
      'L’application donne un court résumé. C’est le texte de la licence qui compte.',
    ],
    'credit-placed': [
      'The credit for the ODbL-1.0 sources is where people will see it.',
      'La mention des sources ODbL-1.0 se trouve là où les gens la verront.',
      'ODbL-1.0 asks for credit.',
      'ODbL-1.0 demande une mention.',
    ],
    'same-licence': [
      'If I changed the database and share it in public, it goes out under ODbL-1.0.',
      'Si j’ai modifié la base et que je la partage publiquement, elle part sous ODbL-1.0.',
      'ODbL-1.0 asks that changed versions stay under the same licence.',
      'ODbL-1.0 demande que les versions modifiées restent sous la même licence.',
    ],
    'open-copy': [
      'If I share a locked copy, I also offer one without the lock.',
      'Si je partage une copie verrouillée, j’en offre aussi une sans verrou.',
      'ODbL-1.0 asks that the data stay open.',
      'ODbL-1.0 demande que les données restent ouvertes.',
    ],
    'other-left-out': [
      'I left out the {n} {records} under a licence the App does not take.',
      'J’ai laissé de côté {n} {records} sous une licence que l’application ne prend pas.',
      'The App cannot say what those licences ask.',
      'L’application ne peut pas dire ce que ces licences demandent.',
    ],
    'no-source-left-out': [
      'I left out the {n} {records} with no source, or I wrote the source in.',
      'J’ai laissé de côté {n} {records} sans source, ou j’y ai inscrit la source.',
      'A record with no source cannot be credited, and the next reader cannot tell where it came from.',
      'Une fiche sans source ne peut pas être citée, et la personne suivante ne peut pas savoir d’où elle vient.',
    ],
    'own-eyes-map': [
      'For OpenStreetMap, I add only what I saw myself.',
      'Pour OpenStreetMap, j’ajoute seulement ce que j’ai vu moi-même.',
      'An open licence on a pack does not by itself mean the map takes a copy of it.',
      'Une licence ouverte sur un paquet ne veut pas dire à elle seule que la carte en prend une copie.',
    ],
  };
  const [en, fr, whyEn, whyFr] = copy[id];
  return { id, text: fill(pick(lang, en, fr), values), why: pick(lang, whyEn, whyFr) };
}

/** The items that apply to this set. Empty when there is nothing to share. */
export function buildChecklist(mix: Mix, plan: SplitPlan, lang: PreLang): CheckItem[] {
  if (mix.total === 0) return [];
  const records = (n: number) => plural(lang, n, pick(lang, 'record', 'fiche'), pick(lang, 'records', 'fiches'));
  const out: CheckItem[] = [item('read-licence', lang)];
  if (plan.parts.some((part) => part.licence === 'ODbL-1.0')) out.push(item('credit-placed', lang), item('same-licence', lang), item('open-copy', lang));
  if (plan.leftOutOther.length > 0) out.push(item('other-left-out', lang, { n: plan.leftOutOther.length, records: records(plan.leftOutOther.length) }));
  if (plan.leftOutNoSource.length > 0) out.push(item('no-source-left-out', lang, { n: plan.leftOutNoSource.length, records: records(plan.leftOutNoSource.length) }));
  out.push(item('own-eyes-map', lang));
  return out;
}

export function isCheckId(value: string): value is CheckId {
  return (CHECK_IDS as readonly string[]).includes(value);
}

/** Ticks or unticks one item. Ids that are not on the list are ignored. */
export function toggleCheck(done: readonly CheckId[], id: string, items: readonly CheckItem[]): CheckId[] {
  if (!isCheckId(id) || !items.some((entry) => entry.id === id)) return [...done];
  return done.includes(id) ? done.filter((entry) => entry !== id) : [...done, id];
}

/** Ticks that still match an item on the list. A tick for an item that no longer applies is dropped. */
export function keepTicks(done: readonly CheckId[], items: readonly CheckItem[]): CheckId[] {
  return done.filter((id) => items.some((entry) => entry.id === id));
}

export function leftToDo(done: readonly CheckId[], items: readonly CheckItem[]): number {
  return items.filter((entry) => !done.includes(entry.id)).length;
}

export function checklistLines(items: readonly CheckItem[], done: readonly CheckId[]): string[] {
  return items.map((entry) => `[${done.includes(entry.id) ? 'x' : ' '}] ${entry.text}`);
}
