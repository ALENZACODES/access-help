import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import { esc } from "./html";
import type { Place } from "./places";
import type { RoundupPlace } from "./roundup";
import { textExportHref } from "./textexport";

/**
 * A short call script for one shortlisted place: what to say, the questions
 * not yet ticked as asked, and a reminder to note who answered and when, so a
 * new answer can be saved with its source and date. It is a script to read,
 * not advice; the App never calls or writes to anyone.
 */
export const CALL_COPY = {
  title: { en: "Call script", fr: "Texte pour l’appel" },
  hello: {
    en: "Hello. I am planning a visit to {place} and have a few questions about access.",
    fr: "Bonjour. Je prépare une visite à {place} et j’ai quelques questions sur l’accès.",
  },
  thanks: {
    en: "Thank you. May I note your name or role, and today’s date, with your answers?",
    fr: "Merci. Puis-je noter votre nom ou votre fonction, et la date d’aujourd’hui, avec vos réponses\u202F?",
  },
  after: {
    en: "After the call, add a note with each answer, who gave it and the date. Until then each detail stays as it is.",
    fr: "Après l’appel, ajoutez une note avec chaque réponse, qui l’a donnée et la date. D’ici là, chaque détail reste tel quel.",
  },
  download: { en: "Download the call script", fr: "Télécharger le texte pour l’appel" },
  noScript: { en: "Every question here is ticked as asked, so there is no call script.", fr: "Toutes les questions ici sont cochées comme posées, donc il n’y a pas de texte pour l’appel." },
} as const satisfies Record<string, Pair>;

const LINK_STYLE = "display:inline-flex;align-items:center;min-height:44px;min-width:44px";

/** The questions still to ask, in the round-up's order. */
export function scriptQuestions(p: RoundupPlace): string[] {
  return p.questions.filter((q) => !q.asked).map((q) => q.text);
}

/** The script as lines; empty when nothing is left to ask. The place name is the person's own text. */
export function callScriptLines(p: RoundupPlace, locale: Locale): string[] {
  return scriptLines(p.place.name, scriptQuestions(p), locale);
}

/** Greeting, numbered questions, then the request for a name and date. Empty with no question. */
export function scriptLines(placeName: string, questions: readonly string[], locale: Locale): string[] {
  if (questions.length === 0) return [];
  return [t(CALL_COPY.hello, locale).replace("{place}", placeName), ...questions.map((q, i) => `${i + 1}. ${q}`), t(CALL_COPY.thanks, locale)];
}

export function callScriptText(p: RoundupPlace, locale: Locale, today: Date): string {
  return scriptText(p.place, scriptQuestions(p), locale, today);
}

/** The script file for any place and list of questions. */
export function scriptText(place: Place, questions: readonly string[], locale: Locale, today: Date): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = `${t(CALL_COPY.title, l)}${colon} ${place.name}`;
  const lines = [title, "=".repeat(Math.min(Math.max(title.length, 3), 72)), ""];
  if (place.address) lines.push(place.address, "");
  const script = scriptLines(place.name, questions, l);
  if (script.length === 0) lines.push(t(CALL_COPY.noScript, l));
  else lines.push(...script, "", t(CALL_COPY.after, l));
  lines.push("", `${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function callScriptFilename(p: RoundupPlace, today: Date, locale: Locale): string {
  return scriptFilename(p.place, today, locale);
}

export function scriptFilename(place: Place, today: Date, locale: Locale): string {
  return `${locale === "fr" ? "appel" : "call"}-${place.id}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}

/**
 * Just the download link, for pages that already list the questions (the
 * "ask about again" page). Tied to the place's heading so its name is clear.
 */
export function renderScriptLink(place: Place, questions: readonly string[], titleId: string, locale: Locale, today: Date): string {
  if (questions.length === 0) return "";
  return (
    `<a class="linkbtn" data-call-script download="${esc(scriptFilename(place, today, locale))}" href="${esc(textExportHref(scriptText(place, questions, locale, today)))}" aria-describedby="${esc(titleId)}" style="${LINK_STYLE}">` +
    `${esc(t(CALL_COPY.download, locale))}</a>`
  );
}

/** The block on a round-up card. Nothing when every question is ticked as asked. */
export function renderCallScript(p: RoundupPlace, index: number, locale: Locale, today: Date): string {
  const lines = callScriptLines(p, locale);
  if (lines.length === 0) return "";
  const id = `call-${index}`;
  const titleId = `roundup-place-${index}`;
  const rest = lines.slice(1);
  const thanks = rest.pop() ?? "";
  // The place name is the person's own text, so only it is marked as theirs.
  const [before, after] = t(CALL_COPY.hello, locale).split("{place}");
  const hello = `${esc(before ?? "")}<span data-user-content>${esc(p.place.name)}</span>${esc(after ?? "")}`;
  return (
    `<section class="call-script" aria-labelledby="${id}"><h4 id="${id}">${esc(t(CALL_COPY.title, locale))}</h4>` +
    `<p>${hello}</p><ol>${rest.map((q) => `<li>${esc(q.replace(/^\d+\. /, ""))}</li>`).join("")}</ol><p>${esc(thanks)}</p>` +
    `<p class="hint">${esc(t(CALL_COPY.after, locale))}</p>` +
    `<p><a class="linkbtn" download="${esc(callScriptFilename(p, today, locale))}" href="${esc(textExportHref(callScriptText(p, locale, today)))}" aria-describedby="${titleId}" style="${LINK_STYLE}">${esc(t(CALL_COPY.download, locale))}</a></p></section>`
  );
}

export function callStrings(): Array<[string, Pair]> {
  return Object.entries(CALL_COPY).map(([k, p]): [string, Pair] => [`CALL_COPY.${k}`, p]);
}
