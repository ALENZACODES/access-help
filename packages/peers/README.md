# @access/peers

First slice of Peer Connect (issue #8): an on-device peer request, deterministic matching, and a link-only signpost to an SCI organisation's peer programme.

Demonstration only. There is no message server. A "match" is a local, labelled demonstration object, and the profiles it matches against are made-up demonstration data with no names or contact details.

- Safeguarding: 16+ age gate; free text is refused if it reads as medical advice (diagnosis, treatment, catheter, wound, bowel or bladder, pain, spasm, medication) or carries contact details; crisis wording is never stored and is redirected in words to 911, 9-8-8 and ConnexOntario.
- Matching: same topic and language, then same city if one was given, then candidate id. It never assesses health or suitability.
- Partner route: the official address is `Unknown`. The link is a placeholder on `example.invalid`, labelled as a demonstration. A link is not a referral or an endorsement.
- Records carry source, licence, dates and tier 0 with `PROTOTYPE-UNVERIFIED`; schemas refuse VERIFIED and tier 3.

Scripts: `npm test`, `npm run typecheck`. Accessibility: `npm run test:e2e` (Playwright and axe-core, English and French at 1280 and 320 px) starts a Vite harness from `e2e/`.
