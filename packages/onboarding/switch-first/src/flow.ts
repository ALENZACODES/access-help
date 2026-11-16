export type Locale = "en" | "fr";
export type MoveMode = "keyboard" | "switch" | "pointer";
export type StepId = "mode" | "scan" | "finish";

/** Scanning intervals offered (ms). Scanning is never started automatically. */
export const SCAN_INTERVALS_MS = [1000, 2000, 3000, 5000] as const;
export type ScanMs = (typeof SCAN_INTERVALS_MS)[number];

export interface FirstRunState {
  readonly step: StepId;
  /** undefined means UNKNOWN: never inferred, never defaulted. */
  readonly mode: MoveMode | undefined;
  /** undefined means unset (scanning off). */
  readonly scanMs: ScanMs | undefined;
}

export type FirstRunAction =
  | { readonly type: "choose-mode"; readonly mode: MoveMode }
  | { readonly type: "set-scan"; readonly ms: ScanMs }
  | { readonly type: "next" }
  | { readonly type: "back" }
  | { readonly type: "skip" };

export function initialState(): FirstRunState {
  return { step: "mode", mode: undefined, scanMs: undefined };
}

/** Steps shown for a state: the scan step only appears for single-switch users. */
export function visibleSteps(state: FirstRunState): readonly StepId[] {
  return state.mode === "switch" ? ["mode", "scan", "finish"] : ["mode", "finish"];
}

export function reduce(state: FirstRunState, action: FirstRunAction): FirstRunState {
  switch (action.type) {
    case "choose-mode": {
      // Changing away from switch drops the scan choice.
      const scanMs = action.mode === "switch" ? state.scanMs : undefined;
      return { ...state, mode: action.mode, scanMs };
    }
    case "set-scan":
      return state.mode === "switch" ? { ...state, scanMs: action.ms } : state;
    case "next": {
      const steps = visibleSteps(state);
      const i = steps.indexOf(state.step);
      const step = steps[Math.min(i + 1, steps.length - 1)] ?? "finish";
      return { ...state, step };
    }
    case "back": {
      const steps = visibleSteps(state);
      const i = steps.indexOf(state.step);
      const step = steps[Math.max(i - 1, 0)] ?? "mode";
      return { ...state, step };
    }
    case "skip":
      return { ...state, step: "finish" };
  }
}
