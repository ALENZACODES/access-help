import type { PartnerRoute } from "./types.js";

/**
 * A signpost to a partner SCI organisation's peer programme. It names no organisation.
 * The official address is Unknown until someone checks it; the link below is a clearly
 * labelled placeholder on a reserved, non-resolving domain. A link is not a referral,
 * not a decision about who may join, and not an endorsement.
 */
export const PARTNER_ROUTE: PartnerRoute = {
  id: "partner-route-demonstration",
  programmeName: {
    en: "Peer programme at a partner SCI organisation",
    fr: "Programme de pairs d'un organisme partenaire pour les lésions médullaires",
  },
  officialUrl: "Unknown",
  demonstrationUrl: "https://example.invalid/peer-programme",
  urlStatus: "demonstration_placeholder",
  linkOnly: true,
  referralDecision: false,
  claimsEndorsement: false,
  checkedOn: "2026-11-15",
  demonstration: true,
  tier: 0,
  prototypeLabel: "PROTOTYPE-UNVERIFIED",
  source: "demonstration placeholder written for this prototype; no organisation was contacted",
  licence: "not a third-party dataset",
  sourceDate: "2026-11-15",
  recordDate: "2026-11-15",
};
