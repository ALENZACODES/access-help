import { screenRequestText } from "./screen.js";
import type { CrisisRedirect, PeerRequest, SubmitResult } from "./types.js";
import { NOTE_MAX, isCoarseCity, isLanguage, isTopic } from "./vocab.js";

export interface RequestDraft {
  topic: string;
  language: string;
  city?: string;
  note?: string;
  ageConfirmed16Plus: boolean;
}

export interface SubmitContext {
  /** ISO 8601 date-time. Injected so tests and replays are deterministic. */
  now: string;
  id: string;
}

/** Wording only. No phone numbers or links are stored here, and nothing clinical is said. */
export const CRISIS_REDIRECT: CrisisRedirect = {
  kind: "crisis",
  stored: false,
  contacts: [{ id: "emergency_911" }, { id: "crisis_988" }, { id: "connexontario" }],
};

/**
 * Validate a draft and turn it into a peer request.
 * Order matters. Crisis wording is checked first so that anyone in distress sees the
 * crisis contacts whatever else is wrong with the form. Crisis text is never stored.
 */
export function submitRequest(draft: RequestDraft, context: SubmitContext): SubmitResult {
  const note = (draft.note ?? "").trim();
  const screened = screenRequestText(note);
  if (screened.decision === "crisis") {
    return CRISIS_REDIRECT;
  }
  if (draft.ageConfirmed16Plus !== true) {
    return { kind: "rejected_input", code: "age_out_of_scope" };
  }
  if (!isTopic(draft.topic)) {
    return { kind: "rejected_input", code: "invalid_topic" };
  }
  if (!isLanguage(draft.language)) {
    return { kind: "rejected_input", code: "invalid_language" };
  }
  const city = draft.city ?? "";
  if (city !== "" && !isCoarseCity(city)) {
    return { kind: "rejected_input", code: "invalid_city" };
  }
  if (note.length > NOTE_MAX) {
    return { kind: "rejected_input", code: "note_too_long" };
  }
  if (screened.decision === "hold") {
    return { kind: "refused", codes: screened.codes };
  }
  const date = context.now.slice(0, 10);
  const request: PeerRequest = {
    id: context.id,
    topic: draft.topic,
    language: draft.language,
    ...(city !== "" && isCoarseCity(city) ? { city } : {}),
    ...(note !== "" ? { note } : {}),
    ageConfirmed16Plus: true,
    createdAt: context.now,
    demonstration: true,
    tier: 0,
    prototypeLabel: "PROTOTYPE-UNVERIFIED",
    source: "typed on this device by the person making the request",
    licence: "not a third-party dataset; kept on this device",
    sourceDate: date,
    recordDate: date,
  };
  return { kind: "accepted", request };
}
