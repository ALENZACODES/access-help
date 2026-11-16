import { CRISIS_REDIRECT } from "../submit.js";
import type { CrisisRedirect, Provenance } from "../types.js";
import { NOTE_MAX, isLanguage } from "../vocab.js";
import type { Language } from "../vocab.js";
import { allows, grantConsent, isConsentActive, missingRequiredConsent, normaliseChoices, withdrawConsent } from "./consent.js";
import type { ConsentItem, ConsentRecord } from "./consent.js";
import { screenConnectText } from "./health-screen.js";
import type { ConnectHoldCode } from "./health-screen.js";
import { applyEvent, openModeration } from "./moderation.js";
import type { Moderation } from "./moderation.js";
import { routeRequest } from "./routing.js";
import type { RouteOutcome, RoutingTable } from "./routing.js";
import { CONTEXTS_MAX, CONTEXTS_MIN, isForWhom, isLifeContext, isRegion, orderContexts } from "./vocab.js";
import type { ForWhom, LifeContext, Region } from "./vocab.js";

/**
 * A peer-connection request kept on this device.
 * There is deliberately no diagnosis, injury-level or health field, no name and no
 * contact detail. The App sends the request nowhere: `sentByApp` is always false.
 */
export interface ConnectionRequest extends Provenance {
  id: string;
  forWhom: ForWhom;
  contexts: LifeContext[];
  region?: Region;
  language: Language;
  note?: string;
  ageConfirmed16Plus: true;
  consent: ConsentRecord;
  moderation: Moderation;
  route: RouteOutcome;
  routingTableId: string;
  sentByApp: false;
  createdAt: string;
}

export interface ConnectionDraft {
  forWhom: string;
  contexts: readonly string[];
  region?: string;
  language: string;
  note?: string;
  ageConfirmed16Plus: boolean;
  consent?: Partial<Record<ConsentItem, unknown>>;
}

export interface ConnectionContext {
  /** ISO 8601 date-time. Injected so tests and replays are deterministic. */
  now: string;
  id: string;
  table: RoutingTable;
}

export type ConnectionRejectCode =
  | "age_out_of_scope"
  | "invalid_for_whom"
  | "no_context"
  | "too_many_contexts"
  | "invalid_context"
  | "invalid_region"
  | "invalid_language"
  | "note_too_long"
  | "consent_required";

export type ConnectionResult =
  | { kind: "accepted"; request: ConnectionRequest }
  | CrisisRedirect
  | { kind: "refused"; codes: ConnectHoldCode[] }
  | { kind: "rejected_input"; code: ConnectionRejectCode; missingConsent?: ConsentItem[] };

/** The parts of a request that the person agreed may be prepared for sharing. */
export interface SharedView {
  contexts: LifeContext[];
  region?: Region;
  language?: Language;
  note?: string;
}

export function sharedView(request: ConnectionRequest): SharedView | null {
  if (!isConsentActive(request.consent)) {
    return null;
  }
  return {
    contexts: [...request.contexts],
    ...(request.region && allows(request.consent, "include_region") ? { region: request.region } : {}),
    ...(allows(request.consent, "include_language") ? { language: request.language } : {}),
    ...(request.note && allows(request.consent, "include_note") ? { note: request.note } : {}),
  };
}

/**
 * Validate a draft and turn it into a connection request.
 * Crisis wording is checked first, so anyone in distress sees the crisis contacts
 * whatever else is wrong with the form, and that text is never kept.
 * Routing uses only what the person agreed to share: a region that is not shared is
 * not used, and the outcome is then Unknown unless a rule covers any region.
 */
export function createConnectionRequest(draft: ConnectionDraft, context: ConnectionContext): ConnectionResult {
  const note = (draft.note ?? "").trim();
  const screened = screenConnectText(note);
  if (screened.decision === "crisis") {
    return CRISIS_REDIRECT;
  }
  if (draft.ageConfirmed16Plus !== true) {
    return { kind: "rejected_input", code: "age_out_of_scope" };
  }
  if (!isForWhom(draft.forWhom)) {
    return { kind: "rejected_input", code: "invalid_for_whom" };
  }
  if (!draft.contexts.every(isLifeContext)) {
    return { kind: "rejected_input", code: "invalid_context" };
  }
  const contexts = orderContexts(draft.contexts as readonly LifeContext[]);
  if (contexts.length < CONTEXTS_MIN) {
    return { kind: "rejected_input", code: "no_context" };
  }
  if (contexts.length > CONTEXTS_MAX) {
    return { kind: "rejected_input", code: "too_many_contexts" };
  }
  const region = draft.region ?? "";
  if (region !== "" && !isRegion(region)) {
    return { kind: "rejected_input", code: "invalid_region" };
  }
  if (!isLanguage(draft.language)) {
    return { kind: "rejected_input", code: "invalid_language" };
  }
  if (note.length > NOTE_MAX) {
    return { kind: "rejected_input", code: "note_too_long" };
  }
  if (screened.decision === "hold") {
    return { kind: "refused", codes: screened.codes };
  }
  const choices = normaliseChoices(draft.consent);
  const consent = grantConsent(choices, context.now);
  if (!consent) {
    return { kind: "rejected_input", code: "consent_required", missingConsent: missingRequiredConsent(choices) };
  }

  const useRegion = region !== "" && isRegion(region) && choices.include_region;
  const route = routeRequest({ contexts, ...(useRegion ? { region } : {}) }, context.table);

  let moderation = openModeration(context.now);
  if (draft.forWhom === "someone_i_support") {
    const flagged = applyEvent(
      moderation,
      { type: "flag_for_review", actor: "device", reason: "on_behalf_of_another_person" },
      context.now,
    );
    if (flagged.ok) {
      moderation = flagged.moderation;
    }
  } else if (route.kind === "stream") {
    const routed = applyEvent(moderation, { type: "route", actor: "device" }, context.now);
    if (routed.ok) {
      moderation = routed.moderation;
    }
  }

  const date = context.now.slice(0, 10);
  const request: ConnectionRequest = {
    id: context.id,
    forWhom: draft.forWhom,
    contexts,
    ...(region !== "" && isRegion(region) ? { region } : {}),
    language: draft.language,
    ...(note !== "" ? { note } : {}),
    ageConfirmed16Plus: true,
    consent,
    moderation,
    route,
    routingTableId: context.table.id,
    sentByApp: false,
    createdAt: context.now,
    tier: 0,
    prototypeLabel: "PROTOTYPE-UNVERIFIED",
    source: "typed on this device by the person making the request",
    licence: "not a third-party dataset; kept on this device",
    sourceDate: date,
    recordDate: date,
  };
  return { kind: "accepted", request };
}

export type ChangeResult =
  | { ok: true; request: ConnectionRequest }
  | { ok: false; code: "already_closed" | "time_goes_backwards" };

function close(
  request: ConnectionRequest,
  reason: "consent_withdrawn" | "withdrawn_by_person",
  at: string,
): ChangeResult {
  const closed = applyEvent(request.moderation, { type: "close", actor: "person", reason }, at);
  if (!closed.ok) {
    return { ok: false, code: closed.code === "time_goes_backwards" ? "time_goes_backwards" : "already_closed" };
  }
  return { ok: true, request: { ...request, moderation: closed.moderation } };
}

/**
 * Withdraw consent. The request closes, the withdrawal is written to the audit trail,
 * and no summary can be prepared from it again. A copy the person already shared
 * themselves is outside the App and cannot be recalled by it.
 */
export function withdrawRequestConsent(request: ConnectionRequest, at: string): ChangeResult {
  const closed = close(request, "consent_withdrawn", at);
  if (!closed.ok) {
    return closed;
  }
  return { ok: true, request: { ...closed.request, consent: withdrawConsent(request.consent, at) } };
}

/** Close a request without withdrawing consent, for example because it is no longer needed. */
export function closeRequest(request: ConnectionRequest, at: string): ChangeResult {
  return close(request, "withdrawn_by_person", at);
}
