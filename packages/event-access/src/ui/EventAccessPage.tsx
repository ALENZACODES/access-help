import { interpolate, messages } from "../i18n.js";
import { projectRecord, type ProjectedField } from "../project.js";
import { eventTiming, statementTiming } from "../timing.js";
import type { EventAccessRecord, Lang } from "../types.js";

/** A plain count of days between a statement and the event day. Null when there is no event date. */
function statedLine(date: string, occurrenceDate: string | null, lang: Lang): string | null {
  const m = messages[lang];
  const timing = statementTiming(date, occurrenceDate);
  switch (timing.relation) {
    case "no_event_date":
      return null;
    case "on_event_day":
      return m.stated_on;
    case "before_event":
      return timing.days === 1 ? m.stated_before_one : interpolate(m.stated_before, { days: timing.days ?? 0 });
    case "after_event":
      return timing.days === 1 ? m.stated_after_one : interpolate(m.stated_after, { days: timing.days ?? 0 });
  }
}

function FieldItem({ field, lang, occurrenceDate }: { field: ProjectedField; lang: Lang; occurrenceDate: string | null }) {
  const m = messages[lang];
  const stated = field.unknown ? null : statedLine(field.date, occurrenceDate, lang);
  return (
    <div className="field" data-field={field.id} data-unknown={field.unknown ? "true" : "false"}>
      <dt>{field.label}</dt>
      <dd>
        {field.unknown ? (
          <p className="value empty">{m.empty_unknown}</p>
        ) : (
          <p className="value">{field.display}</p>
        )}
        <ul className="meta">
          <li>
            <span className="k">{m.metaDate}</span> <time dateTime={field.date}>{field.date}</time>
          </li>
          {stated ? <li data-stated="true">{stated}</li> : null}
          <li>
            <span className="k">{m.metaSource}</span> {field.source}
          </li>
          <li>
            <span className="k">{m.metaLicence}</span> {field.licence}
          </li>
          <li>
            <span className="k">{m.metaTier}</span> {field.tierLabel}
          </li>
          <li>
            <span className="k">{m.metaLabel}</span> {field.prototypeLabelText}
          </li>
        </ul>
      </dd>
    </div>
  );
}

export interface EventAccessPageProps {
  record: EventAccessRecord;
  lang: Lang;
  /** Today on this device, YYYY-MM-DD. When given, the page says whether the event date has passed. */
  today?: string;
  /** Set when the record was opened from an organiser's file rather than bundled as demonstration data. */
  origin?: "organiser_file";
}

/** Shows every field with its value, date, source, licence and tier. Unknown shows an empty state. */
export function EventAccessPage({ record, lang, today, origin }: EventAccessPageProps) {
  const m = messages[lang];
  const p = projectRecord(record, lang);
  const timing = today ? eventTiming(record, today) : null;
  const id = (suffix: string) => `${p.eventId}-${suffix}`;
  return (
    <article lang={lang} className="page" aria-labelledby={id("title")}>
      <h1 id={id("title")}>{p.label}</h1>
      {p.demonstration ? <p className="notice">{m.demoBanner}</p> : null}
      {origin === "organiser_file" ? (
        <p className="notice" data-origin="organiser_file">
          {m.originOrganiserFile}
        </p>
      ) : null}
      {timing === "past" ? (
        <p className="notice past" data-timing-notice="past">
          {m.timing_past}
        </p>
      ) : null}
      <p className="lede">{interpolate(m.recordLine, { format: p.formatLabel })}</p>
      {record.place ? (
        <p data-place="true">
          <span className="k">{m.placeLine}</span> {record.place.label[lang]}
        </p>
      ) : null}
      {record.place?.address ? (
        <p>
          <span className="k">{m.addressLine}</span> {record.place.address}
        </p>
      ) : null}
      {record.arrivalWindow ? (
        <p>
          <span className="k">{m.arrivalWindowLine}</span> {interpolate(m.arrivalWindowValue, { earliest: record.arrivalWindow.earliest, latest: record.arrivalWindow.latest })}
        </p>
      ) : null}

      <section aria-labelledby={id("confirmation")} className="block">
        <h2 id={id("confirmation")}>{m.confirmationHeading}</h2>
        <p className="value" data-confirmation={p.confirmation}>
          {p.confirmationLabel}
        </p>
        {p.occurrenceDate ? (
          <p>
            <span className="k">{m.occurrenceDate}</span>{" "}
            <time dateTime={p.occurrenceDate}>{p.occurrenceDate}</time>
          </p>
        ) : null}
        {timing && timing !== "past" ? <p data-timing={timing}>{m[`timing_${timing}`]}</p> : null}
        <p>{p.summary}</p>
        <p>{m.unknownMeaning}</p>
      </section>

      {p.sections.map((section) => (
        <section key={section.id} aria-labelledby={id(section.id)} className="block" data-section={section.id}>
          <h2 id={id(section.id)}>{section.heading}</h2>
          {section.notApplicable ? (
            <p className="value empty">{m.captionsNotApplicable}</p>
          ) : (
            <dl className="fields">
              {section.fields.map((field) => (
                <FieldItem key={field.id} field={field} lang={lang} occurrenceDate={p.occurrenceDate} />
              ))}
            </dl>
          )}
        </section>
      ))}

      <section aria-labelledby={id("about")} className="block">
        <h2 id={id("about")}>{m.aboutHeading}</h2>
        <p>{m.tierMeaning}</p>
        <p>{m.noTickets}</p>
        <p>{m.noJourney}</p>
      </section>
    </article>
  );
}
