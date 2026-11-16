/**
 * State, moderation tier and audit trail for one peer-connection request.
 *
 * This is a model kept on the device. No reviewer is connected to the App: the screens
 * only ever act as "person" or "device". The "reviewer" actor exists so that a partner
 * programme's review step can be described and tested before any such step is agreed.
 */
export const REQUEST_STATES = ["received", "needs_review", "routed", "closed"] as const;
export type RequestState = (typeof REQUEST_STATES)[number];

/** Tiers only rise. The tier records the highest level of attention a request reached. */
export const MODERATION_TIERS = ["device_screen", "programme_review", "safeguarding"] as const;
export type ModerationTier = (typeof MODERATION_TIERS)[number];

export const ACTORS = ["person", "device", "reviewer"] as const;
export type Actor = (typeof ACTORS)[number];

export const AUDIT_ACTIONS = [
  "created",
  "flagged_for_review",
  "escalated",
  "review_cleared",
  "routed",
  "closed",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Closed list of reasons. An audit entry never carries free text. */
export const AUDIT_REASONS = [
  "request_created",
  "on_behalf_of_another_person",
  "review_requested",
  "safeguarding_concern",
  "review_complete",
  "stream_recorded",
  "consent_withdrawn",
  "withdrawn_by_person",
  "closed_after_review",
] as const;
export type AuditReason = (typeof AUDIT_REASONS)[number];

export interface AuditEntry {
  seq: number;
  at: string;
  actor: Actor;
  action: AuditAction;
  from: RequestState | null;
  to: RequestState;
  reason: AuditReason;
}

export interface Moderation {
  state: RequestState;
  tier: ModerationTier;
  audit: AuditEntry[];
}

export type ModerationEvent =
  | { type: "flag_for_review"; actor: "device" | "reviewer"; reason: "on_behalf_of_another_person" | "review_requested" }
  | { type: "escalate"; actor: "device" | "reviewer" }
  | { type: "clear_review"; actor: "reviewer" }
  | { type: "route"; actor: "device" | "reviewer" }
  | { type: "close"; actor: "person"; reason: "consent_withdrawn" | "withdrawn_by_person" }
  | { type: "close"; actor: "reviewer"; reason: "closed_after_review" };

export type TransitionError =
  | "already_closed"
  | "not_allowed_from_state"
  | "review_pending"
  | "actor_not_allowed"
  | "time_goes_backwards";

export type TransitionResult = { ok: true; moderation: Moderation } | { ok: false; code: TransitionError };

function tierRank(tier: ModerationTier): number {
  return MODERATION_TIERS.indexOf(tier);
}

function raise(current: ModerationTier, wanted: ModerationTier): ModerationTier {
  return tierRank(wanted) > tierRank(current) ? wanted : current;
}

function append(
  moderation: Moderation,
  at: string,
  entry: Pick<AuditEntry, "actor" | "action" | "to" | "reason">,
  tier: ModerationTier,
): Moderation {
  return {
    state: entry.to,
    tier,
    audit: [
      ...moderation.audit,
      { seq: moderation.audit.length + 1, at, from: moderation.state, ...entry },
    ],
  };
}

/** A new request starts as received, at the device-screen tier, with one audit entry. */
export function openModeration(at: string): Moderation {
  return {
    state: "received",
    tier: "device_screen",
    audit: [
      { seq: 1, at, actor: "person", action: "created", from: null, to: "received", reason: "request_created" },
    ],
  };
}

const EVENT_ACTORS: Record<ModerationEvent["type"], readonly Actor[]> = {
  flag_for_review: ["device", "reviewer"],
  escalate: ["device", "reviewer"],
  clear_review: ["reviewer"],
  route: ["device", "reviewer"],
  close: ["person", "reviewer"],
};

/**
 * Apply one event. The input is never changed; a refused event returns a code and
 * leaves no trace, so the audit trail holds only what actually happened.
 */
export function applyEvent(moderation: Moderation, event: ModerationEvent, at: string): TransitionResult {
  if (!EVENT_ACTORS[event.type].includes(event.actor)) {
    return { ok: false, code: "actor_not_allowed" };
  }
  if (moderation.state === "closed") {
    return { ok: false, code: "already_closed" };
  }
  const last = moderation.audit[moderation.audit.length - 1];
  if (last && at < last.at) {
    return { ok: false, code: "time_goes_backwards" };
  }
  const { state, tier } = moderation;
  switch (event.type) {
    case "flag_for_review":
      if (state !== "received") {
        return { ok: false, code: "not_allowed_from_state" };
      }
      return {
        ok: true,
        moderation: append(
          moderation,
          at,
          { actor: event.actor, action: "flagged_for_review", to: "needs_review", reason: event.reason },
          raise(tier, "programme_review"),
        ),
      };
    case "escalate":
      return {
        ok: true,
        moderation: append(
          moderation,
          at,
          { actor: event.actor, action: "escalated", to: "needs_review", reason: "safeguarding_concern" },
          "safeguarding",
        ),
      };
    case "clear_review":
      if (state !== "needs_review") {
        return { ok: false, code: "not_allowed_from_state" };
      }
      return {
        ok: true,
        moderation: append(
          moderation,
          at,
          { actor: "reviewer", action: "review_cleared", to: "received", reason: "review_complete" },
          tier,
        ),
      };
    case "route":
      if (state === "needs_review") {
        return { ok: false, code: "review_pending" };
      }
      if (state !== "received") {
        return { ok: false, code: "not_allowed_from_state" };
      }
      return {
        ok: true,
        moderation: append(
          moderation,
          at,
          { actor: event.actor, action: "routed", to: "routed", reason: "stream_recorded" },
          tier,
        ),
      };
    case "close":
      return {
        ok: true,
        moderation: append(
          moderation,
          at,
          { actor: event.actor, action: "closed", to: "closed", reason: event.reason },
          tier,
        ),
      };
  }
}

const ACTION_ACTORS: Record<AuditAction, readonly Actor[]> = {
  created: ["person"],
  flagged_for_review: ["device", "reviewer"],
  escalated: ["device", "reviewer"],
  review_cleared: ["reviewer"],
  routed: ["device", "reviewer"],
  closed: ["person", "reviewer"],
};

const NEXT_STATE: Record<AuditAction, RequestState> = {
  created: "received",
  flagged_for_review: "needs_review",
  escalated: "needs_review",
  review_cleared: "received",
  routed: "routed",
  closed: "closed",
};

/**
 * Check that an audit trail is whole: numbered from 1 without gaps, starts with
 * "created", every entry starts where the last one ended, time never runs backwards,
 * nothing follows a close, and the recorded state and tier agree with the trail.
 */
export function verifyAudit(moderation: Moderation): boolean {
  const { audit } = moderation;
  const first = audit[0];
  if (!first || first.action !== "created" || first.from !== null || first.actor !== "person") {
    return false;
  }
  let state: RequestState | null = null;
  let previousAt = "";
  let tier: ModerationTier = "device_screen";
  for (const [index, entry] of audit.entries()) {
    if (entry.seq !== index + 1 || entry.from !== state || entry.at < previousAt) {
      return false;
    }
    if (state === "closed" || (index > 0 && entry.action === "created")) {
      return false;
    }
    if (entry.to !== NEXT_STATE[entry.action] || !ACTION_ACTORS[entry.action]?.includes(entry.actor)) {
      return false;
    }
    if (entry.action === "routed" && entry.from !== "received") {
      return false;
    }
    if (entry.action === "review_cleared" && (entry.from !== "needs_review" || entry.actor !== "reviewer")) {
      return false;
    }
    if (entry.action === "flagged_for_review") {
      tier = raise(tier, "programme_review");
    }
    if (entry.action === "escalated") {
      tier = "safeguarding";
    }
    state = entry.to;
    previousAt = entry.at;
  }
  return state === moderation.state && tier === moderation.tier;
}
