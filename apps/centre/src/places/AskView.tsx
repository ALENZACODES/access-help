import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createAskStore, createToldStore } from "./askStore.js";
import { askName, askSheetFile, asksCsvFile, buildAskView, draftFile, startAskId, startQuestions, toldFormFor, type AskFile } from "./askModel.js";
import { askText, type AskKey } from "./askStrings.js";
import {
  ASK_CHANNELS,
  ASK_LETTER_LANGUAGES,
  askChannelLabel,
  askIssueText,
  askLetterLanguageLabel,
  emptyAskLog,
  emptyMeasureBook,
  emptyMeasureForm,
  isAskChannel,
  isAskLetterLanguage,
  readMeasureForm,
  type AskChannel,
  type AskLetterLanguage,
  type AskLog,
  type AskStatus,
  type MeasureBook,
  type MeasureFactKey,
  type MeasureForm,
  type MeasureFormField,
  type MeasureFormIssue,
} from "./docs-bridge.js";
import { MeasureFieldErrors, MeasureFields, measureFieldProps } from "./MeasureFields.js";
import { createMeasuresStore } from "./measuresStore.js";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./measure.css";
import "./ask.css";

function download(file: AskFile) {
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
 * Drafts questions a person can put to a place about its way in, keeps their own list of the
 * times they asked, and holds what the place said apart from what they measured. The person
 * copies the words and sends them from their own account. The App sends nothing, cannot see a
 * reply, and never turns what a place said into a tag for the map.
 */
export function AskView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const asks = useMemo(() => createAskStore(storage), [storage]);
  const toldStore = useMemo(() => createToldStore(storage), [storage]);
  const measureStore = useMemo(() => createMeasuresStore(storage), [storage]);
  const today = localToday();
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [measures, setMeasures] = useState<MeasureBook>(emptyMeasureBook);
  const [told, setTold] = useState<MeasureBook>(emptyMeasureBook);
  const [log, setLog] = useState<AskLog>(emptyAskLog);
  const [chosen, setChosen] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MeasureFactKey[]>([]);
  const [channel, setChannel] = useState<AskChannel>("email");
  const [letterLanguage, setLetterLanguage] = useState<AskLetterLanguage>(language);
  const [withHints, setWithHints] = useState(true);
  const [askedOn, setAskedOn] = useState(today);
  const [askProblem, setAskProblem] = useState("");
  const [form, setForm] = useState<MeasureForm>(() => emptyMeasureForm(today));
  const [issues, setIssues] = useState<MeasureFormIssue[]>([]);
  const [toldProblem, setToldProblem] = useState("");
  const [message, setMessage] = useState("");
  const toldSummary = useRef<HTMLParagraphElement>(null);
  const t = (key: AskKey, vars?: Record<string, string | number>) => askText(language, key, vars);

  useEffect(() => {
    const saved = drafts.list();
    const ids = saved.map((record) => record.id);
    asks.prune(ids);
    toldStore.prune(ids);
    const measured = measureStore.read();
    const said = toldStore.read();
    const first = startAskId(saved);
    setRecords(saved);
    setMeasures(measured);
    setTold(said);
    setLog(asks.read());
    setChosen(first);
    if (first !== null) {
      setQuestions(startQuestions(first, measured));
      setForm(toldFormFor(first, said, localToday(), language));
    }
    // The language is read once here on purpose: changing it later must not wipe what is typed.
  }, [drafts, asks, toldStore, measureStore]);

  const data = useMemo(() => ({ records, measures, told, log }), [records, measures, told, log]);
  const view = useMemo(() => buildAskView(data, chosen, { questions, channel, letterLanguage, withHints }, today, language), [data, chosen, questions, channel, letterLanguage, withHints, today, language]);
  const detail = view.detail;

  function choose(id: string) {
    const record = records.find((entry) => entry.id === id);
    if (record === undefined) return;
    setChosen(id);
    setQuestions(startQuestions(id, measures));
    setForm(toldFormFor(id, told, today, language));
    setIssues([]);
    setAskProblem("");
    setToldProblem("");
    setMessage(t("shown", { name: askName(record, language) }));
  }

  function toggleQuestion(key: MeasureFactKey) {
    setQuestions((now) => (now.includes(key) ? now.filter((entry) => entry !== key) : [...now, key]));
  }

  function noteAsked() {
    if (detail === null) return;
    const result = asks.add({ recordId: detail.record.id, askedOn: askedOn.trim(), channel, questions }, today);
    if (!result.ok) {
      setAskProblem(result.kind === "issue" ? askIssueText(result.issue, language) : t("notSaved"));
      setMessage("");
      return;
    }
    setLog(asks.read());
    setAskProblem("");
    setMessage(t("didAsk", { name: detail.name, day: askedOn.trim() }));
  }

  function changeAsk(n: number, position: number, status: AskStatus) {
    if (!asks.setStatus(n, status, today).ok) {
      setAskProblem(t("notSaved"));
      return;
    }
    setLog(asks.read());
    setAskProblem("");
    setMessage(t("askChanged", { n: position }));
  }

  function dropAsk(n: number, position: number) {
    if (!asks.remove(n).ok) {
      setAskProblem(t("notSaved"));
      return;
    }
    setLog(asks.read());
    setAskProblem("");
    setMessage(t("askRemoved", { n: position }));
  }

  function setField(field: MeasureFormField, value: string) {
    setForm((now) => ({ ...now, [field]: value }));
  }

  function saveTold(event: FormEvent) {
    event.preventDefault();
    if (detail === null) return;
    // What a place said can come from before the person's own visit, so no seen-day is compared here.
    const result = readMeasureForm({ ...form, method: "" }, { id: detail.record.id, observedOn: "" }, today);
    if (!result.ok) {
      setIssues(result.issues);
      setToldProblem(t("problems"));
      setMessage("");
      toldSummary.current?.focus();
      return;
    }
    if (!toldStore.save(result.measures).ok) {
      setIssues([]);
      setToldProblem(t("notSaved"));
      toldSummary.current?.focus();
      return;
    }
    const after = toldStore.read();
    setTold(after);
    setForm(toldFormFor(detail.record.id, after, today, language));
    setIssues([]);
    setToldProblem("");
    setMessage(t("toldSaved", { name: detail.name }));
  }

  function removeTold() {
    if (detail === null) return;
    if (!toldStore.remove(detail.record.id).ok) {
      setToldProblem(t("notSaved"));
      return;
    }
    setTold(toldStore.read());
    setForm(emptyMeasureForm(today));
    setIssues([]);
    setToldProblem("");
    setMessage(t("toldRemoved", { name: detail.name }));
  }

  const draft = draftFile(view, today, language);
  const sheet = askSheetFile(data, view, today, language);
  const csv = asksCsvFile(data, today);

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>
      <p className="measure-note" data-testid="ask-privacy">
        {view.privacy}
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
          <p className="measure-choose">
            <label htmlFor="ask-choose">{t("chooseLabel")}</label>
            <select id="ask-choose" value={view.chosenId ?? ""} onChange={(e) => choose(e.currentTarget.value)}>
              {view.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </p>

          <section aria-labelledby="ask-place">
            <h2 id="ask-place">{t("placeHeading")}</h2>
            <p>
              <strong data-testid="ask-name">{detail.name}</strong>
            </p>
            <p data-testid="ask-place-line">{detail.placeLine}</p>
          </section>

          <section aria-labelledby="ask-questions">
            <h2 id="ask-questions">{t("questionsHeading")}</h2>
            <fieldset className="ask-choice">
              <legend>{t("questionsLegend")}</legend>
              <p className="hint">{t("questionsHelp")}</p>
              {detail.questions.map((option) => (
                <div key={option.key} className="ask-option">
                  <label>
                    <input type="checkbox" checked={questions.includes(option.key)} onChange={() => toggleQuestion(option.key)} />
                    <span>
                      {option.text}
                      {option.measured ? <span className="ask-tag"> ({t("measuredAlready")})</span> : null}
                    </span>
                  </label>
                </div>
              ))}
            </fieldset>
            <fieldset className="ask-choice">
              <legend>{t("channelLegend")}</legend>
              {ASK_CHANNELS.map((id) => (
                <div key={id} className="ask-option">
                  <label>
                    <input
                      type="radio"
                      name="ask-channel"
                      value={id}
                      checked={channel === id}
                      onChange={(e) => {
                        if (isAskChannel(e.currentTarget.value)) setChannel(e.currentTarget.value);
                      }}
                    />
                    <span>{askChannelLabel(id, language)}</span>
                  </label>
                </div>
              ))}
            </fieldset>
            <fieldset className="ask-choice">
              <legend>{t("languageLegend")}</legend>
              {ASK_LETTER_LANGUAGES.map((id) => (
                <div key={id} className="ask-option">
                  <label>
                    <input
                      type="radio"
                      name="ask-letter-language"
                      value={id}
                      checked={letterLanguage === id}
                      onChange={(e) => {
                        if (isAskLetterLanguage(e.currentTarget.value)) setLetterLanguage(e.currentTarget.value);
                      }}
                    />
                    <span>{askLetterLanguageLabel(id, language)}</span>
                  </label>
                </div>
              ))}
            </fieldset>
            <div className="ask-option">
              <label>
                <input type="checkbox" checked={withHints} onChange={(e) => setWithHints(e.currentTarget.checked)} />
                <span>{t("hintsLabel")}</span>
              </label>
            </div>
          </section>

          <section aria-labelledby="ask-draft">
            <h2 id="ask-draft">{t("draftHeading")}</h2>
            {detail.letter.subject === "" ? null : (
              <>
                <label htmlFor="ask-subject">{t("subjectLabel")}</label>
                <input id="ask-subject" className="ask-text" type="text" readOnly value={detail.letter.subject} />
              </>
            )}
            {detail.letter.text === "" ? null : (
              <>
                <label htmlFor="ask-draft-text">{t("draftLabel")}</label>
                <p id="ask-draft-help" className="hint">
                  {t("draftHelp")}
                </p>
                <textarea id="ask-draft-text" className="ask-text" readOnly rows={12} value={detail.letter.text} aria-describedby="ask-draft-help ask-draft-note" />
              </>
            )}
            <p id="ask-draft-note" data-testid="ask-draft-note">
              {detail.letterNote}
            </p>
            {draft === null ? null : (
              <p>
                <button type="button" onClick={() => download(draft)}>
                  {t("downloadDraft")}
                </button>
              </p>
            )}
          </section>

          <section aria-labelledby="ask-asked">
            <h2 id="ask-asked">{t("askedHeading")}</h2>
            <div className="measure-field ask-narrow">
              <label htmlFor="ask-asked-on">{t("askedOnLabel")}</label>
              <p id="ask-asked-on-help" className="hint">
                {t("askedOnHelp")}
              </p>
              <input id="ask-asked-on" type="text" inputMode="numeric" autoComplete="off" value={askedOn} aria-describedby={askProblem === "" ? "ask-asked-on-help" : "ask-asked-on-help ask-asked-problem"} aria-invalid={askProblem === "" ? undefined : true} onChange={(e) => setAskedOn(e.currentTarget.value)} />
            </div>
            <p id="ask-asked-problem" role="alert" className={askProblem === "" ? "measure-problem measure-problem-empty" : "measure-problem"}>
              {askProblem}
            </p>
            <p>
              <button type="button" onClick={noteAsked}>
                {t("askedButton")}
              </button>
            </p>
            <p data-testid="ask-counts">{detail.askCounts}</p>
            {detail.asks.length === 0 ? (
              <p>{t("noAsks")}</p>
            ) : (
              <ol className="ask-list" aria-label={t("asksCaption")} data-testid="ask-list">
                {detail.asks.map((row) => (
                  <li key={row.entry.n}>
                    <p>{row.line}</p>
                    <p className="places-actions">
                      {row.entry.status === "waiting" ? (
                        <>
                          <button type="button" onClick={() => changeAsk(row.entry.n, row.position, "answered")}>
                            {t("markAnswered", { n: row.position })}
                          </button>
                          <button type="button" onClick={() => changeAsk(row.entry.n, row.position, "no-reply")}>
                            {t("markNoReply", { n: row.position })}
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => changeAsk(row.entry.n, row.position, "waiting")}>
                          {t("markWaiting", { n: row.position })}
                        </button>
                      )}
                      <button type="button" onClick={() => dropAsk(row.entry.n, row.position)}>
                        {t("removeAsk", { n: row.position })}
                      </button>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="ask-told">
            <h2 id="ask-told">{t("toldHeading")}</h2>
            <p>{t("toldHelp")}</p>
            <p data-testid="ask-told-note">{view.toldNote}</p>
            <p ref={toldSummary} tabIndex={-1} role="alert" className={toldProblem === "" ? "measure-problem measure-problem-empty" : "measure-problem"}>
              {toldProblem}
            </p>
            <form onSubmit={saveTold} noValidate className="measure-form">
              <div className="measure-field">
                <label htmlFor="ask-measuredOn">{t("toldOnLabel")}</label>
                <p id="ask-measuredOn-help" className="hint">
                  {t("askedOnHelp")}
                </p>
                <input type="text" inputMode="numeric" autoComplete="off" value={form.measuredOn} onChange={(e) => setField("measuredOn", e.currentTarget.value)} {...measureFieldProps("ask", issues, "measuredOn", true)} />
                <MeasureFieldErrors prefix="ask" issues={issues} name="measuredOn" language={language} />
              </div>
              <MeasureFields prefix="ask" form={form} issues={issues} language={language} onChange={setField} />
              <p className="places-actions">
                <button type="submit">{t("saveTold")}</button>
                {detail.hasTold ? (
                  <button type="button" onClick={removeTold}>
                    {t("removeTold")}
                  </button>
                ) : null}
              </p>
            </form>
          </section>

          <section aria-labelledby="ask-compare">
            <h2 id="ask-compare">{t("compareHeading")}</h2>
            <div className="places-scroll" tabIndex={0} role="group" aria-labelledby="ask-compare">
              <table className="measure-table" data-testid="ask-compare-table">
                <caption>{t("compareCaption")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("colFact")}</th>
                    <th scope="col">{t("colMeasured")}</th>
                    <th scope="col">{t("colTold")}</th>
                    <th scope="col">{t("colNote")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.compare.map((row) => (
                    <tr key={row.key}>
                      <th scope="row">{row.fact}</th>
                      <td>{row.measured}</td>
                      <td>{row.told}</td>
                      <td>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p data-testid="ask-compare-summary">{detail.compareSummary}</p>
          </section>

          <section aria-labelledby="ask-files">
            <h2 id="ask-files">{t("filesHeading")}</h2>
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
              <Link to="/places/measure" className="measure-link">
                {t("measureLink")}
              </Link>
            </p>
            <p>{t("filesNote")}</p>
          </section>
        </>
      )}
    </div>
  );
}
