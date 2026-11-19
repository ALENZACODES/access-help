import { describe, expect, it } from 'vitest';
import {
  EDIT_KINDS,
  TIDY_KINDS,
  TIDY_SOURCE_ID,
  TIDY_UI,
  auditHtml,
  entryLine,
  frenchIssues,
  isTidyKind,
  licenceGroups,
  lintClaims,
  lintCopy,
  makeEntry,
  parseTidyButtonId,
  plainLanguageIssues,
  readabilityIssues,
  recordAgeCounts,
  renderTidy,
  tidyButtonId,
  tidyLogText,
  tidyMessage,
  tidyPlan,
  tidySourceFromValue,
  tidyWouldChange,
  undoLabel,
  type EditEntry,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
  type TidyKind,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2023-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit), c('grab-bar', 'present')] },
  { id: 'cafe', name: 'Café', claims: [] },
  { id: 'pool', name: 'Pool', claims: [c('ramp', 'unknown', city), c('not-a-term', 'present')] },
  { id: 'hall', name: 'Hall', claims: [c('ramp', 'present', { ...transit, licence: 'Proprietary' }), c('elevator', 'present', { ...city, date: '2024-11-20' }), c('grab-bar', 'absent', { ...city, date: '2024-11-18' })] },
];
const left = (plan: { places: readonly Place[] }, id: string): string[] => plan.places.find((p) => p.id === id)?.claims.map((x) => `${x.termId}:${x.status}`) ?? [];

describe('isTidyKind', () => {
  it('knows the five kinds and nothing else', () => {
    for (const k of TIDY_KINDS) expect(isTidyKind(k)).toBe(true);
    for (const v of ['', 'all', 'OLD', 3, null, undefined]) expect(isTidyKind(v)).toBe(false);
  });
});

describe('tidyPlan: records that cannot be reported', () => {
  const plan = tidyPlan(places, 'not-usable', today);
  it('removes records that say something but cannot be reported', () => {
    expect(plan.records).toBe(2);
    expect(plan.placesTouched).toBe(2);
    expect(plan.placesRemoved).toBe(0);
    expect(left(plan, 'lib')).toEqual(['ramp:present', 'elevator:absent']);
    expect(left(plan, 'hall')).toEqual(['elevator:present', 'grab-bar:absent']);
  });
  it('keeps records that say unknown, and records about features the glossary does not know', () => {
    expect(left(plan, 'pool')).toEqual(['ramp:unknown', 'not-a-term:present']);
  });
  it('leaves every remaining record usable or unknown', () => {
    const groups = licenceGroups(plan.places);
    expect(groups.noSource).toBe(0);
    for (const g of groups.groups) expect(g.usable).toBe(g.records);
  });
  it('keeps every place, also one left with no records', () => {
    const only: Place[] = [{ id: 'a', name: 'A', claims: [c('ramp', 'present')] }];
    expect(tidyPlan(only, 'not-usable', today).places).toEqual([{ id: 'a', name: 'A', claims: [] }]);
  });
});

describe('tidyPlan: exact copies', () => {
  const twice: Place[] = [
    { id: 'a', name: 'A', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit), c('ramp', 'present', { ...city }), c('ramp', 'present', city), c('ramp', 'present')] },
    { id: 'b', name: 'B', claims: [c('ramp', 'present', city), c('ramp', 'present'), c('ramp', 'present')] },
  ];
  const plan = tidyPlan(twice, 'duplicates', today);
  it('removes every later copy of a record and keeps the first one in its place', () => {
    expect(plan.records).toBe(3);
    expect(plan.placesTouched).toBe(2);
    expect(plan.places[0]?.claims).toEqual([c('ramp', 'present', city), c('elevator', 'absent', transit), c('ramp', 'present')]);
    expect(plan.places[1]?.claims).toEqual([c('ramp', 'present', city), c('ramp', 'present')]);
  });
  it('does not treat the same record in two places as a copy', () => {
    expect(plan.places[1]?.claims[0]).toEqual(c('ramp', 'present', city));
  });
  it('keeps records that differ in anything: what they say, the source, licence, date, tier or link', () => {
    const near: Place[] = [
      {
        id: 'a',
        name: 'A',
        claims: [
          c('ramp', 'present', city),
          c('ramp', 'absent', city),
          c('ramp', 'present', { ...city, source: 'Other' }),
          c('ramp', 'present', { ...city, licence: 'CC-BY-4.0' }),
          c('ramp', 'present', { ...city, date: '2026-10-02' }),
          c('ramp', 'present', { ...city, tier: 'tier-0' }),
          c('ramp', 'present', { ...city, url: 'https://example.org/a' }),
          c('elevator', 'present', city),
        ],
      },
    ];
    const result = tidyPlan(near, 'duplicates', today);
    expect(result.records).toBe(0);
    expect(result.places).toBe(near);
  });
  it('treats names that differ only by spaces around them as the same', () => {
    const spaced: Place[] = [{ id: 'a', name: 'A', claims: [c('ramp', 'present', city), c('ramp', 'present', { ...city, source: ' City open data ' })] }];
    expect(tidyPlan(spaced, 'duplicates', today).records).toBe(1);
  });
  it('finds nothing in the sample places', () => {
    expect(tidyWouldChange(tidyPlan(places, 'duplicates', today))).toBe(false);
  });
});

describe('tidyPlan: records more than two years old', () => {
  const plan = tidyPlan(places, 'old', today);
  it('removes usable records more than two years old', () => {
    expect(plan.records).toBe(2);
    expect(plan.placesTouched).toBe(2);
    expect(left(plan, 'lib')).toEqual(['ramp:present', 'grab-bar:present']);
    expect(left(plan, 'hall')).toEqual(['ramp:present', 'elevator:present']);
  });
  it('keeps a record that is exactly two years old or newer', () => {
    expect(left(plan, 'hall')).toContain('elevator:present');
  });
  it('leaves no old record behind', () => {
    expect(recordAgeCounts(plan.places, today).old).toBe(0);
    expect(recordAgeCounts(places, today).old).toBe(2);
  });
  it('does not touch records that cannot be reported, whatever their date', () => {
    expect(left(plan, 'hall')).toContain('ramp:present');
  });
});

describe('tidyPlan: one source', () => {
  it('removes every record that names the source, usable or not', () => {
    const plan = tidyPlan(places, 'source', today, ' Transit agency ');
    expect(plan.records).toBe(2);
    expect(plan.placesTouched).toBe(2);
    expect(left(plan, 'lib')).toEqual(['ramp:present', 'grab-bar:present']);
    expect(left(plan, 'hall')).toEqual(['elevator:present', 'grab-bar:absent']);
  });
  it('also removes records of the source that say unknown', () => {
    const plan = tidyPlan(places, 'source', today, 'City open data');
    expect(plan.records).toBe(4);
    expect(left(plan, 'pool')).toEqual(['not-a-term:present']);
  });
  it('removes nothing without a source, or for a source that is not held', () => {
    for (const s of ['', '   ', 'Nobody', 'transit agency']) {
      const plan = tidyPlan(places, 'source', today, s);
      expect(plan.records, s).toBe(0);
      expect(plan.places).toBe(places);
    }
  });
});

describe('tidyPlan: places with no records', () => {
  it('removes them and keeps the others in order', () => {
    const plan = tidyPlan(places, 'empty-places', today);
    expect(plan.placesRemoved).toBe(1);
    expect(plan.records).toBe(0);
    expect(plan.places.map((p) => p.id)).toEqual(['lib', 'pool', 'hall']);
  });
  it('keeps a place whose only record says unknown', () => {
    expect(tidyPlan([{ id: 'a', name: 'A', claims: [c('ramp', 'unknown')] }], 'empty-places', today).placesRemoved).toBe(0);
  });
});

describe('tidyPlan in general', () => {
  it('gives back the same list when there is nothing to remove', () => {
    const clean: Place[] = [{ id: 'a', name: 'A', claims: [c('ramp', 'present', city)] }];
    for (const kind of ['not-usable', 'duplicates', 'old'] as TidyKind[]) {
      const plan = tidyPlan(clean, kind, today);
      expect(plan.places).toBe(clean);
      expect(tidyWouldChange(plan)).toBe(false);
    }
    expect(tidyWouldChange(tidyPlan(clean, 'empty-places', today))).toBe(false);
    expect(tidyWouldChange(tidyPlan([], 'old', today))).toBe(false);
  });
  it('never changes what a remaining record says', () => {
    for (const kind of TIDY_KINDS) {
      const plan = tidyPlan(places, kind, today, 'Transit agency');
      for (const place of plan.places) {
        const before = places.find((p) => p.id === place.id);
        for (const claim of place.claims) expect(before?.claims).toContain(claim);
      }
    }
  });
  it('does not change the places it was given', () => {
    const before = JSON.stringify(places);
    for (const kind of TIDY_KINDS) tidyPlan(places, kind, today, 'City open data');
    expect(JSON.stringify(places)).toBe(before);
  });
  it('reads a source from a position in the list of names', () => {
    expect(tidySourceFromValue(places, '0')).toBe('City open data');
    expect(tidySourceFromValue(places, '1')).toBe('Transit agency');
    for (const v of ['', '2', '-1', 'x', 'City open data']) expect(tidySourceFromValue(places, v), v).toBe('');
  });
});

describe('texts', () => {
  it('says what was removed', () => {
    expect(tidyMessage(tidyPlan(places, 'not-usable', today), 'en')).toBe('Removed 2 records from 2 places.');
    expect(tidyMessage(tidyPlan(places, 'empty-places', today), 'en')).toBe('Removed 1 place.');
    expect(tidyMessage(tidyPlan(places, 'source', today, 'Nobody'), 'en')).toBe('There was nothing to remove.');
    expect(tidyMessage(tidyPlan([places[0] as Place], 'old', today), 'fr')).toBe('1 fiche retirée de 1 lieu.');
  });
  it('has button ids that round-trip, and rejects other ids', () => {
    for (const kind of TIDY_KINDS) expect(parseTidyButtonId(tidyButtonId(kind))).toBe(kind);
    for (const id of ['gl-tidy-', 'gl-tidy-src', 'gl-tidy-all', 'gl-snap-add', '']) expect(parseTidyButtonId(id), id).toBeNull();
  });
  it('has a line for the list of changes for each kind', () => {
    expect(tidyLogText('not-usable', '', 'en')).toBe('Removed the records that cannot be reported.');
    expect(tidyLogText('source', 'Transit agency', 'en')).toBe('Removed every record from the source: Transit agency.');
    expect(tidyLogText('source', 'Transit agency', 'fr')).toBe('Toutes les fiches de la source retirées\u00a0: Transit agency.');
    expect(tidyLogText('nonsense', '', 'en')).toBe('There was nothing to remove.');
    expect(tidyLogText('duplicates', '', 'en')).toBe('Removed the records that were exact copies.');
    expect(new Set(TIDY_KINDS.map((k) => tidyLogText(k, 'S', 'fr'))).size).toBe(TIDY_KINDS.length);
  });
  it('is in the list of changes and has an undo label', () => {
    expect(EDIT_KINDS).toContain('tidy');
    const entry = makeEntry(today, 'tidy', { detail: 'old' }) as EditEntry;
    expect(entryLine(entry, 'en')).toBe('2026-11-19: Removed the records more than two years old.');
    expect(entryLine(entry, 'fr')).toBe('2026-11-19\u00a0: Fiches de plus de deux ans retirées.');
    expect(undoLabel('tidy', 'en')).toBe('Undo: tidy the records');
    expect(undoLabel('tidy', 'fr')).toBe('Annuler\u00a0: ranger les fiches');
  });
});

describe('renderTidy', () => {
  const panel = (o: Partial<Parameters<typeof renderTidy>[0]> = {}): string => renderTidy({ lang: 'en', places, today, source: '', ...o });
  it('says how much each kind would remove, with a button for it', () => {
    const html = panel();
    expect(html).toContain('<li data-tidy="not-usable"><span>2 records cannot be reported.</span> <button type="button" class="gl-btn" id="gl-tidy-not-usable">Remove the records that cannot be reported</button></li>');
    expect(html).toContain('<li data-tidy="old"><span>2 records are more than two years old.</span> <button type="button" class="gl-btn" id="gl-tidy-old">Remove the records more than two years old</button></li>');
    expect(html).toContain('<li data-tidy="empty-places"><span>1 place has no records.</span> <button type="button" class="gl-btn" id="gl-tidy-empty-places">Remove the places with no records</button></li>');
  });
  it('has no button for a kind with nothing to remove', () => {
    const html = panel({ places: [{ id: 'a', name: 'A', claims: [c('ramp', 'present', city)] }] });
    expect(html).toContain('<li data-tidy="not-usable"><span>0 records cannot be reported.</span></li>');
    expect(html).toContain('<li data-tidy="old"><span>0 records are more than two years old.</span></li>');
    expect(html).toContain('<li data-tidy="empty-places"><span>0 places have no records.</span></li>');
    expect(html).not.toContain('id="gl-tidy-not-usable"');
  });
  it('asks for a source before it counts that source', () => {
    const html = panel();
    expect(html).toContain(`<label for="${TIDY_SOURCE_ID}">Source to remove</label><select id="${TIDY_SOURCE_ID}" class="gl-select"><option value="" selected>Choose a source</option><option value="0">City open data</option><option value="1">Transit agency</option></select>`);
    expect(html).toContain('<span>Choose a source to see how many records come from it.</span>');
    expect(html).not.toContain('id="gl-tidy-source"');
  });
  it('counts the chosen source and offers to remove it', () => {
    const html = panel({ source: 'Transit agency' });
    expect(html).toContain('<option value="1" selected>Transit agency</option>');
    expect(html).toContain('<span>2 records come from this source.</span> <button type="button" class="gl-btn" id="gl-tidy-source">Remove every record from this source</button>');
  });
  it('treats a source that is no longer held as none, and says so when no record names a source', () => {
    expect(panel({ source: 'Gone' })).toContain('<option value="" selected>');
    const html = panel({ places: [{ id: 'a', name: 'A', claims: [c('ramp', 'present')] }] });
    expect(html).toContain('<li data-tidy="source"><span>No record names a source.</span></li>');
    expect(html).not.toContain(TIDY_SOURCE_ID);
  });
  it('shows the message, escaped, and the note about old records', () => {
    const html = panel({ message: 'Removed <2>.' });
    expect(html).toContain('<p role="status" data-gl-tidy-msg>Removed &lt;2&gt;.</p>');
    expect(html).toContain('An old record may still be right.');
  });
  it('escapes source names', () => {
    const odd: Place[] = [{ id: 'a', name: 'A', claims: [c('ramp', 'present', { ...city, source: 'A & B <i>' })] }];
    const html = panel({ places: odd });
    expect(html).toContain('<option value="0">A &amp; B &lt;i&gt;</option>');
    expect(html).not.toContain('<i>');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><details><summary>${TIDY_UI[lang].heading}</summary>${panel({ lang, source: 'Transit agency', message: 'm' })}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('TIDY_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = TIDY_UI[lang];
    return [
      ui.heading, ui.intro, ...TIDY_KINDS.flatMap((k) => [ui.counts[k](1), ui.counts[k](4), ui.buttons[k]]), ui.logs['not-usable'], ui.logs.duplicates, ui.logs.old, ui.logs.source('City open data'), ui.logs['empty-places'],
      ui.sourceLabel, ui.choose, ui.chooseFirst, ui.noSources, ui.removedRecords(1, 1), ui.removedRecords(3, 2), ui.removedPlaces(1), ui.removedPlaces(3), ui.nothing, ui.oldNote,
    ];
  };
  it('has the same keys in both languages, and text for every kind', () => {
    expect(Object.keys(TIDY_UI.fr)).toEqual(Object.keys(TIDY_UI.en));
    for (const lang of ['en', 'fr'] as const) {
      for (const part of ['counts', 'buttons', 'logs'] as const) expect(Object.keys(TIDY_UI[lang][part])).toEqual([...TIDY_KINDS]);
    }
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
