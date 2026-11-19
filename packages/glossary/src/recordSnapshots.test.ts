import { describe, expect, it } from 'vitest';
import {
  EDIT_KINDS,
  MAX_SNAPSHOTS,
  MAX_SNAPSHOT_CHARS,
  MAX_SNAPSHOT_NAME,
  SNAPSHOT_IDS,
  SNAPSHOT_UI,
  addSnapshot,
  auditHtml,
  diffRecords,
  entryLine,
  frenchIssues,
  lintClaims,
  lintCopy,
  makeEntry,
  matchesSnapshot,
  parseSnapshotButtonId,
  parseSnapshots,
  plainLanguageIssues,
  readabilityIssues,
  recordsToCsv,
  removeSnapshot,
  renderSnapshotDiff,
  renderSnapshots,
  serialiseSnapshots,
  snapshotButtonId,
  snapshotCounts,
  snapshotDiffFilename,
  snapshotDiffText,
  snapshotLine,
  snapshotMessage,
  snapshotName,
  snapshotPlaces,
  undoLabel,
  type EditEntry,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
  type RecordSnapshot,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit)] },
  { id: 'cafe', name: 'Café, "Nord"', claims: [] },
  { id: 'hall', name: 'Hall', claims: [c('ramp', 'present'), c('grab-bar', 'present', { ...city, licence: 'Proprietary' })] },
];
const later: Place[] = [places[0] as Place, { id: 'hall', name: 'Hall', claims: [c('ramp', 'present', city)] }];
const keep = (name: string, list: readonly RecordSnapshot[] = [], held: readonly Place[] = places) => addSnapshot(list, name, held, today);
const one = keep('Before spring').snapshots;

describe('snapshotName', () => {
  it('tidies spaces and cuts the name to the limit', () => {
    expect(snapshotName('  Before   the\tspring  ', today)).toBe('Before the spring');
    expect(Array.from(snapshotName('x'.repeat(90), today))).toHaveLength(MAX_SNAPSHOT_NAME);
  });
  it('uses the date when no name is typed', () => {
    expect(snapshotName('', today)).toBe(today);
    expect(snapshotName('   ', today)).toBe(today);
  });
});

describe('addSnapshot', () => {
  it('keeps a copy with its name, the day and the records as a table', () => {
    const result = keep(' Before spring ');
    expect(result.outcome).toBe('added');
    expect(result.name).toBe('Before spring');
    expect(result.snapshots).toEqual([{ name: 'Before spring', date: today, csv: recordsToCsv(places) }]);
  });
  it('adds the newest copy at the end and leaves the list it was given alone', () => {
    const two = keep('Second', one);
    expect(two.snapshots.map((s) => s.name)).toEqual(['Before spring', 'Second']);
    expect(one).toHaveLength(1);
  });
  it('refuses a name already in use, ignoring case', () => {
    const result = keep('before SPRING', one);
    expect(result.outcome).toBe('name-taken');
    expect(result.snapshots).toBe(one);
  });
  it('refuses a second copy without a name on the same day', () => {
    const dated = keep('').snapshots;
    expect(dated[0]?.name).toBe(today);
    expect(keep('', dated).outcome).toBe('name-taken');
  });
  it('refuses when there are no places to copy', () => {
    expect(keep('Empty', [], []).outcome).toBe('nothing');
  });
  it('refuses past the limit', () => {
    let list: readonly RecordSnapshot[] = [];
    for (let i = 0; i < MAX_SNAPSHOTS; i++) list = keep(`Copy ${i}`, list).snapshots;
    expect(list).toHaveLength(MAX_SNAPSHOTS);
    const result = keep('One more', list);
    expect(result.outcome).toBe('full');
    expect(result.snapshots).toBe(list);
  });
  it('refuses records that are too large to keep', () => {
    const big: Place[] = Array.from({ length: 6000 }, (_, i) => ({ id: `place-${i}`, name: `A place with a long name ${i}`, claims: [] }));
    expect(recordsToCsv(big).length).toBeGreaterThan(MAX_SNAPSHOT_CHARS);
    expect(keep('Big', [], big).outcome).toBe('too-big');
  });
  it('refuses a day that is not a real date', () => {
    expect(addSnapshot([], 'x', places, '2026-02-30').outcome).toBe('bad-date');
  });
});

describe('reading a copy back', () => {
  const snapshot = one[0] as RecordSnapshot;
  it('gives back the same places and records, as they were held', () => {
    expect(diffRecords(places, snapshotPlaces(snapshot), 'en')).toEqual([]);
    expect(snapshotPlaces(snapshot).map((p) => p.name)).toEqual(['Library', 'Café, "Nord"', 'Hall']);
  });
  it('keeps a record that could not be reported as one that cannot be reported', () => {
    const hall = snapshotPlaces(snapshot).find((p) => p.id === 'hall');
    expect(hall?.claims).toHaveLength(2);
    expect(hall?.claims[0]?.provenance).toBeUndefined();
    expect(hall?.claims[1]?.provenance?.licence).toBe('Proprietary');
  });
  it('counts its places and records', () => {
    expect(snapshotCounts(snapshot)).toEqual({ places: 3, records: 4 });
  });
  it('is empty for a copy that cannot be read', () => {
    expect(snapshotPlaces({ name: 'x', date: today, csv: 'not a table' })).toEqual([]);
    expect(snapshotCounts({ name: 'x', date: today, csv: '' })).toEqual({ places: 0, records: 0 });
  });
  it('knows whether the records held still match it', () => {
    expect(matchesSnapshot(snapshot, places)).toBe(true);
    expect(matchesSnapshot(snapshot, [...places].reverse())).toBe(true);
    expect(matchesSnapshot(snapshot, later)).toBe(false);
    expect(matchesSnapshot(snapshot, [])).toBe(false);
  });
});

describe('removeSnapshot', () => {
  it('removes one copy by position', () => {
    const two = keep('Second', one).snapshots;
    expect(removeSnapshot(two, 0).map((s) => s.name)).toEqual(['Second']);
    expect(two).toHaveLength(2);
  });
  it('gives back the same list when there is no such copy', () => {
    expect(removeSnapshot(one, 4)).toBe(one);
    expect(removeSnapshot(one, -1)).toBe(one);
  });
});

describe('storing copies', () => {
  it('round-trips', () => {
    const two = keep('Second', one, later).snapshots;
    expect(parseSnapshots(serialiseSnapshots(two))).toEqual(two);
    expect(parseSnapshots('[]')).toEqual([]);
  });
  it('is null for text that is not a JSON list', () => {
    for (const bad of ['', 'x', '{}', '"a"', '3', 'null']) expect(parseSnapshots(bad), bad).toBeNull();
  });
  it('drops copies that are not well formed', () => {
    const good = one[0] as RecordSnapshot;
    const raw = [
      null,
      3,
      { name: 'No table', date: today },
      { name: 'Bad date', date: '2026-13-01', csv: good.csv },
      { name: 'Not a table', date: today, csv: 'hello' },
      { name: '  untidy  ', date: today, csv: good.csv },
      { name: 'x'.repeat(MAX_SNAPSHOT_NAME + 1), date: today, csv: good.csv },
      { name: 'Too big', date: today, csv: `${good.csv}${' '.repeat(MAX_SNAPSHOT_CHARS)}` },
      good,
      { ...good, name: 'BEFORE SPRING' },
    ];
    expect(parseSnapshots(JSON.stringify(raw))).toEqual([good]);
  });
  it('keeps at most the limit', () => {
    const good = one[0] as RecordSnapshot;
    const many = Array.from({ length: MAX_SNAPSHOTS + 3 }, (_, i) => ({ ...good, name: `Copy ${i}` }));
    expect(parseSnapshots(JSON.stringify(many))).toHaveLength(MAX_SNAPSHOTS);
  });
  it('ignores extra fields and keeps only the three it knows', () => {
    const good = one[0] as RecordSnapshot;
    expect(parseSnapshots(JSON.stringify([{ ...good, extra: 'x', __proto__: { a: 1 } }]))).toEqual([good]);
  });
});

describe('texts', () => {
  it('says what happened after trying to keep a copy', () => {
    expect(snapshotMessage('added', 'Before spring', 'en')).toBe('Kept a copy: Before spring.');
    expect(snapshotMessage('name-taken', 'x', 'en')).toBe('A copy already has that name. Choose another name.');
    expect(snapshotMessage('full', 'x', 'en')).toBe(`You can keep ${MAX_SNAPSHOTS} copies. Remove one first.`);
    expect(snapshotMessage('too-big', 'x', 'fr')).toContain('trop volumineuses');
    expect(snapshotMessage('nothing', 'x', 'en')).toBe('There are no records to copy.');
    expect(snapshotMessage('bad-date', 'x', 'en')).toBe('There are no records to copy.');
    expect(snapshotMessage('added', 'Avant', 'fr')).toBe('Copie gardée\u00a0: Avant.');
  });
  it('describes a copy in one line', () => {
    expect(snapshotLine(one[0] as RecordSnapshot, 'en')).toBe('Before spring, kept on 2026-11-19. 3 places, 4 records.');
    expect(snapshotLine(keep('Un', [], [places[0] as Place]).snapshots[0] as RecordSnapshot, 'fr')).toBe('Un, copie gardée le 2026-11-19. 1 lieu, 2 fiches.');
  });
  it('has button ids that round-trip, and rejects other ids', () => {
    for (const action of ['diff', 'use', 'rm'] as const) expect(parseSnapshotButtonId(snapshotButtonId(action, 3))).toEqual({ action, index: 3 });
    for (const id of ['gl-snap-add', 'gl-snap-name', 'gl-snap-diff-', 'gl-snap-go-1', 'gl-snap-rm-x', '']) expect(parseSnapshotButtonId(id), id).toBeNull();
  });
  it('has an undo label and a line in the list of changes for going back', () => {
    expect(undoLabel('restore', 'en')).toBe('Undo: go back to a copy');
    expect(undoLabel('restore', 'fr')).toBe('Annuler\u00a0: revenir à une copie');
    expect(EDIT_KINDS).toContain('restore');
    const entry = makeEntry(today, 'restore', { detail: 'Before spring' }) as EditEntry;
    expect(entryLine(entry, 'en')).toBe('2026-11-19: Went back to the copy of the records: Before spring.');
    expect(entryLine(entry, 'fr')).toBe('2026-11-19\u00a0: Retour à la copie des fiches\u00a0: Before spring.');
  });
});

describe('renderSnapshots', () => {
  const two = keep('Second <i>', one, later).snapshots;
  const panel = (o: Partial<Parameters<typeof renderSnapshots>[0]> = {}): string => renderSnapshots({ lang: 'en', snapshots: two, places, canRestore: true, ...o });
  it('has a labelled name box with a hint, the button and a message region', () => {
    const html = panel({ snapshots: [] });
    expect(html).toContain(`<label for="${SNAPSHOT_IDS.name}">Name for the copy</label>`);
    expect(html).toContain(`maxlength="${MAX_SNAPSHOT_NAME}"`);
    expect(html).toContain('aria-describedby="gl-snap-hint"');
    expect(html).toContain(`id="${SNAPSHOT_IDS.add}">Keep a copy now</button>`);
    expect(html).toContain('<p role="status" data-gl-snap-msg></p>');
    expect(html).toContain('<p class="gl-note">No copies are kept.</p>');
    expect(html).toContain('<div data-gl-snap-diff></div>');
  });
  it('lists each copy with three buttons whose names say which copy', () => {
    const html = panel();
    expect(html).toContain('<li>Before spring, kept on 2026-11-19. 3 places, 4 records.<div class="gl-actions">');
    expect(html).toContain('id="gl-snap-diff-0" aria-label="See what differs from the copy: Before spring">See what differs</button>');
    expect(html).toContain('id="gl-snap-use-1" aria-label="Go back to this copy: Second &lt;i&gt;">Go back to this copy</button>');
    expect(html).toContain('id="gl-snap-rm-1" aria-label="Remove this copy: Second &lt;i&gt;">Remove this copy</button>');
    expect(html).not.toContain('<i>');
  });
  it('does not offer to go back while going back is not allowed', () => {
    const html = panel({ canRestore: false });
    expect(html).not.toContain('gl-snap-use-');
    expect(html).toContain('gl-snap-diff-0');
    expect(html).toContain('gl-snap-rm-0');
  });
  it('shows the message, escaped', () => {
    expect(panel({ message: 'Kept a copy: <x>.' })).toContain('<p role="status" data-gl-snap-msg>Kept a copy: &lt;x&gt;.</p>');
  });
  it('shows what differs from the copy asked for', () => {
    const html = panel({ showing: 1 });
    expect(html).toContain('<h4>What differs from the copy: Second &lt;i&gt;</h4>');
    expect(html).toContain('This compares the copy with the records as they are now.');
    expect(html).toContain('<li data-diff="place-added">Place added: Café, &quot;Nord&quot;.</li>');
    expect(html).toContain('<li data-diff="record-removed">Record removed from Hall.');
    expect(panel({ showing: 0 })).toContain('Nothing differs. The two sets of records are the same.');
    expect(panel({ showing: 9 })).toContain('<div data-gl-snap-diff></div>');
  });
  it('is in French', () => {
    const html = panel({ lang: 'fr', showing: 1 });
    expect(html).toContain('aria-label="Revenir à cette copie\u00a0: Before spring">Revenir à cette copie</button>');
    expect(html).toContain('<h4>Ce qui diffère de la copie\u00a0: Second &lt;i&gt;</h4>');
  });
  it('gives the differences on their own, for a redraw', () => {
    expect(renderSnapshotDiff(two[1] as RecordSnapshot, later, 'en')).toContain('Nothing differs.');
  });
  it('offers to save the differences only when the host takes files and something differs', () => {
    expect(panel({ showing: 1 })).not.toContain(SNAPSHOT_IDS.exportDiff);
    expect(panel({ showing: 1, canExport: true })).toContain(`id="${SNAPSHOT_IDS.exportDiff}">Save these differences as text</button>`);
    expect(panel({ showing: 0, canExport: true })).not.toContain(SNAPSHOT_IDS.exportDiff);
  });
  it('gives the differences as text', () => {
    const text = snapshotDiffText(two[1] as RecordSnapshot, places, 'en', today);
    expect(text.startsWith('What differs from the copy: Second <i>\nMade on 2026-11-19.\n\nThis compares the copy with the records as they are now.\n\n1 place added.\n')).toBe(true);
    expect(snapshotDiffText(two[0] as RecordSnapshot, places, 'fr', today)).toContain('Rien ne diffère.');
    expect(snapshotDiffFilename('en')).toBe('copy-differences-en.txt');
    expect(snapshotDiffFilename('fr')).toBe('copy-differences-fr.txt');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><h3>t</h3><details><summary>${SNAPSHOT_UI[lang].heading}</summary>${panel({ lang, showing: 1, message: 'm' })}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('SNAPSHOT_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = SNAPSHOT_UI[lang];
    return [
      ui.heading, ui.intro, ui.label, ui.hint(5), ui.add, ui.none, ui.item('Before spring', today), ui.holds(1, 1), ui.holds(3, 4), ui.diff, ui.diffLabel('Before spring'), ui.use, ui.useLabel('Before spring'),
      ui.remove, ui.removeLabel('Before spring'), ui.diffHeading('Before spring'), ui.diffNote, ui.exportDiff, ui.made(today), ui.added('Before spring'), ui.nothing, ui.nameTaken, ui.full(5), ui.tooBig, ui.removed('Before spring'),
      ui.restored('Before spring'), ui.same, ui.unreadable,
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(SNAPSHOT_UI.fr)).toEqual(Object.keys(SNAPSHOT_UI.en));
  });
  it('passes the copy rules in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of samples(lang)) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(plainLanguageIssues(text), text).toEqual([]);
        expect(readabilityIssues(text, lang), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
});
