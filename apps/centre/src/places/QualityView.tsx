import { useMemo } from "react";
import { Link } from "react-router-dom";
import { placePath } from "./detail.js";
import { PlacesNav } from "./PlacesNav.js";
import { QualityBlock } from "./QualityBlock.js";
import { NEAR_DUPLICATE_METRES, qualityReport } from "./quality.js";
import type { KeyValueStorage } from "./store.js";
import { placesText } from "./strings.js";
import { toolsText, type ToolsKey } from "./toolsStrings.js";
import { localToday } from "./today.js";
import type { Language } from "./types.js";
import { usePlaces } from "./usePlaces.js";
import "./places.css";

/** Counts of what the loaded packs hold: statuses, ages, unnamed places, possible repeats. No ratings. */
export function QualityView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const { packs, merged } = usePlaces(storage);
  const today = localToday();
  const t = (key: ToolsKey, vars?: Record<string, string | number>) => toolsText(language, key, vars);
  const all = useMemo(() => qualityReport(merged.records, today), [merged, today]);
  const perPack = useMemo(() => packs.map((pack) => ({ id: pack.manifest.packId, report: qualityReport(pack.records, today) })), [packs, today]);
  const nameOf = (id: string) => merged.records.find((record) => record.id === id)?.name ?? placesText(language, "unnamed");

  return (
    <div className="places">
      <h1>{t("qualityTitle")}</h1>
      <PlacesNav language={language} />
      <p>{t("qualityLead")}</p>

      {packs.length === 0 ? (
        <p>{t("qualityNone")}</p>
      ) : (
        <>
          <section aria-labelledby="quality-all">
            <h2 id="quality-all">{t("qualityAll")}</h2>
            <QualityBlock report={all} language={language} />
            <p>
              {placesText(language, "conflictsCount")}
              {language === "fr" ? " " : ""}: {merged.conflicts.length}
            </p>
          </section>

          {all.nearDuplicates.length > 0 ? (
            <section aria-labelledby="quality-dups">
              <h2 id="quality-dups">{t("qualityDuplicatesHeading", { count: all.nearDuplicates.length })}</h2>
              <p className="hint">{t("qDuplicates", { metres: NEAR_DUPLICATE_METRES, count: all.nearDuplicates.length })}</p>
              <ul>
                {all.nearDuplicates.map((pair) => (
                  <li key={`${pair.a}-${pair.b}`}>
                    {t("qualityDuplicateLine", { a: pair.a, b: pair.b, metres: pair.metres })}{" "}
                    <Link className="place-link" to={placePath(pair.a)}>
                      {t("qualityOpen", { name: nameOf(pair.a) })}
                    </Link>{" "}
                    <Link className="place-link" to={placePath(pair.b)}>
                      {t("qualityOpen", { name: nameOf(pair.b) })}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {all.outsideArea.length > 0 ? (
            <section aria-labelledby="quality-outside">
              <h2 id="quality-outside">{t("qualityOutsideHeading", { count: all.outsideArea.length })}</h2>
              <p className="hint">{t("qualityOutsideNote")}</p>
              <ul>
                {all.outsideArea.map((id) => (
                  <li key={id}>
                    <Link className="place-link" to={placePath(id)}>
                      {t("qualityOpen", { name: nameOf(id) })}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {all.unnamed.length > 0 ? (
            <section aria-labelledby="quality-unnamed">
              <h2 id="quality-unnamed">{t("qualityUnnamedHeading", { count: all.unnamed.length })}</h2>
              <ul>
                {all.unnamed.map((id) => (
                  <li key={id}>
                    <Link className="place-link" to={placePath(id)}>
                      {t("qualityOpen", { name: id })}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {perPack.map(({ id, report }) => (
            <section key={id} aria-labelledby={`quality-pack-${id}`}>
              <h2 id={`quality-pack-${id}`}>{t("qualityPackHeading", { id })}</h2>
              <QualityBlock report={report} language={language} />
            </section>
          ))}
        </>
      )}
    </div>
  );
}
