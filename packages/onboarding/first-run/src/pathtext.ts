import { localizePath, type OnboardingPath } from "../../src/paths";
import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { doneCount, isDone, progressText, type PathProgress } from "./pathprogress";

/**
 * A short path as plain text, with the person's own ticks, to print or keep.
 * Every step is written in full; a tick only says the person marked it done.
 */
export function pathToText(path: OnboardingPath, progress: PathProgress, locale: Locale, today: Date): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const lp = localizePath(path, l);
  const lines = [lp.title, "=".repeat(Math.min(Math.max(lp.title.length, 3), 72)), "", lp.summary, ""];
  lines.push(`${t(COPY.pathText.progress, l)}${colon} ${progressText(doneCount(progress, path.id), path.steps.length, l)}`, "");
  lp.steps.forEach((s, i) => {
    lines.push(`${i + 1}. [${isDone(progress, path.id, s.id) ? "x" : " "}] ${s.title}`);
    lines.push(`   ${s.body}`);
    if (s.appRoute) lines.push(`   ${t(COPY.pathText.where, l)}${colon} ${s.appRoute}`);
    lines.push("");
  });
  lines.push(t(COPY.pathText.ticksNote, l));
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

/**
 * A path as plain text with no ticks and no date, for the all-help file. The
 * same for everyone, so it never carries what one person ticked.
 */
export function pathPlainText(path: OnboardingPath, locale: Locale): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const lp = localizePath(path, l);
  const lines = [lp.title, "-".repeat(Math.min(Math.max(lp.title.length, 3), 72)), lp.summary];
  lp.steps.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.title}`, `   ${s.body}`);
    if (s.appRoute) lines.push(`   ${t(COPY.pathText.where, l)}${colon} ${s.appRoute}`);
  });
  return lines.join("\n") + "\n";
}

export function pathFilename(path: OnboardingPath, today: Date, locale: Locale): string {
  return `${locale === "fr" ? "parcours" : "path"}-${path.id}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}
