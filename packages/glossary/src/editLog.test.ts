import { describe, expect, it } from 'vitest';
import {
  EDITLOG_EXPORT_ID,
  EDITLOG_UI,
  EDIT_KINDS,
  EDIT_LOG_KEY,
  MAX_EDIT_LOG,
  auditHtml,
  editLogFilename,
  editLogToText,
  entryLine,
  entryWhat,
  frenchIssues,
  isEditKind,
  lintClaims,
  lintCopy,
  logEdit,
  makeEntry,
  parseEditLog,
  plainLanguageIssues,
  readabilityIssues,
  renderEditLog,
  serialiseEditLog,
  type EditEntry,
  type Lang,
} from './index';

const day = '2026-11-19';
const e = (kind: string, parts: Parameters<typeof makeEntry>[2] = {}, date = day): EditEntry => makeEntry(date, kind, parts) as EditEntry;
const log: EditEntry[] = [
  e('load', { count: 3 }, '2026-11-17'),
  e('add', { place: 'Library', detail: 'ramp' }, '2026-11-18'),
  e('remove-record', { place: 'Library', detail: 'elevator' }),
  e('remove-place', { place: 'Pool' }),
  e('add-table', { count: 1 }),
  e('rename', { place: 'Hall', detail: 'Town Hall' }),
  e('join', { place: 'Library', count: 2 }),
  e('rename-source', { place: 'City opn data', detail: 'City open data' }),
  e('change-record', { place: 'Library', detail: 'ramp' }),
  e('restore', { detail: 'Before spring' }),
  e('undo'),
];

describe('entries', () => {
  it('knows its kinds', () => {
    for (const k of EDIT_KINDS) expect(isEditKind(k)).toBe(true);
    for (const bad of ['', 'delete', 'ADD', 3, null, 'constructor']) expect(isEditKind(bad), String(bad)).toBe(false);
  });
  it('makes a clean entry', () => {
    expect(makeEntry(day, 'add', { place: '  Town   Hall ', detail: 'ramp' })).toEqual({ date: day, kind: 'add', place: 'Town Hall', detail: 'ramp', count: 0 });
    expect(makeEntry(day, 'undo')).toEqual({ date: day, kind: 'undo', place: '', detail: '', count: 0 });
  });
  it('is null for a date that is not real or a kind it does not know', () => {
    expect(makeEntry('2026-02-30', 'add')).toBeNull();
    expect(makeEntry('today', 'add')).toBeNull();
    expect(makeEntry(day, 'explode')).toBeNull();
  });
  it('cuts long text and keeps counts sensible', () => {
    expect(Array.from(makeEntry(day, 'add', { place: 'x'.repeat(500) })?.place ?? '')).toHaveLength(120);
    expect(makeEntry(day, 'load', { count: -4 })?.count).toBe(0);
    expect(makeEntry(day, 'load', { count: 2.5 })?.count).toBe(0);
    expect(makeEntry(day, 'load', { count: 1e12 })?.count).toBe(1_000_000);
  });
});

describe('logEdit', () => {
  it('adds an entry at the end and does not change the log it was given', () => {
    const before = [...log];
    const next = logEdit(log, e('undo'));
    expect(next).toHaveLength(log.length + 1);
    expect(log).toEqual(before);
  });
  it('ignores a null entry', () => {
    expect(logEdit(log, null)).toBe(log);
  });
  it('drops the oldest entries past the limit', () => {
    let l: readonly EditEntry[] = [];
    for (let i = 0; i < MAX_EDIT_LOG + 5; i += 1) l = logEdit(l, e('load', { count: i + 1 }));
    expect(l).toHaveLength(MAX_EDIT_LOG);
    expect(l[0]?.count).toBe(6);
    expect(l.at(-1)?.count).toBe(MAX_EDIT_LOG + 5);
  });
});

describe('storage', () => {
  it('round-trips', () => {
    expect(parseEditLog(serialiseEditLog(log))).toEqual(log);
  });
  it('is null for text that is not a list', () => {
    for (const bad of ['', 'x', '{}', 'null', '5']) expect(parseEditLog(bad), bad).toBeNull();
  });
  it('drops entries that are not well formed and cleans the rest', () => {
    const json = JSON.stringify([
      { date: day, kind: 'add', place: ' A ', detail: 'ramp', count: 'x' },
      { date: 'nope', kind: 'add' },
      { date: day, kind: 'explode' },
      { kind: 'add' },
      null,
      7,
      { date: day, kind: 'load', place: 4, count: 2 },
    ]);
    expect(parseEditLog(json)).toEqual([
      { date: day, kind: 'add', place: 'A', detail: 'ramp', count: 0 },
      { date: day, kind: 'load', place: '', detail: '', count: 2 },
    ]);
  });
  it('keeps at most the limit', () => {
    const many = Array.from({ length: MAX_EDIT_LOG + 20 }, () => ({ date: day, kind: 'undo' }));
    expect(parseEditLog(JSON.stringify(many))).toHaveLength(MAX_EDIT_LOG);
  });
  it('has a stable key', () => {
    expect(EDIT_LOG_KEY).toBe('glossary-edit-log');
  });
});

describe('texts', () => {
  it('says what each kind of change was', () => {
    expect(log.map((x) => entryWhat(x, 'en'))).toEqual([
      'Loaded a table with 3 places.',
      'Added a record for Library: Ramp.',
      'Removed a record from Library: Elevator.',
      'Removed Pool and its records.',
      'Added 1 record from a table.',
      'Renamed Hall to Town Hall.',
      'Joined the entries for Library. Records moved: 2.',
      'Renamed the source City opn data to City open data.',
      'Changed a record for Library: Ramp.',
      'Went back to the copy of the records: Before spring.',
      'Undid the last change to the records.',
    ]);
  });
  it('names features in French and spaces its colons', () => {
    expect(entryWhat(log[1] as EditEntry, 'fr')).toBe('Fiche ajoutée pour Library\u00a0: Rampe.');
    expect(entryLine(log[10] as EditEntry, 'fr')).toBe('2026-11-19\u00a0: Le dernier changement aux fiches a été annulé.');
  });
  it('puts the date first', () => {
    expect(entryLine(log[0] as EditEntry, 'en')).toBe('2026-11-17: Loaded a table with 3 places.');
  });
  it('has a different sentence for each kind in both languages', () => {
    for (const lang of ['en', 'fr'] as Lang[]) expect(new Set(log.map((x) => entryWhat(x, lang))).size).toBe(EDIT_KINDS.length);
  });
  it('writes the whole list as text, newest first', () => {
    const text = editLogToText(log, 'en');
    expect(text.startsWith('Changes made on this device\n\n- 2026-11-19: Undid the last change to the records.\n')).toBe(true);
    expect(text.trimEnd().endsWith('- 2026-11-17: Loaded a table with 3 places.')).toBe(true);
    expect(text.match(/^- /gm)).toHaveLength(log.length);
  });
  it('says so in the file when there are no changes', () => {
    expect(editLogToText([], 'en')).toBe(`Changes made on this device\n\n${EDITLOG_UI.en.none}\n`);
  });
  it('names the file by language', () => {
    expect(editLogFilename('en')).toBe('changes-on-this-device-en.txt');
    expect(editLogFilename('fr')).toBe('changes-on-this-device-fr.txt');
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const html of [renderEditLog(log, lang, true), renderEditLog(log, lang, false, 3), renderEditLog([], lang, true)]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'log')).toEqual([]);
    }
  });
  it('lists the newest change first, with a count', () => {
    const html = renderEditLog(log, 'en', false);
    expect(html).toContain('<p role="status">11 changes</p>');
    expect(html).toContain('<ol class="gl-editlog" reversed><li>2026-11-19: Undid the last change to the records.</li>');
    expect(html.match(/<li>/g)).toHaveLength(11);
  });
  it('shows only the newest ones past the limit', () => {
    const html = renderEditLog(log, 'en', false, 2);
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html).toContain('11 changes');
  });
  it('has the save button only with a host that takes files and at least one change', () => {
    expect(renderEditLog(log, 'en', true)).toContain(`id="${EDITLOG_EXPORT_ID}"`);
    expect(renderEditLog(log, 'en', false)).not.toContain(EDITLOG_EXPORT_ID);
    expect(renderEditLog([], 'en', true)).not.toContain(EDITLOG_EXPORT_ID);
  });
  it('says so with no changes', () => {
    expect(renderEditLog([], 'en', false)).toContain(EDITLOG_UI.en.none);
  });
  it('escapes names', () => {
    expect(renderEditLog([e('remove-place', { place: '<b>x</b>' })], 'en', false)).not.toContain('<b>x');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = EDITLOG_UI[lang];
    const texts = [ui.heading, ui.intro, ui.none, ui.count(1), ui.count(4), ui.exportLog, ui.title, ...log.map((x) => entryWhat(x, lang)), ui.kinds.load(1), ui.kinds['add-table'](3)];
    for (const text of texts) {
      expect(lintCopy(text), text).toEqual([]);
      expect(lintClaims(text), text).toEqual([]);
      expect(plainLanguageIssues(text), text).toEqual([]);
      expect(readabilityIssues(text, lang), text).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
    }
  });
});
