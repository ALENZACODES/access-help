import { strings } from "./strings";
import type { Fact, Lang } from "./types";

export interface FactView {
  text: string;
  known: boolean;
  meta: string;
}

/** Missing, UNKNOWN and tier-0 values all render as Unknown, never as No. */
export function factView(fact: Fact | undefined, lang: Lang, sourceName: (id: string) => string): FactView {
  const t = strings[lang];
  if (!fact) return { text: t.unknown, known: false, meta: "" };
  const meta = `${t.source}: ${sourceName(fact.source_id)} \u2014 ${t.licence}: ${fact.licence} \u2014 ${t.fetched}: ${fact.retrieved_at} \u2014 ${t.tier} ${fact.tier}`;
  if (fact.value === "UNKNOWN") return { text: t.unknown, known: false, meta };
  if (fact.tier === 0) return { text: t.unknown, known: false, meta: `${t.unverified}. ${meta}` };
  return { text: fact.value ? t.yes : t.no, known: true, meta };
}
