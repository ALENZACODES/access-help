import { ONBOARDING_PATHS } from "../../src/paths";
import { ARTICLE_ID, getArticle } from "./articles";
import { NODE_ID, START_NODE, getQuestion } from "./chooser";
import { compareIdsToPath, pathToCompareIds } from "./compare";
import { WORD_ID, getWord } from "./glossary";
import { DEFAULT_NAME_SECTION, isNameSection } from "./names";
import { isFactKey } from "./bydetail";
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
    case "sources":
      return "#/places/sources";
    case "summary":
      return "#/places/summary";
    case "similar":
      return "#/places/similar";
    case "combine":
      return `#/places/combine/${v.a},${v.b}`;
    case "review":
      return "#/places/ask-again";
    case "latest":
      return "#/places/latest";
    case "ages":
      return "#/places/record-ages";
    case "repeats":
      return "#/places/repeated-records";
    case "gaps":
      return "#/places/no-record";
    case "roundup":
      return "#/places/shortlist-round-up";
    case "musthaves":
      return "#/places/must-haves";
    case "shortlistpage":
      return "#/places/shortlist";
    case "notecheck":
      return "#/notes/check";
    case "survey":
      return "#/notes/survey";
    case "statement":
      return "#/notes/read-page";
    case "asked":
      return "#/notes/asked";
    case "removed":
      return "#/notes/removed";
    case "share":
      return "#/notes/share";
    case "ask":
      return `#/places/${v.id}/ask`;
    case "placecard":
      return `#/places/${v.id}/card`;
    case "placerename":
      return `#/places/${v.id}/rename`;
    case "placesplit":
      return `#/places/${v.id}/split`;
    case "placecards":
      return "#/places/shortlist/cards";
    case "passport":
      return "#/notes/access-card";
    case "showcard":
      return "#/notes/access-card/show";
    case "visits":
      return "#/notes/visits";
    case "csvimport":
      return "#/notes/import-csv";
    case "visit":
      return `#/notes/visits/${encodeURIComponent(v.id)}`;
    case "pathsindex":
      return "#/help/paths";
    case "bydetail":
      return v.key === undefined ? "#/places/by-detail" : `#/places/by-detail/${v.key}`;
    case "place":
      return `#/places/${v.id}`;
    case "plan":
      return `#/places/${v.id}/plan`;
    case "history":
      return `#/places/${v.id}/history`;
    case "compare":
      return `#/compare/${compareIdsToPath(v.ids)}`;
    case "article":
      return `#/help/articles/${v.id}`;
    case "find":
      return v.node === START_NODE ? "#/help/find" : `#/help/find/${v.node}`;
    case "practice":
      return "#/help/practice";
    case "words":
      return v.term === undefined ? "#/help/words" : `#/help/words/${v.term}`;
    case "names":
      return v.section === DEFAULT_NAME_SECTION ? "#/help/names" : `#/help/names/${v.section}`;
    case "device":
      return "#/help/device";
    case "move":
      return "#/help/device/move";
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
      if (parts.length === 2 && b === "check") return { kind: "notecheck" };
      if (parts.length === 2 && b === "survey") return { kind: "survey" };
      if (parts.length === 2 && b === "read-page") return { kind: "statement" };
      if (parts.length === 2 && b === "asked") return { kind: "asked" };
      if (parts.length === 2 && b === "removed") return { kind: "removed" };
      if (parts.length === 2 && b === "share") return { kind: "share" };
      if (parts.length === 2 && b === "access-card") return { kind: "passport" };
      if (parts.length === 3 && b === "access-card" && parts[2] === "show") return { kind: "showcard" };
      if (parts.length === 2 && b === "visits") return { kind: "visits" };
      if (parts.length === 2 && b === "import-csv") return { kind: "csvimport" };
      if (parts.length === 3 && b === "visits" && /^(?:new|v-[a-z0-9]{1,24})$/.test(parts[2] ?? "")) return { kind: "visit", id: parts[2] as string };
      return parts.length === 2 && b === "new" ? { kind: "form" } : undefined;
    case "help": {
      if (parts.length === 1) return { kind: "help" };
      if (b === "place-card") return parts.length === 2 ? { kind: "card" } : undefined;
      if (b === "next-steps") return parts.length === 2 ? { kind: "steps" } : undefined;
      if (b === "device") return parts.length === 2 ? { kind: "device" } : parts.length === 3 && parts[2] === "move" ? { kind: "move" } : undefined;
      if (b === "articles") {
        if (parts.length === 2) return { kind: "help" };
        return c !== undefined && ARTICLE_ID.test(c) && getArticle(c) ? { kind: "article", id: c } : undefined;
      }
      if (b === "words") {
        if (parts.length === 2) return { kind: "words", term: undefined };
        return c !== undefined && WORD_ID.test(c) && getWord(c) ? { kind: "words", term: c } : undefined;
      }
      if (b === "names") {
        if (parts.length === 2) return { kind: "names", section: DEFAULT_NAME_SECTION };
        return isNameSection(c) ? { kind: "names", section: c } : undefined;
      }
      if (b === "practice") return parts.length === 2 ? { kind: "practice" } : undefined;
      if (b === "find") {
        if (parts.length === 2) return { kind: "find", node: START_NODE };
        return c !== undefined && NODE_ID.test(c) && getQuestion(c) ? { kind: "find", node: c } : undefined;
      }
      if (b === "paths") return parts.length === 2 ? { kind: "pathsindex" } : undefined;
      const path = ONBOARDING_PATHS.find((p) => p.id === b);
      if (!path || !b) return undefined;
      if (parts.length === 2) return { kind: "path", id: b, step: 0 };
      const n = Number(c);
      return Number.isInteger(n) && n >= 1 && n <= path.steps.length ? { kind: "path", id: b, step: n - 1 } : undefined;
    }
    case "places":
      if (parts.length === 1) return { kind: "places" };
      if (!b || !ID.test(b)) return undefined;
      // Fixed pages first: a place id always ends in a hash of eight hex digits, so these names cannot be ids.
      if (b === "sources" || b === "summary") return parts.length === 2 ? { kind: b } : undefined;
      if (b === "similar") return parts.length === 2 ? { kind: "similar" } : undefined;
      if (b === "combine") {
        const [x, y, ...rest] = (c ?? "").split(",");
        return parts.length === 3 && rest.length === 0 && x && y && x !== y && ID.test(x) && ID.test(y) ? { kind: "combine", a: x, b: y } : undefined;
      }
      if (b === "ask-again") return parts.length === 2 ? { kind: "review" } : undefined;
      if (b === "latest") return parts.length === 2 ? { kind: "latest" } : undefined;
      if (b === "record-ages") return parts.length === 2 ? { kind: "ages" } : undefined;
      if (b === "repeated-records") return parts.length === 2 ? { kind: "repeats" } : undefined;
      if (b === "no-record") return parts.length === 2 ? { kind: "gaps" } : undefined;
      if (b === "shortlist-round-up") return parts.length === 2 ? { kind: "roundup" } : undefined;
      if (b === "must-haves") return parts.length === 2 ? { kind: "musthaves" } : undefined;
      if (b === "shortlist") return parts.length === 2 ? { kind: "shortlistpage" } : parts.length === 3 && c === "cards" ? { kind: "placecards" } : undefined;
      if (b === "by-detail") {
        if (parts.length === 2) return { kind: "bydetail", key: undefined };
        return parts.length === 3 && isFactKey(c) ? { kind: "bydetail", key: c } : undefined;
      }
      if (parts.length === 2) return { kind: "place", id: b };
      if (c === "history") return { kind: "history", id: b };
      if (c === "ask") return { kind: "ask", id: b };
      if (c === "card") return { kind: "placecard", id: b };
      if (c === "rename") return { kind: "placerename", id: b };
      if (c === "split") return { kind: "placesplit", id: b };
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
