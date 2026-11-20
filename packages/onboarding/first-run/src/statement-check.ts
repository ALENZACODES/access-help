import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import { FACT_KEYS, type FactKey } from "./facts";
import { esc } from "./html";
import type { Note } from "./model";
import { groupPlaces, placeId, type Place } from "./places";
import { cueCounts, type Finding, type StatementForm } from "./statement";
import { CUE_COPY, quote, sentencesCount } from "./statement-copy";

/**
 * Checking a place's page against the person's own notes. If the place is
 * already in the notes (same name and address, as the places list counts
 * them), each detail shows what the notes record, and says when the page's
 * words point the other way. The App does not pick a side: it only puts the
 * two next to each other, so the person can look again or ask the place.
 */
export const CHECK_COPY = {
  known: {
    en: "This place is already in your notes. What they record is shown under each detail.",
    fr: "Ce lieu est déjà dans vos notes. Ce qu’elles indiquent figure sous chaque détail.",
  },
  inNotes: { en: "In your notes", fr: "Dans vos notes" },
  noRecord: { en: "Unknown, no record", fr: "UNKNOWN, aucune donnée" },
  differ: { en: "Reports differ", fr: "Les rapports divergent" },
  against: {
    en: "The page’s words point the other way. Look again, or ask the place.",
    fr: "Les mots de la page vont dans l’autre sens. Regardez de nouveau ou demandez au lieu.",
  },
  fileTitle: { en: "What a place’s accessibility page says", fr: "Ce que dit la page d’accessibilité d’un lieu" },
  fileWarning: {
    en: "The App only looked for words. Nothing here is a Yes or a No until a person decides.",
    fr: "L’App n’a fait que chercher des mots. Rien ici n’est un Oui ou un Non tant qu’une personne n’a pas décidé.",
  },
  filePage: { en: "Page", fr: "Page Web" },
  fileRead: { en: "Read on", fr: "Lu le" },
  fileNone: { en: "No sentence names this detail.", fr: "Aucune phrase ne nomme ce détail." },
  download: { en: "Download these sentences as text", fr: "Télécharger ces phrases en texte" },
} as const satisfies Record<string, Pair>;

export type NotesSay = { readonly kind: "unknown" } | { readonly kind: "agree"; readonly value: "yes" | "no"; readonly reports: number } | { readonly kind: "differ"; readonly reports: number };

/** The place in the notes with the same name and address, if any. */
export function knownPlace(notes: readonly Note[], placeName: string, address: string, locale: Locale): Place | undefined {
  if (placeName.trim() === "") return undefined;
  const id = placeId({ placeName: placeName.trim(), address: address.trim() === "" ? undefined : address.trim() });
  return groupPlaces(notes, locale).find((p) => p.id === id);
}

export function notesSay(place: Place, key: FactKey): NotesSay {
  const r = place.resolutions[key];
  if (r.kind === "unknown") return { kind: "unknown" };
  if (r.kind === "agree") return { kind: "agree", value: r.value, reports: r.observations.length };
  return { kind: "differ", reports: r.observations.length };
}

/**
 * True when the notes agree on a value and the page only uses words for the
 * other one. Mixed or unclear words never count as "against".
 */
export function against(say: NotesSay, finding: Finding): boolean {
  if (say.kind !== "agree") return false;
  const c = cueCounts(finding);
  if (say.value === "yes") return c.lacks > 0 && c.has === 0;
  return c.has > 0 && c.lacks === 0;
}

/** "In your notes: Yes (2 reports)". */
export function notesSayText(say: NotesSay, l: Locale): string {
  const colon = l === "fr" ? `${NB}: ` : ": ";
  const reports = (n: number): string => (l === "fr" ? `${n} ${n > 1 ? "rapports" : "rapport"}` : `${n} ${n === 1 ? "report" : "reports"}`);
  const what =
    say.kind === "unknown"
      ? t(CHECK_COPY.noRecord, l)
      : say.kind === "agree"
        ? `${t(COPY.values[say.value], l)} (${reports(say.reports)})`
        : `${t(CHECK_COPY.differ, l)} (${reports(say.reports)})`;
  return `${t(CHECK_COPY.inNotes, l)}${colon}${what}`;
}

/** The line under a detail on screen, or nothing when the place is not in the notes. */
export function renderNotesSay(place: Place | undefined, finding: Finding, l: Locale): string {
  if (!place) return "";
  const say = notesSay(place, finding.key);
  return (
    `<p data-notes-say="${say.kind === "agree" ? say.value : say.kind}">${esc(notesSayText(say, l))}</p>` +
    (against(say, finding) ? `<p class="notice" data-against>${esc(t(CHECK_COPY.against, l))}</p>` : "")
  );
}

export function renderKnown(place: Place | undefined, l: Locale): string {
  return place ? `<p class="notice" data-known-place>${esc(t(CHECK_COPY.known, l))}</p>` : "";
}

/** The sentences as a text file the person can keep, with the page and the date. No answers are in it: it says only what the words were. */
export function statementText(form: StatementForm, findings: readonly Finding[], l: Locale): string {
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(CHECK_COPY.fileTitle, l);
  const lines = [title, "=".repeat(Math.min(title.length, 72)), "", t(CHECK_COPY.fileWarning, l), ""];
  if (form.placeName.trim() !== "") lines.push(`${form.placeName.trim()}${form.address.trim() === "" ? "" : `, ${form.address.trim()}`}`);
  if (form.pageUrl.trim() !== "") lines.push(`${t(CHECK_COPY.filePage, l)}${colon} ${form.pageUrl.trim()}`);
  lines.push(`${t(CHECK_COPY.fileRead, l)} ${form.observedOn}`, "");
  for (const key of FACT_KEYS) {
    const f = findings.find((x) => x.key === key);
    const label = t(COPY.facts[key], l);
    const n = f ? f.mentions.length + f.more : 0;
    lines.push(`${label}${colon} ${sentencesCount(n, l)}`);
    if (!f || f.mentions.length === 0) lines.push(`- ${t(CHECK_COPY.fileNone, l)}`);
    for (const m of f?.mentions ?? []) lines.push(`- ${t(CUE_COPY[m.cue], l)}${colon} ${quote(m.sentence, l)}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** "page-<date>-<locale>.txt", "page-lieu-<date>-fr.txt". */
export function statementFilename(observedOn: string, l: Locale): string {
  return `${l === "fr" ? "page-lieu" : "place-page"}-${observedOn}-${l}.txt`;
}

export function checkStrings(): Array<[string, Pair]> {
  return Object.entries(CHECK_COPY).map(([k, p]): [string, Pair] => [`statement.check.${k}`, p]);
}
