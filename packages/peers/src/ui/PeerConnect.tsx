import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { DEMONSTRATION_PEERS } from "../candidates.js";
import { matchRequest } from "../matching.js";
import { PARTNER_ROUTE } from "../partner.js";
import { CATALOG, fill } from "../strings.js";
import type { Strings } from "../strings.js";
import type { PeerRequestStore } from "../store.js";
import { submitRequest } from "../submit.js";
import type { CrisisRedirect, HoldCode, MatchOffer, PeerCandidate, RejectCode } from "../types.js";
import { COARSE_CITIES, LANGUAGES, NOTE_MAX, PEER_TOPICS } from "../vocab.js";
import type { Language } from "../vocab.js";

type Outcome =
  | { kind: "match"; offer: MatchOffer }
  | { kind: "no_match" }
  | { kind: "crisis"; redirect: CrisisRedirect }
  | { kind: "refused"; codes: HoldCode[] }
  | { kind: "rejected"; code: RejectCode };

export interface PeerConnectProps {
  /** Interface language. The host app owns the language switch. */
  language: Language;
  pool?: readonly PeerCandidate[];
  store?: PeerRequestStore;
  now?: () => string;
}

let counter = 0;

function ResultPanel({ outcome, t }: { outcome: Outcome; t: Strings }) {
  if (outcome.kind === "no_match") {
    return (
      <>
        <h2 id="peer-result-title">{t.noMatchTitle}</h2>
        <p>{t.noMatchBody}</p>
      </>
    );
  }
  if (outcome.kind === "match") {
    const { offer } = outcome;
    const body = fill(t.matchBody, {
      n: offer.candidateOrdinal,
      topic: t.topics[offer.topic],
      language: t.languages[offer.language],
      cityPart: offer.matchedOn === "topic_language_city" ? t.matchCityPart : "",
    });
    return (
      <>
        <h2 id="peer-result-title">{t.matchTitle}</h2>
        <p>{body}</p>
        <p>{t.matchLimits}</p>
        <p>{t.savedNote}</p>
        <p className="peer-small">
          {fill(t.provenance, {
            tier: offer.tier,
            label: offer.prototypeLabel,
            source: offer.source,
            date: offer.recordDate,
          })}
        </p>
      </>
    );
  }
  if (outcome.kind === "crisis") {
    return (
      <>
        <h2 id="peer-result-title">{t.crisisTitle}</h2>
        <p>{t.crisisBody}</p>
        <ul>
          {outcome.redirect.contacts.map((contact) => (
            <li key={contact.id}>{t.crisisContacts[contact.id]}</li>
          ))}
        </ul>
        <p>{t.crisisNotSaved}</p>
      </>
    );
  }
  if (outcome.kind === "refused") {
    const medical = outcome.codes.includes("medical_advice");
    return (
      <>
        <h2 id="peer-result-title">{medical ? t.refusedMedicalTitle : t.refusedContactTitle}</h2>
        <p>{medical ? t.refusedMedical : t.refusedContact}</p>
      </>
    );
  }
  if (outcome.code === "age_out_of_scope") {
    return (
      <>
        <h2 id="peer-result-title">{t.ageTitle}</h2>
        <p>{t.ageBody}</p>
      </>
    );
  }
  return (
    <>
      <h2 id="peer-result-title">{t.invalidTitle}</h2>
      <p>{t.invalidBody}</p>
    </>
  );
}

export function PeerConnect({ language, pool = DEMONSTRATION_PEERS, store, now }: PeerConnectProps) {
  const t = CATALOG[language];
  const [topic, setTopic] = useState("");
  const [peerLanguage, setPeerLanguage] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [age, setAge] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (outcome) {
      resultRef.current?.focus();
    }
  }, [outcome]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const stamp = (now ?? (() => new Date().toISOString()))();
    counter += 1;
    const result = submitRequest(
      { topic, language: peerLanguage, city, note, ageConfirmed16Plus: age },
      { now: stamp, id: `req-${stamp.replace(/\D/g, "")}-${counter}` },
    );
    if (result.kind === "crisis") {
      setNote("");
      setOutcome({ kind: "crisis", redirect: result });
    } else if (result.kind === "refused") {
      setOutcome({ kind: "refused", codes: result.codes });
    } else if (result.kind === "rejected_input") {
      setOutcome({ kind: "rejected", code: result.code });
    } else {
      store?.save(result.request);
      const matched = matchRequest(result.request, pool, stamp);
      setOutcome(matched.kind === "match" ? { kind: "match", offer: matched.offer } : { kind: "no_match" });
    }
  }

  const alertRole = outcome && outcome.kind !== "match" && outcome.kind !== "no_match";

  return (
    <div className="peer-connect" lang={language}>
      <h1>{t.pageTitle}</h1>
      <p>{t.intro}</p>
      <p className="peer-banner">{t.demoBanner}</p>
      <form onSubmit={onSubmit} noValidate aria-describedby="peer-privacy">
        <p id="peer-privacy">{t.privacyNote}</p>
        <fieldset>
          <legend>{t.formLegend}</legend>

          <div className="peer-field">
            <label htmlFor="peer-topic">{t.topicLabel}</label>
            <select id="peer-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">{t.topicChoose}</option>
              {PEER_TOPICS.map((value) => (
                <option key={value} value={value}>
                  {t.topics[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="peer-field">
            <label htmlFor="peer-language">{t.languageLabel}</label>
            <select id="peer-language" value={peerLanguage} onChange={(e) => setPeerLanguage(e.target.value)}>
              <option value="">{t.languageChoose}</option>
              {LANGUAGES.map((value) => (
                <option key={value} value={value}>
                  {t.languages[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="peer-field">
            <label htmlFor="peer-city">{t.cityLabel}</label>
            <select id="peer-city" value={city} onChange={(e) => setCity(e.target.value)} aria-describedby="peer-city-help">
              <option value="">{t.cityNone}</option>
              {COARSE_CITIES.map((value) => (
                <option key={value} value={value}>
                  {t.cities[value]}
                </option>
              ))}
            </select>
            <p id="peer-city-help" className="peer-small">
              {t.cityHelp}
            </p>
          </div>

          <div className="peer-field">
            <label htmlFor="peer-note">{t.noteLabel}</label>
            <textarea
              id="peer-note"
              rows={3}
              maxLength={NOTE_MAX + 200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-describedby="peer-note-help"
            />
            <p id="peer-note-help" className="peer-small">
              {t.noteHelp}
            </p>
          </div>

          <div className="peer-field">
            <label htmlFor="peer-age" className="peer-check">
              <input id="peer-age" type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} aria-describedby="peer-age-help" />
              <span>{t.ageLabel}</span>
            </label>
            <p id="peer-age-help" className="peer-small">
              {t.ageHelp}
            </p>
          </div>

          <button type="submit" className="peer-button">
            {t.submit}
          </button>
        </fieldset>
      </form>

      {outcome ? (
        <section
          ref={resultRef}
          tabIndex={-1}
          className="peer-result"
          aria-labelledby="peer-result-title"
          role={alertRole ? "alert" : "status"}
        >
          <ResultPanel outcome={outcome} t={t} />
        </section>
      ) : null}

      <section className="peer-partner" aria-labelledby="peer-partner-title">
        <h2 id="peer-partner-title">{t.partnerTitle}</h2>
        <p>{t.partnerBody}</p>
        <p>
          <a className="peer-link" href={PARTNER_ROUTE.demonstrationUrl} rel="noopener noreferrer">
            {t.partnerLink}
          </a>
        </p>
        <p className="peer-small">{t.partnerOfficialUnknown}</p>
        <p className="peer-small">{t.partnerNoReferral}</p>
        <p className="peer-small">{t.noEndorsement}</p>
        <p className="peer-small">
          {fill(t.provenance, {
            tier: PARTNER_ROUTE.tier,
            label: PARTNER_ROUTE.prototypeLabel,
            source: PARTNER_ROUTE.source,
            date: PARTNER_ROUTE.checkedOn,
          })}
        </p>
      </section>
    </div>
  );
}
