import type { CoarseCity, Language, PeerTopic } from "./vocab.js";

/**
 * Provenance carried by every record that states a fact.
 * Tier 0 is the canonical open-data / prototype slot. This package never stores
 * VERIFIED or tier 3, because it produces no evidence block for them.
 */
export interface Provenance {
  tier: 0;
  prototypeLabel: "PROTOTYPE-UNVERIFIED" | "SEEDED-OPEN-DATA";
  source: string;
  licence: string;
  sourceDate: string;
  recordDate: string;
}

/** A peer request. There is deliberately no health, injury-level or diagnosis field. */
export interface PeerRequest extends Provenance {
  id: string;
  topic: PeerTopic;
  language: Language;
  city?: CoarseCity;
  note?: string;
  ageConfirmed16Plus: true;
  createdAt: string;
  demonstration: true;
}

/** A made-up demonstration profile. It is not a person and has no name or contact. */
export interface PeerCandidate extends Provenance {
  id: string;
  ordinal: number;
  topic: PeerTopic;
  language: Language;
  city?: CoarseCity;
  demonstration: true;
}

export interface MatchOffer extends Provenance {
  id: string;
  requestId: string;
  candidateId: string;
  candidateOrdinal: number;
  topic: PeerTopic;
  language: Language;
  city?: CoarseCity;
  matchedOn: "topic_language" | "topic_language_city";
  /** A local, labelled demonstration object. Nothing is delivered. */
  demonstrationIntroduction: true;
  deliveredToCandidate: false;
  assessesMedicalSuitability: false;
  createdAt: string;
  demonstration: true;
}

export interface PartnerRoute extends Provenance {
  id: string;
  programmeName: { en: string; fr: string };
  /** The official address has not been checked. It stays Unknown. */
  officialUrl: "Unknown";
  demonstrationUrl: string;
  urlStatus: "demonstration_placeholder";
  linkOnly: true;
  referralDecision: false;
  claimsEndorsement: false;
  checkedOn: string;
  demonstration: true;
}

export type HoldCode = "medical_advice" | "personal_data";

export type CrisisContactId = "emergency_911" | "crisis_988" | "connexontario";

/** Crisis text is never stored. The contacts are named in words only. */
export interface CrisisRedirect {
  kind: "crisis";
  stored: false;
  contacts: Array<{ id: CrisisContactId }>;
}

export type RejectCode =
  | "age_out_of_scope"
  | "invalid_topic"
  | "invalid_language"
  | "invalid_city"
  | "note_too_long";

export type SubmitResult =
  | { kind: "accepted"; request: PeerRequest }
  | CrisisRedirect
  | { kind: "refused"; codes: HoldCode[] }
  | { kind: "rejected_input"; code: RejectCode };

export type MatchResult = { kind: "match"; offer: MatchOffer } | { kind: "no_match" };
