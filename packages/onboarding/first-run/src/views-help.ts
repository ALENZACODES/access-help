import { ONBOARDING_PATHS, getPath, localizePath } from "../../src/paths";
import type { Locale } from "../../switch-first/src/index";
import { ARTICLES, ARTICLES_META, articleForMode, getArticle, type Article, type ArticleSection } from "./articles";
import { COPY, resultsCount, t } from "./copy";
import { button, esc } from "./html";
import { KEY_HELP } from "./keys";
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
}

function openButton(kind: HelpHit["kind"], id: string, title: string): string {
  const attrs: Record<string, string> =
    kind === "article"
      ? { "data-action": "open-article", "data-value": id }
      : kind === "path"
        ? { "data-action": "open-path", "data-value": id }
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
  // The suggested article goes first. It is the same button, not a second one.
  const articles = [...ARTICLES].sort((a, b) => Number(b.id === suggested?.id) - Number(a.id === suggested?.id));
  const articleItems = articles
    .map((a) => item("article", a.id, a.title[l], a.summary[l], a.id === suggested?.id ? t(COPY.helpHome.suggested, l) : ""))
    .join("");
  const guideItems =
    ONBOARDING_PATHS.map((p) => {
      const lp = localizePath(p, l);
      return item("path", p.id, lp.title, lp.summary);
    }).join("") + item("card", "card", t(COPY.card.title, l), t(COPY.card.summary, l));
  return (
    `<h3>${esc(t(COPY.helpHome.articles, l))}</h3><ul>${articleItems}</ul>` +
    `<h3>${esc(t(COPY.helpHome.guides, l))}</h3><ul>${guideItems}</ul>` +
    `<p>${button(t(COPY.steps.open, l), { "data-action": "open-steps", class: "secondary" })} ${button(t(COPY.device.open, l), { "data-action": "open-device", class: "secondary" })}</p>`
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

export function renderArticle(id: string, locale: Locale): string {
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
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-names-unique>` +
    `<h2 id="view-title">${esc(a.title[l])}</h2><p>${esc(a.summary[l])}</p>` +
    `<nav aria-label="${esc(t(COPY.helpHome.onThisPage, l))}"><ul>${toc}</ul></nav>` +
    a.sections.map((s) => renderSection(a, s, l)).join("") +
    (related === "" ? "" : `<h3>${esc(t(COPY.helpHome.related, l))}</h3><ul>${related}</ul>`) +
    `<p class="muted">${esc(t(COPY.helpHome.written, l))} ${esc(ARTICLES_META.date)}. ${esc(t(COPY.helpHome.source, l) + colon + ARTICLES_META.source)}. ${esc(t(COPY.helpHome.licence, l) + colon + ARTICLES_META.licence)}.</p>` +
    `<p>${back}</p></section>`
  );
}
