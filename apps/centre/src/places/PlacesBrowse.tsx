import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { csvFilename, toCsv, type CsvRow } from "./csv.js";
import { parsePack } from "./pack.js";
import { mergePacks, type MergedPlace } from "./packs.js";
import {
  searchPlaces,
  sortByDistance,
  sortByName,
  withinKm,
  type AccessFilter,
  type Origin,
} from "./filter.js";
import { createPresetStore, MAX_LABEL, MAX_PRESETS, newPresetId, RADIUS_KM, type SearchPreset } from "./presets.js";
import { toolsText, type ToolsKey } from "./toolsStrings.js";
import { PlacePlot } from "./PlacePlot.js";
import { Link } from "react-router-dom";
import { placePath } from "./detail.js";
import { moreText } from "./moreStrings.js";
import { PlacesNav } from "./PlacesNav.js";
import { conflictReportLines, placeSentence } from "./statusText.js";
import { createPackLibrary, type KeyValueStorage } from "./store.js";
import { placesText, type PlacesKey } from "./strings.js";
import { localToday } from "./today.js";
import type { Language, PackFailureCode, ParsedPack, PlaceRecord } from "./types.js";
import "./places.css";

type Notice = { kind: "ok" | "error"; text: string } | null;
type GeoState = "idle" | "asking" | "ok" | "denied" | "unavailable";
type View = "list" | "plot";

const AGE_CHOICES: readonly { value: string; days: number | null; key: PlacesKey }[] = [
  { value: "any", days: null, key: "ageAny" },
  { value: "365", days: 365, key: "ageOneYear" },
  { value: "730", days: 730, key: "ageTwoYears" },
];

export function formatKm(km: number, language: Language): string {
  return km.toLocaleString(language === "fr" ? "fr-CA" : "en-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function downloadText(filename: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function PlacesBrowse({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const library = useMemo(() => createPackLibrary(storage), [storage]);
  const [packs, setPacks] = useState<ParsedPack[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [text, setText] = useState("");
  const [access, setAccess] = useState<AccessFilter>("any");
  const [age, setAge] = useState("any");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [geo, setGeo] = useState<GeoState>("idle");
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const presetStore = useMemo(() => createPresetStore(storage), [storage]);
  const [presets, setPresets] = useState<SearchPreset[]>(() => presetStore.list());
  const [presetLabel, setPresetLabel] = useState("");
  const [presetMessage, setPresetMessage] = useState("");
  const [radius, setRadius] = useState<number | null>(null);
  const today = localToday();
  const tt = (key: ToolsKey, vars?: Record<string, string | number>) => toolsText(language, key, vars);
  const t = (key: PlacesKey, vars?: Record<string, string | number>) => placesText(language, key, vars);

  useEffect(() => {
    setPacks(library.list());
  }, [library]);

  const merged = useMemo(() => mergePacks(packs), [packs]);
  const mergedById = useMemo(() => new Map(merged.places.map((place) => [place.id, place])), [merged]);
  const warnings = packs.flatMap((pack) => pack.warnings.map((warning) => ({ ...warning, pack: pack.manifest.packId })));

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const parsed = parsePack(await file.text());
    input.value = "";
    if (!parsed.ok) {
      const code: PackFailureCode = parsed.code;
      setNotice({ kind: "error", text: `${t("importFailedPrefix")} ${t(`fail.${code}` as PlacesKey)}` });
      return;
    }
    const saved = library.save(parsed.pack);
    if (!saved.ok && saved.reason === "too-many-packs") {
      setNotice({ kind: "error", text: `${t("importFailedPrefix")} ${t("fail.too-many-packs", { max: 8 })}` });
      return;
    }
    // A pack that could not be saved still shows for this visit, as before.
    // Keep the freshly read pack, so its notes about unrecognised statuses stay visible this visit.
    const others = (saved.ok ? library.list() : packs).filter((p) => p.manifest.packId !== parsed.pack.manifest.packId);
    setPacks(saved.ok ? library.list().map((p) => (p.manifest.packId === parsed.pack.manifest.packId ? parsed.pack : p)) : [...others, parsed.pack]);
    setOrigin(null);
    setGeo("idle");
    setNotice({
      kind: "ok",
      text: t(saved.ok ? "importSaved" : "importSavedNotStored", { id: parsed.pack.manifest.packId, count: parsed.pack.records.length }),
    });
  }

  function removePack(packId: string) {
    library.remove(packId);
    setPacks(library.list());
    setOrigin(null);
    setGeo("idle");
    setSelectedId(null);
    setNotice({ kind: "ok", text: t("packRemovedOne", { id: packId }) });
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
  const hasPacks = packs.length > 0;
  const found = useMemo(
    () => (hasPacks ? searchPlaces(merged.records, { text, access, maxAgeDays, today }) : null),
    [hasPacks, merged, text, access, maxAgeDays, today],
  );
  // A distance limit applies only while the device location is known. Places with status UNKNOWN stay listed.
  const result = useMemo(
    () => (found && origin && radius !== null ? { ...found, matches: withinKm(found.matches, origin, radius), unknown: withinKm(found.unknown, origin, radius) } : found),
    [found, origin, radius],
  );
  const rows = useMemo(() => {
    if (!result) return [];
    if (origin) return sortByDistance(result.matches, origin).map(({ record, km }) => ({ record, km }));
    return sortByName(result.matches, language).map((record) => ({ record, km: null as number | null }));
  }, [result, origin, language]);
  const unknownRows = useMemo(() => (result ? sortByName(result.unknown, language) : []), [result, language]);

  const shown: PlaceRecord[] = result ? [...rows.map((row) => row.record), ...unknownRows] : [];
  const selected = selectedId ? shown.find((record) => record.id === selectedId) : undefined;

  function savePreset() {
    const result = presetStore.add({
      id: newPresetId(Date.now(), Math.random),
      label: presetLabel,
      text,
      access,
      maxAgeDays: maxAgeDays === 365 || maxAgeDays === 730 ? maxAgeDays : null,
      radiusKm: radius === 1 || radius === 5 || radius === 25 ? radius : null,
    });
    if (!result.ok) {
      setPresetMessage(result.reason === "label-required" ? tt("presetNeedLabel") : result.reason === "too-many" ? tt("presetMany", { max: MAX_PRESETS }) : tt("presetFailed"));
      return;
    }
    const list = presetStore.list();
    setPresets(list);
    setPresetMessage(tt("presetSaved", { label: list[list.length - 1]?.label ?? presetLabel.trim() }));
    setPresetLabel("");
  }

  function usePreset(preset: SearchPreset) {
    setText(preset.text);
    setAccess(preset.access);
    setAge(preset.maxAgeDays === null ? "any" : String(preset.maxAgeDays));
    setRadius(preset.radiusKm);
    setPresetMessage(preset.radiusKm !== null && origin === null ? `${tt("presetApplied", { label: preset.label })} ${tt("presetNeedsLocation")}` : tt("presetApplied", { label: preset.label }));
  }

  function removePreset(preset: SearchPreset) {
    presetStore.remove(preset.id);
    setPresets(presetStore.list());
    setPresetMessage(tt("presetRemoved", { label: preset.label }));
  }

  function downloadCsv() {
    const csvRows: CsvRow[] = shown.map((record) => {
      const place = mergedById.get(record.id);
      return { record, note: place?.conflict ? placesText("en", "conflictNote", { kind: place.conflict }) : "" };
    });
    downloadText(csvFilename(today), "text/csv", toCsv(csvRows));
  }

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
        {warnings.length > 0 ? (
          <>
            <h3>{t("warningsHeading")}</h3>
            <ul>
              {warnings.map((warning, index) => (
                <li key={`${warning.pack}-${warning.code}-${warning.id}-${index}`}>
                  {t(`warn.${warning.code}` as PlacesKey, { id: warning.id, detail: warning.detail })}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {hasPacks ? (
        <section aria-labelledby="places-packs">
          <h2 id="places-packs">{t("packsHeading", { count: packs.length })}</h2>
          <ul className="place-list">
            {packs.map((pack) => (
              <li key={pack.manifest.packId}>
                <h3>{pack.manifest.packId}</h3>
                <p>{t("packLine", { count: pack.records.length, date: pack.manifest.generatedOn })}</p>
                <button type="button" onClick={() => removePack(pack.manifest.packId)}>
                  {t("removePackOne", { id: pack.manifest.packId })}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {merged.conflicts.length > 0 ? (
        <section aria-labelledby="places-conflicts">
          <h2 id="places-conflicts">{t("conflictsHeading", { count: merged.conflicts.length })}</h2>
          <p>{t("conflictsExplain")}</p>
          <ul className="place-list">
            {merged.conflicts.map((place) => (
              <li key={place.id}>
                <h3>{place.record.name ?? t("unnamed")}</h3>
                <p>{t(place.conflict === "status" ? "conflictStatus" : "conflictLocation")}</p>
                <ul>
                  {conflictReportLines(place, language).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasPacks && result ? (
        <section aria-labelledby="places-search">
          <h2 id="places-search">{t("searchHeading")}</h2>
          <label htmlFor="places-text">{t("searchLabel")}</label>
          <input id="places-text" type="search" value={text} autoComplete="off" onChange={(event) => setText(event.currentTarget.value)} />
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
          <label htmlFor="places-radius">{tt("radiusLabel")}</label>
          <select
            id="places-radius"
            value={radius === null ? "any" : String(radius)}
            onChange={(event) => setRadius(event.currentTarget.value === "any" ? null : Number(event.currentTarget.value))}
          >
            <option value="any">{tt("radiusAny")}</option>
            {RADIUS_KM.map((km) => (
              <option key={km} value={km}>
                {tt(`radius${km}` as ToolsKey)}
              </option>
            ))}
          </select>
          <p className="hint">{radius !== null && origin === null ? tt("radiusNeedsLocation") : tt("radiusNote")}</p>

          <h3>{tt("presetsHeading", { count: presets.length })}</h3>
          <p className="hint">{tt("presetHelp")}</p>
          <label htmlFor="preset-label">{tt("presetNameLabel", { max: MAX_LABEL })}</label>
          <input id="preset-label" type="text" maxLength={MAX_LABEL} value={presetLabel} autoComplete="off" onChange={(event) => setPresetLabel(event.currentTarget.value)} />
          <p className="places-actions">
            <button type="button" onClick={savePreset}>
              {tt("presetSave")}
            </button>
          </p>
          <div role="status" aria-live="polite" className="places-notice">
            {presetMessage}
          </div>
          {presets.length === 0 ? (
            <p>{tt("presetsNone")}</p>
          ) : (
            <ul className="place-list">
              {presets.map((preset) => (
                <li key={preset.id}>
                  <p>{preset.label}</p>
                  <p className="places-actions">
                    <button type="button" onClick={() => usePreset(preset)}>
                      {tt("presetApply", { label: preset.label })}
                    </button>
                    <button type="button" onClick={() => removePreset(preset)}>
                      {tt("presetRemove", { label: preset.label })}
                    </button>
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div role="group" aria-label={t("viewGroup")} className="places-actions">
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
              {t("viewList")}
            </button>
            <button type="button" aria-pressed={view === "plot"} onClick={() => setView("plot")}>
              {t("viewPlot")}
            </button>
          </div>

          <p role="status" aria-live="polite" className="places-count">
            {summary}
          </p>

          {view === "plot" ? (
            <>
              <PlacePlot language={language} items={shown.map((record) => ({ record }))} selectedId={selectedId} onSelect={setSelectedId} />
              {selected ? (
                <div className="plot-details" role="region" aria-label={selected.name ?? t("unnamed")}>
                  <h3>{selected.name ?? t("unnamed")}</h3>
                  <p>{placeSentence(selected, mergedById.get(selected.id), today, language)}</p>
                </div>
              ) : (
                <p className="hint">{t("plotSelectHint")}</p>
              )}
            </>
          ) : null}

          <PlaceList rows={rows} language={language} today={today} level="h3" merged={mergedById} />

          {result.unknown.length > 0 ? (
            <>
              <h3>{t("unknownHeading", { count: result.unknown.length })}</h3>
              <p>{t("unknownExplain")}</p>
              <PlaceList rows={unknownRows.map((record) => ({ record, km: null }))} language={language} today={today} level="h4" merged={mergedById} />
            </>
          ) : null}
          {result.excluded > 0 ? <p>{t("excludedNote", { count: result.excluded })}</p> : null}

          {shown.length > 0 ? (
            <>
              <p className="places-actions">
                <button type="button" onClick={downloadCsv}>
                  {t("csvButton")}
                </button>
              </p>
              <p className="hint">{t("csvNote")}</p>
            </>
          ) : null}
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
  merged,
}: {
  rows: readonly { record: PlaceRecord; km: number | null }[];
  language: Language;
  today: string;
  level: "h3" | "h4";
  merged: ReadonlyMap<string, MergedPlace>;
}) {
  if (rows.length === 0) return null;
  const Heading = level;
  return (
    <ul className="place-list">
      {rows.map(({ record, km }) => (
        <li key={record.id}>
          <Heading>{record.name ?? placesText(language, "unnamed")}</Heading>
          <p>{placeSentence(record, merged.get(record.id), today, language)}</p>
          {km === null ? null : <p>{placesText(language, "distanceShown", { km: formatKm(km, language) })}</p>}
          <p>
            <Link className="place-link" to={placePath(record.id)}>
              {moreText(language, "detailOpen", { name: record.name ?? placesText(language, "unnamed") })}
            </Link>
          </p>
        </li>
      ))}
    </ul>
  );
}
