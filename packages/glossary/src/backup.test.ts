import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT,
  BACKUP_IDS,
  BACKUP_UI,
  BACKUP_VERSION,
  MAX_BACKUP_CHARS,
  auditHtml,
  backupFilename,
  backupToStorage,
  countData,
  countsText,
  createBackup,
  frenchIssues,
  lintClaims,
  lintCopy,
  parseBackup,
  parseLists,
  parseNotes,
  parsePlan,
  parseRecent,
  parseSaved,
  parseVisits,
  plainLanguageIssues,
  readabilityIssues,
  renderDataPanel,
  restoredText,
  serialiseBackup,
  totalCount,
  type BackupData,
  type BackupError,
  type Lang,
} from './index';

const data: BackupData = {
  saved: ['lib', 'cafe'],
  notes: { lib: 'Ask about the side door.' },
  plan: { lib: ['ramp'] },
  visits: { cafe: '2026-11-10' },
  recent: ['café', 'library'],
  lists: [{ name: 'Saturday', ids: ['lib'] }],
  view: { sort: 'name', recentOnly: true, savedOnly: false },
  state: { features: ['ramp'], query: 'lib', hideNotAvailable: true },
};
const backup = createBackup(data, '2026-11-15');

describe('createBackup / serialiseBackup / parseBackup', () => {
  it('marks the file with its format, version and date', () => {
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.date).toBe('2026-11-15');
  });
  it('round-trips every part', () => {
    const result = parseBackup(serialiseBackup(backup));
    expect(result).toEqual({ ok: true, backup });
  });
  it('is readable text', () => {
    expect(serialiseBackup(backup)).toContain('\n  "saved"');
  });
  it('fits well inside the size limit', () => {
    expect(serialiseBackup(backup).length).toBeLessThan(MAX_BACKUP_CHARS / 100);
  });
});

describe('parseBackup: refusing a bad file', () => {
  const error = (text: string): BackupError | null => {
    const r = parseBackup(text);
    return r.ok ? null : r.error;
  };
  it('says when nothing was pasted', () => {
    expect(error('')).toBe('empty');
    expect(error('   \n')).toBe('empty');
  });
  it('says when the text is not JSON', () => {
    expect(error('hello')).toBe('not-json');
    expect(error('{"a":')).toBe('not-json');
  });
  it('says when it is JSON but not our file', () => {
    for (const text of ['[]', '5', 'null', '"x"', '{}', '{"format":"other","version":1}']) expect(error(text), text).toBe('wrong-format');
  });
  it('says when the version is different', () => {
    expect(error(`{"format":"${BACKUP_FORMAT}","version":2}`)).toBe('wrong-version');
    expect(error(`{"format":"${BACKUP_FORMAT}"}`)).toBe('wrong-version');
    expect(error(`{"format":"${BACKUP_FORMAT}","version":"1"}`)).toBe('wrong-version');
  });
  it('refuses a file over the size limit before reading it', () => {
    expect(error(' '.repeat(MAX_BACKUP_CHARS) + '{}')).toBe('too-large');
  });
});

describe('parseBackup: checking every part', () => {
  const file = (extra: Record<string, unknown>): string => JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, ...extra });
  const read = (extra: Record<string, unknown>) => {
    const r = parseBackup(file(extra));
    if (!r.ok) throw new Error(r.error);
    return r.backup;
  };
  it('fills missing parts with empty ones', () => {
    const b = read({});
    expect(b.saved).toEqual([]);
    expect(b.notes).toEqual({});
    expect(b.plan).toEqual({});
    expect(b.visits).toEqual({});
    expect(b.recent).toEqual([]);
    expect(b.lists).toEqual([]);
    expect(b.state).toEqual({ features: [], query: '', hideNotAvailable: false });
    expect(b.view).toEqual({ sort: 'best', recentOnly: false, savedOnly: false });
    expect(b.date).toBe('');
  });
  it('replaces a damaged part with an empty one, and keeps the good parts', () => {
    const b = read({ saved: 'nope', notes: [1], plan: 5, visits: { a: 'not a date' }, recent: ['café'] });
    expect(b.saved).toEqual([]);
    expect(b.notes).toEqual({});
    expect(b.plan).toEqual({});
    expect(b.visits).toEqual({});
    expect(b.recent).toEqual(['café']);
  });
  it('drops bad entries inside a part', () => {
    const b = read({ saved: ['a', 3, 'b'], visits: { a: '2026-11-10', b: '2026-02-31' }, recent: ['café', 7, 'x'] });
    expect(b.visits).toEqual({ a: '2026-11-10' });
    expect(b.recent).toEqual(['café']);
    expect(b.saved).toEqual([]);
  });
  it('ignores unknown extra keys', () => {
    expect(read({ evil: { run: 'x' } })).not.toHaveProperty('evil');
  });
  it('removes unknown features from the finder state', () => {
    expect(read({ state: { features: ['ramp', 'teleporter'], query: 'x', hideNotAvailable: false } }).state.features).toEqual(['ramp']);
  });
  it('is safe with prototype keys', () => {
    const b = read({ notes: JSON.parse('{"__proto__":"x","constructor":"y"}') });
    expect(Object.getPrototypeOf(b.notes)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
  it('gives parts the same readers the finder uses', () => {
    const s = backupToStorage(backup);
    expect(parseSaved(s.saved)).toEqual(data.saved);
    expect(parseNotes(s.notes)).toEqual(data.notes);
    expect(parsePlan(s.plan)).toEqual(data.plan);
    expect(parseVisits(s.visits)).toEqual(data.visits);
    expect(parseRecent(s.recent)).toEqual(data.recent);
    expect(parseLists(s.lists)).toEqual(data.lists);
  });
});

describe('counts and texts', () => {
  it('counts each kind', () => {
    expect(countData(data)).toEqual({ saved: 2, notes: 1, plan: 1, visits: 1, recent: 2, lists: 1 });
    expect(totalCount(countData(data))).toBe(8);
  });
  it('says nothing is kept for no data', () => {
    expect(countsText(countData({ saved: [], notes: {}, plan: {}, visits: {}, recent: [], lists: [] }), 'en')).toBe(BACKUP_UI.en.none);
  });
  it('lists only kinds that have items', () => {
    const text = countsText({ saved: 2, notes: 0, plan: 0, visits: 1, recent: 0, lists: 0 }, 'en');
    expect(text).toBe('Kept on this device: 2 saved places, 1 visit marks.');
  });
  it('is clean French', () => {
    expect(frenchIssues(countsText(countData(data), 'fr'))).toEqual([]);
  });
  it('says how many items were loaded', () => {
    expect(restoredText(backup, 'en')).toBe('Loaded 8 items from the copy.');
    expect(BACKUP_UI.en.restored(1)).toBe('Loaded 1 item from the copy.');
    expect(BACKUP_UI.fr.restored(1)).toBe('1 élément chargé depuis la copie.');
  });
  it('names the file by date', () => {
    expect(backupFilename('2026-11-15')).toBe('glossary-backup-2026-11-15.json');
  });
});

describe('the wording', () => {
  const texts = (lang: Lang): string[] => {
    const ui = BACKUP_UI[lang];
    return [ui.heading, ui.intro, ui.export, ui.importLabel, ui.import, ui.forget, ui.forgetSure, ui.forgetCancel, ui.forgetAsk, ui.forgotten, ...Object.values(ui.errors)];
  };
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    for (const t of texts(lang)) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      expect(readabilityIssues(t, lang), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
  it('has an error message for every kind of problem in both languages', () => {
    expect(Object.keys(BACKUP_UI.fr.errors).sort()).toEqual(Object.keys(BACKUP_UI.en.errors).sort());
  });
  it('tells the person nothing was changed when a copy is refused', () => {
    for (const lang of ['en', 'fr'] as Lang[]) for (const e of Object.values(BACKUP_UI[lang].errors)) expect(e).toMatch(/Nothing was changed|Rien n’a été changé/);
  });
});

describe('renderDataPanel', () => {
  const opts = (lang: Lang, over: Partial<Parameters<typeof renderDataPanel>[0]> = {}) => ({ lang, counts: countData(data), canExport: true, confirming: false, message: '', ...over });
  it.each(['en', 'fr'] as Lang[])('is valid markup in %s, in every state', (lang) => {
    for (const over of [{}, { confirming: true }, { canExport: false }, { message: 'Loaded 8 items from the copy.' }]) {
      expect(auditHtml(`<div lang="${lang}">${renderDataPanel(opts(lang, over))}</div>`, 'data-panel')).toEqual([]);
    }
  });
  it('has the export button only when export is on', () => {
    expect(renderDataPanel(opts('en'))).toContain(`id="${BACKUP_IDS.export}"`);
    expect(renderDataPanel(opts('en', { canExport: false }))).not.toContain(BACKUP_IDS.export);
  });
  it('asks before forgetting, with a safe default', () => {
    const asking = renderDataPanel(opts('en', { confirming: true }));
    expect(asking).toContain(`id="${BACKUP_IDS.forgetSure}"`);
    expect(asking).toContain(`id="${BACKUP_IDS.forgetCancel}"`);
    expect(asking).toContain('role="alert"');
    expect(asking).not.toContain(`id="${BACKUP_IDS.forget}"`);
    expect(renderDataPanel(opts('en'))).toContain(`id="${BACKUP_IDS.forget}"`);
  });
  it('labels the text box', () => {
    expect(renderDataPanel(opts('en'))).toContain(`<label for="${BACKUP_IDS.text}">`);
  });
  it('escapes the message', () => {
    expect(renderDataPanel(opts('en', { message: '<b>x</b>' }))).not.toContain('<b>x');
  });
});
