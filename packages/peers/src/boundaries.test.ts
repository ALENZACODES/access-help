import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as peers from "./index.js";
import { CONNECT_CATALOG } from "./connect/strings.js";
import { CATALOG } from "./strings.js";
import * as ui from "./ui/index.js";

/**
 * Whole-package boundaries. The rule is that the App has no direct messaging and no
 * mentor matching. `connect/boundaries.test.ts` holds the connection flow to it; these
 * tests hold every export, every schema, every runtime source and every screen string
 * of the package to it, so the retired demonstration matching cannot come back.
 */
const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const srcDir = join(packageRoot, "src");
const schemaDir = join(packageRoot, "schemas");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

/** Everything that can run in a host app: no tests and no test fixtures. */
const runtimeSources = walk(srcDir)
  .filter((path) => /\.(ts|tsx)$/.test(path) && !/\.test\.tsx?$/.test(path) && !path.includes(`${join(srcDir, "testing")}`))
  .map((path) => ({ file: relative(packageRoot, path), code: readFileSync(path, "utf8") }));

const schemas = readdirSync(schemaDir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => ({ name, schema: JSON.parse(readFileSync(join(schemaDir, name), "utf8")) as unknown }));

function propertyNames(schema: unknown, found: string[] = []): string[] {
  if (schema && typeof schema === "object") {
    for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
      if (key === "properties" && value && typeof value === "object") found.push(...Object.keys(value));
      propertyNames(value, found);
    }
  }
  return found;
}

const exportedNames = [...Object.keys(peers), ...Object.keys(ui)];
const screenText = JSON.stringify([CATALOG, CONNECT_CATALOG]);
const packageFiles = walk(packageRoot)
  .filter((path) => !path.includes("node_modules") && !path.includes(`${join(packageRoot, "dist")}`))
  .map((path) => relative(packageRoot, path));

describe("the package has no direct messaging", () => {
  it("exports nothing that sends, posts, delivers or holds a message", () => {
    expect(exportedNames.length).toBeGreaterThan(30);
    for (const name of exportedNames) {
      expect(name).not.toMatch(/messag|chat|inbox|thread|conversation|deliver|send|post|notify|reply/i);
    }
  });

  it("has no message, sender or recipient field in any schema", () => {
    expect(schemas.length).toBeGreaterThanOrEqual(4);
    for (const { name, schema } of schemas) {
      for (const property of propertyNames(schema)) {
        expect(property, name).not.toMatch(/messag|chat|inbox|thread|recipient|sender|deliver/i);
      }
    }
  });

  it("has no contact field in any request record", () => {
    for (const { name, schema } of schemas.filter((entry) => /request/.test(entry.name))) {
      for (const property of propertyNames(schema)) {
        expect(property, name).not.toMatch(/email|phone|contact|url|address/i);
      }
    }
  });

  it("makes no network call and opens no channel in any runtime source", () => {
    expect(runtimeSources.length).toBeGreaterThanOrEqual(18);
    for (const { file, code } of runtimeSources) {
      expect(code, file).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|navigator\.share|RTCPeerConnection|BroadcastChannel/);
      expect(code, file).not.toMatch(/mailto:|sms:|tel:/);
      expect(code, file).not.toMatch(/geolocation/);
    }
  });

  it("holds one web address only: the labelled placeholder of the partner signpost", () => {
    const addresses = runtimeSources.flatMap(({ file, code }) => (code.match(/https?:\/\/[^\s"'`)]+/g) ?? []).map((address) => `${file} ${address}`));
    expect(addresses).toEqual(["src/partner.ts https://example.invalid/peer-programme"]);
  });

  it("offers no screen text for writing to, or hearing from, another person", () => {
    expect(screenText).not.toMatch(/send (a |your )?message|write to (a|your) peer|chat with|inbox|direct message|messagerie|clavard/i);
  });
});

describe("the package has no mentor matching", () => {
  it("exports nothing that matches, pairs, ranks or lists peers or mentors", () => {
    for (const name of exportedNames) {
      expect(name).not.toMatch(/match|mentor|pair|candidate|rank|score|recommend|suggest/i);
    }
  });

  it("exports one screen, the request flow, and no matching screen", () => {
    expect(Object.keys(ui)).toEqual(["PeerRequestFlow"]);
  });

  it("has no peer, mentor, candidate or match field in any schema", () => {
    for (const { name, schema } of schemas) {
      for (const property of propertyNames(schema)) {
        expect(property, name).not.toMatch(/match|mentor|candidate|peerId|profile|score|rank/i);
      }
    }
  });

  it("ships no matching module, made-up profile list, match schema or matching screen", () => {
    for (const file of packageFiles) {
      expect(file).not.toMatch(/match|candidate|mentor|PeerConnect/i);
    }
    expect(existsSync(join(schemaDir, "peer-request.schema.json"))).toBe(true);
  });

  it("has no matching code or made-up profiles in any runtime source", () => {
    for (const { file, code } of runtimeSources) {
      expect(code, file).not.toMatch(/matchRequest|DEMONSTRATION_PEERS|MatchOffer|MatchResult|PeerCandidate|candidateId|matchedOn|no_match/);
      expect(code, file).not.toMatch(/mentor/i);
    }
  });

  it("says nothing on screen about a mentor, a match or made-up profiles", () => {
    expect(screenText).not.toMatch(/mentor|match|jumel|apparie|profile|profil/i);
  });
});
