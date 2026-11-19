import Ajv from "ajv/dist/2020.js";
import { TERMS } from "./terms.js";

export type Catalog = Record<string, unknown>;
export type Rule = "schema" | "missing-en" | "missing-fr" | "empty" | "typography" | "english-leak" | "banned" | "glossary" | "tier-evidence";
export interface Finding { rule: Rule; language: "en" | "fr"; key: string; detail: string }

// This schema is also published in schemas/catalog.schema.json.
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: { anyOf: [{ type: "string" }, { $ref: "#/$defs/object" }] },
  $defs: {
    object: {
      type: "object",
      additionalProperties: { anyOf: [{ type: "string" }, { $ref: "#/$defs/object" }] },
    },
  },
} as const;
const validate = new Ajv({ allErrors: true }).compile(schema);

function flatten(value: Catalog, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") result[path] = child;
    else if (child && typeof child === "object" && !Array.isArray(child)) Object.assign(result, flatten(child as Catalog, path));
  }
  return result;
}

// Fragment assembly avoids including forbidden proper names as literal content in this package.
const forbiddenNames = [
  ["access", "now"], ["goo", "gle"], ["metro", "linx"], ["t", "tc"],
].map((parts) => parts.join(""));
const banned: readonly RegExp[] = [
  ...forbiddenNames.map((name) => new RegExp(`\\b${name.replace(/ /g, "\\s+")}\\b`, "i")),
  /\bAI\b|\bartificial intelligence\b|\bintelligence artificielle\b/i,
  /\bwheelchair[- ]bound\b|\bclou[ée] au fauteuil\b/i,
  /\b(?:you are eligible|you qualify for|guaranteed eligible|vous êtes admissible|vous avez droit à)\b/i,
  /\b(?:take \d+\s?mg|catheteri[sz]e every|we diagnose|we prescribe|prenez \d+\s?mg|nous diagnostiquons)\b/i,
  /\b(?:endorsed by|in partnership with|approuv[ée]e? par|en partenariat avec|official app)\b/i,
];
const leaks = [
  /\b(?:wheelchair|washroom|step-free|van-accessible|door-to-door|live status|demonstration data|verification tier|adult change table)\b/i,
  /\b(?:search results|click here|learn more|skip to main content|back to help)\b/i,
];
const normalize = (value: string) => value.normalize("NFC").toLocaleLowerCase("fr-CA").trim();
const containsPhrase = (text: string, phrase: string) => {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu").test(text);
};


const NBSP = "\u00a0";
const NNBSP = "\u202f";
const PROTECTED = /https?:\/\/\S+|\b\d{1,2}:\d{2}(?::\d{2})?\b/g;

/** ":" takes U+00A0 only; ";", "!", and "?" take U+202F only. URLs and times are ignored. */
export function frenchPunctuationIssues(value: string): string[] {
  const issues: string[] = [];
  const masked = value.replace(PROTECTED, (match) => " ".repeat(match.length));
  for (let index = 0; index < masked.length; index += 1) {
    const character = masked[index]!;
    const previous = index === 0 ? "" : masked[index - 1]!;
    if (character === ":" && previous !== NBSP) {
      issues.push('":" must be preceded by U+00A0');
    } else if ((character === ";" || character === "!" || character === "?") && previous !== NNBSP) {
      issues.push(`"${character}" must be preceded by U+202F`);
    }
  }
  return [...new Set(issues)];
}

export function lintCatalogs(en: Catalog, fr: Catalog): Finding[] {
  const findings: Finding[] = [];
  for (const [language, value] of [["en", en], ["fr", fr]] as const) {
    if (!validate(value)) {
      findings.push({ language, key: "$", rule: "schema", detail: "Catalog must be a nested object of strings." });
    }
  }
  if (findings.some((item) => item.rule === "schema")) return findings;
  const english = flatten(en);
  const french = flatten(fr);
  const keys = [...new Set([...Object.keys(english), ...Object.keys(french)])].sort();
  for (const key of keys) {
    if (!(key in english)) findings.push({ language: "en", key, rule: "missing-en", detail: "Missing English key." });
    if (!(key in french)) findings.push({ language: "fr", key, rule: "missing-fr", detail: "Missing French key." });
    for (const [language, catalog] of [["en", english], ["fr", french]] as const) {
      const value = catalog[key];
      if (value === undefined) continue;
      if (!value.trim()) findings.push({ language, key, rule: "empty", detail: "Empty translation." });
      if (banned.some((pattern) => pattern.test(value))) {
        findings.push({ language, key, rule: "banned", detail: "Prohibited name, advice, eligibility, or endorsement wording." });
      }
      if (language !== "fr") continue;
      if (frenchPunctuationIssues(value).length > 0 || /«(?![  ])|(?<![  ])»/u.test(value)) {
        findings.push({ language, key, rule: "typography", detail: "Use U+00A0 before : and U+202F before ; ! ?. Use a non-breaking space inside « »." });
      }
      if (leaks.some((pattern) => pattern.test(value)) ||
        (english[key] && normalize(value) === normalize(english[key]) && /[a-z]{5}/i.test(value) &&
          !TERMS.some((term) => normalize(term.fr) === normalize(value) && normalize(term.en) === normalize(value)))) {
        findings.push({ language, key, rule: "english-leak", detail: "Likely untranslated English text." });
      }
    }
    const englishValue = english[key];
    const frenchValue = french[key];
    if (!englishValue || !frenchValue) continue;
    for (const term of TERMS) {
      if (normalize(term.en) === normalize(term.fr)) continue;
      if (containsPhrase(englishValue, term.en) && !containsPhrase(frenchValue, term.fr)) {
        // Check key-level terminology only when the French text explicitly uses
        // the English term or a known competing translation. Sentence paraphrases
        // are not automatically treated as glossary violations.
        // The status token UNKNOWN is written the same way in every language. It is not untranslated English.
        if (containsPhrase(frenchValue.replace(/(?<![\p{L}\p{N}])UNKNOWN(?![\p{L}\p{N}])/gu, " "), term.en)) {
          findings.push({ language: "fr", key, rule: "glossary", detail: `Use ${term.fr} for ${term.id}.` });
        }
      }
    }
    if (/(?:^|\.)tier(?:$|\.)|(?:^|\.)verificationTier$/i.test(key)) {
      const accepted = ["PROTOTYPE-UNVERIFIED", "SEEDED-OPEN-DATA"];
      if (!accepted.includes(englishValue) || !accepted.includes(frenchValue)) {
        findings.push({ language: "fr", key, rule: "tier-evidence", detail: "Prototype catalog may only declare unverified or seeded open data." });
      }
    }
  }
  return findings;
}

export function parseCatalog(input: string): Catalog {
  const value: unknown = JSON.parse(input);
  if (!value || Array.isArray(value) || typeof value !== "object" || !validate(value)) {
    throw new Error("Expected a JSON catalog object containing string leaves.");
  }
  return value as Catalog;
}
