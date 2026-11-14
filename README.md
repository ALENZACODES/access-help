# access-help

Help centre, peer tips and events, French and privacy drafts, and the cross-repo test harness for **the App**.

The App is an unbranded Ontario tool, spinal-cord-injury first. Spinal Cord Injury Ontario, AccessNow, Google, transit agencies, and municipalities have not endorsed it. This repository does not give medical advice, legal advice, or a benefits decision. Unknown stays Unknown.

## Layout

| Path | What it is |
| --- | --- |
| `packages/help` | English and French help articles, search, on-device pack |
| `packages/community` | Peer-tip rules, demonstration events, moderation, Day 16 skeleton |
| `apps/centre` | The screens: help, directory, events, safety, about, and an on-device review practice |
| `docs` | Privacy impact assessment draft, conformance plan, data governance, style guides, launch checklist |
| `qa` | Playwright and axe, Day 1–25 checks, reviewer checklist |

The Day 16 skeleton (directory, demonstration events, moderation explainer) has no posting. The review practice at `/practice` is a separate on-device flow so the staffing rules can be tested. It is not a live community. There is no messaging and no mentor matching.

## Shell adapter

`packages/help/src/shell.ts` (`helpShellModule`, `listHelpForShell`) returns help articles in the shape of access-main's `ModuleResult` for the `/help` route (contract 1.1.0). Titles are in the screen language. Provenance uses only what each article records: this repository as source, MIT as declared in `packages/help/package.json`, the latest `retrieved` date on the article's sources, and tier `E` when an https source was read (otherwise `0`). Every article is `PROTOTYPE-UNVERIFIED`. An article with no dated source is left out. The output was checked with access-main's `checkModuleResult` on 14 November 2026.

## Scripts

```bash
npm install
npm test
npm run typecheck
npm run check
npm run dev
npm run test:e2e
```

`npm test` runs Vitest in the packages and the harness. `npm run check` prints the Day 1–25 report. `npm run test:e2e` starts the centre and runs Playwright with axe. Continuous integration is `pull_request` only.

## Licences

See `docs/licences.md`. axe-core is MPL-2.0. Do not relicense it.

## Not a launch

French is a draft pending Franco-Ontarian review. Safety articles are pending clinical review. The PHIPA / PIPEDA question is open. See `docs/launch-checklist.md`.
