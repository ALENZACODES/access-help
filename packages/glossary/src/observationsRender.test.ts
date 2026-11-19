import { describe, expect, it } from 'vitest';
import { findBannedCopy } from '../../../qa/src/audit/copy';
import {
  MAX_SEEN_NOTE,
  MAX_SOURCE_NAME,
  OPEN_LICENCES,
  SEEN_IDS,
  SEEN_RECORDS_FILENAME,
  SEEN_UI,
  SEEN_VALUES,
  auditHtml,
  cleanShareName,
  emptySeenDraft,
  frenchIssues,
  lintClaims,
  lintCopy,
  parseSeenRemoveId,
  plainLanguageIssues,
  readabilityIssues,
  recordsFromCsv,
  renderSeenCard,
  renderSeenCounts,
  renderSeenForm,
  renderSeenList,
  renderSeenShare,
  seenAsRecords,
  seenLine,
  seenMessage,
  seenRemoveId,
  seenRemovedMessage,
  seenRowText,
  seenRows,
  seenTextFilename,
  seenToText,
  shareProblems,
  shareSeen,
  undoLabel,
  type Lang,
  type Observations,
  type Place,
  type Provenance,
  type SeenProblem,
  type SeenRow,
  type ShareProblem,
} from './index';
import { TERMS } from './plainTerms';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [{ termId: 'ramp', status: 'present', provenance: city }, { termId: 'elevator', status: 'absent', provenance: city }] },
  { id: 'cafe', name: 'Café <b>', claims: [] },
];
const list: Observations = [
  { placeId: 'lib', termId: 'ramp', seen: 'there', date: '2026-11-15' },
  { placeId: 'lib', termId: 'elevator', seen: 'there', date: '2026-11-10', note: 'Near the <back>' },
  { placeId: 'cafe', termId: 'ramp', seen: 'not-sure', date: '2026-11-15' },
  { placeId: 'cafe', termId: 'elevator', seen: 'not-there', date: '2026-11-15' },
  { placeId: 'gone', termId: 'ramp', seen: 'there', date: '2026-11-15' },
];
const rows = (lang: Lang = 'en'): readonly SeenRow[] => seenRows(list, places, lang);
const row = (placeId: string, termId: string, lang: Lang = 'en'): SeenRow => rows(lang).find((r) => r.observation.placeId === placeId && r.observation.termId === termId) as SeenRow;

describe('the words for one note', () => {
  it('says the feature, what the person saw and the day', () => {
    expect(seenLine(list[0] as Observations[number], 'en')).toBe('Ramp: it was there. Seen on 2026-11-15.');
    expect(seenLine(list[3] as Observations[number], 'en')).toBe('Elevator: it was not there. Seen on 2026-11-15.');
    expect(seenLine(list[2] as Observations[number], 'en')).toBe('Ramp: you could not tell. Seen on 2026-11-15.');
  });
  it('is French with French spacing', () => {
    expect(seenLine(list[0] as Observations[number], 'fr')).toBe('Rampe\u00a0: c’était là. Vu le 2026-11-15.');
    for (const o of list) expect(frenchIssues(seenLine(o, 'fr'))).toEqual([]);
  });
  it('adds how the note stands against the records', () => {
    expect(seenRowText(row('lib', 'ramp'), 'en')).toBe('Ramp: it was there. Seen on 2026-11-15. The records say the same.');
    expect(seenRowText(row('cafe', 'elevator'), 'en')).toBe('Elevator: it was not there. Seen on 2026-11-15. The records show this feature as Unknown.');
    expect(seenRowText(row('cafe', 'ramp'), 'en')).toBe('Ramp: you could not tell. Seen on 2026-11-15.');
  });
  it('quotes the person’s own words', () => {
    expect(seenRowText(row('lib', 'elevator'), 'en')).toBe('Elevator: it was there. Seen on 2026-11-10. Your words: “Near the <back>”. The records say something else.');
    expect(seenRowText(row('lib', 'elevator', 'fr'), 'fr')).toBe('Ascenseur\u00a0: c’était là. Vu le 2026-11-10. Vos mots\u00a0: «\u202fNear the <back>\u202f». Les fiches disent autre chose.');
  });
  it('uses the token in French where the records show nothing', () => {
    const text = seenRowText(row('cafe', 'elevator', 'fr'), 'fr');
    expect(text).toContain('Les fiches indiquent UNKNOWN pour cette caractéristique.');
    expect(text).not.toMatch(/inconnu/i);
  });
  it('never calls a place accessible, whatever the person saw', () => {
    for (const lang of ['en', 'fr'] as const) for (const r of rows(lang)) expect(seenRowText(r, lang)).not.toMatch(/accessible/i);
  });
});

describe('messages', () => {
  it('says what happened to a note', () => {
    expect(seenMessage('added', 'Library', 'ramp', 'en')).toBe('Saved what you saw at Library: Ramp.');
    expect(seenMessage('changed', 'Library', 'ramp', 'en')).toBe('Changed what you saw at Library: Ramp.');
    expect(seenMessage('same', 'Library', 'ramp', 'en')).toBe('You already have this note.');
    expect(seenMessage('full', 'Library', 'ramp', 'en')).toBe(SEEN_UI.en.full);
    expect(seenMessage('no-place', '', '', 'en')).toBe('Choose a place first.');
    expect(seenMessage('invalid', 'Library', 'ramp', 'en')).toBe('');
    expect(seenRemovedMessage('Library', 'ramp', 'en')).toBe('Removed what you saw at Library: Ramp.');
  });
  it('is French', () => {
    expect(seenMessage('added', 'Library', 'ramp', 'fr')).toBe('Note enregistrée pour Library\u00a0: Rampe.');
    expect(seenRemovedMessage('Library', 'elevator', 'fr')).toBe('Note retirée pour Library\u00a0: Ascenseur.');
  });
  it('has an undo label', () => {
    expect(undoLabel('seen', 'en')).toBe('Undo: remove what you saw');
    expect(undoLabel('seen', 'fr')).toBe('Annuler\u00a0: retirer la note');
  });
});

describe('renderSeenForm', () => {
  const form = (o: Partial<Parameters<typeof renderSeenForm>[0]> = {}): string => renderSeenForm({ lang: 'en', places, placeIndex: null, draft: emptySeenDraft(today), ...o });
  it('asks for places first when there are none', () => {
    const html = form({ places: [] });
    expect(html).toBe('<h4>Add what you saw</h4><p class="gl-note">Load places before you add what you saw.</p>');
  });
  it('has a labelled control for the place and each part of the note', () => {
    const html = form();
    for (const id of [SEEN_IDS.place, SEEN_IDS.termId, SEEN_IDS.seen, SEEN_IDS.date, SEEN_IDS.note]) expect(html, id).toContain(`<label for="${id}">`);
    expect(html.match(/<label /g)).toHaveLength(5);
    expect(html).toContain('<option value="0">Library</option><option value="1">Café &lt;b&gt;</option>');
    expect(html).toContain(`id="${SEEN_IDS.save}">Save what I saw</button>`);
  });
  it('offers every feature of the glossary and the three answers', () => {
    const html = form();
    for (const term of TERMS) expect(html).toContain(`<option value="${term.id}">`);
    expect(html).toContain('<option value="there">It was there</option><option value="not-there">It was not there</option><option value="not-sure">I could not tell</option>');
    expect(html).toContain('<option value="" selected>Choose a feature</option>');
  });
  it('starts on today and shows the draft, escaped', () => {
    expect(form()).toContain(`id="${SEEN_IDS.date}" class="gl-input" maxlength="10" autocomplete="off" value="${today}">`);
    const html = form({ placeIndex: 1, draft: { termId: 'ramp', seen: 'not-there', date: '2026-11-01', note: 'A "side" <door>' } });
    expect(html).toContain('<option value="1" selected>Café &lt;b&gt;</option>');
    expect(html).toContain('<option value="ramp" selected>Ramp</option>');
    expect(html).toContain('<option value="not-there" selected>It was not there</option>');
    expect(html).toContain('value="A &quot;side&quot; &lt;door&gt;"');
    expect(html).toContain(`maxlength="${MAX_SEEN_NOTE * 2}"`);
  });
  it('ignores a place that is not in the list', () => {
    expect(form({ placeIndex: 9 })).toContain('<option value="" selected>Choose a place</option>');
  });
  it('lists what to fix as an alert and marks the boxes', () => {
    const html = form({ problems: ['feature-missing', 'date-in-future'] });
    expect(html).toContain('<div id="gl-seen-errors" role="alert"><p>There are 2 things to fix before this can be saved.</p><ul><li>Choose a feature.</li><li>The date cannot be after today.</li></ul></div>');
    expect(html).toContain(`<select id="${SEEN_IDS.termId}" class="gl-select" aria-invalid="true" aria-describedby="gl-seen-errors">`);
    expect(html.match(/aria-invalid/g)).toHaveLength(2);
    expect(html).not.toContain('data-gl-seen-msg');
  });
  it('shows the message when there is nothing to fix', () => {
    expect(form({ message: 'Saved <x>.' })).toContain('<p role="status" data-gl-seen-msg>Saved &lt;x&gt;.</p>');
  });
  it('is French', () => {
    const html = form({ lang: 'fr', problems: ['seen-missing'] });
    expect(html).toContain('<h4>Ajouter ce que vous avez vu</h4>');
    expect(html).toContain('<option value="there">C’était là</option>');
    expect(html).toContain('Il y a 1 élément à corriger avant l’enregistrement.');
  });
  it('passes the HTML audit in both languages, with and without problems', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const problems of [[], ['feature-missing', 'note-too-long']] as SeenProblem[][]) {
        const html = `<div lang="${lang}"><h3>t</h3>${form({ lang, placeIndex: 0, problems, message: 'm' })}</div>`;
        expect(auditHtml(html, 'seen-form'), `${lang} ${problems.length}`).toEqual([]);
      }
    }
  });
});

describe('renderSeenList', () => {
  const view = (o: Partial<Parameters<typeof renderSeenList>[0]> = {}): string => renderSeenList({ lang: 'en', rows: rows(), filter: 'all', notLoaded: 0, canExport: true, ...o });
  it('says so when the person has no notes', () => {
    expect(view({ rows: [] })).toBe('<p role="status">You have not added anything you saw.</p>');
    expect(view({ rows: [], notLoaded: 2 })).toContain('<p class="gl-note" data-gl-seen-more>2 more notes are for places that are not loaded now.</p>');
  });
  it('counts the notes and says how many are for places that are not loaded', () => {
    const html = view({ notLoaded: 1 });
    expect(html).toContain('<p role="status">You have 4 notes of what you saw.</p>');
    expect(html).toContain('1 more note is for a place that is not loaded now.');
    expect(view({ rows: rows().slice(0, 1) })).toContain('You have 1 note of what you saw.');
  });
  it('lists each note with its place, escaped, and a labelled button to remove it', () => {
    const html = view();
    expect(html.match(/<li data-against=/g)).toHaveLength(8);
    expect(html).toContain('<li data-against="records-unknown" data-seen="not-there"><strong>Café &lt;b&gt;</strong> <span>Elevator: it was not there. Seen on 2026-11-15. The records show this feature as Unknown.</span>');
    expect(html).toContain(`id="${seenRemoveId(3)}" aria-label="Remove what you saw at Café &lt;b&gt;: Elevator">Remove</button>`);
    expect(html).toContain('Your words: “Near the &lt;back&gt;”.');
    expect(html).not.toContain('<back>');
  });
  it('sums how the notes stand, leaving out lines with none', () => {
    const counts = renderSeenCounts(rows(), 'en');
    expect(counts).toBe(
      '<h4>Your notes beside the records</h4><ul class="gl-seen-counts"><li data-against="same">The records say the same: 1</li><li data-against="different">The records say something else: 1</li>' +
        '<li data-against="records-unknown">The records show Unknown: 1</li><li data-against="not-compared">You could not tell: 1</li></ul>',
    );
    expect(renderSeenCounts([], 'en')).toBe('');
    expect(renderSeenCounts(rows('fr'), 'fr')).toContain('<li data-against="records-unknown">Les fiches indiquent UNKNOWN\u00a0: 1</li>');
  });
  it('narrows the list to a choice and keeps the choice shown', () => {
    const html = view({ filter: 'different' });
    expect(html).toContain('<option value="different" selected>Only where the records say something else</option>');
    expect(html.match(/<li data-against="different"/g)).toHaveLength(2);
    expect(html).not.toContain('<li data-against="records-unknown" data-seen');
    expect(html).toContain('You have 4 notes of what you saw.');
  });
  it('says so when the choice leaves nothing', () => {
    const html = view({ rows: rows().filter((r) => r.against === 'same'), filter: 'records-unknown' });
    expect(html).toContain('<p class="gl-note">Nothing you saw matches this choice.</p>');
    expect(html).not.toContain('gl-seen-list');
  });
  it('offers to save the notes as text only when the host can save files', () => {
    expect(view()).toContain(`id="${SEEN_IDS.exportText}">Save what you saw as text</button>`);
    expect(view({ canExport: false })).not.toContain(SEEN_IDS.exportText);
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><h3>t</h3>${view({ lang, rows: rows(lang), notLoaded: 1 })}</div>`;
      expect(auditHtml(html, 'seen-list'), lang).toEqual([]);
    }
  });
});

describe('remove buttons', () => {
  it('round-trip their position', () => {
    for (const index of [0, 7, 499]) expect(parseSeenRemoveId(seenRemoveId(index))).toBe(index);
  });
  it('are not confused with the other controls of the panel', () => {
    for (const id of [...Object.values(SEEN_IDS), 'gl-seen-rm-', 'gl-seen-rm-x', 'gl-seen-rm-12345', 'gl-rrm-1', '']) expect(parseSeenRemoveId(id), id).toBeNull();
  });
});

describe('renderSeenCard', () => {
  it('is empty for a place with no notes', () => {
    expect(renderSeenCard(list, 'nowhere', 'en')).toBe('');
    expect(renderSeenCard([], 'lib', 'en')).toBe('');
  });
  it('lists the person’s notes and says they are not records', () => {
    expect(renderSeenCard(list, 'lib', 'en')).toBe(
      '<div class="gl-seen"><p class="gl-note">Your own notes, which are not records:</p><ul><li data-seen="there">Ramp: it was there. Seen on 2026-11-15.</li><li data-seen="there">Elevator: it was there. Seen on 2026-11-10.</li></ul></div>',
    );
    expect(renderSeenCard(list, 'cafe', 'fr')).toContain('Vos propres notes, qui ne sont pas des fiches\u00a0:');
  });
});

describe('the notes as text', () => {
  it('groups the notes by place under a title, and says what they are', () => {
    expect(seenToText(rows(), 'en', today)).toBe(
      'What you saw (4)\nMade on 2026-11-19. These are a person’s own notes, not records.\n\nCafé <b>\n- Ramp: you could not tell. Seen on 2026-11-15.\n' +
        '- Elevator: it was not there. Seen on 2026-11-15. The records show this feature as Unknown.\n\nLibrary\n- Ramp: it was there. Seen on 2026-11-15. The records say the same.\n' +
        '- Elevator: it was there. Seen on 2026-11-10. Your words: “Near the <back>”. The records say something else.\n',
    );
  });
  it('is French with French spacing, and has a file name for each language', () => {
    const text = seenToText(rows('fr'), 'fr', today);
    expect(text.startsWith('Ce que vous avez vu (4)\nCréé le 2026-11-19.')).toBe(true);
    expect(frenchIssues(text)).toEqual([]);
    expect(seenTextFilename('en')).toBe('what-you-saw-en.txt');
    expect(seenTextFilename('fr')).toBe('what-you-saw-fr.txt');
  });
  it('is only a title for no notes', () => {
    expect(seenToText([], 'en', today)).toBe('What you saw (0)\nMade on 2026-11-19. These are a person’s own notes, not records.\n\n');
  });
});

describe('sharing the notes as a table of records', () => {
  it('makes one record per note, with the person as the source and the day they saw it', () => {
    const shared = seenAsRecords(rows(), '  Sam   Lee ', 'CC0-1.0');
    expect(shared).toEqual([
      { id: 'cafe', name: 'Café <b>', claims: [{ termId: 'elevator', status: 'absent', provenance: { source: 'Sam Lee', licence: 'CC0-1.0', date: '2026-11-15' } }] },
      {
        id: 'lib',
        name: 'Library',
        claims: [
          { termId: 'ramp', status: 'present', provenance: { source: 'Sam Lee', licence: 'CC0-1.0', date: '2026-11-15' } },
          { termId: 'elevator', status: 'present', provenance: { source: 'Sam Lee', licence: 'CC0-1.0', date: '2026-11-10' } },
        ],
      },
    ]);
  });
  it('makes no record where the person could not tell, gives no tier, and leaves the person’s words out', () => {
    const text = JSON.stringify(seenAsRecords(rows(), 'Sam Lee', 'CC0-1.0'));
    expect(text).not.toContain('unknown');
    expect(text).not.toContain('tier');
    expect(text).not.toContain('Near the');
  });
  it('leaves out the notes of places that are not loaded and the records already held', () => {
    const shared = seenAsRecords(rows(), 'Sam Lee', 'CC0-1.0');
    expect(shared.some((p) => p.id === 'gone')).toBe(false);
    expect(JSON.stringify(shared)).not.toContain('City open data');
  });
  it('wants a name, an open licence and something to share', () => {
    expect(shareProblems(rows(), 'Sam Lee', 'CC0-1.0')).toEqual([]);
    expect(shareProblems(rows(), '   ', 'CC0-1.0')).toEqual(['name-missing']);
    expect(shareProblems(rows(), 'x'.repeat(MAX_SOURCE_NAME + 1), 'CC0-1.0')).toEqual(['name-too-long']);
    expect(shareProblems(rows(), 'Sam Lee', '')).toEqual(['licence-not-open']);
    expect(shareProblems(rows(), 'Sam Lee', 'All rights reserved')).toEqual(['licence-not-open']);
    expect(shareProblems(rows().filter((r) => r.observation.seen === 'not-sure'), 'Sam Lee', 'CC0-1.0')).toEqual(['nothing-to-share']);
    expect(shareProblems([], '', '')).toEqual(['name-missing', 'licence-not-open', 'nothing-to-share']);
    for (const licence of OPEN_LICENCES) expect(shareProblems(rows(), 'Sam Lee', licence)).toEqual([]);
  });
  it('tidies the name', () => {
    expect(cleanShareName('  Sam \t Lee ')).toBe('Sam Lee');
  });
  it('gives a table that loads back as records the list can report', () => {
    const result = shareSeen(rows(), 'Sam Lee', 'CC-BY-4.0');
    expect(result.ok).toBe(true);
    expect(result.records).toBe(3);
    const back = recordsFromCsv(result.csv);
    expect(back.problems).toEqual([]);
    expect(back.rejected).toEqual([]);
    expect(back.places).toEqual(seenAsRecords(rows(), 'Sam Lee', 'CC-BY-4.0'));
    expect(SEEN_RECORDS_FILENAME).toBe('what-you-saw-records.csv');
  });
  it('gives no table when something is missing', () => {
    expect(shareSeen(rows(), '', 'CC0-1.0')).toEqual({ ok: false, problems: ['name-missing'], csv: '', records: 0 });
  });
  it('guards a name a spreadsheet could run', () => {
    expect(shareSeen(rows(), '=SUM(A1)', 'CC0-1.0').csv).toContain(",'=SUM(A1),");
  });
});

describe('renderSeenShare', () => {
  const share = (o: Partial<Parameters<typeof renderSeenShare>[0]> = {}): string => renderSeenShare({ lang: 'en', rows: rows(), name: '', licence: '', ...o });
  it('is empty when there are no notes', () => {
    expect(share({ rows: [] })).toBe('');
  });
  it('says what the table is and has two labelled controls and a button', () => {
    const html = share();
    expect(html).toContain('<h4>Share what you saw as a table of records</h4><p>This makes a table that anyone can load as records. It names you as the source. Share only what you saw yourself.</p>');
    expect(html).toContain(`<label for="${SEEN_IDS.shareName}">Your name, or a name for the source</label>`);
    expect(html).toContain(`<label for="${SEEN_IDS.shareLicence}">Licence you offer your notes under</label>`);
    for (const licence of OPEN_LICENCES) expect(html).toContain(`<option value="${licence}">`);
    expect(html).toContain(`id="${SEEN_IDS.share}">Save the table</button>`);
  });
  it('keeps what was typed and chosen, escaped', () => {
    const html = share({ name: 'Sam "L" <x>', licence: 'CC-BY-4.0' });
    expect(html).toContain('value="Sam &quot;L&quot; &lt;x&gt;"');
    expect(html).toContain('<option value="CC-BY-4.0" selected>');
  });
  it('lists what is missing as an alert and marks the boxes', () => {
    const html = share({ problems: ['name-missing', 'licence-not-open'] });
    expect(html).toContain('<div id="gl-seen-share-errors" role="alert"><ul><li>Give a name for the source.</li><li>Choose an open licence from the list.</li></ul></div>');
    expect(html.match(/aria-invalid="true" aria-describedby="gl-seen-share-errors"/g)).toHaveLength(2);
    expect(share({ problems: ['nothing-to-share'] })).not.toContain('aria-invalid');
  });
  it('shows the message after a table was saved', () => {
    expect(share({ message: SEEN_UI.en.shared(3) })).toContain('<p role="status" data-gl-seen-share-msg>Saved a table with 3 records.</p>');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const problems of [[], ['name-too-long', 'licence-not-open']] as ShareProblem[][]) {
        expect(auditHtml(`<div lang="${lang}"><h3>t</h3>${share({ lang, rows: rows(lang), problems })}</div>`, 'seen-share'), lang).toEqual([]);
      }
    }
  });
});

describe('SEEN_UI', () => {
  const texts = (lang: Lang): string[] => {
    const ui = SEEN_UI[lang];
    return [
      ui.heading, ui.intro, ui.formHeading, ui.legend, ui.place, ui.choosePlace, ui.feature, ui.chooseFeature, ui.seen, ui.chooseSeen, ...Object.values(ui.seenNames), ui.date, ui.note, ui.save,
      ui.noPlaces, ui.pickFirst, ui.invalid(1), ui.invalid(3), ...Object.values(ui.problems), ui.added('Library', 'Ramp'), ui.changed('Library', 'Ramp'), ui.same, ui.full, ui.removed('Library', 'Ramp'),
      ui.none, ui.count(1), ui.count(4), ui.notLoaded(1), ui.notLoaded(3), ...SEEN_VALUES.map((s) => ui.line('Ramp', ui.seenText[s], '2026-11-15')), ui.noteLine('By the door'), ...Object.values(ui.against),
      ui.countsHeading, ...Object.values(ui.countNames), ui.filterLabel, ...Object.values(ui.filters), ui.filterEmpty, ui.remove, ui.removeLabel('Library', 'Ramp'), ui.cardIntro, ui.exportText, ui.title,
      ui.madeOn('2026-11-19'), ui.shareHeading, ui.shareIntro, ui.shareName, ui.shareLicence, ui.chooseLicence, ui.share, ...Object.values(ui.shareProblems), ui.shared(1), ui.shared(3),
    ];
  };
  it('has the same keys in both languages, at every level', () => {
    const keys = (x: object): string[] => Object.entries(x).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? keys(v).map((s) => `${k}.${s}`) : [k]));
    expect(keys(SEEN_UI.fr)).toEqual(keys(SEEN_UI.en));
  });
  it('passes the copy rules and the shared audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of texts(lang)) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(findBannedCopy(text, 'seen'), text).toEqual([]);
        expect(plainLanguageIssues(text), text).toEqual([]);
        expect(readabilityIssues(text, lang), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
  it('gives no advice about health or about what a person may get', () => {
    for (const lang of ['en', 'fr'] as const) for (const text of texts(lang)) expect(text).not.toMatch(/doctor|médecin|eligib|admissib|diagnos|safe for you|sans danger/i);
  });
});
