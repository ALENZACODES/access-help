# Data governance

**Scope:** Help articles, demonstration events, programme descriptions, and the on-device review practice.
**Date:** 13 November 2026.

The App keeps three kinds of information apart: place facts, peer tips, and health information. This repository holds help text and a community skeleton. It does not hold surveyed places.

## Record tiers

See `docs/verification-tiers.md`. Canonical tiers are 0, 1, 2, 3, 4, and E. Practice tips and demonstration events in this repository use canonical tier 0 and prototype label `PROTOTYPE-UNVERIFIED`. `COMMUNITY-REPORTED` is canonical tier 2 and is not used on a prototype record. `VERIFIED` and tier 3 are rejected by the schemas in `packages/community/schemas/`.

Every stored tip and event carries a source, a licence, a source date, and a record date. The schema will not validate a record that drops the tier.

## Moderation tiers

From the master plan, Part 2, section 4.2. Service times below are the plan's proposals. They are not staffed. If a tier cannot be staffed, the feature does not launch.

| Tier | Content | Who | Proposed time | Publication |
| --- | --- | --- | --- | --- |
| V1 | Measurements and photos | Trained verifier, then a second check | Cycle by layer | Only after verification. Show method, date, and protocol. |
| V2 | Venue self-report with evidence | Staff, against the protocol | 5 business days; acknowledge in 1 | Labelled self-report, never verified. |
| V3 | Peer tips | A person trained in peer boundaries | 2 business days; same day if safety-relevant | Peer tip, dated, not a fact. No health advice. |
| C1 | Barrier and outage reports | Triage | Same day; proposed within 4 hours while open | User report, with expiry. Never silently deleted. |
| C2 | Reviews and photos | Community moderator | 3 business days; same day for harassment or personal data | After that review. |
| C3 | Open-data import | Data operations | Per feed, licence checked again | Source, licence, date, tier. Never "SCIO-verified". |

This repository implements the V3 decision in code for a practice queue: software may hold a tip, and a person publishes or rejects it. Software cannot publish a held tip. French tips need a French-speaking reviewer. There is no messaging and no mentor matching. Those are not missing buttons. They are out of scope until a safeguarding agreement exists.

## Peer tips

Authors choose a display name. They are not asked for an injury level or a diagnosis. The age gate is 16-plus. Under-16 text is discarded.

A tip that matches crisis language is not stored. The UI shows 911 and 9-8-8.

Health advice, transfer instruction, equipment recommendation, benefits decisions, personal health detail, contact details, and harassment are held. The author gets the reason in English and French. The moderator does not rewrite the tip into advice.

A report hides the tip. The reporter token is not copied onto the tip. Family tips stay in the family list.

Place-tied tips age after 12 months and are stale after 24. The plan marks those numbers as estimates. A tip that conflicts with a surveyed record is flagged. It does not overwrite the record.

Helpful counts do not store who voted, beyond a local device token that is stripped from the public view.

## Events

An event is not the building. Listings in this repository are demonstration shapes. Per-event entrance, seating, washrooms, support, cost, and support-person admission are Unknown. The UI says the building note is not proof about that date. Registration is an external link. `inAppRegistration` is fixed to false in the schema.

SCIO-organised events, if they are ever listed, name SCIO as the organiser only when SCIO published them, and they still link to SCIO's own registration. Nothing in this repository is an SCIO event.

## Programme directory

Nine areas are described from the master plan's reading of SCIO's FY2025 audited groupings and later public wording. Unknowns are named on each row (including U13, U14, U15, U18, U20, U22, U23, U26). Attendant services are not listed as current (U12).

No SCIO data has been shared. The default is no SCIO data. A link is not a data-sharing agreement and not an endorsement.

## Help articles

English and French are human drafts. `machineTranslated` is false and the content audit enforces that. French state is `draft_awaiting_franco_ontarian_review`. Safety articles are `draft_awaiting_clinical_review` in English. Nobody is recorded as reviewer.

Articles follow does / does not / data used. They do not state benefit amounts. They do not state a designated-area count of 25 or 27. That count is Unknown until the current regulation is listed.

## OCAP and distinctions

Do not publish accessibility data for a First Nations reserve, or for an Indigenous-governed service, without an agreement with that Nation or community on ownership, control, access, and possession. OCAP is First Nations specific. It is not a framework for Inuit or Métis data. Inuit and Métis governance were not researched deeply enough in the plan (unknown U74) and are not invented here.

The App does not collect Indigenous identity. It does not describe builder meetings as Crown consultation.

No Nation record is in this repository, so there is nothing to withdraw. A future feed has to support correction and deletion by the Nation before it is turned on.

## Small cells and retention

Do not publish a count that could identify a person, a household, or a small community. The practice queue is not an analytics product.

Help text stays on the device until site data is cleared. Practice tips last for the page session. Crisis text is not retained. There is no backup, because there is no server.

## Complaints

Wrong data, discrimination, privacy, accessibility of the App, and safeguarding each need a person. Proposed acknowledgement is one business day. It is not offered as a promise, because nobody is staffed. Complaints are not used for research or marketing.

Official human-rights and legal-clinic routes stay on those organisations' sites. The App does not give legal advice and does not decide compliance.
