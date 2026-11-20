/** Escapes text for use in HTML text and double-quoted attribute values. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Builds a native button with the 44px minimum target size. */
/**
 * A button whose name holds something the person typed (a place or set name):
 * that part is marked as theirs, so checks of the App's own wording leave it
 * alone and it reads the same. The visible name is exactly `label`.
 */
export function namedButton(label: string, typed: string, attrs: Record<string, string>, lang?: string): string {
  const plain = button(label, attrs, lang);
  return plain.replace(`>${esc(label)}</button>`, `>${markTyped(label, typed)}</button>`);
}

/** `text`, escaped, with its last occurrence of `typed` marked as the person's own words. */
export function markTyped(text: string, typed: string): string {
  const i = typed === "" ? -1 : text.lastIndexOf(typed);
  if (i < 0) return esc(text);
  return `${esc(text.slice(0, i))}<span data-user-content>${esc(typed)}</span>${esc(text.slice(i + typed.length))}`;
}

export function button(label: string, attrs: Record<string, string>, lang?: string): string {
  const { type = "button", ...rest } = attrs;
  const a = Object.entries(rest)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join("");
  const l = lang ? ` lang="${esc(lang)}"` : "";
  return `<button type="${esc(type)}"${a}${l} style="min-width:44px;min-height:44px">${esc(label)}</button>`;
}
