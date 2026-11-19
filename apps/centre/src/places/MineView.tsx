import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { FieldErrors, FieldName, FormFields } from "./contribute.js";
import { MINE_SORTS, OPEN_LICENCES, canUndoMine, mineObservationWarning, mineSortLabel, type MineStep } from "./docs-bridge.js";
import { buildMineView, fieldsFor, keepSelected, previewEdit, removeSelected, saveEdit, toggleId, undoMine } from "./mineModel.js";
import { mineText, type MineKey } from "./mineStrings.js";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { placesText, type PlacesKey } from "./strings.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./mine.css";

interface EditorProps {
  record: PlaceRecord;
  language: Language;
  today: string;
  onSave: (fields: FormFields) => FieldErrors | null;
  onCancel: () => void;
}

function Editor({ record, language, today, onSave, onCancel }: EditorProps) {
  const [fields, setFields] = useState<FormFields>(() => fieldsFor(record));
  const [errors, setErrors] = useState<FieldErrors>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const t = (key: MineKey, vars?: Record<string, string | number>) => mineText(language, key, vars);
  const p = (key: PlacesKey, vars?: Record<string, string | number>) => placesText(language, key, vars);
  const name = record.name ?? t("unnamed");
  const base = "edit";
  const set = <K extends FieldName>(key: K, value: FormFields[K]) => setFields((current) => ({ ...current, [key]: value }));
  const preview = useMemo(() => previewEdit(record, fields, today, language), [record, fields, today, language]);
  const errorFields = (Object.keys(errors) as FieldName[]).filter((key) => errors[key] !== undefined);

  useEffect(() => headingRef.current?.focus(), []);
  useEffect(() => {
    if (errorFields.length > 0) summaryRef.current?.focus();
  }, [errors]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit(event: FormEvent) {
    event.preventDefault();
    setErrors(onSave(fields) ?? {});
  }

  const props = (key: FieldName) =>
    ({ "aria-invalid": errors[key] ? true : undefined, "aria-describedby": errors[key] ? `${base}-${key}-error` : undefined }) as const;
  const error = (key: FieldName) =>
    errors[key] ? (
      <p id={`${base}-${key}-error`} className="field-error">
        {p(`err.${errors[key]}` as PlacesKey)}
      </p>
    ) : null;

  return (
    <form className="mine-edit" onSubmit={submit} noValidate aria-labelledby={`${base}-heading`}>
      <h4 id={`${base}-heading`} ref={headingRef} tabIndex={-1}>
        {t("editHeading", { name })}
      </h4>
      {errorFields.length > 0 ? (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="error-summary">
          <p>{p("errorSummary", { count: errorFields.length })}</p>
          <ul>
            {errorFields.map((key) => (
              <li key={key}>
                <a href={`#${base}-${key}`}>{p(`err.${errors[key]}` as PlacesKey)}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <label htmlFor={`${base}-name`}>{p("fName")}</label>
      <input id={`${base}-name`} type="text" autoComplete="off" value={fields.name} onChange={(e) => set("name", e.currentTarget.value)} />

      <label htmlFor={`${base}-lat`}>{p("fLat")}</label>
      <input id={`${base}-lat`} type="text" inputMode="decimal" autoComplete="off" value={fields.lat} onChange={(e) => set("lat", e.currentTarget.value)} {...props("lat")} />
      {error("lat")}

      <label htmlFor={`${base}-lon`}>{p("fLon")}</label>
      <input id={`${base}-lon`} type="text" inputMode="decimal" autoComplete="off" value={fields.lon} onChange={(e) => set("lon", e.currentTarget.value)} {...props("lon")} />
      {error("lon")}

      <label htmlFor={`${base}-wheelchair`}>{p("fStatus")}</label>
      <select id={`${base}-wheelchair`} value={fields.wheelchair} onChange={(e) => set("wheelchair", e.currentTarget.value)} {...props("wheelchair")}>
        <option value="UNKNOWN">{p("optUnknown")}</option>
        <option value="yes">{p("optYes")}</option>
        <option value="limited">{p("optLimited")}</option>
        <option value="no">{p("optNo")}</option>
      </select>
      {error("wheelchair")}

      <label htmlFor={`${base}-source`}>{p("fSource")}</label>
      <input id={`${base}-source`} type="text" autoComplete="off" value={fields.source} onChange={(e) => set("source", e.currentTarget.value)} {...props("source")} />
      {error("source")}

      <label htmlFor={`${base}-licence`}>{p("fLicence")}</label>
      <select id={`${base}-licence`} value={fields.licence} onChange={(e) => set("licence", e.currentTarget.value)} {...props("licence")}>
        {OPEN_LICENCES.map((licence) => (
          <option key={licence} value={licence}>
            {licence}
          </option>
        ))}
      </select>
      {error("licence")}

      <label htmlFor={`${base}-observedOn`}>{p("fDate")}</label>
      <input id={`${base}-observedOn`} type="text" inputMode="numeric" autoComplete="off" value={fields.observedOn} onChange={(e) => set("observedOn", e.currentTarget.value)} {...props("observedOn")} />
      {error("observedOn")}

      <h5>{t("changesHeading")}</h5>
      {preview.changes.length === 0 ? (
        <p>{t("noChanges")}</p>
      ) : (
        <ul data-testid="edit-changes">
          {preview.changes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {preview.touchesObservation ? <p className="mine-warning">{mineObservationWarning(language)}</p> : null}

      <label className="mine-check" htmlFor={`${base}-consent`}>
        <input id={`${base}-consent`} type="checkbox" checked={fields.consent} onChange={(e) => set("consent", e.currentTarget.checked)} {...props("consent")} />
        {t("confirmLabel")}
      </label>
      {error("consent")}

      <p className="places-actions">
        <button type="submit">{t("saveButton")}</button>
        <button type="button" onClick={onCancel}>
          {t("cancelButton")}
        </button>
      </p>
    </form>
  );
}

/** Lets a person find, correct and remove their own saved observations. Everything stays on the device. */
export function MineView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const today = localToday();
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [steps, setSteps] = useState<MineStep[]>([]);
  const [message, setMessage] = useState("");
  const t = (key: MineKey, vars?: Record<string, string | number>) => mineText(language, key, vars);

  function refresh() {
    const next = drafts.list();
    setRecords(next);
    setSelected((current) => keepSelected(current, next));
  }

  useEffect(refresh, [drafts]); // eslint-disable-line react-hooks/exhaustive-deps

  const view = useMemo(() => buildMineView(records, search, sort, language), [records, search, sort, language]);
  const nameOf = (record: PlaceRecord) => record.name ?? t("unnamed");

  function save(record: PlaceRecord, fields: FormFields): FieldErrors | null {
    const outcome = saveEdit(drafts, record, fields, today, steps);
    if (outcome.kind === "invalid") return outcome.errors;
    if (outcome.kind === "failed") {
      setMessage(t("saveFailed"));
      return null;
    }
    if (outcome.kind === "saved") {
      setSteps(outcome.steps);
      setMessage(t("saved", { name: nameOf(record) }));
    } else {
      setMessage(t("savedNoChange"));
    }
    setEditingId(null);
    refresh();
    return null;
  }

  function remove() {
    const outcome = removeSelected(drafts, records, selected, steps);
    setSteps(outcome.steps);
    setConfirming(false);
    setEditingId(null);
    setMessage(t("removed", { n: outcome.removed }));
    refresh();
  }

  function undo() {
    const outcome = undoMine(drafts, steps, language);
    setSteps(outcome.steps);
    setMessage(outcome.message ?? t("undoFailed"));
    setEditingId(null);
    refresh();
  }

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      {canUndoMine(steps) ? (
        <p>
          <button type="button" onClick={undo}>
            {t("undoButton")}
          </button>{" "}
          {t("undoNote")}
        </p>
      ) : null}

      {records.length === 0 ? (
        <>
          <p>{t("noNotes")}</p>
          <p>
            <Link to="/places/contribute" className="mine-link">
              {t("addLink")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <section aria-labelledby="mine-summary">
            <h2 id="mine-summary">{t("summaryHeading")}</h2>
            <ul data-testid="mine-summary">
              {view.summaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="mine-find" className="mine-find">
            <h2 id="mine-find">{t("findHeading")}</h2>
            <label htmlFor="mine-search">{t("searchLabel")}</label>
            <input id="mine-search" type="search" autoComplete="off" value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
            <label htmlFor="mine-sort">{t("sortLabel")}</label>
            <select id="mine-sort" value={sort} onChange={(e) => setSort(e.currentTarget.value)}>
              {MINE_SORTS.map((value) => (
                <option key={value} value={value}>
                  {mineSortLabel(value, language)}
                </option>
              ))}
            </select>
          </section>

          <section aria-labelledby="mine-list">
            <h2 id="mine-list">{t("listHeading")}</h2>
            <p data-testid="mine-shown">{view.shownText}</p>
            {view.rows.length === 0 ? (
              <p>{t("noneFound")}</p>
            ) : (
              <ul className="place-list">
                {view.rows.map(({ record, line }, index) => (
                  <li key={record.id} className="mine-row" data-editing={editingId === record.id}>
                    <h3>{nameOf(record)}</h3>
                    <p>{line}</p>
                    <p>{t("coordinates", { lat: record.lat, lon: record.lon })}</p>
                    <label className="mine-check" htmlFor={`mine-select-${index}`}>
                      <input
                        id={`mine-select-${index}`}
                        type="checkbox"
                        checked={selected.has(record.id)}
                        onChange={(e) => {
                          setSelected(toggleId(selected, record.id, e.currentTarget.checked));
                          setConfirming(false);
                        }}
                      />
                      {t("selectLabel", { name: nameOf(record) })}
                    </label>
                    {editingId === record.id ? (
                      <Editor record={record} language={language} today={today} onSave={(fields) => save(record, fields)} onCancel={() => setEditingId(null)} />
                    ) : (
                      <p>
                        <button type="button" onClick={() => setEditingId(record.id)}>
                          {t("editButton", { name: nameOf(record) })}
                        </button>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selected.size > 0 ? (
            <section aria-label={t("removeButton")}>
              <p>{t("selectedCount", { n: selected.size })}</p>
              {confirming ? (
                <>
                  <p className="mine-warning">{t("removeWarning", { n: selected.size })}</p>
                  <p className="places-actions">
                    <button type="button" onClick={remove}>
                      {t("removeConfirm", { n: selected.size })}
                    </button>
                    <button type="button" onClick={() => setConfirming(false)}>
                      {t("removeCancel")}
                    </button>
                  </p>
                </>
              ) : (
                <p>
                  <button type="button" onClick={() => setConfirming(true)}>
                    {t("removeButton")}
                  </button>
                </p>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
