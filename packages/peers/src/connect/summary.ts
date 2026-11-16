import { fill } from "../strings.js";
import type { Language } from "../vocab.js";
import type { ConnectionRequest } from "./request.js";
import { sharedView } from "./request.js";
import { findStream } from "./routing.js";
import type { RoutingTable } from "./routing.js";
import { CONNECT_CATALOG } from "./strings.js";

export type SummaryResult =
  | { kind: "ready"; text: string; lines: string[] }
  | { kind: "unavailable"; reason: "consent_not_active" | "request_closed" };

/**
 * The wording for the programme stream of a request. A stream is named only when the
 * request is in the routed state and the stream is still in the table. Otherwise the
 * answer is Unknown with the recorded reason, or a note that review is pending.
 */
export function describeStream(request: ConnectionRequest, table: RoutingTable, language: Language): string {
  const t = CONNECT_CATALOG[language];
  const { route } = request;
  if (route.kind === "unknown") {
    return `${t.streamUnknown}. ${t.unknownReasons[route.reason]}`;
  }
  if (request.moderation.state === "needs_review") {
    return t.streamPendingReview;
  }
  const stream = table.id === request.routingTableId ? findStream(table, route.streamId) : undefined;
  if (!stream) {
    return `${t.streamUnknown}. ${t.unknownReasons.no_streams_recorded}`;
  }
  return stream.sample ? `${stream.label[language]} (${t.streamSample})` : stream.label[language];
}

/**
 * Build the plain-text summary the person can share themselves.
 * It is built only while consent is active and the request is open, and it holds only
 * the items the person agreed to. It never says that anything was sent, that a peer
 * will reply, or when.
 */
export function buildSummary(request: ConnectionRequest, table: RoutingTable, language: Language): SummaryResult {
  if (request.moderation.state === "closed") {
    return { kind: "unavailable", reason: "request_closed" };
  }
  const view = sharedView(request);
  if (!view) {
    return { kind: "unavailable", reason: "consent_not_active" };
  }
  const t = CONNECT_CATALOG[language];
  const s = t.summary;
  const lines: string[] = [
    s.title,
    fill(s.prepared, { date: request.recordDate }),
    s.notSent,
    "",
    fill(s.forWhom, { value: t.forWhom[request.forWhom] }),
    fill(s.contexts, { value: view.contexts.map((context) => t.contexts[context]).join(s.listSeparator) }),
    fill(s.region, { value: view.region ? t.regions[view.region] : s.notShared }),
    fill(s.language, { value: view.language ? t.languages[view.language] : s.notShared }),
  ];
  if (view.note) {
    lines.push(fill(s.note, { value: view.note }));
  }
  lines.push(
    fill(s.stream, { value: describeStream(request, table, language) }),
    fill(s.state, { value: t.states[request.moderation.state] }),
    s.age,
  );
  if (request.forWhom === "someone_i_support") {
    lines.push(s.onBehalf);
  }
  lines.push("", s.notReferral, s.noHealth, fill(s.reference, { value: request.id }));
  return { kind: "ready", text: lines.join("\n"), lines };
}
