import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildDuplicatesView, keepOne, putBack, DUPLICATE_DEFAULT_DISTANCE, DUPLICATE_DISTANCE_CHOICES, type DuplicateGroupView } from "./duplicatesModel.js";
import { duplicatesText, type DuplicatesKey } from "./duplicatesStrings.js";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./duplicates.css";

/**
 * Points out a person's own observations that may be one place saved more than once.
 * Nothing is removed until the person chooses a note to keep and confirms.
 */
export function DuplicatesView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [distance, setDistance] = useState<number>(DUPLICATE_DEFAULT_DISTANCE);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  const [needChoice, setNeedChoice] = useState<string | null>(null);
  const [removed, setRemoved] = useState<PlaceRecord[]>([]);
  const [message, setMessage] = useState("");
  const t = (key: DuplicatesKey, vars?: Record<string, string | number>) => duplicatesText(language, key, vars);

  useEffect(() => setRecords(drafts.list()), [drafts]);

  const view = useMemo(() => buildDuplicatesView(records, distance, hidden, language), [records, distance, hidden, language]);
  const chosenFor = (group: DuplicateGroupView) => choice[group.key] ?? group.suggestedKeep ?? "";

  function ask(group: DuplicateGroupView) {
    if (chosenFor(group) === "") {
      setNeedChoice(group.key);
      return;
    }
    setNeedChoice(null);
    setConfirming(group.key);
  }

  function keep(group: DuplicateGroupView) {
    const outcome = keepOne(drafts, group.group, chosenFor(group));
    setConfirming(null);
    if (!outcome.ok) return;
    setRemoved(outcome.removed);
    setMessage(t("kept", { count: outcome.removed.length }));
    setRecords(drafts.list());
  }

  function restore() {
    const count = putBack(drafts, removed);
    setRecords(drafts.list());
    if (count === null) {
      setMessage(t("putBackFailed"));
      return;
    }
    setRemoved([]);
    setMessage(t("putBack", { count }));
  }

  function leaveAlone(group: DuplicateGroupView, n: number) {
    setHidden((current) => new Set(current).add(group.key));
    setConfirming(null);
    setMessage(t("hidden", { n }));
  }

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      {removed.length > 0 ? (
        <p>
          <button type="button" onClick={restore}>
            {t("putBackButton")}
          </button>{" "}
          {t("putBackNote")}
        </p>
      ) : null}

      {records.length === 0 ? (
        <>
          <p>{t("noNotes")}</p>
          <p>
            <Link to="/places/contribute" className="dup-link">
              {t("addLink")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <section aria-labelledby="dup-summary" className="dup-controls">
            <h2 id="dup-summary">{t("summaryHeading")}</h2>
            <p data-testid="duplicates-summary">{view.summary}</p>
            <label htmlFor="dup-distance">{t("distanceLabel")}</label>
            <select
              id="dup-distance"
              value={distance}
              onChange={(e) => {
                setDistance(Number(e.currentTarget.value));
                setConfirming(null);
              }}
            >
              {DUPLICATE_DISTANCE_CHOICES.map((m) => (
                <option key={m} value={m}>
                  {t("distanceOption", { m })}
                </option>
              ))}
            </select>
          </section>

          <section aria-labelledby="dup-groups">
            <h2 id="dup-groups">{t("groupsHeading")}</h2>
            {view.groups.length === 0 ? (
              <p>{t("noGroups")}</p>
            ) : (
              <ul className="place-list">
                {view.groups.map((group, index) => {
                  const n = index + 1;
                  const chosen = chosenFor(group);
                  const count = group.members.length - 1;
                  return (
                    <li key={group.key} className="dup-group" data-kind={group.kind}>
                      <h3>{t("groupHeading", { n, name: group.members.find((m) => m.record.name !== null)?.record.name ?? t("unnamed") })}</h3>
                      <p className="dup-kind">{group.kindLabel}</p>
                      <p>{group.advice}</p>
                      <ul>
                        {[...group.links, ...group.cautions].map((text, i) => (
                          <li key={`${i}-${text}`}>{text}</li>
                        ))}
                      </ul>
                      <fieldset>
                        <legend>{t("keepLegend")}</legend>
                        {group.suggestedKeep === null ? <p>{t("noSuggestion")}</p> : null}
                        {group.members.map((member, m) => (
                          <label key={member.record.id} className="dup-choice" htmlFor={`dup-${index}-${m}`}>
                            <input
                              id={`dup-${index}-${m}`}
                              type="radio"
                              name={`dup-keep-${index}`}
                              checked={chosen === member.record.id}
                              onChange={() => {
                                setChoice((current) => ({ ...current, [group.key]: member.record.id }));
                                setNeedChoice(null);
                                setConfirming(null);
                              }}
                            />
                            <span>
                              {t("keepOption", { name: member.record.name ?? t("unnamed"), date: member.record.observedOn })}
                              {member.suggested ? <span className="dup-suggested"> ({t("suggested")})</span> : null}
                              <br />
                              {member.line}
                            </span>
                          </label>
                        ))}
                      </fieldset>
                      {needChoice === group.key ? (
                        <p className="field-error" role="alert">
                          {t("chooseFirst")}
                        </p>
                      ) : null}
                      {confirming === group.key ? (
                        <>
                          <p className="dup-warning">{t("confirmWarning", { count })}</p>
                          <p className="places-actions">
                            <button type="button" onClick={() => keep(group)}>
                              {t("confirmButton", { count, n })}
                            </button>
                            <button type="button" onClick={() => setConfirming(null)}>
                              {t("cancelButton")}
                            </button>
                          </p>
                        </>
                      ) : (
                        <p className="places-actions">
                          <button type="button" onClick={() => ask(group)}>
                            {t("keepButton", { n })}
                          </button>
                          <button type="button" onClick={() => leaveAlone(group, n)}>
                            {t("differentButton", { n })}
                          </button>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p>
              <Link to="/places/mine" className="dup-link">
                {t("correctLink")}
              </Link>
            </p>
          </section>
        </>
      )}
    </div>
  );
}
