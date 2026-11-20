/** The steps for adding one observation to OpenStreetMap by hand. English and French. */
import { coordText, hasStatus, type TagRecord } from './tags.js';
import { fill, pick, type PreLang } from '../presubmit/text.js';

export const STEP_IDS = ['own-eyes', 'open-editor', 'find-object', 'look-first', 'type-tags', 'leave-rest', 'comment', 'save'] as const;
export type StepId = (typeof STEP_IDS)[number];

export interface HandStep {
  id: StepId;
  text: string;
}

export function handSteps(record: TagRecord, lang: PreLang): HandStep[] {
  const step = (id: StepId, en: string, fr: string, values: Readonly<Record<string, string | number>> = {}): HandStep => ({ id, text: fill(pick(lang, en, fr), values) });
  if (!hasStatus(record)) {
    return [
      step(
        'own-eyes',
        'This observation has the status UNKNOWN, so there is no wheelchair tag to add. Go back and look before you add anything to the map.',
        'Cette observation a l’état UNKNOWN, donc il n’y a aucune balise wheelchair à ajouter. Retournez voir avant d’ajouter quoi que ce soit à la carte.',
      ),
    ];
  }
  return [
    step('own-eyes', 'Add only what you saw yourself on {day}.', 'Ajoutez seulement ce que vous avez vu vous-même le {day}.', { day: record.observedOn }),
    step(
      'open-editor',
      'Sign in to OpenStreetMap with your own account and open the editor you use at {coords}.',
      'Connectez-vous à OpenStreetMap avec votre propre compte et ouvrez l’éditeur que vous utilisez à {coords}.',
      { coords: coordText(record) },
    ),
    step(
      'find-object',
      'Find the place on the map. If it is already there, select it. Add a new point only if it is missing.',
      'Trouvez le lieu sur la carte. S’il y est déjà, sélectionnez-le. Ajoutez un nouveau point seulement s’il manque.',
    ),
    step(
      'look-first',
      'Read the tags that are already on it. You can paste them below to set them beside yours.',
      'Lisez les balises qui s’y trouvent déjà. Vous pouvez les coller ci-dessous pour les placer à côté des vôtres.',
    ),
    step('type-tags', 'Type the tags from this page, one at a time.', 'Tapez les balises de cette page, une à la fois.'),
    step(
      'leave-rest',
      'Leave every other tag as it is. Do not remove what someone else added.',
      'Laissez toutes les autres balises telles quelles. Ne retirez pas ce qu’une autre personne a ajouté.',
    ),
    step('comment', 'Write a changeset comment in your own words. A draft is on this page.', 'Rédigez un commentaire de lot de modifications dans vos propres mots. Un brouillon se trouve sur cette page.'),
    step(
      'save',
      'Save in the editor. The App does not do this for you and cannot see whether you did.',
      'Enregistrez dans l’éditeur. L’application ne le fait pas pour vous et ne peut pas voir si vous l’avez fait.',
    ),
  ];
}
