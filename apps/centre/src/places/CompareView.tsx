import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildCompareView, compareFile, rowsFor, COMPARE_DEFAULT_RADIUS, COMPARE_RADIUS_CHOICES, type CompareFileKind } from "./compareModel.js";
import { compareText, type CompareKey } from "./compareStrings.js";
import { placePath } from "./detail.js";
import type { CompareOutcome } from "./docs-bridge.js";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import { usePlaces } from "./usePlaces.js";
import "./places.css";
import "./compare.css";

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
 * Sets a person's own observations beside the places in the packs on this device.
 * A match is a suggestion; the screen never says which record is right.
 */
export function CompareView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const { merged } = usePlaces(storage);
  const today = localToday();
  const [mine, setMine] = useState<PlaceRecord[]>([]);
  const [radius, setRadius] = useState<number>(COMPARE_DEFAULT_RADIUS);
  const [shown, setShown] = useState<CompareOutcome | "all">("all");
  const t = (key: CompareKey, vars?: Record<string, string | number>) => compareText(language, key, vars);

  useEffect(() => setMine(drafts.list()), [drafts]);

  const view = useMemo(() => buildCompareView(mine, merged.records, radius, language), [mine, merged.records, radius, language]);
  const active = shown === "all" || view.choices.some((choice) => choice.value === shown) ? shown : "all";
  const rows = rowsFor(view, active);
  const file = (kind: CompareFileKind) => download(compareFile(kind, view.report, today, language));

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>

      {mine.length === 0 ? (
        <>
          <p>{t("noDrafts")}</p>
          <p>
            <Link to="/places/contribute" className="compare-link">
              {t("addLink")}
            </Link>
          </p>
        </>
      ) : merged.records.length === 0 ? (
        <>
          <p>{t("noPacks")}</p>
          <p>
            <Link to="/places" className="compare-link">
              {t("packsLink")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <section aria-labelledby="cmp-summary">
            <h2 id="cmp-summary">{t("summaryHeading")}</h2>
            <p data-testid="compare-summary" role="status">
              {view.summary}
            </p>
            <div className="compare-controls">
              <label htmlFor="cmp-radius">{t("radiusLabel")}</label>
              <select id="cmp-radius" value={radius} onChange={(e) => setRadius(Number(e.currentTarget.value))}>
                {COMPARE_RADIUS_CHOICES.map((m) => (
                  <option key={m} value={m}>
                    {t("radiusOption", { m })}
                  </option>
                ))}
              </select>
              <label htmlFor="cmp-show">{t("showLabel")}</label>
              <select id="cmp-show" value={active} onChange={(e) => setShown(e.currentTarget.value as CompareOutcome | "all")}>
                <option value="all">{t("showAll", { n: view.rows.length })}</option>
                {view.choices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {t("showOption", { label: choice.label, n: choice.count })}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section aria-labelledby="cmp-list">
            <h2 id="cmp-list">{t("listHeading")}</h2>
            {rows.length === 0 ? (
              <p>{t("noneShown")}</p>
            ) : (
              <ul className="place-list">
                {rows.map((row) => (
                  <li key={row.id} className="compare-row" data-outcome={row.outcome}>
                    <h3>{row.name ?? t("unnamed")}</h3>
                    <p className="compare-outcome">{row.outcomeLabel}</p>
                    <p>{row.advice}</p>
                    <div className="compare-sides">
                      <div className="compare-side">
                        <h4>{t("mineHeading")}</h4>
                        <p>{row.mineLine}</p>
                      </div>
                      {row.pack !== null ? (
                        <div className="compare-side">
                          <h4>{t("packHeading")}</h4>
                          <p>{row.pack.name ?? t("unnamed")}</p>
                          <p>{row.pack.line}</p>
                          <p>
                            <Link to={placePath(row.pack.id)} className="compare-link">
                              {t("openPlace", { name: row.pack.name ?? t("unnamed") })}
                            </Link>
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <ul>
                      <li>{row.matchText}</li>
                      {row.flags.map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                      {row.otherNearby > 0 ? <li>{t("otherNearby", { n: row.otherNearby })}</li> : null}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="cmp-files">
            <h2 id="cmp-files">{t("filesHeading")}</h2>
            <p className="places-actions">
              <button type="button" onClick={() => file("txt")}>
                {t("downloadText")}
              </button>
              <button type="button" onClick={() => file("csv")}>
                {t("downloadCsv")}
              </button>
            </p>
            <p>{t("filesNote")}</p>
          </section>
        </>
      )}
    </div>
  );
}
