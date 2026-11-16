import { useMemo } from "react";
import { countByFreshness, countByStatus } from "./filter.js";
import { mergePacks } from "./packs.js";
import { createPackLibrary, type KeyValueStorage } from "./store.js";
import { PlacesNav } from "./PlacesNav.js";
import { placesText, type PlacesKey } from "./strings.js";
import { localToday } from "./today.js";
import type { Language } from "./types.js";
import "./places.css";

/** Explains the labels and the age of the records in the saved pack. It adds no judgement of its own. */
export function PlacesStatus({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const packs = useMemo(() => createPackLibrary(storage).list(), [storage]);
  const merged = useMemo(() => mergePacks(packs), [packs]);
  const today = localToday();
  const t = (key: PlacesKey, vars?: Record<string, string | number>) => placesText(language, key, vars);
  const none = t("packNone");

  return (
    <div className="places">
      <h1>{t("dataTitle")}</h1>
      <PlacesNav language={language} />
      <p>{t("dataLead")}</p>

      <section aria-labelledby="data-pack">
        <h2 id="data-pack">{t("packSummary")}</h2>
        {packs.length > 0 ? (
          <>
            {packs.map((pack) => (
              <dl className="facts" key={pack.manifest.packId}>
                <dt>{t("packId")}</dt>
                <dd>{pack.manifest.packId}</dd>
                <dt>{t("packDate")}</dt>
                <dd>{pack.manifest.generatedOn}</dd>
                <dt>{t("packCount")}</dt>
                <dd>{pack.manifest.recordCount}</dd>
                <dt>{t("packSources")}</dt>
                <dd>{pack.manifest.sources.join(", ") || none}</dd>
                <dt>{t("packLicences")}</dt>
                <dd>{pack.manifest.licences.join(", ") || none}</dd>
                <dt>{t("packOldest")}</dt>
                <dd>{pack.manifest.oldestObservation ?? none}</dd>
                <dt>{t("packNewest")}</dt>
                <dd>{pack.manifest.newestObservation ?? none}</dd>
              </dl>
            ))}
            <p>
              {t("conflictsCount")}
              {language === "fr" ? "\u00a0" : ""}: {merged.conflicts.length}
            </p>
            <StatusCounts language={language} records={merged.records} today={today} />
          </>
        ) : (
          <p>{t("noPackForStatus")}</p>
        )}
      </section>

      <section aria-labelledby="data-meaning">
        <h2 id="data-meaning">{t("meaningHeading")}</h2>
        <ul>
          <li>{t("meaningYes")}</li>
          <li>{t("meaningLimited")}</li>
          <li>{t("meaningNo")}</li>
          <li>{t("meaningUnknown")}</li>
        </ul>
      </section>

      <section aria-labelledby="data-limits">
        <h2 id="data-limits">{t("limitsHeading")}</h2>
        <ul>
          <li>{t("limit1")}</li>
          <li>{t("limit2")}</li>
          <li>{t("limit3")}</li>
          <li>{t("limit4")}</li>
        </ul>
      </section>
    </div>
  );
}

function StatusCounts({
  language,
  records,
  today,
}: {
  language: Language;
  records: Parameters<typeof countByStatus>[0];
  today: string;
}) {
  const status = countByStatus(records);
  const fresh = countByFreshness(records, today);
  const t = (key: PlacesKey) => placesText(language, key);
  const colon = language === "fr" ? "\u00a0:" : ":";
  return (
    <>
      <h3>{t("statusCountsHeading")}</h3>
      <ul>
        <li>{t("labelYes")}{colon} {status.yes}</li>
        <li>{t("labelLimited")}{colon} {status.limited}</li>
        <li>{t("labelNo")}{colon} {status.no}</li>
        <li>{t("labelUnknown")}{colon} {status.UNKNOWN}</li>
      </ul>
      <h3>{t("freshnessHeading")}</h3>
      <ul>
        <li>{t("freshnessRecent")}{colon} {fresh.recent}</li>
        <li>{t("freshnessOlder")}{colon} {fresh.older}</li>
        <li>{t("freshnessUnknown")}{colon} {fresh.unknown}</li>
      </ul>
    </>
  );
}
