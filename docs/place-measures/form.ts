/**
 * Checks what a person typed into the measuring form and turns it into measures. An empty
 * field stays UNKNOWN. A field that cannot be read is reported and nothing is saved, so a
 * typing slip never becomes a number on file.
 */
import { LIMITS, METHODS, DOOR_OPENINGS, hasAnyFact, isRealDay, type DoorOpening, type Measures, type Method, type YesNo } from './measures.js';
import { parseLength } from './units.js';

export interface MeasureForm {
  measuredOn: string;
  method: string;
  steps: string;
  stepHeight: string;
  doorWidth: string;
  doorOpening: string;
  ramp: string;
  toilet: string;
  toiletDoor: string;
}

export type FormField = keyof MeasureForm;
export const FORM_FIELDS: readonly FormField[] = ['measuredOn', 'method', 'steps', 'stepHeight', 'doorWidth', 'doorOpening', 'ramp', 'toilet', 'toiletDoor'];

export type FormIssueCode =
  | 'date-invalid'
  | 'date-future'
  | 'date-before-seen'
  | 'not-a-whole-number'
  | 'not-a-length'
  | 'too-small'
  | 'too-large'
  | 'height-without-steps'
  | 'toilet-door-without-toilet'
  | 'nothing-measured';

export interface FormIssue {
  field: FormField;
  code: FormIssueCode;
}

export type FormResult = { ok: true; measures: Measures } | { ok: false; issues: FormIssue[] };

export function emptyForm(today: string): MeasureForm {
  return { measuredOn: today, method: '', steps: '', stepHeight: '', doorWidth: '', doorOpening: '', ramp: '', toilet: '', toiletDoor: '' };
}

function choice<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function length(field: FormField, text: string, limits: { min: number; max: number }, issues: FormIssue[]): number | null {
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

export interface SeenOn {
  id: string;
  /** The day the place was observed, YYYY-MM-DD. */
  observedOn: string;
}

export function readForm(form: MeasureForm, record: SeenOn, today: string): FormResult {
  const issues: FormIssue[] = [];
  const measuredOn = form.measuredOn.trim();
  if (!isRealDay(measuredOn)) issues.push({ field: 'measuredOn', code: 'date-invalid' });
  else if (measuredOn > today) issues.push({ field: 'measuredOn', code: 'date-future' });
  else if (isRealDay(record.observedOn) && measuredOn < record.observedOn) issues.push({ field: 'measuredOn', code: 'date-before-seen' });

  let steps: number | null = null;
  const stepsText = form.steps.trim();
  if (stepsText !== '') {
    if (!/^\d{1,3}$/.test(stepsText)) issues.push({ field: 'steps', code: 'not-a-whole-number' });
    else if (Number(stepsText) > LIMITS.steps.max) issues.push({ field: 'steps', code: 'too-large' });
    else steps = Number(stepsText);
  }
  const stepHeightCm = length('stepHeight', form.stepHeight, LIMITS.stepHeightCm, issues);
  if (steps === 0 && form.stepHeight.trim() !== '') issues.push({ field: 'stepHeight', code: 'height-without-steps' });

  const doorWidthCm = length('doorWidth', form.doorWidth, LIMITS.doorWidthCm, issues);
  const toilet = choice<YesNo>(form.toilet, ['yes', 'no']);
  const toiletDoorCm = length('toiletDoor', form.toiletDoor, LIMITS.toiletDoorCm, issues);
  if (toilet === 'no' && form.toiletDoor.trim() !== '') issues.push({ field: 'toiletDoor', code: 'toilet-door-without-toilet' });

  const measures: Measures = {
    recordId: record.id,
    measuredOn,
    method: choice<Method>(form.method, METHODS),
    steps,
    stepHeightCm: steps === 0 ? null : stepHeightCm,
    doorWidthCm,
    doorOpening: choice<DoorOpening>(form.doorOpening, DOOR_OPENINGS),
    ramp: choice<YesNo>(form.ramp, ['yes', 'no']),
    toilet,
    toiletDoorCm: toilet === 'no' ? null : toiletDoorCm,
  };
  if (issues.length === 0 && !hasAnyFact(measures)) issues.push({ field: 'steps', code: 'nothing-measured' });
  return issues.length > 0 ? { ok: false, issues } : { ok: true, measures };
}

/** Puts saved measures back into the form, in the person's decimal style. */
export function formFrom(measures: Measures, decimal: '.' | ','): MeasureForm {
  const cm = (value: number | null) => (value === null ? '' : String(value).replace('.', decimal));
  return {
    measuredOn: measures.measuredOn,
    method: measures.method ?? '',
    steps: measures.steps === null ? '' : String(measures.steps),
    stepHeight: cm(measures.stepHeightCm),
    doorWidth: cm(measures.doorWidthCm),
    doorOpening: measures.doorOpening ?? '',
    ramp: measures.ramp ?? '',
    toilet: measures.toilet ?? '',
    toiletDoor: cm(measures.toiletDoorCm),
  };
}

export function issuesFor(issues: readonly FormIssue[], field: FormField): FormIssue[] {
  return issues.filter((issue) => issue.field === field);
}
