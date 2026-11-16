import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { documentTitle, shouldMoveFocus, type Language } from "./titles.js";

/**
 * After each screen change: the page title becomes the screen's own heading, and focus moves
 * to the main region so a screen reader starts at the new content. Renders nothing.
 */
export function RouteFocus({ language }: { language: Language }) {
  const { pathname, hash } = useLocation();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const main = document.getElementById("main");
    const heading = main?.querySelector("h1")?.textContent ?? null;
    document.title = documentTitle(heading, language);
    if (shouldMoveFocus({ previousPath: previous.current, path: pathname, hash })) main?.focus({ preventScroll: false });
    previous.current = pathname;
  }, [pathname, hash, language]);

  return null;
}
