import { ONBOARDING_PATHS, getPath, localizePath } from "../../src/paths";
import type { Locale } from "../../switch-first/src/index";
import { ARTICLES, ARTICLES_META, articleForMode, getArticle, type Article, type ArticleSection } from "./articles";
import { depthOf, getQuestion, isLeaf, parentOf, START_NODE } from "./chooser";
import { COPY, questionNumber, resultsCount, sectionOf, t } from "./copy";
import { articleFilename, articleToText, textHref } from "./helptext";
import { bundleFilename, bundleToText, kilobytes } from "./helpbundle";
import type { ReadingMode } from "./helpstate";
import { button, esc } from "./html";
import { KEY_HELP } from "./keys";
import { PRACTICE_BUTTONS, buttonName } from "./practice";
import { queryWords, searchHelp, type HelpHit } from "./search";

/**
 * Help home, search results and articles. Every screen here carries
 * data-names-unique: no two buttons or links share a visible name, so a person
 * using voice control or a switch can pick one by saying or pointing at its
 * name. The DOM audit fails if two controls repeat a name inside it.
 */
export interface HelpHomeContext {
  readonly locale: Locale;
  /** The saved way of moving, or undefined while it is unknown. */
  readonly mode: string | undefined;
  readonly query: string;
  /** Article ids opened lately, most recent first. */
  readonly recent?: readonly string[];
}

function openButton(kind: HelpHit["kind"], id: string, title: string): string {
  const attrs: Record<string, string> =
    kind === "article"
      ? { "data-action": "open-article", "data-value": id }
      : kind === "path"
        ? { "data-action": "open-path", "data-value": id }
        : kind === "practice"
          ? { "data-action": "open-practice" }
          : kind === "names"
            ? { "data-action": "open-names" }
            : kind === "word"
              ? id === "all"
                ? { "data-action": "open-words" }
                : { "data-action": "open-words", "data-value": id }
              : kind === "device"
                ? { "data-action": "open-device" }
                : kind === "steps"
                  ? { "data-action": "open-steps" }
                  : { "data-action": "open-card" };
  return button(title, attrs);
}

function item(kind: HelpHit["kind"], id: string, title: string, summary: string, extra = ""): string {
  return `<li>${openButton(kind, id, title)}${extra === "" ? "" : ` <span class="muted">${esc(extra)}</span>`}<span class="muted"> ${esc(summary)}</span></li>`;
}

/** The list under the search box: everything when the box is empty, the matches otherwise. */
export function renderHelpBody(ctx: HelpHomeContext): string {
  const l = ctx.locale;
  if (queryWords(ctx.query).length > 0) {
    const hits = searchHelp(ctx.query, l);
    if (hits.length === 0) {
      return (
        `<p id="help-count" role="status">${esc(t(COPY.helpHome.noResults, l))}</p>` +
        `<p>${button(t(COPY.helpHome.clear, l), { "data-action": "help-clear", class: "secondary" })}</p>`
      );
    }
    return (
      `<p id="help-count" role="status">${esc(resultsCount(hits.length, l))}</p>` +
      `<ul>${hits.map((h) => item(h.kind, h.id, h.title, h.summary)).join("")}</ul>` +
      `<p>${button(t(COPY.helpHome.clear, l), { "data-action": "help-clear", "class": "secondary" })}</p>`
    );
  }
  const suggested = articleForMode(ctx.mode);
  const recent = ctx.recent ?? [];
  // The suggested article goes first, then the recent ones. Each is the same button as in the full list, not a second one.
  const rank = (id: string): number => (id === suggested?.id ? 0 : recent.includes(id) ? 1 + recent.indexOf(id) : 99);
  const articles = [...ARTICLES].sort((a, b) => rank(a.id) - rank(b.id));
  const tag = (id: string): string => [id === suggested?.id ? t(COPY.helpHome.suggested, l) : "", recent.includes(id) ? t(COPY.helpHome.recent, l) : ""].filter((x) => x !== "").join(" ");
  const articleItems = articles.map((a) => item("article", a.id, a.title[l], a.summary[l], tag(a.id))).join("");
  const guideItems =
    ONBOARDING_PATHS.map((p) => {
      const lp = localizePath(p, l);
      return item("path", p.id, lp.title, lp.summary);
    }).join("") + item("card", "card", t(COPY.card.title, l), t(COPY.card.summary, l));
  return (
    `<p>${button(t(COPY.helpHome.findOpen, l), { "data-action": "find-open", "data-value": START_NODE })} ${button(t(COPY.practice.open, l), { "data-action": "open-practice", class: "secondary" })} ${button(t(COPY.names.open, l), { "data-action": "open-names", class: "secondary" })} ${button(t(COPY.words.open, l), { "data-action": "open-words", class: "secondary" })}</p>` +
    `<h3>${esc(t(COPY.helpHome.articles, l))}</h3><ul>${articleItems}</ul>` +
    (recent.length > 0 ? `<p>${button(t(COPY.helpHome.clearRecent, l), { "data-action": "recent-clear", class: "secondary" })}</p>` : "") +
    `<h3>${esc(t(COPY.helpHome.guides, l))}</h3><ul>${guideItems}</ul>` +
    `<p>${button(t(COPY.steps.open, l), { "data-action": "open-steps", class: "secondary" })} ${button(t(COPY.device.open, l), { "data-action": "open-device", class: "secondary" })}</p>` +
    renderBundleLink(l)
  );
}

function renderBundleLink(l: Locale): string {
  const text = bundleToText(l);
  const kb = kilobytes(text);
  return (
    `<p><a href="${esc(textHref(text))}" download="${esc(bundleFilename(l))}" style="display:inline-flex;align-items:center;min-height:44px;min-width:44px">${esc(t(COPY.bundle.save, l))}</a> ` +
    `<span class="muted">${esc(t(COPY.bundle.hint, l))} ${kb} ${esc(t(COPY.bundle.kb, l))}</span></p>`
  );
}

export function renderHelpHome(ctx: HelpHomeContext): string {
  const l = ctx.locale;
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-names-unique>` +
    `<h2 id="view-title">${esc(t(COPY.help.title, l))}</h2>` +
    `<p>${esc(t(COPY.help.intro, l))}</p>` +
    `<p><label for="help-q">${esc(t(COPY.helpHome.searchLabel, l))}</label>` +
    `<input id="help-q" type="search" autocomplete="off" maxlength="80" value="${esc(ctx.query)}" aria-describedby="help-q-hint" style="min-height:44px"></p>` +
    `<p id="help-q-hint" class="hint">${esc(t(COPY.helpHome.searchHint, l))}</p>` +
    `<div id="help-body">${renderHelpBody(ctx)}</div></section>`
  );
}

/** Anchor id of a section inside an article. Used by the contents list and the heading. */
export function sectionAnchor(articleId: string, sectionId: string): string {
  return `a-${articleId}-${sectionId}`;
}

function renderKeys(l: Locale): string {
  const rows = KEY_HELP.map((k) => `<tr><th scope="row">${esc(k.keys[l])}</th><td>${esc(k.action[l])}</td></tr>`).join("");
  return (
    `<table class="keys"><caption>${esc(t(COPY.helpHome.keysCaption, l))}</caption>` +
    `<thead><tr><th scope="col">${esc(t(COPY.helpHome.keyHeader, l))}</th><th scope="col">${esc(t(COPY.helpHome.actionHeader, l))}</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>`
  );
}

function renderSection(a: Article, s: ArticleSection, l: Locale): string {
  return (
    `<div class="article-section"><h3 id="${esc(sectionAnchor(a.id, s.id))}" tabindex="-1">${esc(s.heading[l])}</h3>` +
    (s.paragraphs ?? []).map((p) => `<p>${esc(p[l])}</p>`).join("") +
    (s.keys ? renderKeys(l) : "") +
    (s.steps ? `<ol>${s.steps.map((p) => `<li>${esc(p[l])}</li>`).join("")}</ol>` : "") +
    `</div>`
  );
}

export function renderArticle(id: string, locale: Locale, reading: ReadingContext = { reading: undefined, step: 0 }): string {
  const l = locale;
  const a = getArticle(id);
  const back = button(t(COPY.help.backToList, l), { "data-action": "view", "data-value": "help", class: "secondary" });
  if (!a) {
    return (
      `<section lang="${l}" aria-labelledby="view-title" data-names-unique><h2 id="view-title">${esc(t(COPY.help.title, l))}</h2>` +
      `<p class="notice" role="note">${esc(t(COPY.helpHome.notFound, l))}</p><p>${back}</p></section>`
    );
  }
  const toc = a.sections
    .map((s) => {
      const target = sectionAnchor(a.id, s.id);
      return `<li><a href="#${esc(target)}" data-jump="${esc(target)}" style="display:inline-flex;align-items:center;min-height:44px;min-width:44px">${esc(s.heading[l])}</a></li>`;
    })
    .join("");
  const related =
    a.relatedPaths
      .map((pid) => getPath(pid))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map((p) => `<li>${button(p.title[l], { "data-action": "open-path", "data-value": p.id, class: "secondary" })}</li>`)
      .join("") +
    a.relatedArticles
      .map((rid) => getArticle(rid))
      .filter((r): r is Article => r !== undefined)
      .map((r) => `<li>${button(r.title[l], { "data-action": "open-article", "data-value": r.id, class: "secondary" })}</li>`)
      .join("");
  const colon = l === "fr" ? "\u00A0: " : ": ";
  const stepped = reading.reading === "steps";
  const step = clampStep(reading.step, a.sections.length);
  const current = a.sections[step];
  const toggle = button(t(stepped ? COPY.helpHome.readWhole : COPY.helpHome.readSteps, l), { "data-action": "read-mode", "data-value": stepped ? "whole" : "steps", class: "secondary" });
  const save = `<p><a href="${esc(textHref(articleToText(a, l)))}" download="${esc(articleFilename(a, l))}" style="display:inline-flex;align-items:center;min-height:44px;min-width:44px">${esc(t(COPY.helpHome.saveText, l))}</a> <span class="muted">${esc(t(COPY.helpHome.saveTextHint, l))}</span></p>`;
  // One section at a time: no contents list to move through, just this section with Previous and Next.
  const content =
    stepped && current
      ? `<p id="section-count" class="muted" role="status">${esc(sectionOf(step + 1, a.sections.length, l))}</p>` +
        renderSection(a, current, l) +
        `<p>${button(t(COPY.helpHome.prevSection, l), { "data-action": "read-step", "data-value": String(step - 1), ...(step === 0 ? { disabled: "disabled" } : {}) })} ` +
        `${button(t(COPY.helpHome.nextSection, l), { "data-action": "read-step", "data-value": String(step + 1), ...(step >= a.sections.length - 1 ? { disabled: "disabled" } : {}) })}</p>`
      : `<nav aria-label="${esc(t(COPY.helpHome.onThisPage, l))}"><ul>${toc}</ul></nav>` + a.sections.map((s) => renderSection(a, s, l)).join("");
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-names-unique>` +
    `<h2 id="view-title">${esc(a.title[l])}</h2><p>${esc(a.summary[l])}</p>` +
    `<p>${toggle}</p>` +
    content +
    save +
    (related === "" ? "" : `<h3>${esc(t(COPY.helpHome.related, l))}</h3><ul>${related}</ul>`) +
    `<p class="muted">${esc(t(COPY.helpHome.written, l))} ${esc(ARTICLES_META.date)}. ${esc(t(COPY.helpHome.source, l) + colon + ARTICLES_META.source)}. ${esc(t(COPY.helpHome.licence, l) + colon + ARTICLES_META.licence)}.</p>` +
    `<p>${back}</p></section>`
  );
}

export interface ReadingContext {
  readonly reading: ReadingMode | undefined;
  /** Zero-based section shown when reading one section at a time. */
  readonly step: number;
}

export function clampStep(step: number, sections: number): number {
  if (!Number.isInteger(step) || sections <= 0) return 0;
  return Math.min(Math.max(step, 0), sections - 1);
}

/** The question screens of "Find the right help". An unknown question starts again from the first one. */
export function renderFind(nodeId: string, locale: Locale): string {
  const l = locale;
  const question = getQuestion(nodeId);
  const shown = question ?? getQuestion(START_NODE);
  if (!shown) return `<section lang="${l}" aria-labelledby="view-title" data-names-unique><h2 id="view-title">${esc(t(COPY.help.title, l))}</h2></section>`;
  const choices = shown.choices
    .map((c) => {
      const to = c.to;
      const attrs: Record<string, string> = !isLeaf(to)
        ? { "data-action": "find-open", "data-value": to.node }
        : to.kind === "practice"
          ? { "data-action": "open-practice" }
          : to.kind === "names"
            ? { "data-action": "open-names" }
            : "id" in to
              ? { "data-action": to.kind === "article" ? "open-article" : "open-path", "data-value": to.id }
              : { "data-action": "open-practice" };
      return `<li>${button(c.label[l], attrs)}</li>`;
    })
    .join("");
  const parent = parentOf(shown.id);
  const back =
    parent === undefined
      ? button(t(COPY.help.backToList, l), { "data-action": "view", "data-value": "help", class: "secondary" })
      : button(t(COPY.helpHome.findBack, l), { "data-action": "find-open", "data-value": parent, class: "secondary" });
  const startOver = shown.id === START_NODE ? "" : ` ${button(t(COPY.helpHome.findStartOver, l), { "data-action": "find-open", "data-value": START_NODE, class: "secondary" })}`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-names-unique>` +
    (question ? "" : `<p class="notice" role="note">${esc(t(COPY.helpHome.findNotFound, l))}</p>`) +
    `<h2 id="view-title">${esc(shown.prompt[l])}</h2>` +
    `<p class="muted">${esc(questionNumber(depthOf(shown.id), l))}. ${esc(t(COPY.helpHome.findIntro, l))}</p>` +
    `<ul>${choices}</ul><p>${back}${startOver}</p></section>`
  );
}

export interface PracticeContext {
  readonly log: readonly string[];
  readonly total: number;
}

/** The lines of the practice log. The log region keeps its place on the page while this text is replaced. */
export function renderPracticeLog(log: readonly string[], locale: Locale): string {
  if (log.length === 0) return `<li class="muted">${esc(t(COPY.practice.empty, locale))}</li>`;
  return log.map((line) => `<li>${esc(line)}</li>`).join("");
}

export function renderPractice(ctx: PracticeContext, locale: Locale): string {
  const l = locale;
  const buttons = Array.from({ length: PRACTICE_BUTTONS }, (_, i) =>
    button(buttonName(i + 1, l), { "data-action": "practice-press", "data-value": String(i + 1), class: "secondary" }),
  ).join(" ");
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-names-unique data-practice>` +
    `<h2 id="view-title">${esc(t(COPY.practice.title, l))}</h2>` +
    `<p>${esc(t(COPY.practice.intro, l))}</p>` +
    `<p class="muted">${esc(t(COPY.practice.note, l))}</p>` +
    `<div role="group" aria-label="${esc(t(COPY.practice.groupLabel, l))}">${buttons}</div>` +
    `<h3 id="practice-log-title">${esc(t(COPY.practice.logLabel, l))}</h3>` +
    `<div role="log" aria-labelledby="practice-log-title"><ol id="practice-log">${renderPracticeLog(ctx.log, l)}</ol></div>` +
    `<p class="muted" id="practice-total">${esc(t(COPY.practice.total, l) + (l === "fr" ? "\u00A0: " : ": ") + ctx.total)}</p>` +
    `<p>${button(t(COPY.practice.clear, l), { "data-action": "practice-clear", class: "secondary" })} ` +
    `${button(t(COPY.help.backToList, l), { "data-action": "view", "data-value": "help", class: "secondary" })}</p></section>`
  );
}
