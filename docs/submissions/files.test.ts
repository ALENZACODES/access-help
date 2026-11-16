import { describe, expect, it } from 'vitest';
import { MAX_BACKUP_BYTES, csvCell, ledgerCsv, ledgerFilename, ledgerJson, mergeRestored, parseLedgerBackup } from './files.js';
import type { Ledger, LedgerEntry } from './ledger.js';

const e = (recordId: string, markedOn: string, over: Partial<LedgerEntry> = {}): LedgerEntry => ({ recordId, markedOn, changeset: null, note: '', lookedAgainOn: null, ...over });
const records = [
  { id: 'a', name: 'Corner café', observedOn: '2026-03-01' },
  { id: 'b', name: null, observedOn: '2026-04-01' },
  { id: 'c', name: '=HYPERLINK("x")', observedOn: '2026-05-01' },
];
const ledger: Ledger = { version: 1, entries: [e('a', '2026-04-02', { changeset: '77', note: 'door, left side' }), e('c', '2026-05-02', { note: '+1 note' })] };

describe('csvCell', () => {
  it('neutralises text a spreadsheet would run as a formula', () => {
    for (const text of ['=1+1', '+1', '@x', '\tx', '\rx', '-x']) expect(csvCell(text).replace(/^"/, '').startsWith("'")).toBe(true);
  });
  it('leaves negative numbers, dates and plain text alone', () => {
    expect(csvCell('-79.4')).toBe('-79.4');
    expect(csvCell('2026-11-01')).toBe('2026-11-01');
    expect(csvCell('plain')).toBe('plain');
  });
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });
});

describe('ledgerCsv', () => {
  const rows = ledgerCsv(records, ledger, 'en').trimEnd().split('\r\n');
  it('has a header and one row per saved place', () => {
    expect(rows[0]).toBe('id,name,status,observed_on,marked_submitted_on,changeset,looked_again_on,note');
    expect(rows).toHaveLength(4);
  });
  it('words the status and leaves unmarked fields empty', () => {
    expect(rows[1]).toBe('a,Corner café,marked as submitted by me,2026-03-01,2026-04-02,77,,"door, left side"');
    expect(rows[2]).toBe('b,,not marked,2026-04-01,,,,');
  });
  it('neutralises a name or note that looks like a formula', () => {
    expect(rows[3]).toContain(`"'=HYPERLINK(""x"")"`);
    expect(rows[3]).toContain(`'+1 note`);
  });
  it('is written in French with French headers', () => {
    const fr = ledgerCsv(records, ledger, 'fr');
    expect(fr.startsWith('id,nom,statut,vu_le,')).toBe(true);
    expect(fr).toContain('marqué soumis par moi');
  });
  it('ends with one line break and handles no records', () => {
    expect(ledgerCsv(records, ledger, 'en').endsWith('\r\n')).toBe(true);
    expect(ledgerCsv([], ledger, 'en')).toBe('id,name,status,observed_on,marked_submitted_on,changeset,looked_again_on,note\r\n');
  });
});

describe('backup round trip', () => {
  it('writes version 1 with the entries', () => {
    expect(JSON.parse(ledgerJson(ledger))).toEqual({ version: 1, entries: ledger.entries });
    expect(ledgerJson(ledger).endsWith('\n')).toBe(true);
  });
  it('restores what it wrote', () => {
    const r = parseLedgerBackup(ledgerJson(ledger));
    expect(r).toEqual({ ok: true, ledger, dropped: 0 });
  });
  it('rejects text that is too large, not JSON, or the wrong shape', () => {
    expect(parseLedgerBackup('x'.repeat(MAX_BACKUP_BYTES + 1))).toEqual({ ok: false, code: 'too-large' });
    expect(parseLedgerBackup('{')).toEqual({ ok: false, code: 'not-json' });
    for (const text of ['[]', 'null', '3', '{"version":2,"entries":[]}', '{"version":1}', '{"entries":[]}', '{"version":1,"entries":{}}']) {
      expect(parseLedgerBackup(text), text).toEqual({ ok: false, code: 'wrong-shape' });
    }
  });
  it('drops entries that are not well formed and says how many', () => {
    const text = JSON.stringify({ version: 1, entries: [e('a', '2026-04-02'), { recordId: 'z' }, e('a', '2026-05-01')] });
    const r = parseLedgerBackup(text);
    expect(r.ok && r.dropped).toBe(2);
    expect(r.ok && r.ledger.entries).toHaveLength(1);
  });
});

describe('mergeRestored', () => {
  const current: Ledger = { version: 1, entries: [e('a', '2026-04-02'), e('b', '2026-06-01')] };
  const restored: Ledger = { version: 1, entries: [e('a', '2026-05-01'), e('b', '2026-01-01'), e('c', '2026-02-02'), e('gone', '2026-02-02')] };
  const merged = mergeRestored(current, restored, ['a', 'b', 'c']);
  it('adds entries for saved places and updates only to a later day', () => {
    expect(merged.ledger.entries.map((x) => `${x.recordId}:${x.markedOn}`)).toEqual(['a:2026-05-01', 'b:2026-06-01', 'c:2026-02-02']);
  });
  it('counts what it did', () => {
    expect({ added: merged.added, replaced: merged.replaced, skipped: merged.skipped }).toEqual({ added: 1, replaced: 1, skipped: 1 });
  });
  it('does not change either ledger it was given', () => {
    expect(current.entries).toHaveLength(2);
    expect(restored.entries).toHaveLength(4);
  });
  it('merging the same backup again changes nothing', () => {
    const again = mergeRestored(merged.ledger, restored, ['a', 'b', 'c']);
    expect(again.ledger).toEqual(merged.ledger);
    expect(again.added + again.replaced).toBe(0);
  });
});

describe('ledgerFilename', () => {
  it('names the files by day', () => {
    expect(ledgerFilename('csv', '2026-11-16')).toBe('my-submissions-2026-11-16.csv');
    expect(ledgerFilename('json', '2026-11-16')).toBe('my-submissions-backup-2026-11-16.json');
  });
});
