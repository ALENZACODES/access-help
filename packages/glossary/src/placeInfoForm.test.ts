import { describe, expect, it } from 'vitest';
import { findBannedCopy } from '../../../qa/src/audit/copy';
import {
  EDIT_KINDS,
  EMPTY_INFO_DRAFT,
  INFOFORM_IDS,
  INFOFORM_UI,
  INFO_FIELDS,
  MAX_AREA_LENGTH,
  OPEN_LICENCES,
  PLACE_KINDS,
  auditHtml,
  cleanInfoDraft,
  draftFromInfo,
  effectiveInfo,
  entryLine,
  frenchIssues,
  infoDraftProblems,
  infoFieldOf,
  infoFromDraft,
  infoMessage,
  lintClaims,
  lintCopy,
  makeEntry,
  plainLanguageIssues,
  readabilityIssues,
  removePlaceInfo,
  renderInfoForm,
  setPlaceInfo,
  undoLabel,
  type EditEntry,
  type InfoDraft,
  type InfoProblem,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const good: InfoDraft = { kind: 'library', area: 'Riverside', source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const draft = (o: Partial<InfoDraft> = {}): InfoDraft => ({ ...good, ...o });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [{ termId: 'ramp', status: 'present', provenance: city }] },
  { id: 'cafe', name: 'Café <b>', claims: [], info: { kind: 'cafe', area: 'Old Town', provenance: city } },
];

describe('infoDraftProblems', () => {
  const problems = (o: Partial<InfoDraft>): readonly InfoProblem[] => infoDraftProblems(draft(o), today);
  it('accepts a kind and an area with a source, an open licence and a real date', () => {
    expect(problems({})).toEqual([]);
    expect(problems({ tier: '' })).toEqual([]);
    expect(problems({ kind: '' })).toEqual([]);
    expect(problems({ area: '' })).toEqual([]);
    expect(problems({ date: today })).toEqual([]);
  });
  it('wants a kind, an area, or both', () => {
    expect(problems({ kind: '', area: '  ' })).toEqual(['nothing-given']);
  });
  it('wants a kind from the list', () => {
    expect(problems({ kind: 'castle' })).toEqual(['kind-not-known']);
    expect(problems({ kind: 'Library' })).toEqual(['kind-not-known']);
    for (const kind of PLACE_KINDS) expect(problems({ kind })).toEqual([]);
  });
  it('wants an area that is not too long, and does not shorten it without saying', () => {
    expect(problems({ area: 'x'.repeat(MAX_AREA_LENGTH) })).toEqual([]);
    expect(problems({ area: 'x'.repeat(MAX_AREA_LENGTH + 1) })).toEqual(['area-too-long']);
  });
  it('wants a source, an open licence and a real date that is not in the future', () => {
    expect(problems({ source: '  ' })).toEqual(['source-missing']);
    expect(problems({ source: 'x'.repeat(200) })).toEqual(['source-too-long']);
    expect(problems({ licence: '' })).toEqual(['licence-not-open']);
    expect(problems({ licence: 'Proprietary' })).toEqual(['licence-not-open']);
    expect(problems({ date: '' })).toEqual(['date-invalid']);
    expect(problems({ date: '2026-02-30' })).toEqual(['date-invalid']);
    expect(problems({ date: '01/10/2026' })).toEqual(['date-invalid']);
    expect(problems({ date: '2026-11-20' })).toEqual(['date-in-future']);
  });
  it('wants a tier that may be shown, or none', () => {
    expect(problems({ tier: 'tier-0' })).toEqual([]);
    expect(problems({ tier: 'tier-4' })).toEqual(['tier-not-known']);
    expect(problems({ tier: 'gold' })).toEqual(['tier-not-known']);
  });
  it('lists every problem at once, in the order of the form', () => {
    expect(infoDraftProblems(EMPTY_INFO_DRAFT, today)).toEqual(['nothing-given', 'source-missing', 'licence-not-open', 'date-invalid']);
  });
  it('knows which box each problem belongs to', () => {
    const all: InfoProblem[] = ['nothing-given', 'kind-not-known', 'area-too-long', 'source-missing', 'source-too-long', 'licence-not-open', 'date-invalid', 'date-in-future', 'tier-not-known'];
    expect(all.map(infoFieldOf)).toEqual(['kind', 'kind', 'area', 'source', 'source', 'licence', 'date', 'date', 'tier']);
    for (const lang of ['en', 'fr'] as const) expect(Object.keys(INFOFORM_UI[lang].problems).sort()).toEqual([...all].sort());
  });
});

describe('drafts', () => {
  it('tidies spaces without cutting anything', () => {
    expect(cleanInfoDraft(draft({ area: '  Old   Town ', source: ' City  open data ', date: ' 2026-10-01 ' }))).toEqual(draft({ area: 'Old Town' }));
  });
  it('makes the info a valid draft stands for', () => {
    expect(infoFromDraft(good)).toEqual({ kind: 'library', area: 'Riverside', provenance: city });
    expect(infoFromDraft(draft({ kind: '', tier: '' }))).toEqual({ area: 'Riverside', provenance: { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' } });
    expect(infoFromDraft(draft({ area: '' }))).toEqual({ kind: 'library', provenance: city });
  });
  it('makes info that may be reported', () => {
    expect(effectiveInfo({ info: infoFromDraft(good) })).toEqual({ kind: 'library', area: 'Riverside', provenance: city });
  });
  it('shows what a place holds now, and round-trips', () => {
    expect(draftFromInfo(undefined)).toEqual(EMPTY_INFO_DRAFT);
    expect(draftFromInfo({ kind: 'library', area: 'Riverside', provenance: city })).toEqual(good);
    expect(draftFromInfo({ area: 'Old Town' })).toEqual({ kind: '', area: 'Old Town', source: '', licence: '', date: '', tier: '' });
    expect(infoFromDraft(draftFromInfo(infoFromDraft(good)))).toEqual(infoFromDraft(good));
    expect(Object.keys(EMPTY_INFO_DRAFT)).toEqual([...INFO_FIELDS]);
  });
});

describe('setPlaceInfo', () => {
  it('sets the kind and area of one place and leaves the others as they are', () => {
    const result = setPlaceInfo(places, 0, good, today);
    expect(result.outcome).toBe('saved');
    expect(result.places[0]).toEqual({ ...places[0], info: { kind: 'library', area: 'Riverside', provenance: city } });
    expect(result.places[1]).toBe(places[1]);
    expect(result.places[0]?.claims).toBe(places[0]?.claims);
  });
  it('does not change the places it was given', () => {
    const before = JSON.stringify(places);
    setPlaceInfo(places, 0, good, today);
    removePlaceInfo(places, 1);
    expect(JSON.stringify(places)).toBe(before);
  });
  it('replaces what the place held', () => {
    const result = setPlaceInfo(places, 1, good, today);
    expect(result.places[1]?.info).toEqual({ kind: 'library', area: 'Riverside', provenance: city });
  });
  it('says so when the place already has this kind and area', () => {
    const result = setPlaceInfo(places, 1, draft({ kind: 'cafe', area: ' Old Town ' }), today);
    expect(result.outcome).toBe('same');
    expect(result.places).toBe(places);
  });
  it('saves nothing for a draft with a problem', () => {
    const result = setPlaceInfo(places, 0, draft({ licence: 'Proprietary', date: '2030-01-01' }), today);
    expect(result.outcome).toBe('invalid');
    expect(result.problems).toEqual(['licence-not-open', 'date-in-future']);
    expect(result.places).toBe(places);
  });
  it('saves nothing when no place is chosen', () => {
    for (const index of [-1, 2, 0.5, Number.NaN]) {
      const result = setPlaceInfo(places, index, good, today);
      expect(result.outcome, String(index)).toBe('missing');
      expect(result.places).toBe(places);
    }
  });
});

describe('removePlaceInfo', () => {
  it('takes the kind and area away and keeps the records', () => {
    const result = removePlaceInfo(places, 1);
    expect(result.outcome).toBe('removed');
    expect(result.places[1]).toEqual({ id: 'cafe', name: 'Café <b>', claims: [] });
    expect('info' in (result.places[1] as Place)).toBe(false);
    expect(result.places[0]).toBe(places[0]);
  });
  it('says so when there is nothing to remove, or no such place', () => {
    expect(removePlaceInfo(places, 0).outcome).toBe('nothing-to-remove');
    expect(removePlaceInfo(places, 9).outcome).toBe('missing');
    expect(removePlaceInfo(places, 0).places).toBe(places);
  });
});

describe('messages', () => {
  it('says what happened', () => {
    expect(infoMessage(setPlaceInfo(places, 0, good, today), 'Library', 'en')).toBe('Saved the kind and area of Library.');
    expect(infoMessage(setPlaceInfo(places, 1, draft({ kind: 'cafe', area: 'Old Town' }), today), 'x', 'en')).toBe('The place already has this kind and area.');
    expect(infoMessage(removePlaceInfo(places, 1), 'Café', 'fr')).toBe('Type et secteur retirés pour Café.');
    expect(infoMessage(removePlaceInfo(places, 0), 'x', 'en')).toBe('This place has no kind or area to remove.');
    expect(infoMessage(setPlaceInfo(places, 9, good, today), 'x', 'en')).toBe('Choose a place first.');
    expect(infoMessage(setPlaceInfo(places, 0, EMPTY_INFO_DRAFT, today), 'x', 'en')).toBe('');
  });
  it('has an undo label and lines in the list of changes', () => {
    expect(undoLabel('info', 'en')).toBe('Undo: kind and area');
    expect(undoLabel('info', 'fr')).toBe('Annuler\u00a0: type et secteur');
    expect(EDIT_KINDS).toContain('place-info');
    expect(entryLine(makeEntry(today, 'place-info', { place: 'Library', detail: 'set' }) as EditEntry, 'en')).toBe('2026-11-19: Set the kind and area of Library.');
    expect(entryLine(makeEntry(today, 'place-info', { place: 'Library', detail: 'removed' }) as EditEntry, 'fr')).toBe('2026-11-19\u00a0: Type et secteur retirés pour Library.');
  });
});

describe('renderInfoForm', () => {
  const form = (o: Partial<Parameters<typeof renderInfoForm>[0]> = {}): string => renderInfoForm({ lang: 'en', places, placeIndex: null, draft: EMPTY_INFO_DRAFT, ...o });
  it('asks for a place first when there are none', () => {
    const html = form({ places: [] });
    expect(html).toContain('<h4>Set the kind and area of a place</h4>');
    expect(html).toContain('Add a place before you set its kind and area.');
    expect(html).not.toContain('<fieldset');
  });
  it('has a labelled control for the place and for each field', () => {
    const html = form();
    expect(html).toContain(`<label for="${INFOFORM_IDS.place}">Place</label><select id="${INFOFORM_IDS.place}" class="gl-select"><option value="" selected>Choose a place</option><option value="0">Library</option><option value="1">Café &lt;b&gt;</option></select>`);
    for (const field of INFO_FIELDS) expect(html, field).toContain(`<label for="${INFOFORM_IDS[field]}">`);
    expect(html.match(/<label /g)).toHaveLength(INFO_FIELDS.length + 1);
    expect(html).toContain(`id="${INFOFORM_IDS.save}">Save the kind and area</button>`);
    expect(html).not.toContain('<b>');
  });
  it('lists every kind and every open licence', () => {
    const html = form();
    for (const kind of PLACE_KINDS) expect(html).toContain(`<option value="${kind}">`);
    for (const licence of OPEN_LICENCES) expect(html).toContain(`<option value="${licence}">`);
    expect(html).toContain('<option value="" selected>Not given</option>');
    expect(html).toContain('<option value="" selected>No tier</option>');
  });
  it('shows the draft in its boxes, escaped', () => {
    const html = form({ placeIndex: 1, draft: draft({ area: 'A "quoted" <area>' }) });
    expect(html).toContain('<option value="1" selected>Café &lt;b&gt;</option>');
    expect(html).toContain('<option value="library" selected>Library</option>');
    expect(html).toContain('value="A &quot;quoted&quot; &lt;area&gt;"');
    expect(html).toContain('<option value="CC0-1.0" selected>');
    expect(html).toContain('<option value="tier-1" selected>');
  });
  it('offers to remove only when the chosen place holds a kind or an area', () => {
    expect(form({ placeIndex: 1 })).toContain(`id="${INFOFORM_IDS.remove}">Remove the kind and area</button>`);
    expect(form({ placeIndex: 0 })).not.toContain(INFOFORM_IDS.remove);
    expect(form()).not.toContain(INFOFORM_IDS.remove);
    expect(form({ placeIndex: 7 })).toContain('<option value="" selected>Choose a place</option>');
  });
  it('lists what to fix as an alert and marks the boxes', () => {
    const html = form({ placeIndex: 0, draft: draft({ licence: '', date: 'soon' }), problems: ['licence-not-open', 'date-invalid'] });
    expect(html).toContain('<div id="gl-pi-errors" role="alert"><p>There are 2 things to fix before this can be saved.</p><ul><li>Choose an open licence from the list.</li><li>Give a real date as year-month-day, such as 2026-06-01.</li></ul></div>');
    expect(html).toContain(`<select id="${INFOFORM_IDS.licence}" class="gl-select" aria-invalid="true" aria-describedby="gl-pi-errors">`);
    expect(html).toContain('value="soon" aria-invalid="true" aria-describedby="gl-pi-errors">');
    expect(html).not.toContain('data-gl-pi-msg');
    expect(html.match(/aria-invalid/g)).toHaveLength(2);
  });
  it('shows the message when there is nothing to fix', () => {
    expect(form({ message: 'Saved the kind and area of <x>.' })).toContain('<p role="status" data-gl-pi-msg>Saved the kind and area of &lt;x&gt;.</p>');
  });
  it('is in French', () => {
    const html = form({ lang: 'fr', placeIndex: 1, problems: ['nothing-given'] });
    expect(html).toContain('<h4>Indiquer le type et le secteur d’un lieu</h4>');
    expect(html).toContain('<option value="library">Bibliothèque</option>');
    expect(html).toContain('Il y a 1 élément à corriger avant l’enregistrement.');
    expect(html).toContain('>Retirer le type et le secteur</button>');
  });
  it('passes the HTML audit in both languages, with and without problems', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const problems of [[], ['source-missing', 'date-in-future']] as InfoProblem[][]) {
        const html = `<div lang="${lang}"><h3>t</h3>${form({ lang, placeIndex: 1, draft: good, problems, message: 'm' })}</div>`;
        expect(auditHtml(html, 'form'), `${lang} ${problems.length}`).toEqual([]);
      }
    }
  });
});

describe('INFOFORM_UI', () => {
  const texts = (lang: Lang): string[] => {
    const ui = INFOFORM_UI[lang];
    return [
      ui.heading, ui.intro, ui.legend, ui.place, ui.choosePlace, ui.kind, ui.noKind, ui.area, ui.source, ui.licence, ui.chooseLicence, ui.date, ui.tier, ui.noTier, ui.save, ui.remove, ui.noPlaces, ui.pickFirst,
      ui.invalid(1), ui.invalid(3), ...Object.values(ui.problems), ui.saved('Library'), ui.same, ui.removed('Library'), ui.nothingToRemove,
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(INFOFORM_UI.fr)).toEqual(Object.keys(INFOFORM_UI.en));
  });
  it('passes the copy rules and the shared audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of texts(lang)) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(findBannedCopy(text, 'form'), text).toEqual([]);
        expect(plainLanguageIssues(text), text).toEqual([]);
        expect(readabilityIssues(text, lang), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
});
