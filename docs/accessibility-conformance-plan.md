# Accessibility conformance plan

**Product:** the App, help centre and community skeleton in this repository.
**Target:** WCAG 2.2 Level AA for the web screens in `apps/centre`.
**Claim today:** None. This plan prepares an audit. It is not an audit report, and it is not a conformance statement.

## Legal floor and design target

The master plan separates two bars. The Integrated Accessibility Standards under the Accessibility for Ontarians with Disabilities Act set a legal floor of WCAG 2.0 Level AA for in-scope organisations' web content. The plan says the regulation had not been updated to WCAG 2.2 at the time of research (unknown U69). Re-read the current regulation before anyone quotes the floor.

The design target is WCAG 2.2 Level AA, including the notes that matter on a phone: focus not obscured (2.4.11), dragging movements (2.5.7), target size minimum (2.5.8), accessible authentication (3.3.8), and consistent help (3.2.6). AA means the Level A and Level AA criteria, not AAA as a blanket claim. Spinal cord injury use needs more than the 24 by 24 CSS pixel minimum: primary controls in this interface are at least 44 by 44 CSS pixels.

The operator of a future public App, if it has one or more employees in Ontario, is itself an obligated organisation under the AODA. A multi-year plan, training, and accessible feedback are operator duties. They are not met by this prototype. This repository does not label any place as AODA compliant. The App must not do that from its own data.

## What was built to support the target

- One skip link, first in the tab order, pointing at `main`.
- One `h1` on each screen. Help stays in the header on every screen, next to Call 911.
- Visible focus, at least 3 pixels, not relying on colour alone for language or pressed state (`aria-pressed` is set as well).
- English and French. `lang` on the document switches with the language. French is a draft pending Franco-Ontarian review.
- Form controls have labels. The age checkbox is not pre-checked.
- No drag-only action. No time limit. No CAPTCHA.
- Text and the blue `#0b3d91` on white are intended to clear 4.5:1. Interface borders are intended to clear 3:1. Confirm with the axe run and a manual check.
- `prefers-reduced-motion: reduce` turns off animation.
- Content reflows in a single column. Horizontal scrolling is not required at a narrow width.
- Demonstration events use a description list, not colour, for unknown fields.

## What an automated scan does not prove

axe-core is MPL-2.0 and is the scanner in `qa/`. It does not prove WCAG 2.2 AA. It misses many keyboard, cognitive, and assistive-technology failures. The industry "30 to 40 percent" figure in the master plan must not be quoted as a precise measurement.

The Playwright suite runs axe on the help home, an article, the directory, an event, the safety explainer, About, and the review practice, and it tabs from the top of the home screen. That is a preparation run, not an audit.

## Manual scripts to run before any claim

Record the build identifier `access-help-0.1.0` (or the later identifier) on every script.

**Keyboard.** From the top of each screen, complete the task with Tab, Shift+Tab, Enter, and Space. Confirm the skip link is first, focus is visible, and there is no trap. Open a help article and use Back. Open an event and use Back. Switch language and search.

**Switch.** Ten controls, including the skip link, a navigation link, a language button, the search box, an article link, Call 911, a directory link, an event button, the practice tip field, and the age checkbox. Each needs one activation, a visible focus, and a target at least 24 by 24 CSS pixels, with primary actions at least 44 by 44. No two-switch chord.

**Voice.** The accessible name of each of those controls matches the visible label. Search can be dictated. Language buttons say English and Français.

**Screen reader.** VoiceOver and TalkBack on one help article, one event, and the crisis article. Headings, links, and the offline banner are announced. Status text after a practice submit uses `role="status"`.

**Zoom and reflow.** 200 percent and 400 percent, and a 320 CSS pixel width. No clipped heading. Landscape as well as portrait.

**Crisis path.** From any screen, Call 911 is in the header. The crisis practice path shows numbers without asking for a story, and the text is not left in the queue.

## Lived experience

WCAG conformance without testing by people with a spinal cord injury is not the bar in the master plan. Testing has to include people who use switch, voice, eye gaze, and one hand, in English and French, including high tetraplegia and a low-end phone. Testers are paid. Simulators do not count. No such sessions have been run for this repository. Do not write a user-testing report that pretends they have.

## Known limits of this build

- The map, journey planner, finders, and games are not in this repository, so they are not covered.
- French has not had Franco-Ontarian review. Screen-reader language switching was not tested on a device.
- The review practice uses a native select and buttons. It has not been tested with a sip-and-puff switch.
- A conformance claim, an App Store nutrition label, and a published accessibility statement are launch items. They stay open.

## Remediation rule

A blocker on a primary task stops release of that screen. A serious failure is fixed or carried with a written workaround and a date. Post-launch failures, once a real audit exists, are fixed within 30 days and re-tested. That clock does not start until an audit exists.
