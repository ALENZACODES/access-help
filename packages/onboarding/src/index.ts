export * from "./paths.js";

export {
  initialState,
  reduce,
  visibleSteps,
  renderStep,
  attachRovingFocus,
  SCAN_INTERVALS_MS,
  COPY as SWITCH_FIRST_COPY,
  COPY_META as SWITCH_FIRST_META,
  secondsLabel,
} from "../switch-first/src/index.ts";
export type {
  FirstRunState,
  FirstRunAction,
  MoveMode,
  StepId,
  ScanMs,
} from "../switch-first/src/index.ts";
