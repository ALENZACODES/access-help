# Launch checklist

For the help centre and community features. An open item blocks a public launch of that feature. This prototype is not a launch.

| Id | Item | State |
| --- | --- | --- |
| L1 | Counsel records the PHIPA / PIPEDA decision for the real data flows | Open |
| L2 | This privacy impact assessment is revised against that decision and the recommendations are closed | Open |
| L3 | Threat model, encryption in transit and at rest for any future server, access control, and audit logging | Open |
| L4 | Breach templates, a 24-month breach log if PIPEDA applies, and a tabletop exercise | Open |
| L5 | Franco-Ontarian review of every French help article, with the reviewer's role and the date stored on the article | Open |
| L6 | Clinical review of emergency, crisis, health, and safeguarding articles before any wording beyond "call 911" is added | Open |
| L7 | Re-check 911, 9-8-8, Health811, ConnexOntario, and the poison-centre number on the day of release | Open |
| L8 | No public peer tips until moderation is staffed, including French-speaking reviewers, and a safeguarding lead is named | Open |
| L9 | No mentor matching and no private messaging unless a written safeguarding agreement exists | Blocked on purpose |
| L10 | WCAG 2.2 AA audit by people, plus switch, voice, and screen-reader sessions with people with a spinal cord injury | Open |
| L11 | Accessibility statement that lists known failures. No conformance claim before L10 | Open |
| L12 | Keyboard, axe, and language tests in `qa/` pass on the release build | Required for this repository |
| L13 | Help articles pass the content audit: does, does not, data used, no machine translation, no endorsement claim | Required for this repository |
| L14 | Schemas reject a missing tier and reject `VERIFIED` | Required for this repository |
| L15 | Age scope confirmed by counsel before anyone under 16 can submit | Open |
| L16 | Indigenous data agreement before any Nation or reserve record is shown | Open, nothing to publish now |
| L17 | Designated-area list taken from the current regulation, or left Unknown | Open, left Unknown |
| L18 | Benefit amounts, if ever shown, re-read from the official page on the release day | Open, amounts omitted |
| L19 | SCIO facts that are still unknown (attendant services, office areas, peer-training policy) re-checked with SCIO before they are stated as current | Open |
| L20 | No endorsement language in the release build | Required for this repository |
| L21 | Service worker caches only this App's help pack, not third-party pages | Required for this repository |
| L22 | Deletion path for any future account, as easy as sign-up, with a confirmation | Open, no account yet |

"Required for this repository" means the automated checks must pass before this branch is treated as ready. It does not mean the public App is ready to launch.
