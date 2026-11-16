# Switch/keyboard-first first-run path

Self-contained package in `packages/onboarding/switch-first/`. It does not
depend on any other file in `packages/onboarding/`.

`src/index.ts` is the entry point. It exports:

- `flow`: a small state machine (`initialState`, `reduce`, `visibleSteps`).
  Steps are movement mode, a preferred highlight interval (single-switch only) and finish.
  Skipping leaves choices unset; unset is shown as "unknown", never guessed.
- `keys`: `nextFocusIndex` / `isActivationKey` for arrow-key focus in option
  groups. Tab is never intercepted.
- `focus`: `attachRovingFocus(group)` wires those keys to a group of buttons in the DOM and returns a function that removes it.
- `render`: `renderStep(state, locale)` returns accessible HTML. Controls are
  native buttons in DOM order, no positive `tabindex`, each at least
  `MIN_TOUCH_TARGET_PX` (44) px wide and high.
- `copy` and `typography`: EN/FR strings and `frenchTypographyIssues()`.
  French uses `’`, U+00A0 before `:`, U+202F before `; ! ?` and inside `« »`.

The intervals (1 to 5 s) are a preference only. This help centre does not run
a scanner, and the copy does not imply that one will start. Copy is navigation help only.

Provenance: original copy, licence CC0-1.0, dated 2026-11-15 (`COPY_META`).

```
npm install
npm test
npm run typecheck
```

Tests:

- `src/index.test.ts` covers the state machine, focus keys, 44px targets, EN/FR completeness, French typography and forbidden wording.
- `src/a11y.test.ts` runs axe-core (WCAG 2.0/2.1/2.2 A and AA tags) over every step in EN and FR in jsdom, and checks tab order, arrow/Home/End focus movement with wrapping, and that Tab is never cancelled.

Limits: jsdom has no layout or rendering, so colour contrast (disabled in the test), real target sizes, focus visibility and focus-not-obscured are not checked, and nothing here uses a screen reader. A real-browser and assistive-technology pass is still needed before any conformance claim.
