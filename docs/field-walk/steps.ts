/**
 * The questions of a walk-through for measuring a place on site, one at a time. Pure: no
 * network, no storage, no clock. A question that does not apply is passed over: there is no
 * step height to ask about where no step was counted, and no toilet door where there is no
 * wheelchair toilet.
 */
export const WALK_STEPS = ['steps', 'stepHeight', 'ramp', 'doorWidth', 'doorOpening', 'toilet', 'toiletDoor', 'method'] as const;
export type WalkStep = (typeof WALK_STEPS)[number];

export type StepKind = 'count' | 'length' | 'choice';

export const STEP_KIND: Record<WalkStep, StepKind> = {
  steps: 'count',
  stepHeight: 'length',
  ramp: 'choice',
  doorWidth: 'length',
  doorOpening: 'choice',
  toilet: 'choice',
  toiletDoor: 'length',
  method: 'choice',
};

/** The values a choice question takes. The empty value is never among them: not answering is its own thing. */
export const STEP_CHOICES: Partial<Record<WalkStep, readonly string[]>> = {
  ramp: ['yes', 'no'],
  doorOpening: ['automatic', 'button', 'manual'],
  toilet: ['yes', 'no'],
  method: ['tape', 'estimate'],
};

export type Answers = Record<WalkStep, string>;

export function emptyAnswers(): Answers {
  return { steps: '', stepHeight: '', ramp: '', doorWidth: '', doorOpening: '', toilet: '', toiletDoor: '', method: '' };
}

export function isWalkStep(value: unknown): value is WalkStep {
  return typeof value === 'string' && (WALK_STEPS as readonly string[]).includes(value);
}

/** Whether a question is asked, given the answers so far. */
export function stepApplies(step: WalkStep, answers: Answers): boolean {
  if (step === 'stepHeight') return answers.steps.trim() !== '0';
  if (step === 'toiletDoor') return answers.toilet !== 'no';
  if (step === 'method') return ['stepHeight', 'doorWidth', 'toiletDoor'].some((key) => answers[key as WalkStep].trim() !== '');
  return true;
}

/** The questions that are asked, in order, given the answers so far. */
export function applicableSteps(answers: Answers): WalkStep[] {
  return WALK_STEPS.filter((step) => stepApplies(step, answers));
}

/** The question after this one that applies, or null when this is the last. */
export function stepAfter(step: WalkStep, answers: Answers): WalkStep | null {
  const index = WALK_STEPS.indexOf(step);
  return WALK_STEPS.slice(index + 1).find((next) => stepApplies(next, answers)) ?? null;
}

/** The question before this one that applies, or null when this is the first. */
export function stepBefore(step: WalkStep, answers: Answers): WalkStep | null {
  const index = WALK_STEPS.indexOf(step);
  return [...WALK_STEPS.slice(0, index)].reverse().find((prev) => stepApplies(prev, answers)) ?? null;
}

/**
 * Clears answers to questions that no longer apply, so a step height typed before the person
 * went back and wrote "0 steps" is not saved.
 */
export function dropInapplicable(answers: Answers): Answers {
  const out = { ...answers };
  if (!stepApplies('stepHeight', out)) out.stepHeight = '';
  if (!stepApplies('toiletDoor', out)) out.toiletDoor = '';
  if (!stepApplies('method', out)) out.method = '';
  return out;
}
