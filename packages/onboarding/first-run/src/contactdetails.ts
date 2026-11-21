import { exportNotes } from "./exchange";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, type Fact } from "./facts";
import type { StreetFile } from "./filestreets";
import { LIMITS, hasControlChars, parseNote, type Note } from "./model";
import { csvField, guardCell } from "./notes-csv";

/**
 * "Remove contact details": the emails and phone numbers in a notes file,
 * found the same way the App's file check notices them, in each note's text,
 * each place name and each source name. For each one the person keeps the
 * text, removes just the contact details, removes the whole note text, or
 * writes the text again, and gets a copy to share. Only the person knows
 * whether a number is a shop's public line or someone's own phone, so the App
 * never removes anything unless asked. The list it downloads names where the
 * details are, never the details themselves.
 */

export type ContactKind = "email" | "phone";
export type ContactField = "note" | "name" | "source";
export const CONTACT_FIELDS: readonly ContactField[] = ["name", "note", "source"];

/** Longest source name this tool will write, as for place names. */
export const MAX_SOURCE = LIMITS.placeName;

export interface Contact {
  readonly kind: ContactKind;
  readonly start: number;
  readonly end: number;
}

export interface Finding {
  /** "name|n1", "note|n1" or "source|City survey". */
  readonly id: string;
  readonly field: ContactField;
  /** The text as it is in the file. */
  readonly text: string;
  readonly contacts: readonly Contact[];
  /** The text with the contact details taken out and the spacing tidied; may be empty. */
  readonly without: string;
  /** Notes the text is in: one for a name or note text, every note using the source for a source. */
  readonly notes: readonly Note[];
  /** Place name to show it under: the note's place, or the first place using the source. */
  readonly place: string;
  /** Records that use the source; 0 for a name or note text. */
  readonly records: number;
}

export interface ContactsReport {
  readonly notes: number;
  /** Names first, then note texts, then sources; by place name within each. */
  readonly findings: readonly Finding[];
}

export type ContactChoice = { readonly kind: "keep" } | { readonly kind: "remove" } | { readonly kind: "clear" } | { readonly kind: "text"; readonly text: string };

export type ContactProblem = "empty" | "too-long" | "control" | "contributor";

export interface CleanedCopy {
  readonly notes: readonly Note[];
  /** Findings whose text changed. */
  readonly changed: number;
  /** Notes changed. */
  readonly notesChanged: number;
  /** Of the findings that changed, those whose new text still holds an email or a phone number. */
  readonly stillHas: number;
}

export interface ContactChange {
  readonly finding: Finding;
  /** The text now; empty when the note text was removed. */
  readonly to: string;
  readonly stillHas: boolean;
}

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;

/**
 * How much of a match is the email: sentence punctuation after it (and a
 * closing bracket it did not open) belongs to the text around it, as long as
 * what is left is still an email.
 */
function emailLength(m: string): number {
  let s = m;
  while (/[.,;:!?]$/.test(s) || (s.endsWith(")") && !s.includes("("))) {
    const shorter = s.slice(0, -1);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shorter)) break;
    s = shorter;
  }
  return s.length;
}

/** The emails and phone numbers in a text, in order, as the App's file check finds them. */
export function findContacts(text: string): Contact[] {
  const out: Contact[] = [];
  for (const m of text.matchAll(EMAIL)) out.push({ kind: "email", start: m.index, end: m.index + emailLength(m[0]) });
  for (const m of text.matchAll(PHONE)) {
    if (m[0].replace(/\D/g, "").length < 10) continue;
    // "(416) 555-0100": the match starts at the digits, so take in the bracket the number closes.
    const opens = m.index > 0 && text[m.index - 1] === "(" && /^[^(]*\)/.test(m[0]);
    const start = opens ? m.index - 1 : m.index;
    const end = m.index + m[0].length;
    // A number inside an email is part of the email.
    if (out.some((c) => c.kind === "email" && start < c.end && end > c.start)) continue;
    out.push({ kind: "phone", start, end });
  }
  return out.sort((a, b) => a.start - b.start);
}

export function hasContact(text: string | undefined): boolean {
  return text !== undefined && findContacts(text).length > 0;
}

/** The text with its contact details taken out: no doubled spaces, no space before punctuation, no empty brackets, no stray separators at the ends. */
export function withoutContacts(text: string): string {
  let out = "";
  let at = 0;
  for (const c of findContacts(text)) {
    out += text.slice(at, c.start);
    at = c.end;
  }
  out += text.slice(at);
  return out
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.;:!?)])/g, "$1")
    .replace(/([,;:])(?:\s*[,;:])+/g, "$1")
    .split("\n")
    .map((line) => line.trim().replace(/^[,;:\-–—]\s*/, "").replace(/\s*[,;:\-–—]$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const byPlace = (a: Finding, b: Finding): number => a.place.localeCompare(b.place) || a.id.localeCompare(b.id);

export function contactFindings(file: StreetFile): ContactsReport {
  const notes = file.places.flatMap((p) => p.notes);
  const names: Finding[] = [];
  const texts: Finding[] = [];
  const sources = new Map<string, { notes: Note[]; records: number; place: string }>();
  const make = (id: string, field: ContactField, text: string, on: Note[], place: string, records: number): Finding => ({
    id,
    field,
    text,
    contacts: findContacts(text),
    without: withoutContacts(text),
    notes: on,
    place,
    records,
  });
  for (const n of notes) {
    if (hasContact(n.placeName)) names.push(make(`name|${n.id}`, "name", n.placeName, [n], n.placeName, 0));
    if (n.note !== undefined && hasContact(n.note)) texts.push(make(`note|${n.id}`, "note", n.note, [n], n.placeName, 0));
    for (const f of n.facts) {
      if (!f.provenance || !hasContact(f.provenance.source)) continue;
      const s = sources.get(f.provenance.source) ?? { notes: [], records: 0, place: n.placeName };
      if (!s.notes.includes(n)) s.notes.push(n);
      s.records += 1;
      if (n.placeName.localeCompare(s.place) < 0) s.place = n.placeName;
      sources.set(f.provenance.source, s);
    }
  }
  const src = [...sources].map(([text, s]) => make(`source|${text}`, "source", text, s.notes, s.place, s.records));
  return { notes: notes.length, findings: [...names.sort(byPlace), ...texts.sort(byPlace), ...src.sort(byPlace)] };
}

/** The choices a finding offers: removing the contact details needs something left for a name or source, and only note text can be removed whole. */
export function canRemove(f: Finding): boolean {
  return f.field === "note" || f.without !== "";
}

export function canClear(f: Finding): boolean {
  return f.field === "note";
}

/** What is wrong with text written again, if anything. An email or phone number left in it is allowed: it is the person's to keep. */
export function textProblem(f: Finding, typed: string): ContactProblem | undefined {
  const s = typed.trim();
  if (f.field === "note") {
    if (s.length > LIMITS.note) return "too-long";
    if (hasControlChars(s, true)) return "control";
    return undefined;
  }
  if (s === "") return "empty";
  if (s.length > (f.field === "name" ? LIMITS.placeName : MAX_SOURCE)) return "too-long";
  if (hasControlChars(s)) return "control";
  if (f.field === "source" && s === CONTRIBUTOR_SOURCE) return "contributor";
  return undefined;
}

/** The text a choice gives a finding, or undefined when it keeps the text or is not allowed. */
export function newText(f: Finding, c: ContactChoice | undefined): string | undefined {
  if (!c || c.kind === "keep") return undefined;
  if (c.kind === "remove") return canRemove(f) ? f.without : undefined;
  if (c.kind === "clear") return canClear(f) ? "" : undefined;
  if (textProblem(f, c.text) !== undefined) return undefined;
  return c.text.trim();
}

function sameFacts(a: readonly Fact[], b: readonly Fact[]): boolean {
  return FACT_KEYS.every((k) => {
    const x = a.find((f) => f.key === k);
    const y = b.find((f) => f.key === k);
    const p = x?.provenance;
    const q = y?.provenance;
    return x?.value === y?.value && (p === q || (!!p && !!q && p.source === q.source && p.licence === q.licence && p.recordedOn === q.recordedOn));
  });
}

/**
 * The file's notes with the choices applied. Each changed note goes through
 * the App's own note reader and goes into the copy only when every change
 * came through as chosen and every record kept its answer, licence and date;
 * otherwise it stays as it was.
 */
export function applyContacts(file: StreetFile, r: ContactsReport, choices: ReadonlyMap<string, ContactChoice>): CleanedCopy {
  const names = new Map<string, string>();
  const texts = new Map<string, string>();
  const sources = new Map<string, string>();
  const used = new Map<string, Finding>();
  for (const f of r.findings) {
    const to = newText(f, choices.get(f.id));
    if (to === undefined || to === f.text) continue;
    used.set(f.id, f);
    const noteId = f.notes[0]?.id ?? "";
    if (f.field === "name") names.set(noteId, to);
    else if (f.field === "note") texts.set(noteId, to);
    else sources.set(f.text, to);
  }
  const notes: Note[] = [];
  const done = new Set<string>();
  const before = file.places.flatMap((p) => p.notes);
  for (const n of before) {
    const name = names.get(n.id);
    const text = texts.get(n.id);
    const facts: Fact[] = n.facts.map((f) => {
      const to = f.provenance ? sources.get(f.provenance.source) : undefined;
      return f.provenance && to !== undefined ? { ...f, provenance: { ...f.provenance, source: to } } : f;
    });
    const touched = name !== undefined || text !== undefined || facts.some((f, i) => f !== n.facts[i]);
    if (!touched) {
      notes.push(n);
      continue;
    }
    const want = { ...n, placeName: name ?? n.placeName, note: text === undefined ? n.note : text === "" ? undefined : text, facts };
    const parsed = parseNote(want);
    if (parsed && parsed.placeName === want.placeName && parsed.note === want.note && sameFacts(parsed.facts, facts)) {
      notes.push(parsed);
      if (name !== undefined) done.add(`name|${n.id}`);
      if (text !== undefined) done.add(`note|${n.id}`);
      for (const f of n.facts) if (f.provenance && sources.has(f.provenance.source)) done.add(`source|${f.provenance.source}`);
    } else notes.push(n);
  }
  const changedNotes = notes.filter((n, i) => n !== before[i]).length;
  const stillHas = [...done].filter((id) => {
    const f = used.get(id);
    return f !== undefined && hasContact(newText(f, choices.get(id)));
  }).length;
  return { notes, changed: done.size, notesChanged: changedNotes, stillHas };
}

/**
 * What the copy changed, read from the copy itself, in the list's order. A
 * source counts as changed only when no note in the copy still uses its old
 * name.
 */
export function contactChanges(r: ContactsReport, c: CleanedCopy): ContactChange[] {
  const byId = new Map<string, Note>(c.notes.map((n) => [n.id, n]));
  const out: ContactChange[] = [];
  for (const f of r.findings) {
    let to: string | undefined;
    if (f.field === "source") {
      const now = f.notes.map((n) => byId.get(n.id));
      const left = now.some((n) => n?.facts.some((x) => x.provenance?.source === f.text));
      if (left) continue;
      // The new name: the source of the first record that used the old one.
      const key = f.notes[0]?.facts.find((x) => x.provenance?.source === f.text)?.key;
      to = now[0]?.facts.find((x) => x.key === key)?.provenance?.source;
    } else {
      const n = byId.get(f.notes[0]?.id ?? "");
      to = f.field === "name" ? n?.placeName : (n?.note ?? "");
    }
    if (to === undefined || to === f.text) continue;
    out.push({ finding: f, to, stillHas: hasContact(to) });
  }
  return out;
}

export function cleanedFile(c: CleanedCopy, today: Date): string {
  return exportNotes([...c.notes], today.toISOString().slice(0, 10));
}

export const CONTACTS_CSV_COLUMNS = ["place_name", "field", "emails", "phone_numbers", "notes", "records"] as const;

/**
 * Where the contact details are, guarded like the App's own CSV. It holds
 * counts, never the details themselves, so the list can be passed on without
 * passing them on; a place name that holds one is shown without it.
 */
export function contactsCsv(r: ContactsReport): string {
  const rows: string[][] = [[...CONTACTS_CSV_COLUMNS]];
  for (const f of r.findings) {
    const n = (k: ContactKind): string => String(f.contacts.filter((c) => c.kind === k).length);
    rows.push([withoutContacts(f.place), f.field, n("email"), n("phone"), String(f.notes.length), String(f.records)]);
  }
  return `\uFEFF${rows.map((x) => x.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}
