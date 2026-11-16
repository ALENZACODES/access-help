# access-help

Help centre, peer tips and events, French and privacy drafts, and the cross-repo test harness for **the App**.

The App is an unbranded Ontario tool, spinal-cord-injury first. No organisation, agency, or company has endorsed it. This repository does not give medical advice, legal advice, or a benefits decision. Unknown stays Unknown.

## Layout

| Path | What it is |
| --- | --- |
| `packages/help` | English and French help articles, search, on-device pack |
| `packages/onboarding` | Short help-centre onboarding paths in English and French |
| `packages/community` | Peer-tip rules, demonstration events, moderation, Day 16 skeleton |
| `packages/peers` | Peer-connection request prepared on the device and shared by the person. No messaging, no matching |
| `packages/event-access` | Per-event accessibility records: organiser checklist, organiser file, journey hand-off |
| `packages/outings` | Outing lists and the event outing planner, kept on the device |
| `apps/centre` | The screens: help, directory, events, safety, about, and an on-device review practice |
| `docs` | Privacy impact assessment draft, conformance plan, data governance, style guides, launch checklist |
| `apps/centre/src/places` | Places screens: load a pack file, search and filter with UNKNOWN kept apart, a data-status explainer, and an on-device observation form that writes files for a person to submit to OpenStreetMap. Ships no places. See `docs/places.md`. |
| `docs/mapping-day` | Mapping-day guide (EN/FR), accepted licences, and an export that writes a draft file for a person to submit to OpenStreetMap |
| `apps/centre/src/peers` | The peer request at `/peers/request`, mounted from `packages/peers`. Nothing is sent. |
| `apps/centre/src/events` | Event night at `/event-night`: organiser checklist, open an organiser file, getting to the door, and the outing planner, mounted from `packages/event-access` and `packages/outings`. An organiser's answers are shown as the organiser's own statement, never as confirmed. |
| `packages/followup` | Demo-day records for Days 25 to 30: questions log, follow-up tracker, evidence answers, dated checks, check-in decisions, and the thank-you draft, with honesty rules. Records on this screen are Sample data. |
| `qa` | Playwright and axe, Day 1–30 checks, reviewer checklist |

The Day 16 skeleton (directory, demonstration events, moderation explainer) has no posting. The review practice at `/practice` is a separate on-device flow so the staffing rules can be tested. It is not a live community. There is no messaging and no mentor matching.

The demo-day record at `/demo-record` is linked from About, not from the primary navigation. It keeps the record on this device and does not send anything. People are recorded by role. These records are Sample data. A question is kept only when the guest agreed it can be recorded. A guest-organisation commitment is kept only when the human owner confirms the guest made it. The thank-you draft is built from the record alone and is not marked ready while any rule fails. The Days 26 to 30 automated checks test those rules on a synthetic record built in `qa/src/days/run.ts`. They do not say that a real session log passed.

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
