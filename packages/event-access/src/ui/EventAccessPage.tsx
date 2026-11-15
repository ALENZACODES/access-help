import { interpolate, messages } from "../i18n.js";
import { projectRecord, type ProjectedField } from "../project.js";
import type { EventAccessRecord, Lang } from "../types.js";

function FieldItem({ field, lang }: { field: ProjectedField; lang: Lang }) {
  const m = messages[lang];
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

/** Shows every field with its value, date, source, licence and tier. Unknown shows an empty state. */
export function EventAccessPage({ record, lang }: { record: EventAccessRecord; lang: Lang }) {
  const m = messages[lang];
  const p = projectRecord(record, lang);
  const id = (suffix: string) => `${p.eventId}-${suffix}`;
  return (
    <article lang={lang} className="page" aria-labelledby={id("title")}>
      <h1 id={id("title")}>{p.label}</h1>
      {p.demonstration ? <p className="notice">{m.demoBanner}</p> : null}
      <p className="lede">{interpolate(m.recordLine, { format: p.formatLabel })}</p>

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
                <FieldItem key={field.id} field={field} lang={lang} />
              ))}
            </dl>
          )}
        </section>
      ))}

      <section aria-labelledby={id("about")} className="block">
        <h2 id={id("about")}>{m.aboutHeading}</h2>
        <p>{m.noTickets}</p>
        <p>{m.noJourney}</p>
      </section>
    </article>
  );
}
