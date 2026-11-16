import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import connectionRequestSchema from "../../schemas/connection-request.schema.json" with { type: "json" };
import routingTableSchema from "../../schemas/routing-table.schema.json" with { type: "json" };
import type { ValidationReport } from "../validate.js";
import { verifyAudit } from "./moderation.js";
import type { ConnectionRequest } from "./request.js";
import { routingTableProblems } from "./routing.js";
import type { RoutingTable } from "./routing.js";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const requestValidator = ajv.compile(connectionRequestSchema);
const tableValidator = ajv.compile(routingTableSchema);

function schemaErrors(validator: { errors?: Array<{ instancePath?: string; message?: string }> | null }): string[] {
  return (validator.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`.trim());
}

/**
 * Shape first, then the rules a schema cannot say: the audit trail must be whole, a
 * routed request must carry a stream, and a withdrawn consent must sit on a closed request.
 */
export function validateConnectionRequest(value: unknown, file = "connection-request"): ValidationReport {
  if (!requestValidator(value)) {
    return { file, valid: false, errors: schemaErrors(requestValidator) };
  }
  const request = value as unknown as ConnectionRequest;
  const errors: string[] = [];
  if (!verifyAudit(request.moderation)) {
    errors.push("/moderation audit trail is not consistent with the recorded state and tier");
  }
  if (request.moderation.state === "routed" && request.route.kind !== "stream") {
    errors.push("/route a routed request must record a stream");
  }
  if (request.consent.revokedAt !== undefined && request.moderation.state !== "closed") {
    errors.push("/consent a request with withdrawn consent must be closed");
  }
  return { file, valid: errors.length === 0, errors };
}

export function validateRoutingTable(value: unknown, file = "routing-table"): ValidationReport {
  if (!tableValidator(value)) {
    return { file, valid: false, errors: schemaErrors(tableValidator) };
  }
  const errors = routingTableProblems(value as unknown as RoutingTable).map((problem) => `/ ${problem}`);
  return { file, valid: errors.length === 0, errors };
}
