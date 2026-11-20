import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createToldStore } from "./askStore.js";
import {
  MATCH_DOOR_NEEDS,
  MATCH_MAX_SET_NAME,
  emptyMatchCriteria,
  emptyMatchForm,
  emptyMatchSetBook,
  emptyMeasureBook,
  findMatchSet,
  matchFormFrom,
  matchIssueText,
  matchSetIssueText,
  readMatchForm,
  type MatchCriteria,
  type MatchField,
  type MatchForm,
  type MatchIssue,
  type MatchSetBook,
  type MeasureBook,
} from "./docs-bridge.js";
import { buildMatchView, matchFile, type MatchFile } from "./matchModel.js";
import { createMatchStore } from "./matchStore.js";
import { matchPageText, type MatchKey } from "./matchStrings.js";
import { createMeasuresStore } from "./measuresStore.js";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./measure.css";
import "./match.css";

function download(file: MatchFile) {
  const url = URL.createObjectURL(new Blob([file.content], { type: `${file.mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const DOOR_KEY = { any: "doorAny", "not-by-hand": "doorNotByHand", "by-itself": "doorByItself" } as const;

/**
 * Looks through a person's measured places with numbers they set themselves. Each place is
 * within every number, outside one, or cannot be said because a fact is UNKNOWN. The page
 * fills in no number, holds no standard, and never says who can use a place.
 */
export function MatchView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const store = useMemo(() => createMatchStore(storage), [storage]);
  const today = localToday();
  const decimal = language === "fr" ? "," : ".";
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [measures, setMeasures] = useState<MeasureBook>(emptyMeasureBook);
  const [told, setTold] = useState<MeasureBook>(emptyMeasureBook);
  const [criteria, setCriteria] = useState<MatchCriteria>(emptyMatchCriteria);
  const [form, setForm] = useState<MatchForm>(emptyMatchForm);
  const [issues, setIssues] = useState<MatchIssue[]>([]);
  const [sets, setSets] = useState<MatchSetBook>(emptyMatchSetBook);
  const [chosenSet, setChosenSet] = useState("");
  const [setName, setSetName] = useState("");
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const [setProblemText, setSetProblemText] = useState("");
  const summary = useRef<HTMLParagraphElement>(null);
  const t = (key: MatchKey, vars?: Record<string, string | number>) => matchPageText(language, key, vars);

  useEffect(() => {
    const current = store.current();
    const book = store.sets();
    setRecords(drafts.list());
    setMeasures(createMeasuresStore(storage).read());
    setTold(createToldStore(storage).read());
    setCriteria(current);
    setForm(matchFormFrom(current, language === "fr" ? "," : "."));
    setSets(book);
    setChosenSet(book.sets[0]?.id ?? "");
    // The language is read once here on purpose: changing it later must not wipe what is typed.
  }, [drafts, store, storage]);

  const data = useMemo(() => ({ records, measures, told }), [records, measures, told]);
  const view = useMemo(() => buildMatchView(data, criteria, language), [data, criteria, language]);

  function set<K extends keyof MatchForm>(field: K, value: MatchForm[K]) {
    setForm((now) => ({ ...now, [field]: value }));
  }

  /** Reads the form. On a problem, shows it and returns null without changing the numbers in use. */
  function readNumbers(): MatchCriteria | null {
    const result = readMatchForm(form);
    if (!result.ok) {
      setIssues(result.issues);
      setProblem(t("problems"));
      setMessage("");
      summary.current?.focus();
      return null;
    }
    setIssues([]);
    setProblem("");
    return result.criteria;
  }

  function apply(next: MatchCriteria, said: (counts: string) => string) {
    const saved = store.setCurrent(next);
    setCriteria(next);
    setForm(matchFormFrom(next, decimal));
    setProblem(saved.ok ? "" : t("notSaved"));
    setMessage(said(buildMatchView(data, next, language).counts));
  }

  function look(event: FormEvent) {
    event.preventDefault();
    const next = readNumbers();
    if (next !== null) apply(next, (counts) => t("looked", { counts }));
  }

  function clearNumbers() {
    setIssues([]);
    apply(emptyMatchCriteria(), () => t("cleared"));
  }

  function saveAsSet() {
    const next = readNumbers();
    if (next === null) return;
    const result = store.saveSet(setName, next);
    if (!result.ok) {
      setSetProblemText(result.kind === "issue" ? matchSetIssueText(result.issue, language) : t("notSaved"));
      return;
    }
    const book = store.sets();
    setSets(book);
    setChosenSet(result.id);
    setSetProblemText("");
    setSetName("");
    apply(next, () => t("setSaved", { name: findMatchSet(book, result.id)?.name ?? "" }));
  }

  function useSet() {
    const found = findMatchSet(sets, chosenSet);
    if (found === null) return;
    setIssues([]);
    setSetProblemText("");
    apply(found.criteria, (counts) => t("setUsed", { name: found.name, counts }));
  }

  function removeSet() {
    const found = findMatchSet(sets, chosenSet);
    if (found === null) return;
    if (!store.removeSet(found.id).ok) {
      setSetProblemText(t("notSaved"));
      return;
    }
    const book = store.sets();
    setSets(book);
    setChosenSet(book.sets[0]?.id ?? "");
    setSetProblemText("");
    setMessage(t("setRemoved", { name: found.name }));
  }

  function fieldProps(name: MatchField, help: string) {
    const mine = issues.filter((issue) => issue.field === name);
    return { id: `match-${name}`, "aria-invalid": mine.length > 0 ? (true as const) : undefined, "aria-describedby": mine.length > 0 ? `${help} match-${name}-error` : help };
  }

  function errors(name: MatchField) {
    const mine = issues.filter((issue) => issue.field === name);
    if (mine.length === 0) return null;
    return (
      <p id={`match-${name}-error`} className="measure-error">
        {mine.map((issue) => matchIssueText(issue, language)).join(" ")}
      </p>
    );
  }

  function lengthField(name: "maxStepHeight" | "minDoorWidth" | "minToiletDoor", label: MatchKey) {
    return (
      <div className="measure-field">
        <label htmlFor={`match-${name}`}>{t(label)}</label>
        <p id={`match-${name}-help`} className="hint">
          {t("lengthHelp")}
        </p>
        <input type="text" inputMode="decimal" autoComplete="off" value={form[name]} onChange={(e) => set(name, e.currentTarget.value)} {...fieldProps(name, `match-${name}-help`)} />
        {errors(name)}
      </div>
    );
  }

  function tick(name: "rampInstead" | "toilet" | "countTold", label: MatchKey) {
    return (
      <div className="match-option">
        <label>
          <input type="checkbox" checked={form[name]} onChange={(e) => set(name, e.currentTarget.checked)} />
          <span>{t(label)}</span>
        </label>
      </div>
    );
  }

  const text = matchFile("txt", view, criteria, today, language);
  const csv = matchFile("csv", view, criteria, today, language);

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>
      <p className="measure-note" data-testid="match-yours">
        {view.yours}
      </p>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      {records.length === 0 ? (
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
          <section aria-labelledby="match-form-heading">
            <h2 id="match-form-heading">{t("formHeading")}</h2>
            <p>{t("formHelp")}</p>
            <p ref={summary} tabIndex={-1} role="alert" className={problem === "" ? "measure-problem measure-problem-empty" : "measure-problem"}>
              {problem}
            </p>
            <form onSubmit={look} noValidate className="measure-form">
              <div className="measure-field">
                <label htmlFor="match-maxSteps">{t("maxSteps")}</label>
                <p id="match-maxSteps-help" className="hint">
                  {t("maxStepsHelp")}
                </p>
                <input type="text" inputMode="numeric" autoComplete="off" value={form.maxSteps} onChange={(e) => set("maxSteps", e.currentTarget.value)} {...fieldProps("maxSteps", "match-maxSteps-help")} />
                {errors("maxSteps")}
              </div>
              {lengthField("maxStepHeight", "maxStepHeight")}
              {tick("rampInstead", "rampInstead")}
              {lengthField("minDoorWidth", "minDoorWidth")}
              <div className="measure-field">
                <label htmlFor="match-door">{t("door")}</label>
                <select id="match-door" value={form.door} onChange={(e) => set("door", e.currentTarget.value)}>
                  {MATCH_DOOR_NEEDS.map((id) => (
                    <option key={id} value={id}>
                      {t(DOOR_KEY[id])}
                    </option>
                  ))}
                </select>
              </div>
              {tick("toilet", "toilet")}
              {lengthField("minToiletDoor", "minToiletDoor")}
              {tick("countTold", "countTold")}
              <p className="places-actions">
                <button type="submit">{t("look")}</button>
                <button type="button" onClick={clearNumbers}>
                  {t("clear")}
                </button>
              </p>
            </form>
          </section>

          <section aria-labelledby="match-sets">
            <h2 id="match-sets">{t("setsHeading")}</h2>
            <p>{t("setsHelp")}</p>
            {sets.sets.length === 0 ? (
              <p>{t("noSets")}</p>
            ) : (
              <div className="measure-field match-narrow">
                <label htmlFor="match-set-choose">{t("setChoose")}</label>
                <select id="match-set-choose" value={chosenSet} onChange={(e) => setChosenSet(e.currentTarget.value)}>
                  {sets.sets.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
                <p className="places-actions">
                  <button type="button" onClick={useSet}>
                    {t("useSet")}
                  </button>
                  <button type="button" onClick={removeSet}>
                    {t("removeSet")}
                  </button>
                </p>
              </div>
            )}
            <div className="measure-field match-narrow">
              <label htmlFor="match-set-name">{t("setName")}</label>
              <input id="match-set-name" type="text" autoComplete="off" maxLength={MATCH_MAX_SET_NAME} value={setName} aria-invalid={setProblemText === "" ? undefined : true} aria-describedby={setProblemText === "" ? undefined : "match-set-problem"} onChange={(e) => setSetName(e.currentTarget.value)} />
            </div>
            <p id="match-set-problem" role="alert" className={setProblemText === "" ? "measure-problem measure-problem-empty" : "measure-problem"}>
              {setProblemText}
            </p>
            <p>
              <button type="button" onClick={saveAsSet}>
                {t("saveSet")}
              </button>
            </p>
          </section>

          <section aria-labelledby="match-results">
            <h2 id="match-results">{t("resultsHeading")}</h2>
            {!view.hasCriteria ? (
              <p data-testid="match-set-first">{t("setFirst")}</p>
            ) : (
              <>
                <h3>{t("numbersHeading")}</h3>
                <ul data-testid="match-numbers">
                  {view.numbers.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {view.toldNote === "" ? null : <p data-testid="match-told-note">{view.toldNote}</p>}
                <p data-testid="match-counts">{view.counts}</p>
                {view.tally.length === 0 ? null : (
                  <>
                    <h3>{t("tallyHeading")}</h3>
                    <ul data-testid="match-tally">
                      {view.tally.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <p className="places-actions">
                      <Link to="/places/measure" className="measure-link">
                        {t("measureLink")}
                      </Link>
                      <Link to="/places/ask" className="measure-link">
                        {t("askLink")}
                      </Link>
                    </p>
                  </>
                )}
                {view.groups.map((group) => (
                  <div key={group.overall} className="match-group" data-testid={`match-group-${group.overall}`}>
                    <h3>{group.heading}</h3>
                    <ul className="match-places">
                      {group.places.map((place) => (
                        <li key={place.id}>
                          <p>
                            <strong>{place.name}</strong>
                          </p>
                          <p className="hint">{place.placeLine}</p>
                          <ul>
                            {place.checks.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                          {place.unknown === "" ? null : <p>{place.unknown}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </section>

          <section aria-labelledby="match-files">
            <h2 id="match-files">{t("filesHeading")}</h2>
            <p className="places-actions">
              {text === null ? null : (
                <button type="button" onClick={() => download(text)}>
                  {t("downloadText")}
                </button>
              )}
              {csv === null ? null : (
                <button type="button" onClick={() => download(csv)}>
                  {t("downloadCsv")}
                </button>
              )}
            </p>
            <p>{t("filesNote")}</p>
          </section>
        </>
      )}
    </div>
  );
}
