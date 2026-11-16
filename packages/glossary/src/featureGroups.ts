import { fixFrench } from './frTypography';
import type { FinderState } from './filters';
import { normaliseState } from './filters';
import type { Lang } from './plainTerms';
import { TERMS } from './plainTerms';
import { escapeHtml } from './text';

/**
 * Shortcuts that choose several features at once, for a trip that has a purpose (getting in, a washroom stop).
 * A group only sets which features rank the list. It says nothing about any place.
 */
export interface FeatureGroup {
  readonly id: string;
  readonly features: readonly string[];
}

export const FEATURE_GROUPS: readonly FeatureGroup[] = [
  { id: 'arriving', features: ['accessible-parking', 'step-free-entrance'] },
  { id: 'getting-in', features: ['step-free-entrance', 'automatic-door', 'ramp', 'clear-door-width'] },
  { id: 'moving-inside', features: ['elevator', 'clear-door-width'] },
  { id: 'washroom-stop', features: ['accessible-washroom', 'grab-bar', 'clear-door-width'] },
];

export const GROUP_UI = {
  en: {
    legend: 'Quick choices',
    names: { arriving: 'Arriving', 'getting-in': 'Getting in', 'moving-inside': 'Moving inside', 'washroom-stop': 'Washroom stop' },
    label: (name: string): string => `Choose features for: ${name}`,
  },
  fr: {
    legend: 'Choix rapides',
    names: { arriving: 'Arriver', 'getting-in': 'Entrer', 'moving-inside': 'Se déplacer à l’intérieur', 'washroom-stop': 'Arrêt aux toilettes' },
    label: (name: string): string => fixFrench(`Choisir les caractéristiques pour : ${name}`),
  },
} as const;

const KNOWN: ReadonlySet<string> = new Set(TERMS.map((t) => t.id));

export function groupById(id: string): FeatureGroup | undefined {
  return FEATURE_GROUPS.find((g) => g.id === id);
}

/** Features of a group that exist in the glossary, in glossary order. */
export function groupFeatures(group: FeatureGroup): readonly string[] {
  return TERMS.map((t) => t.id).filter((id) => group.features.includes(id) && KNOWN.has(id));
}

/** True when every feature of the group is chosen. */
export function groupIsChosen(group: FeatureGroup, state: FinderState): boolean {
  const features = groupFeatures(group);
  return features.length > 0 && features.every((f) => state.features.includes(f));
}

/** Chooses the group's features, or unchooses them when they are all chosen already. Other choices stay. */
export function toggleGroup(state: FinderState, group: FeatureGroup): FinderState {
  const features = groupFeatures(group);
  const next = groupIsChosen(group, state) ? state.features.filter((f) => !features.includes(f)) : [...state.features, ...features];
  return normaliseState({ ...state, features: next });
}

export const GROUP_ID_PREFIX = 'gl-grp-';

export function groupButtonId(id: string): string {
  return `${GROUP_ID_PREFIX}${id}`;
}

/** The group id in a button id, only when it names a known group. */
export function parseGroupId(buttonId: string): string | null {
  if (!buttonId.startsWith(GROUP_ID_PREFIX)) return null;
  const id = buttonId.slice(GROUP_ID_PREFIX.length);
  return groupById(id) === undefined ? null : id;
}

export function renderGroups(state: FinderState, lang: Lang): string {
  const ui = GROUP_UI[lang];
  const buttons = FEATURE_GROUPS.map((g) => {
    const name = ui.names[g.id as keyof typeof ui.names];
    return (
      `<button type="button" class="gl-btn" id="${groupButtonId(g.id)}" aria-pressed="${groupIsChosen(g, state)}" ` +
      `aria-label="${escapeHtml(ui.label(name))}">${escapeHtml(name)}</button>`
    );
  }).join('');
  return `<div class="gl-actions" role="group" aria-label="${escapeHtml(ui.legend)}">${buttons}</div>`;
}
