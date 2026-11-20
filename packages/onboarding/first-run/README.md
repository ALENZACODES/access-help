# First-run shell (lane P7C)

Builds on `../src/paths.ts` (help-centre onboarding paths, P7) and
`../switch-first` (switch/keyboard-first first-run flow, P7B). Both are
imported, not copied.

## What it is

`src/shell.ts` mounts the whole onboarding experience into one element:

- **Setup**: the switch/keyboard-first flow. Choices are saved on this
  device only (`src/store.ts`). A choice that was never made stays unknown.
- **Help**: the short help paths from P7, step by step, plus a guide to
  reading a place card (`src/facts.ts`, `src/views.ts`).
- **EN/FR** with a language toggle, `lang` set on the page and on the
  toggle, language negotiated from the browser and then remembered.
- **Accessibility plumbing**: skip link, heading focus on view change,
  focus kept on the control just used, a polite status region
  (`src/announce.ts`), native buttons at least 44px, a 3px focus ring,
  forced-colours and reduced-motion support (`src/styles.ts`). Palette
  contrast is calculated in `src/contrast.ts` and tested for both themes.
- **Unknown stays unknown** (`src/facts.ts`): yes/no details are only
  accepted with a source, an open licence and a date; otherwise they become
  "Unknown". Ages are shown as "recorded N months ago" and old details say
  "May be out of date". Nothing claims real-time data or verification.
- **Offline** (`src/sw-logic.ts`, `src/sw.ts`, `src/register.ts`): the shell
  is cached same-origin only, so no third-party hosts or tile servers are
  ever cached. If the network fails on a page navigation the cached page is
  served. Old caches are pruned on activate. The footer says what is true:
  the browser accepted offline setup, "some pages may still need a
  connection".

## Wiring

- `src/index.ts` exports every module. `src/main.ts` + `index.html` are the
  browser entry: they mount the shell and register `sw.js`.
- `src/guard.ts` is run by `src/guard.test.ts` over every `.ts` and `.html`
  file under `packages/onboarding` (all three lanes). It fails on literal
  special spaces, zoom-blocking viewports, positive `tabindex`, third-party
  tile hosts, scheduler keywords, secret-like literals and overclaim, AI or
  forbidden-name wording in user copy.
- `npm run ci` = typecheck + all tests, including the guard.

## Added in P7D

- **Notes** (`src/form.ts`, `src/outbox.ts`, `src/model.ts`): a real
  add-a-note form for what someone saw at a place. Every detail starts as
  Unknown, no licence is pre-selected, at least one detail must be answered,
  and a yes or no is stored with source, open licence and date ("Contributor
  report"). Email addresses and phone numbers are refused. Notes are kept on
  this device only (limit 200) and are re-validated every time they are read.
  An unfinished form is autosaved as a draft so nothing is typed twice.
- **Filter and search** (`src/filter.ts`): asking for "step-free entrance:
  Yes" puts notes into Matches, Unknown for this filter, or Does not match.
  A detail with no record is never counted as a match and never ruled out.
- **Export and import** (`src/exchange.ts`): notes move between devices as
  plain JSON (a download link and a paste box, so it works offline). Imports
  are validated note by note; existing notes win over imported duplicates.
- **Display settings** (`src/display.ts`, `src/views-display.ts`): text size
  up to 200%, wide text spacing (WCAG 1.4.12 values), more contrast
  (a third palette, calculated at 7:1 or better for body text), and reduced
  motion. Saved on this device only.
- **Audits that fail** (`src/audit.ts`): `auditDom` checks every rendered view
  (names, label in name, 44px targets, duplicate ids, heading order,
  landmarks, skip link, language switch, radio groups, error descriptions,
  French typography, banned wording, and that every Yes/No shows source,
  licence and date while Unknown shows none). `auditCss` checks the
  stylesheet and `auditCopy` checks all EN/FR strings from all three lanes.
  The tests render every view in English and French and expect no
  violations, and each rule has a fixture that must trigger it. The shell
  calls `auditDom` after every render when given `onAudit`; the page enables
  it with `?audit`.
- **Wording**: `src/wording.ts` is the single list of words user copy must not
  use (it claims more than the App can back up). The guard, the DOM audit and
  the copy audit all use it. User-entered text is shown as text and is not
  audited for wording.

The first audit run found two real defects, now fixed: the notes text boxes
had no 44px minimum, and the P7B setup `nav` had no label when the page also
has the main `nav`.

## Places, visit plan, saved must-haves and routes (P7E)

- **Places** (`places.ts`, `views-places.ts`): notes about the same place
  (same name and address, ignoring case, accents and punctuation) are
  combined. For each detail the reports either agree, differ, or there are
  none (Unknown). When reports differ the screen says "Reports differ" and
  lists every report with its source, licence and date. It never picks the
  newest one as the answer.
- **Filtering places**: a place matches only when every report agrees with
  what was asked. No reports or differing reports stay in "Unknown for this
  filter". A recorded opposite answer puts a place in "Does not match".
- **Visit plan** (`plan.ts`): for a place and a set of must-haves, shows
  each item as Matches, Does not match, Unknown or Reports differ, plus
  questions to ask the place for Unknown and differing items, and plain text
  to copy. It gives no medical or eligibility advice.
- **Saved must-haves** (`needs.ts`): stored on this device only. They are
  place details, not facts about a person.
- **Routes** (`router.ts`): opt-in `#/` addresses (`hashRouting: true`,
  switched on in `main.ts`). Only hashes starting with `#/` are routes, so
  the skip link and field links are left alone. Unknown routes are ignored.
- **Audits**: `fact-provenance` now covers differing reports; new
  `plan-status` rule for plan items. Seeded random-data tests
  (`fuzz.test.ts`) check that unknown is never counted as a match.
- `BANNED_WORDING` now also rejects the verify family in English and French.

## Shortlist, compare, "what I asked", backup (P7F)

- **Order** (`sort.ts`): places can be ordered by name, newest note or number
  of reports. It is only an order; the screen says it does not rank
  accessibility.
- **Shortlist** (`shortlist.ts`): up to 20 place ids kept on this device,
  with a "show shortlist only" filter. Places with no notes left are dropped.
- **Compare** (`compare.ts`, `views-compare.ts`, route `#/compare/a,b[,c]`):
  two or three places side by side. Every cell uses the same rules as the
  places view (agree, reports differ, Unknown) and carries source, licence and
  date. Nothing is scored or ranked; the audit fails if the table says so.
- **What I asked** (`checklist.ts`): in a visit plan each question has an
  "I asked this" tick and a field for what the place said. These are the
  person's own notes (no email addresses or phone numbers, 300 characters) and
  never turn a detail from Unknown into Yes or No. Notes go into the text to
  copy, marked as the person's own. "Add a report for this place" opens the
  note form with the place filled in (`report.ts`) and returns to the plan.
- **Old answers** (`plan.ts`): a recorded answer whose newest report is 12
  months old or more gets a "still the case?" question. It is not treated as
  wrong.
- **Copy plan**: uses the clipboard when there is one, otherwise selects the
  text.
- **Backup of my lists** (`backup.ts`): must-haves, shortlist and notes as
  text, separate from the notes export. Restoring keeps what is already on the
  device and only adds what is missing.
- **Audits**: new `compare-table` rule; the source rule now also covers
  comparison cells.
- Compare tables scroll sideways on narrow screens (a labelled, focusable
  region). That has not been tested at 320px in a real browser.

## Where details come from, what the notes say, text files (P7L)

- **Where details come from** (`sources.ts`, `views-sources.ts`, route
  `#/places/sources`): adds up the Yes and No details in the notes for each
  source: how many, the open licences, the oldest and newest date, and how many
  are a year old or more. It records where details were saved from. It does not
  say a source is right. Details with no record stay Unknown and have no
  source; the page shows how many there are. A place's own page lists the
  sources behind it.
- **What your notes say** (`summary.ts`, `views-summary.ts`, route
  `#/places/summary`): for each detail, how many places are Yes, No, "reports
  differ" or Unknown. Each row adds up to the number of places. It also lists
  places whose newest record is a year old or more. When the notes have two or
  more sources, the counts can be limited to one source; details from other
  sources then count as Unknown on that page. Nothing is scored or ranked.
- **Text files** (`textexport.ts`): a place, a comparison, a shortlist, the
  sources page and the summary can be downloaded as plain text. The file is made
  on the device from the same data as the screen and nothing is sent anywhere.
  Every Yes or No keeps its source, licence and date.
- **Audit**: new `data-table` rule. Count tables need a focusable, labelled
  scroll region, whole numbers that add up (Yes + No = details; the four counts
  = places) and no ranking or vouching words.
- `#/places/sources` and `#/places/summary` are checked before place ids. A
  place id always ends in a hash of eight hex digits, so no place can take
  those names (tested).
- Not checked: the new tables at 320px, with a real screen reader, or the
  downloads in a real browser (jsdom only).

## Help articles, search and keyboard/switch/voice routes (P7G)

- `articles.ts`: eight plain-language help articles in EN/FR (keyboard,
  switch, voice, Unknown, adding a note, a visit plan, display settings, data
  on this device), each with sections and links to related articles and short
  paths. Source, licence (CC0-1.0) and date are in `ARTICLES_META`.
- `keys.ts`: the key table shown in the keyboard article. `keys.test.ts` drives
  every listed key against the real page.
- `search.ts`: on-device help search in the language on screen. Words are
  matched without case or accents, every word must be found, and articles
  rank before short paths on equal scores. Nothing is sent anywhere.
- `plain.ts`: sentence-length limits for article and path copy.
- `views-help.ts`: help home (search, results, suggested article for a saved
  way of moving) and the article page (contents links that move focus, key
  table, related buttons).
- Addresses: `#/help/articles/<id>`; unknown ids open nothing.
- The App does not run a scanner and does not listen. `findScannerClaim`
  (wording), the `scanner-claim` audit rule and a source-guard rule fail any
  copy that says otherwise. Voice and switch routes only explain how to use
  the device's own software.
- New audit rules: `scanner-claim`, `plain-language`, `duplicate-control-name`,
  `table-structure`, `broken-anchor`. The guard also rejects `accesskey`.
- Not tested: real browsers, screen readers, voice-control or switch hardware,
  contrast and 320px reflow (jsdom only).

## Find help, reading mode, recents, text save, keyboard practice (round H)

- **Find the right help** (`chooser.ts`, route `#/help/find[/<question>]`): a
  short tree of plain questions that ends at an article, a short guide or the
  keyboard practice page. Every question has a Back button; the tree is
  validated (`validateTree`) so no choice points at something that is missing.
- **One section at a time** (`read-mode` and `read-step` actions): an article
  can be read whole or step by step. The choice is saved with the two saved
  help choices below.
- **Recent articles and reading choice** (`helpstate.ts`, key
  `app.onboarding.help.v1`): up to five recently opened articles and the
  reading choice, kept on this device only. Clearing is one button. Unknown
  ids in stored data are dropped.
- **Save an article as text** (`helptext.ts`): a plain `.txt` download built in
  the page from the article text. Nothing is sent.
- **Keyboard practice** (`practice.ts`, route `#/help/practice`): four buttons
  that do nothing and a short log that says in words what key was pressed. It
  is not saved. The App only sees keys and presses, and the page says it cannot
  tell which device sent them.
- New audit rule: `vague-link-text` (links and buttons called "click here",
  "more" and the like, EN and FR).
- Checked in jsdom only (vitest, axe-core 4.10): route round trips, focus
  after each action, EN and FR text and typography, axe with contrast and
  target-size rules off. Not tested: real browsers, screen readers, switch or
  voice hardware, contrast, 320px reflow.

## Names on a screen, words, one-file help (round I)

- **Names on this screen** (`names.ts`, `views-names.ts`, route
  `#/help/names[/setup|help|display]`, Notes is the plain address): lists the
  name of every button, link and field on a screen, with the menu at the top,
  and marks names that are repeated, that drop the words written on the
  control, or that are long. It can be saved as text. The App does not listen;
  voice control belongs to the device.
- **A fix it found:** the Notes filter had four sets of identical Any, Yes and
  No buttons and Display had two "Automatic" buttons. Their accessible names
  now start with the visible words and add the setting. A test checks that no
  screen has a repeated name, a name without its visible words or a long name,
  in both languages.
- **What words mean** (`glossary.ts`, `views-words.ts`, route
  `#/help/words[/<word>]`): 20 plain meanings, alphabetical in each language,
  with a jump list, focus on a word asked for by address or search result, and
  a text download. Words that belong to the device (switch, scanning, voice
  control, screen reader) say so. Each word is also a search result.
- **All help in one file** (`helpbundle.ts`): a link on the help list that
  saves every article and the word list as one plain text file, made on the
  device.
- `accessibleName` now also works on a tree that is not attached to the page.
- Checked in jsdom only (vitest, axe-core 4.10). Not tested: real browsers,
  screen readers, switch or voice hardware, contrast, 320px reflow.

## What is saved on this device, and next steps (round K)

- **What is saved on this device** (`inventory.ts`, `views-device.ts`, route
  `#/help/device`): lists each item the App keeps in this browser (notes,
  shortlist, must-haves, plan notes, an unfinished note, display settings,
  language and way of moving) with a count where it is a list, the size, and a
  Clear button for each. Clearing asks first, in place, and says it cannot be
  undone. Something that is saved but cannot be read is shown as unreadable,
  never guessed at, and can still be cleared. Clearing notes also empties the
  shortlist and plan notes, because the App drops those when their places are
  gone, and the page says so. Clearing language and way of moving removes the
  saved copy; the open screen keeps its choices until the App is closed.
- **Next steps** (`steps.ts`, `views-steps.ts`, route `#/help/next-steps`):
  six things to try, each a button, with whether anything is saved for it:
  saved, not yet, or Unknown when the App cannot read what is saved. It says
  what is saved, not that a step was done well, and nothing is required.
- Both pages are in the help list and in help search, and have addresses.
- Checked in jsdom only (vitest, axe-core). Not tested: real browsers, screen
  readers, switch or voice hardware, contrast, 320px reflow.

## Survey walk: several places, one question at a time (round AA)

- **What it is** (`survey.ts`, `views-survey.ts`, `survey-copy.ts`, route
  `#/notes/survey`, opened from the add-a-note form): list the places you
  will visit in a row (up to 12), choose the visit date and an open licence
  once, then answer one question per screen with three large buttons: Yes,
  No, or "Not sure", which leaves the detail UNKNOWN. There is a way back to
  the last question, a way to skip the rest of a place (the rest stays
  UNKNOWN), and a review where any answer can be changed before saving.
- **Places from the notes**: a place already in the notes can be added with
  only its open questions: details with no record, or whose reports differ.
  Agreed details are not asked again.
- **Same rules as the form**: each place becomes one note through `toNote`,
  so the place name, the email/phone refusal, the open licence and the date
  rules are shared. Every Yes or No carries "Contributor report", the
  licence and the date. A place with no Yes or No is not saved and the
  message says so. Saving stops before going over the notes limit.
- **Kept on this device** (`app.onboarding.survey.v1`), so a walk can be
  finished later. It is read back defensively (bad places dropped, a bad
  position goes back to planning) and appears on the "kept on this device"
  page, where it can be cleared.
- **Focus**: within a place, focus stays on the answers and the next
  question is announced; a new place or the review moves focus to the
  heading; moving a place keeps focus on it.
- **Tests**: model (`survey.test.ts`), seeded random walks that check no
  answer is ever made up and the saved walk reads back unchanged
  (`survey-fuzz.test.ts`), screens with axe and the App's audit in English
  and French (`views-survey.test.ts`), the full walk in the shell
  (`shell-survey.test.ts`), and a keyboard-only walk in a real browser that
  also measures the 44px targets (`qa/tests/first-run-survey.spec.ts`).

## Reading a place's page, asking in writing, questions sent (rounds AB and AC)

- **Reading a place's own accessibility page** (`statement*.ts`,
  `views-statement.ts`, route `#/notes/read-page`, from the add-a-note form
  and from each place): the person pastes the text; the App lists, for each
  detail, the sentences that name it, with the matched words marked and a cue
  (words that usually mean it has one, that it does not, about something that
  comes and goes, or no clear cue). English and French, offline. Every detail
  stays UNKNOWN until the person chooses; the note says it was read from the
  place's page. If the place is already in the notes, each detail shows what
  the notes record and flags page words that point the other way. The pasted
  text is never kept. It also mounts on its own:
  `mountStatementReader(element, { locale, store })` from `@access/onboarding`.
- **Asking a place in writing** (`askplace.ts`, `views-ask.ts`, route
  `#/places/<id>/ask`, from each place): a short, polite message about the
  chosen details (by default those UNKNOWN or with reports that differ), in
  English or French whatever the App's language. It asks only about the
  place, never about the person, and says not knowing is a fine answer. "Open
  in your email app" opens the person's own mail program with no recipient;
  the App sends nothing and keeps no address. The message can also be copied
  or downloaded.
- **The reply**: "Read the place's reply" opens the same reader for the
  reply; the note says it was read from the place's written reply.
- **Questions you sent** (`asked.ts`, `views-asked.ts`, route
  `#/notes/asked`, `app.onboarding.asked.v1`): after asking, the person can
  note how (email, phone, in person, another way). The list shows who is still
  waiting and for how long, and lets the person mark "They replied" or "No
  reply", ask again, or remove a place. Saving a note from a place's reply marks
  it replied. It keeps no address or message text, can be downloaded as text,
  and is listed (and can be cleared) on the "kept on this device" page.
- **Tests**: phrasing tables, random pages and random letters, every screen
  with axe and the App's audit in both languages, the shell flows, and
  keyboard-only walks in a real browser (`qa/tests/first-run-ask.spec.ts`).

## Correcting notes, Recently removed, spreadsheet download (round AD)

- **Correct a note** (`noteedit.ts`, "Correct this note" on each note): only
  the person's own notes can be corrected, that is notes whose every Yes or No
  says "Contributor report" with one date and one licence. A note from
  another source can be removed but not rewritten, and says so. The note opens
  in the same form with the same rules; it keeps its id and the day it was
  first added. A correction that changes nothing saves nothing. A correction
  never touches the unfinished new-note draft.
- **Every correction is shown**: the log (`app.onboarding.corrections.v1`)
  keeps what each part was and became ("Elevator: Yes → No"), and each note
  shows its last correction and, in "Changes to this note", all of them.
- **Recently removed** (`bin.ts`, `views-bin.ts`, route `#/notes/removed`,
  `app.onboarding.bin.v1`): removing a note moves it here for 30 days. It is
  counted nowhere until it is put back, unchanged. "Undo" is offered at once,
  with focus on it, and goes away at the next action. Removing for good, one
  note or all, asks first. Both new keys are listed on the "kept on this
  device" page, where they can be cleared.
- **Spreadsheet (CSV)** (`notes-csv.ts`, on My notes): one row per note and
  detail, with the source, licence and date of each Yes or No and UNKNOWN for
  a detail with no record. Typed text is guarded against spreadsheet
  formulas.
- **Tests**: model, random corrections and random CSV files read back with
  a strict reader, every screen with axe and the App's audit in both
  languages, the shell flows, and a keyboard-only walk in a real browser
  (`qa/tests/first-run-correct.spec.ts`).

## Moving everything, sharing some notes (round AE)

- **Move everything to another device** (`devicefile.ts`, `views-move.ts`,
  route `#/help/device/move`, from "kept on this device"): one file with
  notes, must-haves, shortlist, checklist, questions sent, corrections,
  Recently removed and an unfinished survey. Nothing is sent; the person
  carries the file. Bringing a file in shows, part by part, how much is in
  it, what would be added, what is kept as on this device and what has no
  room, and changes nothing until the person chooses parts. It only adds:
  a note in both keeps this device's version; for a place asked on both, the
  more recent question wins; a survey in progress is never replaced;
  corrections come only for notes that exist after the move. Every part goes
  through the App's own readers, so broken parts are dropped. A notes file or
  a lists backup pasted here is recognised and the person is sent to the
  right page.
- **Share some notes** (`share.ts`, `views-share.ts`, route `#/notes/share`,
  from My notes): pick notes (filter by place, pick all shown or none) and
  download them in the App's own notes format, which the other person brings
  in with the usual notes import. Each note keeps its source, licence and
  date; notes from other sources are pointed out. The person's own extra
  text is left out unless they choose it.
- **Tests**: models, random devices (a file reads back the same; a merge
  never loses anything here and adds nothing the second time), random shares,
  every screen with axe and the App's audit in both languages, the shell
  flows, and two separate browsers in `qa/tests/first-run-move.spec.ts`.

## Visit cards, My access card, showing it to staff (round AF)

- **Visit cards** (`placecard.ts`, `views-cards.ts`, routes
  `#/places/<id>/card` and `#/places/shortlist/cards`): one printable card
  per place, from its page or for the whole shortlist. Each card lists every
  detail with its source, licence and date (UNKNOWN stays UNKNOWN),
  which must-haves the notes say Yes or No to, and the questions still open.
  A larger-text option, the browser's print dialog, and a download of the
  same cards as one standalone page with no script. In print layout the
  App's navigation and controls are hidden and each card starts a new page.
- **My access card** (`passport.ts`, `views-passport.ts`, route
  `#/notes/access-card`, from My notes): what the person chooses to tell
  staff: the mobility device they use (or prefer not to say), its size in
  whole centimetres, the details they need (or copied from their
  must-haves) and other things that help, in their own words. It asks for no
  condition, diagnosis or contact details; email addresses and phone numbers
  are refused. Kept on this device only, listed on "kept on this device" and
  clearable there, printed first with visit cards unless the person leaves it
  out, and downloadable as text.
- **Show to staff** (`showcard.ts`, `views-showcard.ts`, route
  `#/notes/access-card/show`): the saved card in large type (three sizes),
  optionally in the other official language too, with the App's own question
  for each need. The person's own words are shown as typed in both
  languages, never translated, and marked with the language they wrote them
  in. A text file with both languages. Nothing is sent.
- **Audit**: French typography is now checked by the nearest `lang`
  attribute, so a screen showing both languages is checked by each one's
  rules.
- **Tests**: models (random cards read back the same), every screen with axe
  and the App's audit in both languages, the standalone card page, the shell
  flows, and `qa/tests/first-run-cards.spec.ts` in a real browser with print
  layout emulated.

## My visits (round AG)

- **My visits** (`visits.ts`, `views-visits.ts`, routes `#/notes/visits`,
  `#/notes/visits/new` and `#/notes/visits/<id>`, from My notes and from a
  place's page): after a visit, the person writes down the place (from their
  notes), the day (not after today), for each detail Yes, No or "Did not
  look", and their own words. Visits are private and never change the notes
  by themselves.
- Each visit is **compared with the notes**, detail by detail: the same, not
  what the notes say, notes already differ, or nothing in the notes
  (UNKNOWN). A visit to a place that has left the notes keeps its name and
  says so.
- **Follow-ups**: for the newest visit to each place, the details where it
  found something the notes do not show, with two ways on: start a note from
  the visit (the note form opens with the place, the day as the day observed
  and what was found; the licence is left for the person to choose and their
  own words are not copied), or ask the place about just those details.
- Edit, and remove after a confirmation; every button names the visit it
  acts on. The list can show one place, or only visits with something to
  follow up. Downloads of every visit as text and as a spreadsheet (CSV, one
  row per visit and detail, typed text guarded against formulas). Listed on "kept on this device"
  and clearable there, and part of "Move everything" together with the
  access card (a card is only taken when the other device has none).
- **Tests**: model checks and comparisons, random lists read back the same,
  damaged stored data, the device file with visits and cards (random
  devices included), the shell flows with axe and the App's audit in both
  languages, and `qa/tests/first-run-visits.spec.ts` in a real browser.

## Bring notes in from a spreadsheet (round AH)

- **CSV import** (`csvimport.ts`, `views-csvimport.ts`, route
  `#/notes/import-csv`, from My notes): a CSV file chosen with the file
  picker, or rows pasted in. The columns are the ones the App's own
  spreadsheet download writes, so that file comes back unchanged (same ids,
  same records). A person's own spreadsheet can use the same columns, other
  common names for them (in English or French), or one row per place with a
  column for each detail. Commas, semicolons (spreadsheets set to French) and
  tabs (cells pasted from a spreadsheet) all work.
- **Nothing is guessed**: a Yes or No is used only with a source, one of the
  open licences and the day it was recorded, not after today. UNKNOWN adds
  nothing. Every row not used is listed with its row number and reason, and
  can be downloaded with the reason beside it, fixed and brought back.
- **Preview first**: counts, each note with its details and a box to leave it
  out, a word when the place is already in the notes, and where the file
  says something other than those notes. Notes already here are never
  changed; the same rows brought in twice are added once. If the rows change
  after the preview, the App shows the new preview instead of adding.
- **Take back**: right after adding, My notes offers to take back the notes
  just added, until the person moves on.
- **Two more downloads**: My notes with one row per note (each detail's
  source, licence and day beside it; it comes back through the same import
  unchanged), and the shortlist as a spreadsheet in the person's order, with
  what the notes say about each detail, how many records, the newest day,
  and, with must-haves saved, whether each is met.
- **Tests**: the reader (quotes, line ends, separators, limits), every row
  problem, wide sheets, the App's download coming back unchanged for random
  notes, the rows-to-fix round trip, random previews with the App's audit
  and axe in both languages, the shell flow, and
  `qa/tests/first-run-csvimport.spec.ts` in a real browser with a real file.

## Not done here

- Layout-dependent checks are not covered in jsdom: real target sizes,
  200% text reflow at 320px, focus visibility and screen-reader behaviour.
  Test those in a real browser before making any conformance statement.
- No bundler config is included. To run the page, bundle `src/main.ts` to
  `main.js` and `src/sw.ts` to `sw.js` next to `index.html` (the precache
  list in `sw-logic.ts` expects `./`, `./index.html`, `./main.js`).
- No GitHub workflow is added (outside this lane's scope). To run the guard
  in CI: `npm ci && npm run ci` in this directory.
- Tests run in jsdom. Colour contrast of rendered pages, real target sizes,
  focus visibility and screen-reader behaviour are not tested; the
  contrast of the palette is calculated, not measured on screen. The
  service worker logic is tested with fakes, not in a browser.
- The place-card guide uses one clearly labelled illustrative example (no
  real place). There is no place data in this package.

Provenance of all copy: original text written for the App, licence CC0-1.0,
dated 2026-11-15 (`COPY_META`).

```
npm install
npm run ci
```
