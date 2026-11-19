import type { Pair } from "./copy";
import { inspectItem, getItem, type ItemId, type ItemReport } from "./inventory";
import { parsePrefs, PREFS_KEY, type KeyValueStore } from "./store";
import type { View } from "./view";

/**
 * "Next steps": the parts of the App a person can try, in a sensible order,
 * each with what is saved for it. A step is "saved" only when something for it
 * is actually saved on this device; it is "not yet" when nothing is; and it is
 * "unknown" when the browser will not let the App look or the saved text
 * cannot be read. The page never says a step was done well, only what is saved.
 * Nothing here is required, and the order is only a suggestion.
 */
export type StepId = "moving" | "display" | "first-note" | "must-haves" | "shortlist" | "plan";
export type StepState = "saved" | "not-yet" | "unknown";

export interface Step {
  readonly id: StepId;
  readonly title: Pair;
  readonly why: Pair;
  /** The screen the step's button opens. */
  readonly goes: View;
  /** The saved item that shows the step has been used. */
  readonly item: ItemId;
}

export const STEPS: readonly Step[] = [
  {
    id: "moving",
    title: { en: "Choose how you move around", fr: "Choisir comment vous vous déplacez" },
    why: { en: "Pick keyboard, switch or pointer, and your language.", fr: "Choisissez clavier, contacteur ou pointeur, et votre langue." },
    goes: { kind: "setup" },
    item: "prefs",
  },
  {
    id: "display",
    title: { en: "Adjust how the App looks", fr: "Ajuster l’apparence de l’App" },
    why: { en: "Change text size, spacing, contrast or motion.", fr: "Changez la taille du texte, l’espacement, le contraste ou les animations." },
    goes: { kind: "display" },
    item: "display",
  },
  {
    id: "first-note",
    title: { en: "Add a note about a place", fr: "Ajouter une note sur un lieu" },
    why: { en: "Write down what you know about one place. Details you leave out stay Unknown.", fr: "Notez ce que vous savez d’un lieu. Les détails omis restent UNKNOWN." },
    goes: { kind: "form" },
    item: "notes",
  },
  {
    id: "must-haves",
    title: { en: "Save your must-haves", fr: "Enregistrer vos incontournables" },
    why: { en: "Choose the details you need so the places list can use them.", fr: "Choisissez les détails dont vous avez besoin pour que la liste des lieux s’en serve." },
    goes: { kind: "notes" },
    item: "needs",
  },
  {
    id: "shortlist",
    title: { en: "Shortlist a place", fr: "Mettre un lieu sur la liste restreinte" },
    why: { en: "Keep the places you want to look at again.", fr: "Gardez les lieux que vous voulez revoir." },
    goes: { kind: "places" },
    item: "shortlist",
  },
  {
    id: "plan",
    title: { en: "Write plan notes for a visit", fr: "Rédiger des notes de plan pour une visite" },
    why: { en: "Note what to ask a place and what it said.", fr: "Notez quoi demander à un lieu et ce qu’il a répondu." },
    goes: { kind: "places" },
    item: "checklist",
  },
];

export function getStep(id: string | undefined): Step | undefined {
  return STEPS.find((s) => s.id === id);
}

export interface StepReport {
  readonly id: StepId;
  readonly state: StepState;
}

function stateOf(report: ItemReport): StepState {
  switch (report.state) {
    case "saved":
      return "saved";
    case "empty":
      return "not-yet";
    default:
      return "unknown";
  }
}

/** Reads the saved items once and answers for every step. */
export function stepReports(store: KeyValueStore | undefined): StepReport[] {
  return STEPS.map((s) => {
    const item = getItem(s.item);
    if (!item) return { id: s.id, state: "unknown" };
    const report = inspectItem(store, item);
    // "Choose how you move around" counts only when a way of moving or a language is really saved.
    if (s.id === "moving" && report.state === "saved") {
      let raw: string | null = null;
      try {
        raw = store?.getItem(PREFS_KEY) ?? null;
      } catch {
        return { id: s.id, state: "unknown" };
      }
      const p = parsePrefs(raw);
      return { id: s.id, state: p.mode !== undefined || p.locale !== undefined ? "saved" : "not-yet" };
    }
    return { id: s.id, state: stateOf(report) };
  });
}

export interface StepSummary {
  readonly saved: number;
  readonly total: number;
  readonly unknown: number;
  /** The first step that is not yet saved, as the suggested next one. */
  readonly next: StepId | undefined;
}

export function summariseSteps(reports: readonly StepReport[]): StepSummary {
  const saved = reports.filter((r) => r.state === "saved").length;
  const unknown = reports.filter((r) => r.state === "unknown").length;
  return { saved, total: reports.length, unknown, next: reports.find((r) => r.state === "not-yet")?.id };
}

export function stepsStrings(): Array<[string, Pair]> {
  return STEPS.flatMap((s): Array<[string, Pair]> => [
    [`device.step.${s.id}.title`, s.title],
    [`device.step.${s.id}.why`, s.why],
  ]);
}
