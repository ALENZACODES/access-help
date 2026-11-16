import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { GLOSSARY, getWord, glossaryFilename, glossaryToText, sortedGlossary, wordAnchor } from "./glossary";
import { textHref } from "./helptext";
import { button, esc } from "./html";

/**
 * The "What words mean" page: a list of words with a jump list at the top. A
 * word asked for by address (#/help/words/<id>) gets focus, so a person who
 * followed a search result lands on it. Meanings are shown as text; there are
 * no buttons that repeat a name.
 */
export function renderWords(term: string | undefined, locale: Locale): string {
  const l = locale;
  const list = sortedGlossary(l);
  const missing = term !== undefined && getWord(term) === undefined;
  const jump = list
    .map(
      (w) =>
        `<li><a href="#${esc(wordAnchor(w.id))}" data-jump="${esc(wordAnchor(w.id))}" style="display:inline-flex;align-items:center;min-height:44px;min-width:44px">${esc(w.term[l])}</a></li>`,
    )
    .join("");
  const entries = list
    .map(
      (w) =>
        `<div class="word"><dt id="${esc(wordAnchor(w.id))}" tabindex="-1" data-word="${esc(w.id)}">${esc(w.term[l])}</dt><dd>${esc(w.meaning[l])}</dd></div>`,
    )
    .join("");
  const text = glossaryToText(l, t(COPY.words.title, l), t(COPY.words.intro, l));
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-names-unique data-words>` +
    `<h2 id="view-title">${esc(t(COPY.words.title, l))}</h2>` +
    `<p>${esc(t(COPY.words.intro, l))}</p>` +
    (missing ? `<p class="notice" role="note">${esc(t(COPY.words.notFound, l))}</p>` : "") +
    `<h3 id="words-jump">${esc(t(COPY.words.jump, l))}</h3>` +
    `<ul aria-labelledby="words-jump" class="plain">${jump}</ul>` +
    `<p class="muted">${GLOSSARY.length} ${esc(t(COPY.words.count, l))}</p>` +
    `<dl>${entries}</dl>` +
    `<p><a href="${esc(textHref(text))}" download="${esc(glossaryFilename(l))}" style="display:inline-flex;align-items:center;min-height:44px;min-width:44px">${esc(t(COPY.words.save, l))}</a> <span class="muted">${esc(t(COPY.words.saveHint, l))}</span></p>` +
    `<p>${button(t(COPY.help.backToList, l), { "data-action": "view", "data-value": "help", class: "secondary" })}</p></section>`
  );
}
