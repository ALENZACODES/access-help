# Reviewer checklist

The reviewer reads what was built, runs the checks, and can block a merge. A block stands unless the human owner accepts the risk in writing. This file is the human copy of `qa/src/reviewer/checklist.ts`.

| Id | Check |
| --- | --- |
| R1 | State the build identifier that was reviewed. |
| R2 | Read the help articles, including French drafts. Do not approve unread text. |
| R3 | Look for endorsement, partnership, or invented brand names. A link is not a partnership. |
| R4 | Look for medical advice, eligibility decisions, and doses. The App must not give them. |
| R5 | Confirm unknowns stay Unknown and no prototype record is marked VERIFIED. |
| R6 | Confirm French is still marked as a draft until a Franco-Ontarian reviewer is named. |
| R7 | Confirm there is no messaging and no mentor matching. |
| R8 | Confirm crisis text is not stored and 911 is not behind a form. |
| R9 | Record axe output. State that it does not prove WCAG 2.2 AA. |
| R10 | Check the keyboard path: skip link first, visible focus, help article back, language switch. |
| R11 | File every defect with severity, location, and reproduction steps. |
| R12 | End with PASS, PASS WITH FIXES, or BLOCK. A block stands unless the human owner accepts the risk in writing. |

Verdicts are `PASS`, `PASS WITH FIXES`, or `BLOCK`.

Severity is `blocker`, `serious`, or `minor`. A blocker on a primary task stops that screen. Do not mark PASS while a blocker is open.

## What this lane asked the reviewer to notice

- The Day 16 skeleton does not post, message, or register.
- `/practice` is an on-device review of the rules. It is not a live community and it is not in the primary navigation.
- Help French is a draft. Safety articles are waiting on clinical review.
- axe in `qa/tests` is preparation, not a conformance claim.
- Place, journey, and game checks stay blocked until `access-main`, `access-maps`, and `access-tools` are present. Do not treat a blocked row as a pass.
