# First-run shell (lane P7C)

Builds on `../src/paths.ts` (help-centre onboarding paths, P7) and
`../switch-first` (switch/keyboard-first first-run flow, P7B). Both are
imported, not copied.

## What it is

`src/shell.ts` mounts the whole onboarding experience into one element:

- **Setup**: the switch/keyboard-first flow. Choices are saved on this
  device only (`src/store.ts`). A choice that was never made stays unknown.
- **Help**: the short help paths from P7, step by step, plus a guide to
  reading a place card (`src/facts.ts`, `src/views.ts`).
- **EN/FR** with a language toggle, `lang` set on the page and on the
  toggle, language negotiated from the browser and then remembered.
- **Accessibility plumbing**: skip link, heading focus on view change,
  focus kept on the control just used, a polite status region
  (`src/announce.ts`), native buttons at least 44px, a 3px focus ring,
  forced-colours and reduced-motion support (`src/styles.ts`). Palette
  contrast is calculated in `src/contrast.ts` and tested for both themes.
- **Unknown stays unknown** (`src/facts.ts`): yes/no details are only
  accepted with a source, an open licence and a date; otherwise they become
  "Unknown". Ages are shown as "recorded N months ago" and old details say
  "May be out of date". Nothing claims real-time data or verification.
- **Offline** (`src/sw-logic.ts`, `src/sw.ts`, `src/register.ts`): the shell
  is cached same-origin only, so no third-party hosts or tile servers are
  ever cached. If the network fails on a page navigation the cached page is
  served. Old caches are pruned on activate. The footer says what is true:
  the browser accepted offline setup, "some pages may still need a
  connection".

## Wiring

- `src/index.ts` exports every module. `src/main.ts` + `index.html` are the
  browser entry: they mount the shell and register `sw.js`.
- `src/guard.ts` is run by `src/guard.test.ts` over every `.ts` and `.html`
  file under `packages/onboarding` (all three lanes). It fails on literal
  special spaces, zoom-blocking viewports, positive `tabindex`, third-party
  tile hosts, scheduler keywords, secret-like literals and overclaim, AI or
  forbidden-name wording in user copy.
- `npm run ci` = typecheck + all tests, including the guard.

## Added in P7D

- **Notes** (`src/form.ts`, `src/outbox.ts`, `src/model.ts`): a real
  add-a-note form for what someone saw at a place. Every detail starts as
  Unknown, no licence is pre-selected, at least one detail must be answered,
  and a yes or no is stored with source, open licence and date ("Contributor
  report"). Email addresses and phone numbers are refused. Notes are kept on
  this device only (limit 200) and are re-validated every time they are read.
  An unfinished form is autosaved as a draft so nothing is typed twice.
- **Filter and search** (`src/filter.ts`): asking for "step-free entrance:
  Yes" puts notes into Matches, Unknown for this filter, or Does not match.
  A detail with no record is never counted as a match and never ruled out.
- **Export and import** (`src/exchange.ts`): notes move between devices as
  plain JSON (a download link and a paste box, so it works offline). Imports
  are validated note by note; existing notes win over imported duplicates.
- **Display settings** (`src/display.ts`, `src/views-display.ts`): text size
  up to 200%, wide text spacing (WCAG 1.4.12 values), more contrast
  (a third palette, calculated at 7:1 or better for body text), and reduced
  motion. Saved on this device only.
- **Audits that fail** (`src/audit.ts`): `auditDom` checks every rendered view
  (names, label in name, 44px targets, duplicate ids, heading order,
  landmarks, skip link, language switch, radio groups, error descriptions,
  French typography, banned wording, and that every Yes/No shows source,
  licence and date while Unknown shows none). `auditCss` checks the
  stylesheet and `auditCopy` checks all EN/FR strings from all three lanes.
  The tests render every view in English and French and expect no
  violations, and each rule has a fixture that must trigger it. The shell
  calls `auditDom` after every render when given `onAudit`; the page enables
  it with `?audit`.
- **Wording**: `src/wording.ts` is the single list of words user copy must not
  use (it claims more than the App can back up). The guard, the DOM audit and
  the copy audit all use it. User-entered text is shown as text and is not
  audited for wording.

The first audit run found two real defects, now fixed: the notes text boxes
had no 44px minimum, and the P7B setup `nav` had no label when the page also
has the main `nav`.

## Places, visit plan, saved must-haves and routes (P7E)

- **Places** (`places.ts`, `views-places.ts`): notes about the same place
  (same name and address, ignoring case, accents and punctuation) are
  combined. For each detail the reports either agree, differ, or there are
  none (Unknown). When reports differ the screen says "Reports differ" and
  lists every report with its source, licence and date. It never picks the
  newest one as the answer.
- **Filtering places**: a place matches only when every report agrees with
  what was asked. No reports or differing reports stay in "Unknown for this
  filter". A recorded opposite answer puts a place in "Does not match".
- **Visit plan** (`plan.ts`): for a place and a set of must-haves, shows
  each item as Matches, Does not match, Unknown or Reports differ, plus
  questions to ask the place for Unknown and differing items, and plain text
  to copy. It gives no medical or eligibility advice.
- **Saved must-haves** (`needs.ts`): stored on this device only. They are
  place details, not facts about a person.
- **Routes** (`router.ts`): opt-in `#/` addresses (`hashRouting: true`,
  switched on in `main.ts`). Only hashes starting with `#/` are routes, so
  the skip link and field links are left alone. Unknown routes are ignored.
- **Audits**: `fact-provenance` now covers differing reports; new
  `plan-status` rule for plan items. Seeded random-data tests
  (`fuzz.test.ts`) check that unknown is never counted as a match.
- `BANNED_WORDING` now also rejects the verify family in English and French.

## Not done here

- Layout-dependent checks are not covered in jsdom: real target sizes,
  200% text reflow at 320px, focus visibility and screen-reader behaviour.
  Test those in a real browser before making any conformance statement.
- No bundler config is included. To run the page, bundle `src/main.ts` to
  `main.js` and `src/sw.ts` to `sw.js` next to `index.html` (the precache
  list in `sw-logic.ts` expects `./`, `./index.html`, `./main.js`).
- No GitHub workflow is added (outside this lane's scope). To run the guard
  in CI: `npm ci && npm run ci` in this directory.
- Tests run in jsdom. Colour contrast of rendered pages, real target sizes,
  focus visibility and screen-reader behaviour are not tested; the
  contrast of the palette is calculated, not measured on screen. The
  service worker logic is tested with fakes, not in a browser.
- The place-card guide uses one clearly labelled illustrative example (no
  real place). There is no place data in this package.

Provenance of all copy: original text written for the App, licence CC0-1.0,
dated 2026-11-15 (`COPY_META`).

```
npm install
npm run ci
```
