import { toolsText, type ToolsKey } from "./toolsStrings.js";
import { NEAR_DUPLICATE_METRES, type QualityReport } from "./quality.js";
import type { Language } from "./types.js";

/** The counts of one quality report, as a list. Counts only: nothing here rates a pack. */
export function QualityBlock({ report, language }: { report: QualityReport; language: Language }) {
  const t = (key: ToolsKey, vars?: Record<string, string | number>) => toolsText(language, key, vars);
  if (report.total === 0) return <p>{t("qNoPlaces")}</p>;
  return (
    <ul>
      <li>{t("qTotal", { count: report.total })}</li>
      <li>
        {t("qStatus", { yes: report.status.yes, limited: report.status.limited, no: report.status.no, unknown: report.status.UNKNOWN })}
      </li>
      <li>{t("qFresh", { recent: report.freshness.recent, older: report.freshness.older, unknown: report.freshness.unknown })}</li>
      {report.unknownPercent === null ? null : <li>{t("qUnknownShare", { percent: report.unknownPercent })}</li>}
      {report.olderPercent === null ? null : <li>{t("qOlderShare", { percent: report.olderPercent })}</li>}
      <li>{t("qUnnamed", { count: report.unnamed.length })}</li>
      <li>{t("qDuplicates", { metres: NEAR_DUPLICATE_METRES, count: report.nearDuplicates.length })}</li>
      <li>{t("qOutside", { count: report.outsideArea.length })}</li>
    </ul>
  );
}
