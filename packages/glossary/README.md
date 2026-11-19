# @access/glossary

Plain-language accessibility terms in English and French, used by help pages.

- `lookupTerm(id, lang)`: one term. A missing or unrecognised id returns the
  Unknown entry (`known: false`). We never guess.
- `listTerms(lang)`: all terms, sorted for display.
- `searchTerms(query, lang)`: accent- and apostrophe-insensitive search.
- `termCountLabel(count, lang)`: `1 term` / `N terms` and `1 terme` / `N termes`.
- `TERMS`, `UNKNOWN_TERM`, `GLOSSARY_META`: the data and its source, licence and date.

Plain-language lookup lives in `src/glossary.ts` and `src/plainTerms.ts`, and is re-exported from `src/index.ts` alongside the existing catalog (`src/terms.ts`). Descriptions say what a feature is;
they describe what a place marks, not who qualifies or how to get a permit. French strings use ’ and
non-breaking spaces before `:`, `;`, `!` and `?`; the tests check this.


## Modules

- `glossary`, `plainTerms`: the data and `lookupTerm` / `listTerms` / `searchTerms`.
- `status`: `FeatureClaim` with `present` / `absent` / `unknown`. A claim without a
  valid source, open licence and date counts as unknown. Two valid sources that
  disagree give unknown with `conflict`. Missing terms are unknown, never inferred.
- `provenance`: source / licence / date checks (open SPDX licences only, real dates).
- `offlineIndex`: serialisable search index with a checksum; `loadOrBuildIndex`
  reads a valid, current cached copy (for example `localStorage`) or rebuilds it.
- `render`: `renderShell`, `renderResults`, `GLOSSARY_CSS` and `mountGlossary(root, { lang, claims?, store? })`
  (search box, polite live count, 44px input, language switch).
- `annotate`: links glossary terms inside help text (`annotateToHtml`).
- `locale`: `pickLang` from Accept-Language / `navigator.languages`.
- `frTypography`, `copyRules`, `plainLanguage`: `fixFrench` / `frenchIssues`,
  `lintCopy` (no verified / real-time / partnership / conformance / AI / medical /
  eligibility wording) and sentence-length checks. `rules.test.ts` runs all three
  over everything the package ships.

- `places`, `placeRender`: match a place against the features a person chose
  (`matchPlace`, `rankPlaces`), one-sentence verdicts that never call a place
  "accessible" overall, and age notes on sources (`claimFreshness`). Unknown is never counted as met.
- `csvImport`: `importClaims` turns an open-data CSV into places; it refuses files
  without a valid source, open licence and date, and unmapped cells stay unknown.
- `offlineCache`: cache manifest, cache-update plan, request strategy (same-origin
  only, so tile servers are never cached) and the offline banner text. `mountGlossary`
  takes `isOnline` and `refreshConnection()`.
- `exportGlossary`: text, Markdown or JSON copy for printing or saving.
- `theme`: `fullGlossaryCss()` = base + place + preference styles (contrast, forced colours, reduced motion, print).
- `auditCss`, `auditHtml`, `auditTerms`, `audit`: the CI gate. `audit.test.ts` runs
  `runAudit()` over the shipped terms, styles, markup and UI strings and fails on any
  error. `auditExitCode(report, console.log)` is ready for a CI script.
  The glossary licence is reported as a warning until it is set to an SPDX id.

- `filters`, `placeSearch`, `dataset`, `compare`, `finderRender`, `finderMount`: the **place finder**.
  `mountPlaceFinder(root, { lang, dataset, today, store, hash, isOnline })` renders feature
  checkboxes (each with its plain-language description), name search, "hide places with a
  feature reported as not available", clear, a live result count and a two-place comparison
  table. Choices are saved only on the device (store) and, if a `hash` host is given, in the
  URL so a view can be shared. Focus stays where the person left it after each change.
  `datasetFromCsv` / `buildDataset` refuse data without a source, open licence and date;
  `saveDataset` / `loadDataset` keep a checked copy for offline use. Places with no sourced
  claim for a chosen feature are shown as unknown, never as met.
  Example: `mountPlaceFinder(el, { lang: pickLang(navigator.languages), dataset: loadDataset(localStorage), today, store: localStorage, hash: { get: () => location.hash, set: (h) => history.replaceState(null, '', h || location.pathname) } })`.
- `coverage`: `renderCoverage` adds a collapsed table to the finder showing, per feature, how many
  places are reported available, not available, or unknown, so gaps in the data are visible.
- `auditMarkup` adds French-typography and wording checks to the markup audit; the audit also
  covers fieldsets, tables and ARIA state values.

Inline term links (`.gl-term`) rely on the WCAG 2.2 inline-link exception to the
target-size rule; every standalone control is at least 44px.

Run: `vitest run packages/glossary`.

## Sorting, saved places, suggestions, export and display settings

The place finder (`mountPlaceFinder`) now also offers:

- **Sort** by best match, name or newest information, and a "last year only" filter. Places with no dated, sourced claim sort last and never count as recent.
- **Saved places** kept on this device (up to 200), a "saved only" filter, and paging with "Show more" (25 at a time).
- **Feature suggestions** from everyday words (EN/FR). A suggestion only offers to add a feature to the filters; it never changes what is reported about a place.
- **Copy as text** for saved places and the two-place comparison. Pass `onExport` to turn it on; the host decides whether to copy or download the file. Unknown stays Unknown.
- **Display settings** (text size, wider text spacing, higher contrast, reduce motion), saved on this device. Pass `applyStyles` to turn them on and put the CSS it receives in a `<style>` element.

`runAudit()` covers the new controls, strings and generated CSS, and `audit.test.ts` fails on any error.

## Questions, notes, one-place export, data changes and data notes

Added to the place finder:

- **Questions to ask this place.** For each chosen feature (all features when none is chosen) that has no information, disagreeing sources, or an old answer, the card lists a plain question about the building. Features with a recent, sourced answer get no question.
- **Your notes.** A text box under each place, kept on this device (500 characters, 200 notes). A note is never a source and never changes what is reported.
- **Copy one place as text** (with `onExport`): features and status, sources, the questions, your note, and where the data came from.
- **What changed.** When `setPlaces` loads a new copy of the data, a status message says how many places were added or removed and how many features changed (a lost source counts as a change to Unknown).
- **Data notes.** A collapsed table of places whose sources disagree, have no valid source or open licence, or are more than two years old. It describes the data and never says a place is or is not accessible.

`runAudit()` renders all of this in both languages and checks the markup, CSS and wording.

## Visit plan

Under the results, saved places get a **visit plan**: the questions to ask each place, with a tick box for each. A tick is your own record that you asked; it stays on this device and never changes what is reported about the place. The plan follows the features you chose, updates when you save or unsave a place, and can be copied as text (`onExport`).

## Round H: wording, claims, links and help copy

- `claimRules`: `lintClaims` finds what we never say about a place (accessible overall, barrier-free,
  "probably accessible", safe, suitable, official, up to date, meets a code). Describing a feature stays fine.
- `deepScan`: `scanText` / `scanMarkup` look for banned wording as written, with entities decoded and
  hidden characters removed, and with spelled-out letters joined; they also flag hidden characters.
  Markup is checked in text, attributes (`aria-label`, `title`, `alt`) and comments.
- `links`: `auditLinks` fails empty, unsafe, `http`, other-site, broken-anchor, unknown-term and vague links.
- `helpCopy`, `helpRender`, `helpView`: 14 help topics in EN and FR, with `[[term|words]]` references.
  The finder shell has a collapsed help section, `renderHelpPage` / `mountHelp` give a searchable page, and
  the live `/glossary` route in `apps/centre` shows the topics. A term is a link only while its definition is on screen.
- `inventory`, `parity`: walk every `*_UI` table, term, question and help string, and check EN/FR parity
  (missing, untranslated, English in French, numbers and links that differ). A test fails when a new `*_UI` table is not registered.
- French pages show the French glossary source and licence (`glossaryProvenanceFor`).

## Round I: messages, reading level, ranked help, see also, copy report

- `outingMessage`: `composeMessage` turns a visit-plan entry into an email or a phone script that asks only the
  questions not yet ticked. It says nothing about the place and sends nothing. The finder shows a copy button
  (`gl-msg-N`) when export is on, and the host copies or downloads the text.
- `readability`: syllables, Flesch-Kincaid (EN) and Kandel-Moles (FR) estimates, plainer-word swaps and
  runs of long words. These point at copy to reread; they do not prove a text is easy. `runAudit` fails on them.
- `helpIndex`, `helpView`: ranked help search (title above text, exact above prefix) with marked matches that
  the `/glossary` route draws as `<mark>`. A linked feature is searched by the name the reader sees in that language.
- `related`, `termLinks`: "See also" between features that people look at together. A link appears only while
  the definition is on the page.
- `copyReport`: `buildCopyReport` runs every copy check over the whole inventory (banned wording, claims, hidden
  text, French spacing, sentence length, reading level, EN/FR parity) and gives text, JSON and an exit code.

## Round J: quick choices, recent searches, summary, A to Z index, printable plan

- `featureGroups`: four shortcuts (arriving, getting in, moving inside, washroom stop) that choose several
  features at once. Pressing a group again unchooses only its features. A group only ranks the list.
- `recentSearches`: the last five place searches, kept on this device, remembered when the search box is left,
  searchable again with one press, and cleared with one button. "Clear choices" does not touch them.
- `filterSummary`: the finder's choices said in one passage for screen readers; it describes choices only.
- `termIndex`: an A to Z index for `/glossary`. Only letters with terms are linked; ligatures (Œ, Æ) and accents sort under their base letter.
- `printPlan`: the visit plan as a complete printable page (black on white, points, no scripts), copied
  through the same host hook as the text plan.
- The audit no longer counts `<style>` and `<script>` code as text a person reads.
- `planCsv`: the plan as a spreadsheet file. Cells that start like a formula get a leading apostrophe, quotes are
  doubled, and a byte-order mark keeps accents right. `parseCsv` reads it back.
- `listAges`: counts places by the age of their newest source ("Of 12 places: 5 with information from the last year ...").
  It says how recent sources are, never that a place is accessible.
- `nameSuggestions`: place names that start like what was typed, as buttons under the search box (names only, at most five).

## Round K: announcements, undo, shortcuts, visited, tour

- `announce`: short messages for one polite live region ("Saved Café Nord."). A repeat changes by a no-break space so a screen reader speaks it again.
- `undo`: one step of undo for clearing choices, clearing recent searches and removing a saved place. Only the last action can be undone.
- `shortcuts`: single-key shortcuts (`/`, `s`, `r`) that are off until a person turns them on, never act while typing, and never act with Ctrl, Alt or Meta.
- `visited`: the person's own "I have been here" marks with the date, kept on this device. It says nothing about the place.
- `tour`: a five-step tour that starts only when asked, can be left at any step, and moves focus to each step's heading.
- `backup`: a "Your data" panel. Export everything kept on this device as a JSON file, load a copy by pasting it (checked strictly, all or nothing, each part read by the finder's own readers), or forget everything after a second confirmation.
- `finderMount` also listens for `keydown`; every new control has an `aria-label` or a visible name.

## Round L: empty results, lists, read aloud, reports, highlights

- `relaxSuggestions`: when nothing matches, buttons say which single choice to drop (a feature, the name search, "hide not available", only saved, only recent) and how many places would come back. A button changes only that choice.
- `savedLists`: up to 8 named lists of places, kept on this device and included in the backup file and in "forget everything". Deleting a list can be undone. A list says nothing about a place.
- `readAloud`: a place as short sentences (name, each chosen feature with status and source, how many are unknown). The host supplies `onSpeak`; the package makes no sound itself.
- `correction`: a fold-away form under each place that turns the person's own words plus what the app shows into a plain-text report to copy. It sends nothing and changes nothing the app shows.
- `highlightName`: the typed words are marked in place names, with weight and underline as well as colour.

## Round M: order, list summary, saved searches, visit log, notes search, list print

- `visitOrder.ts`: move a saved place earlier or later in the visit plan. The order is saved and announced. Buttons that go nowhere are not shown.
- `listSummary.ts`: for the chosen features, counts what the sources report for each list, with Unknown kept as Unknown. A list can be sent as a text file.
- `savedSearches.ts`: up to 8 named searches kept on this device. They are part of the backup, can be undone and are cleared by "forget".
- `visitLog.ts`: the places marked as visited, newest first, with a text file.
- `notesSearch.ts`: search the person's own notes. Typing redraws only the results, so focus is not lost. Show puts the place name in the name search.
- `listPrint.ts`: a printable page for one list. It has no script, image or link, and states each feature as reported or Unknown.

## Round N: tags, check-again dates, word practice

- `placeTags.ts`: up to five tags of your own on each place (20 characters each, no duplicates by case or accent). A panel lists the tags in use and shows the places with the chosen tag. Tags never change what is reported.
- `reminders.ts`: a date to look at a place again. A panel lists the dates earliest first and counts what is due now. The dates can be saved as an all-day calendar file (`.ics`) that says only what the person chose.
- `termPractice.ts`: a short self-check on the plain words, with Unknown kept as Unknown. Words marked "practise again" come first in the next round. Marks stay on this device.
- Tags and dates are part of the backup and are cleared by "forget". Word marks are cleared by "forget" and are not in the backup.

## Round O: must-haves, week plan, quiz

- `mustHaves.ts`: the features a person cannot do without. The panel lists every place best match first, and each place card shows a count. The count only reports what the sources say: unknown never counts as available, and no place is called accessible overall.
- `dayPlan.ts`: a day of the week for each saved place, a week view with today marked, and a text copy that gives the date of the next such day.
- `termQuiz.ts`: a nine-question quiz on the plain words. The questions and their order are fixed, so a score can be compared with an earlier one. The best score is kept on this device.
- Removing a tag and clearing a date or a day can be undone (one step, like the other undo actions).
- Must-haves and days are part of the backup and are cleared by "forget". The best quiz score is cleared by "forget" and is not in the backup.

## Round P: source, licence, date and tier for each record

- `sourceTier.ts`: an optional tier label on each record's source. Only Tier 0 and Tier 1 can be shown; a missing, unknown or higher tier is shown as "Tier unknown". A tier is a label, never a promise about the place, and nothing is moved up a tier.
- `recordSources.ts`: a closed "Sources for…" table under each place card, one row for each record with its source, licence, date and tier. Records that cannot be used are listed as Unknown.
- `licenceInfo.ts`: a short plain summary of what each accepted open licence asks (credit, same licence, keep the notice). It is a reading aid, not legal advice.
- `sourcesPanel.ts`: "Where this information comes from": each source with its record count, licence, dates and tiers, built offline from the records. The credits can be saved as text.
- `recordsCsv.ts`: every record saved as a table with one row for each record, and read back with nothing lost. Cells are guarded against spreadsheet formulas. Loading needs the host option `onRecords`; the host keeps the places.

## Round Q: the finder in the page, and records to look at

- The place finder is now on the glossary page, under "Places" (`#places`). `PlacesView.tsx` mounts it; `browserHost.ts` holds the testable pieces (a store that never throws, today's date, the view in the address, saving a file, reading aloud). There is no shipped place data: the person loads a table of records, and it is kept on the device with a source, licence, date and tier on each row.
- `e2e/places.spec.ts` runs axe on the places view (empty, with records, and after use) in both languages at 320 and 1280 pixels, and checks loading, reloading and saving the credits.
- `auditHtml` has a new rule, `label-content-mismatch`: the text shown on a button, link or summary must be inside its `aria-label`. Putting the finder in a real page showed thirteen labels that broke this; they are reworded.
- `recordProblems.ts`: "Records to look at" lists each record with a problem in its source, licence, date or tier, says which cannot be used, and can be saved as text. It is about the data, never the places.

## Banned organisation names

`forbiddenOrg.test.ts` scans every shipped copy string and glossary term with the repo's shared guard (`qa/src/guards/forbidden-terms.ts`). This package holds no names, joins or character-code lists of its own.
