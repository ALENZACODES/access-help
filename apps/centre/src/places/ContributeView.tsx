import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { OPEN_LICENCES } from "./docs-bridge.js";
import {
  emptyForm,
  exportFile,
  newDraftId,
  parseForm,
  type ExportKind,
  type FieldErrors,
  type FieldName,
  type FormFields,
} from "./contribute.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { PlacesNav } from "./PlacesNav.js";
import { placesText, type PlacesKey } from "./strings.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";

const FIELD_ORDER: readonly FieldName[] = ["lat", "lon", "wheelchair", "source", "licence", "observedOn", "consent"];

function download(kind: ExportKind, records: readonly PlaceRecord[], today: string) {
  const file = exportFile(kind, records, today);
  const url = URL.createObjectURL(new Blob([file.content], { type: `${file.mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Records an observation on this device and writes files a person submits to OpenStreetMap. */
export function ContributeView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const today = localToday();
  const [fields, setFields] = useState<FormFields>(() => emptyForm(today));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [message, setMessage] = useState("");
  const summaryRef = useRef<HTMLDivElement>(null);
  const t = (key: PlacesKey, vars?: Record<string, string | number>) => placesText(language, key, vars);

  useEffect(() => {
    setRecords(drafts.list());
  }, [drafts]);

  const errorFields = FIELD_ORDER.filter((name) => errors[name] !== undefined);
  useEffect(() => {
    if (errorFields.length > 0) summaryRef.current?.focus();
  }, [errors]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormFields>(name: K, value: FormFields[K]) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const id = newDraftId(Date.now(), Math.random);
    const result = parseForm(fields, today, id);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const saved = drafts.add(result.record);
    if (!saved.ok) {
      setErrors({});
      setMessage(
        t(saved.reason === "storage-full" ? "draftFailedFull" : saved.reason === "too-many" ? "draftFailedMany" : "draftFailedUnavailable"),
      );
      return;
    }
    setErrors({});
    setRecords(drafts.list());
    setFields(emptyForm(today));
    setMessage(t("draftSaved"));
  }

  function remove(record: PlaceRecord) {
    drafts.remove(record.id);
    setRecords(drafts.list());
    setMessage(t("draftRemoved"));
  }

  function fieldProps(name: FieldName, helpId?: string) {
    const code = errors[name];
    const describedBy = [helpId, code ? `${name}-error` : undefined].filter(Boolean).join(" ") || undefined;
    return { "aria-invalid": code ? true : undefined, "aria-describedby": describedBy } as const;
  }

  const error = (name: FieldName) =>
    errors[name] ? (
      <p id={`${name}-error`} className="field-error">
        {t(`err.${errors[name]}` as PlacesKey)}
      </p>
    ) : null;

  return (
    <div className="places">
      <h1>{t("contributeTitle")}</h1>
      <PlacesNav language={language} />
      <p>{t("contributeLead")}</p>

      <form onSubmit={onSubmit} noValidate aria-label={t("contributeTitle")}>
        {errorFields.length > 0 ? (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="error-summary">
            <p>{t("errorSummary", { count: errorFields.length })}</p>
            <ul>
              {errorFields.map((name) => (
                <li key={name}>
                  <a href={`#f-${name}`}>{t(`err.${errors[name]}` as PlacesKey)}</a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <label htmlFor="f-name">{t("fName")}</label>
        <input id="f-name" type="text" autoComplete="off" value={fields.name} onChange={(e) => set("name", e.currentTarget.value)} />

        <label htmlFor="f-lat">{t("fLat")}</label>
        <p id="f-lat-help" className="hint">{t("fLatHelp")}</p>
        <input id="f-lat" type="text" inputMode="decimal" autoComplete="off" value={fields.lat} onChange={(e) => set("lat", e.currentTarget.value)} {...fieldProps("lat", "f-lat-help")} />
        {error("lat")}

        <label htmlFor="f-lon">{t("fLon")}</label>
        <p id="f-lon-help" className="hint">{t("fLonHelp")}</p>
        <input id="f-lon" type="text" inputMode="decimal" autoComplete="off" value={fields.lon} onChange={(e) => set("lon", e.currentTarget.value)} {...fieldProps("lon", "f-lon-help")} />
        {error("lon")}

        <label htmlFor="f-wheelchair">{t("fStatus")}</label>
        <p id="f-wheelchair-help" className="hint">{t("fStatusHelp")}</p>
        <select id="f-wheelchair" value={fields.wheelchair} onChange={(e) => set("wheelchair", e.currentTarget.value)} {...fieldProps("wheelchair", "f-wheelchair-help")}>
          <option value="UNKNOWN">{t("optUnknown")}</option>
          <option value="yes">{t("optYes")}</option>
          <option value="limited">{t("optLimited")}</option>
          <option value="no">{t("optNo")}</option>
        </select>
        {error("wheelchair")}

        <label htmlFor="f-source">{t("fSource")}</label>
        <p id="f-source-help" className="hint">{t("fSourceHelp")}</p>
        <input id="f-source" type="text" autoComplete="off" value={fields.source} onChange={(e) => set("source", e.currentTarget.value)} {...fieldProps("source", "f-source-help")} />
        {error("source")}

        <label htmlFor="f-licence">{t("fLicence")}</label>
        <p id="f-licence-help" className="hint">{t("fLicenceHelp")}</p>
        <select id="f-licence" value={fields.licence} onChange={(e) => set("licence", e.currentTarget.value)} {...fieldProps("licence", "f-licence-help")}>
          {OPEN_LICENCES.map((licence) => (
            <option key={licence} value={licence}>
              {licence}
            </option>
          ))}
        </select>
        {error("licence")}

        <label htmlFor="f-observedOn">{t("fDate")}</label>
        <p id="f-observedOn-help" className="hint">{t("fDateHelp")}</p>
        <input id="f-observedOn" type="text" inputMode="numeric" autoComplete="off" placeholder="YYYY-MM-DD" value={fields.observedOn} onChange={(e) => set("observedOn", e.currentTarget.value)} {...fieldProps("observedOn", "f-observedOn-help")} />
        {error("observedOn")}

        <label htmlFor="f-consent">
          <input id="f-consent" type="checkbox" checked={fields.consent} onChange={(e) => set("consent", e.currentTarget.checked)} {...fieldProps("consent")} />
          {t("fConsent")}
        </label>
        {error("consent")}

        <p>
          <button type="submit">{t("addDraft")}</button>
        </p>
      </form>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      <section aria-labelledby="drafts-heading">
        <h2 id="drafts-heading">{t("draftsHeading", { count: records.length })}</h2>
        {records.length === 0 ? (
          <p>{t("draftsNone")}</p>
        ) : (
          <ul className="place-list">
            {records.map((record) => (
              <li key={record.id}>
                <h3>{record.name ?? t("unnamed")}</h3>
                <p>
                  {record.wheelchair} · {record.licence} · {record.observedOn}
                </p>
                <button type="button" onClick={() => remove(record)}>
                  {t("draftRemove", { name: record.name ?? t("nameFallback") })}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {records.length > 0 ? (
        <section aria-labelledby="export-heading">
          <h2 id="export-heading">{t("exportHeading")}</h2>
          <p>{t("exportLead")}</p>
          <p className="places-actions">
            <button type="button" onClick={() => download("osm", records, today)}>{t("exportOsm")}</button>
            <button type="button" onClick={() => download("geojson", records, today)}>{t("exportGeojson")}</button>
            <button type="button" onClick={() => download("pack", records, today)}>{t("exportPack")}</button>
          </p>
          <p>{t("exportNote")}</p>
          <ol>
            <li>{t("exportStep1")}</li>
            <li>{t("exportStep2")}</li>
            <li>{t("exportStep3")}</li>
          </ol>
        </section>
      ) : null}
    </div>
  );
}
