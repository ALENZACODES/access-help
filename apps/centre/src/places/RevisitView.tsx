import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { placePath } from "./detail.js";
import { PlacesNav } from "./PlacesNav.js";
import { buildRevisitView, revisitFile, toggleReason, DEFAULT_CHOICES, REVISIT_KM_CHOICES, REVISIT_LIMIT_CHOICES, type RevisitChoices, type RevisitFileKind } from "./revisitModel.js";
import { revisitText, type RevisitKey } from "./revisitStrings.js";
import type { KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language } from "./types.js";
import { usePlaces } from "./usePlaces.js";
import "./places.css";
import "./revisit.css";

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
 * Lists pack places that may be worth another visit, in a straight-line visiting order, with a
 * sheet to take along. It only reads the packs on this device and does not read the location.
 */
export function RevisitView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const { merged } = usePlaces(storage);
  const today = localToday();
  const [choices, setChoices] = useState<RevisitChoices>(DEFAULT_CHOICES);
  const t = (key: RevisitKey, vars?: Record<string, string | number>) => revisitText(language, key, vars);
  const set = (patch: Partial<RevisitChoices>) => setChoices((current) => ({ ...current, ...patch }));

  const view = useMemo(() => buildRevisitView(merged.places, choices, today, language), [merged.places, choices, today, language]);
  const startInvalid = view.start.kind === "invalid";
  const file = (kind: RevisitFileKind) => download(revisitFile(kind, view, today, language));

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>

      {merged.places.length === 0 ? (
        <>
          <p>{t("noPacks")}</p>
          <p>
            <Link to="/places" className="revisit-link">
              {t("packsLink")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <section aria-labelledby="rv-choices" className="revisit-choices">
            <h2 id="rv-choices">{t("choicesHeading")}</h2>
            <fieldset>
              <legend>{t("reasonsLegend")}</legend>
              {view.reasonChoices.map((choice) => (
                <label key={choice.value} className="revisit-check" htmlFor={`rv-reason-${choice.value}`}>
                  <input
                    id={`rv-reason-${choice.value}`}
                    type="checkbox"
                    checked={choices.reasons.includes(choice.value)}
                    onChange={(e) => set({ reasons: toggleReason(choices.reasons, choice.value, e.currentTarget.checked) })}
                  />
                  {t("reasonCount", { label: choice.label, n: choice.count })}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>{t("startLegend")}</legend>
              <p id="rv-start-help" className="hint">
                {t("startHelp")}
              </p>
              <label htmlFor="rv-lat">{t("latLabel")}</label>
              <input
                id="rv-lat"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={choices.startLat}
                aria-invalid={startInvalid ? true : undefined}
                aria-describedby={startInvalid ? "rv-start-help rv-start-error" : "rv-start-help"}
                onChange={(e) => set({ startLat: e.currentTarget.value })}
              />
              <label htmlFor="rv-lon">{t("lonLabel")}</label>
              <input
                id="rv-lon"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={choices.startLon}
                aria-invalid={startInvalid ? true : undefined}
                aria-describedby={startInvalid ? "rv-start-help rv-start-error" : "rv-start-help"}
                onChange={(e) => set({ startLon: e.currentTarget.value })}
              />
              {startInvalid ? (
                <p id="rv-start-error" className="field-error">
                  {t("startError")}
                </p>
              ) : null}
              <label htmlFor="rv-within">{t("withinLabel")}</label>
              <select id="rv-within" value={choices.withinKm} disabled={view.start.kind !== "ok"} onChange={(e) => set({ withinKm: e.currentTarget.value })}>
                <option value="">{t("withinAny")}</option>
                {REVISIT_KM_CHOICES.map((km) => (
                  <option key={km} value={String(km)}>
                    {t("withinOption", { km })}
                  </option>
                ))}
              </select>
            </fieldset>
            <label htmlFor="rv-limit">{t("limitLabel")}</label>
            <select id="rv-limit" value={choices.limit} onChange={(e) => set({ limit: e.currentTarget.value })}>
              {REVISIT_LIMIT_CHOICES.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </section>

          <section aria-labelledby="rv-list">
            <h2 id="rv-list">{t("summaryHeading")}</h2>
            <p data-testid="revisit-summary" role="status">
              {view.summary}
            </p>
            {view.orderNote !== "" ? <p>{view.orderNote}</p> : null}
            {view.stops.length === 0 ? (
              <p>{t("noneMatch")}</p>
            ) : (
              <ol className="place-list">
                {view.stops.map((stop) => (
                  <li key={stop.id} className="revisit-stop">
                    <h3>
                      {t("stopLabel", { n: stop.order })}
                      {" · "}
                      {stop.name ?? t("unnamed")}
                    </h3>
                    <p>{t("coordinates", { value: stop.coordinates })}</p>
                    {stop.leg !== "" ? <p>{stop.leg}</p> : null}
                    <p>{stop.recordLine}</p>
                    <dl className="revisit-reasons">
                      {stop.reasons.map((reason) => (
                        <div key={reason.label}>
                          <dt>{reason.label}</dt>
                          <dd>{reason.text}</dd>
                        </div>
                      ))}
                    </dl>
                    <p>
                      <Link to={placePath(stop.id)} className="revisit-link">
                        {t("openPlace", { name: stop.name ?? t("unnamed") })}
                      </Link>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {view.stops.length > 0 ? (
            <section aria-labelledby="rv-files">
              <h2 id="rv-files">{t("filesHeading")}</h2>
              <p className="places-actions">
                <button type="button" onClick={() => file("txt")}>
                  {t("downloadSheet")}
                </button>
                <button type="button" onClick={() => file("csv")}>
                  {t("downloadCsv")}
                </button>
              </p>
              <p>
                {t("filesNote")}{" "}
                <Link to="/places/import" className="revisit-link">
                  {t("importLink")}
                </Link>
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
