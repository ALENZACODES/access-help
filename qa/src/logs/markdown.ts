/** Small Markdown readers for the logs a person writes during Days 19 to 25. */

export interface Table {
  headers: string[];
  rows: Array<Record<string, string>>;
}

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparator(line: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line.trim());
}

/** Every pipe table in the text. Header names are lower-cased. */
export function tables(text: string): Table[] {
  const lines = text.split(/\r?\n/);
  const found: Table[] = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const header = lines[index] ?? "";
    if (!header.trim().startsWith("|") || !isSeparator(lines[index + 1] ?? "")) continue;
    const headers = cells(header).map((cell) => cell.toLowerCase());
    const rows: Array<Record<string, string>> = [];
    let next = index + 2;
    while (next < lines.length && (lines[next] ?? "").trim().startsWith("|")) {
      const values = cells(lines[next] ?? "");
      rows.push(Object.fromEntries(headers.map((name, column) => [name, values[column] ?? ""])));
      next += 1;
    }
    found.push({ headers, rows });
    index = next - 1;
  }
  return found;
}

/** The first table whose headers include every name given. */
export function findTable(text: string, required: string[]): Table | undefined {
  return tables(text).find((table) => required.every((name) => table.headers.includes(name.toLowerCase())));
}

/** The value after `Label:` on its own line, or undefined. */
export function field(text: string, label: string): string | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^[ \\t]*(?:[-*][ \\t]*)?\\**${escaped}\\**[ \\t]*:[ \\t]*(.+)$`, "im").exec(text);
  const value = match?.[1]?.trim();
  return value ? value : undefined;
}

/** Task-list items, `- [x] text` or `- [ ] text`. */
export function checklist(text: string): Array<{ done: boolean; text: string }> {
  return [...text.matchAll(/^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/gm)].map((match) => ({
    done: match[1] !== " ",
    text: (match[2] ?? "").trim(),
  }));
}

const EMPTY = /^(|-|—|n\/a|none|tbd|todo|\?)$/i;

export function blank(value: string | undefined): boolean {
  return value === undefined || EMPTY.test(value.trim());
}
