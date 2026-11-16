/** Escapes text for use in HTML text and double-quoted attribute values. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Builds a native button with the 44px minimum target size. */
export function button(label: string, attrs: Record<string, string>, lang?: string): string {
  const a = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join("");
  const l = lang ? ` lang="${esc(lang)}"` : "";
  return `<button type="button"${a}${l} style="min-width:44px;min-height:44px">${esc(label)}</button>`;
}
