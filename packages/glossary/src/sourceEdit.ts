import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { MAX_SOURCE_NAME } from './recordForm';
import { escapeHtml } from './text';

/**
 * Correcting the name of a source on every record that carries it, such as a typing mistake or
 * two spellings of one source. Only the name changes: the licence, date, tier and what was
 * reported stay as they were. This corrects the person's own copy of the records.
 */
export type SourceRenameOutcome = 'renamed' | 'same' | 'empty' | 'too-long' | 'missing';

export interface SourceRenameResult {
  readonly outcome: SourceRenameOutcome;
  readonly places: readonly Place[];
  /** Records whose source name changed. */
  readonly changed: number;
  /** The cleaned new name. */
  readonly name: string;
}

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * Gives the source `from` the name `to` on every record. Names are compared after trimming.
 * The new name may be one another source already has: that is how two spellings become one.
 */
export function renameSource(places: readonly Place[], from: string, to: string): SourceRenameResult {
  const old = from.trim();
  const name = clean(to);
  const none = (outcome: SourceRenameOutcome): SourceRenameResult => ({ outcome, places, changed: 0, name });
  if (name === '') return none('empty');
  if (Array.from(name).length > MAX_SOURCE_NAME) return none('too-long');
  if (name === old) return none('same');
  let changed = 0;
  const next = places.map((place) => {
    if (!place.claims.some((c) => c.provenance?.source.trim() === old)) return place;
    return {
      ...place,
      claims: place.claims.map((c) => {
        if (c.provenance === undefined || c.provenance.source.trim() !== old) return c;
        changed += 1;
        return { ...c, provenance: { ...c.provenance, source: name } };
      }),
    };
  });
  return changed === 0 || old === '' ? none('missing') : { outcome: 'renamed', places: next, changed, name };
}

export const SOURCEEDIT_UI = {
  en: {
    summary: 'Correct the name of a source',
    intro: 'This changes the name on every record from that source. Nothing else changes.',
    label: (name: string): string => `New name for the source ${name}`,
    rename: 'Rename source',
    renameLabel: (name: string): string => `Rename source: ${name}`,
    renamed: (from: string, to: string): string => `Renamed the source ${from} to ${to}.`,
    changed: (n: number): string => (n === 1 ? '1 record was changed.' : `${n} records were changed.`),
    outcomes: {
      same: 'That is already the name.',
      empty: 'Type a name first.',
      'too-long': 'The name is too long.',
      missing: 'No record has that source any more.',
    },
  },
  fr: {
    summary: 'Corriger le nom d’une provenance',
    intro: 'Cela change le nom sur chaque fiche de cette provenance. Rien d’autre ne change.',
    label: (name: string): string => `Nouveau nom pour la provenance ${name}`,
    rename: 'Renommer la provenance',
    renameLabel: (name: string): string => `Renommer la provenance\u00a0: ${name}`,
    renamed: (from: string, to: string): string => `La provenance ${from} a été renommée ${to}.`,
    changed: (n: number): string => (n === 1 ? '1 fiche a été changée.' : `${n} fiches ont été changées.`),
    outcomes: {
      same: 'C’est déjà le nom.',
      empty: 'Écrivez d’abord un nom.',
      'too-long': 'Le nom est trop long.',
      missing: 'Aucune fiche n’a plus cette provenance.',
    },
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** What to say after trying to rename a source. */
export function sourceRenameMessage(result: SourceRenameResult, from: string, lang: Lang): string {
  const ui = SOURCEEDIT_UI[lang];
  if (result.outcome !== 'renamed') return ui.outcomes[result.outcome];
  return `${ui.renamed(from.trim(), result.name)} ${ui.changed(result.changed)}`;
}

export function sourceNameInputId(index: number): string {
  return `gl-srcname-${index}`;
}
export function sourceRenameButtonId(index: number): string {
  return `gl-srcbtn-${index}`;
}
export function parseSourceRenameButtonId(id: string): number | null {
  const m = /^gl-srcbtn-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

/** A closed block with a labelled box and a button for each source. '' when there are no sources. */
export function renderSourceRename(names: readonly string[], lang: Lang): string {
  if (names.length === 0) return '';
  const ui = SOURCEEDIT_UI[lang];
  const rows = names
    .map(
      (name, i) =>
        `<div class="gl-srcedit"><label for="${sourceNameInputId(i)}">${escapeHtml(fr(lang, ui.label(name)))}</label>` +
        `<input type="text" id="${sourceNameInputId(i)}" class="gl-input" maxlength="${MAX_SOURCE_NAME}" autocomplete="off" value="${escapeHtml(name)}">` +
        `<button type="button" class="gl-btn" id="${sourceRenameButtonId(i)}" aria-label="${escapeHtml(fr(lang, ui.renameLabel(name)))}">${escapeHtml(ui.rename)}</button></div>`,
    )
    .join('');
  return `<details class="gl-srcrename"><summary>${escapeHtml(ui.summary)}</summary><p>${escapeHtml(ui.intro)}</p>${rows}</details>`;
}
