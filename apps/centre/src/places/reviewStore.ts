/**
 * What a person has done on the review screen, kept on this device: which steps
 * they ticked, and which observations they chose to leave out of a submission.
 * Reads re-validate, so edited or damaged storage cannot put unchecked values on
 * screen. Nothing here leaves the device.
 */
import { cleanReviewTicks, setReviewTick, type StepId, type ReviewTicks } from "./docs-bridge.js";
import type { KeyValueStorage, SaveResult } from "./store.js";

export const REVIEW_KEY = "the-app-submit-review";
export const MAX_LEFT_OUT = 200;

export interface ReviewState {
  ticks: ReviewTicks;
  /** Observation ids the person left out of what they submit. */
  leftOut: string[];
}

export interface ReviewStore {
  read(): ReviewState;
  setTick(step: StepId, done: boolean): SaveResult;
  setLeftOut(id: string, left: boolean): SaveResult;
  /** Drops left-out ids that no longer match a saved observation. */
  prune(existingIds: readonly string[]): void;
  clear(): void;
}

const EMPTY: ReviewState = { ticks: {}, leftOut: [] };

export function parseReviewState(raw: string | null): ReviewState {
  if (raw === null) return { ...EMPTY, leftOut: [] };
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return { ...EMPTY, leftOut: [] };
    const record = value as { ticks?: unknown; leftOut?: unknown };
    const ids = Array.isArray(record.leftOut)
      ? record.leftOut.filter((item): item is string => typeof item === "string" && item !== "" && item.length <= 120)
      : [];
    return { ticks: cleanReviewTicks(record.ticks), leftOut: [...new Set(ids)].slice(0, MAX_LEFT_OUT) };
  } catch {
    return { ...EMPTY, leftOut: [] };
  }
}

export function createReviewStore(storage: KeyValueStorage): ReviewStore {
  function read(): ReviewState {
    try {
      return parseReviewState(storage.getItem(REVIEW_KEY));
    } catch {
      return { ...EMPTY, leftOut: [] };
    }
  }
  function write(state: ReviewState): SaveResult {
    try {
      storage.setItem(REVIEW_KEY, JSON.stringify(state));
      return { ok: true };
    } catch (error) {
      const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
      return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
    }
  }
  return {
    read,
    setTick(step, done) {
      const state = read();
      return write({ ...state, ticks: setReviewTick(state.ticks, step, done) });
    },
    setLeftOut(id, left) {
      const state = read();
      const rest = state.leftOut.filter((item) => item !== id);
      return write({ ...state, leftOut: left ? [...rest, id].slice(0, MAX_LEFT_OUT) : rest });
    },
    prune(existingIds) {
      const state = read();
      const keep = new Set(existingIds);
      const next = state.leftOut.filter((id) => keep.has(id));
      if (next.length !== state.leftOut.length) write({ ...state, leftOut: next });
    },
    clear() {
      try {
        storage.removeItem(REVIEW_KEY);
      } catch {
        /* nothing to clear */
      }
    },
  };
}

/** Removes the review state from this device. Called when the person clears their places data. */
export function clearReviewData(storage: KeyValueStorage): void {
  createReviewStore(storage).clear();
}
