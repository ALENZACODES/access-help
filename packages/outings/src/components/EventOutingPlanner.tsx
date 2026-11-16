import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { addOwnItem, buildPlan, localToday, planProgress, planTiming, removeOwnItem, setItemDone, type OwnItemProblem } from "../event-plan/plan";
import { SAMPLE_EVENT_SOURCES } from "../event-plan/samples";
import { MAX_SOURCE_CHARS, parseEventSource, type SourceFileError } from "../event-plan/source";
import { deleteAllPlans, deviceStorage, loadPlans, upsertPlan, withoutPlan, writePlans, type StorageLike } from "../event-plan/store";
import { fill, planStrings, type PlanStringKey } from "../event-plan/strings";
import type { EventOutingSource, EventPlan, PlanItem } from "../event-plan/types";
import type { Lang } from "../types";

export interface EventOutingPlannerProps {
  lang: Lang;
  /** Today on this device, YYYY-MM-DD. Defaults to the device's local date. */
  today?: string;
  /** Events offered in the picker. Defaults to labelled sample events. */
  sources?: readonly EventOutingSource[];
  /** Where plans are kept. Defaults to this browser's local storage. Pass null to keep nothing. */
  storage?: StorageLike | null;
  /** Plans to show at first, instead of reading storage. */
  initialPlans?: EventPlan[];
}

const STYLE = `
.event-plan{font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;background:#fff;padding:1rem;max-width:48rem;margin:0 auto;overflow-wrap:anywhere}
.event-plan *{box-sizing:border-box;min-width:0}
.event-plan h1{font-size:1.5rem;margin:.5rem 0}
.event-plan h2{font-size:1.2rem;margin:1.5rem 0 .5rem;padding-top:.5rem;border-top:1px solid #595959}
.event-plan h3{font-size:1.1rem;margin:0 0 .5rem}
.event-plan h4{font-size:1rem;margin:1rem 0 .5rem}
.event-plan ul{list-style:none;margin:0;padding:0}
.event-plan .plan{border:1px solid #595959;border-radius:6px;padding:.75rem;margin:0 0 1rem}
.event-plan .note{padding:.75rem;background:#fff3c4;border:2px solid #6b5300;border-radius:6px}
.event-plan .past{padding:.75rem;border:2px dashed #595959;border-radius:6px;font-weight:600}
.event-plan label{font-weight:600}
.event-plan .row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:flex-end;margin:.5rem 0}
.event-plan .grow{display:flex;flex-direction:column;gap:.25rem;flex:1 1 14rem}
.event-plan button,.event-plan select,.event-plan input[type=text],.event-plan input[type=file]{font:inherit;color:#1a1a1a;background:#fff;border:2px solid #595959;border-radius:6px;min-height:44px;padding:.5rem .75rem;max-width:100%}
.event-plan select,.event-plan input[type=text],.event-plan input[type=file]{width:100%}
.event-plan button{cursor:pointer}
.event-plan .item{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;padding:.25rem 0}
.event-plan .item label{display:flex;gap:.75rem;align-items:flex-start;flex:1 1 12rem;font-weight:400;min-height:44px;padding:.5rem 0}
.event-plan input[type=checkbox]{width:1.5rem;height:1.5rem;flex:0 0 auto;margin:0;accent-color:#1a1a1a}
.event-plan .done-text{text-decoration:line-through}
.event-plan .hint{margin:0;font-size:.9rem;color:#3d3d3d}
.event-plan .error{margin:0;color:#a40000;font-weight:600}
.event-plan :focus-visible{outline:3px solid #0b57d0;outline-offset:2px}
.event-plan h2:focus,.event-plan h3:focus{outline:3px solid #0b57d0;outline-offset:2px}
`;

type Confirm = { kind: "plan"; planId: string } | { kind: "all" } | null;

/**
 * Plan an outing to an event. The checklist starts from the items the event record leaves
 * Unknown. Plans stay on this device and can be deleted.
 */
export function EventOutingPlanner({ lang, today, sources = SAMPLE_EVENT_SOURCES, storage, initialPlans }: EventOutingPlannerProps) {
  const t = planStrings[lang];
  const [day] = useState(() => today ?? localToday());
  const [store] = useState<StorageLike | null>(() => (storage === undefined ? deviceStorage() : storage));
  const [loaded] = useState(() => (initialPlans ? { plans: initialPlans, problem: null } : loadPlans(store)));
  const [plans, setPlans] = useState<EventPlan[]>(loaded.plans);
  const [storageProblem, setStorageProblem] = useState<"unavailable" | "damaged" | null>(loaded.problem);
  const [sourceId, setSourceId] = useState(sources[0]?.eventId ?? "");
  const [status, setStatus] = useState("");
  const [fileError, setFileError] = useState<SourceFileError | "read" | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ownProblems, setOwnProblems] = useState<Record<string, OwnItemProblem | undefined>>({});
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusTarget) return;
    const nodes = root.current?.querySelectorAll<HTMLElement>("[data-focus]") ?? [];
    for (const node of nodes) {
      if (node.dataset.focus === focusTarget) {
        node.focus();
        break;
      }
    }
    setFocusTarget(null);
  }, [focusTarget]);

  const commit = (next: EventPlan[], message: string) => {
    setPlans(next);
    const saved = writePlans(store, next);
    if (!saved) setStorageProblem("unavailable");
    setStatus(saved || !store ? message : `${message} ${t.saveFailed}`.trim());
  };

  const start = (source: EventOutingSource) => {
    const plan = buildPlan(source, day);
    if (plans.some((p) => p.id === plan.id)) {
      setStatus(t.alreadyPlanned);
    } else {
      commit(upsertPlan(plans, plan), fill(t.planStarted, { event: plan.eventLabel[lang] }));
    }
    setFocusTarget(`plan:${plan.id}`);
  };

  const onStart = (event: FormEvent) => {
    event.preventDefault();
    const source = sources.find((s) => s.eventId === sourceId);
    if (source) start(source);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const picked = input.files?.[0];
    if (!picked) return;
    try {
      const parsed = picked.size > MAX_SOURCE_CHARS * 4 ? ({ ok: false, error: "too_large" } as const) : parseEventSource(await picked.text());
      if (parsed.ok) {
        setFileError(null);
        start(parsed.source);
      } else {
        setFileError(parsed.error);
      }
    } catch {
      setFileError("read");
    }
    input.value = "";
  };

  const update = (plan: EventPlan) => commit(upsertPlan(plans, plan), "");

  const onAddOwn = (event: FormEvent, plan: EventPlan) => {
    event.preventDefault();
    const result = addOwnItem(plan, drafts[plan.id] ?? "");
    if (result.ok) {
      update(result.plan);
      setDrafts({ ...drafts, [plan.id]: "" });
      setOwnProblems({ ...ownProblems, [plan.id]: undefined });
    } else {
      setOwnProblems({ ...ownProblems, [plan.id]: result.problem });
    }
  };

  const onDelete = (plan: EventPlan) => {
    commit(withoutPlan(plans, plan.id), t.planDeleted);
    setConfirm(null);
    setFocusTarget("plans-heading");
  };

  const onDeleteAll = () => {
    setPlans([]);
    const removed = deleteAllPlans(store);
    setStatus(removed || !store ? t.allDeleted : `${t.allDeleted} ${t.saveFailed}`);
    setConfirm(null);
    setFocusTarget("plans-heading");
  };

  const itemText = (item: PlanItem) => (item.kind === "own" ? item.text : fill(t.askItem, { label: item.label[lang] }));
  const domId = (plan: EventPlan, suffix: string) => `ep-${plans.indexOf(plan)}-${suffix}`;

  return (
    <div className="event-plan" lang={lang} ref={root}>
      <style>{STYLE}</style>
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
      <p className="note">{t.onDevice}</p>
      <p>{t.noRouteNote}</p>
      {storageProblem ? (
        <p className="error" data-storage-problem={storageProblem}>
          {t[`storage_${storageProblem}` as PlanStringKey]}
        </p>
      ) : null}

      <h2 id="ep-start">{t.startHeading}</h2>
      {sources.length > 0 ? (
        <form onSubmit={onStart} aria-labelledby="ep-start">
          {sources.some((s) => s.demonstration) ? (
            <p className="hint" id="ep-sample-note">
              {t.sampleNote}
            </p>
          ) : null}
          <div className="row">
            <div className="grow">
              <label htmlFor="ep-source">{t.sampleLabel}</label>
              <select id="ep-source" value={sourceId} onChange={(e) => setSourceId(e.target.value)} aria-describedby="ep-sample-note">
                {sources.map((s) => (
                  <option key={s.eventId} value={s.eventId}>
                    {s.label[lang]}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit">{t.startButton}</button>
          </div>
        </form>
      ) : null}
      <div className="grow">
        <label htmlFor="ep-file">{t.fileLabel}</label>
        <p className="hint" id="ep-file-hint">
          {t.fileHint}
        </p>
        <input
          id="ep-file"
          type="file"
          accept="application/json,.json"
          aria-describedby={fileError ? "ep-file-hint ep-file-error" : "ep-file-hint"}
          {...(fileError ? { "aria-invalid": true } : {})}
          onChange={(e) => void onFile(e)}
        />
        <p role="alert" id="ep-file-error" className={fileError ? "error" : undefined}>
          {fileError ? t[`fileError_${fileError}` as PlanStringKey] : ""}
        </p>
      </div>

      <p role="status" aria-live="polite" data-plan-status="true">
        {status}
      </p>

      <h2 id="ep-plans" tabIndex={-1} data-focus="plans-heading">
        {t.plansHeading}
      </h2>
      {plans.length === 0 ? <p>{t.noPlans}</p> : null}
      {plans.map((plan) => {
        const progress = planProgress(plan);
        const timing = planTiming(plan, day);
        const asked = plan.items.filter((item) => item.kind === "ask_organiser").length;
        const problem = ownProblems[plan.id];
        const confirming = confirm?.kind === "plan" && confirm.planId === plan.id;
        return (
          <section key={plan.id} className="plan" aria-labelledby={domId(plan, "title")} data-plan={plan.eventId}>
            <h3 id={domId(plan, "title")} tabIndex={-1} data-focus={`plan:${plan.id}`}>
              {plan.eventLabel[lang]}
            </h3>
            {plan.demonstration ? <p className="note">{t.demoLabel}</p> : null}
            <p>{plan.eventDate === "Unknown" ? t.eventDateUnknown : fill(t.eventDate, { date: plan.eventDate })}</p>
            <p className={timing === "past" ? "past" : undefined} data-plan-timing={timing}>
              {t[`timing_${timing}` as PlanStringKey]}
            </p>
            <p>{fill(t.sourceLine, { date: plan.sourcePreparedOn, unknown: asked, total: plan.sourceTotalFields })}</p>
            {asked === 0 ? <p>{t.noUnknown}</p> : null}

            <h4 id={domId(plan, "list")}>{t.checklistHeading}</h4>
            <p data-plan-progress={`${progress.done}/${progress.total}`}>{fill(t.progress, { done: progress.done, total: progress.total })}</p>
            <ul aria-labelledby={domId(plan, "list")}>
              {plan.items.map((item, index) => (
                <li key={item.id} className="item" data-item-kind={item.kind}>
                  <label htmlFor={domId(plan, `item-${index}`)}>
                    <input
                      id={domId(plan, `item-${index}`)}
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) => update(setItemDone(plan, item.id, e.target.checked))}
                    />
                    <span className={item.done ? "done-text" : undefined}>{itemText(item)}</span>
                  </label>
                  {item.kind === "own" ? (
                    <button type="button" onClick={() => update(removeOwnItem(plan, item.id))}>
                      {fill(t.removeLine, { text: item.text })}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            <form className="row" onSubmit={(e) => onAddOwn(e, plan)}>
              <div className="grow">
                <label htmlFor={domId(plan, "own")}>{t.ownItemLabel}</label>
                <input
                  id={domId(plan, "own")}
                  type="text"
                  value={drafts[plan.id] ?? ""}
                  onChange={(e) => setDrafts({ ...drafts, [plan.id]: e.target.value })}
                  {...(problem ? { "aria-invalid": true, "aria-describedby": domId(plan, "own-error") } : {})}
                />
                {problem ? (
                  <p className="error" id={domId(plan, "own-error")}>
                    {t[`ownProblem_${problem}` as PlanStringKey]}
                  </p>
                ) : null}
              </div>
              <button type="submit">{t.addButton}</button>
            </form>

            {confirming ? (
              <div role="group" aria-labelledby={domId(plan, "confirm")} className="row">
                <p id={domId(plan, "confirm")} className="grow">
                  {fill(t.deleteConfirm, { event: plan.eventLabel[lang] })}
                </p>
                <button type="button" data-focus={`confirm:${plan.id}`} onClick={() => onDelete(plan)}>
                  {t.deleteYes}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirm(null);
                    setFocusTarget(`delete:${plan.id}`);
                  }}
                >
                  {t.deleteNo}
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-focus={`delete:${plan.id}`}
                onClick={() => {
                  setConfirm({ kind: "plan", planId: plan.id });
                  setFocusTarget(`confirm:${plan.id}`);
                }}
              >
                {t.deletePlan}
              </button>
            )}
          </section>
        );
      })}

      {plans.length > 0 ? (
        confirm?.kind === "all" ? (
          <div role="group" aria-labelledby="ep-confirm-all" className="row">
            <p id="ep-confirm-all" className="grow">
              {fill(t.deleteAllConfirm, { count: plans.length })}
            </p>
            <button type="button" data-focus="confirm:all" onClick={onDeleteAll}>
              {t.deleteAllYes}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirm(null);
                setFocusTarget("delete:all");
              }}
            >
              {t.deleteAllNo}
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-focus="delete:all"
            onClick={() => {
              setConfirm({ kind: "all" });
              setFocusTarget("confirm:all");
            }}
          >
            {t.deleteAll}
          </button>
        )
      ) : null}
    </div>
  );
}
