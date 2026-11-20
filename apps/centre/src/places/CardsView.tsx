import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { createToldStore } from "./askStore.js";
import { buildReceivedView, buildShareView, receivedFile, shareFile, startCardId, type CardFile } from "./cardsModel.js";
import { createCardsStore } from "./cardsStore.js";
import { cardsText, type CardsKey } from "./cardsStrings.js";
import {
  MAX_CARD_CHARACTERS,
  MAX_CARD_LABEL,
  cardFailureText,
  cardNoteText,
  cardReceiveIssueText,
  cardTitle,
  emptyMeasureBook,
  emptyReceivedCards,
  findReceivedCard,
  parsePlaceCard,
  type CardNote,
  type MeasureBook,
  type ReceivedCardBook,
} from "./docs-bridge.js";
import { createMeasuresStore } from "./measuresStore.js";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language, PlaceRecord } from "./types.js";
import "./places.css";
import "./measure.css";
import "./cards.css";

function download(file: CardFile) {
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
 * Makes a small card from one of a person's own observations to hand to someone else, and
 * keeps the cards other people handed to them. A received card is another person's facts: it
 * is shown apart, never mixed into the person's observations or measures, and never becomes
 * a tag for the map. The App sends nothing.
 */
export function CardsView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const store = useMemo(() => createCardsStore(storage), [storage]);
  const today = localToday();
  const [records, setRecords] = useState<PlaceRecord[]>([]);
  const [measures, setMeasures] = useState<MeasureBook>(emptyMeasureBook);
  const [told, setTold] = useState<MeasureBook>(emptyMeasureBook);
  const [received, setReceived] = useState<ReceivedCardBook>(emptyReceivedCards);
  const [chosen, setChosen] = useState<string | null>(null);
  const [withPoint, setWithPoint] = useState(true);
  const [withTold, setWithTold] = useState(false);
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const [notes, setNotes] = useState<CardNote[]>([]);
  const t = (key: CardsKey, vars?: Record<string, string | number>) => cardsText(language, key, vars);

  useEffect(() => {
    const saved = drafts.list();
    setRecords(saved);
    setMeasures(createMeasuresStore(storage).read());
    setTold(createToldStore(storage).read());
    setReceived(store.read());
    setChosen(startCardId(saved));
  }, [drafts, store, storage]);

  const data = useMemo(() => ({ records, measures, told }), [records, measures, told]);
  const share = useMemo(() => buildShareView(data, chosen, { withPoint, withTold, from }, today, language), [data, chosen, withPoint, withTold, from, today, language]);
  const list = useMemo(() => buildReceivedView(received, data, language), [received, data, language]);

  async function load(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file === undefined) return;
    // A card is small. A larger file is refused before it is read into memory.
    const text = file.size > MAX_CARD_CHARACTERS * 4 ? "x".repeat(MAX_CARD_CHARACTERS + 1) : await file.text();
    input.value = "";
    const parsed = parsePlaceCard(text);
    if (!parsed.ok) {
      setProblem(cardFailureText(parsed.code, language));
      setMessage("");
      setNotes([]);
      return;
    }
    const added = store.add(parsed.card, today);
    if (!added.ok) {
      setProblem(added.kind === "issue" ? cardReceiveIssueText(added.issue, language) : t("notSaved"));
      setMessage("");
      setNotes([]);
      return;
    }
    setReceived(store.read());
    setProblem("");
    setNotes(parsed.notes);
    setMessage(t("cardAdded", { name: cardTitle(parsed.card, language) }));
  }

  function remove(id: string) {
    const entry = findReceivedCard(received, id);
    if (entry === null) return;
    if (!store.remove(id).ok) {
      setProblem(t("notSaved"));
      return;
    }
    setReceived(store.read());
    setProblem("");
    setNotes([]);
    setMessage(t("cardRemoved", { name: cardTitle(entry.card, language) }));
  }

  function again(id: string) {
    const entry = findReceivedCard(received, id);
    if (entry !== null) download(receivedFile(entry));
  }

  const cardFile = shareFile("json", share);
  const textFile = shareFile("txt", share);

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>
      <p className="measure-note" data-testid="cards-share-note">
        {share.shareNote}
      </p>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      <section aria-labelledby="cards-make">
        <h2 id="cards-make">{t("makeHeading")}</h2>
        {records.length === 0 ? (
          <>
            <p>{t("noNotes")}</p>
            <p>
              <Link to="/places/contribute" className="measure-link">
                {t("addLink")}
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="measure-choose">
              <label htmlFor="cards-choose">{t("chooseLabel")}</label>
              <select id="cards-choose" value={share.chosenId ?? ""} onChange={(e) => setChosen(e.currentTarget.value)}>
                {share.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </p>
            <div className="cards-option">
              <label>
                <input type="checkbox" checked={withPoint} onChange={(e) => setWithPoint(e.currentTarget.checked)} />
                <span>{t("withPoint")}</span>
              </label>
            </div>
            {share.hasTold ? (
              <div className="cards-option">
                <label>
                  <input type="checkbox" checked={withTold} onChange={(e) => setWithTold(e.currentTarget.checked)} />
                  <span>{t("withTold")}</span>
                </label>
              </div>
            ) : null}
            <div className="measure-field cards-narrow">
              <label htmlFor="cards-from">{t("fromLabel")}</label>
              <p id="cards-from-help" className="hint">
                {t("fromHelp")}
              </p>
              <input id="cards-from" type="text" autoComplete="off" maxLength={MAX_CARD_LABEL} value={from} aria-describedby="cards-from-help" onChange={(e) => setFrom(e.currentTarget.value)} />
            </div>
            {share.failure === "" ? null : (
              <p role="alert" className="measure-problem" data-testid="cards-failure">
                {share.failure}
              </p>
            )}
            {share.card === null ? null : (
              <>
                <label htmlFor="cards-preview">{t("previewLabel")}</label>
                <p id="cards-preview-help" className="hint">
                  {t("previewHelp")}
                </p>
                <textarea id="cards-preview" className="measure-text" readOnly rows={14} value={share.text} aria-describedby="cards-preview-help" />
                <p className="places-actions">
                  {cardFile === null ? null : (
                    <button type="button" onClick={() => download(cardFile)}>
                      {t("downloadCard")}
                    </button>
                  )}
                  {textFile === null ? null : (
                    <button type="button" onClick={() => download(textFile)}>
                      {t("downloadText")}
                    </button>
                  )}
                </p>
                <p>{t("madeNote")}</p>
              </>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="cards-received">
        <h2 id="cards-received">{t("receivedHeading")}</h2>
        <p data-testid="cards-other-person">{list.otherPerson}</p>
        <div className="measure-field cards-narrow">
          <label htmlFor="cards-file">{t("fileLabel")}</label>
          <p id="cards-file-help" className="hint">
            {t("fileHelp")}
          </p>
          <input id="cards-file" className="cards-file" type="file" accept="application/json,.json" aria-describedby="cards-file-help" onChange={(e) => void load(e)} />
        </div>
        <p role="alert" className={problem === "" ? "measure-problem measure-problem-empty" : "measure-problem"} data-testid="cards-problem">
          {problem}
        </p>
        {notes.length === 0 ? null : (
          <>
            <h3>{t("notesHeading")}</h3>
            <ul data-testid="cards-notes">
              {notes.map((note) => (
                <li key={note}>{cardNoteText(note, language)}</li>
              ))}
            </ul>
          </>
        )}
        <p data-testid="cards-count">{list.count}</p>
        {list.cards.length === 0 ? (
          <p>{t("noCards")}</p>
        ) : (
          <ol className="cards-list" data-testid="cards-list">
            {list.cards.map((card) => (
              <li key={card.id}>
                <h3>{card.title}</h3>
                <p>{card.fromLine}</p>
                <p>{card.placeLine}</p>
                <p>{card.pointLine}</p>
                <p className="hint">{card.receivedLine}</p>
                <h4>{t("measuredHeading")}</h4>
                {card.measured.length === 0 ? (
                  <p>{t("nothingMeasured")}</p>
                ) : (
                  <ul>
                    {card.measured.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                {card.told.length === 0 ? null : (
                  <>
                    <h4>{t("toldHeading")}</h4>
                    <ul>
                      {card.told.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </>
                )}
                <p data-testid={`cards-near-${card.id}`}>{card.near}</p>
                {card.beside === null ? null : (
                  <div className="places-scroll" tabIndex={0} role="group" aria-label={card.beside.caption}>
                    <table className="measure-table">
                      <caption>{card.beside.caption}</caption>
                      <thead>
                        <tr>
                          <th scope="col">{t("colFact")}</th>
                          <th scope="col">{t("colYours")}</th>
                          <th scope="col">{t("colTheirs")}</th>
                          <th scope="col">{t("colNote")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {card.beside.rows.map((row) => (
                          <tr key={row.key}>
                            <th scope="row">{row.fact}</th>
                            <td>{row.yours}</td>
                            <td>{row.theirs}</td>
                            <td>{row.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="places-actions">
                  <button type="button" onClick={() => again(card.id)}>
                    {t("downloadAgain", { n: card.position })}
                  </button>
                  <button type="button" onClick={() => remove(card.id)}>
                    {t("remove", { n: card.position })}
                  </button>
                </p>
              </li>
            ))}
          </ol>
        )}
        <p>{t("filesNote")}</p>
      </section>
    </div>
  );
}
