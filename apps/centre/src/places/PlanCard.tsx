import { moreText } from "./moreStrings.js";
import type { PlanItem } from "./plan.js";
import { statusLabel } from "./statusText.js";
import type { Language } from "./types.js";

/** One place in a visit plan: what the packs record, then the questions to ask. */
/**
 * compact leaves out the status line and the coordinates, for a page that already shows them
 * above the questions.
 */
export function PlanCard({ item, language, level, compact = false }: { item: PlanItem; language: Language; level: "h2" | "h3"; compact?: boolean }) {
  const Heading = level;
  const t = (key: Parameters<typeof moreText>[1], vars?: Record<string, string | number>) => moreText(language, key, vars);
  return (
    <li>
      {compact ? null : <Heading>{item.name}</Heading>}
      <p>
        {compact ? null : <strong>{statusLabel(item.status, language)}. </strong>}
        {item.lead}
      </p>
      {item.staleNote === null ? null : <p>{item.staleNote}</p>}
      {compact || item.coordinates === null ? null : <p>{t("detailCoordinates", { coords: item.coordinates })}</p>}
      {item.note === "" ? null : <p>{t("planNoteLine", { note: item.note })}</p>}
      <p>
        <strong>{t("planQuestionsHeading")}</strong>
      </p>
      <ol>
        {item.questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ol>
    </li>
  );
}
