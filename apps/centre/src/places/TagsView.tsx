import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { buildTagsView, startId, tagsFile } from "./tagsModel.js";
import { tagsText, type TagsKey } from "./tagsStrings.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./tags.css";

function download(file: { filename: string; mime: string; content: string }) {
  const url = URL.createObjectURL(new Blob([file.content], { type: `${file.mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Shows the OpenStreetMap tags for one of a person's own observations, the steps for typing
 * them by hand, and how they sit beside tags pasted from the map. It reads the observations
 * and changes none of them. The App adds nothing to the map.
 */
export function TagsView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [message, setMessage] = useState("");
  const t = (key: TagsKey, vars?: Record<string, string | number>) => tagsText(language, key, vars);

  useEffect(() => {
    const saved = drafts.list();
    setRecords(saved);
    setChosen(startId(saved));
  }, [drafts]);

  const view = useMemo(() => buildTagsView(records, chosen, pasted, language), [records, chosen, pasted, language]);
  const detail = view.detail;

  function choose(id: string) {
    setChosen(id);
    // Tags pasted for one place say nothing about another, so they do not follow the choice.
    setPasted("");
    const next = buildTagsView(records, id, "", language).detail;
    setMessage(next === null ? "" : t("shown", { name: next.name }));
  }

  function clearPaste() {
    setPasted("");
    setMessage(t("pasteCleared"));
  }

  function file() {
    const made = tagsFile(view, language);
    if (made !== null) download(made);
  }

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>
      <p className="tags-note" data-testid="tags-never">
        {view.neverUploads}
      </p>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      {detail === null ? (
        <>
          <p>{t("noNotes")}</p>
          <p>
            <Link to="/places/contribute" className="tags-link">
              {t("addLink")}
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="tags-choose">
            <label htmlFor="tags-choose">{t("chooseLabel")}</label>
            <select id="tags-choose" value={view.chosenId ?? ""} onChange={(e) => choose(e.currentTarget.value)}>
              {view.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </p>

          <section aria-labelledby="tags-record">
            <h2 id="tags-record">{t("recordHeading")}</h2>
            <p>
              <strong>{detail.name}</strong>
            </p>
            <p data-testid="tags-record-line">{detail.recordLine}</p>
          </section>

          <section aria-labelledby="tags-tags">
            <h2 id="tags-tags">{t("tagsHeading")}</h2>
            {detail.tags.length === 0 ? (
              <p>{t("noTags")}</p>
            ) : (
              <>
                <table className="tags-table" data-testid="tags-table">
                  <caption>{t("tagsCaption")}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t("colKey")}</th>
                      <th scope="col">{t("colValue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.tags.map((tag) => (
                      <tr key={tag.key}>
                        <th scope="row">{tag.key}</th>
                        <td>{tag.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <label htmlFor="tags-copy">{t("copyLabel")}</label>
                <p id="tags-copy-help" className="hint">
                  {t("copyHelp")}
                </p>
                <textarea id="tags-copy" className="tags-text" readOnly rows={Math.max(2, detail.tags.length)} value={detail.copyText} aria-describedby="tags-copy-help" />
              </>
            )}
            {detail.heldBack.length > 0 ? (
              <>
                <h3>{t("heldBackHeading")}</h3>
                <ul data-testid="tags-held-back">
                  {detail.heldBack.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {detail.problems.length > 0 ? (
              <>
                <h3>{t("problemsHeading")}</h3>
                <ul data-testid="tags-problems">
                  {detail.problems.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <section aria-labelledby="tags-steps">
            <h2 id="tags-steps">{t("stepsHeading")}</h2>
            <ol data-testid="tags-steps-list">
              {detail.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="tags-paste-heading">
            <h2 id="tags-paste-heading">{t("pasteHeading")}</h2>
            <label htmlFor="tags-paste">{t("pasteLabel")}</label>
            <p id="tags-paste-help" className="hint">
              {t("pasteHelp")}
            </p>
            <textarea id="tags-paste" className="tags-text" rows={6} value={pasted} spellCheck={false} autoComplete="off" aria-describedby="tags-paste-help" onChange={(e) => setPasted(e.currentTarget.value)} />
            {pasted === "" ? null : (
              <p>
                <button type="button" onClick={clearPaste}>
                  {t("clearPaste")}
                </button>
              </p>
            )}
            {detail.pasteNotes.length > 0 ? (
              <ul data-testid="tags-paste-notes">
                {detail.pasteNotes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {detail.compare === null ? null : (
              <>
                <p role="status" data-testid="tags-summary">
                  {detail.compare.summary}
                </p>
                <div className="places-scroll" tabIndex={0} role="group" aria-labelledby="tags-paste-heading">
                  <table className="tags-table" data-testid="tags-compare">
                    <caption>{t("compareCaption")}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t("colKey")}</th>
                        <th scope="col">{t("colMine")}</th>
                        <th scope="col">{t("colOnMap")}</th>
                        <th scope="col">{t("colWhat")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.compare.rows.map((row) => (
                        <tr key={row.key} data-kind={row.kind}>
                          <th scope="row">{row.key}</th>
                          <td>{row.mine ?? t("none")}</td>
                          <td>{row.onMap ?? t("none")}</td>
                          <td>{row.what}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {detail.compare.cautions.length > 0 ? (
                  <>
                    <h3>{t("cautionsHeading")}</h3>
                    <ul data-testid="tags-cautions">
                      {detail.compare.cautions.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            )}
          </section>

          <section aria-labelledby="tags-changeset">
            <h2 id="tags-changeset">{t("changesetHeading")}</h2>
            {detail.comment === "" ? null : (
              <>
                <label htmlFor="tags-comment">{t("commentLabel")}</label>
                <textarea id="tags-comment" className="tags-text" readOnly rows={3} value={detail.comment} aria-describedby="tags-changeset-notes" />
                {detail.source === "" ? null : (
                  <>
                    <label htmlFor="tags-source">{t("sourceLabel")}</label>
                    <textarea id="tags-source" className="tags-text" readOnly rows={2} value={detail.source} />
                  </>
                )}
              </>
            )}
            <ul id="tags-changeset-notes" data-testid="tags-changeset-notes">
              {detail.changesetNotes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="tags-files">
            <h2 id="tags-files">{t("filesHeading")}</h2>
            <p className="places-actions">
              <button type="button" onClick={file}>
                {t("download")}
              </button>
              <Link to="/places/check" className="tags-link">
                {t("checkLink")}
              </Link>
            </p>
            <p>{t("filesNote")}</p>
          </section>
        </>
      )}
    </div>
  );
}
