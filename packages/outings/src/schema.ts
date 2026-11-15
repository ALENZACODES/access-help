/** JSON Schema draft 2020-12 for an outing list. */
export const listSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: [
    "id", "titleEn", "titleFr", "summaryEn", "summaryFr",
    "placeIds", "sources", "retrieved_at", "licence",
  ],
  properties: {
    id: { type: "string", pattern: "^[a-z0-9-]+$" },
    titleEn: { type: "string", minLength: 1 },
    titleFr: { type: "string", minLength: 1 },
    summaryEn: { type: "string", minLength: 1 },
    summaryFr: { type: "string", minLength: 1 },
    placeIds: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["source_id", "name", "licence"],
        properties: {
          source_id: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          licence: { enum: ["ODbL", "OGL-Ontario", "OGL-Canada", "CC-BY", "CC0"] },
        },
      },
    },
    retrieved_at: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    licence: { enum: ["ODbL", "OGL-Ontario", "OGL-Canada", "CC-BY", "CC0"] },
    factKey: { enum: ["stepFreeEntrance", "adultChangeTable"] },
  },
} as const;
