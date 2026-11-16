import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { diffPacks, type ChangeKind, type PackDiff } from "./diff.js";
import { diffCsvFilename, diffToCsv } from "./diffCsv.js";
import { placePath } from "./detail.js";
import { PlacesNav } from "./PlacesNav.js";
import { statusLabel } from "./statusText.js";
import type { KeyValueStorage } from "./store.js";
import { placesText } from "./strings.js";
import { toolsText, type ToolsKey } from "./toolsStrings.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import { usePlaces } from "./usePlaces.js";
import "./places.css";

const KIND_KEY: Record<ChangeKind, ToolsKey> = {
  status: "kindStatus",
  location: "kindLocation",
  name: "kindName",
  source: "kindSource",
  licence: "kindLicence",
  date: "kindDate",
};

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Lists what differs between two loaded packs. It says what changed, never whether a change is good. */
export function ChangesView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const { packs } = usePlaces(storage);
  const [olderId, setOlderId] = useState(packs[0]?.manifest.packId ?? "");
  const [newerId, setNewerId] = useState(packs[1]?.manifest.packId ?? "");
  const [shown, setShown] = useState<{ diff: PackDiff; olderId: string; newerId: string } | null>(null);
  const [message, setMessage] = useState("");
  const today = localToday();
  const t = (key: ToolsKey, vars?: Record<string, string | number>) => toolsText(language, key, vars);
  const sep = language === "fr" ? " et " : " and ";
  const colon = language === "fr" ? "\u00a0: " : ": ";

  const older = useMemo(() => packs.find((pack) => pack.manifest.packId === olderId), [packs, olderId]);
  const newer = useMemo(() => packs.find((pack) => pack.manifest.packId === newerId), [packs, newerId]);

  function run() {
    if (!older || !newer || older.manifest.packId === newer.manifest.packId) {
      setShown(null);
      setMessage(t("changesSame"));
      return;
    }
    setMessage("");
    setShown({ diff: diffPacks(older, newer), olderId: older.manifest.packId, newerId: newer.manifest.packId });
  }

  const nameOf = (record: PlaceRecord) => record.name ?? placesText(language, "unnamed");
  const link = (record: PlaceRecord) => (
    <Link className="place-link" to={placePath(record.id)}>
      {t("qualityOpen", { name: nameOf(record) })}
    </Link>
  );

  return (
    <div className="places">
      <h1>{t("changesTitle")}</h1>
      <PlacesNav language={language} />
      <p>{t("changesLead")}</p>

      {packs.length < 2 ? (
        <p>{t("changesNeed")}</p>
      ) : (
        <>
          <label htmlFor="changes-older">{t("changesOlder")}</label>
          <select id="changes-older" value={olderId} onChange={(event) => setOlderId(event.currentTarget.value)}>
            {packs.map((pack) => (
              <option key={pack.manifest.packId} value={pack.manifest.packId}>
                {pack.manifest.packId}
              </option>
            ))}
          </select>
          <label htmlFor="changes-newer">{t("changesNewer")}</label>
          <select id="changes-newer" value={newerId} onChange={(event) => setNewerId(event.currentTarget.value)}>
            {packs.map((pack) => (
              <option key={pack.manifest.packId} value={pack.manifest.packId}>
                {pack.manifest.packId}
              </option>
            ))}
          </select>
          <p className="places-actions">
            <button type="button" onClick={run}>
              {t("changesRun")}
            </button>
          </p>
          <div role="status" aria-live="polite" className="places-notice">
            {message}
          </div>
        </>
      )}

      {shown ? (
        <section aria-labelledby="changes-result">
          <h2 id="changes-result">{`${shown.olderId}${sep}${shown.newerId}`}</h2>
          <p role="status">
            {t("changesSummary", { added: shown.diff.added.length, removed: shown.diff.removed.length, changed: shown.diff.changed.length, unchanged: shown.diff.unchanged })}
          </p>
          {shown.diff.added.length + shown.diff.removed.length + shown.diff.changed.length === 0 ? <p>{t("changesNothing")}</p> : null}

          <h3>{t("changesTransitionsHeading")}</h3>
          {shown.diff.transitions.length === 0 ? (
            <p>{t("changesNoTransitions")}</p>
          ) : (
            <ul>
              {shown.diff.transitions.map((item) => (
                <li key={`${item.from}-${item.to}`}>
                  {t("changesTransition", { from: statusLabel(item.from, language), to: statusLabel(item.to, language), count: item.count })}
                </li>
              ))}
            </ul>
          )}

          {shown.diff.changed.length > 0 ? (
            <>
              <h3>{t("changesChangedHeading", { count: shown.diff.changed.length })}</h3>
              <ul className="place-list">
                {shown.diff.changed.map((item) => (
                  <li key={item.id}>
                    <p>{t("changesDiffers", { name: nameOf(item.after), kinds: item.kinds.map((kind) => t(KIND_KEY[kind])).join(", ") })}</p>
                    {item.kinds.includes("status") ? (
                      <p>{t("changesStatusLine", { before: statusLabel(item.before.wheelchair, language), after: statusLabel(item.after.wheelchair, language) })}</p>
                    ) : null}
                    {link(item.after)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {shown.diff.added.length > 0 ? (
            <>
              <h3>{t("changesAddedHeading", { id: shown.newerId, count: shown.diff.added.length })}</h3>
              <ul className="place-list">
                {shown.diff.added.map((record) => (
                  <li key={record.id}>
                    <p>
                      {`${nameOf(record)}${colon}${statusLabel(record.wheelchair, language)}`}
                    </p>
                    {link(record)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {shown.diff.removed.length > 0 ? (
            <>
              <h3>{t("changesRemovedHeading", { id: shown.olderId, count: shown.diff.removed.length })}</h3>
              <ul className="place-list">
                {shown.diff.removed.map((record) => (
                  <li key={record.id}>
                    <p>
                      {`${nameOf(record)}${colon}${statusLabel(record.wheelchair, language)}`}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <p className="places-actions">
            <button type="button" onClick={() => download(diffCsvFilename(today), diffToCsv(shown.diff))}>
              {t("changesCsv")}
            </button>
          </p>
          <p className="hint">{t("changesCsvNote")}</p>
        </section>
      ) : null}
    </div>
  );
}
