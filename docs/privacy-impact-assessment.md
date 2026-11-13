# Privacy impact assessment (draft)

**Status:** Draft for counsel. Not a legal opinion. Not a completed assessment.
**Scope:** The help centre, the community skeleton, and the on-device review practice in this repository (`access-help`).
**Date:** 13 November 2026.
**Product name:** the App. No organisation named below has endorsed it.

Counsel still has to decide, feature by feature, whether the Personal Information Protection and Electronic Documents Act (PIPEDA) or Ontario's Personal Health Information Protection Act (PHIPA) applies. The master plan marks that question undecided. This draft does not decide it.

## 1. What this build actually does

| Flow | Data | Where it lives | Leaves the device? |
| --- | --- | --- | --- |
| Read a help article | Bundled article text, language choice | App bundle and IndexedDB (`the-app-help`) | No |
| Language choice | `en` or `fr` | `localStorage` key `the-app-language` | No |
| Call 911, 9-8-8, 811, ConnexOntario | The user places the call or text in their phone app | Not stored by the App | The phone's own call or text, not an App upload |
| Demonstration events | Three hand-entered listings | App bundle | No |
| Programme directory | Factual descriptions and a public link | App bundle | The link opens `https://sciontario.org/` in the browser |
| Review practice | Display name, tip text, queue state, helpful device token, report note | In memory for the page session | No server exists in this repository |
| Crisis-shaped tip | Nothing | Not stored. A counter of redirects exists only in that page session | No |

There is no account, no analytics kit, no advertising kit, and no server in this repository.

## 2. Classification, still undecided

A direct-to-consumer help text that does not act for a health information custodian is often discussed under PIPEDA. Disability-related and location-related information is sensitive even when PHIPA does not apply. Express, meaningful consent is the design rule for anything sensitive.

The App would be a PHIPA matter if it acted as an agent of a custodian, provided electronic services that carry personal health information for a custodian, or itself delivered health care. None of those is in this build. A later hospital, Ontario Health atHome, or SCIO integration would reopen the question. Do not reuse this draft for that integration.

The Freedom of Information and Protection of Privacy Act and the Municipal Freedom of Information and Protection of Privacy Act govern public institutions, not this private prototype. They matter when a public partner shares data. That sharing is not built here.

Fine amounts quoted in secondary explainers were not re-read from the consolidated statutes. They are not repeated here.

## 3. Purpose, collection, and minimisation

Core help works with no account, no health data, and no location history.

The review practice asks for a display name and a tip. It asks the person to confirm they are 16 or older. It does not ask for an injury level, a diagnosis, a health card, or a home address. A draft that fails the age confirmation is not stored.

Crisis-shaped text is not stored. The screen shows 911, 9-8-8, and ConnexOntario. That list was checked on 13 November 2026 and must be checked again before any release.

Location is not collected. A tip can name a place in words. The practice store does not attach GPS.

Helpful marks store an opaque device token in the session so the count cannot be incremented twice. The public projection of a tip does not include the token, the moderator id, or the reporter token.

Family tips are not listed in the general audience.

## 4. Consent

No consent wall sits in front of help, 911, or the directory.

The age confirmation starts unchecked. It is not a pre-ticked box.

There is no research consent because there is no research use. Do not add analytics that reconstruct a person's reading of crisis pages.

Withdrawal: clearing site data deletes the language key and the IndexedDB pack. The practice queue dies with the page session. There is no account to delete.

## 5. Safeguarding and children

Default age scope follows the plan's proposal of 16 and over, matching the eligibility SCIO describes for its own services. That match is not a decision that SCIO operates this App. Under-16 use is out of scope. The practice form refuses it and does not keep the text.

This is not a decision about capacity law. Counsel has to review it before any public launch.

A safeguarding report can keep a summary for a reviewer. If the summary itself is a crisis disclosure, it is not stored. The reported person is not shown the reporter's token. No one is staffed to read these reports. The practice screen says so.

## 6. Indigenous data

No on-reserve, First Nation, Inuit, or Métis community record is included. OCAP (Ownership, Control, Access, and Possession) is a First Nations framework and a trademark of the First Nations Information Governance Centre. It is not applied here to Inuit or Métis data, and this draft does not restate the Centre's own wording. fnigc.ca was not re-fetched for this draft.

A land acknowledgement is not engagement. None is shown, so that it is not mistaken for an agreement.

## 7. Retention and residency

| Data | Retention in this build |
| --- | --- |
| Help pack | Until the person clears site data |
| Language | Until the person clears site data or switches |
| Practice tips | Page session only |
| Crisis text | Not retained |
| Server backups | None, because there is no server |

There is no United States or Canada hosting decision for personal information in this repository, because personal information is not uploaded. Do not assume a later host is acceptable for health-adjacent data. That decision needs counsel and security review before any sync is added.

## 8. Breach

A breach plan is required before launch if any personal information is uploaded. This build has no upload and no breach record. The launch checklist keeps the incident-response item open. Templates for the Privacy Commissioner of Canada and the Information and Privacy Commissioner of Ontario are not written here and must not be improvised in a crisis.

## 9. Third parties

People leave the App when they open SCIO's site, 9-8-8, Health811, ConnexOntario, or 211 Ontario. Those sites have their own terms. The App does not send a profile with the link.

No map tile, font host, or analytics host is configured. The typeface stack uses fonts already on the device.

## 10. Risks and mitigations

| Risk | Mitigation in this build | Still open |
| --- | --- | --- |
| A tip is read as medical advice | Screen holds the tip. Publish throws. The author gets a plain-language reason. | A staffed reviewer is not appointed. |
| Crisis text is saved | The store refuses to write it. | A human test that the UI copy matches the store. |
| A small community identifies someone | Optional re-identification hold. Not a complete solution. | Governance review before any public tip. |
| French safety text is wrong | Marked as a draft pending Franco-Ontarian review. Not machine-translated. | The review itself. |
| PHIPA scope is assumed | This document says the question is open. | Counsel opinion, plan item P1. |
| Practice queue is mistaken for a live community | Copy says it is on-device and not staffed. It is not in the primary navigation. | Keep it that way until staffing and an agreement exist. |

## 11. Plan checklist P1 to P18

Items follow the master plan, section 5.7. "Open" means this draft does not close them.

| Item | State in this repository |
| --- | --- |
| P1 PHIPA / PIPEDA opinion | Open. Question recorded. No opinion on file. |
| P2 Privacy impact assessment | This draft. Not closed. Not shared with SCIO, because there is no partnership. |
| P3 Threat model | Open. No server. Session storage is still in the browser threat model. |
| P4 Core features without an account | Met for help, directory, and events in this build. |
| P5 Consent model | Age checkbox only. No broader consent UI, because no account exists. |
| P6 Research consent | Met by not doing research. |
| P7 Location minimisation | Met. No location API is called. |
| P8 Profile minimisation | Met by not collecting a profile. The profile article says what a future profile must not collect. |
| P9 Retention and deletion | Partial. Browser controls only. No in-app deletion receipt for the help pack. |
| P10 Residency decision | Open. Not applicable until there is an upload. |
| P11 SDK inventory | See `docs/licences.md`. No advertising kit. No location kit. |
| P12 Breach plan and tabletop | Open. |
| P13 De-identification | Public tip projection drops tokens. No analytics product. |
| P14 Age scope | Proposed 16-plus, enforced on the practice form. Counsel review open. |
| P15 Indigenous data | Met for this build by holding no Nation data. Agreement process is not built, because there is nothing to withdraw. |
| P16 Open-data licences | No open dataset is ingested here. |
| P17 Privacy policy publication | This draft is not a public privacy policy. French and plain language are started in the help article `privacy`. |
| P18 Staff training | Open. No staff. |

## 12. Recommendation

Do not launch the review practice as a public community. Do not upload tips. Do not add a crisis text box. Ask counsel to close P1 before any account, sync, or custodian integration. Have a Franco-Ontarian reviewer and, for safety articles, a clinician, read the help pack before it is called final.
