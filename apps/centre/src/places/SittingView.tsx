import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  SIT_SKIP_REASONS,
  beginSitting,
  clearSitOutcome,
  emptyLedger,
  entryIssueText,
  isSitOrder,
  isSitSkipReason,
  keepSavedInSitting,
  ledgerEntryFor,
  setSitOutcome,
  sitCannotSeeText,
  sitGoBack,
  sitGoNext,
  sitGoTo,
  sitPositionText,
  sitSkipReasonText,
  type Ledger,
  type SitOrder,
  type SitOutcome,
  type SitSkipReason,
  type Sitting,
} from "./docs-bridge.js";
import { PlacesNav } from "./PlacesNav.js";
import { buildSittingView, buildStartView, sittingFile, sittingName } from "./sittingModel.js";
import { createSittingStore } from "./sittingStore.js";
import { sittingStringText, type SittingKey } from "./sittingStrings.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { createSubmissionsStore } from "./submissionsStore.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./sitting.css";

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
 * Walks a person through their own observations one at a time while they type them into an
 * OpenStreetMap editor. The person says what happened to each. Saying "I added this" also puts
 * the observation on their own list of what they added. The App adds nothing to the map and
 * cannot see it.
 */
export function SittingView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const sittings = useMemo(() => createSittingStore(storage), [storage]);
  const list = useMemo(() => createSubmissionsStore(storage), [storage]);
  const today = localToday();
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [ledger, setLedger] = useState<Ledger>(emptyLedger);
  const [sitting, setSitting] = useState<Sitting | null>(null);
  const [order, setOrder] = useState<SitOrder>("newest");
  const [changeset, setChangeset] = useState("");
  const [reason, setReason] = useState<SitSkipReason>("already-on-map");
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const t = (key: SittingKey, vars?: Record<string, string | number>) => sittingStringText(language, key, vars);

  useEffect(() => {
    const saved = drafts.list();
    setRecords(saved);
    setLedger(list.read());
    const stored = sittings.read();
    if (stored === null) return;
    const kept = keepSavedInSitting(stored, new Set(saved.map((record) => record.id)));
    if (kept.ids.length === 0) {
      sittings.clear();
      return;
    }
    setSitting(kept);
    setMessage(sittingStringText(language, "resumed", { day: kept.startedOn }));
    // The language is read once here on purpose: changing it later must not replay the message.
  }, [drafts, list, sittings]);

  const startView = useMemo(() => buildStartView(records, ledger, order, language), [records, ledger, order, language]);
  const view = useMemo(() => (sitting === null ? null : buildSittingView(sitting, records, language)), [sitting, records, language]);
  const at = sitting?.at ?? -1;
  const currentId = view?.item?.record.id ?? null;

  // A fresh observation starts with an empty number, or with the one already given for it.
  useEffect(() => {
    const outcome = currentId === null ? undefined : sitting?.outcomes[currentId];
    setChangeset(outcome?.kind === "added" && outcome.changeset !== null ? outcome.changeset : "");
    setReason(outcome?.kind === "skipped" ? outcome.reason : "already-on-map");
    setProblem("");
    // Only a move to another observation resets the fields, not every change to the sitting.
  }, [currentId]);

  // After a move the heading of the new observation, or of the summary, takes focus.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    heading.current?.focus();
  }, [at]);

  /** Saves the sitting, then shows it. Nothing changes on screen when the device refuses the write. */
  function keep(next: Sitting, said: string): boolean {
    if (!sittings.save(next).ok) {
      setProblem(t("notSaved"));
      return false;
    }
    if (next.at !== sitting?.at) moved.current = true;
    setSitting(next);
    setProblem("");
    setMessage(said);
    return true;
  }

  function start() {
    const begun = beginSitting(startView.queue, today);
    if (begun === null) return;
    moved.current = true;
    keep(begun, t("started", { position: sitPositionText(0, begun.ids.length, language) }));
  }

  function move(next: Sitting) {
    keep(next, next.at >= next.ids.length ? t("summaryHeading") : t("moved", { position: sitPositionText(next.at, next.ids.length, language) }));
  }

  /** Takes the observation off the person's list of what they added, when it was put there in this sitting. */
  function offTheList(id: string): boolean {
    if (sitting?.outcomes[id]?.kind !== "added") return true;
    const result = list.unmark(id);
    setLedger(list.read());
    return result.ok;
  }

  function sayAdded(record: PlaceRecord) {
    if (sitting === null) return;
    const result = list.mark({ id: record.id, observedOn: record.observedOn }, { markedOn: today, changeset, note: "" }, today);
    if (!result.ok) {
      const first = result.kind === "issues" ? result.issues[0] : undefined;
      setProblem(first === undefined ? t("notSaved") : entryIssueText(first, language));
      return;
    }
    const after = list.read();
    setLedger(after);
    const outcome: SitOutcome = { kind: "added", changeset: ledgerEntryFor(after, record.id)?.changeset ?? null };
    keep(setSitOutcome(sitting, record.id, outcome), t("didAdded", { name: sittingName(record, language) }));
  }

  function sayOther(record: PlaceRecord, outcome: SitOutcome, said: SittingKey) {
    if (sitting === null) return;
    if (!offTheList(record.id)) {
      setProblem(t("notSaved"));
      return;
    }
    keep(setSitOutcome(sitting, record.id, outcome), t(said, { name: sittingName(record, language) }));
  }

  function undo(id: string, name: string) {
    if (sitting === null) return;
    if (!offTheList(id)) {
      setProblem(t("notSaved"));
      return;
    }
    keep(clearSitOutcome(sitting, id), t("didUndo", { name }));
  }

  function end() {
    sittings.clear();
    setSitting(null);
    setLedger(list.read());
    setProblem("");
    setMessage(t("ended"));
  }

  const item = view?.item ?? null;

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>
      <p className="sitting-note" data-testid="sitting-cannot-see">
        {sitCannotSeeText(language)}
      </p>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>
      {problem === "" ? null : (
        <p role="alert" className="sitting-problem">
          {problem}
        </p>
      )}

      {sitting === null || view === null ? (
        records.length === 0 ? (
          <>
            <p>{t("noNotes")}</p>
            <p>
              <Link to="/places/contribute" className="sitting-link">
                {t("addLink")}
              </Link>
            </p>
          </>
        ) : (
          <section aria-labelledby="sitting-start">
            <h2 id="sitting-start">{t("startHeading")}</h2>
            <p data-testid="sitting-ready">{startView.ready}</p>
            {startView.leftOut.length > 0 ? (
              <>
                <h3>{t("leftOutHeading")}</h3>
                <ul data-testid="sitting-left-out">
                  {startView.leftOut.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {startView.canStart ? (
              <>
                <fieldset className="sitting-choice">
                  <legend>{t("orderLegend")}</legend>
                  {startView.orders.map((option) => (
                    <div key={option.id} className="sitting-option">
                      <label>
                        <input
                          type="radio"
                          name="sitting-order"
                          value={option.id}
                          checked={order === option.id}
                          aria-describedby={`sitting-order-${option.id}`}
                          onChange={(e) => {
                            if (isSitOrder(e.currentTarget.value)) setOrder(e.currentTarget.value);
                          }}
                        />{" "}
                        {option.label}
                      </label>
                      <p id={`sitting-order-${option.id}`} className="hint">
                        {option.hint}
                      </p>
                    </div>
                  ))}
                </fieldset>
                <p>
                  <button type="button" onClick={start}>
                    {t("start")}
                  </button>
                </p>
              </>
            ) : (
              <p>{t("nothingReady")}</p>
            )}
            <p className="places-actions">
              <Link to="/places/submissions" className="sitting-link">
                {t("listLink")}
              </Link>
              <Link to="/places/tags" className="sitting-link">
                {t("tagsLink")}
              </Link>
            </p>
          </section>
        )
      ) : (
        <>
          <section aria-labelledby="sitting-progress">
            <h2 id="sitting-progress">{t("progressHeading")}</h2>
            <p data-testid="sitting-counts">{view.counts}</p>
            <p className="hint">{view.rest}</p>
          </section>

          {item !== null && !view.atSummary ? (
            <section aria-labelledby="sitting-item">
              <h2 id="sitting-item" ref={heading} tabIndex={-1}>
                {item.position}
              </h2>
              <p>
                <strong data-testid="sitting-name">{item.name}</strong>
              </p>
              <p data-testid="sitting-record">{item.recordLine}</p>
              {item.nextStop === "" ? null : <p className="hint">{item.nextStop}</p>}
              <label htmlFor="sitting-tags">{t("tagsLabel")}</label>
              <p id="sitting-tags-help" className="hint">
                {t("tagsHelp")}
              </p>
              <textarea id="sitting-tags" className="sitting-text" readOnly rows={4} value={item.tags} aria-describedby="sitting-tags-help" />
              {item.heldBack.length > 0 ? (
                <>
                  <h3>{t("heldBackHeading")}</h3>
                  <ul>
                    {item.heldBack.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </>
              ) : null}

              <h3>{t("whatHeading")}</h3>
              <p data-testid="sitting-outcome">{t("outcomeNow", { outcome: item.outcomeText })}</p>
              <div className="sitting-what">
                <div className="sitting-field">
                  <label htmlFor="sitting-changeset">{t("changesetLabel")}</label>
                  <p id="sitting-changeset-help" className="hint">
                    {t("changesetHelp")}
                  </p>
                  <input
                    id="sitting-changeset"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={changeset}
                    aria-describedby="sitting-changeset-help"
                    onChange={(e) => setChangeset(e.currentTarget.value)}
                  />
                  <button type="button" onClick={() => sayAdded(item.record)}>
                    {t("addedButton")}
                  </button>
                </div>
                <div className="sitting-field">
                  <label htmlFor="sitting-reason">{t("skipLabel")}</label>
                  <select
                    id="sitting-reason"
                    value={reason}
                    onChange={(e) => {
                      if (isSitSkipReason(e.currentTarget.value)) setReason(e.currentTarget.value);
                    }}
                  >
                    {SIT_SKIP_REASONS.map((id) => (
                      <option key={id} value={id}>
                        {sitSkipReasonText(id, language)}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => sayOther(item.record, { kind: "skipped", reason }, "didSkipped")}>
                    {t("skipButton")}
                  </button>
                </div>
                <div className="sitting-field">
                  <button type="button" onClick={() => sayOther(item.record, { kind: "later" }, "didLater")}>
                    {t("laterButton")}
                  </button>
                  {item.outcome === null ? null : (
                    <button type="button" onClick={() => undo(item.record.id, item.name)}>
                      {t("undoButton")}
                    </button>
                  )}
                </div>
              </div>

              <p className="places-actions">
                <button type="button" disabled={view.isFirst} onClick={() => move(sitGoBack(sitting))}>
                  {t("previous")}
                </button>
                <button type="button" onClick={() => move(sitGoNext(sitting))}>
                  {t("next")}
                </button>
                <button type="button" onClick={() => move(sitGoTo(sitting, sitting.ids.length))}>
                  {t("toSummary")}
                </button>
              </p>
            </section>
          ) : (
            <section aria-labelledby="sitting-summary">
              <h2 id="sitting-summary" ref={heading} tabIndex={-1}>
                {t("summaryHeading")}
              </h2>
              {view.firstOpen === null ? null : (
                <p>
                  <button type="button" onClick={() => move(sitGoTo(sitting, view.firstOpen ?? 0))}>
                    {t("toFirstOpen")}
                  </button>
                </p>
              )}
              <div className="places-scroll" tabIndex={0} role="group" aria-labelledby="sitting-summary">
                <table className="sitting-table" data-testid="sitting-summary-table">
                  <caption>{t("summaryCaption")}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t("colPlace")}</th>
                      <th scope="col">{t("colOutcome")}</th>
                      <th scope="col">{t("colRecord")}</th>
                      <th scope="col">{t("colAction")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.rows.map((row) => (
                      <tr key={row.id}>
                        <th scope="row">{row.name}</th>
                        <td>{row.outcome}</td>
                        <td>{row.record}</td>
                        <td>
                          <button type="button" onClick={() => move(sitGoTo(sitting, row.index))}>
                            {t("goToItem", { name: row.name })}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>{t("groupsHeading")}</h3>
              {view.groups.length === 0 ? (
                <p>{t("noGroups")}</p>
              ) : (
                view.groups.map((group) => (
                  <div key={group.key} className="sitting-group" data-testid={`sitting-group-${group.key}`}>
                    <h4>{group.heading}</h4>
                    {group.draft === "" ? null : (
                      <>
                        <label htmlFor={`sitting-draft-${group.key}`}>{t("draftLabel", { heading: group.heading })}</label>
                        <textarea id={`sitting-draft-${group.key}`} className="sitting-text" readOnly rows={3} value={group.draft} />
                      </>
                    )}
                    {group.notes.length > 0 ? (
                      <ul>
                        {group.notes.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))
              )}

              <h3>{t("filesHeading")}</h3>
              <p className="places-actions">
                <button type="button" onClick={() => download(sittingFile("txt", sitting, records, language))}>
                  {t("downloadText")}
                </button>
                <button type="button" onClick={() => download(sittingFile("csv", sitting, records, language))}>
                  {t("downloadCsv")}
                </button>
                <Link to="/places/submissions" className="sitting-link">
                  {t("listLink")}
                </Link>
              </p>
              <p>{t("filesNote")}</p>
            </section>
          )}

          <section aria-labelledby="sitting-end">
            <h2 id="sitting-end">{t("endHeading")}</h2>
            <p>{t("endHelp")}</p>
            <p>
              <button type="button" onClick={end}>
                {t("endButton")}
              </button>
            </p>
          </section>
        </>
      )}
    </div>
  );
}
