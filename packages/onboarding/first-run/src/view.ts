import type { FactKey } from "./facts";
import type { NameSection } from "./names";

/** Which screen the shell is showing. Kept in its own file so the router and shell can share it. */
export type View =
  | { readonly kind: "setup" }
  | { readonly kind: "help" }
  | { readonly kind: "path"; readonly id: string; readonly step: number }
  | { readonly kind: "card" }
  | { readonly kind: "notes" }
  | { readonly kind: "form" }
  | { readonly kind: "display" }
  | { readonly kind: "places" }
  | { readonly kind: "sources" }
  | { readonly kind: "summary" }
  | { readonly kind: "similar" }
  | { readonly kind: "review" }
  | { readonly kind: "latest" }
  | { readonly kind: "ages" }
  | { readonly kind: "repeats" }
  | { readonly kind: "gaps" }
  | { readonly kind: "roundup" }
  | { readonly kind: "musthaves" }
  | { readonly kind: "shortlistpage" }
  | { readonly kind: "notecheck" }
  | { readonly kind: "survey" }
  | { readonly kind: "statement" }
  | { readonly kind: "asked" }
  | { readonly kind: "removed" }
  | { readonly kind: "ask"; readonly id: string }
  | { readonly kind: "pathsindex" }
  | { readonly kind: "bydetail"; readonly key: FactKey | undefined }
  | { readonly kind: "place"; readonly id: string }
  | { readonly kind: "plan"; readonly id: string }
  | { readonly kind: "history"; readonly id: string }
  | { readonly kind: "compare"; readonly ids: readonly string[] }
  | { readonly kind: "article"; readonly id: string }
  | { readonly kind: "find"; readonly node: string }
  | { readonly kind: "practice" }
  | { readonly kind: "names"; readonly section: NameSection }
  | { readonly kind: "words"; readonly term: string | undefined }
  | { readonly kind: "device" }
  | { readonly kind: "steps" };
