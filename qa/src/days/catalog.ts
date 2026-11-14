export type RepoOwner = "access-help" | "access-main" | "access-maps" | "access-tools" | "cross";
export type CheckKind = "automated" | "manual" | "playwright";

export interface AcceptanceCheck {
  day: number;
  /** Stable id, for example D16-4. */
  id: string;
  /** Pass sentence from the master plan, Part 5. */
  planText: string;
  owner: RepoOwner;
  kind: CheckKind;
  /** Set when this repository can execute the check. */
  checkId?: string;
}

interface DaySpec {
  day: number;
  owner: RepoOwner;
  tests: Array<{ planText: string; kind?: CheckKind; checkId?: string; owner?: RepoOwner }>;
}

const DAYS: DaySpec[] = [
  {
    day: 0,
    owner: "access-main",
    tests: [
      { planText: "Home screen loads, shows the words the App, shows the prototype notice, and shows a build identifier." },
      { planText: "About opens by click and by keyboard, with a logical focus order." },
      { planText: "The first Tab stop is the skip link, focus is visible, and there is no keyboard trap." },
      { planText: "Rollback is observed, restored, and recorded in the day log." },
      {
        planText: "A search of the repository finds no credentials and no invented brand name.",
        owner: "access-help",
        kind: "automated",
        checkId: "repo-secrets",
      },
      { planText: "The shell renders on a phone without horizontal scrolling, and the build identifier is readable." },
    ],
  },
  {
    day: 1,
    owner: "access-main",
    tests: [
      {
        planText: "The validator passes every valid example, fails every invalid example, and names each file.",
        owner: "access-help",
        kind: "automated",
        checkId: "lane-schemas",
      },
      {
        planText: "Removing the verification tier from a valid example fails validation.",
        owner: "access-help",
        kind: "automated",
        checkId: "lane-missing-tier",
      },
      {
        planText: "A VERIFIED tier without evidence fails validation. This repository rejects VERIFIED outright.",
        owner: "access-help",
        kind: "automated",
        checkId: "lane-no-verified",
      },
      {
        planText: "docs/verification-tiers.md defines all four tiers and the VERIFIED restriction.",
        owner: "access-help",
        kind: "automated",
        checkId: "verification-tiers-doc",
      },
      { planText: "The equipment profile schema has no health, diagnosis, medication, or clinical field.", owner: "access-main" },
      { planText: "The ten game definitions use the scope-lock names, no Lumosity name, and a no-medical-claims notice.", owner: "access-tools" },
    ],
  },
  {
    day: 2,
    owner: "access-maps",
    tests: [
      { planText: "The schema validator passes every seed file and names each file." },
      { planText: "An independent count matches seed-counts.md for every file." },
      { planText: "The data-status page matches the report for counts, tiers, and the PROTOTYPE notice." },
      { planText: "Five Toronto place samples match the stated source, and unknowns are explicit." },
      { planText: "Every TTC station has a GTFS stop id or an explicit unknown, and no unsourced elevator detail." },
      { planText: "Re-running one seed script does not change the count and logs the dataset version or download date." },
    ],
  },
  {
    day: 3,
    owner: "access-main",
    tests: [
      { planText: "Search for a seeded Toronto place shows the tier badge and links to the right page." },
      { planText: "Five place pages show tier, source, dates, the PROTOTYPE notice, and unknowns labelled Unknown." },
      { planText: "A search with no match names the term, says no seeded place matched, and offers a next step." },
      { planText: "A correction is stored locally, shows as pending, and does not change the displayed record." },
      { planText: "Search and place pages work by keyboard, with visible focus and no trap." },
      { planText: "A skeleton city list shows thin data honestly and makes no depth claim." },
    ],
  },
  {
    day: 4,
    owner: "access-maps",
    tests: [
      { planText: "A journey returns at least one route, the approach leg is separate, and every leg has a step-free badge and a source." },
      { planText: "A thin approach shows Unknown and the explanation names the gap." },
      { planText: "The step-free toggle changes results or explains why it does not, and the state is visible." },
      { planText: "Every time on three routes is labelled scheduled. No live or real-time wording appears." },
      { planText: "Planning works by keyboard, and focus moves when results load." },
      { planText: "The return leg uses the same structure and the same honesty labels." },
    ],
  },
  {
    day: 5,
    owner: "access-maps",
    tests: [
      { planText: "Demo journey 1 renders entrance, washroom, parking, approach, and return with tiers and sources." },
      { planText: "Demo journey 2 renders the same depth and a route that differs appropriately." },
      { planText: "Demo journey 3 renders the same depth and labels any unknown." },
      { planText: "A destination with no seeded washroom shows an honest absence and a visible warning." },
      { planText: "The journey warning is reachable by keyboard and is announced." },
      { planText: "docs/gate-1-log.md has a verdict for every criterion, a written decision, and the human owner as decision maker." },
    ],
  },
  {
    day: 6,
    owner: "access-main",
    tests: [
      { planText: "A manual chair profile loads after reload and the privacy notice is visible." },
      { planText: "A power chair profile changes results or flags, and each flag names the profile setting." },
      { planText: "An adult change table preference flags or filters washrooms with an explanation." },
      { planText: "A plain-text profile export contains only entered fields." },
      { planText: "Deleting the profile asks for confirmation, removes stored data, and shows the empty state." },
      { planText: "The profile flow works by keyboard with visible focus." },
    ],
  },
  {
    day: 7,
    owner: "access-tools",
    tests: [
      { planText: "Washroom results show the required fields, tiers, and unknowns." },
      { planText: "An adult change table preference filters or flags results with explanations." },
      { planText: "The finder opens from a journey, filtered to the destination, and back returns to the journey." },
      { planText: "An empty washroom search names the filters, states the seeded count, and offers to broaden filters." },
      { planText: "The finder notice says availability, openness, and cleanliness are not shown." },
      { planText: "The finder works by keyboard with visible focus." },
    ],
  },
  {
    day: 8,
    owner: "access-tools",
    tests: [
      { planText: "Parking results show the required fields, tiers, and unknowns." },
      { planText: "A van-accessible preference filters or flags results with explanations." },
      { planText: "The finder opens from a journey and from a place page, filtered, and back works." },
      { planText: "An empty parking search names the filters, states the seeded count, and offers to broaden filters." },
      { planText: "The notice says free-now status is not shown and that payment and reservation must be checked." },
      { planText: "The finder works by keyboard with visible focus." },
    ],
  },
  {
    day: 9,
    owner: "access-maps",
    tests: [
      { planText: "A seeded outage shows station, elevator, status, demonstration source, time, and expiry." },
      { planText: "A station with no outage says no outage reported or Unknown, with the source, and invents nothing." },
      { planText: "A demo journey through an affected station shows the outage on that leg." },
      { planText: "Fixture tests map the feed and fall back to the manual seed when the feed is unavailable." },
      { planText: "A past-expiry outage does not show as current." },
      { planText: "Station and journey outage information is readable by keyboard." },
    ],
  },
  {
    day: 10,
    owner: "access-maps",
    tests: [
      { planText: "An alternative avoiding the affected station is offered, or an honest no-alternative statement appears." },
      { planText: "A second affected journey behaves the same way and names the correct outage." },
      { planText: "Changing an outage record updates journey warnings to match." },
      { planText: "When the feed is unavailable, last-known status shows with its time and a may-be-out-of-date statement." },
      { planText: "A power chair profile flags any alternative that violates the profile." },
      { planText: "Original and alternative routes are both reachable by keyboard." },
    ],
  },
  {
    day: 11,
    owner: "access-main",
    tests: [
      { planText: "The Toronto pack download shows progress and completion, and size, dates, and counts match the manifest." },
      { planText: "With the network disabled, saved places, the journey, and help numbers still open, with an offline banner." },
      { planText: "Elevator status downloaded earlier is labelled last-checked, not live." },
      { planText: "A report made offline is queued and labelled with the observation time, not the upload time." },
      { planText: "Deleting the pack removes it and the empty state explains how to download again." },
      { planText: "Download, use, and delete work by keyboard." },
    ],
  },
  {
    day: 12,
    owner: "access-maps",
    tests: [
      { planText: "The map has a text alternative list, and status is not conveyed by colour alone." },
      { planText: "Gate 2 criteria are written with a verdict and the human owner as decision maker." },
      { planText: "Offline and outage behaviour on the polished map match the Day 10 and Day 11 rules." },
      { planText: "Attribution for OpenStreetMap is visible without implying endorsement." },
      { planText: "No live wording appears on a scheduled time." },
      { planText: "Map controls have a non-drag alternative and a visible focus." },
    ],
  },
  {
    day: 13,
    owner: "access-tools",
    tests: [
      { planText: "The games hub lists the ten scope-lock names with a one-line description, timing note, and input note." },
      { planText: "Practice mode shows a banner and no score." },
      { planText: "The hub works by keyboard with visible focus." },
      { planText: "No health claim and no Lumosity name appear." },
      { planText: "Reduced motion stops non-essential movement." },
      { planText: "The no-medical-claims notice is on the hub." },
    ],
  },
  {
    day: 14,
    owner: "access-tools",
    tests: [
      { planText: "Grid Recall plays end to end, untimed." },
      { planText: "Pair Sequence plays end to end by keyboard, with no time penalty." },
      { planText: "Route Planner plays end to end with tap-to-move, undo, and a move budget, untimed." },
      { planText: "Pattern Rules and Word Roots Builder play by keyboard with no typing." },
      { planText: "Reduced motion leaves one game fully playable." },
      { planText: "All five screens show the notice, device-only scores, and no health claim." },
    ],
  },
  {
    day: 15,
    owner: "access-tools",
    tests: [
      { planText: "Number Compare, Focus Flankers, Switch Rules, Shape Assembly, and Order Keeper play end to end by tap." },
      { planText: "Those five games are fully keyboard operable, with no drag and no typing." },
      { planText: "Focus Flankers defaults to untimed, and timed mode is labelled optional." },
      { planText: "Shape Assembly uses tap-to-place and tap rotation, with no drag." },
      { planText: "The daily set across three dates draws from all ten games." },
      { planText: "All ten games play with the network disabled." },
    ],
  },
  {
    day: 16,
    owner: "access-help",
    tests: [
      { planText: "The directory lists programme entries with factual descriptions, SCIO links, and the no-replacement statement.", kind: "automated", checkId: "skeleton-directory" },
      { planText: "Events carry demonstration labels, demonstration accessibility notes, and SCIO registration links, with no in-app registration.", kind: "automated", checkId: "skeleton-events" },
      { planText: "The moderation explainer covers staffing, safety, reporting, accessibility, and agreement, and repeats that it is not running.", kind: "automated", checkId: "skeleton-explainer" },
      { planText: "The Day 16 skeleton has no posting, commenting, messaging, or registration path. The on-device review practice is not part of that skeleton and is not in the primary navigation.", kind: "automated", checkId: "skeleton-no-live-path" },
      { planText: "Skeleton text has no endorsement claim, and the no-endorsement statement is present.", kind: "automated", checkId: "skeleton-no-endorsement" },
      { planText: "Directory, events, and the explainer are reachable by keyboard with visible focus.", kind: "playwright", checkId: "playwright-skeleton" },
    ],
  },
  {
    day: 17,
    owner: "cross",
    tests: [
      { planText: "The audit report covers every screen. Each failure has severity, screen, criterion, and reproduction steps, and the build identifier is stated." },
      { planText: "The keyboard script completes, or remaining failures are documented with a plan." },
      { planText: "Ten controls meet the target-size minimum, need one activation, and show visible focus." },
      { planText: "Ten controls have an accessible name that matches the visible label." },
      { planText: "Three fixed blockers pass again on the fixed build." },
      {
        planText: "An automated accessibility check runs and its output is recorded. axe does not prove WCAG 2.2 AA.",
        owner: "access-help",
        kind: "playwright",
        checkId: "playwright-axe",
      },
    ],
  },
  {
    day: 18,
    owner: "cross",
    tests: [
      { planText: "At least three anonymised sessions are recorded, with the task set and the build identifier. This repository has not run those sessions." },
      { planText: "Each finding has task, behaviour, paraphrase, severity, and a fix, with no identity or health detail." },
      { planText: "The consent checklist includes consent, the right to stop, no travel required, and no health details." },
      { planText: "The fix list is prioritised, with blockers, serious, and minor distinguished." },
      { planText: "The build identifier in the report matches the build that was tested." },
    ],
  },
  {
    day: 19,
    owner: "cross",
    tests: [
      { planText: "Three Day 18 blockers pass on the fixed build or are carried with a gate decision." },
      { planText: "Three Day 17 audit blockers meet the same standard." },
      { planText: "One demo journey completes by keyboard on the fixed build." },
      { planText: "All three demo journeys pass end to end on the fixed build." },
      { planText: "The games hub still works by keyboard and still shows the notices." },
      {
        planText: "docs/gate-3-log.md has a verdict for every criterion, a written decision, and a reason, workaround, and fix day for every carried defect.",
        owner: "access-help",
        kind: "automated",
        checkId: "gate-3-log",
      },
    ],
  },
  {
    day: 20,
    owner: "access-help",
    tests: [
      { planText: "docs/demo-data.md lists hand-entered demonstration records. Place seeds are not in this repository and are not invented here.", kind: "automated", checkId: "demo-data-file" },
      { planText: "Every demo item in this repository renders with its tier and demonstration label.", kind: "playwright", checkId: "playwright-events" },
      { planText: "Every help article states what the App does, what it does not do, and what data it uses, with no overclaim.", kind: "automated", checkId: "help-articles" },
      { planText: "The About screen states prototype status, build identifier, counts, sources, verification, no endorsement, and no medical advice.", kind: "automated", checkId: "about-statements" },
      { planText: "Help index, articles, and back navigation work by keyboard with visible focus.", kind: "playwright", checkId: "playwright-help" },
      { planText: "Help and About text contain no invented brand, endorsement claim, health instruction, or verified-data claim.", kind: "automated", checkId: "help-overclaims" },
    ],
  },
  {
    day: 21,
    owner: "access-help",
    tests: [
      { planText: "Switching to French renders navigation, headings, and buttons in French.", kind: "playwright", checkId: "playwright-french" },
      { planText: "Shell strings have French. Untranslated content would be labelled. Help articles in this repository have French drafts.", kind: "automated", checkId: "shell-french" },
      { planText: "The language choice persists after reload.", kind: "playwright", checkId: "playwright-french" },
      { planText: "Switching back to English restores English shell strings.", kind: "playwright", checkId: "playwright-french" },
      { planText: "Language switching works offline because strings and articles are bundled.", kind: "automated", checkId: "shell-offline" },
      { planText: "The language switch is reachable by keyboard and exposes the current language.", kind: "playwright", checkId: "playwright-french" },
    ],
  },
  {
    day: 22,
    owner: "cross",
    tests: [
      { planText: "Core-flow times on a phone are recorded with the Day 12 method." },
      {
        planText: "Each error state has plain language and a working next action. This repository covers the help centre's unknown address and unknown article.",
        owner: "access-help",
        kind: "playwright",
        checkId: "playwright-release",
      },
      { planText: "Every carried defect is fixed or carried with a demo-script workaround." },
      {
        planText: "Console errors on core flows are absent or recorded with a fix plan. This repository covers the help centre routes in English and French.",
        owner: "access-help",
        kind: "playwright",
        checkId: "playwright-release",
      },
      { planText: "Build identifier, About counts, and the data-status page agree." },
      { planText: "The rehearsal-candidate tag matches the deployed build." },
    ],
  },
  {
    day: 23,
    owner: "cross",
    tests: [
      {
        planText: "The demo script totals 30 minutes, every section has a fallback, and no line overclaims.",
        owner: "access-help",
        kind: "automated",
        checkId: "demo-script",
      },
      { planText: "The demonstration completes within 30 minutes plus or minus two minutes." },
      { planText: "A second run is repeatable, and findings from the first run are addressed or recorded." },
      { planText: "With the live build failed, the fallback still reaches every section." },
      { planText: "The demonstration device, network, and display work, with the build identifier visible." },
      {
        planText: "The rehearsal log gives every finding a severity, a script minute, and a fix or a script change.",
        owner: "access-help",
        kind: "automated",
        checkId: "rehearsal-log",
      },
    ],
  },
  {
    day: 24,
    owner: "cross",
    tests: [
      { planText: "The demonstration completes on the final build within 30 minutes plus or minus two minutes." },
      { planText: "The endorsement sweep covers every screen, article, game, and material, and confirmed overclaims are fixed.", owner: "access-help", kind: "automated", checkId: "help-overclaims" },
      { planText: "Final build identifier, About counts, and the demo-data list agree for this repository.", owner: "access-help", kind: "automated", checkId: "about-statements" },
      { planText: "A fresh offline pack still supports the core help flow.", owner: "access-help", kind: "playwright", checkId: "playwright-release" },
      { planText: "The presenter checklist is signed by the human owner.", owner: "access-help", kind: "automated", checkId: "presenter-checklist" },
      { planText: "The day log states the build lock and the exception process.", owner: "access-help", kind: "automated", checkId: "build-lock" },
    ],
  },
  {
    day: 25,
    owner: "cross",
    tests: [
      { planText: "Before the session, identifier, counts, demo journeys, pack, and fallback check out." },
      { planText: "The demonstration follows the script, stays within the time, and delivers every honesty statement." },
      { planText: "Every question in the log has an answer and a follow-up or an explicit note that there is none." },
      { planText: "The demo-day log records date, roles, build, sections, questions, follow-ups, and the Gate 4 decision." },
      { planText: "The thank-you note states what was shown and promised, with no endorsement and no unmade commitment." },
      { planText: "The build was unchanged during the session, or any change followed the fallback process and is recorded." },
    ],
  },
];

export const ACCEPTANCE_CHECKS: AcceptanceCheck[] = DAYS.flatMap((day) =>
  day.tests.map((test, index) => ({
    day: day.day,
    id: `D${String(day.day).padStart(2, "0")}-${index + 1}`,
    planText: test.planText,
    owner: test.owner ?? day.owner,
    kind: test.kind ?? (test.checkId ? "automated" : "manual"),
    ...(test.checkId ? { checkId: test.checkId } : {}),
  })),
);

export const GAME_NAMES = [
  "Grid Recall",
  "Pair Sequence",
  "Route Planner",
  "Pattern Rules",
  "Word Roots Builder",
  "Number Compare",
  "Focus Flankers",
  "Switch Rules",
  "Shape Assembly",
  "Order Keeper",
] as const;
