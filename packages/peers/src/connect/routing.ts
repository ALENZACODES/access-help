import type { Provenance } from "../types.js";
import { LIFE_CONTEXTS, isLifeContext, isRegion } from "./vocab.js";
import type { LifeContext, Region } from "./vocab.js";

/**
 * A programme stream as recorded in a routing table. It names no organisation.
 * `sample` marks a made-up stream used only to show and test the rules.
 */
export interface ProgrammeStream extends Provenance {
  id: string;
  label: { en: string; fr: string };
  sample: boolean;
}

/** One rule: a life context in a region (or any region) maps to one stream. */
export interface RoutingRule {
  id: string;
  context: LifeContext;
  region: Region | "any";
  streamId: string;
}

export interface RoutingTable extends Provenance {
  id: string;
  streams: ProgrammeStream[];
  rules: RoutingRule[];
}

/**
 * The table the App ships with. No partner programme stream has been recorded, so it
 * holds no streams and no rules, and every request routes to Unknown. A stream is added
 * here only when a partner organisation has agreed to it in writing.
 */
export const RECORDED_ROUTING_TABLE: RoutingTable = {
  id: "routing-table-recorded",
  streams: [],
  rules: [],
  tier: 0,
  prototypeLabel: "PROTOTYPE-UNVERIFIED",
  source: "written for this prototype; no partner programme stream has been recorded",
  licence: "not a third-party dataset",
  sourceDate: "2026-11-16",
  recordDate: "2026-11-16",
};

export type UnknownReason = "no_streams_recorded" | "no_stream_for_context" | "no_stream_for_region";

export type RouteOutcome =
  | { kind: "stream"; streamId: string; ruleId: string; context: LifeContext; ruleScope: "region" | "any" }
  | { kind: "unknown"; reason: UnknownReason };

export interface RouteInput {
  contexts: readonly LifeContext[];
  /** Left out when the person did not give a region or did not agree to use it. */
  region?: Region;
}

/** Problems that make a table unusable. An unusable table routes everything to Unknown. */
export function routingTableProblems(table: RoutingTable): string[] {
  const problems: string[] = [];
  const streamIds = new Set<string>();
  for (const stream of table.streams) {
    if (streamIds.has(stream.id)) {
      problems.push(`duplicate stream id ${stream.id}`);
    }
    streamIds.add(stream.id);
    if (stream.tier !== 0) {
      problems.push(`stream ${stream.id} is not tier 0`);
    }
    if (stream.label.en.trim() === "" || stream.label.fr.trim() === "") {
      problems.push(`stream ${stream.id} needs an English and a French label`);
    }
  }
  const ruleIds = new Set<string>();
  const pairs = new Set<string>();
  for (const rule of table.rules) {
    if (ruleIds.has(rule.id)) {
      problems.push(`duplicate rule id ${rule.id}`);
    }
    ruleIds.add(rule.id);
    if (!isLifeContext(rule.context)) {
      problems.push(`rule ${rule.id} has a context outside the closed list`);
    }
    if (rule.region !== "any" && !isRegion(rule.region)) {
      problems.push(`rule ${rule.id} has a region outside the closed list`);
    }
    if (!streamIds.has(rule.streamId)) {
      problems.push(`rule ${rule.id} points at a stream that is not in the table`);
    }
    const pair = `${rule.context}|${rule.region}`;
    if (pairs.has(pair)) {
      problems.push(`more than one rule for ${pair}`);
    }
    pairs.add(pair);
  }
  return problems;
}

/**
 * Route a request against a table. Deterministic:
 * 1. Contexts are tried in closed-list order, whatever order they were picked in.
 * 2. For a context, a rule for the request's region wins over an "any region" rule.
 * 3. No rule, an unusable table or an empty table gives Unknown with a reason. Nothing
 *    is guessed and no nearby region is substituted.
 */
export function routeRequest(input: RouteInput, table: RoutingTable): RouteOutcome {
  if (table.rules.length === 0 || table.streams.length === 0 || routingTableProblems(table).length > 0) {
    return { kind: "unknown", reason: "no_streams_recorded" };
  }
  const contexts = LIFE_CONTEXTS.filter((context) => input.contexts.includes(context));
  let contextHasRule = false;
  for (const context of contexts) {
    const rules = table.rules.filter((rule) => rule.context === context);
    if (rules.length === 0) {
      continue;
    }
    contextHasRule = true;
    const exact = input.region ? rules.find((rule) => rule.region === input.region) : undefined;
    const chosen = exact ?? rules.find((rule) => rule.region === "any");
    if (chosen) {
      return {
        kind: "stream",
        streamId: chosen.streamId,
        ruleId: chosen.id,
        context,
        ruleScope: exact ? "region" : "any",
      };
    }
  }
  return { kind: "unknown", reason: contextHasRule ? "no_stream_for_region" : "no_stream_for_context" };
}

export function findStream(table: RoutingTable, streamId: string): ProgrammeStream | undefined {
  return table.streams.find((stream) => stream.id === streamId);
}
