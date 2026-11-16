import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { copyText } from "./clipboard.js";
import { buildDetail, decodePlaceId } from "./detail.js";
import { moreText, type MoreKey } from "./moreStrings.js";
import { PlanCard } from "./PlanCard.js";
import { buildPlan } from "./plan.js";
import { PlacesNav } from "./PlacesNav.js";
import { createSavedStore, MAX_SAVED, resolveSaved } from "./saved.js";
import type { KeyValueStorage } from "./store.js";
import { placesText } from "./strings.js";
import { localToday } from "./today.js";
import type { Language } from "./types.js";
import { usePlaces } from "./usePlaces.js";
import "./places.css";

/** /places/:id. Everything shown is read from the packs on this device. A place in no pack reads as UNKNOWN. */
export function PlaceDetail({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const params = useParams();
  const id = decodePlaceId(params.id);
  const { merged } = usePlaces(storage);
  const savedStore = useMemo(() => createSavedStore(storage), [storage]);
  const [isSaved, setIsSaved] = useState(() => (id === null ? false : savedStore.has(id)));
  const [message, setMessage] = useState("");
  const today = localToday();
  const t = (key: MoreKey, vars?: Record<string, string | number>) => moreText(language, key, vars);

  const place = id === null ? undefined : merged.places.find((item) => item.id === id);
  const detail = place ? buildDetail(place, today, language) : null;
  const title = detail ? (detail.name ?? placesText(language, "unnamed")) : t("detailTitle");

  const planItem = useMemo(() => {
    if (id === null || !place) return null;
    const entry = { id, name: place.record.name ?? null, note: "", savedOn: today };
    return buildPlan(resolveSaved([entry], [place]), new Set([id]), today, language)[0] ?? null;
  }, [id, place, today, language]);

  function toggleSaved() {
    if (id === null) return;
    if (isSaved) {
      savedStore.remove(id);
      setIsSaved(false);
      setMessage(t("detailUnsavedMsg"));
      return;
    }
    const result = savedStore.add({ id, name: place?.record.name ?? null, note: "", savedOn: today });
    if (result.ok) {
      setIsSaved(true);
      setMessage(t("detailSavedMsg"));
    } else {
      setMessage(result.reason === "too-many" ? t("detailSaveMany", { max: MAX_SAVED }) : t("detailSaveFailed"));
    }
  }

  async function copySummary() {
    if (!detail) return;
    setMessage((await copyText(detail.summary)) ? t("detailCopied") : t("detailCopyFailed"));
  }

  const correctQuery = place
    ? `?lat=${place.record.lat}&lon=${place.record.lon}${place.record.name ? `&name=${encodeURIComponent(place.record.name)}` : ""}`
    : "";

  return (
    <div className="places">
      <h1>{title}</h1>
      <PlacesNav language={language} />
      <p>
        <Link to="/places" className="place-link">
          {t("detailBack")}
        </Link>
      </p>

      {detail === null || place === undefined ? (
        <p role="status">{t("detailNotFound")}</p>
      ) : (
        <>
          <section aria-labelledby="detail-status">
            <h2 id="detail-status">{t("detailStatusHeading")}</h2>
            <p>
              <strong>{detail.statusText}.</strong>
            </p>
            {detail.conflict ? <p>{placesText(language, place.conflict === "location" ? "conflictLocation" : "conflictStatus")}</p> : null}
            <p>{detail.freshnessText}</p>
            <p className="hint">{placesText(language, "notChecked")}</p>
          </section>

          <section aria-labelledby="detail-reports">
            <h2 id="detail-reports">{t("detailReportsHeading", { count: detail.reportLines.length })}</h2>
            <ul>
              {detail.reportLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="detail-location">
            <h2 id="detail-location">{t("detailLocationHeading")}</h2>
            <p>{t("detailCoordinates", { coords: detail.coordinates })}</p>
            <p className="hint">{t("detailNoDirections")}</p>
            <p>
              <a className="place-link" href={detail.geoUri}>
                {t("detailGeoLink")}
              </a>
            </p>
          </section>

          {planItem ? (
            <section aria-labelledby="detail-questions">
              <h2 id="detail-questions">{t("detailQuestionsLink")}</h2>
              <ul className="place-list">
                <PlanCard item={planItem} language={language} level="h3" compact />
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="detail-summary">
            <h2 id="detail-summary">{t("detailSummaryHeading")}</h2>
            <textarea className="summary-text" readOnly rows={8} aria-labelledby="detail-summary" value={detail.summary} />
          </section>

          <p className="places-actions">
            <button type="button" onClick={toggleSaved}>
              {isSaved ? t("detailUnsave") : t("detailSave")}
            </button>
            <button type="button" onClick={() => void copySummary()}>
              {t("detailCopy")}
            </button>
            <Link className="place-link" to={`/places/contribute${correctQuery}`}>
              {t("detailCorrect")}
            </Link>
          </p>
        </>
      )}
      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>
    </div>
  );
}
