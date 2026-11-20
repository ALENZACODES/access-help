import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ONSITE_UNITS,
  answerOnsiteStep,
  beginOnsite,
  onsiteBackToReview,
  emptyMeasureBook,
  measuresFor,
  onsiteGoBack,
  onsiteGoToStep,
  onsiteIssueText,
  onsiteNudgeCount,
  onsiteNudgeLength,
  onsiteUnitLabel,
  onsiteWithUnit,
  skipOnsiteStep,
  type MeasureBook,
  type OnsiteStep,
  type OnsiteUnit,
  type OnsiteWalk,
} from "./docs-bridge.js";
import { createMeasuresStore } from "./measuresStore.js";
import { buildOnsiteScreen, fieldValue, onsiteName, startOnsiteId } from "./onsiteModel.js";
import { onsiteText, type OnsiteKey } from "./onsiteStrings.js";
import { createOnsiteStore } from "./onsiteStore.js";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./measure.css";
import "./onsite.css";

/**
 * Asks what a person can measure at a place they are at, one question at a time, with large
 * controls. A skipped question stays UNKNOWN. The answers are kept on this device as the
 * person goes, and their measures change only when they save at the end. The page never says
 * who can use the place.
 */
export function OnsiteView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const measures = useMemo(() => createMeasuresStore(storage), [storage]);
  const store = useMemo(() => createOnsiteStore(storage), [storage]);
  const today = localToday();
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [book, setBook] = useState<MeasureBook>(emptyMeasureBook);
  const [walk, setWalk] = useState<OnsiteWalk | null>(null);
  const [unit, setUnit] = useState<OnsiteUnit>("cm");
  const [chosen, setChosen] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const [savedName, setSavedName] = useState("");
  /** True while one answer is being changed from the review, so the person returns there. */
  const [editing, setEditing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const t = (key: OnsiteKey, vars?: Record<string, string | number>) => onsiteText(language, key, vars);

  useEffect(() => {
    const saved = drafts.list();
    store.prune(saved.map((record) => record.id));
    const stored = measures.read();
    const progress = store.read();
    const storedUnit = store.readUnit();
    setRecords(saved);
    setBook(stored);
    setUnit(storedUnit);
    setChosen(startOnsiteId(saved, stored));
    setWalk(progress);
    if (progress !== null) {
      if (progress.at !== "review") setTyped(fieldValue(progress, progress.at, storedUnit, language));
      const record = saved.find((entry) => entry.id === progress.recordId);
      if (record !== undefined) setMessage(onsiteText(language, "resumed", { name: onsiteName(record, language) }));
    }
    // The language is read once here on purpose: changing it later must not wipe what is typed.
  }, [drafts, measures, store]);

  const screen = useMemo(() => buildOnsiteScreen(records, book, walk, unit, today, language), [records, book, walk, unit, today, language]);

  /** Keeps the new state on the device and puts the next question, or the review, on screen. */
  function show(moved: OnsiteWalk, announce: (shown: OnsiteWalk) => string, fromReview = editing) {
    const next = fromReview ? onsiteBackToReview(moved) : moved;
    if (next.at === "review") setEditing(false);
    const kept = store.write(next);
    setWalk(next);
    setTyped(next.at === "review" ? "" : fieldValue(next, next.at, unit, language));
    setProblem(kept.ok ? "" : t("notKept"));
    setMessage(announce(next));
    setSavedName("");
    window.requestAnimationFrame(() => heading.current?.focus());
  }

  function announceFor(next: OnsiteWalk): string {
    const after = buildOnsiteScreen(records, book, next, unit, today, language);
    if (after.kind === "question") return t("moved", { position: after.position, question: after.question });
    return after.kind === "review" ? t("reviewHeading") : "";
  }

  function start() {
    const record = records.find((entry) => entry.id === chosen);
    if (record === undefined) return;
    const next = beginOnsite(record.id, today, measuresFor(book, record.id));
    setEditing(false);
    show(next, () => t("started", { name: onsiteName(record, language) }), false);
  }

  function answer(step: OnsiteStep, value: string) {
    if (walk === null) return;
    const result = answerOnsiteStep(walk, step, value);
    if (!result.ok) {
      setProblem(onsiteIssueText(result.issue, language));
      setMessage("");
      window.requestAnimationFrame(() => alert.current?.focus());
      return;
    }
    show(result.walk, announceFor);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (screen.kind !== "question") return;
    answer(screen.step, screen.control === "length" ? onsiteWithUnit(typed, unit) : typed);
  }

  function skip() {
    if (walk === null || screen.kind !== "question") return;
    show(skipOnsiteStep(walk, screen.step), announceFor);
  }

  function back() {
    if (walk === null) return;
    setEditing(false);
    show(onsiteGoBack(walk), announceFor, false);
  }

  function change(step: OnsiteStep) {
    if (walk === null) return;
    setEditing(true);
    show(onsiteGoToStep(walk, step), announceFor, false);
  }

  function chooseUnit(next: OnsiteUnit) {
    setUnit(next);
    store.writeUnit(next);
    // A kept answer on screen is shown in the new unit. A number being typed is left as typed.
    if (walk !== null && walk.at !== "review" && typed === fieldValue(walk, walk.at, unit, language)) setTyped(fieldValue(walk, walk.at, next, language));
  }

  function discard() {
    if (screen.kind === "start") return;
    store.discard();
    setWalk(null);
    setEditing(false);
    setTyped("");
    setProblem("");
    setSavedName("");
    setMessage(t("discarded", { name: screen.name }));
    window.requestAnimationFrame(() => heading.current?.focus());
  }

  function save() {
    if (screen.kind !== "review" || screen.measures === null) return;
    const written = measures.save(screen.measures);
    if (!written.ok) {
      setProblem(t(written.reason === "book-full" ? "full" : "notSaved"));
      setMessage("");
      window.requestAnimationFrame(() => alert.current?.focus());
      return;
    }
    store.discard();
    const after = measures.read();
    setBook(after);
    setWalk(null);
    setChosen(startOnsiteId(records, after));
    setProblem("");
    setSavedName(screen.name);
    setMessage(t("saved", { name: screen.name }));
    window.requestAnimationFrame(() => heading.current?.focus());
  }

  return (
    <div className="places onsite">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>
      <p ref={alert} tabIndex={-1} role="alert" className={problem === "" ? "measure-problem measure-problem-empty" : "measure-problem"}>
        {problem}
      </p>

      {screen.kind === "start" ? (
        records.length === 0 ? (
          <>
            <p>{t("noNotes")}</p>
            <p>
              <Link to="/places/contribute" className="measure-link">
                {t("addLink")}
              </Link>
            </p>
          </>
        ) : (
          <section aria-labelledby="onsite-heading">
            <h2 id="onsite-heading" ref={heading} tabIndex={-1}>
              {savedName === "" ? t("startHeading") : t("doneHeading")}
            </h2>
            {savedName === "" ? null : (
              <p>
                <Link to="/places/measure" className="measure-link">
                  {t("measureLink")}
                </Link>
              </p>
            )}
            <p className="measure-note" data-testid="onsite-note">
              {screen.note}
            </p>
            <p className="measure-choose onsite-narrow">
              <label htmlFor="onsite-choose">{t("chooseLabel")}</label>
              <select id="onsite-choose" value={chosen ?? ""} onChange={(e) => setChosen(e.currentTarget.value)}>
                {screen.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </p>
            <p className="places-actions">
              <button type="button" className="onsite-main" onClick={start}>
                {screen.options.find((option) => option.id === chosen)?.measured === true ? t("startFromSaved") : savedName === "" ? t("start") : t("again")}
              </button>
            </p>
          </section>
        )
      ) : screen.kind === "question" ? (
        <section aria-labelledby="onsite-heading">
          <h2 id="onsite-heading" ref={heading} tabIndex={-1} data-testid="onsite-position">
            {screen.position}
          </h2>
          <p data-testid="onsite-place">{t("placeLabel", { name: screen.name })}</p>
          <form onSubmit={submit} noValidate className="onsite-form">
            {screen.control === "choice" ? (
              <fieldset className="onsite-choices" aria-describedby="onsite-tip">
                <legend data-testid="onsite-question">{screen.question}</legend>
                <p id="onsite-tip" className="hint">
                  {screen.tip}
                </p>
                {screen.choices.map((choice) => (
                  <label key={choice.value} className="onsite-choice">
                    <input type="radio" name="onsite-answer" value={choice.value} checked={typed === choice.value} onChange={() => setTyped(choice.value)} />
                    <span>{choice.label}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <div className="measure-field">
                <p className="onsite-question" data-testid="onsite-question">
                  {screen.question}
                </p>
                <p id="onsite-tip" className="hint">
                  {screen.tip} {screen.range}
                </p>
                <label htmlFor="onsite-answer">{screen.control === "count" ? t("stepsLabel") : t("lengthLabel", { unit: onsiteUnitLabel(unit, language).toLowerCase() })}</label>
                <div className="onsite-stepper">
                  <button type="button" aria-label={screen.control === "count" ? t("fewer") : t("less")} onClick={() => setTyped((now) => (screen.control === "count" ? onsiteNudgeCount(now, -1) : onsiteNudgeLength(now, -1)))}>
                    −
                  </button>
                  <input id="onsite-answer" type="text" inputMode={screen.control === "count" ? "numeric" : "decimal"} autoComplete="off" value={typed} onChange={(e) => setTyped(e.currentTarget.value)} aria-describedby="onsite-tip" />
                  <button type="button" aria-label={screen.control === "count" ? t("more") : t("greater")} onClick={() => setTyped((now) => (screen.control === "count" ? onsiteNudgeCount(now, 1) : onsiteNudgeLength(now, 1)))}>
                    +
                  </button>
                </div>
                {screen.control === "length" ? (
                  <fieldset className="onsite-units">
                    <legend>{t("unitLegend")}</legend>
                    {ONSITE_UNITS.map((id) => (
                      <label key={id} className="onsite-choice">
                        <input type="radio" name="onsite-unit" value={id} checked={unit === id} onChange={() => chooseUnit(id)} />
                        <span>{onsiteUnitLabel(id, language)}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : null}
              </div>
            )}
            {screen.filledIn === "" ? null : <p data-testid="onsite-filled-in">{screen.filledIn}</p>}
            <p className="places-actions onsite-actions">
              <button type="submit" className="onsite-main">
                {t("next")}
              </button>
              <button type="button" onClick={skip}>
                {t("skip")}
              </button>
              {screen.canGoBack ? (
                <button type="button" onClick={back}>
                  {t("back")}
                </button>
              ) : null}
            </p>
          </form>
          <p data-testid="onsite-progress">{screen.progress}</p>
          <p className="places-actions">
            <button type="button" onClick={discard}>
              {t("discard")}
            </button>
          </p>
        </section>
      ) : (
        <section aria-labelledby="onsite-heading">
          <h2 id="onsite-heading" ref={heading} tabIndex={-1}>
            {t("reviewHeading")}
          </h2>
          <p data-testid="onsite-progress">{screen.progress}</p>
          <table className="measure-table" data-testid="onsite-review">
            <caption>{screen.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{t("colQuestion")}</th>
                <th scope="col">{t("colAnswer")}</th>
                <th scope="col">{t("colChange")}</th>
              </tr>
            </thead>
            <tbody>
              {screen.rows.map((row) => (
                <tr key={row.step}>
                  <th scope="row">{row.label}</th>
                  <td>{row.answer}</td>
                  <td>
                    <button type="button" aria-label={row.changeLabel} onClick={() => change(row.step)}>
                      {t("colChange")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {screen.measures === null ? (
            <p data-testid="onsite-blocked">{screen.blocked}</p>
          ) : (
            <>
              <h3>{t("changesHeading")}</h3>
              <table className="measure-table" data-testid="onsite-effects">
                <caption>{t("changesCaption")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("colFact")}</th>
                    <th scope="col">{t("colEffect")}</th>
                  </tr>
                </thead>
                <tbody>
                  {screen.effects.map((row) => (
                    <tr key={row.key}>
                      <th scope="row">{row.label}</th>
                      <td>{row.effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p data-testid="onsite-effects-summary">{screen.effectsSummary}</p>
              <p>{t("replaceNote")}</p>
            </>
          )}
          <p className="places-actions onsite-actions">
            {screen.measures === null ? null : (
              <button type="button" className="onsite-main" onClick={save}>
                {t("save")}
              </button>
            )}
            <button type="button" onClick={back}>
              {t("back")}
            </button>
            <button type="button" onClick={discard}>
              {t("discard")}
            </button>
          </p>
        </section>
      )}
    </div>
  );
}
