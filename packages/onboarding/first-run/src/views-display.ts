import type { Locale } from "../../switch-first/src/index";
import { COPY, t, type Pair } from "./copy";
import {
  CONTRASTS,
  MOTIONS,
  SPACINGS,
  TEXT_SCALES,
  type Display,
} from "./display";
import { button, esc } from "./html";

interface Group {
  readonly key: keyof Display;
  readonly title: Pair;
  readonly options: ReadonlyArray<readonly [string, string | Pair]>;
}

const GROUPS: readonly Group[] = [
  { key: "scale", title: COPY.display.scale, options: TEXT_SCALES.map((v) => [v, `${v}%`] as const) },
  { key: "spacing", title: COPY.display.spacing, options: SPACINGS.map((v) => [v, COPY.display[v]] as const) },
  {
    key: "contrast",
    title: COPY.display.contrast,
    options: CONTRASTS.map((v) => [v, v === "auto" ? COPY.display.auto : COPY.display.more] as const),
  },
  {
    key: "motion",
    title: COPY.display.motion,
    options: MOTIONS.map((v) => [v, v === "auto" ? COPY.display.auto : COPY.display.reduce] as const),
  },
];

/** One button group per setting. aria-pressed shows the current choice. */
export function renderDisplay(d: Display, locale: Locale): string {
  const groups = GROUPS.map((g) => {
    const id = `display-${g.key}`;
    const buttons = g.options
      .map(([value, label]) =>
        button(typeof label === "string" ? label : t(label, locale), {
          "data-action": "display",
          "data-key": g.key,
          "data-value": value,
          "aria-pressed": String(d[g.key] === value),
        }),
      )
      .join("");
    return `<div role="group" aria-labelledby="${id}"><h3 id="${id}">${esc(t(g.title, locale))}</h3>${buttons}</div>`;
  });
  return (
    `<section lang="${locale}" aria-labelledby="view-title">` +
    `<h2 id="view-title">${esc(t(COPY.display.title, locale))}</h2>` +
    `<p>${esc(t(COPY.display.intro, locale))}</p>` +
    groups.join("") +
    `</section>`
  );
}
