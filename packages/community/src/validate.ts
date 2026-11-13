import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import postSchema from "../schemas/community-post.schema.json" with { type: "json" };
import eventSchema from "../schemas/event.schema.json" with { type: "json" };
import { DEMONSTRATION_EVENTS, type EventRecord } from "./events.js";
import type { StoredTip } from "./types.js";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validatePost = ajv.compile(postSchema);
const validateEventSchema = ajv.compile(eventSchema);

export interface ValidationReport {
  file: string;
  valid: boolean;
  errors: string[];
}

function errorsOf(validator: { errors?: Array<{ instancePath?: string; message?: string }> | null }): string[] {
  return (validator.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`.trim());
}

export function validateCommunityPost(post: unknown, file = "community-post"): ValidationReport {
  const valid = validatePost(post) as boolean;
  return { file, valid, errors: valid ? [] : errorsOf(validatePost) };
}

export function validateEventRecord(event: unknown, file = "event"): ValidationReport {
  const valid = validateEventSchema(event) as boolean;
  return { file, valid, errors: valid ? [] : errorsOf(validateEventSchema) };
}

export function storedTipToSchema(tip: StoredTip): Record<string, unknown> {
  return {
    id: tip.id,
    postType: tip.postType,
    audience: tip.audience,
    language: tip.language,
    text: tip.text,
    displayName: tip.displayName,
    topic: tip.topic,
    ...(tip.linkedPlaceId ? { linkedPlaceId: tip.linkedPlaceId } : {}),
    ...(tip.linkedRouteId ? { linkedRouteId: tip.linkedRouteId } : {}),
    ...(tip.linkedEventId ? { linkedEventId: tip.linkedEventId } : {}),
    createdAt: tip.createdAt,
    moderationState: tip.moderationState,
    verificationTier: tip.verificationTier,
    source: tip.source,
    licence: tip.licence,
    sourceDate: tip.sourceDate,
    recordDate: tip.recordDate,
    ...(tip.smallCommunity ? { smallCommunity: true } : {}),
  };
}

export const VALID_POST_EXAMPLE = {
  id: "example-tip-1",
  postType: "venue_tip",
  audience: "general",
  language: "en",
  text: "The side door on the west wall had a push button on 2 November 2026. I did not measure the doorway.",
  displayName: "West door",
  topic: "entrances",
  linkedPlaceId: "place-example",
  createdAt: "2026-11-13T15:00:00.000Z",
  moderationState: "queued",
  verificationTier: "COMMUNITY-REPORTED",
  source: "example record for schema tests",
  licence: "not a third-party dataset",
  sourceDate: "2026-11-13",
  recordDate: "2026-11-13",
} as const;

export function exampleEvents(): EventRecord[] {
  return [...DEMONSTRATION_EVENTS];
}

export function runSchemaExamples(): ValidationReport[] {
  const reports: ValidationReport[] = [];
  reports.push(validateCommunityPost(VALID_POST_EXAMPLE, "valid-post.json"));
  const missingTier = { ...VALID_POST_EXAMPLE };
  delete (missingTier as { verificationTier?: string }).verificationTier;
  reports.push(validateCommunityPost(missingTier, "missing-tier.json"));
  reports.push(
    validateCommunityPost(
      { ...VALID_POST_EXAMPLE, id: "verified-attempt", verificationTier: "VERIFIED" },
      "verified-tier.json",
    ),
  );
  for (const event of DEMONSTRATION_EVENTS) {
    reports.push(validateEventRecord(event, `${event.id}.json`));
  }
  reports.push(
    validateEventRecord(
      { ...DEMONSTRATION_EVENTS[0], id: "verified-event", verificationTier: "VERIFIED" },
      "verified-event.json",
    ),
  );
  return reports;
}
