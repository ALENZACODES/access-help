# @access/outings

Curated outing lists for the App, built from open data and our own words.
Static, no backend. A list names place ids; every access claim shown comes from a
sourced field on the place record (`{ value | "UNKNOWN", source_id, licence,
retrieved_at, tier }`). Lists never invent facts.

## What ships

- `src/schema.ts`: JSON Schema (draft 2020-12) for a list, checked with Ajv.
- `src/lists/`: two seed lists over **synthetic** fixture places (`src/fixtures.ts`, ids start `synth-`),
  plus `pack-pinned.ts`, empty and documented as "filled when real pack ids are pinned".
- `src/components/OutingsApp.tsx`: list index and detail, EN/FR strings in `src/strings.ts`.
  Missing, `UNKNOWN` and tier-0 values render as Unknown / Inconnu, never "no". Each place links
  by id (`placeHref`, default `/places/:id`) so the shell can route it later.
- `validateLists` / `validatePlaces`: a list cannot name a place that is not in the place set, and
  a list with a `factKey` can only include places where that fact is a known yes at tier 1 or higher.
  This lane never assigns tier 2 or 3.

## Planning an outing to an event

- `src/components/EventOutingPlanner.tsx`: a personal pre-departure checklist for one event, EN/FR
  strings in `src/event-plan/strings.ts`. The checklist starts with one "Ask the organiser about" line
  for each item the event record leaves Unknown. People can tick lines, add their own, and delete a
  plan or all plans.
- Input is an `EventOutingSource` (`src/event-plan/types.ts`): event id, label, date, and the list of
  Unknown items. It carries no values and no access claim. `@access/event-access` writes this shape
  (`toOutingSource`) and can save it as a questions file; this package reads it with `parseEventSource`
  and does not import that package. A shell can also pass sources straight in through the `sources` prop.
- Plans are kept in this browser's local storage under `access.outings.event-plans.v1` and nowhere else.
  Saved content that is not a valid plan is left out and the screen says so.
- A plan is tied to the event date: a past event's plan is shown as past, and a plan with no date as undated.
- The built-in events (`src/event-plan/samples.ts`) are sample data, labelled as demonstrations.
- The planner plans no trip and never says a route or entrance will work.
- Harness: `/?view=event-plan`.

## Adding a list from real pack ids (after I2/I4 land)

1. Pick the pinned pack release and copy the real record ids you want. Do not type ids from memory.
2. Add `src/lists/<slug>.ts` with an `OutingList`: bilingual title and summary written by us,
   `placeIds`, `sources` (name and licence from the source registry), `retrieved_at` (the pack's
   date) and `licence`. Set `factKey` when the list is defined by one fact.
3. Summaries describe the list ("places with a sourced step-free entrance fact"). They must not state
   access that is not on the named records.
4. Replace the fixture place set with the pack records for those ids (a small extracted JSON, not the full
   pack) and run `validateLists` against it. Keep ODbL-derived places in their own silo and show
   "\u00a9 OpenStreetMap contributors, ODbL" on any screen that uses them.
5. Register the list in `src/lists/index.ts`. Run `npm test`, `npm run typecheck` and `npm run test:e2e`.

## Rules

- Competitor itineraries, text, photos and branding are never copied. Write our own summaries.
- No scores, ratings, stars or review counts. No medical or eligibility advice.
- Unverified drafts stay at tier 0 and render as Unknown.
- Anything that needs a server, bookings or payments is out of scope (later, needs backend).

Dependencies (react, react-dom, ajv, vitest, Playwright, axe-core) come from the workspace root;
this package adds none.
