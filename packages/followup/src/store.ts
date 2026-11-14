import { lintText, type LintRule } from "./lint.js";
import { validateQuestions, validateTriage } from "./validate.js";
import type { Disposition, OwnerRole, QuestionEntry, RecordDefect, TriageItem } from "./types.js";

/** The subset of localStorage the store needs. */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface QuestionDraft {
  question: string;
  answerGiven: string;
  answerKind: "answered" | "deferred";
  followUpKind: "promised" | "none" | "";
  action: string;
  owner: OwnerRole | "";
  due: string;
  note: string;
  recordingAgreed: boolean;
}

export function emptyDraft(): QuestionDraft {
  return {
    question: "",
    answerGiven: "",
    answerKind: "answered",
    followUpKind: "",
    action: "",
    owner: "",
    due: "",
    note: "",
    recordingAgreed: false,
  };
}

/** Field names in the form, so a defect can point the person to the right control. */
export type DraftField = "question" | "answerGiven" | "followUpKind" | "action" | "owner" | "due" | "note" | "recordingAgreed";

const RULE_FIELD: Record<string, DraftField> = {
  "recording-not-agreed": "recordingAgreed",
  question: "question",
  answer: "answerGiven",
  "follow-up-missing": "followUpKind",
  "no-follow-up-note": "note",
  "deferred-without-follow-up": "followUpKind",
  "follow-up-action": "action",
  "follow-up-owner": "owner",
  "follow-up-due": "due",
};

export function draftToEntry(draft: QuestionDraft, id: string): { entry: QuestionEntry; problems: { field: DraftField; defect: RecordDefect }[] } {
  const entry: QuestionEntry = {
    id,
    question: draft.question.trim(),
    answerGiven: draft.answerGiven.trim(),
    answerKind: draft.answerKind,
    followUp:
      draft.followUpKind === "promised"
        ? { kind: "promised", action: draft.action.trim(), owner: draft.owner as OwnerRole, due: draft.due }
        : draft.followUpKind === "none"
          ? { kind: "none", note: draft.note.trim() }
          : (undefined as unknown as QuestionEntry["followUp"]),
    recordingAgreed: draft.recordingAgreed,
  };
  const problems = validateQuestions([entry]).map((defect) => ({
    field: RULE_FIELD[defect.rule] ?? fieldForText(defect.rule, draft),
    defect,
  }));
  return { entry, problems };
}

/** A text rule fired on one of the free-text fields. Find which one. */
function fieldForText(rule: string, draft: QuestionDraft): DraftField {
  const lintRule = rule.replace(/^text-/, "") as LintRule;
  for (const field of ["question", "answerGiven", "action", "note"] as const) {
    if (lintText(draft[field], [lintRule]).length > 0) return field;
  }
  return "question";
}

export interface StoredState {
  format: "device-questions-1.0.0";
  questions: QuestionEntry[];
  triage: Record<string, Pick<TriageItem, "disposition" | "owner" | "due" | "reason">>;
}

export interface QuestionsStore {
  load(): StoredState;
  add(draft: QuestionDraft): { ok: true; entry: QuestionEntry } | { ok: false; problems: { field: DraftField; defect: RecordDefect }[] };
  setTriage(id: string, value: Partial<Pick<TriageItem, "disposition" | "owner" | "due" | "reason">>): StoredState;
  remove(id: string): StoredState;
  clear(): void;
  /** Triage items built from the stored rows. Rows not yet triaged are left out. */
  triageItems(): TriageItem[];
  triageDefects(date: string): RecordDefect[];
  /** True when the device refused storage and the log lives only in memory. */
  readonly memoryOnly: boolean;
}

export const STORAGE_KEY = "access-help.follow-up.questions.v1";

function emptyState(): StoredState {
  return { format: "device-questions-1.0.0", questions: [], triage: {} };
}

function memory(): KeyValue {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/**
 * Keeps the questions log on this device. Nothing is sent anywhere. If the
 * browser refuses storage, the log is kept in memory and the screen says so.
 */
export function createQuestionsStore(storage?: KeyValue | null): QuestionsStore {
  let backing: KeyValue = storage ?? memory();
  let memoryOnly = !storage;
  try {
    backing.getItem(STORAGE_KEY);
  } catch {
    backing = memory();
    memoryOnly = true;
  }

  const read = (): StoredState => {
    try {
      const raw = backing.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw) as StoredState;
      return parsed?.format === "device-questions-1.0.0" && Array.isArray(parsed.questions) ? parsed : emptyState();
    } catch {
      return emptyState();
    }
  };
  const write = (state: StoredState): StoredState => {
    try {
      backing.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      backing = memory();
      memoryOnly = true;
      backing.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    return state;
  };
  const nextId = (questions: QuestionEntry[]) => {
    const highest = questions.reduce((max, entry) => Math.max(max, Number(/^Q(\d+)$/.exec(entry.id)?.[1] ?? 0)), 0);
    return `Q${String(highest + 1).padStart(2, "0")}`;
  };

  const store: QuestionsStore = {
    get memoryOnly() {
      return memoryOnly;
    },
    load: read,
    add(draft) {
      const state = read();
      const { entry, problems } = draftToEntry(draft, nextId(state.questions));
      if (problems.length > 0) return { ok: false, problems };
      write({ ...state, questions: [...state.questions, entry] });
      return { ok: true, entry };
    },
    setTriage(id, value) {
      const state = read();
      const current = state.triage[id] ?? { disposition: "" as Disposition, owner: null, due: null };
      return write({ ...state, triage: { ...state.triage, [id]: { ...current, ...value } } });
    },
    remove(id) {
      const state = read();
      const triage = { ...state.triage };
      delete triage[id];
      return write({ ...state, questions: state.questions.filter((entry) => entry.id !== id), triage });
    },
    clear() {
      try {
        backing.removeItem(STORAGE_KEY);
      } catch {
        // Nothing stored to remove.
      }
    },
    triageItems() {
      const state = read();
      return state.questions
        .filter((entry) => state.triage[entry.id]?.disposition)
        .map((entry) => ({
          id: `T-${entry.id}`,
          origin: { kind: "question" as const, ref: entry.id },
          summary: entry.question,
          disposition: state.triage[entry.id]!.disposition,
          owner: state.triage[entry.id]!.owner,
          due: state.triage[entry.id]!.due,
          ...(state.triage[entry.id]!.reason ? { reason: state.triage[entry.id]!.reason } : {}),
        }));
    },
    triageDefects(date) {
      return validateTriage({ date, items: store.triageItems() }, read().questions);
    },
  };
  return store;
}
