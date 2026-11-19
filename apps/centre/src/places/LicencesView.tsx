import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SHARE_NOTICE_FORMS, toggleShareCheck, type ShareCheckId, type ShareNoticeForm } from "./docs-bridge.js";
import { LICENCE_SCOPES, buildLicencesView, licencesFile, partFile, startScope, type LicenceScope, type LicencesFile, type LicencesFileKind } from "./licencesModel.js";
import { licencesText, type LicencesKey } from "./licencesStrings.js";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import { usePlaces } from "./usePlaces.js";
import "./places.css";
import "./licences.css";

function download(file: LicencesFile) {
  const url = URL.createObjectURL(new Blob([file.content], { type: `${file.mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const SCOPE_KEY: Record<LicenceScope, LicencesKey> = { mine: "scopeMine", packs: "scopePacks", both: "scopeBoth" };
const FORM_KEY: Record<ShareNoticeForm, LicencesKey> = { short: "noticeShort", full: "noticeFull" };

/**
 * Explains what the licences on the records on this device ask when the records are shared:
 * the mix, the sources, a credit text, a notice, a split into files and a list to tick. It reads
 * the records and changes none of them. A short summary, not legal advice.
 */
export function LicencesView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const { merged } = usePlaces(storage);
  const today = localToday();
  const [mine, setMine] = useState<PlaceRecord[]>([]);
  const [scope, setScope] = useState<LicenceScope>("mine");
  const [form, setForm] = useState<ShareNoticeForm>("short");
  const [done, setDone] = useState<ShareCheckId[]>([]);
  const [message, setMessage] = useState("");
  const t = (key: LicencesKey, vars?: Record<string, string | number>) => licencesText(language, key, vars);

  useEffect(() => {
    const saved = drafts.list();
    setMine(saved);
    setScope(startScope(saved, merged.records));
  }, [drafts, merged.records]);

  const view = useMemo(() => buildLicencesView(mine, merged.records, scope, form, done, language), [mine, merged.records, scope, form, done, language]);

  function chooseScope(next: LicenceScope) {
    setScope(next);
    setMessage(t("scopeChanged", { count: buildLicencesView(mine, merged.records, next, form, done, language).scopeCounts[next] }));
  }

  function file(kind: LicencesFileKind) {
    const made = licencesFile(kind, view, today, language);
    if (made !== null) download(made);
  }

  function part(licence: string) {
    const made = partFile(licence, view, today);
    if (made !== null) download(made);
  }

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>
      <p className="licences-advice" data-testid="licences-advice">
        {view.guide.notAdvice}
      </p>

      <fieldset className="licences-choice">
        <legend>{t("scopeLegend")}</legend>
        {LICENCE_SCOPES.map((item) => (
          <label key={item}>
            <input type="radio" name="licences-scope" checked={scope === item} onChange={() => chooseScope(item)} /> {t(SCOPE_KEY[item], { count: view.scopeCounts[item] })}
          </label>
        ))}
      </fieldset>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      {view.records.length === 0 ? (
        <>
          <p>{t("empty")}</p>
          <p className="places-actions">
            <Link to="/places/contribute" className="licences-link">
              {t("addLink")}
            </Link>
            <Link to="/places" className="licences-link">
              {t("packsLink")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <section aria-labelledby="licences-together">
            <h2 id="licences-together">{t("togetherHeading")}</h2>
            <p data-testid="licences-mix">
              <strong>{view.guide.label}</strong>
            </p>
            <p data-testid="licences-summary">{view.guide.summary}</p>
            <p>{view.guide.explanation}</p>
            <h3>{t("dutiesHeading")}</h3>
            {view.guide.duties.length === 0 ? (
              <p>{t("noDuties")}</p>
            ) : (
              <ul data-testid="licences-duties">
                {view.guide.duties.map((duty) => (
                  <li key={duty}>{duty}</li>
                ))}
              </ul>
            )}
            {view.guide.missingSource > 0 ? <p>{t("missingSource", { n: view.guide.missingSource })}</p> : null}
          </section>

          <section aria-labelledby="licences-sources">
            <h2 id="licences-sources">{t("sourcesHeading")}</h2>
            <div className="places-scroll" tabIndex={0} role="group" aria-labelledby="licences-sources">
              <table className="licences-table">
                <caption>{t("sourcesCaption")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("colSource")}</th>
                    <th scope="col">{t("colLicence")}</th>
                    <th scope="col">{t("colRecords")}</th>
                    <th scope="col">{t("colSeen")}</th>
                    <th scope="col">{t("colStatus")}</th>
                    <th scope="col">{t("colCredit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((row) => (
                    <tr key={row.key}>
                      <th scope="row">{row.source}</th>
                      <td>
                        {row.licence}
                        {row.accepted ? null : <span className="licences-flag"> ({t("notTaken")})</span>}
                      </td>
                      <td>{row.count}</td>
                      <td>{row.seen}</td>
                      <td>{row.statuses}</td>
                      <td>{row.credit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="licences-credits">
            <h2 id="licences-credits">{t("creditsHeading")}</h2>
            {view.guide.credits === "" ? (
              <p>{t("noCredits")}</p>
            ) : (
              <>
                <label htmlFor="licences-credit-text">{t("creditsLabel")}</label>
                <p id="licences-credit-help" className="hint">
                  {t("creditsHelp")}
                </p>
                <textarea id="licences-credit-text" className="licences-copy" readOnly rows={6} value={view.guide.credits} aria-describedby="licences-credit-help" />
              </>
            )}
          </section>

          <section aria-labelledby="licences-notice">
            <h2 id="licences-notice">{t("noticeHeading")}</h2>
            <fieldset className="licences-choice">
              <legend>{t("noticeFormLegend")}</legend>
              {SHARE_NOTICE_FORMS.map((item) => (
                <label key={item}>
                  <input type="radio" name="licences-notice-form" checked={form === item} onChange={() => setForm(item)} /> {t(FORM_KEY[item])}
                </label>
              ))}
            </fieldset>
            <p id="licences-notice-help" data-testid="licences-notice-hint">
              {view.noticeHint}
            </p>
            {view.plan.notice.text === "" ? null : (
              <>
                <label htmlFor="licences-notice-text">{t("noticeLabel")}</label>
                <textarea id="licences-notice-text" className="licences-copy" readOnly rows={form === "short" ? 3 : 8} value={view.plan.notice.text} aria-describedby="licences-notice-help licences-notice-count" />
                <p id="licences-notice-count">{t("noticeCount", { n: view.plan.notice.length })}</p>
              </>
            )}
          </section>

          <section aria-labelledby="licences-split">
            <h2 id="licences-split">{t("splitHeading")}</h2>
            <p data-testid="licences-split-label">
              <strong>{view.splitLabel}</strong>
            </p>
            <p>{view.splitAdvice}</p>
            {view.parts.map((item) => (
              <div key={item.licence} className="licences-part" data-testid={`licences-part-${item.licence}`}>
                <h3>{item.heading}</h3>
                <p>{item.sources}</p>
                <ul>
                  {item.duties.map((duty) => (
                    <li key={duty}>{duty}</li>
                  ))}
                </ul>
                <p>
                  <button type="button" onClick={() => part(item.licence)}>
                    {t("partDownload", { licence: item.licence })}
                  </button>
                </p>
              </div>
            ))}
            {view.leftOut.length > 0 ? (
              <ul data-testid="licences-left-out">
                {view.leftOut.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {view.parts.length > 0 ? <p>{t("partNote")}</p> : null}
          </section>

          <section aria-labelledby="licences-checklist">
            <h2 id="licences-checklist">{t("checklistHeading")}</h2>
            <fieldset className="licences-checks">
              <legend>{t("checklistLegend")}</legend>
              {view.plan.checklist.map((item) => (
                <div key={item.id} className="licences-check">
                  <label>
                    <input type="checkbox" checked={view.ticks.includes(item.id)} onChange={() => setDone((now) => toggleShareCheck(now, item.id, view.plan.checklist))} /> {item.text}
                  </label>
                  <p className="hint">{t("why", { why: item.why })}</p>
                </div>
              ))}
            </fieldset>
            <p role="status" data-testid="licences-progress">
              {view.progress}
            </p>
          </section>

          <section aria-labelledby="licences-files">
            <h2 id="licences-files">{t("filesHeading")}</h2>
            <p className="places-actions">
              <button type="button" onClick={() => file("guide")}>
                {t("downloadGuide")}
              </button>
              <button type="button" onClick={() => file("plan")}>
                {t("downloadPlan")}
              </button>
              <button type="button" onClick={() => file("sources")}>
                {t("downloadSources")}
              </button>
              {view.plan.notice.text === "" ? null : (
                <button type="button" onClick={() => file("notice")}>
                  {t("downloadNotice")}
                </button>
              )}
            </p>
            <p>{t("filesNote")}</p>
          </section>
        </>
      )}

      <section aria-labelledby="licences-facts">
        <h2 id="licences-facts">{t("factsHeading")}</h2>
        {view.guide.facts.map((facts) => (
          <details key={facts.id} className="licences-details">
            <summary>
              {facts.id} ({facts.fullName})
            </summary>
            <p>{facts.inShort}</p>
            <h3>{t("youMay")}</h3>
            <ul>
              {facts.youMay.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <h3>{t("youMust")}</h3>
            {facts.youMust.length === 0 ? (
              <p>{t("youMustNothing")}</p>
            ) : (
              <ul>
                {facts.youMust.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            <h3>{t("goodToKnow")}</h3>
            <ul>
              {facts.goodToKnow.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      <section aria-labelledby="licences-questions">
        <h2 id="licences-questions">{t("questionsHeading")}</h2>
        {view.guide.questions.map((item) => (
          <details key={item.id} className="licences-details">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
        <p>{view.guide.osmNote}</p>
      </section>
    </div>
  );
}
