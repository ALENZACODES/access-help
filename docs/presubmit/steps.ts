/**
 * The steps a person follows to submit an observation to OpenStreetMap themselves.
 * The App does not take any of these steps for them and cannot see the result.
 */
import { pick, type PreLang } from './text.js';

export interface Step {
  id: string;
  title: string;
  detail: string;
}

export const STEP_IDS = ['account', 'find', 'compare', 'tags', 'comment', 'save'] as const;
export type StepId = (typeof STEP_IDS)[number];

export function submissionSteps(lang: PreLang): Step[] {
  return [
    {
      id: 'account',
      title: pick(lang, 'Open the editor with your own account', 'Ouvrir l’éditeur avec votre propre compte'),
      detail: pick(
        lang,
        'You sign in to OpenStreetMap yourself, in your browser. The App never holds your sign-in.',
        'Vous vous connectez vous-même à OpenStreetMap, dans votre navigateur. L’application ne garde jamais votre connexion.',
      ),
    },
    {
      id: 'find',
      title: pick(lang, 'Find the place on the map', 'Trouver le lieu sur la carte'),
      detail: pick(
        lang,
        'Look for the place near its coordinates. See if it is already on the map before you add anything.',
        'Cherchez le lieu près de ses coordonnées. Regardez s’il est déjà sur la carte avant d’ajouter quoi que ce soit.',
      ),
    },
    {
      id: 'compare',
      title: pick(lang, 'Compare what is there with what you saw', 'Comparer ce qui s’y trouve avec ce que vous avez vu'),
      detail: pick(
        lang,
        'If the map already says something different, look again at your notes. Change it only if you are sure.',
        'Si la carte dit déjà autre chose, relisez vos notes. Ne modifiez que si vous êtes sûr.',
      ),
    },
    {
      id: 'tags',
      title: pick(lang, 'Add only the tags in your list', 'Ajouter seulement les étiquettes de votre liste'),
      detail: pick(
        lang,
        'Copy the tags shown for the place. When the status is UNKNOWN there is no wheelchair tag to add.',
        'Copiez les étiquettes affichées pour le lieu. Quand l’état est UNKNOWN, il n’y a pas d’étiquette wheelchair à ajouter.',
      ),
    },
    {
      id: 'comment',
      title: pick(lang, 'Write the changeset comment and source', 'Écrire le commentaire et la source du lot de modifications'),
      detail: pick(
        lang,
        'Paste the suggested comment and source, and change them so they are true for what you did.',
        'Collez le commentaire et la source proposés, puis changez-les pour qu’ils soient vrais pour ce que vous avez fait.',
      ),
    },
    {
      id: 'save',
      title: pick(lang, 'Save your changes there', 'Enregistrer vos modifications là-bas'),
      detail: pick(
        lang,
        'Saving happens on OpenStreetMap, not in the App. The App cannot see whether it worked.',
        'L’enregistrement se fait sur OpenStreetMap, pas dans l’application. L’application ne peut pas voir si cela a fonctionné.',
      ),
    },
  ];
}
