import { describe, expect, it } from "vitest";
import { MODERATION_TIERS, REQUEST_STATES, applyEvent, openModeration, verifyAudit } from "./moderation.js";
import type { Moderation, ModerationEvent } from "./moderation.js";

const T0 = "2026-11-16T10:00:00.000Z";
const T1 = "2026-11-16T10:05:00.000Z";
const T2 = "2026-11-16T10:10:00.000Z";
const T3 = "2026-11-16T10:15:00.000Z";

function must(moderation: Moderation, event: ModerationEvent, at: string): Moderation {
  const result = applyEvent(moderation, event, at);
  if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
  return result.moderation;
}

describe("request states and tiers", () => {
  it("has exactly the four states and three tiers", () => {
    expect(REQUEST_STATES).toEqual(["received", "needs_review", "routed", "closed"]);
    expect(MODERATION_TIERS).toEqual(["device_screen", "programme_review", "safeguarding"]);
  });

  it("opens as received at the device-screen tier with one audit entry", () => {
    const opened = openModeration(T0);
    expect(opened).toEqual({
      state: "received",
      tier: "device_screen",
      audit: [
        { seq: 1, at: T0, actor: "person", action: "created", from: null, to: "received", reason: "request_created" },
      ],
    });
    expect(verifyAudit(opened)).toBe(true);
  });

  it("routes a received request and writes the step to the trail", () => {
    const routed = must(openModeration(T0), { type: "route", actor: "device" }, T1);
    expect(routed.state).toBe("routed");
    expect(routed.tier).toBe("device_screen");
    expect(routed.audit.at(-1)).toEqual({
      seq: 2,
      at: T1,
      actor: "device",
      action: "routed",
      from: "received",
      to: "routed",
      reason: "stream_recorded",
    });
    expect(verifyAudit(routed)).toBe(true);
  });

  it("holds a flagged request until a reviewer clears it", () => {
    const flagged = must(
      openModeration(T0),
      { type: "flag_for_review", actor: "device", reason: "on_behalf_of_another_person" },
      T0,
    );
    expect(flagged.state).toBe("needs_review");
    expect(flagged.tier).toBe("programme_review");
    expect(applyEvent(flagged, { type: "route", actor: "device" }, T1)).toEqual({ ok: false, code: "review_pending" });

    const cleared = must(flagged, { type: "clear_review", actor: "reviewer" }, T1);
    expect(cleared.state).toBe("received");
    expect(cleared.tier).toBe("programme_review");
    const routed = must(cleared, { type: "route", actor: "reviewer" }, T2);
    expect(routed.state).toBe("routed");
    expect(routed.audit.map((entry) => entry.action)).toEqual(["created", "flagged_for_review", "review_cleared", "routed"]);
    expect(verifyAudit(routed)).toBe(true);
  });

  it("escalates to the safeguarding tier from any open state, and the tier never drops", () => {
    for (const start of [
      openModeration(T0),
      must(openModeration(T0), { type: "route", actor: "device" }, T0),
      must(openModeration(T0), { type: "flag_for_review", actor: "reviewer", reason: "review_requested" }, T0),
    ]) {
      const escalated = must(start, { type: "escalate", actor: "reviewer" }, T1);
      expect(escalated.state).toBe("needs_review");
      expect(escalated.tier).toBe("safeguarding");
      expect(escalated.audit.at(-1)?.reason).toBe("safeguarding_concern");
      const cleared = must(escalated, { type: "clear_review", actor: "reviewer" }, T2);
      expect(cleared.tier).toBe("safeguarding");
      expect(verifyAudit(cleared)).toBe(true);
    }
  });

  it("only lets a reviewer clear a review, and only lets the person or a reviewer close", () => {
    const flagged = must(openModeration(T0), { type: "flag_for_review", actor: "device", reason: "review_requested" }, T0);
    expect(applyEvent(flagged, { type: "clear_review", actor: "device" } as never, T1)).toEqual({
      ok: false,
      code: "actor_not_allowed",
    });
    expect(applyEvent(flagged, { type: "clear_review", actor: "person" } as never, T1)).toEqual({
      ok: false,
      code: "actor_not_allowed",
    });
    expect(applyEvent(flagged, { type: "close", actor: "device", reason: "withdrawn_by_person" } as never, T1)).toEqual({
      ok: false,
      code: "actor_not_allowed",
    });
    expect(applyEvent(flagged, { type: "route", actor: "person" } as never, T1)).toEqual({
      ok: false,
      code: "actor_not_allowed",
    });
  });

  it("closes from every open state and accepts nothing afterwards", () => {
    const closed = must(openModeration(T0), { type: "close", actor: "person", reason: "withdrawn_by_person" }, T1);
    expect(closed.state).toBe("closed");
    const events: ModerationEvent[] = [
      { type: "route", actor: "device" },
      { type: "escalate", actor: "reviewer" },
      { type: "flag_for_review", actor: "device", reason: "review_requested" },
      { type: "clear_review", actor: "reviewer" },
      { type: "close", actor: "person", reason: "consent_withdrawn" },
    ];
    for (const event of events) {
      expect(applyEvent(closed, event, T2)).toEqual({ ok: false, code: "already_closed" });
    }
    expect(closed.audit).toHaveLength(2);
    expect(verifyAudit(closed)).toBe(true);
  });

  it("refuses steps that do not fit the state, and leaves no trace of a refusal", () => {
    const opened = openModeration(T1);
    expect(applyEvent(opened, { type: "clear_review", actor: "reviewer" }, T2)).toEqual({
      ok: false,
      code: "not_allowed_from_state",
    });
    const routed = must(opened, { type: "route", actor: "device" }, T2);
    expect(applyEvent(routed, { type: "route", actor: "device" }, T3).ok).toBe(false);
    expect(applyEvent(routed, { type: "flag_for_review", actor: "device", reason: "review_requested" }, T3).ok).toBe(false);
    expect(applyEvent(opened, { type: "route", actor: "device" }, T0)).toEqual({ ok: false, code: "time_goes_backwards" });
    expect(opened.audit).toHaveLength(1);
    expect(routed.audit).toHaveLength(2);
  });

  it("never changes its input", () => {
    const opened = openModeration(T0);
    const frozen = JSON.stringify(opened);
    must(opened, { type: "escalate", actor: "device" }, T1);
    expect(JSON.stringify(opened)).toBe(frozen);
  });
});

describe("verifyAudit", () => {
  const good = must(
    must(openModeration(T0), { type: "flag_for_review", actor: "device", reason: "review_requested" }, T1),
    { type: "close", actor: "reviewer", reason: "closed_after_review" },
    T2,
  );

  it("accepts a trail built by the transitions", () => {
    expect(verifyAudit(good)).toBe(true);
  });

  it.each<[string, (m: Moderation) => Moderation]>([
    ["an empty trail", (m) => ({ ...m, audit: [] })],
    ["a removed entry", (m) => ({ ...m, audit: [m.audit[0]!, m.audit[2]!] })],
    ["a renumbered entry", (m) => ({ ...m, audit: m.audit.map((entry, i) => (i === 1 ? { ...entry, seq: 5 } : entry)) })],
    ["a state that does not match the trail", (m) => ({ ...m, state: "routed" })],
    ["a tier that does not match the trail", (m) => ({ ...m, tier: "device_screen" })],
    ["time running backwards", (m) => ({ ...m, audit: m.audit.map((entry, i) => (i === 2 ? { ...entry, at: "2026-11-15T00:00:00.000Z" } : entry)) })],
    ["an entry after a close", (m) => ({ ...m, audit: [...m.audit, { ...m.audit[1]!, seq: 4, from: "closed" as const }] })],
    ["a rewritten destination", (m) => ({ ...m, audit: m.audit.map((entry, i) => (i === 1 ? { ...entry, to: "routed" as const } : entry)) })],
    ["a review cleared by the device", (m) => ({
      state: "received" as const,
      tier: "programme_review" as const,
      audit: [m.audit[0]!, m.audit[1]!, { seq: 3, at: T2, actor: "device" as const, action: "review_cleared" as const, from: "needs_review" as const, to: "received" as const, reason: "review_complete" as const }],
    })],
  ])("rejects %s", (_name, damage) => {
    expect(verifyAudit(damage(good))).toBe(false);
  });
});
