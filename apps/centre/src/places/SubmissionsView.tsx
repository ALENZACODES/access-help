import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { mergeRestored, parseLedgerBackup, restoreFailureText, restoreSummaryText, submissionStatusText, type EntryField, type Ledger } from "./docs-bridge.js";
import { PlacesNav } from "./PlacesNav.js";
import { buildSubmissionsView, issuesByField, submissionFile, type SubmissionFileKind, type SubmissionRow } from "./submissionsModel.js";
import { createSubmissionsStore, type StoreResult } from "./submissionsStore.js";
import { submissionText, type SubmissionKey } from "./submissionsStrings.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./submissions.css";

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

interface RowProps {
  row: SubmissionRow;
  index: number;
  today: string;
  language: Language;
  nameOf: (record: PlaceRecord) => string;
  onMark: (record: PlaceRecord, input: { markedOn: string; changeset: string; note: string }) => StoreResult;
  onLook: (record: PlaceRecord, day: string) => StoreResult;
  onUnmark: (record: PlaceRecord) => void;
}

function Row({ row, index, today, language, nameOf, onMark, onLook, onUnmark }: RowProps) {
  const t = (key: SubmissionKey, vars?: Record<string, string | number>) => submissionText(language, key, vars);
  const [markedOn, setMarkedOn] = useState(today);
  const [changeset, setChangeset] = useState("");
  const [note, setNote] = useState("");
  const [lookDay, setLookDay] = useState(today);
  const [errors, setErrors] = useState<Partial<Record<EntryField, string>>>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const name = nameOf(row.record);
  const base = `row-${index}`;
  const errorFields = (Object.keys(errors) as EntryField[]).filter((field) => errors[field] !== undefined);

  useEffect(() => {
    if (errorFields.length > 0) summaryRef.current?.focus();
  }, [errors]); // eslint-disable-line react-hooks/exhaustive-deps

  function handle(result: StoreResult) {
    if (result.ok) setErrors({});
    else if (result.kind === "issues") setErrors(issuesByField(result.issues, language));
  }

  function submitMark(event: FormEvent) {
    event.preventDefault();
    handle(onMark(row.record, { markedOn, changeset, note }));
  }

  function submitLook(event: FormEvent) {
    event.preventDefault();
    handle(onLook(row.record, lookDay));
  }

  const describe = (field: EntryField, helpId?: string) =>
    ({ "aria-invalid": errors[field] ? true : undefined, "aria-describedby": [helpId, errors[field] ? `${base}-${field}-error` : undefined].filter(Boolean).join(" ") || undefined }) as const;
  const fieldError = (field: EntryField) =>
    errors[field] ? (
      <p id={`${base}-${field}-error`} className="field-error">
        {errors[field]}
      </p>
    ) : null;

  return (
    <li className="submission-row" data-status={row.status}>
      <h3>{name}</h3>
      <p>
        <span className="submission-state" data-status={row.status}>
          {submissionStatusText(row.status, language)}
        </span>
        {" · "}
        {t("seenLine", { date: row.record.observedOn })}
      </p>

      {errorFields.length > 0 ? (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="error-summary">
          <p>{t("errorSummary")}</p>
          <ul>
            {errorFields.map((field) => (
              <li key={field}>
                <a href={`#${base}-${field}`}>{errors[field]}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {row.entry === undefined ? (
        <form className="submission-form" onSubmit={submitMark} noValidate aria-label={t("markHeading")}>
          <label htmlFor={`${base}-markedOn`}>{t("markedOnLabel")}</label>
          <input id={`${base}-markedOn`} type="text" inputMode="numeric" autoComplete="off" value={markedOn} onChange={(e) => setMarkedOn(e.currentTarget.value)} {...describe("markedOn")} />
          {fieldError("markedOn")}
          <label htmlFor={`${base}-changeset`}>{t("changesetLabel")}</label>
          <p id={`${base}-changeset-help`} className="hint">{t("changesetHelp")}</p>
          <input id={`${base}-changeset`} type="text" inputMode="numeric" autoComplete="off" value={changeset} onChange={(e) => setChangeset(e.currentTarget.value)} {...describe("changeset", `${base}-changeset-help`)} />
          {fieldError("changeset")}
          <label htmlFor={`${base}-note`}>{t("noteLabel")}</label>
          <input id={`${base}-note`} type="text" autoComplete="off" value={note} onChange={(e) => setNote(e.currentTarget.value)} {...describe("note")} />
          {fieldError("note")}
          <p>
            <button type="submit">{t("markButton", { name })}</button>
          </p>
        </form>
      ) : (
        <>
          <p>{t("markedLine", { date: row.entry.markedOn })}</p>
          <p>{row.entry.changeset === null ? t("noChangeset") : t("changesetLine", { id: row.entry.changeset })}</p>
          {row.entry.note !== "" ? <p>{t("noteLine", { note: row.entry.note })}</p> : null}
          <p>{row.entry.lookedAgainOn === null ? t("noLook") : t("lookedLine", { date: row.entry.lookedAgainOn })}</p>
          {row.followUpText !== null ? <p className="submission-follow">{row.followUpText}</p> : null}
          <form className="submission-form" onSubmit={submitLook} noValidate aria-label={t("lookButton", { name })}>
            <label htmlFor={`${base}-lookedAgainOn`}>{t("lookLabel")}</label>
            <input id={`${base}-lookedAgainOn`} type="text" inputMode="numeric" autoComplete="off" value={lookDay} onChange={(e) => setLookDay(e.currentTarget.value)} {...describe("lookedAgainOn")} />
            {fieldError("lookedAgainOn")}
            <p className="places-actions">
              <button type="submit">{t("lookButton", { name })}</button>
              <button type="button" onClick={() => onUnmark(row.record)}>
                {t("unmarkButton", { name })}
              </button>
            </p>
          </form>
        </>
      )}
    </li>
  );
}

/** Records what a person says they submitted to OpenStreetMap. The App cannot see OpenStreetMap. */
export function SubmissionsView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const store = useMemo(() => createSubmissionsStore(storage), [storage]);
  const today = localToday();
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [ledger, setLedger] = useState<Ledger>(() => store.read());
  const [message, setMessage] = useState("");
  const t = (key: SubmissionKey, vars?: Record<string, string | number>) => submissionText(language, key, vars);

  useEffect(() => {
    const saved = drafts.list();
    store.prune(saved.map((record) => record.id));
    setRecords(saved);
    setLedger(store.read());
  }, [drafts, store]);

  const view = useMemo(() => buildSubmissionsView(records, ledger, today, language), [records, ledger, today, language]);
  const nameOf = (record: PlaceRecord) => record.name ?? t("unnamed");

  function after(result: StoreResult, done: string) {
    setLedger(store.read());
    setMessage(result.ok ? done : result.kind === "save" ? t("saveFailed") : "");
    return result;
  }

  async function restore(file: File | undefined) {
    if (file === undefined) return;
    const parsed = parseLedgerBackup(await file.text());
    if (!parsed.ok) {
      setMessage(`${t("restoreFailed")} ${restoreFailureText(parsed.code, language)}`);
      return;
    }
    const merged = mergeRestored(store.read(), parsed.ledger, records.map((r) => r.id));
    const saved = store.replace(merged.ledger);
    setLedger(store.read());
    setMessage(saved.ok ? restoreSummaryText(merged.added, merged.replaced, merged.skipped, parsed.dropped, language) : t("saveFailed"));
  }

  const file = (kind: SubmissionFileKind) => download(submissionFile(kind, records, ledger, today, language));

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
          <p>{t("noDrafts")}</p>
          <p>
            <Link to="/places/contribute" className="submission-link">
              {t("addLink")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <section aria-labelledby="sub-summary">
            <h2 id="sub-summary">{t("summaryHeading")}</h2>
            <p data-testid="submissions-summary">{view.summaryText}</p>
            <h3>{t("nextHeading")}</h3>
            {view.next.length === 0 ? (
              <p>{t("nextNone")}</p>
            ) : (
              <ol>
                {view.next.map((record) => (
                  <li key={record.id}>{t("nextLine", { name: nameOf(record), date: record.observedOn })}</li>
                ))}
              </ol>
            )}
            {view.summary.followUps.length > 0 ? (
              <>
                <h3>{t("followHeading")}</h3>
                <p>{t("followLead")}</p>
              </>
            ) : null}
          </section>

          <section aria-labelledby="sub-list">
            <h2 id="sub-list">{t("listHeading")}</h2>
            <ul className="place-list">
              {view.rows.map((row, index) => (
                <Row
                  key={`${row.record.id}:${row.entry?.markedOn ?? ""}:${row.entry?.lookedAgainOn ?? ""}`}
                  row={row}
                  index={index}
                  today={today}
                  language={language}
                  nameOf={nameOf}
                  onMark={(record, input) => after(store.mark(record, input, today), t("didMark", { name: nameOf(record) }))}
                  onLook={(record, day) => after(store.lookAgain(record.id, day, today), t("didLook", { name: nameOf(record) }))}
                  onUnmark={(record) => void after(store.unmark(record.id), t("didUnmark", { name: nameOf(record) }))}
                />
              ))}
            </ul>
          </section>

          <section aria-labelledby="sub-files">
            <h2 id="sub-files">{t("filesHeading")}</h2>
            <p className="places-actions">
              <button type="button" onClick={() => file("csv")}>
                {t("downloadCsv")}
              </button>
              <button type="button" onClick={() => file("backup")}>
                {t("downloadBackup")}
              </button>
            </p>
            <p>{t("filesNote")}</p>
            <h3>{t("restoreHeading")}</h3>
            <label className="submission-file" htmlFor="sub-restore">
              {t("restoreLabel")}
            </label>
            <input id="sub-restore" type="file" accept=".json,application/json" onChange={(e) => void restore(e.currentTarget.files?.[0])} />
            <p>{t("restoreNote")}</p>
          </section>
        </>
      )}
    </div>
  );
}
