import { describe, expect, it } from "vitest";
import { SAMPLE_ROUTING_TABLE } from "../testing/routing-fixture.js";
import connectionRequestSchema from "../../schemas/connection-request.schema.json" with { type: "json" };
import { CRISIS_REDIRECT } from "../submit.js";
import { CONSENT_ITEMS } from "./consent.js";
import { AUDIT_REASONS, REQUEST_STATES, verifyAudit } from "./moderation.js";
import { closeRequest, createConnectionRequest, sharedView, withdrawRequestConsent } from "./request.js";
import type { ConnectionDraft, ConnectionRequest } from "./request.js";
import { RECORDED_ROUTING_TABLE } from "./routing.js";
import { validateConnectionRequest } from "./validate.js";
import { LIFE_CONTEXTS, REGIONS } from "./vocab.js";

const NOW = "2026-11-16T10:00:00.000Z";
const LATER = "2026-11-16T11:00:00.000Z";
const ALL = { prepare_summary: true, include_contexts: true, include_region: true, include_language: true, include_note: true };
const base: ConnectionDraft = {
  forWhom: "myself",
  contexts: ["work"],
  region: "eastern_ontario",
  language: "en",
  ageConfirmed16Plus: true,
  consent: ALL,
};
const sample = { now: NOW, id: "req-1", table: SAMPLE_ROUTING_TABLE };
const recorded = { now: NOW, id: "req-1", table: RECORDED_ROUTING_TABLE };

function accepted(draft: ConnectionDraft, context = sample): ConnectionRequest {
  const result = createConnectionRequest(draft, context);
  if (result.kind !== "accepted") throw new Error(`expected accepted, got ${JSON.stringify(result)}`);
  return result.request;
}

describe("createConnectionRequest", () => {
  it("accepts a valid request, records provenance and says the App sent nothing", () => {
    const request = accepted({ ...base, note: "Going back to work part time." });
    expect(request).toMatchObject({
      id: "req-1",
      forWhom: "myself",
      contexts: ["work"],
      region: "eastern_ontario",
      language: "en",
      note: "Going back to work part time.",
      sentByApp: false,
      tier: 0,
      prototypeLabel: "PROTOTYPE-UNVERIFIED",
      recordDate: "2026-11-16",
      routingTableId: "routing-table-sample",
    });
    expect(validateConnectionRequest(request)).toMatchObject({ valid: true, errors: [] });
  });

  it("with the recorded table, leaves the stream Unknown and the request received", () => {
    const request = accepted(base, recorded);
    expect(request.route).toEqual({ kind: "unknown", reason: "no_streams_recorded" });
    expect(request.moderation.state).toBe("received");
    expect(request.moderation.audit.map((entry) => entry.action)).toEqual(["created"]);
    expect(validateConnectionRequest(request).valid).toBe(true);
  });

  it("routes when a sample rule matches and writes it to the audit trail", () => {
    const request = accepted(base);
    expect(request.route).toMatchObject({ kind: "stream", streamId: "sample-stream-a", ruleScope: "region" });
    expect(request.moderation.state).toBe("routed");
    expect(request.moderation.audit.map((entry) => entry.action)).toEqual(["created", "routed"]);
    expect(verifyAudit(request.moderation)).toBe(true);
  });

  it("does not use a region the person did not agree to share", () => {
    const request = accepted({ ...base, contexts: ["parenting"], consent: { ...ALL, include_region: false } });
    expect(request.route).toEqual({ kind: "unknown", reason: "no_stream_for_region" });
    expect(request.moderation.state).toBe("received");
    const shared = accepted({ ...base, contexts: ["parenting"] });
    expect(shared.route).toMatchObject({ kind: "stream", streamId: "sample-stream-b" });
  });

  it("marks a request made for someone else as needing review and does not route it", () => {
    const request = accepted({ ...base, forWhom: "someone_i_support" });
    expect(request.moderation.state).toBe("needs_review");
    expect(request.moderation.tier).toBe("programme_review");
    expect(request.moderation.audit.at(-1)).toMatchObject({
      actor: "device",
      action: "flagged_for_review",
      reason: "on_behalf_of_another_person",
    });
    expect(validateConnectionRequest(request).valid).toBe(true);
  });

  it("stores contexts in closed-list order without duplicates", () => {
    expect(accepted({ ...base, contexts: ["work", "new_injury", "work"] }).contexts).toEqual(["new_injury", "work"]);
  });

  it("omits an empty region and note", () => {
    const request = accepted({ ...base, region: "", note: "   " });
    expect("region" in request).toBe(false);
    expect("note" in request).toBe(false);
  });

  it.each<[string, Partial<ConnectionDraft>, string]>([
    ["no age confirmation", { ageConfirmed16Plus: false }, "age_out_of_scope"],
    ["an unknown answer to who it is for", { forWhom: "my patient" }, "invalid_for_whom"],
    ["no context", { contexts: [] }, "no_context"],
    ["four contexts", { contexts: ["work", "school", "parenting", "new_injury"] }, "too_many_contexts"],
    ["a diagnosis as a context", { contexts: ["paraplegia"] }, "invalid_context"],
    ["an injury level as a context", { contexts: ["work", "C5"] }, "invalid_context"],
    ["a city as a region", { region: "ottawa" }, "invalid_region"],
    ["an unknown language", { language: "es" }, "invalid_language"],
    ["a note over the limit", { note: "x".repeat(281) }, "note_too_long"],
    ["no consent at all", { consent: undefined }, "consent_required"],
    ["consent to optional items only", { consent: { include_region: true, include_note: true } }, "consent_required"],
    ["consent without the contexts item", { consent: { ...ALL, include_contexts: false } }, "consent_required"],
  ])("rejects %s", (_name, change, code) => {
    const result = createConnectionRequest({ ...base, ...change }, sample);
    expect(result).toMatchObject({ kind: "rejected_input", code });
  });

  it("says which required consent items are missing", () => {
    const result = createConnectionRequest({ ...base, consent: { prepare_summary: true } }, sample);
    expect(result).toEqual({ kind: "rejected_input", code: "consent_required", missingConsent: ["include_contexts"] });
  });

  it.each([
    ["a diagnosis label", "I am quadriplegic and want to talk about work", "health_detail"],
    ["an injury level", "T4, back at work soon", "health_detail"],
    ["a clinical question", "which medication helps", "medical_advice"],
    ["a phone number", "call 416-555-0100", "personal_data"],
  ])("refuses a note with %s and keeps nothing", (_name, note, code) => {
    const result = createConnectionRequest({ ...base, note }, sample);
    expect(result.kind).toBe("refused");
    if (result.kind !== "refused") return;
    expect(result.codes).toContain(code);
    expect(JSON.stringify(result)).not.toContain(note);
  });

  it("interrupts with the crisis redirect before any other check, and keeps nothing", () => {
    const result = createConnectionRequest(
      { forWhom: "", contexts: [], language: "", ageConfirmed16Plus: false, note: "I want to end my life" },
      sample,
    );
    expect(result).toBe(CRISIS_REDIRECT);
    expect(result).toMatchObject({ kind: "crisis", stored: false });
    expect(JSON.stringify(result)).not.toMatch(/end my life/);
  });

  it("reuses the crisis contacts the package already publishes and adds none", () => {
    expect(CRISIS_REDIRECT.contacts.map((contact) => contact.id)).toEqual([
      "emergency_911",
      "crisis_988",
      "connexontario",
    ]);
  });
});

describe("what is prepared for sharing", () => {
  it("holds only the items the person agreed to", () => {
    const request = accepted({
      ...base,
      note: "Going back to work.",
      consent: { prepare_summary: true, include_contexts: true },
    });
    expect(sharedView(request)).toEqual({ contexts: ["work"] });
    const full = accepted({ ...base, note: "Going back to work." });
    expect(sharedView(full)).toEqual({
      contexts: ["work"],
      region: "eastern_ontario",
      language: "en",
      note: "Going back to work.",
    });
  });

  it("is nothing at all once consent is withdrawn", () => {
    const request = accepted(base);
    const result = withdrawRequestConsent(request, LATER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(sharedView(result.request)).toBeNull();
    expect(result.request.consent.revokedAt).toBe(LATER);
    expect(result.request.moderation.state).toBe("closed");
    expect(result.request.moderation.audit.at(-1)).toMatchObject({
      actor: "person",
      action: "closed",
      reason: "consent_withdrawn",
      at: LATER,
    });
    expect(validateConnectionRequest(result.request).valid).toBe(true);
    expect(request.consent.revokedAt).toBeUndefined();
  });

  it("cannot be withdrawn or closed twice", () => {
    const first = withdrawRequestConsent(accepted(base), LATER);
    if (!first.ok) throw new Error("expected ok");
    expect(withdrawRequestConsent(first.request, LATER)).toEqual({ ok: false, code: "already_closed" });
    expect(closeRequest(first.request, LATER)).toEqual({ ok: false, code: "already_closed" });
  });

  it("can be closed by the person without withdrawing consent", () => {
    const result = closeRequest(accepted(base), LATER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.moderation.audit.at(-1)?.reason).toBe("withdrawn_by_person");
    expect(result.request.consent.revokedAt).toBeUndefined();
    expect(validateConnectionRequest(result.request).valid).toBe(true);
  });
});

describe("connection request schema", () => {
  const request = accepted({ ...base, note: "Going back to work." });

  it.each([
    ["a diagnosis field", { diagnosis: "none" }],
    ["an injury-level field", { injuryLevel: "C5" }],
    ["a health field", { health: "x" }],
    ["a name field", { name: "x" }],
    ["an email field", { email: "a@example.org" }],
    ["a phone field", { phone: "x" }],
    ["a claim that the App sent it", { sentByApp: true }],
    ["an unconfirmed age", { ageConfirmed16Plus: false }],
    ["a context outside the list", { contexts: ["catheters"] }],
    ["four contexts", { contexts: ["work", "school", "parenting", "new_injury"] }],
    ["a free-text region", { region: "12 Main Street" }],
    ["a note over 280 characters", { note: "x".repeat(281) }],
    ["tier 3", { tier: 3 }],
    ["VERIFIED", { prototypeLabel: "VERIFIED" }],
    ["a state outside the model", { moderation: { ...request.moderation, state: "matched" } }],
    ["free text in the audit trail", { moderation: { ...request.moderation, audit: [{ ...request.moderation.audit[0], comment: "x" }] } }],
    ["a missing required consent item", { consent: { ...request.consent, items: { ...request.consent.items, prepare_summary: false } } }],
    ["a routed state without a stream", { route: { kind: "unknown", reason: "no_streams_recorded" } }],
    ["withdrawn consent on an open request", { consent: { ...request.consent, revokedAt: LATER } }],
    ["a broken audit trail", { moderation: { ...request.moderation, audit: [request.moderation.audit[1]] } }],
  ])("rejects %s", (_name, change) => {
    expect(validateConnectionRequest({ ...request, ...change }).valid).toBe(false);
  });

  it.each(["source", "licence", "sourceDate", "recordDate", "tier", "prototypeLabel", "consent", "moderation", "sentByApp"])(
    "requires %s",
    (field) => {
      const copy: Record<string, unknown> = { ...request };
      delete copy[field];
      expect(validateConnectionRequest(copy).valid).toBe(false);
    },
  );

  it("keeps schema enums in step with the TypeScript lists", () => {
    const props = connectionRequestSchema.properties;
    expect(props.contexts.items.enum).toEqual([...LIFE_CONTEXTS]);
    expect(props.region.enum).toEqual([...REGIONS]);
    expect(props.moderation.properties.state.enum).toEqual([...REQUEST_STATES]);
    expect(props.moderation.properties.audit.items.properties.reason.enum).toEqual([...AUDIT_REASONS]);
    expect(Object.keys(props.consent.properties.items.properties)).toEqual([...CONSENT_ITEMS]);
  });

  it("has no field for a diagnosis, an injury level, a name or a contact detail", () => {
    const names = JSON.stringify(Object.keys(connectionRequestSchema.properties));
    expect(names).not.toMatch(/diagnos|injur|health|condition|name|email|phone|address|contact/i);
    expect(JSON.stringify(LIFE_CONTEXTS)).not.toMatch(/pleg|paraly|spinal|cervical|thoracic|lumbar|complete|level|diagnos/i);
  });
});
