# access-help

Help centre, peer tips and events, French and privacy drafts, and the cross-repo test harness for **the App**.

The App is an unbranded Ontario tool, spinal-cord-injury first. Spinal Cord Injury Ontario, AccessNow, Google, transit agencies, and municipalities have not endorsed it. This repository does not give medical advice, legal advice, or a benefits decision. Unknown stays Unknown.

## Layout

| Path | What it is |
| --- | --- |
| `packages/help` | English and French help articles, search, on-device pack |
| `packages/community` | Peer-tip rules, demonstration events, moderation, Day 16 skeleton |
| `packages/followup` | Demo-day records for Days 25 to 30: questions log, follow-up tracker, evidence answers, dated checks, check-in decisions, and the thank-you draft, with honesty rules |
| `apps/centre` | The screens: help, directory, events, safety, about, and an on-device review practice |
| `docs` | Privacy impact assessment draft, conformance plan, data governance, style guides, launch checklist |
| `qa` | Playwright and axe, Day 1–30 checks, reviewer checklist |

The Day 16 skeleton (directory, demonstration events, moderation explainer) has no posting. The review practice at `/practice` is a separate on-device flow so the staffing rules can be tested. It is not a live community. There is no messaging and no mentor matching.

The demo-day record at `/demo-record` is linked from About, not from the primary navigation. It keeps the record on this device and does not send anything. People are recorded by role. A question is kept only when SCIO agreed it can be recorded. A SCIO commitment is kept only when the human owner confirms SCIO made it. The thank-you draft is built from the record alone and is not marked ready while any rule fails. The Days 26 to 30 automated checks test those rules on a synthetic record built in `qa/src/days/run.ts`. They do not say that a real session log passed.

## Scripts

```bash
npm install
npm test
npm run typecheck
npm run check
npm run dev
npm run test:e2e
```

`npm test` runs Vitest in the packages and the harness. `npm run check` prints the Day 1–30 report. `npm run test:e2e` starts the centre and runs Playwright with axe. Continuous integration is `pull_request` only.

## Licences

See `docs/licences.md`. axe-core is MPL-2.0. Do not relicense it.

## Not a launch

French is a draft pending Franco-Ontarian review. Safety articles are pending clinical review. The PHIPA / PIPEDA question is open. See `docs/launch-checklist.md`.
