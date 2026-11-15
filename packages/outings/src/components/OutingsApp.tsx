import { useEffect, useRef, useState } from "react";
import { PLACES, placeById } from "../fixtures";
import { ALL_LISTS } from "../lists";
import { factView } from "../render";
import { strings } from "../strings";
import { FACT_KEYS, type Lang, type OutingList, type Place } from "../types";

export interface OutingsAppProps {
  lang: Lang;
  lists?: OutingList[];
  places?: Place[];
  initialListId?: string | null;
  /** The shell can later point this at /places/:id. */
  placeHref?: (id: string) => string;
}

const defaultPlaceHref = (id: string) => `/places/${encodeURIComponent(id)}`;

const CSS = `
.outings{font-family:system-ui,sans-serif;color:#1a1a1a;background:#fff;padding:1rem;max-width:48rem;margin:0 auto;overflow-wrap:anywhere}
.outings *{box-sizing:border-box;min-width:0}
.outings ul{list-style:none;margin:0;padding:0}
.outings li{border:1px solid #595959;border-radius:6px;padding:.75rem;margin:0 0 .75rem}
.outings button{font:inherit;color:#0b4f9c;background:none;border:0;padding:.5rem 0;text-align:left;text-decoration:underline;cursor:pointer;min-height:44px}
.outings a{color:#0b4f9c}
.outings :focus-visible{outline:3px solid #1a1a1a;outline-offset:2px}
.outings dt{font-weight:600}
.outings dd{margin:0 0 .5rem}
.outings .meta{display:block;font-size:.875rem;color:#404040}
.outings h1:focus{outline:none}
`;

export function OutingsApp({
  lang,
  lists = ALL_LISTS,
  places = PLACES,
  initialListId = null,
  placeHref = defaultPlaceHref,
}: OutingsAppProps) {
  const t = strings[lang];
  const [listId, setListId] = useState<string | null>(initialListId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [listId]);

  const list = listId ? lists.find((l) => l.id === listId) : undefined;
  const byId = placeById(places);
  const title = (l: OutingList) => (lang === "fr" ? l.titleFr : l.titleEn);
  const summary = (l: OutingList) => (lang === "fr" ? l.summaryFr : l.summaryEn);

  if (!list) {
    return (
      <div className="outings" lang={lang}>
        <style>{CSS}</style>
        <h1 ref={headingRef} tabIndex={-1}>{t.appTitle}</h1>
        <p>{t.intro}</p>
        <h2>{t.listsHeading}</h2>
        <ul>
          {lists.map((l) => (
            <li key={l.id}>
              <button type="button" onClick={() => setListId(l.id)}>{title(l)}</button>
              <p>{summary(l)}</p>
              <p>{t.count(l.placeIds.length)}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const sourceName = (id: string) =>
    list.sources.find((s) => s.source_id === id)?.name ?? id;
  const listPlaces = list.placeIds.map((id) => byId.get(id)).filter((p): p is Place => !!p);

  return (
    <div className="outings" lang={lang}>
      <style>{CSS}</style>
      <button type="button" onClick={() => setListId(null)}>{t.back}</button>
      <h1 ref={headingRef} tabIndex={-1}>{title(list)}</h1>
      <p>{summary(list)}</p>
      <p>
        {t.licence}: {list.licence} \u2014 {t.fetched}: {list.retrieved_at}
      </p>
      {list.sources.length > 0 && (
        <p>
          {t.listSources}: {list.sources.map((s) => `${s.name} (${s.licence})`).join("; ")}
        </p>
      )}
      {listPlaces.some((p) => p.synthetic) && <p>{t.syntheticNote}</p>}
      <h2>{t.placesHeading}</h2>
      {listPlaces.length === 0 ? (
        <p>{t.noPlaces}</p>
      ) : (
        <ul>
          {listPlaces.map((p) => (
            <li key={p.id}>
              <h3><a href={placeHref(p.id)}>{p.name}</a></h3>
              <p>{p.municipality}</p>
              <dl>
                {FACT_KEYS.map((k) => {
                  const v = factView(p.facts[k], lang, sourceName);
                  return (
                    <div key={k}>
                      <dt>{t[k]}</dt>
                      <dd>
                        <strong>{v.text}</strong>
                        {v.meta && <span className="meta">{v.meta}</span>}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
