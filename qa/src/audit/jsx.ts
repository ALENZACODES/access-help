/**
 * Markup audit for the new screens: patterns that break keyboard use, screen readers,
 * or safety, found in the source of the components. CI- and test-only.
 * It reads each JSX tag whole, so a tag that runs over several lines, or holds an
 * arrow function, is read correctly.
 */
export interface Tag {
  name: string;
  text: string;
  line: number;
}

/** Finds JSX opening tags. Quotes and braces are tracked, so ">" inside "=>" or a string does not end a tag. */
export function extractTags(source: string): Tag[] {
  const tags: Tag[] = [];
  const open = /<([A-Za-z][\w.]*)(?=[\s/>])/g;
  let match: RegExpExecArray | null;
  while ((match = open.exec(source)) !== null) {
    let depth = 0;
    let quote = "";
    let i = match.index + match[0].length;
    for (; i < source.length; i += 1) {
      const c = source[i]!;
      if (quote) {
        if (c === quote && source[i - 1] !== "\\") quote = "";
      } else if (c === '"' || c === "'" || c === "`") {
        quote = c;
      } else if (c === "{") {
        depth += 1;
      } else if (c === "}") {
        depth -= 1;
      } else if (c === ">" && depth === 0) {
        break;
      }
    }
    const text = source.slice(match.index, i + 1);
    tags.push({ name: match[1]!, text, line: source.slice(0, match.index).split("\n").length });
    open.lastIndex = match.index + match[0].length;
  }
  return tags;
}

export type JsxProblem =
  | "click-on-static-element"
  | "image-without-alt"
  | "positive-tabindex"
  | "new-tab-without-noopener"
  | "html-injection"
  | "dead-link"
  | "button-without-type";

export interface JsxFinding {
  file: string;
  line: number;
  problem: JsxProblem;
  text: string;
}

const STATIC = new Set(["div", "span", "p", "li", "ul", "ol", "section", "article", "main", "header", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "td", "tr"]);

export function auditJsx(source: string, file: string): JsxFinding[] {
  const findings: JsxFinding[] = [];
  for (const tag of extractTags(source)) {
    const add = (problem: JsxProblem) => findings.push({ file, line: tag.line, problem, text: tag.text.replace(/\s+/g, " ").slice(0, 100) });
    if (STATIC.has(tag.name) && /\sonClick=/.test(tag.text)) add("click-on-static-element");
    if (tag.name === "img" && !/\salt=/.test(tag.text)) add("image-without-alt");
    if (/\stabIndex=\{\s*[1-9]/.test(tag.text) || /\stabindex="[1-9]/i.test(tag.text)) add("positive-tabindex");
    if (/\starget="_blank"/.test(tag.text) && !/\srel="[^"]*noopener/.test(tag.text)) add("new-tab-without-noopener");
    if (/dangerouslySetInnerHTML|\sinnerHTML=/.test(tag.text)) add("html-injection");
    if (/\shref="(#|javascript:[^"]*)"/.test(tag.text)) add("dead-link");
    if (tag.name === "button" && !/\stype=/.test(tag.text)) add("button-without-type");
  }
  if (/\.innerHTML\s*=|insertAdjacentHTML\(|document\.write\(/.test(source)) {
    findings.push({ file, line: 1, problem: "html-injection", text: "assigns HTML from code" });
  }
  return findings;
}
