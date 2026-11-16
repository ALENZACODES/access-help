/**
 * Files made from the ledger: a CSV a person can open in a spreadsheet and a JSON backup they
 * can restore later. Pure. Nothing is sent anywhere. Restoring never repairs data: an entry
 * that is not well formed is left out and counted.
 */
import type { Ledger } from './ledger.js';
import { entryFor, readLedger, statusOf } from './ledger.js';
import type { SummaryRecord } from './summary.js';
import type { SubLang } from './text.js';
import { pick } from './text.js';

export const MAX_BACKUP_BYTES = 400_000;

/** A cell that starts with = + @ tab or CR, or with - and then a non-digit, is read as a formula, so it gets a leading quote. */
export function csvCell(value: string): string {
  const safe = /^[=+@\t\r]/.test(value) || /^-(?!\d)/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function ledgerCsv(records: readonly SummaryRecord[], ledger: Ledger, lang: SubLang): string {
  const head = pick(
    lang,
    ['id', 'name', 'status', 'observed_on', 'marked_submitted_on', 'changeset', 'looked_again_on', 'note'],
    ['id', 'nom', 'statut', 'vu_le', 'marque_soumis_le', 'lot_de_modifications', 'revu_le', 'note'],
  );
  const status = {
    'not-marked': pick(lang, 'not marked', 'non marqué'),
    marked: pick(lang, 'marked as submitted by me', 'marqué soumis par moi'),
  } as const;
  const rows = [head.join(',')];
  for (const record of records) {
    const entry = entryFor(ledger, record.id);
    rows.push(
      [
        csvCell(record.id),
        csvCell(record.name ?? ''),
        csvCell(status[statusOf(entry)]),
        csvCell(record.observedOn),
        csvCell(entry?.markedOn ?? ''),
        csvCell(entry?.changeset ?? ''),
        csvCell(entry?.lookedAgainOn ?? ''),
        csvCell(entry?.note ?? ''),
      ].join(','),
    );
  }
  return `${rows.join('\r\n')}\r\n`;
}

export function ledgerJson(ledger: Ledger): string {
  return `${JSON.stringify({ version: 1, entries: ledger.entries }, null, 2)}\n`;
}

export type RestoreFailure = 'too-large' | 'not-json' | 'wrong-shape';

export type RestoreResult = { ok: true; ledger: Ledger; dropped: number } | { ok: false; code: RestoreFailure };

/** Reads a backup. Only a file with version 1 and an entries list is accepted. */
export function parseLedgerBackup(text: string): RestoreResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, code: 'too-large' };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, code: 'not-json' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ok: false, code: 'wrong-shape' };
  const record = value as { version?: unknown; entries?: unknown };
  if (record.version !== 1 || !Array.isArray(record.entries)) return { ok: false, code: 'wrong-shape' };
  const { ledger, dropped } = readLedger(value);
  return { ok: true, ledger, dropped };
}

/**
 * Brings restored entries into the current ledger. An entry for a place that is saved here
 * replaces the current one only when it is newer (a later marked day); entries for places not
 * saved here are left out and counted.
 */
export function mergeRestored(
  current: Ledger,
  restored: Ledger,
  savedIds: readonly string[],
): { ledger: Ledger; added: number; replaced: number; skipped: number } {
  const saved = new Set(savedIds);
  const byId = new Map(current.entries.map((e) => [e.recordId, e] as const));
  let added = 0;
  let replaced = 0;
  let skipped = 0;
  for (const entry of restored.entries) {
    if (!saved.has(entry.recordId)) {
      skipped += 1;
      continue;
    }
    const existing = byId.get(entry.recordId);
    if (existing === undefined) {
      byId.set(entry.recordId, entry);
      added += 1;
    } else if (entry.markedOn > existing.markedOn) {
      byId.set(entry.recordId, entry);
      replaced += 1;
    }
  }
  const entries = [...byId.values()].sort((a, b) => a.recordId.localeCompare(b.recordId));
  return { ledger: { version: 1, entries }, added, replaced, skipped };
}

export function ledgerFilename(kind: 'csv' | 'json', today: string): string {
  return kind === 'csv' ? `my-submissions-${today}.csv` : `my-submissions-backup-${today}.json`;
}
