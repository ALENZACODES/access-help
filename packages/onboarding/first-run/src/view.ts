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
  | { readonly kind: "place"; readonly id: string }
  | { readonly kind: "plan"; readonly id: string }
  | { readonly kind: "compare"; readonly ids: readonly string[] }
  | { readonly kind: "article"; readonly id: string }
  | { readonly kind: "find"; readonly node: string }
  | { readonly kind: "practice" }
  | { readonly kind: "names"; readonly section: NameSection }
  | { readonly kind: "words"; readonly term: string | undefined }
  | { readonly kind: "device" }
  | { readonly kind: "steps" };
