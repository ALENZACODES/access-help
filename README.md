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
| `packages/followup` | Day 25–30 records: questions log, demo-day log, thank-you note, triage tracker, defects, regression runs, answer pack, check-in log, with honesty and privacy checks |
| `qa` | Playwright and axe, Day 1–30 checks, reviewer checklist |

The Day 16 skeleton (directory, demonstration events, moderation explainer) has no posting. The review practice at `/practice` is a separate on-device flow so the staffing rules can be tested. It is not a live community. There is no messaging and no mentor matching.

## Demo follow-up (Days 25–30)

`/team/follow-up` in the centre is an on-device questions log and tracker for the team, in English and French. It records roles, not names. It refuses a question SCIO did not agree to record, a deferred question with no follow-up, and text with an email address, phone number, or postal code. Nothing is sent. Entries stay in this browser until deleted.

The filed record for Days 25 to 30 goes in `docs/follow-up/record.json` (`demo-follow-up-1.0.0`, see `packages/followup/src/types.ts`). No record is filed yet, because the demonstration has not been held. `npm run check` validates the record once it exists. Until then those checks report manual, not pass. The rules refuse endorsement or verification claims, live-data and health claims, a commitment nobody made, a sent answer without the human owner's approval, a regression check from another build, and a carried defect without a dated plan. The synthetic record in `packages/followup/src/fixtures.ts` is test data dated in the year 2000. It is not a record of a demonstration.

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
