# @access/peers

A peer-connection request that a person prepares on the device and shares themselves, and a link-only signpost to a partner organisation's peer programme.

There is no message server, no direct messaging and no mentor matching. The earlier demonstration matching (a screen that paired a request with made-up profiles) has been retired: its screen, matching module, profile list and schema are removed, and `src/boundaries.test.ts` asserts for the whole package that none of them comes back.

- Shared safeguarding helpers: free text is refused if it reads as medical advice (diagnosis, treatment, catheter, wound, bowel or bladder, pain, spasm, medication) or carries contact details; crisis wording is never stored and is redirected in words to 911, 9-8-8 and ConnexOntario.
- Partner route: the official address is `Unknown`. The link is a placeholder on `example.invalid`, labelled as a demonstration. A link is not a referral or an endorsement.
- Records carry source, licence, dates and tier 0 with `PROTOTYPE-UNVERIFIED`; schemas refuse VERIFIED and tier 3.

Scripts: `npm test`, `npm run typecheck`. Accessibility: `npm run test:e2e` (Playwright and axe-core, English and French at 1280 and 320 px) starts a Vite harness from `e2e/`.

## Peer-connection request flow (`src/connect`, `PeerRequestFlow`)

The person prepares a request summary on the device and shares it themselves with a partner organisation's peer programme. The App sends nothing, and no screen says that a peer will reply or when.

- Closed lists only: who the request is for, one to three life contexts (for example life soon after an injury, parenting, work, sport), a broad part of Ontario, a language. There is no diagnosis, injury-level, health, name or contact field, and the schema refuses one.
- Free text is one optional note, limited to 280 characters. A note that reads as a diagnosis label, an injury level, a health detail, a clinical question or a contact detail is refused and not kept.
- Consent is itemised and nothing is ticked in advance. Two items are needed before anything is prepared; region, language and note are each optional and are left out of the summary, and out of routing, when not granted. Withdrawing consent closes the request and removes its summary. The App cannot take back a copy the person already shared.
- Routing rules are data (`RoutingTable`). The recorded table ships with no streams and no rules, so every request routes to `Unknown` with a reason. The made-up table in `src/testing/routing-fixture.ts` is sample data for tests and the test harness only.
- Safeguarding: crisis wording in the note interrupts the flow, is never stored, and shows three contacts in words (911, 9-8-8, ConnexOntario), stated as signposting, not counselling. Each request has a state (`received`, `needs_review`, `routed`, `closed`), a moderation tier that only rises, and an audit trail with closed-list reasons and no free text. A request made for someone else is marked `needs_review` and is not routed. No reviewer is connected to the App; the `reviewer` actor exists in the model and its tests only.
- History is kept on the device (`ConnectionRequestStore`), with delete per request and a confirmed "Delete everything" that removes every storage key this package writes.
- No direct messaging and no mentor matching: `src/connect/boundaries.test.ts` asserts that neither exists in this flow, and `src/boundaries.test.ts` asserts it for every export, schema, runtime source and screen string of the package.

Harness: `e2e/index.html` shows this flow; adding `?table=sample` loads the sample routing table.
