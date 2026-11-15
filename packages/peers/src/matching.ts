import type { MatchResult, PeerCandidate, PeerRequest } from "./types.js";

/**
 * Deterministic, local matching. Rules, in order:
 * 1. The candidate must have the same topic and the same language.
 * 2. If the request names a city, candidates in that city come first.
 * 3. Ties break on candidate id, so the pool order never changes the result.
 * Nothing here looks at health, injury level or needs, and nothing pretends to.
 */
export function matchRequest(
  request: PeerRequest,
  pool: readonly PeerCandidate[],
  now: string,
): MatchResult {
  const eligible = pool.filter(
    (candidate) => candidate.topic === request.topic && candidate.language === request.language,
  );
  const sameCity = (candidate: PeerCandidate): boolean =>
    request.city !== undefined && candidate.city === request.city;
  const ranked = [...eligible].sort((a, b) => {
    const cityOrder = Number(sameCity(b)) - Number(sameCity(a));
    return cityOrder !== 0 ? cityOrder : a.id.localeCompare(b.id);
  });
  const best = ranked[0];
  if (!best) {
    return { kind: "no_match" };
  }
  const cityMatched = sameCity(best);
  const date = now.slice(0, 10);
  return {
    kind: "match",
    offer: {
      id: `offer-${request.id}-${best.id}`,
      requestId: request.id,
      candidateId: best.id,
      candidateOrdinal: best.ordinal,
      topic: request.topic,
      language: request.language,
      ...(cityMatched && request.city ? { city: request.city } : {}),
      matchedOn: cityMatched ? "topic_language_city" : "topic_language",
      demonstrationIntroduction: true,
      deliveredToCandidate: false,
      assessesMedicalSuitability: false,
      createdAt: now,
      demonstration: true,
      tier: 0,
      prototypeLabel: "PROTOTYPE-UNVERIFIED",
      source: "computed on this device from the request and a demonstration profile",
      licence: "not a third-party dataset",
      sourceDate: date,
      recordDate: date,
    },
  };
}
