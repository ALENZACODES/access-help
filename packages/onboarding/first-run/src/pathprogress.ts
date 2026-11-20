import { ONBOARDING_PATHS, type OnboardingPath } from "../../src/paths";
import type { Locale } from "../../switch-first/src/index";
import type { KeyValueStore } from "./store";

/**
 * Which steps of the short paths a person has marked as done, saved on this
 * device only. Ticking a step is the person's own record; the App never ticks
 * a step for them, and nothing here leaves the device. Unknown path or step
 * ids in saved data are dropped, so an old save can never point at a step
 * that no longer exists.
 */
export const PATH_PROGRESS_KEY = "app.onboarding.pathProgress.v1";

/** Path id to the ids of its steps marked done, in the path's own step order. */
export type PathProgress = Readonly<Record<string, readonly string[]>>;

function pathById(id: string): OnboardingPath | undefined {
  return ONBOARDING_PATHS.find((p) => p.id === id);
}

/** Keeps only real steps of real paths, once each, in step order. Paths with nothing done are left out. */
export function cleanProgress(data: unknown): PathProgress {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: Record<string, string[]> = {};
  for (const [pid, v] of Object.entries(data as Record<string, unknown>)) {
    const path = pathById(pid);
    if (!path || !Array.isArray(v)) continue;
    const wanted = new Set(v.filter((x): x is string => typeof x === "string"));
    const steps = path.steps.map((s) => s.id).filter((sid) => wanted.has(sid));
    if (steps.length > 0) out[pid] = steps;
  }
  return out;
}

export function parseProgress(raw: string | null | undefined): PathProgress {
  if (!raw) return {};
  try {
    return cleanProgress(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function loadProgress(store: KeyValueStore | undefined): PathProgress {
  if (!store) return {};
  try {
    return parseProgress(store.getItem(PATH_PROGRESS_KEY));
  } catch {
    return {};
  }
}

export function saveProgress(store: KeyValueStore | undefined, progress: PathProgress): "saved" | "unavailable" {
  if (!store) return "unavailable";
  try {
    const clean = cleanProgress(progress);
    if (Object.keys(clean).length === 0) store.removeItem(PATH_PROGRESS_KEY);
    else store.setItem(PATH_PROGRESS_KEY, JSON.stringify(clean));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function isDone(progress: PathProgress, pathId: string, stepId: string): boolean {
  return (progress[pathId] ?? []).includes(stepId);
}

/** Marks one step done or not done. Unknown paths or steps change nothing. The input is not changed. */
export function setDone(progress: PathProgress, pathId: string, stepId: string, done: boolean): PathProgress {
  const path = pathById(pathId);
  if (!path || !path.steps.some((s) => s.id === stepId)) return progress;
  const current = new Set(progress[pathId] ?? []);
  if (done) current.add(stepId);
  else current.delete(stepId);
  return cleanProgress({ ...progress, [pathId]: [...current] });
}

/** Clears one path's ticks, so the person can start it again. */
export function resetPath(progress: PathProgress, pathId: string): PathProgress {
  const out: Record<string, readonly string[]> = { ...progress };
  delete out[pathId];
  return out;
}

export function doneCount(progress: PathProgress, pathId: string): number {
  return (progress[pathId] ?? []).length;
}

/** The first step not yet done, or undefined when every step is done. */
export function nextStepIndex(progress: PathProgress, path: OnboardingPath): number | undefined {
  const i = path.steps.findIndex((s) => !isDone(progress, path.id, s.id));
  return i === -1 ? undefined : i;
}

/** "2 of 3 steps done", "2 étapes faites sur 3". */
export function progressText(done: number, total: number, locale: Locale): string {
  if (locale === "fr") return `${done} ${done > 1 ? "étapes faites" : "étape faite"} sur ${total}`;
  return `${done} of ${total} ${total === 1 ? "step" : "steps"} done`;
}

/** Paths with some steps ticked and some not, in the help list's order. */
export function pathsInProgress(progress: PathProgress): OnboardingPath[] {
  return ONBOARDING_PATHS.filter((p) => {
    const done = doneCount(progress, p.id);
    return done > 0 && done < p.steps.length;
  });
}
