# @access/onboarding

Short help-centre onboarding paths for the App, in English and French
(`src/paths.ts`). Three paths of 2–3 steps: find a place, add a detail,
get help.

- Provenance: original copy written for the App; licence CC0-1.0; dated
  2026-11-15 (see `PATHS_META`). No third-party data.
- Copy is navigation help only: no medical or eligibility advice.
- The “Find a place” and “Add a detail” paths point to the map in the App,
  or to exporting a note file to share. They do not treat this help centre
  as if it had place pages.
- "Unknown" is shown as unknown; the copy tells readers not to assume access.
- French strings use `’`, U+00A0 before `:`, U+202F before `; ! ?` and
  inside `« »`; `frenchTypographyIssues()` and the tests enforce this.
- UI that renders these paths must size controls at least
  `MIN_TOUCH_TARGET_PX` (44) px.

```
npm install
npm test
npm run typecheck
```
