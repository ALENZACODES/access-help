import { reasonFor, reasonsFor, screenTip, type HoldCode } from "./screen.js";
import type {
  ContentReport,
  CrisisRedirect,
  Language,
  PublicTip,
  ReportReason,
  SafeguardingReport,
  StoredTip,
  SubmitResult,
  TipDraft,
} from "./types.js";

const CRISIS_CONTACTS: CrisisRedirect["contacts"] = [
  { id: "emergency-911", contact: "911" },
  { id: "suicide-crisis-988", contact: "9-8-8", url: "https://988.ca/" },
  { id: "connexontario", contact: "1-866-531-2600", url: "https://connexontario.ca/contact-us/" },
];

export class CommunityError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CommunityError";
  }
}

export interface PublishInput {
  moderatorId: string;
  moderatorLanguages: Language[];
  placeCheck: "no_contradiction" | "not_place_tied" | "flagged_for_verification";
  /** A person pressed the control. Software cannot set this by itself. */
  humanReview: true;
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function displayNameOk(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 40) return false;
  if (trimmed.includes("@")) return false;
  if (/\d{3}[-. ]\d{3}[-. ]\d{4}/.test(trimmed)) return false;
  return true;
}

/**
 * Device-local community store.
 * There is no message method and no match method. Do not add them.
 * Crisis text is not written into tips, reports, or logs.
 */
export class CommunityStore {
  private tips: StoredTip[] = [];
  private reports: ContentReport[] = [];
  private safeguarding: SafeguardingReport[] = [];
  private sequence = 0;
  /** Count only. The words are not kept. */
  crisisRedirects = 0;

  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  submitTip(draft: TipDraft): SubmitResult {
    if (!draft.confirmedAge16Plus) {
      return { kind: "rejected_input", code: "age_out_of_scope" };
    }
    const text = draft.text.trim();
    if (text.length === 0) return { kind: "rejected_input", code: "empty" };
    if (text.length > 2000) return { kind: "rejected_input", code: "too_long" };
    if (!displayNameOk(draft.displayName)) return { kind: "rejected_input", code: "display_name" };

    const screen = screenTip(text, { smallCommunity: draft.smallCommunity });
    if (screen.decision === "crisis") {
      this.crisisRedirects += 1;
      return { kind: "crisis", stored: false, contacts: CRISIS_CONTACTS };
    }

    const createdAt = this.now();
    const tip: StoredTip = {
      id: `tip-${++this.sequence}`,
      postType: draft.postType,
      audience: draft.audience,
      language: draft.language,
      text,
      displayName: draft.displayName.trim(),
      topic: draft.topic.trim(),
      smallCommunity: Boolean(draft.smallCommunity),
      createdAt,
      moderationState: "queued",
      holdCodes: screen.decision === "hold" ? screen.codes : [],
      tier: 0,
      prototypeLabel: "PROTOTYPE-UNVERIFIED",
      source: "device-local practice draft",
      licence: "author's own words, not yet published",
      sourceDate: dateOnly(createdAt),
      recordDate: dateOnly(createdAt),
      helpfulCount: 0,
      helpfulDevices: [],
      contradictsPlaceRecord: false,
    };
    if (draft.linkedPlaceId) tip.linkedPlaceId = draft.linkedPlaceId;
    if (draft.linkedRouteId) tip.linkedRouteId = draft.linkedRouteId;
    if (draft.linkedEventId) tip.linkedEventId = draft.linkedEventId;
    this.tips.push(tip);
    return { kind: "queued", tip };
  }

  /**
   * Publish only after a person reviews an allowed tip, in the tip's language.
   * Held tips cannot be published or rewritten into advice.
   */
  publish(tipId: string, input: PublishInput): PublicTip {
    const tip = this.require(tipId);
    if (input.humanReview !== true) {
      throw new CommunityError("human_required", "A person has to review a tip before it can be published.");
    }
    if (!input.moderatorId.trim()) {
      throw new CommunityError("moderator_required", "Name the person who reviewed the tip.");
    }
    if (!input.moderatorLanguages.includes(tip.language)) {
      throw new CommunityError(
        "language_reviewer",
        tip.language === "fr"
          ? "A French tip needs a French-speaking reviewer."
          : "An English tip needs an English-speaking reviewer.",
      );
    }
    if (tip.moderationState !== "queued" && tip.moderationState !== "appeal") {
      throw new CommunityError("not_publishable", "This tip is not waiting for publication.");
    }
    const again = screenTip(tip.text, { smallCommunity: tip.smallCommunity });
    if (again.decision === "crisis") {
      this.tips = this.tips.filter((item) => item.id !== tip.id);
      this.crisisRedirects += 1;
      throw new CommunityError("crisis", "Crisis text cannot be stored or published.");
    }
    if (again.decision === "hold" || tip.holdCodes.length > 0) {
      const codes = again.decision === "hold" ? again.codes : tip.holdCodes;
      throw new CommunityError("boundary", reasonsFor(codes).en);
    }
    tip.moderationState = "published";
    tip.contradictsPlaceRecord = input.placeCheck === "flagged_for_verification";
    tip.decision = {
      moderatorId: input.moderatorId,
      moderatorLanguages: input.moderatorLanguages,
      at: this.now(),
      reason: {
        en: "Reviewed by a person. Published as a peer tip, not as a verified measurement.",
        fr: "Lu par une personne. Publié comme conseil de pair, pas comme une mesure vérifiée.",
      },
      codes: [],
    };
    return this.toPublic(tip);
  }

  reject(tipId: string, moderatorId: string, codes: HoldCode[]): StoredTip {
    const tip = this.require(tipId);
    if (!moderatorId.trim()) throw new CommunityError("moderator_required", "Name the person who reviewed the tip.");
    if (codes.length === 0) throw new CommunityError("reason_required", "Give a reason the author can read.");
    tip.moderationState = "rejected";
    tip.holdCodes = codes;
    tip.decision = {
      moderatorId,
      moderatorLanguages: [tip.language],
      at: this.now(),
      reason: reasonsFor(codes),
      codes,
    };
    return tip;
  }

  appeal(tipId: string, note: string): StoredTip {
    const tip = this.require(tipId);
    if (tip.moderationState !== "rejected") {
      throw new CommunityError("not_rejected", "Only a rejected tip can be appealed.");
    }
    if (!note.trim()) throw new CommunityError("empty", "Say what you want reviewed again.");
    tip.moderationState = "appeal";
    return tip;
  }

  report(tipId: string, reason: ReportReason, note: string, reporterToken: string): ContentReport {
    this.require(tipId);
    const tip = this.require(tipId);
    tip.moderationState = "hidden_pending_review";
    const report: ContentReport = {
      id: `report-${++this.sequence}`,
      tipId,
      reason,
      note: note.trim(),
      createdAt: this.now(),
      reporterToken,
      state: "open",
    };
    this.reports.push(report);
    return report;
  }

  /**
   * Safeguarding reports keep the summary for a trained person.
   * They are never copied onto a public tip, and the reported person is not notified from this store.
   */
  reportSafeguarding(summary: string, reporterToken: string): SafeguardingReport {
    const clean = summary.trim();
    if (!clean) throw new CommunityError("empty", "Describe the concern for the reviewer.");
    if (screenTip(clean).decision === "crisis") {
      this.crisisRedirects += 1;
      throw new CommunityError("crisis", "Crisis text is not stored. Call or text 9-8-8, or call 911 if you are in danger.");
    }
    const report: SafeguardingReport = {
      id: `safe-${++this.sequence}`,
      channel: "in_app",
      summary: clean,
      createdAt: this.now(),
      reporterToken,
      state: "open",
      exposedToReportedPerson: false,
    };
    this.safeguarding.push(report);
    return report;
  }

  markHelpful(tipId: string, deviceToken: string): number {
    const tip = this.require(tipId);
    if (tip.moderationState !== "published") {
      throw new CommunityError("not_public", "Only a published tip can be marked helpful.");
    }
    if (!tip.helpfulDevices.includes(deviceToken)) {
      tip.helpfulDevices.push(deviceToken);
      tip.helpfulCount += 1;
    }
    return tip.helpfulCount;
  }

  listPublic(audience: "general" | "family" | "all" = "general"): PublicTip[] {
    return this.tips
      .filter((tip) => tip.moderationState === "published")
      .filter((tip) => audience === "all" || tip.audience === audience)
      .map((tip) => this.toPublic(tip));
  }

  listQueue(): StoredTip[] {
    return this.tips.filter((tip) => tip.moderationState === "queued" || tip.moderationState === "appeal" || tip.moderationState === "hidden_pending_review");
  }

  getTip(id: string): StoredTip | undefined {
    return this.tips.find((tip) => tip.id === id);
  }

  openReports(): ContentReport[] {
    return this.reports.filter((report) => report.state === "open");
  }

  /** Used by tests to prove crisis words never landed in storage. */
  containsText(fragment: string): boolean {
    const haystack = [
      ...this.tips.map((tip) => tip.text),
      ...this.reports.map((report) => report.note),
      ...this.safeguarding.map((report) => report.summary),
    ].join("\n");
    return haystack.includes(fragment);
  }

  authorReason(tipId: string): { en: string; fr: string } | null {
    const tip = this.getTip(tipId);
    if (!tip?.decision) return null;
    if (tip.decision.codes.length === 0) return tip.decision.reason;
    return {
      en: tip.decision.codes.map((code) => reasonFor(code).en).join(" "),
      fr: tip.decision.codes.map((code) => reasonFor(code).fr).join(" "),
    };
  }

  private require(id: string): StoredTip {
    const tip = this.getTip(id);
    if (!tip) throw new CommunityError("missing", "That tip is not on this device.");
    return tip;
  }

  private toPublic(tip: StoredTip): PublicTip {
    const publishedAt = tip.decision?.at ?? tip.createdAt;
    return {
      id: tip.id,
      postType: tip.postType,
      audience: tip.audience,
      language: tip.language,
      text: tip.text,
      displayName: tip.displayName,
      topic: tip.topic,
      createdAt: tip.createdAt,
      publishedAt,
      helpfulCount: tip.helpfulCount,
      tier: 0,
      prototypeLabel: "PROTOTYPE-UNVERIFIED",
      label: {
        en: "Practice tip on this device. A staffed review is required before a public community. No reviewer is staffed. Canonical tier 0, prototype label PROTOTYPE-UNVERIFIED. Not a verified measurement.",
        fr: "Conseil d'exercice sur cet appareil. Une revue dotée est exigée avant une communauté publique. Aucune personne n'est en poste. Niveau canonique 0, étiquette de prototype PROTOTYPE-UNVERIFIED. Pas une mesure vérifiée.",
      },
      contradictsPlaceRecord: tip.contradictsPlaceRecord,
      freshness: freshness(publishedAt, this.now()),
      ...(tip.linkedPlaceId ? { linkedPlaceId: tip.linkedPlaceId } : {}),
      ...(tip.linkedRouteId ? { linkedRouteId: tip.linkedRouteId } : {}),
      ...(tip.linkedEventId ? { linkedEventId: tip.linkedEventId } : {}),
    };
  }
}

/** Place-tied tips age after 12 months and are stale after 24. The plan marks those limits as estimates. */
export function freshness(publishedAt: string, nowIso: string): PublicTip["freshness"] {
  const published = new Date(publishedAt).getTime();
  const now = new Date(nowIso).getTime();
  const months = (now - published) / (1000 * 60 * 60 * 24 * 30);
  if (months >= 24) return "stale";
  if (months >= 12) return "ageing";
  return "current";
}
