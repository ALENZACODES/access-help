# @access/onboarding

Short help-centre onboarding paths for the App, in English and French
(`src/paths.ts`). Three paths of 2–3 steps: find a place, add a detail,
get help.

- Provenance: original copy written for the App; licence CC0-1.0; dated
  2026-11-15 (see `PATHS_META`). No third-party data.
- Copy is navigation help only: no medical or eligibility advice.
- The “Find a place” and “Add a detail” paths point to the map in the App,
  or to exporting a note file to share. They do not treat this help centre
  as if it had place pages.
- "Unknown" is shown as unknown; the copy tells readers not to assume access.
- French strings use `’`, U+00A0 before `:`, U+202F before `; ! ?` and
  inside `« »`; `frenchTypographyIssues()` and the tests enforce this.
- UI that renders these paths must size controls at least
  `MIN_TOUCH_TARGET_PX` (44) px.

```
npm install
npm test
npm run typecheck
```

## Switch/keyboard-first first-run path

`switch-first/` is a first-run path that can be moved with a keyboard or a switch. The help centre onboarding page mounts `renderStep`. The path only records a movement preference and an optional highlight interval. This help centre does not run a scanner and has no later settings screen for these choices. Unset choices stay unknown.

## Combined first-run shell

`first-run/` mounts setup, the short help paths, and a place-card guide in one shell. The help centre opens it at `/onboarding/first-run`. Unknown stays unknown. Choices are saved on this device only.

The first-run shell also holds help articles and on-device help search, with keyboard, switch and voice routes (see `first-run/README.md`). Those routes explain the device's own tools; this help centre does not run a scanner or listen. The shell also has a find-the-right-help chooser, a plain-words list, a names-on-a-screen page, a keyboard practice page and text downloads of the help (see `first-run/README.md`). The practice page and the names page do not save anything; the saved help choices (recent articles and reading mode) stay on this device.

## Possible matches, import preview, restore preview (round M)

- `#/places/similar` lists saved places that may be the same place (same address, same name, or a near-identical name). The person can compare two, dismiss a pair, or reset dismissals. Nothing is merged or deleted for them.
- "Preview first" on notes import and on restore shows what would be added, what is already here and what would be skipped, before anything changes. The real import and restore reuse the same code as the preview, so the two cannot disagree.
- The axe test in `shell-help.test.ts` runs once per language, and `testTimeout` is 30 seconds.

## Record history, record tier, details to ask about again (round N)

- `#/places/<id>/history` shows every Yes or No recorded for one place, newest first, each with its source, licence, date and tier, and whether it says something different from the record before it. It does not pick an answer.
- Records kept on a device have not been reviewed by anyone, so they are all tier 0. `tier.ts` is the one place that says so; nothing raises a tier.
- `#/places/ask-again` lists details whose reports differ, whose newest record is a year old or more, or that have no record, with the question to ask. It is a to-ask list and changes no note.
- The page audit checks history tables: each row needs a Yes or No, a source, an open licence, a real date and a tier, newest first.

## Latest records, record ages, records saved more than once (round O)

- `#/places/latest` lists every record on the device newest first, grouped by month, twenty at a time, with a filter by kind of record. It is in date order only and does not rank places or sources.
- `#/places/record-ages` counts records by age for each detail in four bands. An old record is not shown as wrong, and places with no record are counted apart.
- `#/places/repeated-records` points out a record held by two or more notes about one place (same answer, source, licence and date). It is still one record; nothing is removed.
- `#/places/no-record` lists, detail by detail, the places where no note gives a Yes or a No, with the question to ask the place and a text download. It never shows those details as No and guesses nothing.
- `#/places/must-haves`, `#/places/shortlist` and `#/notes/check` are the must-haves page, the shortlist order page and the notes-to-check page. Each changes nothing without the person's own action; removing a note always asks twice.
- Short paths (`src/paths.ts`) can name the screen a step happens on (`appRoute`). The step page shows an "Open this page" button, a line saying what that page will find on this device now (`stepstatus.ts`), and an "I did this step" box. Ticks are saved on this device only (`pathprogress.ts`, key `app.onboarding.pathProgress.v1`); unknown path or step ids in saved data are dropped.
- `#/help/paths` lists every short path with the person's ticks, Start / Continue / Read again buttons and a two-step "Clear every tick". A path started but not finished also shows a Continue button on the help list.
- A path found by help search opens the step that matches best. The all-help text file ends with every short path, without anyone's ticks.
- French copy shows the status of a detail with no record as the token UNKNOWN, never « inconnu ». The audit rule `unknown-token` checks every string the package ships and every rendered French page; a person's own place names are not checked. Searching « inconnu » in French still finds the UNKNOWN help.
- The page audit also checks the ages table: the four bands of a row must add up to its records.

## Compare two note files (separate entry point)

`@access/onboarding/file-compare` (`first-run/src/filecompare-entry.ts`) mounts "Compare two note files" with `mountFileCompare(element, { locale })`. A person pastes or opens two notes exports and sees, side by side:

- each file at a glance (notes, places, Yes or No records with a source, licence and date, entries left out);
- for every place in both files, each detail's answer in file A and in file B, with every record's source, licence, date and tier (tier 0, not reviewed), and how the two compare: different answers, recorded in one file only, same answer, or no record in either file;
- the places found in one file only, and pairs that may be the same place (same rule as the possible-matches page). Nothing is joined;
- a text download of the whole comparison.

It saves nothing, needs no store and sends nothing anywhere; opened files are read on the device (`File.text()`, or `FileReader` where that is missing). It never says which file is right. A Yes or No without full provenance is read as UNKNOWN, as everywhere else. It is not part of the package's main entry, the first-run entry or the shell, so it adds nothing to the first-install payload; a host loads it with a dynamic `import()` when a person opens it. `filecompare-entry.test.ts` keeps it that way.

## Check a notes file (separate entry point)

`@access/onboarding/file-check` (`first-run/src/filecheck-entry.ts`) mounts "Check a notes file" with `mountFileCheck(element, { locale })`. A person pastes or opens one notes export, before sharing it or bringing it in, and sees what the App would do with each entry:

- the totals: entries, notes the App reads, entries it leaves out, Yes or No answers read as UNKNOWN, notes whose own words hold an email address or phone number;
- each entry left out, with every reason (not only the first);
- each Yes or No read as UNKNOWN, with what it lacks: a source, an open licence or a real date;
- things to look at that change nothing: records dated after today, a detail given twice (the App uses the first), details the App does not show, answers other than Yes, No or Unknown, and the notes-to-check flags;
- downloads: a cleaned copy (only the readable notes, as the App reads them), the same without the notes' own words, and the check as text. The person's file is not changed.

The App's own parser (`parseNote`) decides what is read, and a seeded fuzz test checks that this page and an import always agree. It saves nothing and is loaded only on demand, like the file comparison.

## Combine note files (separate entry point)

`@access/onboarding/file-merge` (`first-run/src/filemerge-entry.ts`) mounts "Combine note files" with `mountFileMerge(element, { locale })`. A person adds two to ten notes exports (pasted one at a time, or several opened at once), for example one from each person after a mapping day, and downloads them as one notes file.

- Each file is read with the App's own rules (through the file check), so a Yes or No without a source, an open licence and a date is UNKNOWN; files that cannot be read are listed, not guessed at.
- Notes are joined in file order. The same note found again (same id, same content) is kept once.
- Two versions of one note (same id, different content) are shown side by side, each detail with its source, licence and date. The earlier file's version is kept unless the person picks the later one or both; with both, the later one gets a new id (`n1-2`). Nothing says which version is right.
- A copy under another id (same content) is kept unless the person leaves it out.
- Downloads: the combined notes file and a text account of what was combined. A notice says when the result holds more notes than one device keeps (200).

Nothing is saved; the files live in memory while the page is open. Like the other file tools it is loaded only on demand.

## Split a notes file (separate entry point)

`@access/onboarding/file-split` (`first-run/src/filesplit-entry.ts`) mounts "Split a notes file" with `mountFileSplit(element, { locale })`. A person reads one notes export and chooses some of its notes, for example the notes for one volunteer's streets:

- filters: words in the place name or address (capitals and accents ignored), a detail and its answer (any recorded Yes or No, Yes, No, or UNKNOWN for no record, which never counts as No), a source of a record, a licence, and the dates of records; every filter that is set must pass. With no filter set, nothing is chosen;
- each note can be ticked or unticked by hand over the filters, and the page says which notes were chosen or left out by hand;
- a count of Yes, No and no record for each detail in the chosen notes (counts, not a score);
- downloads: the chosen notes and the rest as notes exports, and the chosen notes as a spreadsheet (the App's CSV, with formula guarding).

Choosing never changes a note, and nothing is saved.

## Read a notes file (separate entry point)

`@access/onboarding/file-reader` (`first-run/src/filereader-entry.ts`) mounts "Read a notes file" with `mountFileReader(element, { locale })`. A person sees the places in a notes export without bringing anything into this device:

- notes about one place are combined the way the places page combines them: reports that agree show how many back them, reports that differ are all listed, and no answer is picked;
- search by words in the name or address, and must-haves (a detail that must be Yes or No). With must-haves, places fall into three groups, as on the places page: every must-have matches; a must-have is UNKNOWN or reports differ; a must-have is answered the other way. The groups are not a ranking, and UNKNOWN never counts as No;
- 20 places a page per group, with paging buttons that name their group; each place's details open in place with source, licence, date and tier;
- a text download of every place shown.

Nothing is saved.

## Summarize a notes file (separate entry point)

`@access/onboarding/file-summary` (`first-run/src/filesummary-entry.ts`) mounts "Summarize a notes file" with `mountFileSummary(element, { locale })`. For one notes export it shows counts made with the same reports the App uses for notes on a device: notes, places, entries left out, places with no address or several notes; how many details each place has recorded; places by answer for each detail (Yes, No, reports differ, no record); how old the records are; and where they come from, with licences and dates. The ages and sources tables use the App's own audited table form, so the page audit checks that they add up. Counts only: nothing is scored and UNKNOWN never counts as No. A text download holds the whole summary.

## Questions to ask (separate entry point)

`@access/onboarding/file-ask` (`first-run/src/fileask-entry.ts`) mounts "Questions to ask" with `mountFileAsk(element, { locale })`. For the places in one notes export, it lists the questions to ask each place, using the App's own visit-plan questions: details with no record (UNKNOWN), details whose reports differ, and, unless the person turns it off, answers a year old or more ("is this still the case?"). The person can limit the details and search by name or address. Downloads: text to print with a line to write each answer, who gave it and the date, and a CSV in the App's CSV form (byte-order mark, guarded cells) with blank answer columns. It calls no one and changes no note; an answer becomes a record only when the person adds a note with a source, a licence and a date.

## Make a notes file from your own spreadsheet (separate entry point)

`@access/onboarding/file-sheet` (`first-run/src/filesheet-entry.ts`) mounts "Make a notes file from your own spreadsheet" with `mountFileSheet(element, { locale })`. A person brings in a spreadsheet with their own column names (commas, semicolons or pasted tabs) and:

- says what each column holds: the place name, the address, the answer for a detail, or the source, licence or day of the answers. The first choices are guesses from the column names (English and French) and are shown for the person to check;
- gives the source, an open licence and the day for every row when no column holds them. Nothing has a default: a missing source, licence or date is reported, and a Yes or No without them is not used;
- says which of their words mean Yes, No and Unknown (defaults include oui/non and y/n). A blank cell is always UNKNOWN; a word in no list is not guessed, and the page lists such words with how often they appear. A word in two lists is refused.

The spreadsheet is turned, row for row, into the App's own one-row-per-place CSV and read by the App's own CSV import, so every rule of the import applies and each problem is reported on the person's own row and column. Downloads: the notes file, the rows not used with the reason beside them, and the spreadsheet in the App's columns. Errors are tied to their fields (`aria-invalid` and `aria-describedby`). Nothing is saved.

## Sort a notes file by street (separate entry point)

`@access/onboarding/file-streets` (`first-run/src/filestreets-entry.ts`) mounts "Sort a notes file by street" with `mountFileStreets(element, { locale })`. The places in one notes export are grouped by the street in their address (or by postal area), in house-number order, for a walk or a round of calls:

- streets are read from the address text (`first-run/src/streets.ts`): English types after the name (St, Rd, Ave, Blvd, Cres…), French types before it (rue, boul., chemin…), directions kept (King Street West and East are two streets), units before or after the street (`12-345`, `#300`, `Suite 4`, `app. 2`), the city after a comma ignored, Avenue Road read as a road, and "St Clair" and "Saint Clair" read as one street. Nothing is looked up;
- places can instead be grouped by postal area, the first three characters of a Canadian postal code written in the address; a place with no postal code is never guessed into an area;
- "both sides" order walks the odd numbers up one side and the even numbers back down the other;
- "only places with something to look at" leaves out places where every detail has a record and no reports differ, and says how many were left out;
- a place whose address gives no house number and street goes in its own group; it is never guessed onto a street;
- the streets can be shared among 1 to 20 people: whole streets only, biggest first to the lightest list, so each person has about the same number of places;
- every street or list has its own notes file and a visit sheet to print: each place with a box to tick, what to look at (details with no record, shown as UNKNOWN, and details whose reports differ) and a line to write what was found. One download holds every list, and a CSV holds every list as rows (list, group, house number, place, address, details with no record, details whose reports differ), with cells guarded against spreadsheet formulas.

Nothing is saved.

## Plan visits by day (separate entry point)

`@access/onboarding/file-visits` (`first-run/src/filevisits-entry.ts`) mounts "Plan visits by day" with `mountFileVisits(element, { locale })`. The places in one notes export are spread over the days a person chooses, with a time for each visit:

- the order is the walking order of "Sort a notes file by street" (`first-run/src/visitplan.ts`): streets in name order, house numbers in order (or both sides), then the places with no street in their address;
- the person chooses the first day, the days of the week, when the first visit starts, how many visits a day (1 to 30), how long each lasts (5 to 240 minutes) and the time between visits (0 to 120 minutes). Every problem in the form is listed at once and linked to its field; a day that would end after midnight is refused;
- by default a street that fits in one day is not cut: it starts on the next day instead. When streets may be cut, or a street is longer than a day, the page names the streets that run over more than one day;
- "only places with something to look at" leaves out places where every detail has a record and no reports differ;
- the plan downloads as a calendar file (`first-run/src/ics.ts`, RFC 5545, one event per visit with the address and what to look at; times carry no time zone, and each event keeps the same id so importing the plan again updates it), as text to print with a line to write what was found, and as a CSV with guarded cells.

The plan only puts places in order and gives them times; it says nothing about a place beyond what the file records. Nothing is looked up or saved.

## Record what you found on a round (separate entry point)

`@access/onboarding/file-round` (`first-run/src/fileround-entry.ts`) mounts "Record what you found on a round" with `mountFileRound(element, { locale })`. After visiting the places in a notes file, a person says what they found, and gets a new notes file:

- the places come in walking order (`first-run/src/visitrecord.ts`), up to 60 on one round; by default only places with a detail that has no record or reports that differ are listed, and only those details are asked about. "Every detail" asks about all four at every place;
- each detail asked about is a group of three choices, Yes, No and Not checked (the default), with what the file says now beside it. Not checked is never turned into Yes or No: it stays Unknown;
- the person gives the day of the visits (not after today), a source and an open licence once; every Yes and No in the new notes carries them. Each place can also have a short note. Every problem is listed at once and linked to its field;
- each place with an answer or a note becomes one new note, named and addressed like the place, with an id made from the day and the place. Each note goes through the App's own check (`parseNote`), and nothing is copied from the file into it;
- two downloads: only the new notes, or the file's notes with the new ones added. The notes already in the file are not changed; where a new answer and an older one differ, the App shows that the reports differ. A list says, for each answer, whether there was no record before, whether it matches the file, or whether the reports will now differ;
- two more downloads: the answers as a CSV (one row per Yes or No, with what the file said before, the change, the source, the licence and the new note's id, cells guarded) and a report of the round as text to print or share;
- if an answer changes after the file is made, the page says so in place without moving focus.

Nothing is looked up or saved.

## Choose places to look at first (separate entry point)

`@access/onboarding/file-first` (`first-run/src/filefirst-entry.ts`) mounts "Choose places to look at first" with `mountFileFirst(element, { locale })`. The places in one notes export are ranked by what is still open at each one (`first-run/src/lookfirst.ts`):

- a detail is open when no note records it, when its reports differ, or (if the person keeps that choice) when its newest report is a year old or more (`STALE_AFTER_MONTHS`). A year-old record is not treated as wrong, only as worth looking at again;
- three orders: the most open details first; differing reports first; or places never recorded, then the oldest newest report. Ties go to name order in the person's language. Every place is shown with its reasons, one line each, and its newest record;
- the person chooses which of the four details count, can keep only places whose address holds some text (case, accents and punctuation do not matter; a place with no address is left out), and how many places to take (1 to 200). Every problem is listed at once and linked to its field;
- a "streets" view groups the ranked places by the street in their address (read as "Sort a notes file by street" reads it) and ranks the streets: the most open details first, then the most places, then the most places never recorded. Each street shows how many details have no record, differ or are a year old, and its places; places whose address gives no street are listed apart, never put on a street. The first streets download as the notes of every place on them, and as a CSV;
- the first places download as their own notes file, every note of each place in rank order, to open in "Sort a notes file by street", "Plan visits by day" or "Record what you found on a round"; as a CSV of the ranking with guarded cells, and as a list to print. The streets view has the same three downloads.

Nothing is looked up or saved.

## Find and replace in notes (separate entry point)

`@access/onboarding/file-replace` (`first-run/src/filereplace-entry.ts`) mounts "Find and replace in notes" with `mountFileReplace(element, { locale })`. It is a plain find and replace over the place names, addresses and note text of a notes export (`first-run/src/textreplace.ts`), made in a copy:

- the person types the words to find (up to 100 characters) and what to replace them with (up to 200, or nothing to take them out), chooses where to look, and may ask to match capitals exactly or to find whole words only (no letter or digit just before or after). Accents always count. The replacement is used as written;
- every change is listed with the text now, its matches marked, and the text after. All changes that can be made start ticked, and the person can untick any, or tick or untick them all at once;
- a change that would leave a field the App cannot keep (a place with no name, text over its limit) is listed with the reason and cannot be made;
- records are never changed: their answer, source, licence and date say what was recorded and by whom. Each changed note goes through the App's own note reader and goes into the copy only when the changed fields came through as shown and nothing else changed. The page lists what the copy changed, read back from the copy itself (`replaceChanges`). It says when a new name or address makes a note the same place as another, which the App then reads as one place with their records together, and gives the number of places before and after.

The changes found download as a CSV (guarded cells) and the copy as a notes file. Nothing is looked up or saved, and the person's file does not change.

## Note files page (separate entry point)

`@access/onboarding/file-tools` (`first-run/src/filetools-entry.ts`) mounts the "Note files" page with `mountFileTools(element, { locale })`: the thirteen file tools above, each with its title, a short summary and an Open button. A tool's code is fetched with a dynamic `import()` only when its button is chosen; it then opens below a "Back to the list" button and shares the page's live region. If a tool cannot be loaded (for example offline before it was ever fetched), the page says so next to its button. A load that finishes after the person went back is ignored. A host adds this page with one dynamic import, so it adds nothing to the first install.
