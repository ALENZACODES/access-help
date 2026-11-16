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
  | { readonly kind: "place"; readonly id: string }
  | { readonly kind: "plan"; readonly id: string }
  | { readonly kind: "compare"; readonly ids: readonly string[] }
  | { readonly kind: "article"; readonly id: string };
