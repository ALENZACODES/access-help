import { describe, expect, it } from "vitest";
import { PARTNER_ROUTE } from "./partner.js";
import peerRequestSchema from "../schemas/peer-request.schema.json" with { type: "json" };
import matchOfferSchema from "../schemas/match-offer.schema.json" with { type: "json" };
import { validateMatchOffer, validatePartnerRoute, validatePeerRequest } from "./validate.js";
import { COARSE_CITIES, PEER_TOPICS } from "./vocab.js";

const request = {
  id: "req-1",
  topic: "travel",
  language: "fr",
  city: "ottawa",
  note: "Short practical note.",
  ageConfirmed16Plus: true,
  createdAt: "2026-11-15T12:00:00.000Z",
  demonstration: true,
  tier: 0,
  prototypeLabel: "PROTOTYPE-UNVERIFIED",
  source: "typed on this device by the person making the request",
  licence: "not a third-party dataset; kept on this device",
  sourceDate: "2026-11-15",
  recordDate: "2026-11-15",
};

const offer = {
  id: "offer-1",
  requestId: "req-1",
  candidateId: "demo-profile-01",
  candidateOrdinal: 1,
  topic: "travel",
  language: "en",
  matchedOn: "topic_language",
  demonstrationIntroduction: true,
  deliveredToCandidate: false,
  assessesMedicalSuitability: false,
  createdAt: "2026-11-15T12:00:00.000Z",
  demonstration: true,
  tier: 0,
  prototypeLabel: "PROTOTYPE-UNVERIFIED",
  source: "computed on this device",
  licence: "not a third-party dataset",
  sourceDate: "2026-11-15",
  recordDate: "2026-11-15",
};

describe("peer request schema", () => {
  it("accepts a valid request", () => {
    expect(validatePeerRequest(request)).toMatchObject({ valid: true, errors: [] });
  });

  it.each([
    ["a topic outside the fixed list", { topic: "catheters" }],
    ["a free-text city", { city: "12 Main Street" }],
    ["an unconfirmed age", { ageConfirmed16Plus: false }],
    ["a health field", { diagnosis: "none" }],
    ["an injury-level field", { injuryLevel: "C5" }],
    ["tier 3", { tier: 3 }],
    ["VERIFIED", { prototypeLabel: "VERIFIED" }],
    ["a note over 280 characters", { note: "x".repeat(281) }],
  ])("rejects %s", (_name, change) => {
    expect(validatePeerRequest({ ...request, ...change }).valid).toBe(false);
  });

  it.each(["source", "licence", "sourceDate", "recordDate", "tier", "prototypeLabel"])(
    "requires %s",
    (field) => {
      const copy: Record<string, unknown> = { ...request };
      delete copy[field];
      expect(validatePeerRequest(copy).valid).toBe(false);
    },
  );

  it("keeps schema enums in step with the TypeScript lists", () => {
    expect(peerRequestSchema.properties.topic.enum).toEqual([...PEER_TOPICS]);
    expect(peerRequestSchema.properties.city.enum).toEqual([...COARSE_CITIES]);
    expect(matchOfferSchema.properties.topic.enum).toEqual([...PEER_TOPICS]);
    expect(matchOfferSchema.properties.city.enum).toEqual([...COARSE_CITIES]);
  });
});

describe("match offer schema", () => {
  it("accepts a valid offer", () => {
    expect(validateMatchOffer(offer).valid).toBe(true);
    expect(validateMatchOffer({ ...offer, matchedOn: "topic_language_city", city: "toronto" }).valid).toBe(true);
  });

  it("requires a city when the offer says it matched on city", () => {
    expect(validateMatchOffer({ ...offer, matchedOn: "topic_language_city" }).valid).toBe(false);
  });

  it("rejects an offer that claims delivery or suitability", () => {
    expect(validateMatchOffer({ ...offer, deliveredToCandidate: true }).valid).toBe(false);
    expect(validateMatchOffer({ ...offer, assessesMedicalSuitability: true }).valid).toBe(false);
    expect(validateMatchOffer({ ...offer, demonstrationIntroduction: false }).valid).toBe(false);
  });
});

describe("partner route schema", () => {
  it("accepts the shipped route", () => {
    expect(validatePartnerRoute(PARTNER_ROUTE).valid).toBe(true);
  });

  it("keeps the official address Unknown and the link a placeholder", () => {
    expect(PARTNER_ROUTE.officialUrl).toBe("Unknown");
    expect(PARTNER_ROUTE.demonstrationUrl).toBe("https://example.invalid/peer-programme");
    expect(validatePartnerRoute({ ...PARTNER_ROUTE, officialUrl: "https://example.org/" }).valid).toBe(false);
    expect(validatePartnerRoute({ ...PARTNER_ROUTE, demonstrationUrl: "https://example.org/x" }).valid).toBe(false);
  });

  it("is a link only, not a referral or an endorsement", () => {
    expect(validatePartnerRoute({ ...PARTNER_ROUTE, referralDecision: true }).valid).toBe(false);
    expect(validatePartnerRoute({ ...PARTNER_ROUTE, claimsEndorsement: true }).valid).toBe(false);
    expect(validatePartnerRoute({ ...PARTNER_ROUTE, linkOnly: false }).valid).toBe(false);
  });
});
