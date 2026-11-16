import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import partnerRouteSchema from "../schemas/partner-route.schema.json" with { type: "json" };
import peerRequestSchema from "../schemas/peer-request.schema.json" with { type: "json" };

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const requestValidator = ajv.compile(peerRequestSchema);
const routeValidator = ajv.compile(partnerRouteSchema);

export interface ValidationReport {
  file: string;
  valid: boolean;
  errors: string[];
}

function report(
  validator: { errors?: Array<{ instancePath?: string; message?: string }> | null },
  valid: boolean,
  file: string,
): ValidationReport {
  const errors = valid
    ? []
    : (validator.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`.trim());
  return { file, valid, errors };
}

export function validatePeerRequest(value: unknown, file = "peer-request"): ValidationReport {
  return report(requestValidator, requestValidator(value) as boolean, file);
}

export function validatePartnerRoute(value: unknown, file = "partner-route"): ValidationReport {
  return report(routeValidator, routeValidator(value) as boolean, file);
}
