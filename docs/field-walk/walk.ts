/**
 * One walk-through at one place: where the person is, what they answered, what they skipped.
 * A skipped question stays UNKNOWN. Nothing is saved to the person's measures until they say
 * so at the end.
 */
import { STEP_CHOICES, STEP_KIND, WALK_STEPS, applicableSteps, dropInapplicable, emptyAnswers, isWalkStep, stepAfter, stepApplies, stepBefore, type Answers, type WalkStep } from './steps.js';
import { LIMITS, formFrom, parseLength, type Measures } from '../place-measures/index.js';
import { isIsoDay } from '../presubmit/text.js';

export interface Walk {
  version: 1;
  recordId: string;
  /** The day the walk-through began, YYYY-MM-DD. It becomes the day of the measures. */
  startedOn: string;
  /** The question on screen, or "review" at the end. */
  at: WalkStep | 'review';
  answers: Answers;
  /** Questions the person chose to skip. They stay UNKNOWN. */
  skipped: WalkStep[];
}

const LENGTH_LIMITS = { stepHeight: LIMITS.stepHeightCm, doorWidth: LIMITS.doorWidthCm, toiletDoor: LIMITS.toiletDoorCm } as const;

/** Starts at the first question. Measures already saved for the place are filled in, so a second visit adds to the first. */
export function beginWalk(recordId: string, today: string, saved: Measures | null): Walk {
  const answers = emptyAnswers();
  if (saved !== null) {
    const form = formFrom(saved, '.');
    Object.assign(answers, { steps: form.steps, stepHeight: form.stepHeight, ramp: form.ramp, doorWidth: form.doorWidth, doorOpening: form.doorOpening, toilet: form.toilet, toiletDoor: form.toiletDoor, method: form.method });
  }
  return { version: 1, recordId, startedOn: today, at: 'steps', answers: dropInapplicable(answers), skipped: [] };
}

export type AnswerIssue = 'not-a-whole-number' | 'not-a-length' | 'too-small' | 'too-large' | 'not-a-choice' | 'empty';
export type AnswerResult = { ok: true; walk: Walk } | { ok: false; issue: AnswerIssue };

/** Checks one answer. Returns the value as it is kept: a whole number, centimetres, or a choice. */
export function checkAnswer(step: WalkStep, value: string): { ok: true; value: string } | { ok: false; issue: AnswerIssue } {
  const text = value.trim();
  if (text === '') return { ok: false, issue: 'empty' };
  const kind = STEP_KIND[step];
  if (kind === 'count') {
    if (!/^\d{1,3}$/.test(text)) return { ok: false, issue: 'not-a-whole-number' };
    if (Number(text) > LIMITS.steps.max) return { ok: false, issue: 'too-large' };
    return { ok: true, value: String(Number(text)) };
  }
  if (kind === 'choice') return (STEP_CHOICES[step] ?? []).includes(text) ? { ok: true, value: text } : { ok: false, issue: 'not-a-choice' };
  const parsed = parseLength(text);
  if (!parsed.ok) return { ok: false, issue: parsed.code === 'negative' ? 'too-small' : 'not-a-length' };
  const limits = LENGTH_LIMITS[step as keyof typeof LENGTH_LIMITS];
  if (parsed.cm < limits.min) return { ok: false, issue: 'too-small' };
  if (parsed.cm > limits.max) return { ok: false, issue: 'too-large' };
  return { ok: true, value: String(parsed.cm) };
}

function moveOn(walk: Walk, step: WalkStep, answers: Answers, skipped: WalkStep[]): Walk {
  const clean = dropInapplicable(answers);
  return { ...walk, answers: clean, skipped: skipped.filter((entry) => stepApplies(entry, clean)), at: stepAfter(step, clean) ?? 'review' };
}

/** Keeps an answer and moves to the next question that applies. A bad answer changes nothing. */
export function answerStep(walk: Walk, step: WalkStep, value: string): AnswerResult {
  const checked = checkAnswer(step, value);
  if (!checked.ok) return checked;
  return { ok: true, walk: moveOn(walk, step, { ...walk.answers, [step]: checked.value }, walk.skipped.filter((entry) => entry !== step)) };
}

/** Skips a question: its answer is cleared, it stays UNKNOWN, and the walk moves on. */
export function skipStep(walk: Walk, step: WalkStep): Walk {
  return moveOn(walk, step, { ...walk.answers, [step]: '' }, walk.skipped.includes(step) ? walk.skipped : [...walk.skipped, step]);
}

/** Goes back one question that applies. From the review, goes to the last question. */
export function goBack(walk: Walk): Walk {
  if (walk.at === 'review') return { ...walk, at: applicableSteps(walk.answers).at(-1) ?? 'steps' };
  return { ...walk, at: stepBefore(walk.at, walk.answers) ?? walk.at };
}

/** Jumps to a question, as from the review. A question that does not apply is not opened. */
export function goToStep(walk: Walk, step: WalkStep): Walk {
  return stepApplies(step, walk.answers) ? { ...walk, at: step } : walk;
}

/**
 * After changing one answer from the review: back to the review, unless the change opened a
 * question that is neither answered nor skipped, which is asked first.
 */
export function backToReview(walk: Walk): Walk {
  const open = applicableSteps(walk.answers).find((step) => walk.answers[step] === '' && !walk.skipped.includes(step));
  return { ...walk, at: open ?? 'review' };
}

export interface WalkProgress {
  /** Questions that apply, given the answers so far. */
  total: number;
  answered: number;
  skipped: number;
  /** Neither answered nor skipped yet. */
  left: number;
  /** Position of the question on screen, counting from one. Null at the review. */
  position: number | null;
}

export function walkProgress(walk: Walk): WalkProgress {
  const steps = applicableSteps(walk.answers);
  const answered = steps.filter((step) => walk.answers[step] !== '').length;
  const skipped = steps.filter((step) => walk.answers[step] === '' && walk.skipped.includes(step)).length;
  return { total: steps.length, answered, skipped, left: steps.length - answered - skipped, position: walk.at === 'review' ? null : steps.indexOf(walk.at) + 1 };
}

export function hasAnyAnswer(walk: Walk): boolean {
  return WALK_STEPS.some((step) => step !== 'method' && walk.answers[step] !== '');
}

/** Reads a stored walk. Every answer is checked again; one that fails becomes unanswered. Null when it cannot be used. */
export function cleanWalk(value: unknown): Walk | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || typeof item.recordId !== 'string' || item.recordId === '' || item.recordId.length > 200) return null;
  if (typeof item.startedOn !== 'string' || !isIsoDay(item.startedOn)) return null;
  const raw = typeof item.answers === 'object' && item.answers !== null && !Array.isArray(item.answers) ? (item.answers as Record<string, unknown>) : {};
  const answers = emptyAnswers();
  for (const step of WALK_STEPS) {
    const stored = Object.prototype.hasOwnProperty.call(raw, step) ? raw[step] : '';
    if (typeof stored !== 'string' || stored === '') continue;
    const checked = checkAnswer(step, stored);
    if (checked.ok) answers[step] = checked.value;
  }
  const clean = dropInapplicable(answers);
  const skipped = Array.isArray(item.skipped) ? WALK_STEPS.filter((step) => (item.skipped as unknown[]).includes(step) && clean[step] === '' && stepApplies(step, clean)) : [];
  const at = item.at === 'review' ? 'review' : isWalkStep(item.at) && stepApplies(item.at, clean) ? item.at : 'steps';
  return { version: 1, recordId: item.recordId, startedOn: item.startedOn, at, answers: clean, skipped };
}
