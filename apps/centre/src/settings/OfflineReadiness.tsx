import { useCallback, useEffect, useState } from "react";
import { createPackLibrary, type KeyValueStorage } from "../places/store.js";
import { collectReadiness, evaluateReadiness, requestPersistence, type BrowserLike, type CacheStorageLike, type ReadinessItem } from "./readiness.js";
import { settingsText, type SettingsKey } from "./strings.js";

type Language = "en" | "fr";

/** Lists what the browser said about offline use. The state is always written out, never colour alone. */
export function OfflineReadiness({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const [items, setItems] = useState<ReadinessItem[] | null>(null);
  const [message, setMessage] = useState("");
  const t = (key: SettingsKey, vars?: Record<string, string | number>) => settingsText(language, key, vars);

  const read = useCallback(async () => {
    const browser = navigator as unknown as BrowserLike;
    const caches = typeof window.caches === "undefined" ? undefined : (window.caches as unknown as CacheStorageLike);
    const packCount = createPackLibrary(storage).list().length;
    setItems(evaluateReadiness(await collectReadiness(browser, caches, packCount)));
  }, [storage]);

  useEffect(() => {
    void read();
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    return () => {
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
    };
  }, [read]);

  async function persist() {
    const answer = await requestPersistence(navigator as unknown as BrowserLike);
    setMessage(answer === true ? t("persistGranted") : t("persistDenied"));
    await read();
  }

  const persistence = items?.find((item) => item.id === "persistence");

  return (
    <section aria-labelledby="readiness-heading">
      <h2 id="readiness-heading">{t("readinessHeading")}</h2>
      <p>{t("readinessLead")}</p>
      {items === null ? (
        <p role="status">{t("checking")}</p>
      ) : (
        <dl className="facts readiness">
          {items.map((item) => (
            <ReadinessRow key={item.id} item={item} language={language} />
          ))}
        </dl>
      )}
      <p className="places-actions">
        <button type="button" onClick={() => void read()}>
          {t("checkAgain")}
        </button>
        {persistence && persistence.variant !== "yes" && typeof navigator.storage?.persist === "function" ? (
          <button type="button" onClick={() => void persist()}>
            {t("persistButton")}
          </button>
        ) : null}
      </p>
      <div role="status" aria-live="polite">
        {message}
      </div>
    </section>
  );
}

function ReadinessRow({ item, language }: { item: ReadinessItem; language: Language }) {
  const t = (key: SettingsKey, vars?: Record<string, string | number>) => settingsText(language, key, vars);
  const colon = language === "fr" ? " :" : ":";
  return (
    <>
      <dt>{t(`item.${item.id}` as SettingsKey)}</dt>
      <dd data-state={item.state}>
        <strong>
          {t(`state.${item.state}` as SettingsKey)}
          {colon}
        </strong>{" "}
        {t(`r.${item.id}.${item.variant}` as SettingsKey, { percent: item.percent ?? 0 })}
      </dd>
    </>
  );
}
