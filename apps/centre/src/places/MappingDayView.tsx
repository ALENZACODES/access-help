import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  FOCUS_LABEL,
  GROUP_TITLE,
  CHECKLIST_GROUPS,
  describeCell,
  gridIssueText,
  itemsIn,
  progress,
  progressText,
  setTick,
  sessionIssueText,
  stateText,
  type SessionIssue,
} from "./docs-bridge.js";
import { createDayStore, type SavedDay } from "./dayStore.js";
import { DEFAULT_OPTIONS, FORM_CELL_SIZES, FORM_FOCUS, boundsFromRecords, buildDayView, emptyDayForm, formWithBounds, submitDayForm, type DayForm, type DayOptions, type FormErrors } from "./mappingDayModel.js";
import { dayText, type DayKey } from "./mappingDayStrings.js";
import { PlacesNav } from "./PlacesNav.js";
import { createDraftStore, type KeyValueStorage } from "./store.js";
import { localToday } from "./today.js";
import type { Language } from "./types.js";
import "./places.css";

function save(name: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Plans a mapping day on this device: an area split into cells, where records exist, where to
 * look next, a checklist, a debrief and files to keep. It makes no request.
 */
export function MappingDayView({ language, storage }: { language: Language; storage: KeyValueStorage }) {
  const days = useMemo(() => createDayStore(storage), [storage]);
  const drafts = useMemo(() => createDraftStore(storage), [storage]);
  const today = localToday();
  const t = (key: DayKey, vars?: Record<string, string | number>) => dayText(language, key, vars);
  const [version, setVersion] = useState(0);
  const saved = useMemo(() => days.list(), [days, version]);
  const records = useMemo(() => drafts.list(), [drafts, version]);
  const [form, setForm] = useState<DayForm>(() => emptyDayForm(today));
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [options, setOptions] = useState<DayOptions>(DEFAULT_OPTIONS);
  const summaryRef = useRef<HTMLDivElement>(null);

  const open: SavedDay | undefined = saved.find((day) => day.session.id === openId);
  const view = useMemo(() => (open ? buildDayView(open.session, records, options, language, today) : null), [open, records, options, language, today]);

  function set<K extends keyof DayForm>(name: K, value: DayForm[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function useSaved() {
    const bounds = boundsFromRecords(records);
    if (!bounds) {
      setMessage(t("useSavedNone"));
      return;
    }
    setForm((current) => formWithBounds(current, bounds, language));
    setMessage(t("useSavedDone"));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const result = submitDayForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      queueMicrotask(() => summaryRef.current?.focus());
      return;
    }
    const outcome = days.save(result.session);
    if (!outcome.ok) {
      setErrors({});
      setMessage(t(outcome.reason === "storage-full" ? "saveFailedFull" : outcome.reason === "too-many" ? "saveFailedMany" : "saveFailedUnavailable"));
      return;
    }
    setErrors({});
    setForm(emptyDayForm(today));
    setVersion((v) => v + 1);
    setOpenId(result.session.id);
    setMessage(t("saved"));
  }

  function remove(day: SavedDay) {
    days.remove(day.session.id);
    if (openId === day.session.id) setOpenId(null);
    setVersion((v) => v + 1);
    setMessage(t("removed"));
  }

  function tickItem(day: SavedDay, id: string, done: boolean) {
    days.setTicks(day.session.id, setTick(day.ticks, id, done));
    setVersion((v) => v + 1);
  }

  const issueText = (issue: SessionIssue) => (issue.field === "session" ? sessionIssueText(issue, language) : sessionIssueText(issue, language) ?? gridIssueText({ code: issue.code as never, field: issue.field as never }, language));
  const errorList = Object.entries(errors).flatMap(([field, issues]) => (issues ?? []).map((issue) => ({ field, text: issueText(issue) })));

  return (
    <div className="places">
      <h1>{t("title")}</h1>
      <PlacesNav language={language} />
      <p>{t("lead")}</p>
      <p>{t("limitsNote")}</p>

      <div role="status" aria-live="polite" className="places-notice">
        {message}
      </div>

      <section aria-labelledby="day-new">
        <h2 id="day-new">{t("newHeading")}</h2>
        {errorList.length > 0 ? (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="error-summary">
            <h3>{t("errorsHeading")}</h3>
            <ul>
              {errorList.map((item, index) => (
                <li key={index}>
                  <a href={`#day-${item.field === "area" ? "south" : item.field}`}>{item.text}</a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <form onSubmit={onSubmit} noValidate>
          <p>
            <label htmlFor="day-name">{t("nameLabel")}</label>
            <input id="day-name" type="text" value={form.name} onChange={(e) => set("name", e.currentTarget.value)} aria-invalid={errors.name ? true : undefined} />
          </p>
          <p>
            <label htmlFor="day-date">{t("dateLabel")}</label>
            <input id="day-date" type="text" inputMode="numeric" value={form.date} onChange={(e) => set("date", e.currentTarget.value)} aria-invalid={errors.date ? true : undefined} />
          </p>
          <fieldset>
            <legend>{t("areaHeading")}</legend>
            <p id="day-area-help">{t("areaHelp")}</p>
            {(["south", "west", "north", "east"] as const).map((edge) => (
              <p key={edge}>
                <label htmlFor={`day-${edge}`}>{t(edge)}</label>
                <input id={`day-${edge}`} type="text" inputMode="decimal" value={form[edge]} onChange={(e) => set(edge, e.currentTarget.value)} aria-describedby="day-area-help" aria-invalid={errors[edge] || errors.area ? true : undefined} />
              </p>
            ))}
            <p className="places-actions">
              <button type="button" onClick={useSaved}>
                {t("useSaved")}
              </button>
            </p>
          </fieldset>
          <p>
            <label htmlFor="day-cell">{t("cellLabel")}</label>
            <select id="day-cell" value={form.cellMetres} onChange={(e) => set("cellMetres", e.currentTarget.value)}>
              {FORM_CELL_SIZES.map((size) => (
                <option key={size} value={String(size)}>
                  {t("cellOption", { size })}
                </option>
              ))}
            </select>
          </p>
          <fieldset>
            <legend>{t("focusLegend")}</legend>
            {FORM_FOCUS.map((id) => (
              <p key={id}>
                <label>
                  <input type="checkbox" checked={form.focus.includes(id)} onChange={(e) => set("focus", e.currentTarget.checked ? [...form.focus, id] : form.focus.filter((f) => f !== id))} /> {FOCUS_LABEL[id][language]}
                </label>
              </p>
            ))}
          </fieldset>
          <p>
            <label htmlFor="day-notes">{t("notesLabel")}</label>
            <textarea id="day-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.currentTarget.value)} aria-invalid={errors.notes ? true : undefined} />
          </p>
          <p className="places-actions">
            <button type="submit">{t("save")}</button>
          </p>
        </form>
      </section>

      <section aria-labelledby="day-saved">
        <h2 id="day-saved">{t("savedHeading")}</h2>
        {saved.length === 0 ? <p>{t("savedNone")}</p> : null}
        <ul className="place-list">
          {saved.map((day) => (
            <li key={day.session.id}>
              <strong>{day.session.name}</strong> ({day.session.date})
              {day.session.focus.length > 0 ? ` ${t("focusFor")}: ${day.session.focus.map((f) => FOCUS_LABEL[f][language]).join(", ")}` : ""}
              <span className="places-actions">
                <button type="button" aria-pressed={openId === day.session.id} onClick={() => setOpenId(openId === day.session.id ? null : day.session.id)}>
                  {t("open", { name: day.session.name })}
                </button>
                <button type="button" onClick={() => remove(day)}>
                  {t("remove", { name: day.session.name })}
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {open && !view ? <p role="alert">{t("gridBroken")}</p> : null}
      {open && view ? (
        <section aria-labelledby="day-detail">
          <h2 id="day-detail">{t("detailHeading", { name: open.session.name })}</h2>
          <p>{t("detailMeta", { date: open.session.date, size: open.session.cellMetres, rows: view.coverage.grid.rows, cols: view.coverage.grid.cols })}</p>
          {open.session.notes !== "" ? <p>{open.session.notes}</p> : null}

          <fieldset>
            <legend>{t("scopeLegend")}</legend>
            {(["all", "since-session-date"] as const).map((scope) => (
              <label key={scope}>
                <input type="radio" name="day-scope" checked={options.scope === scope} onChange={() => setOptions((o) => ({ ...o, scope }))} /> {t(scope === "all" ? "scopeAll" : "scopeSince")}{" "}
              </label>
            ))}
          </fieldset>

          <h3>{t("gridHeading")}</h3>
          <p>{t("gridLead")}</p>
          <div className="places-scroll" role="region" aria-label={t("gridCaption")} tabIndex={0}>
            <table className="places-table">
              <caption>{t("gridCaption")}</caption>
              <tbody>
                {view.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell) => (
                      <td key={cell.label} data-state={cell.state}>
                        <span className="places-visually-hidden">{describeCell(cell, language)}</span>
                        <span aria-hidden="true">
                          {cell.label}
                          <br />
                          {cell.total}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {view.coverage.summary.outside > 0 ? <p>{t("outside", { count: view.coverage.summary.outside })}</p> : null}

          <h3>{t("nextHeading")}</h3>
          <p>{t("nextLead")}</p>
          <fieldset>
            <legend>{t("orderLegend")}</legend>
            {(["rows", "nearest"] as const).map((order) => (
              <label key={order}>
                <input type="radio" name="day-order" checked={options.order === order} onChange={() => setOptions((o) => ({ ...o, order }))} /> {t(order === "rows" ? "orderRows" : "orderNearest")}{" "}
              </label>
            ))}
          </fieldset>
          <h4>{t("paceHeading")}</h4>
          <p>{t("paceHelp")}</p>
          <p>
            <label htmlFor="day-speed">{t("metresPerMinute")}</label>
            <input id="day-speed" type="text" inputMode="decimal" value={options.metresPerMinute} onChange={(e) => {
              const value = e.currentTarget.value;
              setOptions((o) => ({ ...o, metresPerMinute: value }));
            }} />
          </p>
          <p>
            <label htmlFor="day-stop">{t("minutesPerCell")}</label>
            <input id="day-stop" type="text" inputMode="decimal" value={options.minutesPerCell} onChange={(e) => {
              const value = e.currentTarget.value;
              setOptions((o) => ({ ...o, minutesPerCell: value }));
            }} />
          </p>
          {view.routeLines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
          <ul>
            {view.toRevisit.slice(0, 12).map((cell) => (
              <li key={cell.label}>
                {cell.label}: {stateText(cell.state, language)}
              </li>
            ))}
          </ul>

          <h3>{t("checklistHeading")}</h3>
          <p>{t("checklistLead")}</p>
          <p role="status" aria-live="polite">
            {progressText(progress(open.ticks), language)}
          </p>
          {CHECKLIST_GROUPS.map((group) => (
            <fieldset key={group}>
              <legend>{GROUP_TITLE[group][language]}</legend>
              {itemsIn(group).map((item) => (
                <p key={item.id}>
                  <label>
                    <input type="checkbox" checked={open.ticks[item.id] === true} onChange={(e) => tickItem(open, item.id, e.currentTarget.checked)} /> {item.text[language]}
                  </label>
                </p>
              ))}
            </fieldset>
          ))}

          <h3>{t("debriefHeading")}</h3>
          {view.debrief.map((section) => (
            <div key={section.id}>
              <h4>{section.title}</h4>
              <ul>
                {section.lines.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </div>
          ))}

          <h3>{t("filesHeading")}</h3>
          <p>{t("filesLead")}</p>
          <ul className="places-actions">
            {view.files.map((file) => (
              <li key={file.name}>
                <button type="button" onClick={() => save(file.name, file.mime, file.content)}>
                  {t("download", { name: file.name })}
                </button>
              </li>
            ))}
          </ul>
          <p>{t("notAdvice")}</p>
        </section>
      ) : null}
    </div>
  );
}
