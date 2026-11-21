import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { COPY } from "./copy";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { FILE_PUBLISH_COPY, README_TEXT, checkLines, filePublishStrings, languageText, layoutText, publishErrorText, publishFilename, publishProblemText, readmeText } from "./filepublish-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { DATASET_COLUMNS, NOTE_TEXT_COLUMN, datasetRows, licenceLeftOut, publishChecks, publishedLicences, type PublishOptions } from "./publishpack";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NB = "\u00A0";
const OPTS: PublishOptions = { title: "", language: "en", withUnknown: false, withNoteText: false, layout: "records", area: "", licences: undefined };

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Library", [{ key: "elevator", value: "yes", on: "2026-03-01" }], "100 King St W"),
        testNote("b", "Bank", [{ key: "automatic-door", value: "no", on: "2026-05-05", source: "Visit", licence: "CC-BY-4.0" }], null),
        testNote("f", "Kiosk", [{ key: "elevator", value: "no", on: "2027-02-02" }], "1 Elm St"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const readme = (o: PublishOptions = OPTS): string => {
  const f = file();
  return readmeText(datasetRows(f, o, TODAY), publishChecks(f, TODAY), publishedLicences(f, TODAY), o, TODAY);
};

describe("copy", () => {
  it("passes the App's copy audit, with no banned words", () => {
    expect(auditCopy(filePublishStrings())).toEqual([]);
    for (const [k, p] of filePublishStrings()) {
      expect(findBanned(p.en), k).toBeUndefined();
      expect(findBanned(p.fr), k).toBeUndefined();
    }
  });

  it("has a text for every file error, problem and language", () => {
    for (const l of ["en", "fr"] as const) {
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(publishErrorText(e, l).length).toBeGreaterThan(0);
      for (const p of ["title-long", "title-control", "personal-text"] as const) expect(publishProblemText(p, l).length).toBeGreaterThan(0);
      for (const x of ["en", "fr", "both"] as const) expect(languageText(x, l).length).toBeGreaterThan(0);
    }
  });

  it("explains every column of the dataset", () => {
    for (const c of [...DATASET_COLUMNS, NOTE_TEXT_COLUMN] as const) expect(README_TEXT.columns[c].en.length, c).toBeGreaterThan(0);
  });

  it("says no record is reviewed, that disagreeing records are all kept, and that unknown is not no", () => {
    expect(README_TEXT.tier.en).toContain("No record has been reviewed. Every record is tier 0.");
    expect(README_TEXT.differ.en).toContain("none is chosen over another");
    expect(README_TEXT.columns.value.en).toContain("unknown means there is no record of this detail, not that it is missing");
  });
});

describe("checkLines", () => {
  it("says what the file holds and what to look at before publishing", () => {
    expect(checkLines(publishChecks(file(), TODAY), "en")).toEqual([
      "3 places, 3 notes, 2 Yes or No records from 2026-03-01 to 2026-05-05.",
      "10 details have no record.",
      "1 record is dated after today and will be left out.",
      "1 place has no address.",
    ]);
  });

  it("speaks of note text and personal details when there are some, in French too", () => {
    const fr = checkLines({ places: 1, notes: 2, records: 0, future: 2, unknown: 1, notesWithText: 2, personalNotes: 1, placesNoAddress: 0, oldest: undefined, newest: undefined }, "fr");
    expect(fr).toEqual([
      "1 lieu, 2 notes, 0 donnée Oui ou Non.",
      "1 détail n’a aucune donnée.",
      "2 données sont datées d’après aujourd’hui et seront laissées de côté.",
      "2 notes ont un texte propre.",
      "Dans 1 note, ce texte semble contenir une adresse courriel ou un numéro de téléphone.",
    ]);
    for (const line of fr) expect(frenchTypographyIssues(line), line).toEqual([]);
  });
});

describe("the text that goes with the dataset", () => {
  it("starts with the title, or a plain one, and the day", () => {
    expect(readme().split("\n").slice(0, 3)).toEqual(["Accessibility notes", "===================", "Made on 2026-11-21"]);
    expect(readme({ ...OPTS, title: " Spring round, Ward 4 " }).split("\n")[0]).toBe("Spring round, Ward 4");
  });

  it("explains each column, names each detail in both languages, and credits each licence with its sources", () => {
    const text = readme();
    expect(text).toContain("\nColumns\n-------\nplace_id: an id for the place");
    expect(text).not.toContain("note_text:");
    for (const key of FACT_KEYS) expect(text).toContain(`${key}: ${COPY.facts[key].en} / ${COPY.facts[key].fr}`);
    expect(text).toContain("CC0-1.0: 1 record (2026-03-01 – 2026-03-01)\n  - City survey\n");
    expect(text).toContain("CC-BY-4.0: 1 record (2026-05-05 – 2026-05-05)\n  - Visit\n");
  });

  it("says what was left out: later records and, unless chosen, the notes' own text", () => {
    expect(readme()).toContain("\nLeft out\n--------\n  - 1 record dated after the day the file was made\n");
    const f = readStreetFile(exportNotes([testNote("a", "Library", [{ key: "elevator", value: "yes" }], "1 Elm St")], "2026-11-01"), TODAY, "en");
    if (!f.ok) throw new Error(f.error);
    const clean = readmeText(datasetRows(f.file, OPTS, TODAY), publishChecks(f.file, TODAY), publishedLicences(f.file, TODAY), OPTS, TODAY);
    expect(clean).toContain("\nLeft out\n--------\nnothing\n");
  });

  it("says the notes' own text is left out of rows for each place, even when chosen", () => {
    const r = readStreetFile(exportNotes([{ ...testNote("a", "Library", [{ key: "elevator", value: "yes" }], "1 Elm St"), note: "Side door" }], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    const o = { ...OPTS, withNoteText: true, layout: "places" as const };
    const text = readmeText(datasetRows(r.file, o, TODAY), publishChecks(r.file, TODAY), publishedLicences(r.file, TODAY, o), o, TODAY);
    expect(text).toContain("\nLeft out\n--------\n  - the notes’ own text\n");
  });

  it("explains note_text when the notes' text is added", () => {
    expect(readme({ ...OPTS, withNoteText: true })).toContain("note_text: the note’s own text, as written; only when chosen");
  });

  it("agrees counts in French", () => {
    const fr = readme({ ...OPTS, language: "fr" });
    expect(fr).toContain("CC0-1.0\u00A0: 1 donnée (2026-03-01 – 2026-03-01)");
    expect(fr).toContain("  - 1 donnée datée d’après le jour de création du fichier");
  });

  it("is written in French with French typography, or in both languages one after the other", () => {
    const fr = readme({ ...OPTS, language: "fr" });
    expect(fr.split("\n")[0]).toBe("Notes sur l’accessibilité");
    expect(fr).toContain(`place_id${NB}: un identifiant du lieu`);
    for (const line of fr.split("\n").filter((x) => !x.startsWith("  - "))) expect(frenchTypographyIssues(line), line).toEqual([]);
    const both = readme({ ...OPTS, language: "both" });
    const at = both.indexOf("Notes sur l’accessibilité");
    expect(at).toBeGreaterThan(0);
    expect(both.slice(0, at)).toContain("Accessibility notes");
  });

  it("names the files by day and language", () => {
    expect(publishFilename("csv", TODAY, "en")).toBe("accessibility-dataset-2026-11-21.csv");
    expect(publishFilename("text", TODAY, "fr")).toBe("jeu-de-donnees-accessibilite-2026-11-21-lisez-moi.txt");
    expect(FILE_PUBLISH_COPY.keepTogether.en).toContain("Publish the two files together");
  });
});

describe("layouts, area and licences in the text", () => {
  it("names each layout in both languages", () => {
    for (const l of ["en", "fr"] as const) expect(layoutText("records", l)).not.toBe(layoutText("places", l));
  });

  it("explains the columns of one row per place, and says how the records are summed up", () => {
    const text = readme({ ...OPTS, layout: "places" });
    expect(text).toContain("One row for each place. The records behind each detail");
    expect(text).toContain("elevator: for each detail: yes or no when its records agree, differ when they do not, unknown when there is no record");
    expect(text).toContain("elevator_records: how many records the detail has");
    expect(text).toContain("elevator_newest: the day of the detail’s newest record; empty when there is none");
    expect(text).not.toContain("record_kind:");
    for (const line of readme({ ...OPTS, layout: "places", language: "fr" }).split("\n").filter((x) => !x.startsWith("  - "))) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("names the area, and lists records left out because of their licence", () => {
    const f = file();
    const o = { ...OPTS, area: " King ", licences: ["CC-BY-4.0"] };
    const text = readmeText(datasetRows(f, o, TODAY), publishChecks(f, TODAY), publishedLicences(f, TODAY, o), o, TODAY, { licenceLeft: licenceLeftOut(f, o, TODAY) });
    expect(text.split("\n")[3]).toBe("Only places whose address holds: King");
    expect(text).toContain("  - 1 record under a licence not chosen (CC0-1.0)");
  });
});
