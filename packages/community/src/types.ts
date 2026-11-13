import type { HoldCode } from "./screen.js";

export type Language = "en" | "fr";

export type PostType = "venue_tip" | "route_tip" | "practical_tip" | "event_discussion";

export type Audience = "general" | "family";

export type ModerationState = "queued" | "hidden_pending_review" | "rejected" | "published" | "appeal";

/** Prototype record tiers. VERIFIED is not a value this package can store. */
export type PrototypeTier = "PROTOTYPE-UNVERIFIED" | "SEEDED-OPEN-DATA" | "COMMUNITY-REPORTED";

export interface TipDraft {
  postType: PostType;
  audience: Audience;
  language: Language;
  text: string;
  displayName: string;
  topic: string;
  linkedPlaceId?: string;
  linkedRouteId?: string;
  linkedEventId?: string;
  smallCommunity?: boolean;
  confirmedAge16Plus: boolean;
}

export interface ModerationDecision {
  moderatorId: string;
  moderatorLanguages: Language[];
  at: string;
  reason: { en: string; fr: string };
  codes: HoldCode[];
}

export interface StoredTip {
  id: string;
  postType: PostType;
  audience: Audience;
  language: Language;
  text: string;
  displayName: string;
  topic: string;
  linkedPlaceId?: string;
  linkedRouteId?: string;
  linkedEventId?: string;
  smallCommunity: boolean;
  createdAt: string;
  moderationState: ModerationState;
  holdCodes: HoldCode[];
  verificationTier: "COMMUNITY-REPORTED";
  source: string;
  licence: string;
  sourceDate: string;
  recordDate: string;
  helpfulCount: number;
  helpfulDevices: string[];
  decision?: ModerationDecision;
  contradictsPlaceRecord: boolean;
}

/** Public projection. No device tokens, no moderator id, no reporter id. */
export interface PublicTip {
  id: string;
  postType: PostType;
  audience: Audience;
  language: Language;
  text: string;
  displayName: string;
  topic: string;
  linkedPlaceId?: string;
  linkedRouteId?: string;
  linkedEventId?: string;
  createdAt: string;
  publishedAt: string;
  helpfulCount: number;
  verificationTier: "COMMUNITY-REPORTED";
  label: { en: string; fr: string };
  contradictsPlaceRecord: boolean;
  freshness: "current" | "ageing" | "stale";
}

export type ReportReason = "advice" | "inaccuracy" | "abuse" | "privacy" | "safeguarding";

export interface ContentReport {
  id: string;
  tipId: string;
  reason: ReportReason;
  note: string;
  createdAt: string;
  /** Local token so the reporter can see their own report. Never copied onto the public tip. */
  reporterToken: string;
  state: "open" | "resolved";
}

export interface SafeguardingReport {
  id: string;
  channel: "in_app";
  summary: string;
  createdAt: string;
  reporterToken: string;
  state: "open";
  exposedToReportedPerson: false;
}

export interface CrisisRedirect {
  kind: "crisis";
  stored: false;
  contacts: Array<{ id: string; contact: string; url?: string }>;
}

export type SubmitResult =
  | { kind: "queued"; tip: StoredTip }
  | CrisisRedirect
  | { kind: "rejected_input"; code: "age_out_of_scope" | "display_name" | "empty" | "too_long" };
