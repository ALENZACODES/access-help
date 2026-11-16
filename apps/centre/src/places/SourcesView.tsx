import { useMemo, useState } from "react";
import { attributionText, licenceNotes, summarizeSources } from "./attribution.js";
import { copyText } from "./clipboard.js";
import { moreText, type MoreKey } from "./moreStrings.js";
import { PlacesNav } from "./PlacesNav.js";
import type { KeyValueStorage } from "./store.js";
import type { Language } from "./types.js";
import { usePlaces } from "./usePlaces.js";
import "./places.css";

export function SourcesView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const { packs } = usePlaces(storage);
  const summary = useMemo(() => summarizeSources(packs), [packs]);
  const attribution = useMemo(() => attributionText(packs, language), [packs, language]);
  const [message, setMessage] = useState("");
  const t = (key: MoreKey, vars?: Record<string, string | number>) => moreText(language, key, vars);

  async function copy() {
    setMessage((await copyText(attribution)) ? t("sourcesCopied") : t("sourcesCopyFailed"));
  }

  return (
    <div className="places">
      <h1>{t("sourcesTitle")}</h1>
      <PlacesNav language={language} />
      <p>{t("sourcesLead")}</p>

      {packs.length === 0 ? (
        <p>{t("sourcesNone")}</p>
      ) : (
        <>
          <section aria-labelledby="sources-packs">
            <h2 id="sources-packs">{t("sourcesPacksHeading", { count: summary.packs.length })}</h2>
            <ul>
              {summary.packs.map((pack) => (
                <li key={pack.packId}>
                  {t("sourcesPackLine", { pack: pack.packId, count: pack.count, licences: pack.licences.join(", "), date: pack.generatedOn })}
                </li>
              ))}
            </ul>
            {summary.oldest !== null && summary.newest !== null ? <p>{t("sourcesRange", { oldest: summary.oldest, newest: summary.newest })}</p> : null}
          </section>

          <section aria-labelledby="sources-licences">
            <h2 id="sources-licences">{t("sourcesLicencesHeading")}</h2>
            <ul>
              {summary.licences.map((item) => (
                <li key={item.name}>{t("sourcesCountLine", { name: item.name, count: item.count })}</li>
              ))}
            </ul>
            {licenceNotes(summary, language).map((note) => (
              <p key={note}>{note}</p>
            ))}
          </section>

          <section aria-labelledby="sources-sources">
            <h2 id="sources-sources">{t("sourcesSourcesHeading")}</h2>
            <ul>
              {summary.sources.map((item) => (
                <li key={item.name}>{t("sourcesCountLine", { name: item.name, count: item.count })}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="sources-attribution">
            <h2 id="sources-attribution">{t("sourcesAttrHeading")}</h2>
            <textarea className="summary-text" readOnly rows={6} aria-labelledby="sources-attribution" value={attribution} />
            <p className="places-actions">
              <button type="button" onClick={() => void copy()}>
                {t("sourcesCopy")}
              </button>
            </p>
            <div role="status" aria-live="polite" className="places-notice">
              {message}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
