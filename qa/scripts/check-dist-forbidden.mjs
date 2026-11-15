#!/usr/bin/env node
/**
 * CI-only: grep every built app dist for decoded forbidden organisation names.
 * Terms are stored as character codes in this script. Do not import this from UI code.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));

const ENCODED = [
  { id: "short", codes: [83, 67, 73, 79] },
  { id: "en-long", codes: [83, 112, 105, 110, 97, 108, 32, 67, 111, 114, 100, 32, 73, 110, 106, 117, 114, 121, 32, 79, 110, 116, 97, 114, 105, 111] },
  { id: "fr-long", codes: [76, 233, 115, 105, 111, 110, 115, 32, 77, 233, 100, 117, 108, 108, 97, 105, 114, 101, 115, 32, 79, 110, 116, 97, 114, 105, 111] },
];

const EXPECTED_DISTS = ["apps/centre/dist", "packages/event-access/dist", "packages/glossary/dist"];

function fromCodes(codes) {
  return String.fromCharCode(...codes);
}

function findDistDirs(dir, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const path = join(dir, entry);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    if (entry === "dist") found.push(path);
    else findDistDirs(path, found);
  }
  return found;
}

function walkFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walkFiles(path, files);
    else files.push(path);
  }
  return files;
}

const distDirs = findDistDirs(root);
const missing = EXPECTED_DISTS.filter((item) => !existsSync(join(root, item)));
if (missing.length > 0) {
  console.error(`check-dist-forbidden: missing built app output: ${missing.join(", ")}. Run npm run build first.`);
  process.exit(1);
}
if (distDirs.length === 0) {
  console.error("check-dist-forbidden: no dist directories found. Run npm run build first.");
  process.exit(1);
}

const terms = ENCODED.map(({ id, codes }) => ({ id, term: fromCodes(codes) }));
const hits = [];
for (const dist of distDirs) {
  for (const file of walkFiles(dist)) {
    if (!/\.(js|css|html|json|txt|webmanifest|map|svg)$/i.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const { id, term } of terms) {
      const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+"), "i");
      if (pattern.test(text)) hits.push(`${relative(root, file)}: ${id}`);
    }
  }
}

if (hits.length > 0) {
  console.error("Forbidden organisation names found in a built bundle:");
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}

const checked = distDirs.map((dir) => relative(root, dir)).sort().join(", ");
console.log(`check-dist-forbidden: no forbidden terms in ${checked}.`);
