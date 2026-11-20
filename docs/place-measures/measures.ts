/**
 * Measured facts about the way into one place: steps, the door, a ramp and the wheelchair
 * toilet. They sit beside an observation and never change it. A fact nobody measured is null,
 * which every screen and file writes as UNKNOWN. Nothing here turns a measurement into a
 * judgment about who can use the place.
 */
import { isIsoDay } from '../presubmit/text.js';

export type YesNo = 'yes' | 'no';
export type DoorOpening = 'automatic' | 'button' | 'manual';
export type Method = 'tape' | 'estimate';

export const DOOR_OPENINGS: readonly DoorOpening[] = ['automatic', 'button', 'manual'];
export const METHODS: readonly Method[] = ['tape', 'estimate'];

export interface Measures {
  /** The id of the observation these facts belong to. */
  recordId: string;
  /** The day the person measured, YYYY-MM-DD. */
  measuredOn: string;
  /** How the lengths were taken. Null when the person did not say. */
  method: Method | null;
  /** Steps at the entrance the person used. 0 means they counted none. */
  steps: number | null;
  /** Height of the highest single step, in centimetres. */
  stepHeightCm: number | null;
  /** Clear width of the entrance door, in centimetres. */
  doorWidthCm: number | null;
  doorOpening: DoorOpening | null;
  ramp: YesNo | null;
  toilet: YesNo | null;
  /** Clear width of the door of the wheelchair toilet, in centimetres. */
  toiletDoorCm: number | null;
}

export const LIMITS = {
  steps: { min: 0, max: 60 },
  stepHeightCm: { min: 0.5, max: 60 },
  doorWidthCm: { min: 30, max: 400 },
  toiletDoorCm: { min: 30, max: 250 },
} as const;

export const FACT_KEYS = ['steps', 'stepHeightCm', 'doorWidthCm', 'doorOpening', 'ramp', 'toilet', 'toiletDoorCm'] as const;
export type FactKey = (typeof FACT_KEYS)[number];

/** A real calendar day written YYYY-MM-DD. */
export function isRealDay(value: string): boolean {
  return isIsoDay(value);
}

export function emptyMeasures(recordId: string, measuredOn: string): Measures {
  return { recordId, measuredOn, method: null, steps: null, stepHeightCm: null, doorWidthCm: null, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null };
}

/** The facts that were measured, in a fixed order. */
export function knownFacts(measures: Measures): FactKey[] {
  return FACT_KEYS.filter((key) => measures[key] !== null);
}

/**
 * The facts that are still UNKNOWN and could be measured. A step height is not asked for when
 * no step was counted, and a toilet door is not asked for when there is no wheelchair toilet.
 */
export function unknownFacts(measures: Measures): FactKey[] {
  return FACT_KEYS.filter((key) => {
    if (measures[key] !== null) return false;
    if (key === 'stepHeightCm' && measures.steps === 0) return false;
    if (key === 'toiletDoorCm' && measures.toilet === 'no') return false;
    return true;
  });
}

export function hasAnyFact(measures: Measures): boolean {
  return knownFacts(measures).length > 0;
}

function numberIn(value: unknown, limits: { min: number; max: number }, whole: boolean): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < limits.min || value > limits.max) return null;
  if (whole) return Number.isInteger(value) ? value : null;
  return Math.round(value * 10) / 10;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/**
 * Reads stored measures. Anything out of range or of the wrong kind becomes null, so damaged
 * storage shows UNKNOWN and never a made-up number. Null when the entry cannot be used at all.
 */
export function cleanMeasures(value: unknown): Measures | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.recordId !== 'string' || item.recordId === '' || item.recordId.length > 200) return null;
  if (typeof item.measuredOn !== 'string' || !isRealDay(item.measuredOn)) return null;
  const steps = numberIn(item.steps, LIMITS.steps, true);
  const toilet = oneOf<YesNo>(item.toilet, ['yes', 'no']);
  const clean: Measures = {
    recordId: item.recordId,
    measuredOn: item.measuredOn,
    method: oneOf(item.method, METHODS),
    steps,
    stepHeightCm: steps === 0 ? null : numberIn(item.stepHeightCm, LIMITS.stepHeightCm, false),
    doorWidthCm: numberIn(item.doorWidthCm, LIMITS.doorWidthCm, false),
    doorOpening: oneOf(item.doorOpening, DOOR_OPENINGS),
    ramp: oneOf<YesNo>(item.ramp, ['yes', 'no']),
    toilet,
    toiletDoorCm: toilet === 'no' ? null : numberIn(item.toiletDoorCm, LIMITS.toiletDoorCm, false),
  };
  return hasAnyFact(clean) ? clean : null;
}
