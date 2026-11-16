import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { placePath } from "./detail.js";
import { moreText, type MoreKey } from "./moreStrings.js";
import { PlacesNav } from "./PlacesNav.js";
import { createSavedStore, MAX_NOTE, resolveSaved, type SavedPlace } from "./saved.js";
import { placeSentence } from "./statusText.js";
import type { KeyValueStorage } from "./store.js";
import { placesText } from "./strings.js";
import { localToday } from "./today.js";
import type { Language } from "./types.js";
import { usePlaces } from "./usePlaces.js";
import "./places.css";

export function SavedView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const { merged } = usePlaces(storage);
  const store = useMemo(() => createSavedStore(storage), [storage]);
  const [saved, setSaved] = useState<SavedPlace[]>(() => store.list());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const today = localToday();
  const t = (key: MoreKey, vars?: Record<string, string | number>) => moreText(language, key, vars);
  const resolved = resolveSaved(saved, merged.places);
  const nameOf = (entry: SavedPlace, current: string | null) => current ?? entry.name ?? placesText(language, "unnamed");

  function saveNote(entry: SavedPlace) {
    const result = store.setNote(entry.id, drafts[entry.id] ?? entry.note);
    setSaved(store.list());
    setMessage(result.ok ? t("savedNoteSaved") : t("savedFailed"));
  }

  function remove(entry: SavedPlace, name: string) {
    store.remove(entry.id);
    setSaved(store.list());
    setMessage(t("savedRemoved", { name }));
  }

  return (
    <div className="places">
      <h1>{t("savedTitle")}</h1>
      <PlacesNav language={language} />
      <p>{t("savedLead")}</p>
      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      {resolved.length === 0 ? (
        <p>{t("savedNone")}</p>
      ) : (
        <section aria-labelledby="saved-list">
          <h2 id="saved-list">{t("savedHeading", { count: resolved.length })}</h2>
          <ul className="place-list">
            {resolved.map(({ saved: entry, place }) => {
              const name = nameOf(entry, place?.record.name ?? null);
              const noteId = `note-${entry.id}`;
              return (
                <li key={entry.id}>
                  <h3>{name}</h3>
                  <p>{place ? placeSentence(place.record, place, today, language) : t("savedNotInPacks")}</p>
                  <p className="hint">{t("savedSince", { date: entry.savedOn })}</p>
                  <label htmlFor={noteId}>{t("savedNoteLabel", { name, max: MAX_NOTE })}</label>
                  <textarea
                    id={noteId}
                    rows={2}
                    maxLength={MAX_NOTE}
                    value={drafts[entry.id] ?? entry.note}
                    onChange={(event) => setDrafts({ ...drafts, [entry.id]: event.currentTarget.value })}
                  />
                  <p className="places-actions">
                    <Link className="place-link" to={placePath(entry.id)}>
                      {t("detailOpen", { name })}
                    </Link>
                    <button type="button" onClick={() => saveNote(entry)}>
                      {t("savedNoteSave", { name })}
                    </button>
                    <button type="button" onClick={() => remove(entry, name)}>
                      {t("savedRemove", { name })}
                    </button>
                  </p>
                </li>
              );
            })}
          </ul>
          <p>
            <Link className="place-link" to="/places/plan">
              {t("savedPlan")}
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
