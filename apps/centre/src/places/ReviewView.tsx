import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlacesNav } from "./PlacesNav.js";
import { buildReviewView, reviewFile, type ReviewFileKind, type ReviewRow } from "./reviewModel.js";
import { allLicenceNotes, nextStep, reviewProgressText, stepsFor, type StepId } from "./docs-bridge.js";
import { createReviewStore, type ReviewState } from "./reviewStore.js";
import { reviewText, type ReviewKey } from "./reviewStrings.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./review.css";

function download(kind: ReviewFileKind, view: ReturnType<typeof buildReviewView>, today: string, language: Language) {
  const file = reviewFile(kind, view, today, language);
  const url = URL.createObjectURL(new Blob([file.content], { type: `${file.mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Lists what to look at in saved observations before a person submits them to OpenStreetMap themselves. */
export function ReviewView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const store = useMemo(() => createReviewStore(storage), [storage]);
  const today = localToday();
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [state, setState] = useState<ReviewState>({ ticks: {}, leftOut: [] });
  const [message, setMessage] = useState("");
  const t = (key: ReviewKey, vars?: Record<string, string | number>) => reviewText(language, key, vars);

  useEffect(() => {
    const saved = drafts.list();
    store.prune(saved.map((record) => record.id));
    setRecords(saved);
    setState(store.read());
  }, [drafts, store]);

  const view = useMemo(() => buildReviewView(records, state.leftOut, today, language), [records, state.leftOut, today, language]);
  const steps = useMemo(() => stepsFor(language), [language]);
  const licences = useMemo(() => allLicenceNotes(language), [language]);
  const upNext = nextStep(state.ticks);
  const nameOf = (record: PlaceRecord) => record.name ?? t("unnamed");

  function toggleLeftOut(row: ReviewRow, left: boolean) {
    const result = store.setLeftOut(row.record.id, left);
    setState(store.read());
    setMessage(result.ok ? t(left ? "removedFromList" : "backIn", { name: nameOf(row.record) }) : t("saveFailed"));
  }

  function toggleStep(id: StepId, title: string, done: boolean) {
    const result = store.setTick(id, done);
    setState(store.read());
    setMessage(result.ok ? t(done ? "tickedOn" : "tickedOff", { title }) : t("saveFailed"));
  }

  async function copyComment() {
    try {
      await navigator.clipboard.writeText(view.comment);
      setMessage(t("copied"));
    } catch {
      setMessage(t("copyFailed"));
    }
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
            <Link to="/places/contribute" className="review-link">
              {t("addLink")}
            </Link>
          </p>
        </>
      ) : (
        <section aria-labelledby="review-summary">
          <h2 id="review-summary">{t("summaryHeading")}</h2>
          <p data-testid="review-summary">{view.summary}</p>
          <ul className="place-list">
            {view.rows.map((row) => (
              <li key={row.record.id} className="review-record" data-left-out={row.leftOut ? "true" : "false"}>
                <h3>{t("recordHeading", { name: nameOf(row.record) })}</h3>
                <p>
                  {t("meta", {
                    status: t(`status.${row.record.wheelchair}` as ReviewKey),
                    licence: row.record.licence,
                    date: row.record.observedOn,
                  })}
                </p>
                {row.notes.length === 0 ? <p>{t("nothingToLook")}</p> : null}
                {row.notes.map((group) => (
                  <div key={group.severity}>
                    <p className={`review-group-label review-group-${group.severity}`}>{t(`group.${group.severity}` as ReviewKey)}</p>
                    <ul>
                      {group.texts.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {row.leftOut ? <p>{t("leftOutNote")}</p> : !row.review.canSubmit ? <p>{t("blockedNote")}</p> : null}
                <label className="review-check">
                  <input type="checkbox" checked={row.leftOut} onChange={(event) => toggleLeftOut(row, event.currentTarget.checked)} />
                  <span>{t("leaveOut", { name: nameOf(row.record) })}</span>
                </label>
              </li>
            ))}
          </ul>
          <p>{view.included.length === 0 ? t("includedNone") : t("includedCount", { count: view.included.length })}</p>
        </section>
      )}

      <section aria-labelledby="review-steps">
        <h2 id="review-steps">{t("stepsHeading")}</h2>
        <p>{t("stepsLead")}</p>
        <p data-testid="review-progress">{reviewProgressText(state.ticks, language)}</p>
        <ol className="review-steps">
          {steps.map((step) => (
            <li key={step.id} aria-current={upNext === step.id ? "step" : undefined}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              {view.heldBackSteps.includes(step.id) && records.length > 0 ? <p className="review-held">{t("heldBackFlag")}</p> : null}
              <label className="review-check">
                <input type="checkbox" checked={state.ticks[step.id] === true} onChange={(event) => toggleStep(step.id, step.title, event.currentTarget.checked)} />
                <span>{t("stepTick", { title: step.title })}</span>
              </label>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="review-licences">
        <h2 id="review-licences">{t("licenceHeading")}</h2>
        <p>{t("licenceLead")}</p>
        <dl className="review-licence">
          {licences.map((note) => (
            <div key={note.id}>
              <dt>{note.name}</dt>
              <dd>{note.summary}</dd>
              <dd>{note.whatItMeans}</dd>
              <dd>{note.whatYouDo}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="review-changeset">
        <h2 id="review-changeset">{t("changesetHeading")}</h2>
        <p>{t("changesetLead")}</p>
        {view.comment === "" ? (
          <p>{t("changesetNone")}</p>
        ) : (
          <>
            <label htmlFor="review-comment">{t("changesetLabel")}</label>
            <textarea id="review-comment" className="review-text" readOnly rows={3} value={view.comment} />
            <p>
              <button type="button" onClick={() => void copyComment()}>
                {t("copyComment")}
              </button>
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="review-tags">
        <h2 id="review-tags">{t("tagsHeading")}</h2>
        <p>{t("tagsLead")}</p>
        {view.included.length === 0 ? (
          <p>{t("includedNone")}</p>
        ) : (
          <>
            <label htmlFor="review-tag-text">{t("tagsLabel")}</label>
            <textarea id="review-tag-text" className="review-text" readOnly rows={12} value={view.tags} />
          </>
        )}
      </section>

      {records.length > 0 ? (
        <section aria-labelledby="review-download">
          <h2 id="review-download">{t("downloadHeading")}</h2>
          <p className="places-actions">
            <button type="button" disabled={view.included.length === 0} onClick={() => download("handoff", view, today, language)}>
              {t("downloadDraft")}
            </button>
            <button type="button" onClick={() => download("issues", view, today, language)}>
              {t("downloadIssues")}
            </button>
          </p>
          <p>{t("downloadNote")}</p>
        </section>
      ) : null}
    </div>
  );
}
