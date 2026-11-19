/**
 * The steps a person follows to submit their own observations to OpenStreetMap.
 * The App cannot submit for them and never does. Each step says what to do and why,
 * and the screen can tick steps off. Ticks are the person's own record on their
 * device, never sent anywhere.
 */
import type { BatchReview } from './review.js';
import type { ReviewLang } from './text.js';
import { fill, pick } from './text.js';

export const STEP_IDS = [
  'review',
  'download',
  'licence',
  'editor',
  'tags',
  'changeset',
  'submit',
  'after',
] as const;
export type StepId = (typeof STEP_IDS)[number];

export interface Step {
  id: StepId;
  title: string;
  body: string;
}

const STEPS: Record<ReviewLang, Record<StepId, Omit<Step, 'id'>>> = {
  en: {
    review: {
      title: 'Read the review of your observations',
      body: 'Fix anything marked "fix before submitting". Look again at anything marked "look again". Unknown stays UNKNOWN: it is left out of the tags.',
    },
    download: {
      title: 'Download the draft files',
      body: 'The files are saved on this device. The App does not send them anywhere. Keep a copy of what you submit.',
    },
    licence: {
      title: 'Read the licence you chose',
      body: 'Submit only what you saw yourself and are free to share under that licence. Do not copy from other maps, listings or photos you do not own.',
    },
    editor: {
      title: 'Open an OpenStreetMap editor and sign in',
      body: 'Use the editor you prefer. You need your own OpenStreetMap account. The App never has your password and never signs in for you.',
    },
    tags: {
      title: 'Add the tags to each place',
      body: 'Find the place on the map. If it is already there, add the tags to it instead of drawing it again. If it is not, add it at the position you recorded. Paste the tag lines from the draft.',
    },
    changeset: {
      title: 'Write the changeset comment',
      body: 'Paste the comment from the draft, or write your own. It should say what you changed and that it comes from your own visit.',
    },
    submit: {
      title: 'Review your changes and upload them yourself',
      body: 'Read the list of changes in the editor. Upload only when you are satisfied. Submitting is your action, not the App’s.',
    },
    after: {
      title: 'Check your edit on the map later',
      body: 'Other mappers may comment or change it. Reply if they ask a question. If you were wrong, you can correct it.',
    },
  },
  fr: {
    review: {
      title: 'Lisez la revue de vos observations',
      body: 'Corrigez tout ce qui est marqué «\u202fà corriger avant de soumettre\u202f». Revoyez ce qui est marqué «\u202fà revoir\u202f». UNKNOWN reste UNKNOWN\u00a0: il est omis des balises.',
    },
    download: {
      title: 'Téléchargez les fichiers brouillons',
      body: 'Les fichiers sont enregistrés sur cet appareil. L’application ne les envoie nulle part. Gardez une copie de ce que vous soumettez.',
    },
    licence: {
      title: 'Lisez la licence que vous avez choisie',
      body: 'Ne soumettez que ce que vous avez vu vous-même et que vous pouvez partager sous cette licence. Ne copiez pas d’autres cartes, annonces ou photos qui ne sont pas à vous.',
    },
    editor: {
      title: 'Ouvrez un éditeur OpenStreetMap et connectez-vous',
      body: 'Utilisez l’éditeur que vous préférez. Il vous faut votre propre compte OpenStreetMap. L’application n’a jamais votre mot de passe et ne se connecte jamais à votre place.',
    },
    tags: {
      title: 'Ajoutez les balises à chaque lieu',
      body: 'Trouvez le lieu sur la carte. S’il y est déjà, ajoutez-lui les balises au lieu de le redessiner. Sinon, ajoutez-le à la position notée. Collez les lignes de balises du brouillon.',
    },
    changeset: {
      title: 'Rédigez le commentaire du lot de modifications',
      body: 'Collez le commentaire du brouillon ou écrivez le vôtre. Il doit dire ce que vous avez changé et que cela vient de votre propre visite.',
    },
    submit: {
      title: 'Relisez vos modifications et envoyez-les vous-même',
      body: 'Lisez la liste des modifications dans l’éditeur. N’envoyez que si vous en êtes satisfait. L’envoi est votre geste, pas celui de l’application.',
    },
    after: {
      title: 'Revoyez votre modification sur la carte plus tard',
      body: 'D’autres contributeurs peuvent commenter ou modifier. Répondez s’ils posent une question. Si vous vous êtes trompé, vous pouvez corriger.',
    },
  },
};

export function stepsFor(lang: ReviewLang): Step[] {
  return STEP_IDS.map((id) => ({ id, ...STEPS[lang][id] }));
}

export type Ticks = Readonly<Partial<Record<StepId, true>>>;

export function isStepId(value: unknown): value is StepId {
  return typeof value === 'string' && (STEP_IDS as readonly string[]).includes(value);
}

/** Keeps only known step ids set to true. Anything else in stored data is dropped. */
export function cleanTicks(value: unknown): Ticks {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Partial<Record<StepId, true>> = {};
  for (const id of STEP_IDS) if ((value as Record<string, unknown>)[id] === true) out[id] = true;
  return out;
}

export function setTick(ticks: Ticks, id: StepId, done: boolean): Ticks {
  const next: Partial<Record<StepId, true>> = { ...ticks };
  if (done) next[id] = true;
  else delete next[id];
  return next;
}

export function doneCount(ticks: Ticks): number {
  return STEP_IDS.filter((id) => ticks[id] === true).length;
}

export function progressText(ticks: Ticks, lang: ReviewLang): string {
  return fill(pick(lang, '{done} of {total} steps ticked', '{done} sur {total} étapes cochées'), {
    done: doneCount(ticks),
    total: STEP_IDS.length,
  });
}

/** Which step the person should do next: the first one not ticked. Null when all are ticked. */
export function nextStep(ticks: Ticks): StepId | null {
  return STEP_IDS.find((id) => ticks[id] !== true) ?? null;
}

/**
 * A step can be marked as held back by what the review found. Only the steps that
 * depend on a clean review are held back, and the person can still tick them.
 */
export function heldBack(id: StepId, batch: BatchReview): boolean {
  if (batch.records.length === 0) return id !== 'review' && id !== 'licence' && id !== 'editor';
  if (batch.blockedCount === 0) return false;
  return id === 'tags' || id === 'changeset' || id === 'submit';
}

export function heldBackText(lang: ReviewLang): string {
  return pick(
    lang,
    'Some observations still have an item to fix. Fix them first, or leave them out of what you submit.',
    'Certaines observations ont encore un point à corriger. Corrigez-les d’abord, ou laissez-les de côté.',
  );
}
