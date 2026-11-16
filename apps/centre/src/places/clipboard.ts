/** Copies text with the browser clipboard. Returns false, never throws, when the browser refuses. */
export async function copyText(text: string, nav: Pick<Navigator, "clipboard"> | undefined = typeof navigator === "undefined" ? undefined : navigator): Promise<boolean> {
  const clipboard = nav?.clipboard;
  if (!clipboard || typeof clipboard.writeText !== "function") return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
