import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { renderQuestionsLog, renderTracker } from "../render.js";
import { createQuestionsStore, emptyDraft, type DraftField, type KeyValue, type QuestionDraft, type QuestionsStore } from "../store.js";
import { DISPOSITIONS, OWNER_ROLES, type Disposition, type OwnerRole, type QuestionEntry } from "../types.js";
import { DESK_STRINGS, DISPOSITION_LABELS, OWNER_LABELS, problemMessage, trackerMessage, type Language } from "./strings.js";

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function browserStorage(): KeyValue | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

interface Problem {
  field: DraftField;
  message: string;
}

/**
 * Day 25 questions log and Day 26 tracker, kept on this device.
 * It records roles, not names, and refuses a row SCIO did not agree to record.
 */
export function FollowUpDesk({ language, storage }: { language: Language; storage?: KeyValue | null }) {
  const s = DESK_STRINGS[language];
  const store: QuestionsStore = useMemo(() => createQuestionsStore(storage === undefined ? browserStorage() : storage), [storage]);
  const [state, setState] = useState(() => store.load());
  const [draft, setDraft] = useState<QuestionDraft>(emptyDraft);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const logHeadingRef = useRef<HTMLHeadingElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const deleteButtons = useRef(new Map<string, HTMLButtonElement>());
  const base = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const id = (field: string) => `desk${base}-${field}`;

  useEffect(() => {
    if (problems.length > 0) summaryRef.current?.focus();
  }, [problems]);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const set = <K extends keyof QuestionDraft>(key: K, value: QuestionDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const problemFor = (field: DraftField) => problems.find((problem) => problem.field === field);
  const described = (field: DraftField, hint?: string) => {
    const ids = [hint, problemFor(field) ? id(`${field}-error`) : undefined].filter(Boolean).join(" ");
    return ids ? ids : undefined;
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = store.add(draft);
    if (!result.ok) {
      const seen = new Set<string>();
      setProblems(
        result.problems
          .map((problem) => ({ field: problem.field, message: problemMessage(language, problem.defect.rule) }))
          .filter((problem) => {
            const key = `${problem.field}:${problem.message}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }),
      );
      setAnnouncement("");
      return;
    }
    setProblems([]);
    setDraft(emptyDraft());
    setState(store.load());
    setAnnouncement(s.added(result.entry.id));
  }

  function triage(entryId: string, value: { disposition?: Disposition; owner?: OwnerRole | null; due?: string | null; reason?: string }) {
    setState(store.setTriage(entryId, value));
  }

  function remove(entryId: string) {
    setState(store.remove(entryId));
    setConfirming(null);
    setAnnouncement(s.deleted(entryId));
    window.requestAnimationFrame(() => logHeadingRef.current?.focus());
  }

  function cancel(target: string) {
    setConfirming(null);
    window.requestAnimationFrame(() => {
      if (target === "all") document.getElementById(id("clear"))?.focus();
      else deleteButtons.current.get(target)?.focus();
    });
  }

  function clearAll() {
    store.clear();
    setState(store.load());
    setConfirming(null);
    setShowText(false);
    setAnnouncement(s.cleared);
    window.requestAnimationFrame(() => logHeadingRef.current?.focus());
  }

  const date = today();
  const trackerProblems = store.triageDefects(date);
  const markdown = `${renderTracker({ date, items: store.triageItems() })}\n## Questions log\n\n${renderQuestionsLog(state.questions)}\n`;

  const followUpText = (entry: QuestionEntry) =>
    entry.followUp.kind === "promised"
      ? `${entry.followUp.action} (${OWNER_LABELS[language][entry.followUp.owner]}, ${entry.followUp.due})`
      : `${s.followUpNone}. ${entry.followUp.note}`;

  return (
    <article className="follow-up-desk">
      <h1>{s.title}</h1>
      <p>{s.lead}</p>
      {store.memoryOnly ? <p role="status">{s.memoryOnly}</p> : null}
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      <section aria-labelledby={id("add")}>
        <h2 id={id("add")}>{s.addHeading}</h2>
        <form noValidate onSubmit={submit}>
          {problems.length > 0 ? (
            <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef} aria-labelledby={id("summary")}>
              <p id={id("summary")}>{s.errorsHeading}</p>
              <ul>
                {problems.map((problem) => (
                  <li key={`${problem.field}-${problem.message}`}>
                    <a href={`#${id(problem.field)}`}>{problem.message}</a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="field">
            <label htmlFor={id("question")}>{s.question}</label>
            {problemFor("question") ? <p className="error" id={id("question-error")}>{problemFor("question")!.message}</p> : null}
            <textarea id={id("question")} rows={3} value={draft.question} aria-invalid={Boolean(problemFor("question"))} aria-describedby={described("question")} onChange={(event) => set("question", event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor={id("answerGiven")}>{s.answerGiven}</label>
            <p className="hint" id={id("answer-hint")}>{s.answerHint}</p>
            {problemFor("answerGiven") ? <p className="error" id={id("answerGiven-error")}>{problemFor("answerGiven")!.message}</p> : null}
            <textarea id={id("answerGiven")} rows={3} value={draft.answerGiven} aria-invalid={Boolean(problemFor("answerGiven"))} aria-describedby={described("answerGiven", id("answer-hint"))} onChange={(event) => set("answerGiven", event.target.value)} />
          </div>

          <fieldset>
            <legend>{s.answerKind}</legend>
            {(["answered", "deferred"] as const).map((kind) => (
              <label key={kind} className="choice">
                <input type="radio" name={id("answerKind")} value={kind} checked={draft.answerKind === kind} onChange={() => set("answerKind", kind)} />
                {kind === "answered" ? s.answered : s.deferred}
              </label>
            ))}
          </fieldset>

          <fieldset id={id("followUpKind")} tabIndex={-1} aria-describedby={problemFor("followUpKind") ? id("followUpKind-error") : undefined}>
            <legend>{s.followUpKind}</legend>
            {problemFor("followUpKind") ? <p className="error" id={id("followUpKind-error")}>{problemFor("followUpKind")!.message}</p> : null}
            {(["promised", "none"] as const).map((kind) => (
              <label key={kind} className="choice">
                <input type="radio" name={id("followUpKindRadio")} value={kind} checked={draft.followUpKind === kind} onChange={() => set("followUpKind", kind)} />
                {kind === "promised" ? s.promised : s.none}
              </label>
            ))}
          </fieldset>

          {draft.followUpKind === "promised" ? (
            <>
              <div className="field">
                <label htmlFor={id("action")}>{s.action}</label>
                {problemFor("action") ? <p className="error" id={id("action-error")}>{problemFor("action")!.message}</p> : null}
                <input id={id("action")} type="text" value={draft.action} aria-invalid={Boolean(problemFor("action"))} aria-describedby={described("action")} onChange={(event) => set("action", event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={id("owner")}>{s.owner}</label>
                {problemFor("owner") ? <p className="error" id={id("owner-error")}>{problemFor("owner")!.message}</p> : null}
                <select id={id("owner")} value={draft.owner} aria-invalid={Boolean(problemFor("owner"))} aria-describedby={described("owner")} onChange={(event) => set("owner", event.target.value as OwnerRole | "")}>
                  <option value="">{s.choose}</option>
                  {OWNER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {OWNER_LABELS[language][role]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={id("due")}>{s.due}</label>
                {problemFor("due") ? <p className="error" id={id("due-error")}>{problemFor("due")!.message}</p> : null}
                <input id={id("due")} type="date" value={draft.due} aria-invalid={Boolean(problemFor("due"))} aria-describedby={described("due")} onChange={(event) => set("due", event.target.value)} />
              </div>
            </>
          ) : null}

          {draft.followUpKind === "none" ? (
            <div className="field">
              <label htmlFor={id("note")}>{s.note}</label>
              {problemFor("note") ? <p className="error" id={id("note-error")}>{problemFor("note")!.message}</p> : null}
              <input id={id("note")} type="text" value={draft.note} aria-invalid={Boolean(problemFor("note"))} aria-describedby={described("note")} onChange={(event) => set("note", event.target.value)} />
            </div>
          ) : null}

          <div className="field">
            {problemFor("recordingAgreed") ? <p className="error" id={id("recordingAgreed-error")}>{problemFor("recordingAgreed")!.message}</p> : null}
            <label className="choice">
              <input id={id("recordingAgreed")} type="checkbox" checked={draft.recordingAgreed} aria-invalid={Boolean(problemFor("recordingAgreed"))} aria-describedby={described("recordingAgreed")} onChange={(event) => set("recordingAgreed", event.target.checked)} />
              {s.recordingAgreed}
            </label>
          </div>

          <button type="submit">{s.add}</button>
        </form>
      </section>

      <section aria-labelledby={id("log")}>
        <h2 id={id("log")} tabIndex={-1} ref={logHeadingRef}>
          {s.logHeading}
        </h2>
        {state.questions.length === 0 ? <p>{s.empty}</p> : null}
        <ol className="question-log">
          {state.questions.map((entry) => {
            const row = state.triage[entry.id];
            return (
              <li key={entry.id}>
                <h3>{entry.id}</h3>
                <dl>
                  <dt>{s.question}</dt>
                  <dd>{entry.question}</dd>
                  <dt>{s.answerGiven}</dt>
                  <dd>
                    {entry.answerKind === "deferred" ? `${s.deferredLabel}. ` : `${s.answeredLabel}. `}
                    {entry.answerGiven}
                  </dd>
                  <dt>{s.followUpKind}</dt>
                  <dd>{followUpText(entry)}</dd>
                </dl>
                <fieldset>
                  <legend>{s.triageFor(entry.id)}</legend>
                  <div className="field">
                    <label htmlFor={id(`${entry.id}-disposition`)}>{s.disposition}</label>
                    <select id={id(`${entry.id}-disposition`)} value={row?.disposition ?? ""} onChange={(event) => triage(entry.id, { disposition: event.target.value as Disposition })}>
                      <option value="">{s.choose}</option>
                      {DISPOSITIONS.map((disposition) => (
                        <option key={disposition} value={disposition}>
                          {DISPOSITION_LABELS[language][disposition]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={id(`${entry.id}-owner`)}>{s.owner}</label>
                    <select id={id(`${entry.id}-owner`)} value={row?.owner ?? ""} onChange={(event) => triage(entry.id, { owner: (event.target.value || null) as OwnerRole | null })}>
                      <option value="">{s.choose}</option>
                      {OWNER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {OWNER_LABELS[language][role]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={id(`${entry.id}-due`)}>{s.due}</label>
                    <input id={id(`${entry.id}-due`)} type="date" value={row?.due ?? ""} onChange={(event) => triage(entry.id, { due: event.target.value || null })} />
                  </div>
                  {row?.disposition === "decline-with-reason" ? (
                    <div className="field">
                      <label htmlFor={id(`${entry.id}-reason`)}>{s.reason}</label>
                      <input id={id(`${entry.id}-reason`)} type="text" value={row.reason ?? ""} onChange={(event) => triage(entry.id, { reason: event.target.value })} />
                    </div>
                  ) : null}
                </fieldset>
                {confirming === entry.id ? (
                  <div role="group" aria-label={s.confirmDelete(entry.id)}>
                    <p>{s.confirmDelete(entry.id)}</p>
                    <button type="button" ref={confirmRef} onClick={() => remove(entry.id)}>
                      {s.yesDelete}
                    </button>{" "}
                    <button type="button" onClick={() => cancel(entry.id)}>
                      {s.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    ref={(element) => {
                      if (element) deleteButtons.current.set(entry.id, element);
                      else deleteButtons.current.delete(entry.id);
                    }}
                    onClick={() => setConfirming(entry.id)}
                  >
                    {s.delete(entry.id)}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby={id("checks")}>
        <h2 id={id("checks")}>{s.checksHeading}</h2>
        {trackerProblems.length === 0 ? (
          <p>{s.checksClear}</p>
        ) : (
          <ul>
            {trackerProblems.map((problem) => (
              <li key={`${problem.ref}-${problem.rule}`}>{trackerMessage(language, problem.rule, problem.ref.replace(/^T-/, ""))}</li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={id("export")}>
        <h2 id={id("export")}>{s.exportHeading}</h2>
        <button type="button" aria-expanded={showText} aria-controls={id("markdown")} onClick={() => setShowText((value) => !value)}>
          {showText ? s.hideMarkdown : s.showMarkdown}
        </button>
        <div id={id("markdown")} hidden={!showText}>
          <label htmlFor={id("markdown-text")}>{s.markdownLabel}</label>
          <textarea id={id("markdown-text")} readOnly rows={12} value={markdown} lang="en" />
        </div>
        <p>
          {confirming === "all" ? (
            <span role="group" aria-label={s.confirmClear}>
              <span>{s.confirmClear}</span>{" "}
              <button type="button" ref={confirmRef} onClick={clearAll}>
                {s.yesDelete}
              </button>{" "}
              <button type="button" onClick={() => cancel("all")}>
                {s.cancel}
              </button>
            </span>
          ) : (
            <button type="button" id={id("clear")} disabled={state.questions.length === 0} onClick={() => setConfirming("all")}>
              {s.clearAll}
            </button>
          )}
        </p>
      </section>
    </article>
  );
}
