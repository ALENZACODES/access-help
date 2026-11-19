import { describe, expect, it } from 'vitest';
import {
  DRAFT_FIELDS,
  EMPTY_DRAFT,
  MAX_PLACE_NAME,
  MAX_SOURCE_NAME,
  OPEN_LICENCES,
  RECORDFORM_IDS,
  RECORDFORM_UI,
  addMessage,
  addRecord,
  auditHtml,
  cleanDraft,
  draftProblems,
  effectiveStatus,
  effectiveTier,
  fieldOf,
  frenchIssues,
  lintClaims,
  lintCopy,
  nextDraft,
  placeIdFor,
  plainLanguageIssues,
  readabilityIssues,
  renderRecordForm,
  type DraftProblem,
  type Lang,
  type Place,
  type RecordDraft,
} from './index';

const today = '2026-11-19';
const good: RecordDraft = { placeName: 'Library', termId: 'ramp', status: 'present', source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const d = (over: Partial<RecordDraft>): RecordDraft => ({ ...good, ...over });

describe('draftProblems', () => {
  it('has none for a full record', () => {
    expect(draftProblems(good, today)).toEqual([]);
    expect(draftProblems(d({ tier: '' }), today)).toEqual([]);
    expect(draftProblems(d({ status: 'absent', date: today }), today)).toEqual([]);
  });
  it('lists everything missing from an empty form, in the order of the form', () => {
    expect(draftProblems(EMPTY_DRAFT, today)).toEqual(['name-missing', 'feature-missing', 'status-missing', 'source-missing', 'licence-not-open', 'date-invalid']);
  });
  it('needs a name, and not too long a one', () => {
    expect(draftProblems(d({ placeName: '   ' }), today)).toEqual(['name-missing']);
    expect(draftProblems(d({ placeName: 'x'.repeat(MAX_PLACE_NAME) }), today)).toEqual([]);
    expect(draftProblems(d({ placeName: 'x'.repeat(MAX_PLACE_NAME + 1) }), today)).toEqual(['name-too-long']);
  });
  it('needs a feature from the glossary', () => {
    for (const bad of ['', 'teleporter', 'constructor', 'unknown']) expect(draftProblems(d({ termId: bad }), today), bad).toEqual(['feature-missing']);
  });
  it('takes only available or not available, never unknown', () => {
    for (const bad of ['', 'unknown', 'yes', 'PRESENT']) expect(draftProblems(d({ status: bad }), today), bad).toEqual(['status-missing']);
  });
  it('needs a source, and not too long a one', () => {
    expect(draftProblems(d({ source: ' ' }), today)).toEqual(['source-missing']);
    expect(draftProblems(d({ source: 's'.repeat(MAX_SOURCE_NAME + 1) }), today)).toEqual(['source-too-long']);
  });
  it('takes open licences only', () => {
    for (const id of OPEN_LICENCES) expect(draftProblems(d({ licence: id }), today), id).toEqual([]);
    for (const bad of ['', 'Proprietary', 'CC-BY-NC-4.0', 'cc0-1.0', 'All rights reserved']) expect(draftProblems(d({ licence: bad }), today), bad).toEqual(['licence-not-open']);
  });
  it('needs a real date that is not in the future', () => {
    for (const bad of ['', '2026-02-30', 'last week', '01/10/2026']) expect(draftProblems(d({ date: bad }), today), bad).toEqual(['date-invalid']);
    expect(draftProblems(d({ date: '2026-11-20' }), today)).toEqual(['date-in-future']);
  });
  it('takes only the tiers this version can show, or none', () => {
    expect(draftProblems(d({ tier: 'tier-0' }), today)).toEqual([]);
    for (const bad of ['tier-2', 'tier-3', 'tier-4', 'tier-e', 'gold', 'Tier 1']) expect(draftProblems(d({ tier: bad }), today), bad).toEqual(['tier-not-offered']);
  });
  it('points each problem at its field', () => {
    const all: DraftProblem[] = ['name-missing', 'name-too-long', 'feature-missing', 'status-missing', 'source-missing', 'source-too-long', 'licence-not-open', 'date-invalid', 'date-in-future', 'tier-not-offered'];
    for (const p of all) expect(DRAFT_FIELDS).toContain(fieldOf(p));
    expect(fieldOf('date-in-future')).toBe('date');
    expect(fieldOf('licence-not-open')).toBe('licence');
  });
});

describe('cleanDraft and nextDraft', () => {
  it('trims and joins spaces', () => {
    expect(cleanDraft(d({ placeName: '  Town   Hall ', source: ' City\topen  data ' }))).toMatchObject({ placeName: 'Town Hall', source: 'City open data' });
  });
  it('keeps the place and the source for the next record, and clears the feature and what is reported', () => {
    expect(nextDraft(good)).toEqual({ placeName: 'Library', termId: '', status: '', source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' });
  });
});

describe('placeIdFor', () => {
  it('makes an id from the name', () => {
    expect(placeIdFor('Café Nord, 2nd floor', new Set())).toBe('cafe-nord-2nd-floor');
    expect(placeIdFor('  --Hall--  ', new Set())).toBe('hall');
  });
  it('adds a number when the id is taken', () => {
    expect(placeIdFor('Hall', new Set(['hall']))).toBe('hall-2');
    expect(placeIdFor('Hall', new Set(['hall', 'hall-2', 'hall-3']))).toBe('hall-4');
  });
  it('has a fallback for a name with no letters or digits, and a length limit', () => {
    expect(placeIdFor('***', new Set())).toBe('place');
    expect(placeIdFor('日本', new Set(['place']))).toBe('place-2');
    expect(placeIdFor('x'.repeat(200), new Set()).length).toBeLessThanOrEqual(40);
  });
});

describe('addRecord', () => {
  const places: Place[] = [{ id: 'lib', name: 'Library', claims: [] }, { id: 'cafe', name: 'Café Nord', claims: [] }];
  it('adds the record to the place with that name, with its source, licence, date and tier', () => {
    const r = addRecord(places, good, today);
    expect(r.outcome).toBe('added');
    expect(r.placeId).toBe('lib');
    expect(r.places[0]?.claims).toEqual([{ termId: 'ramp', status: 'present', provenance: { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' } }]);
    expect(r.places[1]).toBe(places[1]);
  });
  it('makes a record that can be reported, at the tier chosen', () => {
    const claim = addRecord(places, good, today).places[0]?.claims[0];
    expect(claim === undefined ? '' : effectiveStatus(claim)).toBe('present');
    expect(effectiveTier(claim?.provenance)).toBe('tier-1');
  });
  it('leaves the tier off when none is chosen', () => {
    const claim = addRecord(places, d({ tier: '' }), today).places[0]?.claims[0];
    expect(claim?.provenance).toEqual({ source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' });
    expect(effectiveTier(claim?.provenance)).toBeNull();
  });
  it('finds the place whatever the case, accents or outer spaces', () => {
    expect(addRecord(places, d({ placeName: '  cafe NORD ' }), today).placeId).toBe('cafe');
  });
  it('adds a new place at the end for a new name', () => {
    const r = addRecord(places, d({ placeName: 'Town Hall' }), today);
    expect(r.outcome).toBe('added-place');
    expect(r.places.map((p) => p.id)).toEqual(['lib', 'cafe', 'town-hall']);
    expect(r.places[2]?.name).toBe('Town Hall');
  });
  it('gives a new place its own id when the id is taken', () => {
    const r = addRecord([{ id: 'town-hall', name: 'Old Town Hall', claims: [] }], d({ placeName: 'Town Hall' }), today);
    expect(r.placeId).toBe('town-hall-2');
  });
  it('never adds the same record twice', () => {
    const once = addRecord(places, good, today);
    const twice = addRecord(once.places, good, today);
    expect(twice.outcome).toBe('duplicate');
    expect(twice.places).toBe(once.places);
  });
  it('adds a second record that differs in what is reported, the source or the date', () => {
    const once = addRecord(places, good, today).places;
    expect(addRecord(once, d({ status: 'absent' }), today).outcome).toBe('added');
    expect(addRecord(once, d({ source: 'Transit agency' }), today).outcome).toBe('added');
    expect(addRecord(once, d({ date: '2026-10-02' }), today).outcome).toBe('added');
  });
  it('adds nothing when the form has a problem', () => {
    const r = addRecord(places, d({ licence: 'Proprietary' }), today);
    expect(r).toEqual({ outcome: 'invalid', places, placeId: '', problems: ['licence-not-open'] });
  });
  it('does not change the list it was given', () => {
    const copy = JSON.stringify(places);
    addRecord(places, good, today);
    addRecord(places, d({ placeName: 'New' }), today);
    expect(JSON.stringify(places)).toBe(copy);
  });
});

describe('messages', () => {
  const places: Place[] = [{ id: 'lib', name: 'Library', claims: [] }];
  it('says what was added', () => {
    expect(addMessage(addRecord(places, good, today), good, 'en')).toBe('Added a record for Library: Ramp.');
    const fresh = d({ placeName: 'Hall' });
    expect(addMessage(addRecord(places, fresh, today), fresh, 'en')).toBe('Added Hall with a record: Ramp.');
  });
  it('says when nothing was added', () => {
    const once = addRecord(places, good, today).places;
    expect(addMessage(addRecord(once, good, today), good, 'en')).toBe('Library already has that record. Nothing was added.');
    expect(addMessage(addRecord(places, EMPTY_DRAFT, today), EMPTY_DRAFT, 'en')).toBe('The record was not added. Fix 6 things:');
    const one = d({ date: '' });
    expect(addMessage(addRecord(places, one, today), one, 'en')).toBe('The record was not added. Fix 1 thing:');
  });
  it('is French with its spacing', () => {
    expect(addMessage(addRecord(places, good, today), good, 'fr')).toBe('Fiche ajoutée pour Library\u00a0: Rampe.');
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s, empty, filled and with problems', (lang) => {
    for (const html of [renderRecordForm(lang), renderRecordForm(lang, good, 'Done.'), renderRecordForm(lang, EMPTY_DRAFT, '', draftProblems(EMPTY_DRAFT, today))]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'form')).toEqual([]);
    }
  });
  it('has a label for every control, inside a group with a legend', () => {
    const html = renderRecordForm('en');
    for (const f of DRAFT_FIELDS) expect(html, f).toContain(`<label for="${RECORDFORM_IDS[f]}">`);
    expect(html).toContain('<legend>New record</legend>');
    expect(html).toContain(`id="${RECORDFORM_IDS.add}"`);
  });
  it('offers open licences only, by id and full name', () => {
    const html = renderRecordForm('en');
    for (const id of OPEN_LICENCES) expect(html).toContain(`<option value="${id}">`);
    expect(html).toContain('<option value="CC-BY-4.0">CC-BY-4.0 (Creative Commons Attribution 4.0)</option>');
    expect(html).not.toMatch(/Proprietary|NonCommercial/);
  });
  it('offers only the two things a source can report, and only the tiers that can be shown', () => {
    const html = renderRecordForm('en');
    expect(html).toContain('<option value="present">reported as available</option><option value="absent">reported as not available</option></select>');
    expect(html).toContain('<option value="" selected>No tier</option><option value="tier-0">Tier 0</option><option value="tier-1">Tier 1</option></select>');
    expect(html).not.toContain('Tier 2');
  });
  it('keeps what was typed', () => {
    const html = renderRecordForm('en', good);
    expect(html).toContain('value="Library"');
    expect(html).toContain('<option value="ramp" selected>Ramp</option>');
    expect(html).toContain('<option value="CC0-1.0" selected>');
    expect(html).toContain('value="2026-10-01"');
    expect(html).toContain('<option value="tier-1" selected>Tier 1</option>');
  });
  it('marks each control with a problem and lists the problems in an alert', () => {
    const html = renderRecordForm('en', d({ source: '', date: '2027-01-01' }), '', ['source-missing', 'date-in-future']);
    expect(html).toContain(`id="${RECORDFORM_IDS.source}" class="gl-input" maxlength="${MAX_SOURCE_NAME}" autocomplete="off" value="" aria-invalid="true" aria-describedby="gl-rec-errors"`);
    expect(html).toContain('<div id="gl-rec-errors" role="alert"><p>The record was not added. Fix 2 things:</p><ul><li>Type the name of the source.</li><li>The date cannot be in the future.</li></ul></div>');
    expect(html.match(/aria-invalid="true"/g)).toHaveLength(2);
  });
  it('has no alert and no invalid mark when all is well', () => {
    const html = renderRecordForm('en', good, 'Added.');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('aria-invalid');
    expect(html).toContain('<p role="status" data-gl-recform-msg>Added.</p>');
  });
  it('escapes what was typed and the message', () => {
    const html = renderRecordForm('en', d({ placeName: '"><script>x</script>' }), '<b>m</b>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>m');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = RECORDFORM_UI[lang];
    const texts = [
      ui.heading, ui.intro, ui.legend, ui.placeName, ui.feature, ui.status, ui.source, ui.licence, ui.date, ui.tier, ui.choose, ui.noTier, ui.add,
      ui.added('Library', 'Rampe'), ui.addedPlace('Library', 'Rampe'), ui.duplicate('Library'), ui.invalid(1), ui.invalid(3), ...Object.values(ui.problems),
    ];
    for (const text of texts) {
      expect(lintCopy(text), text).toEqual([]);
      expect(lintClaims(text), text).toEqual([]);
      expect(plainLanguageIssues(text), text).toEqual([]);
      expect(readabilityIssues(text, lang), text).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
    }
  });
});
