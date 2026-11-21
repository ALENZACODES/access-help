import { describe, expect, it } from "vitest";
import { exportNotes } from "./exchange";
import { readStreetFile } from "./filestreets";
import { FOLLOW_UP_DAYS, TRACK_PROBLEMS, dueForFollowUp, readTracking, rowProblem, sortTracking, trackTotal, type TrackRow, type Tracking } from "./lettertrack";
import { lettersCsv, makeLetters } from "./letters";
import { LIMITS } from "./model";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const HEADER = "place_name,address,asked_about,reasons,sent_on,reply_on";

const row = (over: Partial<TrackRow> = {}): TrackRow => ({ line: 2, name: "Library", address: "100 King St W", sentOn: "", replyOn: "", ...over });

function tracking(text: string): Tracking {
  const r = readTracking(text, TODAY);
  if (!r.ok) throw new Error(r.error);
  return r.tracking;
}

describe("a row's dates", () => {
  it("takes a row not sent, sent, or sent and answered", () => {
    expect(rowProblem(row(), TODAY)).toBeUndefined();
    expect(rowProblem(row({ sentOn: "2026-10-01" }), TODAY)).toBeUndefined();
    expect(rowProblem(row({ sentOn: "2026-10-01", replyOn: "2026-10-01" }), TODAY)).toBeUndefined();
    expect(rowProblem(row({ sentOn: "2026-11-21", replyOn: "2026-11-21" }), TODAY)).toBeUndefined();
  });

  it("names what is wrong, in the order a person would fix it", () => {
    expect(rowProblem(row({ name: "", sentOn: "bad" }), TODAY)).toBe("no-name");
    expect(rowProblem(row({ sentOn: "21/11/2026" }), TODAY)).toBe("sent-date");
    expect(rowProblem(row({ sentOn: "2026-02-30" }), TODAY)).toBe("sent-date");
    expect(rowProblem(row({ sentOn: "2026-10-01", replyOn: "soon" }), TODAY)).toBe("reply-date");
    expect(rowProblem(row({ sentOn: "2026-11-22" }), TODAY)).toBe("sent-later");
    expect(rowProblem(row({ sentOn: "2026-10-01", replyOn: "2026-12-01" }), TODAY)).toBe("reply-later");
    expect(rowProblem(row({ replyOn: "2026-10-01" }), TODAY)).toBe("reply-not-sent");
    expect(rowProblem(row({ sentOn: "2026-10-05", replyOn: "2026-10-01" }), TODAY)).toBe("reply-before");
  });

  it("knows every problem it can give", () => {
    expect(TRACK_PROBLEMS).toEqual(["no-name", "sent-date", "reply-date", "sent-later", "reply-later", "reply-not-sent", "reply-before"]);
  });
});

describe("sorting the letters", () => {
  it("puts each row in one group, the longest wait first", () => {
    const t = sortTracking(
      [
        row({ line: 2, name: "A" }),
        row({ line: 3, name: "B", sentOn: "2026-11-11" }),
        row({ line: 4, name: "C", sentOn: "2026-09-01" }),
        row({ line: 5, name: "D", sentOn: "2026-10-01", replyOn: "2026-10-20" }),
        row({ line: 6, name: "E", sentOn: "nope" }),
        row({ line: 7, name: "F", sentOn: "2026-11-11" }),
      ],
      TODAY,
    );
    expect(t.notSent.map((r) => r.name)).toEqual(["A"]);
    expect(t.waiting.map((r) => [r.name, r.days])).toEqual([
      ["C", 81],
      ["B", 10],
      ["F", 10],
    ]);
    expect(t.replied.map((r) => r.name)).toEqual(["D"]);
    expect(t.unusable).toEqual([{ ...row({ line: 6, name: "E", sentOn: "nope" }), problem: "sent-date" }]);
    expect(trackTotal(t)).toBe(6);
  });

  it(`calls out a wait of ${FOLLOW_UP_DAYS} days or more, not one day less`, () => {
    const day = (n: number) => new Date(TODAY.getTime() - n * 86_400_000).toISOString().slice(0, 10);
    const t = sortTracking([row({ name: "Due", sentOn: day(FOLLOW_UP_DAYS) }), row({ name: "Not yet", sentOn: day(FOLLOW_UP_DAYS - 1) })], TODAY);
    expect(dueForFollowUp(t).map((w) => w.name)).toEqual(["Due"]);
  });
});

describe("reading the list", () => {
  it("reads back the list the letters tool downloads, filled in", () => {
    const r = readStreetFile(
      exportNotes([testNote("a", "Library", [], "100 King St W"), testNote("b", "Bank", [], "40 King St W"), testNote("c", "Cart", [], null)], "2026-11-01"),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    const lines = lettersCsv(makeLetters(r.file, false, TODAY, "en")).split("\r\n");
    // A person fills in the dates of the first two letters.
    lines[1] = `${lines[1]?.slice(0, -2)},2026-10-01,2026-10-15`;
    lines[2] = `${lines[2]?.slice(0, -2)},2026-11-01,`;
    const t = tracking(lines.join("\r\n"));
    expect(t.replied.map((x) => [x.name, x.address, x.replyOn])).toEqual([["Bank", "40 King St W", "2026-10-15"]]);
    expect(t.waiting.map((x) => [x.name, x.days])).toEqual([["Library", 20]]);
    expect(t.notSent.map((x) => x.name)).toEqual(["Cart"]);
  });

  it("reads a list a French spreadsheet saved with semicolons, and takes off the guard on a formula-like cell", () => {
    const t = tracking(`place_name;address;sent_on;reply_on\n'=Café;"1 Rue A; local 2";2026-11-01;\n`);
    expect(t.waiting).toEqual([{ line: 2, name: "=Café", address: "1 Rue A; local 2", sentOn: "2026-11-01", replyOn: "", days: 20 }]);
  });

  it("takes columns in any order and with spaces or capitals in their names, and leaves out blank rows", () => {
    const t = tracking("Reply On,Place Name,Sent On\n,Library,2026-11-01\n,,\n2026-11-02,Bank,2026-11-01\n");
    expect(t.waiting.map((x) => [x.name, x.line])).toEqual([["Library", 2]]);
    expect(t.replied.map((x) => [x.name, x.line])).toEqual([["Bank", 4]]);
  });

  it("says which columns are missing", () => {
    expect(readTracking("place_name,address\nA,B\n", TODAY)).toEqual({ ok: false, error: "missing-columns", missing: ["sent_on", "reply_on"] });
  });

  it("refuses an empty box, a header with no rows, an unclosed quote and a list too large", () => {
    expect(readTracking("  \n", TODAY)).toEqual({ ok: false, error: "empty" });
    expect(readTracking(`${HEADER}\n,,,,,\n`, TODAY)).toEqual({ ok: false, error: "no-rows" });
    expect(readTracking(`${HEADER}\n"Library,,,,,\n`, TODAY)).toEqual({ ok: false, error: "unclosed-quote" });
    expect(readTracking("x".repeat(LIMITS.importChars + 1), TODAY)).toEqual({ ok: false, error: "too-large" });
  });
});
