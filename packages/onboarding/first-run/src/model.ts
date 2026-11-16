import {
  FACT_KEYS,
  OPEN_LICENCES,
  isIsoDate,
  normalizeFact,
  type Fact,
  type FactKey,
} from "./facts";

export const LIMITS = {
  placeName: 120,
  address: 200,
  note: 500,
  notes: 200,
  importChars: 1_000_000,
} as const;

/** A place note kept on this device. Details are always in FACT_KEYS order. */
export interface Note {
  readonly id: string;
  readonly placeName: string;
  readonly address: string | undefined;
  readonly note: string | undefined;
  /** ISO date the note was created. */
  readonly createdOn: string;
  /** Open licence the contributor chose for this note. */
  readonly licence: string;
  readonly facts: readonly Fact[];
}

export function hasControlChars(s: string, allowNewline = false): boolean {
  // eslint-disable-next-line no-control-regex
  return (allowNewline ? /[\u0000-\u0009\u000B-\u001F\u007F]/ : /[\u0000-\u001F\u007F]/).test(s);
}

function optionalText(v: unknown, max: number, newline = false): string | undefined | null {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length > max || hasControlChars(t, newline)) return null;
  return t === "" ? undefined : t;
}

/**
 * Validates an untrusted value (storage or import). Returns undefined when the
 * note is not usable. A yes/no detail without full provenance becomes unknown.
 */
export function parseNote(raw: unknown): Note | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const id = o["id"];
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return undefined;
  const placeName = o["placeName"];
  if (typeof placeName !== "string") return undefined;
  const name = placeName.trim();
  if (name === "" || name.length > LIMITS.placeName || hasControlChars(name)) return undefined;
  const address = optionalText(o["address"], LIMITS.address);
  const note = optionalText(o["note"], LIMITS.note, true);
  if (address === null || note === null) return undefined;
  const createdOn = o["createdOn"];
  if (typeof createdOn !== "string" || !isIsoDate(createdOn)) return undefined;
  const licence = o["licence"];
  if (typeof licence !== "string" || !OPEN_LICENCES.includes(licence)) return undefined;
  const list = Array.isArray(o["facts"]) ? (o["facts"] as unknown[]) : [];
  const facts = FACT_KEYS.map((key) => {
    const entry = list.find(
      (e) => e && typeof e === "object" && (e as Record<string, unknown>)["key"] === key,
    );
    return normalizeFact(key, entry).fact;
  });
  return { id, placeName: name, address, note, createdOn, licence, facts };
}

export function noteFact(n: Note, key: FactKey): Fact {
  return n.facts.find((f) => f.key === key) ?? { key, value: "unknown", provenance: undefined };
}
