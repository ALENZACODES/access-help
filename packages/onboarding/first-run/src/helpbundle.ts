import type { Locale } from "../../switch-first/src/index";
import { ARTICLES } from "./articles";
import { COPY, t } from "./copy";
import { glossaryToText } from "./glossary";
import { articleToText } from "./helptext";

/**
 * All the help in one plain text file: a contents list, every article, then
 * the words list. Built on the device from the same strings as the pages. It
 * is for people who want to print the help or read it in a program they
 * already use. Nothing is sent anywhere.
 */
export function bundleToText(locale: Locale): string {
  const l = locale;
  const title = t(COPY.help.title, l);
  const parts: string[] = [title, "=".repeat(Math.min(title.length, 72)), ""];
  parts.push(t(COPY.bundle.contents, l), "");
  ARTICLES.forEach((a, i) => parts.push(`${i + 1}. ${a.title[l]}`));
  parts.push(`${ARTICLES.length + 1}. ${t(COPY.words.title, l)}`, "");
  for (const a of ARTICLES) parts.push("", articleToText(a, l));
  parts.push("", glossaryToText(l, t(COPY.words.title, l), t(COPY.words.intro, l)));
  return parts.join("\n").replace(/\n{4,}/g, "\n\n\n");
}

export function bundleFilename(locale: Locale): string {
  return `help-all-${locale}.txt`;
}

/** Size shown to the person, in whole kilobytes, so a big download is no surprise. */
export function kilobytes(text: string): number {
  return Math.max(1, Math.ceil(new TextEncoder().encode(text).length / 1024));
}
