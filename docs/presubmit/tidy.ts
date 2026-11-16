/**
 * Safe tidying of the text a person typed: spacing, hidden control characters and accent
 * composition. It never changes the meaning of a name, never changes a status, and never
 * changes where a place is. The person chooses to apply it.
 */
import type { CheckRecord } from './rules.js';

export type TidyField = 'name' | 'source';

export interface TidyChange {
  field: TidyField;
  before: string;
  after: string;
}

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f​-‍⁠﻿]/g;

export function tidyText(value: string): string {
  return value.replace(CONTROL, ' ').normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** The changes tidyRecord would make, without making them. */
export function tidyChanges(record: CheckRecord): TidyChange[] {
  const out: TidyChange[] = [];
  if (record.name !== null) {
    const after = tidyText(record.name);
    if (after !== record.name && after !== '') out.push({ field: 'name', before: record.name, after });
  }
  const source = tidyText(record.source);
  if (source !== record.source) out.push({ field: 'source', before: record.source, after: source });
  return out;
}

/** A copy of the record with the changes applied. The input is not changed. */
export function tidyRecord<T extends CheckRecord>(record: T): T {
  let next = record;
  for (const change of tidyChanges(record)) next = { ...next, [change.field]: change.after };
  return next;
}

export function needsTidy(record: CheckRecord): boolean {
  return tidyChanges(record).length > 0;
}
