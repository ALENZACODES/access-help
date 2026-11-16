import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import connectionRequestSchema from "../../schemas/connection-request.schema.json" with { type: "json" };
import routingTableSchema from "../../schemas/routing-table.schema.json" with { type: "json" };
import * as connect from "./index.js";
import { CONNECT_CATALOG } from "./strings.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const uiDir = fileURLToPath(new URL("../ui/", import.meta.url));

/** Runtime sources of the connection flow: no tests, no fixtures. */
function runtimeSources(): Array<{ file: string; code: string }> {
  const logic = readdirSync(here)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => `${here}${name}`);
  const ui = readdirSync(uiDir)
    .filter((name) => name.startsWith("PeerRequestFlow"))
    .map((name) => `${uiDir}${name}`);
  return [...logic, ...ui].map((file) => ({ file, code: readFileSync(file, "utf8") }));
}

/** Property names anywhere in a JSON schema. */
function propertyNames(schema: unknown, found: string[] = []): string[] {
  if (schema && typeof schema === "object") {
    for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
      if (key === "properties" && value && typeof value === "object") {
        found.push(...Object.keys(value));
      }
      propertyNames(value, found);
    }
  }
  return found;
}

describe("there is no direct messaging", () => {
  it("exports nothing that sends, posts, delivers or holds a message", () => {
    const names = Object.keys(connect);
    expect(names.length).toBeGreaterThan(20);
    for (const name of names) {
      expect(name).not.toMatch(/messag|chat|inbox|thread|conversation|deliver|send|post|notify|reply/i);
    }
  });

  it("has no message, recipient or contact field in any record", () => {
    for (const name of [...propertyNames(connectionRequestSchema), ...propertyNames(routingTableSchema)]) {
      expect(name).not.toMatch(/messag|chat|inbox|thread|recipient|sender|deliver|email|phone|contact|url|address/i);
    }
    expect(connectionRequestSchema.properties.sentByApp).toEqual({ const: false });
  });

  it("makes no network call and opens no channel in the connection-flow sources", () => {
    const sources = runtimeSources();
    expect(sources.length).toBeGreaterThanOrEqual(10);
    for (const { file, code } of sources) {
      expect(code, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|navigator\.share|RTCPeerConnection|BroadcastChannel/);
      expect(code, file).not.toMatch(/https?:\/\/|mailto:|sms:|tel:/);
      expect(code, file).not.toMatch(/geolocation/);
    }
  });

  it("offers no screen text for writing to, or hearing from, another person", () => {
    const text = JSON.stringify(CONNECT_CATALOG);
    expect(text).not.toMatch(/send (a |your )?message|write to (a|your) peer|chat with|inbox|direct message|messagerie|clavard/i);
  });
});

describe("there is no mentor matching", () => {
  it("exports nothing that matches, pairs, ranks or lists peers or mentors", () => {
    for (const name of Object.keys(connect)) {
      expect(name).not.toMatch(/match|mentor|pair|candidate|rank|score|recommend|suggest/i);
    }
  });

  it("has no peer, mentor, candidate or match field in any record", () => {
    for (const name of [...propertyNames(connectionRequestSchema), ...propertyNames(routingTableSchema)]) {
      expect(name).not.toMatch(/match|mentor|candidate|peerId|profile|score|rank/i);
    }
  });

  it("does not use the package's demonstration matching or its made-up profiles", () => {
    for (const { file, code } of runtimeSources()) {
      expect(code, file).not.toMatch(/matching\.js|candidates\.js|matchRequest|DEMONSTRATION_PEERS|MatchOffer/);
    }
  });

  it("routes to a programme stream only, never to a person", () => {
    const route = connect.routeRequest({ contexts: ["work"] }, connect.RECORDED_ROUTING_TABLE);
    expect(Object.keys(route).sort()).toEqual(["kind", "reason"]);
    const streamShape = connectionRequestSchema.properties.route.oneOf[0];
    expect(Object.keys(streamShape?.properties ?? {}).sort()).toEqual(["context", "kind", "ruleId", "ruleScope", "streamId"]);
  });

  it("says nothing on screen about a mentor or a match", () => {
    const text = JSON.stringify(CONNECT_CATALOG);
    expect(text).not.toMatch(/mentor|matched|a match|jumel/i);
  });
});
