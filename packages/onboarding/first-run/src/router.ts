import { ONBOARDING_PATHS } from "../../src/paths";
import { ARTICLE_ID, getArticle } from "./articles";
import { compareIdsToPath, pathToCompareIds } from "./compare";
import type { View } from "./view";

/**
 * Hash routes, so every screen has an address, the browser Back button works
 * and a screen can be reopened. Only hashes starting with "#/" are routes;
 * anything else (such as the skip link "#main") is left alone.
 */
export function isRouteHash(hash: string): boolean {
  return hash.startsWith("#/");
}

export function viewToHash(v: View): string {
  switch (v.kind) {
    case "setup":
      return "#/setup";
    case "notes":
      return "#/notes";
    case "form":
      return "#/notes/new";
    case "display":
      return "#/display";
    case "help":
      return "#/help";
    case "card":
      return "#/help/place-card";
    case "path":
      return `#/help/${v.id}/${v.step + 1}`;
    case "places":
      return "#/places";
    case "place":
      return `#/places/${v.id}`;
    case "plan":
      return `#/places/${v.id}/plan`;
    case "compare":
      return `#/compare/${compareIdsToPath(v.ids)}`;
    case "article":
      return `#/help/articles/${v.id}`;
    case "device":
      return "#/help/device";
    case "steps":
      return "#/help/next-steps";
  }
}

const ID = /^[a-z0-9-]{1,80}$/;

/** Returns undefined for anything that is not a known route. */
export function hashToView(hash: string): View | undefined {
  if (!isRouteHash(hash)) return undefined;
  const parts = hash.slice(2).split("/").filter((p) => p !== "");
  const [a, b, c] = parts;
  if (parts.length === 0 || parts.length > 3) return undefined;
  if (a === "compare" && b !== undefined && !/^[a-z0-9,-]{1,260}$/.test(b)) return undefined;
  switch (a) {
    case "setup":
    case "display":
      return parts.length === 1 ? { kind: a } : undefined;
    case "notes":
      if (parts.length === 1) return { kind: "notes" };
      return parts.length === 2 && b === "new" ? { kind: "form" } : undefined;
    case "help": {
      if (parts.length === 1) return { kind: "help" };
      if (b === "place-card") return parts.length === 2 ? { kind: "card" } : undefined;
      if (b === "next-steps") return parts.length === 2 ? { kind: "steps" } : undefined;
      if (b === "device") return parts.length === 2 ? { kind: "device" } : undefined;
      if (b === "articles") {
        if (parts.length === 2) return { kind: "help" };
        return c !== undefined && ARTICLE_ID.test(c) && getArticle(c) ? { kind: "article", id: c } : undefined;
      }
      const path = ONBOARDING_PATHS.find((p) => p.id === b);
      if (!path || !b) return undefined;
      if (parts.length === 2) return { kind: "path", id: b, step: 0 };
      const n = Number(c);
      return Number.isInteger(n) && n >= 1 && n <= path.steps.length ? { kind: "path", id: b, step: n - 1 } : undefined;
    }
    case "places":
      if (parts.length === 1) return { kind: "places" };
      if (!b || !ID.test(b)) return undefined;
      if (parts.length === 2) return { kind: "place", id: b };
      return c === "plan" ? { kind: "plan", id: b } : undefined;
    case "compare": {
      if (parts.length !== 2 || !b) return undefined;
      const ids = pathToCompareIds(b);
      return ids ? { kind: "compare", ids } : undefined;
    }
    default:
      return undefined;
  }
}
