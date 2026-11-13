# Verification tiers

The App keeps two vocabularies. They are not the same list. The canonical list is the one in `ALENZACODES/access-main` `packages/schema` (`docs/verification-tiers.md` and `schema/common/provenance.schema.json` on branch `cursor/schema-package-61db`, read 13 November 2026).

## Canonical tiers

Stored as `tier` on provenance.

| Tier | Who | What the record must show |
| --- | --- | --- |
| 0 | Open-data import slot | Source, licence, retrieval date. Not App-verified. |
| 1 | Business or operator claim | Claim date. Not a measurement. |
| 2 | Peer report | Evidence the peer supplied. |
| 3 | Trained surveyor | Protocol, role, method, observed date. A washroom also needs a photo id. |
| 4 | Live feed or corroborated status | Feed time, receipt time, and an expiry. |
| E | Desk check of an official page | Source link and desk-verification date. No eligibility decision. |

Tier 3 and the label `VERIFIED` need evidence. This repository does not create that evidence, so its schemas reject tier 3, tier 4, E, and `VERIFIED`. Unknown stays Unknown.

## Prototype labels

Part 5 Day 1 uses four labels. A record with a prototype publication context may carry only `PROTOTYPE-UNVERIFIED` or `SEEDED-OPEN-DATA`. `COMMUNITY-REPORTED` is tier 2 and is not used on a prototype record. `VERIFIED` is tier 3, with evidence, and is not used on a prototype record.

| Prototype label | Canonical tier it may sit on |
| --- | --- |
| `SEEDED-OPEN-DATA` | 0 |
| `PROTOTYPE-UNVERIFIED` | 0 or 1 |
| `COMMUNITY-REPORTED` | 2, and not on a prototype record |
| `VERIFIED` | 3, with evidence, and not on a prototype record |

Demonstration events in this repository use canonical tier 0 and prototype label `PROTOTYPE-UNVERIFIED`. Tier 0 is the schema slot the shared package uses for a synthetic prototype record. The source text says the listing is hand-entered demonstration data, not an open dataset. Practice tips use the same pair. A staffed public peer tip would be canonical tier 2 and `COMMUNITY-REPORTED`. No reviewer is staffed, so this prototype does not create that record.

These labels are not the moderation tiers in `docs/data-governance.md` (V1, V2, V3, C1, C2, C3).
