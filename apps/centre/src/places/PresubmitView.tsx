import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { presubmitTidyRecord } from "./docs-bridge.js";
import { PlacesNav } from "./PlacesNav.js";
import { buildPresubmitView, presubmitFile, visibleRows, type PresubmitFileKind, type PresubmitRow } from "./presubmitModel.js";
import { presubmitText, type PresubmitKey } from "./presubmitStrings.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./presubmit.css";

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

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Looks over saved observations for slips before a person submits them to OpenStreetMap
 * themselves. The App cannot see OpenStreetMap and uploads nothing.
 */
export function PresubmitView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const today = localToday();
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [comment, setComment] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const t = (key: PresubmitKey, vars?: Record<string, string | number>) => presubmitText(language, key, vars);

  useEffect(() => setRecords(drafts.list()), [drafts]);

  const view = useMemo(() => buildPresubmitView(records, today, language), [records, today, language]);
  const rows = visibleRows(view.rows, onlyOpen);
  const nameOf = (record: PlaceRecord) => record.name ?? t("unnamed");

  async function copy(text: string) {
    setMessage((await copyText(text)) ? t("copied") : t("copyFailed"));
  }

  function tidy(record: PlaceRecord) {
    const result = drafts.add(presubmitTidyRecord(record));
    setRecords(drafts.list());
    setMessage(result.ok ? t("didTidy", { name: nameOf(record) }) : t("saveFailed"));
  }

  const file = (kind: PresubmitFileKind) => download(presubmitFile(kind, view.report, today, language));

  function renderRow(row: PresubmitRow, index: number) {
    const name = nameOf(row.record);
    const fieldName = (field: "name" | "source") => t(field === "name" ? "tidyName" : "tidySource");
    return (
      <li key={row.record.id} className="check-row" data-group={row.group}>
        <h3>{name}</h3>
        <p>
          <span className="check-group" data-group={row.group}>
            {row.groupLabel}
          </span>
        </p>
        <p>{t("meta", { date: row.record.observedOn, source: row.record.source, licence: row.record.licence })}</p>
        {row.findings.length > 0 ? (
          <ul>
            {row.findings.map((text, i) => (
              <li key={`${index}-${i}`}>{text}</li>
            ))}
          </ul>
        ) : null}
        <h4>{t("tagsHeading")}</h4>
        {row.tagBlock === "" ? (
          <p>{t("noTags")}</p>
        ) : (
          <>
            <pre className="check-tags" tabIndex={0} aria-label={t("tagsHeading")}>
              {row.tagBlock}
            </pre>
            <p>
              <button type="button" onClick={() => void copy(row.tagBlock)}>
                {t("copyTags", { name })}
              </button>
            </p>
          </>
        )}
        {row.tidy.length > 0 ? (
          <>
            <h4>{t("tidyHeading")}</h4>
            <ul>
              {row.tidy.map((change) => (
                <li key={change.field}>{t("tidyLine", { field: fieldName(change.field), before: change.before, after: change.after })}</li>
              ))}
            </ul>
            <p>
              <button type="button" onClick={() => tidy(row.record)}>
                {t("tidyButton", { name })}
              </button>
            </p>
          </>
        ) : null}
      </li>
    );
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
          <p>{t("noDrafts")}</p>
          <p>
            <Link to="/places/contribute" className="check-link">
              {t("addLink")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <section aria-labelledby="chk-summary">
            <h2 id="chk-summary">{view.report.counts.total > 0 ? t("placesHeading") : t("title")}</h2>
            <p data-testid="check-summary">{view.summaryText}</p>
            <ul>
              {view.licenceLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="chk-steps">
            <h2 id="chk-steps">{t("stepsHeading")}</h2>
            <ol>
              {view.steps.map((step) => (
                <li key={step.id}>
                  <strong>{step.title}</strong>
                  <br />
                  {step.detail}
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="chk-words" className="check-words">
            <h2 id="chk-words">{t("wordsHeading")}</h2>
            <p>{t("wordsLead")}</p>
            <label htmlFor="chk-comment">{t("commentLabel")}</label>
            <textarea id="chk-comment" rows={2} value={comment ?? view.comment} onChange={(e) => setComment(e.currentTarget.value)} />
            <p>
              <button type="button" onClick={() => void copy(comment ?? view.comment)}>
                {t("copyField", { what: t("commentLabel") })}
              </button>
            </p>
            <label htmlFor="chk-source">{t("sourceLabel")}</label>
            <textarea id="chk-source" rows={2} value={source ?? view.source} onChange={(e) => setSource(e.currentTarget.value)} />
            <p>
              <button type="button" onClick={() => void copy(source ?? view.source)}>
                {t("copyField", { what: t("sourceLabel") })}
              </button>
            </p>
          </section>

          <section aria-labelledby="chk-list">
            <h2 id="chk-list">{t("placesHeading")}</h2>
            <label className="check-toggle">
              <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.currentTarget.checked)} />
              {t("onlyOpen")}
            </label>
            {rows.length === 0 ? (
              <p>{t("noneShown")}</p>
            ) : (
              <ul className="place-list">
                {rows.map((row, index) => renderRow(row, index))}
              </ul>
            )}
          </section>

          <section aria-labelledby="chk-files">
            <h2 id="chk-files">{t("filesHeading")}</h2>
            <p className="places-actions">
              <button type="button" onClick={() => file("txt")}>
                {t("downloadText")}
              </button>
              <button type="button" onClick={() => file("csv")}>
                {t("downloadCsv")}
              </button>
            </p>
            <p>{t("filesNote")}</p>
          </section>
        </>
      )}
    </div>
  );
}
