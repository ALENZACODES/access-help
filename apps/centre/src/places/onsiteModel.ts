/**
 * Builds what the on-site page shows: the place chooser, one question, or the review before
 * saving. Pure: the language, the day and the stored state come in as arguments and nothing
 * here reads the clock or storage.
 */
import {
  ONSITE_CHOICES,
  ONSITE_STEP_KIND,
  finishOnsite,
  measuresFor,
  onSiteNoteText,
  onsiteAnswerText,
  onsiteApplicableSteps,
  onsiteChangeLabel,
  onsiteChanges,
  onsiteChangesSummary,
  onsiteChoiceLabel,
  onsiteFilledInText,
  onsiteHasAnyAnswer,
  onsiteInUnit,
  onsiteLengthRange,
  onsiteNothingAnsweredText,
  onsitePositionText,
  onsiteProgress,
  onsiteProgressText,
  onsiteQuestion,
  onsiteStepShort,
  onsiteTip,
  measureFactLabel,
  measureFormFrom,
  type MeasureBook,
  type Measures,
  type OnsiteStep,
  type OnsiteUnit,
  type OnsiteWalk,
} from "./docs-bridge.js";
import { onsiteText } from "./onsiteStrings.js";
import type { Language, PlaceRecord } from "./types.js";

export function onsiteName(record: Pick<PlaceRecord, "name">, language: Language): string {
  return record.name === null || record.name.trim() === "" ? onsiteText(language, "unnamed") : record.name.trim();
}

const newestFirst = (a: PlaceRecord, b: PlaceRecord) => b.observedOn.localeCompare(a.observedOn) || a.id.localeCompare(b.id);

export interface OnsiteOption {
  id: string;
  label: string;
  measured: boolean;
}

export function onsiteOptions(records: readonly PlaceRecord[], book: MeasureBook, language: Language): OnsiteOption[] {
  return [...records].sort(newestFirst).map((record) => {
    const measured = measuresFor(book, record.id) !== null;
    return { id: record.id, measured, label: onsiteText(language, measured ? "optionMeasured" : "optionLabel", { name: onsiteName(record, language), day: record.observedOn }) };
  });
}

/** Opens on the newest observation with no measures yet, or the newest of all. */
export function startOnsiteId(records: readonly PlaceRecord[], book: MeasureBook): string | null {
  const sorted = [...records].sort(newestFirst);
  return (sorted.find((record) => measuresFor(book, record.id) === null) ?? sorted[0])?.id ?? null;
}

export interface StartScreen {
  kind: "start";
  options: OnsiteOption[];
  note: string;
}

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface QuestionScreen {
  kind: "question";
  name: string;
  step: OnsiteStep;
  control: "count" | "length" | "choice";
  position: string;
  progress: string;
  question: string;
  tip: string;
  /** The choices of a choice question. Empty otherwise. */
  choices: ChoiceOption[];
  /** The range the App keeps, for a length question. Empty otherwise. */
  range: string;
  /** What the field starts with: the kept answer, in the person's unit for a length. */
  value: string;
  /** Said when the kept answer came from an earlier visit. Empty otherwise. */
  filledIn: string;
  canGoBack: boolean;
}

export interface ReviewRow {
  step: OnsiteStep;
  label: string;
  answer: string;
  changeLabel: string;
}

export interface EffectRow {
  key: string;
  label: string;
  effect: string;
}

export interface ReviewScreen {
  kind: "review";
  name: string;
  progress: string;
  caption: string;
  rows: ReviewRow[];
  /** The measures saving would write. Null when nothing is answered or the answers cannot be saved. */
  measures: Measures | null;
  /** Why saving is not offered. Empty when it is. */
  blocked: string;
  effects: EffectRow[];
  effectsSummary: string;
}

export type OnsiteScreen = StartScreen | QuestionScreen | ReviewScreen;

/** The kept answer as a field value: a length is shown in the unit the person types in. */
export function fieldValue(walk: OnsiteWalk, step: OnsiteStep, unit: OnsiteUnit, language: Language): string {
  const kept = walk.answers[step];
  if (ONSITE_STEP_KIND[step] !== "length" || kept === "") return kept;
  const shown = onsiteInUnit(kept, unit);
  return language === "fr" ? shown.replace(".", ",") : shown;
}

/** Whether the kept answer is what was saved for the place before these questions began. */
export function isFilledIn(walk: OnsiteWalk, step: OnsiteStep, saved: Measures | null): boolean {
  if (saved === null || walk.answers[step] === "") return false;
  const form = measureFormFrom(saved, ".");
  const before: Record<OnsiteStep, string> = { steps: form.steps, stepHeight: form.stepHeight, ramp: form.ramp, doorWidth: form.doorWidth, doorOpening: form.doorOpening, toilet: form.toilet, toiletDoor: form.toiletDoor, method: form.method };
  return before[step] === walk.answers[step];
}

export function buildOnsiteScreen(records: readonly PlaceRecord[], book: MeasureBook, walk: OnsiteWalk | null, unit: OnsiteUnit, today: string, language: Language): OnsiteScreen {
  const record = walk === null ? undefined : records.find((entry) => entry.id === walk.recordId);
  if (walk === null || record === undefined) return { kind: "start", options: onsiteOptions(records, book, language), note: onSiteNoteText(language) };
  const name = onsiteName(record, language);
  const saved = measuresFor(book, record.id);
  const progress = onsiteProgress(walk);
  if (walk.at !== "review") {
    const step = walk.at;
    const control = ONSITE_STEP_KIND[step];
    return {
      kind: "question",
      name,
      step,
      control,
      position: onsitePositionText(progress, language),
      progress: onsiteProgressText(progress, language),
      question: onsiteQuestion(step, language),
      tip: onsiteTip(step, language),
      choices: (ONSITE_CHOICES[step] ?? []).map((value) => ({ value, label: onsiteChoiceLabel(step, value, language) })),
      range: step === "stepHeight" || step === "doorWidth" || step === "toiletDoor" ? onsiteLengthRange(step, unit, language) : "",
      value: fieldValue(walk, step, unit, language),
      filledIn: saved !== null && isFilledIn(walk, step, saved) ? onsiteFilledInText(saved.measuredOn, language) : "",
      canGoBack: progress.position !== null && progress.position > 1,
    };
  }
  const rows = onsiteApplicableSteps(walk.answers).map((step) => {
    const label = onsiteStepShort(step, language);
    return { step, label, answer: onsiteAnswerText(walk, step, language), changeLabel: onsiteText(language, "change", { name: label }) };
  });
  const base = { kind: "review" as const, name, progress: onsiteProgressText(progress, language), caption: onsiteText(language, "reviewCaption", { name }), rows };
  if (!onsiteHasAnyAnswer(walk)) return { ...base, measures: null, blocked: onsiteNothingAnsweredText(language), effects: [], effectsSummary: "" };
  const finished = finishOnsite(walk, { id: record.id, observedOn: record.observedOn }, today);
  if (!finished.ok) return { ...base, measures: null, blocked: onsiteText(language, "cannotSave"), effects: [], effectsSummary: "" };
  const changes = onsiteChanges(saved, finished.measures);
  return {
    ...base,
    measures: finished.measures,
    blocked: "",
    effects: changes.map((change) => ({ key: change.key, label: measureFactLabel(change.key, language), effect: onsiteChangeLabel(change.kind, language) })),
    effectsSummary: onsiteChangesSummary(changes, language),
  };
}
