import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PlacesNav } from "./PlacesNav.js";
import { buildImportView, saveImport, savedSheetFile, templateFile, visibleLines, type ImportFile, type ImportView as View } from "./importModel.js";
import { importText, type ImportKey } from "./importStrings.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./import.css";

function download(file: ImportFile) {
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
 * Reads a sheet of a person's own observations on this device, shows what it found, and saves
 * the good lines to their drafts only after they confirm. Nothing is uploaded.
 */
export function ImportView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const today = localToday();
  const [saved, setSaved] = useState<PlaceRecord[]>([]);
  const [pasted, setPasted] = useState("");
  const [fileText, setFileText] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const t = (key: ImportKey, vars?: Record<string, string | number>) => importText(language, key, vars);

  useEffect(() => setSaved(drafts.list()), [drafts]);

  const view: View | null = useMemo(() => (sheet === null ? null : buildImportView(sheet, saved, today, language)), [sheet, saved, today, language]);

  useEffect(() => {
    if (sheet !== null) resultRef.current?.focus();
  }, [sheet]);

  async function chooseFile(file: File | undefined) {
    if (file === undefined) {
      setFileText(null);
      return;
    }
    try {
      setFileText(await file.text());
      setMessage("");
    } catch {
      setFileText(null);
      setMessage(t("readFailed"));
    }
  }

  function read(event: FormEvent) {
    event.preventDefault();
    const text = fileText ?? (pasted.trim() === "" ? null : pasted);
    if (text === null) {
      setMessage(t("nothingToRead"));
      return;
    }
    setMessage("");
    setDone(false);
    setConsent(false);
    setConsentError(false);
    setSheet(text);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (view === null || view.kind !== "ready") return;
    if (!consent) {
      setConsentError(true);
      return;
    }
    const outcome = saveImport(drafts, view.plan);
    setSaved(drafts.list());
    if (outcome.kind === "failed") {
      setMessage(t("saveFailed"));
      return;
    }
    setMessage(t(outcome.kind === "saved" ? "saved" : "savedPartly", { count: outcome.count }));
    setDone(true);
  }

  const lines = view !== null && view.kind === "ready" ? visibleLines(view.lines, onlyProblems) : [];

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>

      <section aria-labelledby="imp-columns">
        <h2 id="imp-columns">{t("columnsHeading")}</h2>
        <p>{t("columnsBody")}</p>
        <p className="places-actions">
          <button type="button" onClick={() => download(templateFile(today, language))}>
            {t("templateButton")}
          </button>
          {saved.length > 0 ? (
            <button type="button" onClick={() => download(savedSheetFile(saved, today, language))}>
              {t("mySheetButton")}
            </button>
          ) : null}
        </p>
      </section>

      <form className="import-form" onSubmit={read} noValidate>
        <label htmlFor="imp-file">{t("fileLabel")}</label>
        <input id="imp-file" type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void chooseFile(e.currentTarget.files?.[0])} />
        <label htmlFor="imp-paste">{t("pasteLabel")}</label>
        <textarea id="imp-paste" rows={6} spellCheck={false} value={pasted} onChange={(e) => setPasted(e.currentTarget.value)} />
        <p>
          <button type="submit">{t("checkButton")}</button>
        </p>
      </form>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      {done ? (
        <p>
          {t("afterSave")}{" "}
          <Link to="/places/check" className="import-link">
            {t("checkLink")}
          </Link>
        </p>
      ) : null}

      {view !== null && view.kind === "problem" ? (
        <section aria-labelledby="imp-result">
          <h2 id="imp-result" ref={resultRef} tabIndex={-1}>
            {t("problemHeading")}
          </h2>
          <ul>
            {view.messages.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {view !== null && view.kind === "ready" ? (
        <section aria-labelledby="imp-result">
          <h2 id="imp-result" ref={resultRef} tabIndex={-1}>
            {t("resultHeading")}
          </h2>
          <p data-testid="import-summary">{view.summary}</p>
          <ul>
            {view.sheetNotes.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>

          {done ? null : view.saveCount === 0 ? (
            <p>{t("nothingToSave")}</p>
          ) : (
            <form onSubmit={save} noValidate>
              <label className="import-toggle" htmlFor="imp-consent">
                <input
                  id="imp-consent"
                  type="checkbox"
                  checked={consent}
                  aria-invalid={consentError ? true : undefined}
                  aria-describedby={consentError ? "imp-consent-error" : undefined}
                  onChange={(e) => {
                    setConsent(e.currentTarget.checked);
                    setConsentError(false);
                  }}
                />
                {t("consentLabel")}
              </label>
              {consentError ? (
                <p id="imp-consent-error" className="field-error" role="alert">
                  {t("consentError")}
                </p>
              ) : null}
              <p>
                <button type="submit">{t("saveButton", { count: view.saveCount })}</button>
              </p>
            </form>
          )}

          <h3>{t("linesHeading")}</h3>
          <label className="import-toggle" htmlFor="imp-only">
            <input id="imp-only" type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.currentTarget.checked)} />
            {t("showOnlyProblems")}
          </label>
          {lines.length === 0 ? (
            <p>{t("noProblemLines")}</p>
          ) : (
            <ul className="place-list">
              {lines.map((line) => (
                <li key={line.line} className="import-line" data-action={line.action}>
                  <h4>
                    {t("lineLabel", { line: line.line })}
                    {" · "}
                    {line.name ?? t("unnamed")}
                  </h4>
                  <p className="import-action">{line.actionLabel}</p>
                  {line.status !== null ? <p>{t("statusLine", { status: line.status })}</p> : null}
                  {line.provenance !== null ? <p>{line.provenance}</p> : null}
                  {line.changed.length > 0 ? <p>{t("changedLine", { fields: line.changed.join(", ") })}</p> : null}
                  {line.problems.length + line.notes.length > 0 ? (
                    <ul>
                      {[...line.problems, ...line.notes].map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
