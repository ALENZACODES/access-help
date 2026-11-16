import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { explainRecord } from "./docs-bridge.js";
import { parsePack } from "./pack.js";
import {
  searchPlaces,
  sortByDistance,
  sortByName,
  type AccessFilter,
  type Origin,
} from "./filter.js";
import { createPackStore, type KeyValueStorage } from "./store.js";
import { PlacesNav } from "./PlacesNav.js";
import { placesText, type PlacesKey } from "./strings.js";
import { localToday } from "./today.js";
import type { Language, PackFailureCode, ParsedPack, PlaceRecord } from "./types.js";
import "./places.css";

type Notice = { kind: "ok" | "error"; text: string } | null;
type GeoState = "idle" | "asking" | "ok" | "denied" | "unavailable";

const AGE_CHOICES: readonly { value: string; days: number | null; key: PlacesKey }[] = [
  { value: "any", days: null, key: "ageAny" },
  { value: "365", days: 365, key: "ageOneYear" },
  { value: "730", days: 730, key: "ageTwoYears" },
];

export function PlacesBrowse({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const store = useMemo(() => createPackStore(storage), [storage]);
  const [pack, setPack] = useState<ParsedPack | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [text, setText] = useState("");
  const [access, setAccess] = useState<AccessFilter>("any");
  const [age, setAge] = useState("any");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [geo, setGeo] = useState<GeoState>("idle");
  const today = localToday();

  useEffect(() => {
    setPack(store.load());
  }, [store]);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const parsed = parsePack(await file.text());
    input.value = "";
    if (!parsed.ok) {
      const code: PackFailureCode = parsed.code;
      const key = `fail.${code}` as PlacesKey;
      setNotice({ kind: "error", text: `${placesText(language, "importFailedPrefix")} ${placesText(language, key)}` });
      return;
    }
    const saved = store.save(parsed.pack);
    setPack(parsed.pack);
    setOrigin(null);
    setGeo("idle");
    setNotice({
      kind: "ok",
      text: placesText(language, saved.ok ? "importSaved" : "importSavedNotStored", {
        id: parsed.pack.manifest.packId,
        count: parsed.pack.records.length,
      }),
    });
  }

  function removePack() {
    store.clear();
    setPack(null);
    setOrigin(null);
    setGeo("idle");
    setNotice({ kind: "ok", text: placesText(language, "packRemoved") });
  }

  function askForLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeo("unavailable");
      return;
    }
    setGeo("asking");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({ lat: position.coords.latitude, lon: position.coords.longitude });
        setGeo("ok");
      },
      (error) => setGeo(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
      { maximumAge: 0, timeout: 10_000 },
    );
  }

  const maxAgeDays = AGE_CHOICES.find((choice) => choice.value === age)?.days ?? null;
  const result = useMemo(
    () => (pack ? searchPlaces(pack.records, { text, access, maxAgeDays, today }) : null),
    [pack, text, access, maxAgeDays, today],
  );
  const rows = useMemo(() => {
    if (!result) return [];
    if (origin) return sortByDistance(result.matches, origin).map(({ record, km }) => ({ record, km }));
    return sortByName(result.matches, language).map((record) => ({ record, km: null as number | null }));
  }, [result, origin, language]);

  const unknownRows = useMemo(() => (result ? sortByName(result.unknown, language) : []), [result, language]);
  const t = (key: PlacesKey, vars?: Record<string, string | number>) => placesText(language, key, vars);

  const summary = !result
    ? ""
    : result.matches.length === 0
      ? t("resultsNone")
      : result.matches.length === 1
        ? t("resultsOne")
        : t("resultsMany", { count: result.matches.length });

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>
      <p className="review-note">{t("notChecked")}</p>

      <section aria-labelledby="places-import">
        <h2 id="places-import">{t("importHeading")}</h2>
        <label htmlFor="places-file">{t("importLabel")}</label>
        <p id="places-file-help" className="hint">
          {t("importHelp")}
        </p>
        <input
          id="places-file"
          type="file"
          accept=".json,application/json"
          aria-describedby="places-file-help"
          onChange={(event) => void onFile(event)}
        />
        <div role="status" aria-live="polite" className="places-notice">
          {notice?.kind === "ok" ? notice.text : null}
        </div>
        <div role="alert" className="places-notice">
          {notice?.kind === "error" ? notice.text : null}
        </div>
        {pack && pack.warnings.length > 0 ? (
          <>
            <h3>{t("warningsHeading")}</h3>
            <ul>
              {pack.warnings.map((warning, index) => (
                <li key={`${warning.code}-${warning.id}-${index}`}>
                  {t(`warn.${warning.code}` as PlacesKey, { id: warning.id, detail: warning.detail })}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {pack ? (
          <p>
            <button type="button" onClick={removePack}>
              {t("removePack")}
            </button>
          </p>
        ) : null}
      </section>

      {pack && result ? (
        <section aria-labelledby="places-search">
          <h2 id="places-search">{t("searchHeading")}</h2>
          <label htmlFor="places-text">{t("searchLabel")}</label>
          <input
            id="places-text"
            type="search"
            value={text}
            autoComplete="off"
            onChange={(event) => setText(event.currentTarget.value)}
          />
          <label htmlFor="places-access">{t("accessLabel")}</label>
          <select id="places-access" value={access} onChange={(event) => setAccess(event.currentTarget.value as AccessFilter)}>
            <option value="any">{t("accessAny")}</option>
            <option value="yes">{t("accessYes")}</option>
            <option value="yes-or-limited">{t("accessYesOrLimited")}</option>
          </select>
          <label htmlFor="places-age">{t("ageLabel")}</label>
          <select id="places-age" value={age} onChange={(event) => setAge(event.currentTarget.value)}>
            {AGE_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {t(choice.key)}
              </option>
            ))}
          </select>

          <p id="places-distance-help" className="hint">
            {t("distanceHelp")}
          </p>
          <p className="places-actions">
            <button type="button" onClick={() => setOrigin(null)} aria-pressed={origin === null}>
              {t("sortName")}
            </button>
            <button type="button" onClick={askForLocation} aria-describedby="places-distance-help" aria-pressed={origin !== null}>
              {t("sortDistance")}
            </button>
          </p>
          <div role="status" aria-live="polite">
            {geo === "denied" ? t("distanceDenied") : geo === "unavailable" ? t("distanceUnavailable") : null}
          </div>

          <p role="status" aria-live="polite" className="places-count">
            {summary}
          </p>
          <PlaceList rows={rows} language={language} today={today} level="h3" />

          {result.unknown.length > 0 ? (
            <>
              <h3>{t("unknownHeading", { count: result.unknown.length })}</h3>
              <p>{t("unknownExplain")}</p>
              <PlaceList rows={unknownRows.map((record) => ({ record, km: null }))} language={language} today={today} level="h4" />
            </>
          ) : null}
          {result.excluded > 0 ? <p>{t("excludedNote", { count: result.excluded })}</p> : null}
        </section>
      ) : (
        <p>{t("noPack")}</p>
      )}
    </div>
  );
}

function PlaceList({
  rows,
  language,
  today,
  level,
}: {
  rows: readonly { record: PlaceRecord; km: number | null }[];
  language: Language;
  today: string;
  level: "h3" | "h4";
}) {
  if (rows.length === 0) return null;
  const Heading = level;
  return (
    <ul className="place-list">
      {rows.map(({ record, km }) => (
        <li key={record.id}>
          <Heading>{record.name ?? placesText(language, "unnamed")}</Heading>
          <p>{explainRecord(record, today, language)}</p>
          {km === null ? null : (
            <p>{placesText(language, "distanceShown", { km: formatKm(km, language) })}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function formatKm(km: number, language: Language): string {
  return km.toLocaleString(language === "fr" ? "fr-CA" : "en-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
