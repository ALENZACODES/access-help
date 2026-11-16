import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { NO_CONSENT, CONSENT_ITEMS, REQUIRED_CONSENT_ITEMS } from "../connect/consent.js";
import type { ConsentChoices, ConsentItem } from "../connect/consent.js";
import { screenConnectText } from "../connect/health-screen.js";
import type { ConnectHoldCode } from "../connect/health-screen.js";
import { createConnectionRequest, withdrawRequestConsent } from "../connect/request.js";
import type { ConnectionRejectCode, ConnectionRequest } from "../connect/request.js";
import { RECORDED_ROUTING_TABLE } from "../connect/routing.js";
import type { RoutingTable } from "../connect/routing.js";
import type { ConnectionRequestStore } from "../connect/store.js";
import { CONNECT_CATALOG } from "../connect/strings.js";
import type { ConnectStrings } from "../connect/strings.js";
import { buildSummary, describeStream } from "../connect/summary.js";
import { FOR_WHOM, LIFE_CONTEXTS, REGIONS } from "../connect/vocab.js";
import type { LifeContext } from "../connect/vocab.js";
import { CATALOG, fill } from "../strings.js";
import { CRISIS_REDIRECT } from "../submit.js";
import { LANGUAGES, NOTE_MAX } from "../vocab.js";
import type { Language } from "../vocab.js";

export interface PeerRequestFlowProps {
  /** Interface language. The host app owns the language switch. */
  language: Language;
  /** On-device history. Without it, requests live only as long as the screen is open. */
  store?: ConnectionRequestStore;
  /** Routing rules. Defaults to the recorded table, which holds no streams. */
  table?: RoutingTable;
  now?: () => string;
}

type Problem =
  | { kind: "rejected"; code: ConnectionRejectCode }
  | { kind: "refused"; codes: ConnectHoldCode[] };

const FIELD_FOR: Record<ConnectionRejectCode, string> = {
  age_out_of_scope: "pcr-age",
  invalid_for_whom: "pcr-for-myself",
  no_context: "pcr-context-new_injury",
  too_many_contexts: "pcr-context-new_injury",
  invalid_context: "pcr-context-new_injury",
  invalid_region: "pcr-region",
  invalid_language: "pcr-language",
  note_too_long: "pcr-note",
  consent_required: "pcr-consent-prepare_summary",
};

let counter = 0;

function when(at: string): string {
  return `${at.slice(0, 10)} ${at.slice(11, 16)} UTC`;
}

function contextList(request: ConnectionRequest, t: ConnectStrings): string {
  return request.contexts.map((context) => t.contexts[context]).join(t.summary.listSeparator);
}

function CrisisPanel({ language, onBack }: { language: Language; onBack: () => void }) {
  const base = CATALOG[language];
  const t = CONNECT_CATALOG[language];
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <section ref={ref} tabIndex={-1} className="peer-result peer-crisis" role="alert" aria-labelledby="pcr-crisis-title">
      <h2 id="pcr-crisis-title">{base.crisisTitle}</h2>
      <p>{base.crisisBody}</p>
      <ul>
        {CRISIS_REDIRECT.contacts.map((contact) => (
          <li key={contact.id}>{base.crisisContacts[contact.id]}</li>
        ))}
      </ul>
      <p>{t.crisisSignpostOnly}</p>
      <p>{base.crisisNotSaved}</p>
      <button type="button" className="peer-button peer-button-secondary" onClick={onBack}>
        {t.crisisBack}
      </button>
    </section>
  );
}

function RequestPanel({
  request,
  table,
  language,
  onWithdraw,
  onStatus,
}: {
  request: ConnectionRequest;
  table: RoutingTable;
  language: Language;
  onWithdraw: (request: ConnectionRequest) => void;
  onStatus: (message: string) => void;
}) {
  const t = CONNECT_CATALOG[language];
  const summary = buildSummary(request, table, language);
  const { state, tier, audit } = request.moderation;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      onStatus(t.copied);
    } catch {
      onStatus(t.copyFailed);
    }
  }

  function download(text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${t.downloadFileName}-${request.recordDate}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onStatus(t.downloaded);
  }

  return (
    <>
      <h2 id="pcr-result-title">{summary.kind === "ready" ? t.resultTitle : t.states[state]}</h2>
      <p>{t.resultSaved}</p>
      <dl className="peer-facts">
        <div>
          <dt>{t.stateLabel}</dt>
          <dd>
            <strong>{t.states[state]}</strong>. {t.stateHelp[state]}
          </dd>
        </div>
        <div>
          <dt>{t.tierLabel}</dt>
          <dd>{t.tiers[tier]}</dd>
        </div>
        <div>
          <dt>{t.streamLabel}</dt>
          <dd>{describeStream(request, table, language)}</dd>
        </div>
      </dl>

      {summary.kind === "ready" ? (
        <>
          <div className="peer-field">
            <label htmlFor="pcr-summary">{t.summaryLabel}</label>
            <textarea
              id="pcr-summary"
              className="peer-summary"
              readOnly
              rows={Math.min(18, summary.lines.length + 3)}
              value={summary.text}
              aria-describedby="pcr-summary-help"
            />
            <p id="pcr-summary-help" className="peer-small">
              {t.summaryHelp}
            </p>
          </div>
          <div className="peer-actions">
            <button type="button" className="peer-button" onClick={() => void copy(summary.text)}>
              {t.copy}
            </button>
            <button type="button" className="peer-button peer-button-secondary" onClick={() => download(summary.text)}>
              {t.download}
            </button>
          </div>
          <p>{t.noPromise}</p>
          <div className="peer-actions">
            <button type="button" className="peer-button peer-button-secondary" onClick={() => onWithdraw(request)}>
              {t.withdrawConsent}
            </button>
          </div>
          <p className="peer-small">{t.consentRevocable}</p>
        </>
      ) : (
        <p>{t.summaryUnavailable}</p>
      )}

      <details className="peer-audit">
        <summary>{t.auditTitle}</summary>
        <ol>
          {audit.map((entry) => (
            <li key={entry.seq}>
              {fill(t.auditEntry, {
                at: when(entry.at),
                action: t.auditActions[entry.action],
                actor: t.actors[entry.actor],
                reason: t.auditReasons[entry.reason],
              })}
            </li>
          ))}
        </ol>
      </details>
      <p className="peer-small">
        {fill(t.provenance, {
          tier: request.tier,
          label: request.prototypeLabel,
          source: request.source,
          date: request.recordDate,
        })}
      </p>
    </>
  );
}

export function PeerRequestFlow({ language, store, table = RECORDED_ROUTING_TABLE, now }: PeerRequestFlowProps) {
  const t = CONNECT_CATALOG[language];
  const [forWhom, setForWhom] = useState("");
  const [contexts, setContexts] = useState<LifeContext[]>([]);
  const [region, setRegion] = useState("");
  const [peerLanguage, setPeerLanguage] = useState("");
  const [note, setNote] = useState("");
  const [age, setAge] = useState(false);
  const [consent, setConsent] = useState<ConsentChoices>(NO_CONSENT);
  const [crisis, setCrisis] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [requests, setRequests] = useState<ConnectionRequest[]>(() => store?.list() ?? []);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [focusTarget, setFocusTarget] = useState<{ id: string; tick: number } | null>(null);

  const current = requests.find((request) => request.id === currentId) ?? null;
  const stamp = () => (now ?? (() => new Date().toISOString()))();

  useEffect(() => {
    if (focusTarget) {
      document.getElementById(focusTarget.id)?.focus();
    }
  }, [focusTarget]);

  function focusOn(id: string) {
    setFocusTarget((previous) => ({ id, tick: (previous?.tick ?? 0) + 1 }));
  }

  function refresh(next: ConnectionRequest[]) {
    setRequests(store ? store.list() : next);
  }

  function interruptForCrisis() {
    setNote("");
    setProblem(null);
    setStatus("");
    setCrisis(true);
  }

  function onNoteBlur() {
    if (screenConnectText(note).decision === "crisis") {
      interruptForCrisis();
    }
  }

  function toggleContext(context: LifeContext, checked: boolean) {
    setContexts((previous) => (checked ? [...previous, context] : previous.filter((item) => item !== context)));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const at = stamp();
    counter += 1;
    const result = createConnectionRequest(
      { forWhom, contexts, region, language: peerLanguage, note, ageConfirmed16Plus: age, consent },
      { now: at, id: `conn-${at.replace(/\D/g, "")}-${counter}`, table },
    );
    setStatus("");
    if (result.kind === "crisis") {
      interruptForCrisis();
      return;
    }
    if (result.kind === "refused") {
      setProblem({ kind: "refused", codes: result.codes });
      focusOn("pcr-problem");
      return;
    }
    if (result.kind === "rejected_input") {
      setProblem({ kind: "rejected", code: result.code });
      focusOn("pcr-problem");
      return;
    }
    store?.save(result.request);
    refresh([result.request, ...requests]);
    setCurrentId(result.request.id);
    setProblem(null);
    setForWhom("");
    setContexts([]);
    setRegion("");
    setPeerLanguage("");
    setNote("");
    setAge(false);
    setConsent(NO_CONSENT);
    focusOn("pcr-result");
  }

  function onWithdraw(request: ConnectionRequest) {
    const result = withdrawRequestConsent(request, stamp());
    if (!result.ok) {
      return;
    }
    store?.save(result.request);
    refresh(requests.map((item) => (item.id === request.id ? result.request : item)));
    setStatus(t.withdrawn);
    focusOn("pcr-result");
  }

  function onDeleteOne(id: string) {
    store?.remove(id);
    refresh(requests.filter((request) => request.id !== id));
    if (currentId === id) {
      setCurrentId(null);
    }
    setStatus(t.deletedOne);
    focusOn("pcr-history-title");
  }

  function onDeleteAll() {
    store?.deleteEverything();
    refresh([]);
    setCurrentId(null);
    setConfirming(false);
    setStatus(t.deletedAll);
    focusOn("pcr-history-title");
  }

  const used = note.length;

  return (
    <div className="peer-connect" lang={language}>
      <h1>{t.pageTitle}</h1>
      <p>{t.intro}</p>
      <p className="peer-banner">{t.notSentBanner}</p>
      <p>{t.noPromise}</p>

      {crisis ? (
        <CrisisPanel
          language={language}
          onBack={() => {
            setCrisis(false);
            focusOn("pcr-form-title");
          }}
        />
      ) : (
        <form onSubmit={onSubmit} noValidate aria-labelledby="pcr-form-title">
          <h2 id="pcr-form-title" tabIndex={-1}>
            {t.formLegend}
          </h2>

          {problem ? (
            <section id="pcr-problem" tabIndex={-1} className="peer-result" role="alert" aria-labelledby="pcr-problem-title">
              <h3 id="pcr-problem-title">{problem.kind === "refused" ? t.refusedTitle : t.errorTitle}</h3>
              {problem.kind === "refused" ? (
                <ul>
                  {problem.codes.map((code) => (
                    <li key={code}>
                      <a className="peer-link" href="#pcr-note">
                        {t.refused[code]}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  <a className="peer-link" href={`#${FIELD_FOR[problem.code]}`}>
                    {fill(t.rejected[problem.code], { max: NOTE_MAX })}
                  </a>
                </p>
              )}
              <p>{t.nothingSaved}</p>
            </section>
          ) : null}

          <fieldset aria-describedby="pcr-for-help">
            <legend>{t.forWhomLegend}</legend>
            {FOR_WHOM.map((value) => (
              <label key={value} htmlFor={`pcr-for-${value}`} className="peer-check">
                <input
                  id={`pcr-for-${value}`}
                  type="radio"
                  name="pcr-for"
                  value={value}
                  checked={forWhom === value}
                  onChange={() => setForWhom(value)}
                />
                <span>{t.forWhom[value]}</span>
              </label>
            ))}
            <p id="pcr-for-help" className="peer-small">
              {t.forWhomHelp}
            </p>
          </fieldset>

          <fieldset aria-describedby="pcr-contexts-help">
            <legend>{t.contextsLegend}</legend>
            <p id="pcr-contexts-help" className="peer-small">
              {t.contextsHelp}
            </p>
            {LIFE_CONTEXTS.map((value) => (
              <label key={value} htmlFor={`pcr-context-${value}`} className="peer-check">
                <input
                  id={`pcr-context-${value}`}
                  type="checkbox"
                  checked={contexts.includes(value)}
                  onChange={(e) => toggleContext(value, e.target.checked)}
                />
                <span>{t.contexts[value]}</span>
              </label>
            ))}
          </fieldset>

          <div className="peer-field">
            <label htmlFor="pcr-region">{t.regionLabel}</label>
            <select id="pcr-region" value={region} onChange={(e) => setRegion(e.target.value)} aria-describedby="pcr-region-help">
              <option value="">{t.regionNone}</option>
              {REGIONS.map((value) => (
                <option key={value} value={value}>
                  {t.regions[value]}
                </option>
              ))}
            </select>
            <p id="pcr-region-help" className="peer-small">
              {t.regionHelp}
            </p>
          </div>

          <div className="peer-field">
            <label htmlFor="pcr-language">{t.languageLabel}</label>
            <select id="pcr-language" value={peerLanguage} onChange={(e) => setPeerLanguage(e.target.value)}>
              <option value="">{t.languageChoose}</option>
              {LANGUAGES.map((value) => (
                <option key={value} value={value}>
                  {t.languages[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="peer-field">
            <label htmlFor="pcr-note">{t.noteLabel}</label>
            <textarea
              id="pcr-note"
              rows={3}
              maxLength={NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={onNoteBlur}
              aria-describedby="pcr-note-help pcr-note-count"
            />
            <p id="pcr-note-help" className="peer-small">
              {fill(t.noteHelp, { max: NOTE_MAX })}
            </p>
            <p id="pcr-note-count" className="peer-small">
              {fill(t.noteCount, { used, max: NOTE_MAX })}
            </p>
          </div>

          <div className="peer-field">
            <label htmlFor="pcr-age" className="peer-check">
              <input id="pcr-age" type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} aria-describedby="pcr-age-help" />
              <span>{t.ageLabel}</span>
            </label>
            <p id="pcr-age-help" className="peer-small">
              {t.ageHelp}
            </p>
          </div>

          <fieldset aria-describedby="pcr-consent-intro pcr-consent-revocable">
            <legend>{t.consentLegend}</legend>
            <p id="pcr-consent-intro" className="peer-small">
              {t.consentIntro}
            </p>
            {CONSENT_ITEMS.map((item: ConsentItem) => (
              <label key={item} htmlFor={`pcr-consent-${item}`} className="peer-check">
                <input
                  id={`pcr-consent-${item}`}
                  type="checkbox"
                  checked={consent[item]}
                  onChange={(e) => setConsent((previous) => ({ ...previous, [item]: e.target.checked }))}
                />
                <span>
                  {t.consentItems[item]}{" "}
                  <span className="peer-mark">
                    {REQUIRED_CONSENT_ITEMS.includes(item) ? t.consentRequiredMark : t.consentOptionalMark}
                  </span>
                </span>
              </label>
            ))}
            <p id="pcr-consent-revocable" className="peer-small">
              {t.consentRevocable}
            </p>
          </fieldset>

          <button type="submit" className="peer-button">
            {t.submit}
          </button>
        </form>
      )}

      <p className="peer-status" role="status" aria-live="polite">
        {status}
      </p>

      {current ? (
        <section id="pcr-result" tabIndex={-1} className="peer-result" aria-labelledby="pcr-result-title">
          <RequestPanel request={current} table={table} language={language} onWithdraw={onWithdraw} onStatus={setStatus} />
        </section>
      ) : null}

      <section className="peer-partner" aria-labelledby="pcr-history-title">
        <h2 id="pcr-history-title" tabIndex={-1}>
          {t.historyTitle}
        </h2>
        {requests.length === 0 ? (
          <p>{t.historyEmpty}</p>
        ) : (
          <>
            <ul className="peer-history">
              {requests.map((request) => {
                const label = fill(t.historyItem, { date: request.recordDate, contexts: contextList(request, t) });
                return (
                  <li key={request.id}>
                    <p>
                      {label}. <strong>{t.states[request.moderation.state]}</strong>
                    </p>
                    <div className="peer-actions">
                      <button
                        type="button"
                        className="peer-button peer-button-secondary"
                        aria-label={`${t.historyShow}: ${label}`}
                        aria-pressed={request.id === currentId}
                        onClick={() => {
                          setCurrentId(request.id);
                          setStatus("");
                          focusOn("pcr-result");
                        }}
                      >
                        {t.historyShow}
                      </button>
                      <button
                        type="button"
                        className="peer-button peer-button-secondary"
                        aria-label={`${t.deleteOne}: ${label}`}
                        onClick={() => onDeleteOne(request.id)}
                      >
                        {t.deleteOne}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {confirming ? (
              <div className="peer-confirm" role="group" aria-labelledby="pcr-delete-question">
                <p id="pcr-delete-question">{t.deleteAllConfirm}</p>
                <div className="peer-actions">
                  <button type="button" id="pcr-delete-no" className="peer-button peer-button-secondary" onClick={() => {
                    setConfirming(false);
                    focusOn("pcr-delete-all");
                  }}>
                    {t.deleteAllNo}
                  </button>
                  <button type="button" className="peer-button peer-button-danger" onClick={onDeleteAll}>
                    {t.deleteAllYes}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                id="pcr-delete-all"
                className="peer-button peer-button-danger"
                onClick={() => {
                  setConfirming(true);
                  focusOn("pcr-delete-no");
                }}
              >
                {t.deleteAll}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
