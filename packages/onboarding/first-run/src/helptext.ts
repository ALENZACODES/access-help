import type { Locale } from "../../switch-first/src/index";
import { ARTICLES_META, type Article } from "./articles";
import { COPY, t } from "./copy";
import { KEY_HELP } from "./keys";

/**
 * An article as plain text, for people who want to keep it, print it, or read
 * it in a program they already use. It is built from the same strings as the
 * page, so the two cannot drift apart. No scripts, no network: the page offers
 * it as a download link made from text.
 */
const rule = (title: string): string => "=".repeat(Math.min(title.length, 72));

export function articleToText(a: Article, locale: Locale): string {
  const l = locale;
  const colon = l === "fr" ? "\u00A0: " : ": ";
  const lines: string[] = [a.title[l], rule(a.title[l]), "", a.summary[l], ""];
  for (const s of a.sections) {
    lines.push(s.heading[l], "-".repeat(Math.min(s.heading[l].length, 72)), "");
    for (const p of s.paragraphs ?? []) lines.push(p[l], "");
    if (s.keys) {
      lines.push(t(COPY.helpHome.keysCaption, l) + colon.trimEnd(), "");
      for (const k of KEY_HELP) lines.push(`  ${k.keys[l]}${colon}${k.action[l]}`);
      lines.push("");
    }
    (s.steps ?? []).forEach((p, i) => lines.push(`${i + 1}. ${p[l]}`));
    if (s.steps && s.steps.length > 0) lines.push("");
  }
  lines.push(
    `${t(COPY.helpHome.written, l)} ${ARTICLES_META.date}.`,
    `${t(COPY.helpHome.source, l)}${colon}${ARTICLES_META.source}.`,
    `${t(COPY.helpHome.licence, l)}${colon}${ARTICLES_META.licence}.`,
  );
  return lines.join("\n") + "\n";
}

/** A file name that is safe on any system: lowercase letters, digits and hyphens. */
export function articleFilename(a: Article, locale: Locale): string {
  return `help-${a.id}-${locale}.txt`;
}

/** A data: URL for a download link. */
export function textHref(text: string): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
}

export function decodeTextHref(href: string): string | undefined {
  const prefix = "data:text/plain;charset=utf-8,";
  if (!href.startsWith(prefix)) return undefined;
  try {
    return decodeURIComponent(href.slice(prefix.length));
  } catch {
    return undefined;
  }
}
