import { describe, expect, it } from "vitest";
import { SAMPLE_ROUTING_TABLE } from "../testing/routing-fixture.js";
import { applyEvent } from "./moderation.js";
import { closeRequest, createConnectionRequest, withdrawRequestConsent } from "./request.js";
import type { ConnectionDraft, ConnectionRequest } from "./request.js";
import { RECORDED_ROUTING_TABLE } from "./routing.js";
import type { RoutingTable } from "./routing.js";
import { frenchTypography } from "../strings.js";
import { buildSummary, describeStream } from "./summary.js";

const NOW = "2026-11-16T10:00:00.000Z";
const ALL = { prepare_summary: true, include_contexts: true, include_region: true, include_language: true, include_note: true };
const base: ConnectionDraft = {
  forWhom: "myself",
  contexts: ["parenting", "work"],
  region: "eastern_ontario",
  language: "fr",
  note: "Back to work in the new year.",
  ageConfirmed16Plus: true,
  consent: ALL,
};

function make(draft: ConnectionDraft, table: RoutingTable = RECORDED_ROUTING_TABLE): ConnectionRequest {
  const result = createConnectionRequest(draft, { now: NOW, id: "req-7", table });
  if (result.kind !== "accepted") throw new Error("expected accepted");
  return result.request;
}

function text(request: ConnectionRequest, table: RoutingTable = RECORDED_ROUTING_TABLE, language: "en" | "fr" = "en"): string {
  const summary = buildSummary(request, table, language);
  if (summary.kind !== "ready") throw new Error("expected a summary");
  return summary.text;
}

describe("buildSummary", () => {
  it("lists the consented items and says plainly that nothing was sent", () => {
    const summary = text(make(base));
    expect(summary).toContain("Would like to talk about: Parenting; Work");
    expect(summary).toContain("Part of Ontario: Eastern Ontario");
    expect(summary).toContain("Preferred language: French");
    expect(summary).toContain("Note: Back to work in the new year.");
    expect(summary).toContain("The App has not sent this summary to anyone.");
    expect(summary).toContain("This is not a referral.");
    expect(summary).toContain("Reference on the device: req-7");
    expect(summary).toContain("2026-11-16");
  });

  it("gives an honest Unknown for the programme stream with the recorded table", () => {
    expect(text(make(base))).toContain(
      "Programme stream: Unknown. No programme stream has been recorded in the App yet.",
    );
  });

  it("says no stream is recorded for the region when that is the reason", () => {
    const request = make({ ...base, contexts: ["parenting"], region: "northern_ontario" }, SAMPLE_ROUTING_TABLE);
    expect(text(request, SAMPLE_ROUTING_TABLE)).toContain(
      "Programme stream: Unknown. No programme stream is recorded for this region.",
    );
    expect(text(request, SAMPLE_ROUTING_TABLE, "fr")).toContain("Inconnu. Aucun volet de programme n'est inscrit pour cette région.");
  });

  it("labels a sample stream as sample data wherever it is named", () => {
    const request = make(base, SAMPLE_ROUTING_TABLE);
    expect(describeStream(request, SAMPLE_ROUTING_TABLE, "en")).toBe("Sample stream B (Sample data, not a real programme)");
    expect(describeStream(request, SAMPLE_ROUTING_TABLE, "fr")).toContain("Données d'exemple");
  });

  it("falls back to Unknown when the stream is no longer in the table it is read against", () => {
    const request = make(base, SAMPLE_ROUTING_TABLE);
    expect(describeStream(request, RECORDED_ROUTING_TABLE, "en")).toMatch(/^Unknown\./);
    expect(describeStream(request, { ...SAMPLE_ROUTING_TABLE, streams: [] }, "en")).toMatch(/^Unknown\./);
  });

  it("leaves out every item the person did not agree to", () => {
    const summary = text(make({ ...base, consent: { prepare_summary: true, include_contexts: true } }));
    expect(summary).toContain("Part of Ontario: not shared");
    expect(summary).toContain("Preferred language: not shared");
    expect(summary).not.toContain("Eastern Ontario");
    expect(summary).not.toContain("French");
    expect(summary).not.toContain("Back to work");
    expect(summary).not.toContain("Note:");
  });

  it("marks a request made for someone else and names no stream while review is pending", () => {
    const request = make({ ...base, forWhom: "someone_i_support" }, SAMPLE_ROUTING_TABLE);
    const summary = text(request, SAMPLE_ROUTING_TABLE);
    expect(summary).toContain("Request for: Someone I support");
    expect(summary).toContain("Status on the device: Needs review");
    expect(summary).toContain("Programme stream: Not recorded while the request needs review");
    expect(summary).toContain("This request was made for someone else.");
    expect(summary).not.toContain("Sample stream");
  });

  it("is written in French when asked", () => {
    const summary = text(make(base), RECORDED_ROUTING_TABLE, "fr");
    expect(summary).toContain(frenchTypography("Aimerait parler de : Être parent ; Le travail"));
    expect(summary).toContain("L'application n'a envoyé ce résumé à personne.");
    expect(summary).toContain(frenchTypography("Volet de programme : Inconnu."));
  });

  it("is unavailable once consent is withdrawn or the request is closed", () => {
    const withdrawn = withdrawRequestConsent(make(base), "2026-11-16T11:00:00.000Z");
    if (!withdrawn.ok) throw new Error("expected ok");
    expect(buildSummary(withdrawn.request, RECORDED_ROUTING_TABLE, "en")).toEqual({
      kind: "unavailable",
      reason: "request_closed",
    });
    const closed = closeRequest(make(base), "2026-11-16T11:00:00.000Z");
    if (!closed.ok) throw new Error("expected ok");
    expect(buildSummary(closed.request, RECORDED_ROUTING_TABLE, "en").kind).toBe("unavailable");
    const request = make(base);
    const revokedOnly = { ...request, consent: { ...request.consent, revokedAt: NOW } };
    expect(buildSummary(revokedOnly, RECORDED_ROUTING_TABLE, "en")).toEqual({
      kind: "unavailable",
      reason: "consent_not_active",
    });
  });

  it("never claims that something was sent, that a peer will reply, or when", () => {
    const requests = [
      make(base),
      make(base, SAMPLE_ROUTING_TABLE),
      make({ ...base, forWhom: "someone_i_support" }, SAMPLE_ROUTING_TABLE),
    ];
    const escalated = applyEvent(requests[0]!.moderation, { type: "escalate", actor: "reviewer" }, NOW);
    if (!escalated.ok) throw new Error("expected ok");
    requests.push({ ...requests[0]!, moderation: escalated.moderation });
    for (const request of requests) {
      for (const language of ["en", "fr"] as const) {
        const summary = text(request, SAMPLE_ROUTING_TABLE, language);
        expect(summary).not.toMatch(/\b(was|has been|have been) sent\b|\bwe sent\b|a été envoyé/i);
        expect(summary).not.toMatch(/will (reply|respond|contact|call|be in touch)|within \d|\d+ (hours?|days?|heures?|jours?)/i);
        expect(summary).not.toMatch(/vous (répondra|contactera|appellera)|dans un délai de/i);
        expect(summary).not.toMatch(/matched|jumel/i);
      }
    }
  });
});
