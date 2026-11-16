import { useMemo, useState, type ChangeEvent } from "react";
import { inspectPack, type InspectReport } from "./inspect.js";
import { PlacesNav } from "./PlacesNav.js";
import { QualityBlock } from "./QualityBlock.js";
import { createPackLibrary, type KeyValueStorage } from "./store.js";
import { placesText, type PlacesKey } from "./strings.js";
import { toolsText, type ToolsKey } from "./toolsStrings.js";
import { localToday } from "./today.js";
import type { Language, PackFailureCode, ParsedPack } from "./types.js";
import "./places.css";

type Notice = { kind: "ok" | "error"; text: string } | null;

/** Reads a pack file and shows what is in it. Nothing is saved until the person chooses Add. */
export function InspectView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const library = useMemo(() => createPackLibrary(storage), [storage]);
  const [looked, setLooked] = useState<{ pack: ParsedPack; report: InspectReport } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [inputKey, setInputKey] = useState(0);
  const today = localToday();
  const t = (key: ToolsKey, vars?: Record<string, string | number>) => toolsText(language, key, vars);
  const p = (key: PlacesKey, vars?: Record<string, string | number>) => placesText(language, key, vars);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const result = inspectPack(await file.text(), today, library.list().map((pack) => pack.manifest.packId));
    if (!result.ok) {
      setLooked(null);
      setNotice({ kind: "error", text: `${t("inspectFailedPrefix")} ${p(`fail.${result.code as PackFailureCode}` as PlacesKey)}` });
      return;
    }
    setNotice(null);
    setLooked({ pack: result.pack, report: result.report });
  }

  function add() {
    if (!looked) return;
    const saved = library.save(looked.pack);
    if (saved.ok) {
      setNotice({ kind: "ok", text: t("inspectAdded", { id: looked.report.packId, count: looked.report.usable }) });
      setLooked(null);
      setInputKey((key) => key + 1);
    } else if (saved.reason === "too-many-packs") {
      setNotice({ kind: "error", text: p("fail.too-many-packs", { max: 8 }) });
    } else {
      setNotice({ kind: "error", text: t("inspectAddFailed") });
    }
  }

  function another() {
    setLooked(null);
    setNotice(null);
    setInputKey((key) => key + 1);
  }

  const report = looked?.report;
  return (
    <div className="places">
      <h1>{t("inspectTitle")}</h1>
      <PlacesNav language={language} />
      <p>{t("inspectLead")}</p>

      <label htmlFor="inspect-file">{t("inspectFileLabel")}</label>
      <input key={inputKey} id="inspect-file" type="file" accept=".json,application/json" onChange={(event) => void onFile(event)} />
      <div role="status" aria-live="polite" className="places-notice">
        {notice?.kind === "ok" ? notice.text : null}
      </div>
      <div role="alert" className="places-notice">
        {notice?.kind === "error" ? notice.text : null}
      </div>

      {report ? (
        <section aria-labelledby="inspect-report">
          <h2 id="inspect-report">{t("inspectReportHeading", { id: report.packId })}</h2>
          <dl className="facts">
            <dt>{p("packDate")}</dt>
            <dd>{report.generatedOn}</dd>
            <dt>{t("inspectInFile")}</dt>
            <dd>{report.inFile}</dd>
            <dt>{t("inspectUsable")}</dt>
            <dd>{report.usable}</dd>
            <dt>{t("inspectLeftOut")}</dt>
            <dd>{report.leftOut}</dd>
            <dt>{t("inspectMadeUnknown")}</dt>
            <dd>{report.madeUnknown}</dd>
            <dt>{p("packSources")}</dt>
            <dd>{report.sources.join(", ") || p("packNone")}</dd>
            <dt>{p("packLicences")}</dt>
            <dd>{report.licences.join(", ") || p("packNone")}</dd>
            <dt>{p("packOldest")}</dt>
            <dd>{report.oldest ?? p("packNone")}</dd>
            <dt>{p("packNewest")}</dt>
            <dd>{report.newest ?? p("packNone")}</dd>
          </dl>
          <QualityBlock report={report.quality} language={language} />
          {report.replacesLoaded || report.dateInFuture || report.warnings.length > 0 ? (
            <>
              <h3>{t("inspectNotesHeading")}</h3>
              <ul>
                {report.replacesLoaded ? <li>{t("inspectReplaces")}</li> : null}
                {report.dateInFuture ? <li>{t("inspectFuture")}</li> : null}
                {report.warnings.map((warning, index) => (
                  <li key={`${warning.code}-${warning.id}-${index}`}>{p(`warn.${warning.code}` as PlacesKey, { id: warning.id, detail: warning.detail })}</li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="places-actions">
            <button type="button" onClick={add}>
              {t("inspectAdd")}
            </button>
            <button type="button" onClick={another}>
              {t("inspectAnother")}
            </button>
          </p>
        </section>
      ) : null}
    </div>
  );
}
