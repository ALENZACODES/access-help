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

## Not done here

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
