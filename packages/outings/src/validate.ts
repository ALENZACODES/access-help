import Ajv2020 from "ajv/dist/2020.js";
import { listSchema } from "./schema";
import { OPEN_LICENCES, type OutingList, type Place } from "./types";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateShape = ajv.compile(listSchema);

/** Returns a list of problems; empty means the lists are consistent with the place set. */
export function validateLists(lists: readonly OutingList[], places: readonly Place[]): string[] {
  const errors: string[] = [];
  const byId = new Map(places.map((p) => [p.id, p]));
  const seen = new Set<string>();
  for (const list of lists) {
    const at = `list ${list.id}`;
    if (!validateShape(list)) {
      errors.push(`${at}: ${ajv.errorsText(validateShape.errors)}`);
      continue;
    }
    if (seen.has(list.id)) errors.push(`${at}: duplicate list id`);
    seen.add(list.id);
    const sourceIds = new Set(list.sources.map((s) => s.source_id));
    for (const id of list.placeIds) {
      const p = byId.get(id);
      if (!p) {
        errors.push(`${at}: place id ${id} is not in the place set`);
        continue;
      }
      if (list.factKey) {
        const fact = p.facts[list.factKey];
        if (!fact || fact.value !== true || fact.tier < 1) {
          errors.push(`${at}: ${id} does not have ${list.factKey} recorded as a known yes (tier >= 1)`);
        }
      }
      for (const fact of Object.values(p.facts)) {
        if (!sourceIds.has(fact.source_id)) errors.push(`${at}: ${id} uses source ${fact.source_id} not named on the list`);
      }
    }
  }
  return errors;
}

/** Fixture checks: open licences, provenance present, and no self-assigned tier 2 or 3. */
export function validatePlaces(places: readonly Place[]): string[] {
  const errors: string[] = [];
  for (const p of places) {
    if (!p.id.startsWith("synth-")) errors.push(`${p.id}: fixture id must start with synth-`);
    if (!p.provenance.source_id || !p.provenance.retrieved_at) errors.push(`${p.id}: missing provenance`);
    for (const [k, fact] of Object.entries(p.facts)) {
      if (!OPEN_LICENCES.includes(fact.licence)) errors.push(`${p.id}.${k}: licence not open`);
      if (fact.tier > 1) errors.push(`${p.id}.${k}: this lane must not assign tier 2 or 3`);
      if (!fact.source_id || !fact.retrieved_at) errors.push(`${p.id}.${k}: missing source or date`);
    }
  }
  return errors;
}
