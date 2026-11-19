import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createDayNotesStore } from "./dayNotesStore.js";
import { buildDaysView, daysFile, shiftMonth, startMonth, type DaysFileKind } from "./daysModel.js";
import { daysText, type DaysKey } from "./daysStrings.js";
import { MAX_DAY_NOTE, dayNoteLength, parseLogMonth, type DayNotes, type LogMonthRef } from "./docs-bridge.js";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./days.css";

function download(file: { filename: string; mime: string; content: string }) {
  const url = URL.createObjectURL(new Blob([file.content], { type: `${file.mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Shows a person's own observations by the day they were seen, with a month calendar and a
 * short note per day. It counts and lists. Everything stays on this device.
 */
export function DaysView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const noteStore = useMemo(() => createDayNotesStore(storage), [storage]);
  const today = localToday();
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [notes, setNotes] = useState<DayNotes>({});
  const [month, setMonth] = useState<LogMonthRef>(() => parseLogMonth(today) ?? { year: 2026, month: 1 });
  const [chosen, setChosen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const dayRef = useRef<HTMLHeadingElement>(null);
  const t = (key: DaysKey, vars?: Record<string, string | number>) => daysText(language, key, vars);

  useEffect(() => {
    const saved = drafts.list();
    setRecords(saved);
    setNotes(noteStore.read());
    setMonth(startMonth(saved, today));
  }, [drafts, noteStore, today]);

  const view = useMemo(() => buildDaysView(records, notes, month, chosen, language), [records, notes, month, chosen, language]);

  function choose(day: string) {
    setChosen(day);
    setDraft(notes[day] ?? "");
    setMessage("");
    // Move focus to the day so a keyboard or screen reader user lands on what they asked for.
    window.setTimeout(() => dayRef.current?.focus(), 0);
  }

  function move(delta: number) {
    const next = shiftMonth(month, delta);
    setMonth(next);
    setMessage(t("showMonth", { month: buildDaysView(records, notes, next, null, language).monthName }));
  }

  function saveNote(event: FormEvent) {
    event.preventDefault();
    if (view.detail === null) return;
    const day = view.detail.group.day;
    const result = noteStore.save(day, draft);
    if (!result.ok) {
      setMessage(result.reason === "too-many" ? t("noteTooMany") : t("noteFailed"));
      return;
    }
    const next = noteStore.read();
    setNotes(next);
    setDraft(next[day] ?? "");
    setMessage(next[day] === undefined ? t("noteRemoved", { day }) : t("noteSaved", { day }));
  }

  function file(kind: DaysFileKind) {
    const made = daysFile(kind, view, today, language);
    if (made !== null) download(made);
  }

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      {records.length === 0 ? (
        <>
          <p>{t("noNotes")}</p>
          <p>
            <Link to="/places/contribute" className="days-link">
              {t("addLink")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <section aria-labelledby="days-totals">
            <h2 id="days-totals">{t("totalsHeading")}</h2>
            <ul data-testid="days-totals">
              {view.totalsLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="days-calendar">
            <h2 id="days-calendar">{t("calendarHeading")}</h2>
            <p className="days-month">
              <button type="button" onClick={() => move(-1)}>
                {t("previousMonth")}
              </button>
              <strong data-testid="days-month">{view.monthName}</strong>
              <button type="button" onClick={() => move(1)}>
                {t("nextMonth")}
              </button>
            </p>
            <table className="days-calendar">
              <caption>{t("calendarCaption", { month: view.monthName })}</caption>
              <thead>
                <tr>
                  {view.weekdays.map((name) => (
                    <th key={name} scope="col" abbr={name}>
                      {name.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.weeks.map((week, w) => (
                  <tr key={w}>
                    {week.map((cell, c) => (
                      <td key={cell.iso ?? `blank-${w}-${c}`}>
                        {cell.iso === null ? null : cell.count > 0 ? (
                          <button type="button" aria-pressed={chosen === cell.iso} aria-label={t("dayButton", { label: cell.label })} onClick={() => choose(cell.iso as string)}>
                            {cell.day}
                            <span className="days-count" aria-hidden="true">
                              {cell.count}
                            </span>
                          </button>
                        ) : (
                          <span>{cell.day}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>{t("daysHeading", { month: view.monthName })}</h3>
            {view.monthDays.length === 0 ? (
              <p>{t("monthEmpty", { month: view.monthName })}</p>
            ) : (
              <ul className="place-list">
                {view.monthDays.map((item) => (
                  <li key={item.day}>
                    <button type="button" onClick={() => choose(item.day)}>
                      {t("openDay", { day: item.day, count: item.countText })}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {view.detail === null ? (
            <p>{t("pickDay")}</p>
          ) : (
            <section aria-labelledby="days-day" className="days-day">
              <h2 id="days-day" ref={dayRef} tabIndex={-1}>
                {t("dayHeading", { day: view.detail.heading })}
              </h2>
              <ul data-testid="days-stats">
                {view.detail.statLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <h3>{t("placesHeading")}</h3>
              <ul className="place-list">
                {view.detail.places.map((place) => (
                  <li key={place.id}>
                    <strong>{place.name ?? t("unnamed")}</strong>
                    <br />
                    {place.line}
                  </li>
                ))}
              </ul>

              <form className="days-note" onSubmit={saveNote} noValidate>
                <h3>{t("noteHeading")}</h3>
                <label htmlFor="days-note-text">{t("noteLabel", { day: view.detail.group.day })}</label>
                <p id="days-note-help" className="hint">
                  {t("noteHelp", { max: MAX_DAY_NOTE })}
                </p>
                <textarea id="days-note-text" rows={4} maxLength={MAX_DAY_NOTE} value={draft} aria-describedby="days-note-help days-note-count" onChange={(e) => setDraft(e.currentTarget.value)} />
                <p id="days-note-count">{t("noteCount", { n: dayNoteLength(draft), max: MAX_DAY_NOTE })}</p>
                <p>
                  <button type="submit">{t("saveNote")}</button>
                </p>
              </form>
            </section>
          )}

          <section aria-labelledby="days-files">
            <h2 id="days-files">{t("filesHeading")}</h2>
            <p className="places-actions">
              {view.detail !== null ? (
                <>
                  <button type="button" onClick={() => file("day-text")}>
                    {t("downloadDay")}
                  </button>
                  <button type="button" onClick={() => file("day-osm")}>
                    {t("downloadDayOsm")}
                  </button>
                </>
              ) : null}
              <button type="button" onClick={() => file("days-csv")}>
                {t("downloadDays")}
              </button>
            </p>
            <p>{t("filesNote")}</p>
          </section>

          {view.undated.length > 0 ? (
            <section aria-labelledby="days-undated">
              <h2 id="days-undated">{t("undatedHeading")}</h2>
              <p>{t("undatedBody")}</p>
              <ul>
                {view.undated.map((item) => (
                  <li key={item.id}>
                    {item.name ?? t("unnamed")}. {item.line}
                  </li>
                ))}
              </ul>
              <p>
                <Link to="/places/mine" className="days-link">
                  {t("correctLink")}
                </Link>
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
