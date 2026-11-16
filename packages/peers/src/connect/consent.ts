/**
 * Itemised consent for preparing a request summary on this device.
 * Each item is a separate choice. Nothing is prepared for sharing unless the two
 * required items are granted, and an optional item that is not granted is left out of
 * everything prepared for sharing. Consent can be withdrawn at any time.
 */
export const CONSENT_ITEMS = [
  "prepare_summary",
  "include_contexts",
  "include_region",
  "include_language",
  "include_note",
] as const;
export type ConsentItem = (typeof CONSENT_ITEMS)[number];

export const REQUIRED_CONSENT_ITEMS: readonly ConsentItem[] = ["prepare_summary", "include_contexts"];

export type ConsentChoices = Record<ConsentItem, boolean>;

export interface ConsentRecord {
  items: ConsentChoices;
  grantedAt: string;
  /** Set once consent is withdrawn. A withdrawn consent is never re-opened. */
  revokedAt?: string;
}

/** Nothing is ticked for the person in advance. */
export const NO_CONSENT: ConsentChoices = {
  prepare_summary: false,
  include_contexts: false,
  include_region: false,
  include_language: false,
  include_note: false,
};

export function normaliseChoices(input: Partial<Record<ConsentItem, unknown>> | undefined): ConsentChoices {
  const out: ConsentChoices = { ...NO_CONSENT };
  for (const item of CONSENT_ITEMS) {
    out[item] = input?.[item] === true;
  }
  return out;
}

export function missingRequiredConsent(choices: ConsentChoices): ConsentItem[] {
  return REQUIRED_CONSENT_ITEMS.filter((item) => !choices[item]);
}

export function grantConsent(choices: ConsentChoices, at: string): ConsentRecord | null {
  if (missingRequiredConsent(choices).length > 0) {
    return null;
  }
  return { items: { ...choices }, grantedAt: at };
}

export function isConsentActive(consent: ConsentRecord): boolean {
  return consent.revokedAt === undefined && missingRequiredConsent(consent.items).length === 0;
}

/** True only while consent is active and that one item was granted. */
export function allows(consent: ConsentRecord, item: ConsentItem): boolean {
  return isConsentActive(consent) && consent.items[item] === true;
}

export function withdrawConsent(consent: ConsentRecord, at: string): ConsentRecord {
  return consent.revokedAt === undefined ? { ...consent, revokedAt: at } : consent;
}
