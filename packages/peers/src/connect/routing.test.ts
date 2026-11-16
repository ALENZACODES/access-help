import { describe, expect, it } from "vitest";
import { SAMPLE_ROUTING_TABLE } from "../testing/routing-fixture.js";
import routingTableSchema from "../../schemas/routing-table.schema.json" with { type: "json" };
import { RECORDED_ROUTING_TABLE, routeRequest, routingTableProblems } from "./routing.js";
import type { RoutingTable } from "./routing.js";
import { validateRoutingTable } from "./validate.js";
import { LIFE_CONTEXTS, REGIONS } from "./vocab.js";

describe("the recorded routing table", () => {
  it("ships with no streams and no rules", () => {
    expect(RECORDED_ROUTING_TABLE.streams).toEqual([]);
    expect(RECORDED_ROUTING_TABLE.rules).toEqual([]);
    expect(validateRoutingTable(RECORDED_ROUTING_TABLE)).toMatchObject({ valid: true, errors: [] });
    expect(RECORDED_ROUTING_TABLE).toMatchObject({ tier: 0, prototypeLabel: "PROTOTYPE-UNVERIFIED" });
  });

  it("routes every context in every region to Unknown", () => {
    for (const context of LIFE_CONTEXTS) {
      for (const region of [undefined, ...REGIONS]) {
        expect(routeRequest({ contexts: [context], ...(region ? { region } : {}) }, RECORDED_ROUTING_TABLE)).toEqual({
          kind: "unknown",
          reason: "no_streams_recorded",
        });
      }
    }
  });
});

describe("routing rules (sample data)", () => {
  const table = SAMPLE_ROUTING_TABLE;

  it("uses a fixture that is labelled as sample data throughout", () => {
    expect(validateRoutingTable(table).valid).toBe(true);
    expect(table.source).toMatch(/sample data/);
    for (const stream of table.streams) {
      expect(stream.sample).toBe(true);
      expect(stream.tier).toBe(0);
      expect(stream.prototypeLabel).toBe("PROTOTYPE-UNVERIFIED");
      expect(stream.label.en).toMatch(/^Sample stream/);
      expect(stream.source).toMatch(/not a real programme/);
    }
  });

  it("maps a context with an any-region rule whatever the region", () => {
    for (const region of [undefined, ...REGIONS]) {
      expect(routeRequest({ contexts: ["new_injury"], ...(region ? { region } : {}) }, table)).toEqual({
        kind: "stream",
        streamId: "sample-stream-a",
        ruleId: "sample-rule-01",
        context: "new_injury",
        ruleScope: "any",
      });
    }
  });

  it("prefers a rule for the request's region over an any-region rule", () => {
    expect(routeRequest({ contexts: ["work"], region: "eastern_ontario" }, table)).toMatchObject({
      streamId: "sample-stream-a",
      ruleId: "sample-rule-03",
      ruleScope: "region",
    });
    expect(routeRequest({ contexts: ["work"], region: "northern_ontario" }, table)).toMatchObject({
      streamId: "sample-stream-b",
      ruleId: "sample-rule-04",
      ruleScope: "any",
    });
  });

  it("answers Unknown when no stream is recorded for the region, and never substitutes another region", () => {
    expect(routeRequest({ contexts: ["parenting"], region: "northern_ontario" }, table)).toEqual({
      kind: "unknown",
      reason: "no_stream_for_region",
    });
    expect(routeRequest({ contexts: ["parenting"] }, table)).toEqual({ kind: "unknown", reason: "no_stream_for_region" });
  });

  it("answers Unknown when no stream is recorded for the context", () => {
    expect(routeRequest({ contexts: ["school", "sport_recreation"], region: "eastern_ontario" }, table)).toEqual({
      kind: "unknown",
      reason: "no_stream_for_context",
    });
    expect(routeRequest({ contexts: [] }, table)).toEqual({ kind: "unknown", reason: "no_stream_for_context" });
  });

  it("tries contexts in closed-list order, whatever order they were picked in", () => {
    const a = routeRequest({ contexts: ["work", "new_injury"], region: "eastern_ontario" }, table);
    const b = routeRequest({ contexts: ["new_injury", "work"], region: "eastern_ontario" }, table);
    expect(a).toEqual(b);
    expect(a).toMatchObject({ context: "new_injury", streamId: "sample-stream-a" });
  });

  it("moves on to a later context when an earlier one has no rule for the region", () => {
    expect(routeRequest({ contexts: ["parenting", "work"], region: "central_ontario" }, table)).toMatchObject({
      kind: "stream",
      context: "work",
      ruleId: "sample-rule-04",
    });
  });

  it("does not depend on the order of the rules in the table", () => {
    const reversed: RoutingTable = { ...table, rules: [...table.rules].reverse() };
    for (const context of LIFE_CONTEXTS) {
      for (const region of REGIONS) {
        expect(routeRequest({ contexts: [context], region }, reversed)).toEqual(
          routeRequest({ contexts: [context], region }, table),
        );
      }
    }
  });
});

describe("routing table checks", () => {
  const table = SAMPLE_ROUTING_TABLE;

  it.each<[string, RoutingTable]>([
    ["a rule that points at a missing stream", { ...table, rules: [{ id: "r", context: "work", region: "any", streamId: "nope" }] }],
    ["two rules for the same context and region", { ...table, rules: [...table.rules, { id: "r", context: "work", region: "any", streamId: "sample-stream-a" }] }],
    ["a duplicate rule id", { ...table, rules: [...table.rules, { ...table.rules[0]!, context: "school" }] }],
    ["a duplicate stream id", { ...table, streams: [...table.streams, table.streams[0]!] }],
  ])("reports %s and routes everything to Unknown", (_name, broken) => {
    expect(routingTableProblems(broken).length).toBeGreaterThan(0);
    expect(validateRoutingTable(broken).valid).toBe(false);
    expect(routeRequest({ contexts: ["new_injury"] }, broken)).toEqual({ kind: "unknown", reason: "no_streams_recorded" });
  });

  it.each([
    ["a diagnosis used as a context", { rules: [{ id: "r", context: "paraplegia", region: "any", streamId: "sample-stream-a" }] }],
    ["a city used as a region", { rules: [{ id: "r", context: "work", region: "ottawa", streamId: "sample-stream-a" }] }],
    ["VERIFIED", { prototypeLabel: "VERIFIED" }],
    ["tier 3", { tier: 3 }],
    ["an organisation field on the table", { organisation: "x" }],
    ["a stream with a contact field", { streams: [{ ...table.streams[0], phone: "x" }] }],
    ["a stream without provenance", { streams: [{ id: "s", label: { en: "a", fr: "b" }, sample: true }] }],
  ])("schema rejects %s", (_name, change) => {
    expect(validateRoutingTable({ ...table, ...change }).valid).toBe(false);
  });

  it("keeps schema enums in step with the TypeScript lists", () => {
    const rule = routingTableSchema.properties.rules.items.properties;
    expect(rule.context.enum).toEqual([...LIFE_CONTEXTS]);
    expect(rule.region.enum).toEqual([...REGIONS, "any"]);
  });
});
