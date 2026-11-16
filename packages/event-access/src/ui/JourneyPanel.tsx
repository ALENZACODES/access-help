import { useState } from "react";
import { interpolate, messages, type MessageKey } from "../i18n.js";
import { buildJourneyHandoff, journeyView } from "../journey.js";
import { outingSourceFileName, serializeOutingSource, toOutingSource } from "../outing-source.js";
import { UNKNOWN, type Bilingual, type EventAccessRecord, type Lang, type Unknown } from "../types.js";
import { saveTextFile } from "./download.js";

export interface JourneyPanelProps {
  record: EventAccessRecord;
  lang: Lang;
  /** Today on this device, YYYY-MM-DD. */
  today: string;
  /**
   * A result handed back by a journey planner module, if one is connected. This package ships no
   * planner, so the App leaves this out and the panel says the planner is not connected.
   */
  plannerResult?: unknown;
  /** Replaces the browser download, for a shell that saves files its own way. */
  onSaveFile?: (fileName: string, text: string) => boolean;
}

/** The typed hand-off to a journey planner, shown as data. It never states that a route works. */
export function JourneyPanel({ record, lang, today, plannerResult, onSaveFile = saveTextFile }: JourneyPanelProps) {
  const m = messages[lang];
  const [saved, setSaved] = useState<string | null>(null);
  const handoff = buildJourneyHandoff(record, today);
  const view = journeyView(handoff, plannerResult);
  const source = toOutingSource(record, today);
  const id = (suffix: string) => `${record.eventId}-journey-${suffix}`;
  const text = (value: Bilingual | Unknown) => (value === UNKNOWN ? m.journeyUnknown : value[lang]);
  const plain = (value: string | Unknown) => (value === UNKNOWN ? m.journeyUnknown : value);
  const { destination, arrival } = handoff.request;
  const window =
    arrival.earliest === UNKNOWN || arrival.latest === UNKNOWN
      ? m.journeyUnknown
      : interpolate(m.arrivalWindowValue, { earliest: arrival.earliest, latest: arrival.latest });
  const rows: [string, string, string][] = [
    ["destination", m.journey_destination, text(destination.label)],
    ["placeId", m.journey_placeId, plain(destination.placeId)],
    ["address", m.journey_address, plain(destination.address)],
    ["entrance", m.journey_entrance, text(destination.entranceInUse)],
    ["dropOff", m.journey_dropOff, text(destination.dropOff)],
    ["date", m.journey_date, plain(arrival.date)],
    ["window", m.journey_window, window],
  ];

  const save = () => {
    const name = outingSourceFileName(source);
    setSaved(onSaveFile(name, serializeOutingSource(source)) ? name : null);
  };

  return (
    <article lang={lang} className="page" aria-labelledby={id("title")}>
      <h1 id={id("title")}>{m.journeyHeading}</h1>
      <p className="lede">{record.eventLabel[lang]}</p>
      {record.demonstration ? <p className="notice">{m.demoBanner}</p> : null}

      {view.state === "planner_result" ? (
        <section aria-labelledby={id("result")} className="block" data-journey-state="planner_result">
          <h2 id={id("result")}>{m.journeyResultHeading}</h2>
          <p className="value">{m[`journeyOutcome_${view.result.outcome}` as MessageKey]}</p>
          <p>{view.result.summary[lang]}</p>
          <p>{interpolate(m.journeyResultSource, { planner: view.result.planner, date: view.result.computedOn })}</p>
        </section>
      ) : (
        <p className="notice" data-journey-state={view.state}>
          {view.state === "not_connected" ? m.journeyNotConnected : m[`journeyRefused_${view.problem}` as MessageKey]}
        </p>
      )}

      <section aria-labelledby={id("handoff")} className="block">
        <h2 id={id("handoff")}>{m.journeyHandoffHeading}</h2>
        <p>{m.journeyHandoffIntro}</p>
        <dl className="fields">
          {rows.map(([key, label, value]) => (
            <div className="field" key={key} data-handoff={key}>
              <dt>{label}</dt>
              <dd>
                <p className={value === m.journeyUnknown ? "value empty" : "value"}>{value}</p>
              </dd>
            </div>
          ))}
        </dl>
        <p data-handoff-ready={handoff.ready ? "true" : "false"}>{handoff.ready ? m.journeyReady : m.journeyNotReady}</p>
        {handoff.gaps.length > 0 ? (
          <>
            <h3 id={id("gaps")}>{m.journeyGapsHeading}</h3>
            <ul aria-labelledby={id("gaps")}>
              {handoff.gaps.map((gap) => (
                <li key={gap} data-gap={gap}>
                  {m[`gap_${gap}` as MessageKey]}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section aria-labelledby={id("questions")} className="block">
        <h2 id={id("questions")}>{m.questionsHeading}</h2>
        <p>{interpolate(m.questionsIntro, { unknown: source.unknownItems.length, total: source.totalFields })}</p>
        <button type="button" onClick={save}>
          {m.questionsSave}
        </button>
        <p role="status" aria-live="polite">
          {saved ? interpolate(m.fileSaved, { name: saved }) : ""}
        </p>
      </section>
    </article>
  );
}
