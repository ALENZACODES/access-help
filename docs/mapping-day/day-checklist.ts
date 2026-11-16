/**
 * A day-of checklist for going out to record places. The ticks belong to the person: they are
 * kept with the session on their device and mean "I did this", not that anything was checked.
 * Nothing here is medical, legal or eligibility advice.
 */
import type { DayLang } from './day-text';

export const CHECKLIST_GROUPS = ['before', 'during', 'after'] as const;
export type ChecklistGroup = (typeof CHECKLIST_GROUPS)[number];

export interface ChecklistItem {
  id: string;
  group: ChecklistGroup;
  text: Record<DayLang, string>;
}

export const DAY_CHECKLIST: readonly ChecklistItem[] = [
  { id: 'pack-saved', group: 'before', text: { en: 'Save the area’s offline pack on this device, so the places screens work without a connection.', fr: 'Enregistrez le lot hors ligne de la zone sur cet appareil, pour que les écrans des lieux fonctionnent sans connexion.' } },
  { id: 'charge', group: 'before', text: { en: 'Charge your device, and bring a way to jot notes if it runs out.', fr: 'Chargez votre appareil et prévoyez de quoi noter si la batterie s’épuise.' } },
  { id: 'licence', group: 'before', text: { en: 'Decide which open licence you will use for what you record: CC0-1.0 or ODbL-1.0.', fr: 'Décidez de la licence ouverte que vous utiliserez pour vos fiches : CC0-1.0 ou ODbL-1.0.' } },
  { id: 'rules', group: 'before', text: { en: 'Read the record-only-what-you-see rules once, so UNKNOWN is a normal answer on the day.', fr: 'Relisez une fois les règles « ne consigner que ce que l’on voit », pour que UNKNOWN soit une réponse normale le jour même.' } },
  { id: 'tell-someone', group: 'before', text: { en: 'Tell someone where you are going and about when you expect to be back.', fr: 'Dites à quelqu’un où vous allez et à quelle heure environ vous comptez revenir.' } },
  { id: 'public-ground', group: 'during', text: { en: 'Stay on public ground unless the owner or manager has said otherwise.', fr: 'Restez sur le domaine public, sauf si le propriétaire ou le gérant a dit autre chose.' } },
  { id: 'own-observation', group: 'during', text: { en: 'Record only what you saw or measured yourself. Do not copy from another map or a listing.', fr: 'Ne consignez que ce que vous avez vu ou mesuré vous-même. Ne copiez ni une autre carte ni un répertoire.' } },
  { id: 'unknown-ok', group: 'during', text: { en: 'If you could not see a place well enough, leave it UNKNOWN. A blank is not “no”.', fr: 'Si vous n’avez pas pu bien voir un lieu, laissez-le UNKNOWN. Un blanc n’est pas « non ».' } },
  { id: 'people', group: 'during', text: { en: 'Do not photograph or write down people, plates or private details.', fr: 'Ne photographiez pas et ne notez pas de personnes, de plaques ni de détails privés.' } },
  { id: 'pace', group: 'during', text: { en: 'Go at your own pace. Stop when you want to; an unfinished grid is a normal result.', fr: 'Allez à votre rythme. Arrêtez-vous quand vous le voulez ; une grille inachevée est un résultat normal.' } },
  { id: 'look-over', group: 'after', text: { en: 'Look over the day’s records the same day, while you remember each place.', fr: 'Relisez les fiches du jour le jour même, pendant que vous vous souvenez de chaque lieu.' } },
  { id: 'debrief', group: 'after', text: { en: 'Read the debrief and note which cells you want to come back to.', fr: 'Lisez le bilan et notez les cellules où vous voulez revenir.' } },
];

export type Ticks = Readonly<Record<string, boolean>>;

export function checklistIds(): string[] {
  return DAY_CHECKLIST.map((item) => item.id);
}

export function itemsIn(group: ChecklistGroup): ChecklistItem[] {
  return DAY_CHECKLIST.filter((item) => item.group === group);
}

/** Returns new ticks with one item set. An id that is not on the list is ignored. */
export function setTick(ticks: Ticks, id: string, done: boolean): Ticks {
  if (!checklistIds().includes(id)) return ticks;
  const next: Record<string, boolean> = { ...ticks };
  if (done) next[id] = true;
  else delete next[id];
  return next;
}

/** Keeps only known ids set to true. Used when reading ticks back from storage. */
export function cleanTicks(value: unknown): Ticks {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const known = new Set(checklistIds());
  const out: Record<string, boolean> = {};
  for (const [id, done] of Object.entries(value as Record<string, unknown>)) if (known.has(id) && done === true) out[id] = true;
  return out;
}

export interface Progress {
  done: number;
  total: number;
  /** Ids not ticked yet, in list order. */
  remaining: string[];
}

export function progress(ticks: Ticks, group?: ChecklistGroup): Progress {
  const items = group ? itemsIn(group) : DAY_CHECKLIST;
  const remaining = items.filter((item) => ticks[item.id] !== true).map((item) => item.id);
  return { done: items.length - remaining.length, total: items.length, remaining };
}

export const GROUP_TITLE: Record<ChecklistGroup, Record<DayLang, string>> = {
  before: { en: 'Before you go', fr: 'Avant de partir' },
  during: { en: 'While you are out', fr: 'Pendant la sortie' },
  after: { en: 'Afterwards', fr: 'Après la sortie' },
};

export function progressText(p: Progress, lang: DayLang): string {
  return lang === 'fr' ? `${p.done} sur ${p.total} cochés` : `${p.done} of ${p.total} ticked`;
}
