import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  MEASURE_METHODS,
  emptyMeasureBook,
  emptyMeasureForm,
  readMeasureForm,
  type MeasureBook,
  type MeasureForm,
  type MeasureFormField,
  type MeasureFormIssue,
} from "./docs-bridge.js";
import { MeasureFieldErrors, MeasureFields, measureFieldProps } from "./MeasureFields.js";
import { buildMeasureView, formFor, measureSheetFile, measuresCsvFile, startMeasureId, type MeasureFile } from "./measureModel.js";
import { measureText, type MeasureKey } from "./measureStrings.js";
import { createMeasuresStore } from "./measuresStore.js";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./measure.css";

function download(file: MeasureFile) {
  const url = URL.createObjectURL(new Blob([file.content], { type: `${file.mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const METHOD_KEY = { tape: "methodTape", estimate: "methodEstimate" } as const;

/**
 * Records what a person measured at one of their own observations: steps, the door, a ramp
 * and the wheelchair toilet. The measures sit beside the observation and never change it, and
 * the page never says who can use the place. A fact nobody measured reads UNKNOWN.
 */
export function MeasureView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const store = useMemo(() => createMeasuresStore(storage), [storage]);
  const today = localToday();
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [book, setBook] = useState<MeasureBook>(emptyMeasureBook);
  const [chosen, setChosen] = useState<string | null>(null);
  const [form, setForm] = useState<MeasureForm>(() => emptyMeasureForm(today));
  const [issues, setIssues] = useState<MeasureFormIssue[]>([]);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const summary = useRef<HTMLParagraphElement>(null);
  const t = (key: MeasureKey, vars?: Record<string, string | number>) => measureText(language, key, vars);

  useEffect(() => {
    const saved = drafts.list();
    store.prune(saved.map((record) => record.id));
    const stored = store.read();
    const first = startMeasureId(saved, stored);
    setRecords(saved);
    setBook(stored);
    setChosen(first);
    const record = saved.find((entry) => entry.id === first);
    if (record !== undefined) setForm(formFor(record, stored, localToday(), language));
    // The language is read once here on purpose: changing it later must not wipe what is typed.
  }, [drafts, store]);

  const view = useMemo(() => buildMeasureView(records, book, chosen, language), [records, book, chosen, language]);
  const detail = view.detail;

  function choose(id: string) {
    const record = records.find((entry) => entry.id === id);
    if (record === undefined) return;
    setChosen(id);
    setForm(formFor(record, book, today, language));
    setIssues([]);
    setProblem("");
    setMessage(t("shown", { name: buildMeasureView(records, book, id, language).detail?.name ?? "" }));
  }

  function set(field: MeasureFormField, value: string) {
    setForm((now) => ({ ...now, [field]: value }));
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (detail === null) return;
    const result = readMeasureForm(form, { id: detail.record.id, observedOn: detail.record.observedOn }, today);
    if (!result.ok) {
      setIssues(result.issues);
      setProblem(t("problems"));
      setMessage("");
      summary.current?.focus();
      return;
    }
    const written = store.save(result.measures);
    if (!written.ok) {
      setIssues([]);
      setProblem(t(written.reason === "book-full" ? "full" : "notSaved"));
      summary.current?.focus();
      return;
    }
    const after = store.read();
    setBook(after);
    setForm(formFor(detail.record, after, today, language));
    setIssues([]);
    setProblem("");
    setMessage(t("saved", { name: detail.name }));
  }

  function remove() {
    if (detail === null) return;
    if (!store.remove(detail.record.id).ok) {
      setProblem(t("notSaved"));
      return;
    }
    setBook(store.read());
    setForm(emptyMeasureForm(today));
    setIssues([]);
    setProblem("");
    setMessage(t("removed", { name: detail.name }));
  }

  const csv = measuresCsvFile(records, book, today);
  const sheet = measureSheetFile(view, language);

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>
      <p className="measure-note" data-testid="measure-no-judgment">
        {view.noJudgment}
      </p>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      {detail === null ? (
        <>
          <p>{t("noNotes")}</p>
          <p>
            <Link to="/places/contribute" className="measure-link">
              {t("addLink")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <p data-testid="measure-counts">{view.counts}</p>
          <p className="measure-choose">
            <label htmlFor="measure-choose">{t("chooseLabel")}</label>
            <select id="measure-choose" value={view.chosenId ?? ""} onChange={(e) => choose(e.currentTarget.value)}>
              {view.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </p>

          <section aria-labelledby="measure-place">
            <h2 id="measure-place">{t("placeHeading")}</h2>
            <p>
              <strong data-testid="measure-name">{detail.name}</strong>
            </p>
            <p data-testid="measure-place-line">{detail.placeLine}</p>
          </section>

          <section aria-labelledby="measure-form-heading">
            <h2 id="measure-form-heading">{t("formHeading")}</h2>
            <p>{t("formHelp")}</p>
            <p ref={summary} tabIndex={-1} role="alert" className={problem === "" ? "measure-problem measure-problem-empty" : "measure-problem"}>
              {problem}
            </p>
            <form onSubmit={save} noValidate className="measure-form">
              <div className="measure-field">
                <label htmlFor="measure-measuredOn">{t("measuredOn")}</label>
                <p id="measure-measuredOn-help" className="hint">
                  {t("measuredOnHelp")}
                </p>
                <input type="text" inputMode="numeric" autoComplete="off" value={form.measuredOn} onChange={(e) => set("measuredOn", e.currentTarget.value)} {...measureFieldProps("measure", issues, "measuredOn", true)} />
                <MeasureFieldErrors prefix="measure" issues={issues} name="measuredOn" language={language} />
              </div>
              <div className="measure-field">
                <label htmlFor="measure-method">{t("method")}</label>
                <select value={form.method} onChange={(e) => set("method", e.currentTarget.value)} {...measureFieldProps("measure", issues, "method", false)}>
                  <option value="">{t("methodUnknown")}</option>
                  {MEASURE_METHODS.map((id) => (
                    <option key={id} value={id}>
                      {t(METHOD_KEY[id])}
                    </option>
                  ))}
                </select>
              </div>
              <MeasureFields prefix="measure" form={form} issues={issues} language={language} onChange={set} />
              <p className="places-actions">
                <button type="submit">{t("save")}</button>
                {detail.saved === null ? null : (
                  <button type="button" onClick={remove}>
                    {t("remove")}
                  </button>
                )}
              </p>
            </form>
          </section>

          <section aria-labelledby="measure-result">
            <h2 id="measure-result">{t("resultHeading")}</h2>
            {detail.saved === null ? (
              <p>{t("noMeasures")}</p>
            ) : (
              <>
                <p data-testid="measure-measured-line">{detail.saved.measuredLine}</p>
                <table className="measure-table" data-testid="measure-facts">
                  <caption>{t("factsCaption")}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t("colFact")}</th>
                      <th scope="col">{t("colValue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.saved.facts.map((fact) => (
                      <tr key={fact.key}>
                        <th scope="row">{fact.label}</th>
                        <td>{fact.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.saved.stillUnknown === "" ? null : <p data-testid="measure-still-unknown">{detail.saved.stillUnknown}</p>}
                {detail.saved.description === "" ? null : (
                  <>
                    <label htmlFor="measure-description">{t("descriptionLabel")}</label>
                    <textarea id="measure-description" className="measure-text" readOnly rows={4} value={detail.saved.description} aria-describedby="measure-description-note" />
                  </>
                )}
                <p id="measure-description-note">{detail.saved.descriptionNote}</p>
                {detail.saved.tags === "" ? (
                  <p>{t("noTags")}</p>
                ) : (
                  <>
                    <label htmlFor="measure-tags">{t("tagsLabel")}</label>
                    <p id="measure-tags-help" className="hint">
                      {t("tagsHelp")}
                    </p>
                    <textarea id="measure-tags" className="measure-text" readOnly rows={5} value={detail.saved.tags} aria-describedby="measure-tags-help" />
                  </>
                )}
                <p>{view.tagsNote}</p>
              </>
            )}
          </section>

          <section aria-labelledby="measure-files">
            <h2 id="measure-files">{t("filesHeading")}</h2>
            <p className="places-actions">
              {sheet === null ? null : (
                <button type="button" onClick={() => download(sheet)}>
                  {t("downloadSheet")}
                </button>
              )}
              {csv === null ? null : (
                <button type="button" onClick={() => download(csv)}>
                  {t("downloadCsv")}
                </button>
              )}
              <Link to="/places/tags" className="measure-link">
                {t("tagsLink")}
              </Link>
            </p>
            <p>{t("filesNote")}</p>
          </section>
        </>
      )}
    </div>
  );
}
