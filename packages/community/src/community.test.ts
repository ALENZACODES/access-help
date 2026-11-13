import { describe, expect, it } from "vitest";
import { CommunityError, CommunityStore, freshness } from "./store.js";
import { screenTip } from "./screen.js";
import {
  ATTENDANT_SERVICES_NOTE,
  MODERATION_EXPLAINER,
  NOT_RUNNING,
  NO_ENDORSEMENT,
  NO_REPLACEMENT,
  ORGANISATION_CONTACT,
  PROGRAMMES,
  programmeLinkDefects,
  PROTOTYPE_SKELETON,
} from "./directory.js";
import { DEMONSTRATION_EVENTS, accessibleClaimAllowed, presentEvent } from "./events.js";
import { runSchemaExamples, storedTipToSchema, validateCommunityPost } from "./validate.js";
import type { TipDraft } from "./types.js";

const NOW = "2026-11-13T15:00:00.000Z";

function draft(overrides: Partial<TipDraft> = {}): TipDraft {
  return {
    postType: "venue_tip",
    audience: "general",
    language: "en",
    text: "The west side door had a push button at about waist height on 2 November 2026. I did not measure the opening.",
    displayName: "Side door",
    topic: "entrances",
    linkedPlaceId: "place-1",
    confirmedAge16Plus: true,
    ...overrides,
  };
}

describe("screening", () => {
  it("allows a place observation", () => {
    expect(screenTip(draft().text).decision).toBe("allow");
  });

  it("holds medical advice, transfer instruction, and benefits decisions", () => {
    expect(screenTip("Catheterize every 4 hours.").decision).toBe("hold");
    expect(screenTip("Use a slide board and this transfer technique.").decision).toBe("hold");
    expect(screenTip("You are eligible for the full amount.").decision).toBe("hold");
  });

  it("treats crisis language as a redirect, not a hold", () => {
    expect(screenTip("I want to die").decision).toBe("crisis");
  });
});

describe("community store", () => {
  it("queues a practical tip and does not show it publicly until a person publishes it", () => {
    const store = new CommunityStore(() => NOW);
    const result = store.submitTip(draft());
    expect(result.kind).toBe("queued");
    expect(store.listPublic()).toHaveLength(0);
    if (result.kind !== "queued") throw new Error("expected queue");
    const published = store.publish(result.tip.id, {
      moderatorId: "reviewer-1",
      moderatorLanguages: ["en"],
      placeCheck: "no_contradiction",
      humanReview: true,
    });
    expect(published.tier).toBe(0);
    expect(published.prototypeLabel).toBe("PROTOTYPE-UNVERIFIED");
    expect(published.label.en).toMatch(/No reviewer is staffed/);
    expect(published.label.en).toMatch(/Not a verified measurement/);
    expect(store.listPublic()).toHaveLength(1);
    expect(validateCommunityPost(storedTipToSchema(store.getTip(result.tip.id)!)).valid).toBe(true);
  });

  it("refuses to publish health advice even if a moderator tries", () => {
    const store = new CommunityStore(() => NOW);
    const result = store.submitTip(draft({ text: "You should catheterize every 6 hours." }));
    expect(result.kind).toBe("queued");
    if (result.kind !== "queued") throw new Error("expected queue");
    expect(result.tip.holdCodes).toContain("medical_advice");
    expect(() =>
      store.publish(result.tip.id, {
        moderatorId: "reviewer-1",
        moderatorLanguages: ["en"],
        placeCheck: "not_place_tied",
        humanReview: true,
      }),
    ).toThrow(CommunityError);
    expect(store.listPublic()).toHaveLength(0);
    store.reject(result.tip.id, "reviewer-1", ["medical_advice"]);
    expect(store.authorReason(result.tip.id)?.en).toMatch(/health advice/i);
  });

  it("does not store crisis text", () => {
    const store = new CommunityStore(() => NOW);
    const phrase = "I want to die tonight";
    const result = store.submitTip(draft({ text: phrase }));
    expect(result.kind).toBe("crisis");
    if (result.kind === "crisis") {
      expect(result.stored).toBe(false);
      expect(result.contacts.map((item) => item.contact)).toContain("9-8-8");
    }
    expect(store.containsText("want to die")).toBe(false);
    expect(store.crisisRedirects).toBe(1);
    expect(store.listQueue()).toHaveLength(0);
  });

  it("requires a French-speaking reviewer for a French tip", () => {
    const store = new CommunityStore(() => NOW);
    const result = store.submitTip(
      draft({
        language: "fr",
        text: "La porte latérale ouest avait un bouton poussoir le 2 novembre 2026.",
      }),
    );
    if (result.kind !== "queued") throw new Error("expected queue");
    expect(() =>
      store.publish(result.tip.id, {
        moderatorId: "reviewer-en",
        moderatorLanguages: ["en"],
        placeCheck: "no_contradiction",
        humanReview: true,
      }),
    ).toThrow(/French/);
    store.publish(result.tip.id, {
      moderatorId: "reviewer-fr",
      moderatorLanguages: ["fr"],
      placeCheck: "flagged_for_verification",
      humanReview: true,
    });
    expect(store.listPublic()[0]?.contradictsPlaceRecord).toBe(true);
  });

  it("keeps family tips out of the general list", () => {
    const store = new CommunityStore(() => NOW);
    const result = store.submitTip(draft({ audience: "family", topic: "families" }));
    if (result.kind !== "queued") throw new Error("expected queue");
    store.publish(result.tip.id, {
      moderatorId: "reviewer-1",
      moderatorLanguages: ["en"],
      placeCheck: "not_place_tied",
      humanReview: true,
    });
    expect(store.listPublic("general")).toHaveLength(0);
    expect(store.listPublic("family")).toHaveLength(1);
  });

  it("hides a reported tip and does not attach the reporter to the public record", () => {
    const store = new CommunityStore(() => NOW);
    const result = store.submitTip(draft());
    if (result.kind !== "queued") throw new Error("expected queue");
    store.publish(result.tip.id, {
      moderatorId: "reviewer-1",
      moderatorLanguages: ["en"],
      placeCheck: "no_contradiction",
      humanReview: true,
    });
    const report = store.report(result.tip.id, "abuse", "Personal attack in the last sentence.", "device-a");
    expect(report.reporterToken).toBe("device-a");
    expect(store.listPublic()).toHaveLength(0);
    expect(JSON.stringify(store.getTip(result.tip.id))).not.toContain("device-a");
  });

  it("does not store a safeguarding report that is actually a crisis disclosure", () => {
    const store = new CommunityStore(() => NOW);
    expect(() => store.reportSafeguarding("I want to die", "device-b")).toThrow(/9-8-8/);
    expect(store.containsText("want to die")).toBe(false);
  });

  it("counts helpful marks once per device", () => {
    const store = new CommunityStore(() => NOW);
    const result = store.submitTip(draft());
    if (result.kind !== "queued") throw new Error("expected queue");
    store.publish(result.tip.id, {
      moderatorId: "reviewer-1",
      moderatorLanguages: ["en"],
      placeCheck: "no_contradiction",
      humanReview: true,
    });
    expect(store.markHelpful(result.tip.id, "phone-1")).toBe(1);
    expect(store.markHelpful(result.tip.id, "phone-1")).toBe(1);
    expect(store.markHelpful(result.tip.id, "phone-2")).toBe(2);
    expect(JSON.stringify(store.listPublic()[0])).not.toContain("phone-1");
  });

  it("rejects contributors under 16 without storing the draft", () => {
    const store = new CommunityStore(() => NOW);
    const result = store.submitTip(draft({ confirmedAge16Plus: false, text: "A private detail about a child." }));
    expect(result.kind).toBe("rejected_input");
    expect(store.containsText("private detail")).toBe(false);
  });
});

describe("freshness", () => {
  it("ages place-tied publication dates at 12 and 24 months", () => {
    expect(freshness("2026-01-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z")).toBe("current");
    expect(freshness("2025-01-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z")).toBe("ageing");
    expect(freshness("2024-01-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z")).toBe("stale");
  });
});

describe("events and directory", () => {
  it("ships three demonstration events with external registration and no in-app registration", () => {
    expect(DEMONSTRATION_EVENTS).toHaveLength(3);
    for (const event of DEMONSTRATION_EVENTS) {
      expect(event.demonstration).toBe(true);
      expect(event.title.en.toLowerCase()).toContain("demonstration");
      expect(event.registrationUrl).toBe("https://sciontario.org/");
      expect(event.inAppRegistration).toBe(false);
      expect(accessibleClaimAllowed(event)).toBe(false);
      const view = presentEvent(event, "en");
      expect(view.confirmationNotice).toMatch(/not confirmed/i);
      expect(view.entrance).toMatch(/Unknown/);
    }
  });

  it("lists nine programmes, omits attendant services as current, and states no endorsement", () => {
    expect(PROGRAMMES).toHaveLength(9);
    const blob = PROGRAMMES.map((item) => item.name.en).join(" ");
    expect(blob).not.toMatch(/Attendant services/);
    expect(ATTENDANT_SERVICES_NOTE.en).toMatch(/Not listed as a current programme/);
    expect(NO_REPLACEMENT.en).toMatch(/does not replace/);
    expect(NO_ENDORSEMENT.en).toMatch(/No endorsement/);
    for (const section of MODERATION_EXPLAINER) {
      expect(section.notRunning).toBe(true);
    }
    expect(NOT_RUNNING.en).toMatch(/not running/);
    expect(programmeLinkDefects()).toEqual([]);
    const hrefs = PROGRAMMES.flatMap((item) => item.links.map((link) => link.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(PROGRAMMES.find((item) => item.id === "membership")?.links[0]?.homepageFallback).toBe(true);
    expect(PROGRAMMES.find((item) => item.id === "knowledge")?.links[0]?.href).toBe("https://cortree.sciontario.org/");
    expect(ORGANISATION_CONTACT.tollFree).toBe("1-877-422-1112");
    expect(ORGANISATION_CONTACT.phone).toBe("416-422-5644");
    expect(`${ORGANISATION_CONTACT.phone} ${ORGANISATION_CONTACT.tollFree} ${ORGANISATION_CONTACT.email}`).not.toMatch(/213/);
    expect(ORGANISATION_CONTACT.limit.en).toMatch(/extension 213 is not on this page/);
    expect(ORGANISATION_CONTACT.limit.en).toMatch(/has not agreed to receive complaints/);
    expect(ORGANISATION_CONTACT.limit.fr).toMatch(/n'a pas accepté/);
  });

  it("keeps the Day 16 skeleton to link-outs", () => {
    const kinds = PROTOTYPE_SKELETON.flatMap((screen) => screen.actions.map((action) => action.kind));
    expect(new Set(kinds)).toEqual(new Set(["link_out"]));
    const dumped = JSON.stringify(PROTOTYPE_SKELETON);
    expect(dumped).not.toMatch(/message|comment|register|post/i);
  });
});

describe("schemas", () => {
  it("accepts valid examples and rejects a missing tier and a VERIFIED tier", () => {
    const reports = runSchemaExamples();
    const byFile = Object.fromEntries(reports.map((report) => [report.file, report.valid]));
    expect(byFile["valid-post.json"]).toBe(true);
    expect(byFile["missing-tier.json"]).toBe(false);
    expect(byFile["verified-tier.json"]).toBe(false);
    expect(byFile["verified-event.json"]).toBe(false);
    expect(byFile["demo-virtual-peer.json"]).toBe(true);
    expect(byFile["demo-in-person.json"]).toBe(true);
    expect(byFile["demo-family.json"]).toBe(true);
  });
});
