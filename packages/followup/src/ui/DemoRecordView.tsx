import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { ISSUE_TEXT, isIsoDate, questionIssues } from "../rules.js";
import { thankYouNote } from "../notes.js";
import { clearRecord, loadRecord, saveRecord, type KeyValueStore } from "../store.js";
import { ROLE_LABELS, ROLES, emptyRecord, type DemoRecord, type Language, type QuestionEntry, type Role } from "../types.js";

const T = {
  en: {
    title: "Demo-day record",
    lead: "Record the demonstration, the questions, and the follow-ups on this device. Record people by role. Nothing is uploaded or sent from this screen.",
    damaged: "The saved record on this device could not be read. It was not changed. Start a new record or remove the old one.",
    sessionHeading: "Session",
    build: "Build identifier that was demonstrated",
    date: "Date of the demonstration (YYYY-MM-DD)",
    roles: "Attendees by role",
    sections: "Sections shown, one per line",
    questionsHeading: "Questions",
    noQuestions: "No question is recorded yet.",
    addHeading: "Add a question",
    askedBy: "Asked by",
    question: "Question as asked",
    answer: "Answer given in the session",
    answerHint: "If it was not answered, write: Not answered in the session.",
    agreed: "SCIO agreed this question can be recorded",
    followUpGroup: "Follow-up",
    followNone: "No follow-up",
    followYes: "Follow-up promised",
    reason: "Why no follow-up is needed",
    action: "Follow-up action",
    owner: "Owner",
    due: "Due date (YYYY-MM-DD)",
    committedBy: "Who committed",
    team: "Our team",
    scio: "SCIO",
    confirmed: "The human owner confirms SCIO made this commitment",
    add: "Add question",
    added: "Question added. {count} recorded.",
    notAdded_one: "The question was not added. Fix {count} problem below.",
    notAdded_other: "The question was not added. Fix {count} problems below.",
    remove: "Remove question {n}",
    asked: "Asked by {role}",
    answered: "Answer given: {text}",
    promised: "Follow-up: {action}, owner {owner}, due {due}, committed by {who}.",
    none: "No follow-up: {reason}",
    issuesHeading: "Problems to fix before the note is ready",
    noIssues: "No problem found by these rules. A person still reads the note before it is sent.",
    noteHeading: "Thank-you note draft",
    noteReady: "Ready for the human owner to read.",
    noteNotReady: "Not ready. Fix the problems above first.",
    noteLabel: "Thank-you note draft text",
    clear: "Remove this record from this device",
    clearConfirm: "Remove the record and every question on this device? This cannot be undone.",
    clearYes: "Remove the record",
    clearNo: "Keep the record",
    cleared: "The record was removed from this device.",
    saveFailed: "This browser did not let the record be saved. Keep this page open, or copy the note.",
  },
  fr: {
    title: "Registre de la journée de démonstration",
    lead: "Inscrivez la démonstration, les questions et les suivis sur cet appareil. Inscrivez les personnes par rôle. Rien n'est téléversé ni envoyé depuis cet écran.",
    damaged: "Le registre enregistré sur cet appareil n'a pas pu être lu. Il n'a pas été modifié. Commencez un nouveau registre ou supprimez l'ancien.",
    sessionHeading: "Séance",
    build: "Identifiant de la version présentée",
    date: "Date de la démonstration (AAAA-MM-JJ)",
    roles: "Participants par rôle",
    sections: "Sections montrées, une par ligne",
    questionsHeading: "Questions",
    noQuestions: "Aucune question n'est encore inscrite.",
    addHeading: "Ajouter une question",
    askedBy: "Posée par",
    question: "Question telle que posée",
    answer: "Réponse donnée pendant la séance",
    answerHint: "S'il n'y a pas eu de réponse, écrivez : Pas de réponse pendant la séance.",
    agreed: "SCIO a accepté que cette question soit inscrite",
    followUpGroup: "Suivi",
    followNone: "Aucun suivi",
    followYes: "Suivi promis",
    reason: "Pourquoi aucun suivi n'est nécessaire",
    action: "Action de suivi",
    owner: "Responsable",
    due: "Échéance (AAAA-MM-JJ)",
    committedBy: "Qui s'est engagé",
    team: "Notre équipe",
    scio: "SCIO",
    confirmed: "Le responsable humain confirme que SCIO a pris cet engagement",
    add: "Ajouter la question",
    added: "Question ajoutée. {count} inscrite(s).",
    notAdded_one: "La question n'a pas été ajoutée. Corrigez {count} problème ci-dessous.",
    notAdded_other: "La question n'a pas été ajoutée. Corrigez {count} problèmes ci-dessous.",
    remove: "Retirer la question {n}",
    asked: "Posée par {role}",
    answered: "Réponse donnée : {text}",
    promised: "Suivi : {action}, responsable {owner}, échéance {due}, engagement de {who}.",
    none: "Aucun suivi : {reason}",
    issuesHeading: "Problèmes à corriger avant que la note soit prête",
    noIssues: "Aucun problème trouvé par ces règles. Une personne lit quand même la note avant l'envoi.",
    noteHeading: "Ébauche de la note de remerciement",
    noteReady: "Prête à être lue par le responsable humain.",
    noteNotReady: "Pas prête. Corrigez d'abord les problèmes ci-dessus.",
    noteLabel: "Texte de l'ébauche de la note de remerciement",
    clear: "Supprimer ce registre de cet appareil",
    clearConfirm: "Supprimer le registre et toutes les questions sur cet appareil\u202f? Cette action est définitive.",
    clearYes: "Supprimer le registre",
    clearNo: "Garder le registre",
    cleared: "Le registre a été supprimé de cet appareil.",
    saveFailed: "Ce navigateur n'a pas permis d'enregistrer le registre. Gardez cette page ouverte, ou copiez la note.",
  },
} as const;

type Key = keyof (typeof T)["en"];

function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

interface Draft {
  askedBy: Role;
  question: string;
  answer: string;
  agreed: boolean;
  mode: "none" | "follow-up";
  reason: string;
  action: string;
  owner: Role;
  due: string;
  committedBy: "team" | "scio";
  confirmed: boolean;
}

const EMPTY_DRAFT: Draft = {
  askedBy: "scio-attendee",
  question: "",
  answer: "",
  agreed: false,
  mode: "none",
  reason: "",
  action: "",
  owner: "human-owner",
  due: "",
  committedBy: "team",
  confirmed: false,
};

function toEntry(draft: Draft, id: string): QuestionEntry {
  return {
    id,
    askedBy: draft.askedBy,
    question: draft.question.trim(),
    answerGiven: draft.answer.trim(),
    recordingAgreed: draft.agreed,
    followUp:
      draft.mode === "none"
        ? { kind: "none", reason: draft.reason.trim() }
        : {
            kind: "follow-up",
            action: draft.action.trim(),
            owner: draft.owner,
            due: draft.due.trim(),
            committedBy: draft.committedBy,
            confirmedByOwner: draft.committedBy === "scio" ? draft.confirmed : false,
          },
  };
}

function nextId(record: DemoRecord): string {
  let n = record.questions.length + 1;
  const used = new Set(record.questions.map((item) => item.id));
  while (used.has(`q${n}`)) n += 1;
  return `q${n}`;
}

/**
 * Master plan Day 25 questions log and thank-you draft, kept on this device.
 * Not in the primary navigation. It does not send or upload anything.
 */
export function DemoRecordView({ language, storage }: { language: Language; storage: KeyValueStore }) {
  const t = (key: Key, values: Record<string, string | number> = {}) => fill(T[language][key], values);
  const base = useId();
  const loaded = useMemo(() => loadRecord(storage), [storage]);
  const [record, setRecord] = useState<DemoRecord>(loaded.record);
  const [damaged, setDamaged] = useState(loaded.damaged);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formIssues, setFormIssues] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (damaged) return;
    setSaveFailed(!saveRecord(storage, record));
  }, [record, storage, damaged]);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  const note = thankYouNote(record, language);
  const field = (name: string) => `${base}-${name}`;
  const update = (patch: Partial<DemoRecord>) => {
    setDamaged(false);
    setRecord((current) => ({ ...current, ...patch }));
  };

  function onAdd(event: FormEvent) {
    event.preventDefault();
    const entry = toEntry(draft, nextId(record));
    const problems = questionIssues(entry).map((issue) => ISSUE_TEXT[issue.code][language]);
    if (draft.mode === "follow-up" && draft.due.trim() && !isIsoDate(draft.due.trim())) problems.push(ISSUE_TEXT["bad-date"][language]);
    const unique = [...new Set(problems)];
    setFormIssues(unique);
    if (unique.length > 0) {
      setStatus(t(unique.length === 1 ? "notAdded_one" : "notAdded_other", { count: unique.length }));
    } else {
      update({ questions: [...record.questions, entry] });
      setDraft(EMPTY_DRAFT);
      setStatus(t("added", { count: record.questions.length + 1 }));
    }
    window.requestAnimationFrame(() => statusRef.current?.focus());
  }

  function removeQuestion(id: string) {
    update({ questions: record.questions.filter((item) => item.id !== id), tracker: record.tracker.filter((item) => item.questionId !== id) });
  }

  function clearAll() {
    clearRecord(storage);
    setRecord(emptyRecord());
    setDamaged(false);
    setConfirming(false);
    setStatus(t("cleared"));
    window.requestAnimationFrame(() => statusRef.current?.focus());
  }

  return (
    <section aria-labelledby={field("title")} className="demo-record">
      <h1 id={field("title")}>{t("title")}</h1>
      <p>{t("lead")}</p>
      {damaged ? <p role="alert">{t("damaged")}</p> : null}
      {saveFailed ? <p role="alert">{t("saveFailed")}</p> : null}
      <p ref={statusRef} tabIndex={-1} role="status">
        {status}
      </p>

      <h2>{t("sessionHeading")}</h2>
      <label htmlFor={field("build")}>{t("build")}</label>
      <input id={field("build")} value={record.build} onChange={(event) => update({ build: event.target.value })} autoComplete="off" />
      <label htmlFor={field("date")}>{t("date")}</label>
      <input
        id={field("date")}
        value={record.date}
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={record.date !== "" && !isIsoDate(record.date)}
        onChange={(event) => update({ date: event.target.value.trim() })}
      />
      <fieldset>
        <legend>{t("roles")}</legend>
        {ROLES.map((role) => (
          <label key={role} className="check">
            <input
              type="checkbox"
              checked={record.roles.includes(role)}
              onChange={(event) =>
                update({ roles: event.target.checked ? ROLES.filter((item) => item === role || record.roles.includes(item)) : record.roles.filter((item) => item !== role) })
              }
            />{" "}
            {ROLE_LABELS[role][language]}
          </label>
        ))}
      </fieldset>
      <label htmlFor={field("sections")}>{t("sections")}</label>
      <textarea
        id={field("sections")}
        rows={4}
        value={record.sectionsShown.join("\n")}
        onChange={(event) => update({ sectionsShown: event.target.value.split("\n") })}
      />

      <h2>{t("questionsHeading")}</h2>
      {record.questions.length === 0 ? <p>{t("noQuestions")}</p> : null}
      <ol>
        {record.questions.map((item, index) => (
          <li key={item.id}>
            <p>
              <strong>{item.question}</strong>
            </p>
            <p>{t("asked", { role: ROLE_LABELS[item.askedBy]?.[language] ?? item.askedBy })}</p>
            <p>{t("answered", { text: item.answerGiven })}</p>
            <p>
              {item.followUp.kind === "none"
                ? t("none", { reason: item.followUp.reason })
                : t("promised", {
                    action: item.followUp.action,
                    owner: ROLE_LABELS[item.followUp.owner]?.[language] ?? item.followUp.owner,
                    due: item.followUp.due,
                    who: item.followUp.committedBy === "scio" ? t("scio") : t("team"),
                  })}
            </p>
            <button type="button" onClick={() => removeQuestion(item.id)}>
              {t("remove", { n: index + 1 })}
            </button>
          </li>
        ))}
      </ol>

      <form onSubmit={onAdd} noValidate aria-labelledby={field("add")}>
        <h3 id={field("add")}>{t("addHeading")}</h3>
        {formIssues.length > 0 ? (
          <ul id={field("form-issues")}>
            {formIssues.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        ) : null}
        <label htmlFor={field("asked-by")}>{t("askedBy")}</label>
        <select id={field("asked-by")} value={draft.askedBy} onChange={(event) => setDraft({ ...draft, askedBy: event.target.value as Role })}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role][language]}
            </option>
          ))}
        </select>
        <label htmlFor={field("question")}>{t("question")}</label>
        <textarea id={field("question")} rows={2} value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} />
        <label htmlFor={field("answer")}>{t("answer")}</label>
        <textarea
          id={field("answer")}
          rows={2}
          aria-describedby={field("answer-hint")}
          value={draft.answer}
          onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
        />
        <p id={field("answer-hint")}>{t("answerHint")}</p>
        <label className="check">
          <input type="checkbox" checked={draft.agreed} onChange={(event) => setDraft({ ...draft, agreed: event.target.checked })} /> {t("agreed")}
        </label>
        <fieldset>
          <legend>{t("followUpGroup")}</legend>
          <label className="check">
            <input type="radio" name={field("mode")} checked={draft.mode === "none"} onChange={() => setDraft({ ...draft, mode: "none" })} /> {t("followNone")}
          </label>
          <label className="check">
            <input type="radio" name={field("mode")} checked={draft.mode === "follow-up"} onChange={() => setDraft({ ...draft, mode: "follow-up" })} />{" "}
            {t("followYes")}
          </label>
        </fieldset>
        {draft.mode === "none" ? (
          <>
            <label htmlFor={field("reason")}>{t("reason")}</label>
            <input id={field("reason")} value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} />
          </>
        ) : (
          <>
            <label htmlFor={field("action")}>{t("action")}</label>
            <input id={field("action")} value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value })} />
            <label htmlFor={field("owner")}>{t("owner")}</label>
            <select id={field("owner")} value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value as Role })}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role][language]}
                </option>
              ))}
            </select>
            <label htmlFor={field("due")}>{t("due")}</label>
            <input id={field("due")} inputMode="numeric" value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })} />
            <fieldset>
              <legend>{t("committedBy")}</legend>
              <label className="check">
                <input
                  type="radio"
                  name={field("who")}
                  checked={draft.committedBy === "team"}
                  onChange={() => setDraft({ ...draft, committedBy: "team", confirmed: false })}
                />{" "}
                {t("team")}
              </label>
              <label className="check">
                <input type="radio" name={field("who")} checked={draft.committedBy === "scio"} onChange={() => setDraft({ ...draft, committedBy: "scio" })} />{" "}
                {t("scio")}
              </label>
            </fieldset>
            {draft.committedBy === "scio" ? (
              <label className="check">
                <input type="checkbox" checked={draft.confirmed} onChange={(event) => setDraft({ ...draft, confirmed: event.target.checked })} />{" "}
                {t("confirmed")}
              </label>
            ) : null}
          </>
        )}
        <button type="submit">{t("add")}</button>
      </form>

      <h2>{t("issuesHeading")}</h2>
      {note.issues.length === 0 ? (
        <p>{t("noIssues")}</p>
      ) : (
        <ul>
          {note.issues.map((issue, index) => (
            <li key={`${issue.where}-${issue.code}-${index}`}>
              {issue.where === "record" ? "" : `${issue.where}: `}
              {ISSUE_TEXT[issue.code][language]}
            </li>
          ))}
        </ul>
      )}

      <h2>{t("noteHeading")}</h2>
      <p>{note.ready ? t("noteReady") : t("noteNotReady")}</p>
      <label htmlFor={field("note")}>{t("noteLabel")}</label>
      <textarea id={field("note")} readOnly rows={18} value={note.text} />

      <div>
        {confirming ? (
          <div role="group" aria-labelledby={field("confirm")}>
            <p id={field("confirm")}>{t("clearConfirm")}</p>
            <button type="button" onClick={clearAll}>
              {t("clearYes")}
            </button>{" "}
            <button
              ref={keepRef}
              type="button"
              onClick={() => {
                setConfirming(false);
                window.requestAnimationFrame(() => clearRef.current?.focus());
              }}
            >
              {t("clearNo")}
            </button>
          </div>
        ) : (
          <button ref={clearRef} type="button" onClick={() => setConfirming(true)}>
            {t("clear")}
          </button>
        )}
      </div>
    </section>
  );
}
