import { describe, expect, it } from "vitest";
import { DEMONSTRATION_PEERS } from "./candidates.js";
import { matchRequest } from "./matching.js";
import type { PeerRequest } from "./types.js";
import { validateMatchOffer } from "./validate.js";

const NOW = "2026-11-15T12:00:00.000Z";

function request(overrides: Partial<PeerRequest> = {}): PeerRequest {
  return {
    id: "req-1",
    topic: "public_transit",
    language: "en",
    ageConfirmed16Plus: true,
    createdAt: NOW,
    demonstration: true,
    tier: 0,
    prototypeLabel: "PROTOTYPE-UNVERIFIED",
    source: "typed on this device by the person making the request",
    licence: "not a third-party dataset; kept on this device",
    sourceDate: "2026-11-15",
    recordDate: "2026-11-15",
    ...overrides,
  };
}

describe("matchRequest", () => {
  it("returns no match when no profile shares topic and language", () => {
    expect(matchRequest(request({ topic: "travel", language: "fr" }), DEMONSTRATION_PEERS, NOW)).toEqual({ kind: "no_match" });
    expect(matchRequest(request(), [], NOW)).toEqual({ kind: "no_match" });
  });

  it("does not match on topic alone or language alone", () => {
    expect(matchRequest(request({ topic: "technology", language: "en" }), DEMONSTRATION_PEERS, NOW).kind).toBe("no_match");
    expect(matchRequest(request({ topic: "travel", language: "fr" }), DEMONSTRATION_PEERS, NOW).kind).toBe("no_match");
  });

  it("matches on topic and language", () => {
    const result = matchRequest(request({ topic: "travel" }), DEMONSTRATION_PEERS, NOW);
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    expect(result.offer).toMatchObject({
      candidateId: "demo-profile-04",
      matchedOn: "topic_language",
      demonstrationIntroduction: true,
      deliveredToCandidate: false,
      assessesMedicalSuitability: false,
    });
    expect("city" in result.offer).toBe(false);
    expect(validateMatchOffer(result.offer).valid).toBe(true);
  });

  it("prefers the same city when one is given", () => {
    const result = matchRequest(request({ city: "ottawa" }), DEMONSTRATION_PEERS, NOW);
    expect(result.kind === "match" && result.offer.candidateId).toBe("demo-profile-02");
    expect(result.kind === "match" && result.offer.matchedOn).toBe("topic_language_city");
    expect(result.kind === "match" && result.offer.city).toBe("ottawa");
  });

  it("falls back to topic and language when no profile is in the city", () => {
    const result = matchRequest(request({ city: "windsor" }), DEMONSTRATION_PEERS, NOW);
    expect(result.kind === "match" && result.offer.matchedOn).toBe("topic_language");
    expect(result.kind === "match" && result.offer.candidateId).toBe("demo-profile-01");
    expect(result.kind === "match" && "city" in result.offer).toBe(false);
  });

  it("is deterministic and ignores pool order", () => {
    const forward = matchRequest(request(), DEMONSTRATION_PEERS, NOW);
    const reversed = matchRequest(request(), [...DEMONSTRATION_PEERS].reverse(), NOW);
    expect(reversed).toEqual(forward);
    expect(matchRequest(request(), DEMONSTRATION_PEERS, NOW)).toEqual(forward);
  });

  it("never looks at the note", () => {
    const withNote = matchRequest(request({ note: "anything at all" }), DEMONSTRATION_PEERS, NOW);
    expect(withNote).toEqual(matchRequest(request(), DEMONSTRATION_PEERS, NOW));
  });
});
