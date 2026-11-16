import { useEffect, useRef, useState, type ReactNode } from "react";
import { interpolate, messages, type MessageKey } from "../i18n.js";
import {
  buildOrganiserRecord,
  choicesFor,
  completeness,
  emptyOrganiserForm,
  formFields,
  organiserFileName,
  serializeOrganiserFile,
  type BuildResult,
  type FormIssue,
  type OrganiserFormInput,
} from "../organiser.js";
import { SECTION_ORDER, type FieldDef } from "../project.js";
import type { EventFormat, Lang } from "../types.js";
import { saveTextFile } from "./download.js";

export interface OrganiserFormProps {
  lang: Lang;
  /** Today on this device, YYYY-MM-DD. */
  today: string;
  /** Starting answers. Defaults to an empty checklist dated today. */
  initialInput?: OrganiserFormInput;
  /** Start with the answers already checked, so the summary or the error list is shown. */
  initiallyChecked?: boolean;
  /** Replaces the browser download, for a shell that saves files its own way. */
  onSaveFile?: (fileName: string, text: string) => boolean;
}

/** Which input an issue points at. */
const ISSUE_TARGET: Record<string, string> = {
  eventLabel: "eventLabelEn",
  placeLabel: "placeLabelEn",
  arrivalWindow: "arrivalEarliest",
  record: "eventLabelEn",
};

const inputId = (field: string) => `org-${(ISSUE_TARGET[field] ?? field).replace(/\./g, "-")}`;

const FORMATS: readonly EventFormat[] = ["in_person", "virtual", "hybrid"];

function choiceLabel(def: FieldDef, choice: string, lang: Lang): string {
  const m = messages[lang];
  if (def.kind === "yesno") return choice === "yes" ? m.value_yes : m.value_no;
  return m[`value_${def.kind}_${choice}` as MessageKey];
}

/**
 * The organiser checklist. It builds a per-event record from the answers and saves it as a file
 * on this device. Nothing is sent; the organiser shares the file themselves.
 */
export function OrganiserForm({ lang, today, initialInput, initiallyChecked = false, onSaveFile = saveTextFile }: OrganiserFormProps) {
  const m = messages[lang];
  const [input, setInput] = useState<OrganiserFormInput>(() => initialInput ?? emptyOrganiserForm(today));
  const [result, setResult] = useState<BuildResult | null>(() =>
    initiallyChecked ? buildOrganiserRecord(initialInput ?? emptyOrganiserForm(today), lang, today) : null,
  );
  const [saved, setSaved] = useState<string | null>(null);
  const outcomeRef = useRef<HTMLHeadingElement>(null);
  const focusOutcome = useRef(false);

  useEffect(() => {
    if (focusOutcome.current) {
      focusOutcome.current = false;
      outcomeRef.current?.focus();
    }
  }, [result]);

  const issues: FormIssue[] = result && !result.ok ? result.issues : [];
  const issueFor = (field: string) => issues.find((issue) => inputId(issue.field) === inputId(field));

  const change = (patch: Partial<OrganiserFormInput>) => {
    setInput((current) => ({ ...current, ...patch }));
    setResult(null);
    setSaved(null);
  };
  const answer = (id: string, value: string) => change({ answers: { ...input.answers, [id]: value } });
  const answerFr = (id: string, value: string) => change({ answersFr: { ...input.answersFr, [id]: value } });

  const check = () => {
    focusOutcome.current = true;
    setSaved(null);
    setResult(buildOrganiserRecord(input, lang, today));
  };

  const save = () => {
    if (!result?.ok) return;
    const name = organiserFileName(result.record);
    setSaved(onSaveFile(name, serializeOrganiserFile(result.record, today)) ? name : null);
  };

  /** A labelled control with its hint and error wired up. */
  const control = (
    field: string,
    label: string,
    render: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => ReactNode,
    hint?: string,
    idOverride?: string,
  ) => {
    const id = idOverride ?? inputId(field);
    const issue = idOverride && idOverride !== inputId(field) ? undefined : issueFor(field);
    const describedBy = [hint ? `${id}-hint` : null, issue ? `${id}-error` : null].filter(Boolean).join(" ");
    return (
      <div className="control" key={id}>
        <label htmlFor={id}>{label}</label>
        {hint ? (
          <p className="hint" id={`${id}-hint`}>
            {hint}
          </p>
        ) : null}
        {render({ id, ...(describedBy ? { "aria-describedby": describedBy } : {}), ...(issue ? { "aria-invalid": true as const } : {}) })}
        {issue ? (
          <p className="error" id={`${id}-error`}>
            {m[`issue_${issue.code}` as MessageKey]}
          </p>
        ) : null}
      </div>
    );
  };

  const textInput = (field: keyof OrganiserFormInput & string, label: string, type = "text", hint?: string) =>
    control(
      field,
      label,
      (props) => (
        <input {...props} type={type} value={input[field] as string} onChange={(e) => change({ [field]: e.target.value } as Partial<OrganiserFormInput>)} />
      ),
      hint,
    );

  const fieldControl = (def: FieldDef) => {
    const label = m[def.label];
    const value = input.answers[def.id] ?? "";
    switch (def.kind) {
      case "yesno":
      case "parking":
      case "support":
        return control(def.id, label, (props) => (
          <select {...props} value={value} onChange={(e) => answer(def.id, e.target.value)}>
            <option value="">{m.orgUnknownOption}</option>
            {choicesFor(def.kind).map((choice) => (
              <option key={choice} value={choice}>
                {choiceLabel(def, choice, lang)}
              </option>
            ))}
          </select>
        ));
      case "mm":
      case "m":
        return control(
          def.id,
          label,
          (props) => <input {...props} type="text" inputMode="decimal" value={value} onChange={(e) => answer(def.id, e.target.value)} />,
          m[`orgHint_${def.kind}` as MessageKey],
        );
      case "link":
        return control(
          def.id,
          label,
          (props) => <input {...props} type="url" value={value} onChange={(e) => answer(def.id, e.target.value)} />,
          m.orgHint_link,
        );
      case "text":
        return (
          <div className="pair" key={def.id}>
            {control(def.id, interpolate(m.orgTextEn, { label }), (props) => (
              <textarea {...props} lang="en" rows={3} value={value} onChange={(e) => answer(def.id, e.target.value)} />
            ))}
            {control(
              def.id,
              interpolate(m.orgTextFr, { label }),
              (props) => (
                <textarea {...props} lang="fr" rows={3} value={input.answersFr[def.id] ?? ""} onChange={(e) => answerFr(def.id, e.target.value)} />
              ),
              undefined,
              `${inputId(def.id)}-fr`,
            )}
          </div>
        );
    }
  };

  const fields = formFields(input.format);
  const summary = result?.ok ? completeness(result.record) : null;
  const labelOf = (id: string) => {
    const def = fields.find((f) => f.id === id);
    return def ? m[def.label] : id;
  };

  return (
    <article lang={lang} className="page" aria-labelledby="org-title">
      <h1 id="org-title">{m.orgHeading}</h1>
      <p className="lede">{m.orgIntro}</p>
      <p className="notice">{m.orgClaimNote}</p>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <fieldset>
          <legend>{m.orgAboutLegend}</legend>
          {textInput("eventLabelEn", m.org_eventLabelEn, "text", m.orgOneLanguageHint)}
          {textInput("eventLabelFr", m.org_eventLabelFr)}
          {control("format", m.org_format, (props) => (
            <select {...props} value={input.format} onChange={(e) => change({ format: e.target.value as EventFormat })}>
              {FORMATS.map((format) => (
                <option key={format} value={format}>
                  {m[`format_${format}` as MessageKey]}
                </option>
              ))}
            </select>
          ))}
          {textInput("occurrenceDate", m.org_occurrenceDate, "date")}
          {textInput("placeLabelEn", m.org_placeLabelEn)}
          {textInput("placeLabelFr", m.org_placeLabelFr)}
          {textInput("address", m.org_address)}
          {textInput("arrivalEarliest", m.org_arrivalEarliest, "time")}
          {textInput("arrivalLatest", m.org_arrivalLatest, "time")}
        </fieldset>

        <fieldset>
          <legend>{m.orgStatementLegend}</legend>
          {textInput("statedBy", m.org_statedBy, "text", m.org_statedByHint)}
          {textInput("statementDate", m.org_statementDate, "date")}
          {textInput("licence", m.org_licence)}
        </fieldset>

        {SECTION_ORDER.map((section) => {
          const inSection = fields.filter((def) => def.section === section);
          if (inSection.length === 0) return null;
          return (
            <fieldset key={section} data-form-section={section}>
              <legend>{m[`section_${section}` as MessageKey]}</legend>
              {inSection.map(fieldControl)}
            </fieldset>
          );
        })}

        <button type="submit">{m.orgCheck}</button>
      </form>

      {result && !result.ok ? (
        <section className="block errors" aria-labelledby="org-errors" data-form-outcome="errors">
          <h2 id="org-errors" ref={outcomeRef} tabIndex={-1}>
            {issues.length === 1 ? m.orgErrorsHeading_one : interpolate(m.orgErrorsHeading, { count: issues.length })}
          </h2>
          <ul>
            {issues.map((issue) => (
              <li key={`${issue.field}-${issue.code}`}>
                <a href={`#${inputId(issue.field)}`}>
                  {m[`issue_${issue.code}` as MessageKey]}
                  {labelOf(issue.field) === issue.field ? "" : ` (${labelOf(issue.field)})`}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result?.ok && summary ? (
        <section className="block" aria-labelledby="org-summary" data-form-outcome="summary">
          <h2 id="org-summary" ref={outcomeRef} tabIndex={-1}>
            {m.orgSummaryHeading}
          </h2>
          <p className="value" data-summary-unknown={summary.unknown} data-summary-total={summary.total}>
            {interpolate(m.orgSummary, { answered: summary.answered, total: summary.total, unknown: summary.unknown })}
          </p>
          <p>{summary.complete ? m.orgSummaryComplete : m.orgSummaryIncomplete}</p>
          <ul>
            {summary.sections.map((section) => (
              <li key={section.id}>
                {interpolate(m.orgSectionLine, {
                  section: m[`section_${section.id}` as MessageKey],
                  unknown: section.unknown,
                  total: section.total,
                })}
              </li>
            ))}
          </ul>
          {summary.sameTextBothLanguages.length > 0 ? (
            <p>{interpolate(m.orgSummaryOneLanguage, { count: summary.sameTextBothLanguages.length })}</p>
          ) : null}
          {summary.unknownIds.length > 0 ? (
            <>
              <h3 id="org-unknown-list">{m.orgUnknownListHeading}</h3>
              <ul aria-labelledby="org-unknown-list">
                {summary.unknownIds.map((id) => (
                  <li key={id}>{labelOf(id)}</li>
                ))}
              </ul>
            </>
          ) : null}
          <p>{m.orgClaimNote}</p>
          <button type="button" onClick={save}>
            {m.orgSave}
          </button>
          <p role="status" aria-live="polite">
            {saved ? `${interpolate(m.fileSaved, { name: saved })} ${m.orgSavedShare}` : ""}
          </p>
        </section>
      ) : null}
    </article>
  );
}
