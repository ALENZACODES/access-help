/**
 * The numbers a person sets to look through their own measured places: at most so many steps,
 * a door at least so wide, and so on. The numbers are the person's own. The App suggests none,
 * holds no standard, and an empty field means "I do not mind". Pure: no network, no storage,
 * no clock.
 */
import { LIMITS, parseLength } from '../place-measures/index.js';

export type DoorNeed = 'any' | 'not-by-hand' | 'by-itself';
export const DOOR_NEEDS: readonly DoorNeed[] = ['any', 'not-by-hand', 'by-itself'];

export interface Criteria {
  /** At most this many steps at the entrance. Null when the person does not mind. */
  maxSteps: number | null;
  /** When true, a ramp counts in place of the step limits. */
  rampInstead: boolean;
  /** The highest step is at most this high, in centimetres. */
  maxStepHeightCm: number | null;
  /** The entrance door is at least this wide, in centimetres. */
  minDoorWidthCm: number | null;
  door: DoorNeed;
  /** When true, there has to be a wheelchair toilet. */
  toilet: boolean;
  /** The door of the wheelchair toilet is at least this wide, in centimetres. */
  minToiletDoorCm: number | null;
  /** When true, a fact the person did not measure may come from what the place said. */
  countTold: boolean;
}

export const CRITERION_KEYS = ['steps', 'stepHeight', 'doorWidth', 'door', 'toilet', 'toiletDoor'] as const;
export type CriterionKey = (typeof CRITERION_KEYS)[number];

export function emptyCriteria(): Criteria {
  return { maxSteps: null, rampInstead: false, maxStepHeightCm: null, minDoorWidthCm: null, door: 'any', toilet: false, minToiletDoorCm: null, countTold: false };
}

/** The criteria the person actually set, in a fixed order. */
export function setCriteria(criteria: Criteria): CriterionKey[] {
  const out: CriterionKey[] = [];
  if (criteria.maxSteps !== null) out.push('steps');
  if (criteria.maxStepHeightCm !== null) out.push('stepHeight');
  if (criteria.minDoorWidthCm !== null) out.push('doorWidth');
  if (criteria.door !== 'any') out.push('door');
  if (criteria.toilet) out.push('toilet');
  if (criteria.minToiletDoorCm !== null) out.push('toiletDoor');
  return out;
}

export function hasCriteria(criteria: Criteria): boolean {
  return setCriteria(criteria).length > 0;
}

export function isDoorNeed(value: unknown): value is DoorNeed {
  return typeof value === 'string' && (DOOR_NEEDS as readonly string[]).includes(value);
}

function numberIn(value: unknown, limits: { min: number; max: number }, whole: boolean): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < limits.min || value > limits.max) return null;
  return whole ? (Number.isInteger(value) ? value : null) : Math.round(value * 10) / 10;
}

/** Reads stored criteria. Anything out of range or of the wrong kind becomes "does not mind". */
export function cleanCriteria(value: unknown): Criteria {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return emptyCriteria();
  const item = value as Record<string, unknown>;
  return {
    maxSteps: numberIn(item.maxSteps, LIMITS.steps, true),
    rampInstead: item.rampInstead === true,
    maxStepHeightCm: numberIn(item.maxStepHeightCm, LIMITS.stepHeightCm, false),
    minDoorWidthCm: numberIn(item.minDoorWidthCm, LIMITS.doorWidthCm, false),
    door: isDoorNeed(item.door) ? item.door : 'any',
    toilet: item.toilet === true,
    minToiletDoorCm: numberIn(item.minToiletDoorCm, LIMITS.toiletDoorCm, false),
    countTold: item.countTold === true,
  };
}

export interface CriteriaForm {
  maxSteps: string;
  rampInstead: boolean;
  maxStepHeight: string;
  minDoorWidth: string;
  door: string;
  toilet: boolean;
  minToiletDoor: string;
  countTold: boolean;
}

export type CriteriaField = 'maxSteps' | 'maxStepHeight' | 'minDoorWidth' | 'minToiletDoor';
export type CriteriaIssueCode = 'not-a-whole-number' | 'not-a-length' | 'too-small' | 'too-large';

export interface CriteriaIssue {
  field: CriteriaField;
  code: CriteriaIssueCode;
}

export type CriteriaResult = { ok: true; criteria: Criteria } | { ok: false; issues: CriteriaIssue[] };

export function emptyCriteriaForm(): CriteriaForm {
  return { maxSteps: '', rampInstead: false, maxStepHeight: '', minDoorWidth: '', door: 'any', toilet: false, minToiletDoor: '', countTold: false };
}

function length(field: CriteriaField, text: string, limits: { min: number; max: number }, issues: CriteriaIssue[]): number | null {
  const parsed = parseLength(text);
  if (!parsed.ok) {
    if (parsed.code !== 'empty') issues.push({ field, code: parsed.code === 'negative' ? 'too-small' : 'not-a-length' });
    return null;
  }
  if (parsed.cm < limits.min) issues.push({ field, code: 'too-small' });
  else if (parsed.cm > limits.max) issues.push({ field, code: 'too-large' });
  else return parsed.cm;
  return null;
}

/** Checks what the person typed. An empty field means "I do not mind". Lengths may be typed in cm, m or inches. */
export function readCriteriaForm(form: CriteriaForm): CriteriaResult {
  const issues: CriteriaIssue[] = [];
  let maxSteps: number | null = null;
  const steps = form.maxSteps.trim();
  if (steps !== '') {
    if (!/^\d{1,3}$/.test(steps)) issues.push({ field: 'maxSteps', code: 'not-a-whole-number' });
    else if (Number(steps) > LIMITS.steps.max) issues.push({ field: 'maxSteps', code: 'too-large' });
    else maxSteps = Number(steps);
  }
  const criteria: Criteria = {
    maxSteps,
    rampInstead: form.rampInstead,
    maxStepHeightCm: length('maxStepHeight', form.maxStepHeight, LIMITS.stepHeightCm, issues),
    minDoorWidthCm: length('minDoorWidth', form.minDoorWidth, LIMITS.doorWidthCm, issues),
    door: isDoorNeed(form.door) ? form.door : 'any',
    toilet: form.toilet,
    minToiletDoorCm: length('minToiletDoor', form.minToiletDoor, LIMITS.toiletDoorCm, issues),
    countTold: form.countTold,
  };
  return issues.length > 0 ? { ok: false, issues } : { ok: true, criteria };
}

/** Puts criteria back into the form, in the person's decimal style. */
export function criteriaFormFrom(criteria: Criteria, decimal: '.' | ','): CriteriaForm {
  const cm = (value: number | null) => (value === null ? '' : String(value).replace('.', decimal));
  return {
    maxSteps: criteria.maxSteps === null ? '' : String(criteria.maxSteps),
    rampInstead: criteria.rampInstead,
    maxStepHeight: cm(criteria.maxStepHeightCm),
    minDoorWidth: cm(criteria.minDoorWidthCm),
    door: criteria.door,
    toilet: criteria.toilet,
    minToiletDoor: cm(criteria.minToiletDoorCm),
    countTold: criteria.countTold,
  };
}

export function sameCriteria(a: Criteria, b: Criteria): boolean {
  return JSON.stringify(cleanCriteria(a)) === JSON.stringify(cleanCriteria(b));
}
