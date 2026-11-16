export type Severity = 'error' | 'warning';

export interface Finding {
  readonly rule: string;
  readonly severity: Severity;
  /** Where it was found: a selector, an element, a term id, a string name. */
  readonly where: string;
  readonly detail: string;
}

export function finding(rule: string, where: string, detail: string, severity: Severity = 'error'): Finding {
  return { rule, severity, where, detail };
}
