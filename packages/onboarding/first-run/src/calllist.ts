import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import type { FactKey } from "./facts";
import { esc } from "./html";
import type { Place } from "./places";
import { QUESTIONS } from "./plan";
import { textExportHref } from "./textexport";

/**
 * A call list for one detail: the question to ask, then every place to ask it
 * of, with a line to write the answer and who gave it. For working through a
 * detail place by place. It is a list to print or keep; the App calls no one,
 * and nothing on it becomes a record until the person adds a note.
 */
export const CALL_LIST_COPY = {
  title: { en: "Call list", fr: "Liste d’appels" },
  ask: { en: "Ask each place", fr: "Demandez à chaque lieu" },
  answer: { en: "Answer", fr: "Réponse" },
  who: { en: "Who answered, and the date", fr: "Qui a répondu, et la date" },
  after: {
    en: "Add a note for each answer with who gave it and the date. Until then the detail stays as it is.",
    fr: "Ajoutez une note pour chaque réponse avec qui l’a donnée et la date. D’ici là, le détail reste tel quel.",
  },
  download: { en: "Download the call list for", fr: "Télécharger la liste d’appels pour" },
} as const satisfies Record<string, Pair>;

const LINK_STYLE = "display:inline-flex;align-items:center;min-height:44px;min-width:44px";

export function callListText(key: FactKey, places: readonly Place[], locale: Locale, today: Date): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = `${t(CALL_LIST_COPY.title, l)}${colon} ${t(COPY.facts[key], l)}`;
  const lines = [title, "=".repeat(Math.min(Math.max(title.length, 3), 72)), "", `${t(CALL_LIST_COPY.ask, l)}${colon} ${QUESTIONS[key][l]}`, ""];
  places.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name}${p.address ? `, ${p.address}` : ""}`);
    lines.push(`   ${t(CALL_LIST_COPY.answer, l)}${colon} ____________________`);
    lines.push(`   ${t(CALL_LIST_COPY.who, l)}${colon} ____________________`);
    lines.push("");
  });
  lines.push(t(CALL_LIST_COPY.after, l), `${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function callListFilename(key: FactKey, today: Date, locale: Locale): string {
  return `${locale === "fr" ? "liste-appels" : "call-list"}-${key}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}

/** "Download the call list for Elevator". The detail in the name keeps each link's name unique on a page. */
export function callListLabel(key: FactKey, locale: Locale): string {
  return `${t(CALL_LIST_COPY.download, locale)} ${t(COPY.facts[key], locale)}`;
}

/** The download link; nothing when there is no place to call. */
export function renderCallListLink(key: FactKey, places: readonly Place[], locale: Locale, today: Date): string {
  if (places.length === 0) return "";
  return (
    `<p><a class="linkbtn" data-call-list="${key}" download="${esc(callListFilename(key, today, locale))}" href="${esc(textExportHref(callListText(key, places, locale, today)))}" style="${LINK_STYLE}">` +
    `${esc(callListLabel(key, locale))}</a></p>`
  );
}

export function callListStrings(): Array<[string, Pair]> {
  return Object.entries(CALL_LIST_COPY).map(([k, p]): [string, Pair] => [`CALL_LIST_COPY.${k}`, p]);
}
