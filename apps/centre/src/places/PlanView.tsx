import { useMemo, useState } from "react";
import { copyText } from "./clipboard.js";
import { moreText, type MoreKey } from "./moreStrings.js";
import { PlanCard } from "./PlanCard.js";
import { buildPlan, planText } from "./plan.js";
import { PlacesNav } from "./PlacesNav.js";
import { createSavedStore, resolveSaved } from "./saved.js";
import type { KeyValueStorage } from "./store.js";
import { placesText } from "./strings.js";
import { localToday } from "./today.js";
import type { Language } from "./types.js";
import { usePlaces } from "./usePlaces.js";
import "./places.css";
import "./print.css";

/** A printable call-ahead list for the saved places a person picks. */
export function PlanView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const { merged } = usePlaces(storage);
  const resolved = useMemo(() => resolveSaved(createSavedStore(storage).list(), merged.places), [storage, merged]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(resolved.map((item) => item.saved.id)));
  const [message, setMessage] = useState("");
  const today = localToday();
  const t = (key: MoreKey, vars?: Record<string, string | number>) => moreText(language, key, vars);
  const items = buildPlan(resolved, picked, today, language);

  function toggle(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }

  async function copyPlan() {
    setMessage((await copyText(planText(items, today, language))) ? t("planCopied") : t("planCopyFailed"));
  }

  return (
    <div className="places plan">
      <h1>{t("planTitle")}</h1>
      <div className="no-print">
        <PlacesNav language={language} />
        <p>{t("planLead")}</p>
      </div>

      {resolved.length === 0 ? (
        <p>{t("planNone")}</p>
      ) : (
        <>
          <fieldset className="no-print">
            <legend>{t("planPick")}</legend>
            {resolved.map(({ saved, place }) => (
              <label key={saved.id}>
                <input type="checkbox" checked={picked.has(saved.id)} onChange={() => toggle(saved.id)} />
                {place?.record.name ?? saved.name ?? placesText(language, "unnamed")}
              </label>
            ))}
          </fieldset>

          <p className="places-actions no-print">
            <button type="button" onClick={() => window.print()} disabled={items.length === 0}>
              {t("planPrint")}
            </button>
            <button type="button" onClick={() => void copyPlan()} disabled={items.length === 0}>
              {t("planCopy")}
            </button>
          </p>
          <div role="status" aria-live="polite" className="places-notice no-print">
            {message}
          </div>

          {items.length === 0 ? (
            <p>{t("planNothingPicked")}</p>
          ) : (
            <section aria-labelledby="plan-made">
              <h2 id="plan-made">{t("planMadeOn", { date: today })}</h2>
              <ul className="place-list">
                {items.map((item) => (
                  <PlanCard key={item.id} item={item} language={language} level="h3" />
                ))}
              </ul>
              <p>{t("planFooter")}</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
