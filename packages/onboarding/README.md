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

## Note files page (separate entry point)

`@access/onboarding/file-tools` (`first-run/src/filetools-entry.ts`) mounts the "Note files" page with `mountFileTools(element, { locale })`: the five file tools above, each with its title, a short summary and an Open button. A tool's code is fetched with a dynamic `import()` only when its button is chosen; it then opens below a "Back to the list" button and shares the page's live region. If a tool cannot be loaded (for example offline before it was ever fetched), the page says so next to its button. A load that finishes after the person went back is ignored. A host adds this page with one dynamic import, so it adds nothing to the first install.
