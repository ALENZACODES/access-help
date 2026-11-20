import { MEASURE_DOOR_OPENINGS, measureIssueText, measureIssuesFor, measureRangeHint, type MeasureForm, type MeasureFormField, type MeasureFormIssue } from "./docs-bridge.js";
import { measureText, type MeasureKey } from "./measureStrings.js";
import type { Language } from "./types.js";

const DOOR_KEY = { automatic: "doorAutomatic", button: "doorButton", manual: "doorManual" } as const;

/** Props for one field: its id, an invalid flag and the ids of its hint and its errors. */
export function measureFieldProps(prefix: string, issues: readonly MeasureFormIssue[], name: MeasureFormField, hint: boolean) {
  const mine = measureIssuesFor(issues, name);
  const describedBy = [hint ? `${prefix}-${name}-help` : "", mine.length > 0 ? `${prefix}-${name}-error` : ""].filter((id) => id !== "").join(" ");
  return { id: `${prefix}-${name}`, "aria-invalid": mine.length > 0 ? (true as const) : undefined, "aria-describedby": describedBy === "" ? undefined : describedBy };
}

export function MeasureFieldErrors({ prefix, issues, name, language }: { prefix: string; issues: readonly MeasureFormIssue[]; name: MeasureFormField; language: Language }) {
  const mine = measureIssuesFor(issues, name);
  if (mine.length === 0) return null;
  return (
    <p id={`${prefix}-${name}-error`} className="measure-error">
      {mine.map((issue) => measureIssueText(issue, language)).join(" ")}
    </p>
  );
}

/**
 * The fields for the facts about the way in: steps, the door, a ramp and the wheelchair
 * toilet. Used where a person writes down what they measured and where they write down what
 * a place told them. Every field is optional, and every list starts on "not noted".
 */
export function MeasureFields({
  prefix,
  form,
  issues,
  language,
  onChange,
}: {
  prefix: string;
  form: MeasureForm;
  issues: readonly MeasureFormIssue[];
  language: Language;
  onChange: (field: MeasureFormField, value: string) => void;
}) {
  const t = (key: MeasureKey) => measureText(language, key);

  function lengthField(name: "stepHeight" | "doorWidth" | "toiletDoor", label: MeasureKey, range: "stepHeightCm" | "doorWidthCm" | "toiletDoorCm") {
    return (
      <div className="measure-field">
        <label htmlFor={`${prefix}-${name}`}>{t(label)}</label>
        <p id={`${prefix}-${name}-help`} className="hint">
          {measureRangeHint(range, language)}
        </p>
        <input type="text" inputMode="decimal" autoComplete="off" value={form[name]} onChange={(e) => onChange(name, e.currentTarget.value)} {...measureFieldProps(prefix, issues, name, true)} />
        <MeasureFieldErrors prefix={prefix} issues={issues} name={name} language={language} />
      </div>
    );
  }

  function yesNoField(name: "ramp" | "toilet", label: MeasureKey) {
    return (
      <div className="measure-field">
        <label htmlFor={`${prefix}-${name}`}>{t(label)}</label>
        <select value={form[name]} onChange={(e) => onChange(name, e.currentTarget.value)} {...measureFieldProps(prefix, issues, name, false)}>
          <option value="">{t("choiceUnknown")}</option>
          <option value="yes">{t("yes")}</option>
          <option value="no">{t("no")}</option>
        </select>
      </div>
    );
  }

  return (
    <>
      <div className="measure-field">
        <label htmlFor={`${prefix}-steps`}>{t("steps")}</label>
        <p id={`${prefix}-steps-help`} className="hint">
          {t("stepsHelp")}
        </p>
        <input type="text" inputMode="numeric" autoComplete="off" value={form.steps} onChange={(e) => onChange("steps", e.currentTarget.value)} {...measureFieldProps(prefix, issues, "steps", true)} />
        <MeasureFieldErrors prefix={prefix} issues={issues} name="steps" language={language} />
      </div>
      {lengthField("stepHeight", "stepHeight", "stepHeightCm")}
      {yesNoField("ramp", "ramp")}
      {lengthField("doorWidth", "doorWidth", "doorWidthCm")}
      <div className="measure-field">
        <label htmlFor={`${prefix}-doorOpening`}>{t("doorOpening")}</label>
        <select value={form.doorOpening} onChange={(e) => onChange("doorOpening", e.currentTarget.value)} {...measureFieldProps(prefix, issues, "doorOpening", false)}>
          <option value="">{t("choiceUnknown")}</option>
          {MEASURE_DOOR_OPENINGS.map((id) => (
            <option key={id} value={id}>
              {t(DOOR_KEY[id])}
            </option>
          ))}
        </select>
      </div>
      {yesNoField("toilet", "toilet")}
      {lengthField("toiletDoor", "toiletDoor", "toiletDoorCm")}
    </>
  );
}
