import { fixFrench } from './frTypography';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * A short, step-by-step tour of the place finder. It starts only when a person asks for it, can be left at any
 * step, and describes what the controls do. It says nothing about any place.
 */
export interface TourStep {
  readonly id: string;
}

export const TOUR_STEPS: readonly TourStep[] = [{ id: 'choose' }, { id: 'search' }, { id: 'save' }, { id: 'plan' }, { id: 'share' }];

export const TOUR_UI = {
  en: {
    open: 'Take a tour of this page',
    close: 'Close the tour',
    next: 'Next step',
    prev: 'Previous step',
    done: 'Finish',
    stepOf: (n: number, total: number): string => `Step ${n} of ${total}`,
    steps: {
      choose: { title: 'Choose features', body: 'Tick the features that matter to you. You can also use the quick choices. Places are ranked by what their sources report.' },
      search: { title: 'Search by name', body: 'Type part of a place name. Matching names show under the box. Recent searches stay on this device.' },
      save: { title: 'Save places', body: 'Press Save on a place to keep it. Saved places go into your visit plan.' },
      plan: { title: 'Plan your questions', body: 'Your plan lists questions to ask each place. Tick a question once you have asked it.' },
      share: { title: 'Copy or print', body: 'Copy the plan as text, a message, a spreadsheet file or a printable page. Nothing is sent anywhere.' },
    },
  },
  fr: {
    open: 'Faire une visite guidée de cette page',
    close: 'Fermer la visite guidée',
    next: 'Étape suivante',
    prev: 'Étape précédente',
    done: 'Terminer',
    stepOf: (n: number, total: number): string => `Étape ${n} sur ${total}`,
    steps: {
      choose: { title: 'Choisir des caractéristiques', body: 'Cochez les caractéristiques qui comptent pour vous. Vous pouvez aussi utiliser les choix rapides. Les lieux sont classés selon ce que disent leurs sources.' },
      search: { title: 'Chercher par nom', body: 'Tapez une partie du nom d’un lieu. Les noms qui correspondent s’affichent sous la zone. Les recherches récentes restent sur cet appareil.' },
      save: { title: 'Enregistrer des lieux', body: 'Appuyez sur Enregistrer pour garder un lieu. Les lieux enregistrés vont dans votre plan de visite.' },
      plan: { title: 'Préparer vos questions', body: 'Votre plan liste des questions à poser à chaque lieu. Cochez une question quand vous l’avez posée.' },
      share: { title: 'Copier ou imprimer', body: 'Copiez le plan en texte, en message, en fichier tableur ou en page à imprimer. Rien n’est envoyé nulle part.' },
    },
  },
} as const;

export interface TourState {
  readonly open: boolean;
  readonly index: number;
}

export const CLOSED_TOUR: TourState = { open: false, index: 0 };

export const TOUR_IDS = {
  open: 'gl-tour-open',
  close: 'gl-tour-close',
  next: 'gl-tour-next',
  prev: 'gl-tour-prev',
  title: 'gl-tour-title',
} as const;

export function startTour(): TourState {
  return { open: true, index: 0 };
}

export function closeTour(): TourState {
  return CLOSED_TOUR;
}

export function isLastStep(state: TourState): boolean {
  return state.index >= TOUR_STEPS.length - 1;
}

/** The next step; on the last step the tour finishes. A closed tour stays closed. */
export function nextStep(state: TourState): TourState {
  if (!state.open) return state;
  return isLastStep(state) ? CLOSED_TOUR : { open: true, index: state.index + 1 };
}

/** The step before, stopping at the first. */
export function prevStep(state: TourState): TourState {
  if (!state.open) return state;
  return { open: true, index: Math.max(0, state.index - 1) };
}

export function stepHeading(state: TourState, lang: Lang): string {
  const ui = TOUR_UI[lang];
  const step = TOUR_STEPS[state.index];
  const title = step === undefined ? '' : ui.steps[step.id as keyof typeof ui.steps].title;
  const of = ui.stepOf(state.index + 1, TOUR_STEPS.length);
  return lang === 'fr' ? fixFrench(`${of} : ${title}`) : `${of}: ${title}`;
}

export function renderTourButton(lang: Lang): string {
  return `<button type="button" class="gl-btn" id="${TOUR_IDS.open}">${escapeHtml(TOUR_UI[lang].open)}</button>`;
}

/** The current step, or nothing when the tour is closed. */
export function renderTour(state: TourState, lang: Lang): string {
  if (!state.open) return '';
  const ui = TOUR_UI[lang];
  const step = TOUR_STEPS[state.index];
  if (step === undefined) return '';
  const copy = ui.steps[step.id as keyof typeof ui.steps];
  const prev = state.index > 0 ? `<button type="button" class="gl-btn" id="${TOUR_IDS.prev}">${escapeHtml(ui.prev)}</button>` : '';
  const next = `<button type="button" class="gl-btn" id="${TOUR_IDS.next}">${escapeHtml(isLastStep(state) ? ui.done : ui.next)}</button>`;
  return (
    `<section class="gl-tour gl-fieldset" aria-labelledby="${TOUR_IDS.title}">` +
    `<h3 id="${TOUR_IDS.title}" tabindex="-1">${escapeHtml(stepHeading(state, lang))}</h3><p>${escapeHtml(copy.body)}</p>` +
    `<div class="gl-actions">${prev}${next}<button type="button" class="gl-btn" id="${TOUR_IDS.close}">${escapeHtml(ui.close)}</button></div></section>`
  );
}
