import { describe, expect, it } from 'vitest';
import { findBannedCopy } from '../../../qa/src/audit/copy';
import {
  MAX_OVERVIEW_ROWS,
  STEPS_IDS,
  STEPS_UI,
  STEP_IDS,
  VISIT_SORT,
  auditHtml,
  cellText,
  compareStatusText,
  compareToText,
  pairSteps,
  renderStepsCompare,
  countsLine,
  featureParts,
  featureText,
  firstOpenText,
  frenchIssues,
  knownOf,
  lintClaims,
  lintCopy,
  overviewFilename,
  overviewToCsv,
  parseStepsSeeId,
  plainLanguageIssues,
  readabilityIssues,
  renderStepsOverview,
  renderStepsWalk,
  sortOverview,
  stateText,
  stepFeatureLine,
  stepName,
  stepOverview,
  stepsFilename,
  stepsSeeId,
  stepsToText,
  visitQuestions,
  visitStatusText,
  visitSteps,
  type FeatureClaim,
  type Lang,
  type Observations,
  type Place,
  type Provenance,
  type VisitStep,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const old: Provenance = { source: 'Transit <agency>', licence: 'OGL-Canada-2.0', date: '2024-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance: Provenance = city): FeatureClaim => ({ termId, status, provenance });
const ALL = ['step-free-entrance', 'automatic-door', 'clear-door-width', 'ramp', 'elevator', 'grab-bar', 'accessible-washroom', 'accessible-parking'];
const lib: Place = { id: 'lib', name: 'Library', claims: [c('accessible-parking', 'present'), c('step-free-entrance', 'present'), c('automatic-door', 'absent', old), c('ramp', 'present'), c('ramp', 'absent', old), c('elevator', 'present', old)] };
const cafe: Place = { id: 'cafe', name: 'Café <b>', claims: [] };
const full: Place = { id: 'full', name: 'Full', claims: ALL.map((t) => c(t, 'present')) };
const places = [lib, cafe, full];
const seen: Observations = [
  { placeId: 'lib', termId: 'automatic-door', seen: 'there', date: '2026-11-15' },
  { placeId: 'lib', termId: 'grab-bar', seen: 'there', date: '2026-11-15' },
];
const libSteps = visitSteps(lib, { today, must: ['elevator', 'grab-bar'], seen });
const feature = (steps: readonly VisitStep[], termId: string) => steps.flatMap((s) => s.features).find((f) => f.termId === termId) as VisitStep['features'][number];

describe('the words for one feature', () => {
  it('say the feature and what the records report', () => {
    expect(stepFeatureLine({ termId: 'ramp', state: 'available' }, 'en')).toBe('Ramp: reported as available.');
    expect(stepFeatureLine({ termId: 'ramp', state: 'not-available' }, 'en')).toBe('Ramp: reported as not available.');
    expect(stepFeatureLine({ termId: 'ramp', state: 'unknown' }, 'en')).toBe('Ramp: Unknown.');
    expect(stepFeatureLine({ termId: 'ramp', state: 'disagree' }, 'en')).toBe('Ramp: Unknown, because the sources disagree.');
  });
  it('use the token in French, with French spacing', () => {
    expect(stepFeatureLine({ termId: 'ramp', state: 'unknown' }, 'fr')).toBe('Rampe\u00a0: UNKNOWN.');
    expect(stepFeatureLine({ termId: 'ramp', state: 'disagree' }, 'fr')).toBe('Rampe\u00a0: UNKNOWN, car les sources ne concordent pas.');
    expect(stepFeatureLine({ termId: 'elevator', state: 'available' }, 'fr')).toBe('Ascenseur\u00a0: signalé comme disponible.');
    expect(stateText('unknown', 'fr')).toBe('UNKNOWN');
    expect(stateText('unknown', 'en')).toBe('Unknown');
  });
  it('add the source, the age, the must-have mark and what the person saw, in that order', () => {
    expect(featureParts(feature(libSteps, 'elevator'), 'en')).toEqual(['Elevator: reported as available.', 'Source: Transit <agency>, dated 2024-03-04.', 'Information is old.', 'This is one of your must-haves.']);
    expect(featureParts(feature(libSteps, 'grab-bar'), 'en')).toEqual(['Grab bar: Unknown.', 'This is one of your must-haves.', 'You saw for yourself on 2026-11-15: it was there.']);
    expect(featureParts(feature(libSteps, 'ramp'), 'en')).toEqual(['Ramp: Unknown, because the sources disagree.']);
    expect(featureText(feature(libSteps, 'accessible-parking'), 'en')).toBe('Accessible parking: reported as available. Source: City open data, dated 2026-10-01.');
  });
  it('never turn what the person saw into what the records report', () => {
    const text = featureText(feature(libSteps, 'grab-bar'), 'en');
    expect(text.startsWith('Grab bar: Unknown.')).toBe(true);
    expect(text).not.toContain('reported as available');
  });
  it('are clean French', () => {
    const frSteps = visitSteps(lib, { today, must: ['elevator', 'grab-bar'], seen });
    for (const step of frSteps) for (const f of step.features) expect(frenchIssues(featureText(f, 'fr')), f.termId).toEqual([]);
    expect(featureText(feature(frSteps, 'grab-bar'), 'fr')).toBe('Barre d’appui\u00a0: UNKNOWN. C’est l’un de vos incontournables. Vous avez vu vous-même le 2026-11-15\u00a0: c’était là.');
  });
});

describe('the words for a step and a visit', () => {
  it('name the steps in both languages', () => {
    expect(STEP_IDS.map((id) => stepName(id, 'en'))).toEqual(['Arriving', 'Getting in', 'Moving inside', 'Washroom stop']);
    expect(STEP_IDS.map((id) => stepName(id, 'fr'))).toEqual(['Arriver', 'Entrer', 'Se déplacer à l’intérieur', 'Arrêt aux toilettes']);
    expect(stepName('leaving', 'en')).toBe('leaving');
  });
  it('count a step', () => {
    expect(countsLine({ available: 1, notAvailable: 1, unknown: 2 }, 'en')).toBe('Features of this step that are reported as available: 1. Reported as not available: 1. Where it is Unknown: 2.');
    expect(countsLine({ available: 1, notAvailable: 1, unknown: 2 }, 'fr')).toContain('Où elle est UNKNOWN\u00a0: 2.');
  });
  it('say how much of the visit is still unknown, each feature once', () => {
    expect(visitStatusText(libSteps, 'en')).toBe('Features on this visit that are still Unknown: 4 of 8.');
    expect(visitStatusText(visitSteps(full, { today }), 'en')).toBe('Nothing on this visit is Unknown.');
    expect(visitStatusText(visitSteps(cafe, { today }), 'fr')).toBe('Caractéristiques de cette visite qui restent UNKNOWN\u00a0: 8 sur 8.');
    expect(visitStatusText(visitSteps(full, { today }), 'fr')).toBe('Rien de cette visite n’est UNKNOWN.');
  });
  it('say where the information first runs short, or nothing when it does not', () => {
    expect(firstOpenText(libSteps, 'en')).toBe('The information first runs short at this step: Getting in.');
    expect(firstOpenText(visitSteps(cafe, { today }), 'fr')).toBe('L’information manque d’abord à cette étape\u00a0: Arriver.');
    expect(firstOpenText(visitSteps(full, { today }), 'en')).toBeNull();
  });
  it('give a question for each feature that is still unknown', () => {
    expect(visitQuestions(libSteps, 'en')).toHaveLength(4);
    expect(visitQuestions(libSteps, 'en')[1]).toBe('Is there a ramp? How long is it?');
    expect(visitQuestions(visitSteps(full, { today }), 'en')).toEqual([]);
    for (const q of visitQuestions(visitSteps(cafe, { today }), 'fr')) expect(frenchIssues(q), q).toEqual([]);
  });
});

describe('renderStepsWalk', () => {
  const walk = (o: Partial<Parameters<typeof renderStepsWalk>[0]> = {}): string => renderStepsWalk({ lang: 'en', places, placeIndex: 0, steps: libSteps, canExport: true, ...o });
  it('asks for places when there are none', () => {
    expect(walk({ places: [], placeIndex: null, steps: [] })).toBe('<p class="gl-note">Load places to see a visit step by step.</p>');
  });
  it('is only the labelled list of places until one is chosen', () => {
    const html = walk({ placeIndex: null, steps: [] });
    expect(html).toBe(
      `<label for="${STEPS_IDS.place}">Place for the steps</label><select id="${STEPS_IDS.place}" class="gl-select"><option value="" selected>Choose a place</option>` +
        '<option value="0">Library</option><option value="1">Café &lt;b&gt;</option><option value="2">Full</option></select>',
    );
    expect(walk({ placeIndex: 9, steps: [] })).toBe(html);
  });
  it('heads the visit with the place, a status and where the information first runs short', () => {
    const html = walk();
    expect(html).toContain('<option value="0" selected>Library</option>');
    expect(html).toContain('<h4 id="gl-steps-title" tabindex="-1">A visit to Library, step by step</h4><p role="status">Features on this visit that are still Unknown: 4 of 8.</p><p data-gl-steps-first>The information first runs short at this step: Getting in.</p>');
  });
  it('sets out the steps in order, each with its outcome, its counts and its features', () => {
    const html = walk();
    expect(html.match(/<li data-step="[a-z-]+" data-outcome="[a-z-]+"><h5>/g)).toHaveLength(4);
    expect(html.indexOf('data-step="arriving"')).toBeLessThan(html.indexOf('data-step="getting-in"'));
    expect(html.indexOf('data-step="moving-inside"')).toBeLessThan(html.indexOf('data-step="washroom-stop"'));
    expect(html).toContain('<li data-step="getting-in" data-outcome="some-not-available"><h5>Getting in</h5><p>A feature of this step is reported as not available.</p>');
    expect(html).toContain('<li data-state="disagree">Ramp: Unknown, because the sources disagree.</li>');
    expect(html.match(/<li data-state="unknown">Clear door width: Unknown\.<\/li>/g)).toHaveLength(3);
  });
  it('escapes names and sources', () => {
    const html = walk();
    expect(html).toContain('Source: Transit &lt;agency&gt;, dated 2024-03-04.');
    expect(html).not.toContain('<agency>');
    expect(walk({ placeIndex: 1, steps: visitSteps(cafe, { today }) })).toContain('A visit to Café &lt;b&gt;, step by step');
  });
  it('lists the open must-haves, where the person’s notes differ, and questions to ask', () => {
    const html = walk();
    expect(html).toContain('<h5>Must-haves the records do not report as available</h5><ul data-steps-list="must"><li>Grab bar: Unknown.</li></ul>');
    expect(html).toContain('<h5>Where what you saw differs from the records</h5><ul data-steps-list="differs"><li>Automatic door: reported as not available.');
    expect(html).toContain('<h5>Questions you could ask the place</h5><ul data-steps-list="ask"><li>How wide is the clear opening of the door?</li>');
  });
  it('leaves those lists out when they would be empty', () => {
    const html = walk({ placeIndex: 2, steps: visitSteps(full, { today }) });
    expect(html).not.toContain('data-steps-list');
    expect(html).not.toContain('data-gl-steps-first');
    expect(html).toContain('<p role="status">Nothing on this visit is Unknown.</p>');
    expect(html.match(/data-outcome="all-reported-available"/g)).toHaveLength(4);
  });
  it('offers to save the steps only when the host can save files', () => {
    expect(walk()).toContain(`id="${STEPS_IDS.exportText}">Save these steps as text</button>`);
    expect(walk({ canExport: false })).not.toContain(STEPS_IDS.exportText);
  });
  it('never calls a place or a step accessible, easy or safe', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const place of places) {
        const html = walk({ lang, placeIndex: places.indexOf(place), steps: visitSteps(place, { today, seen }) }).replace(/<select.*?<\/select>/, '');
        expect(html.replace(/accessible (parking|washroom)|stationnement accessible|toilettes? accessibles?/gi, '')).not.toMatch(/accessible|easy|facile|safe|sécuritaire/i);
      }
    }
  });
  it('is French', () => {
    const html = walk({ lang: 'fr' });
    expect(html).toContain('<h4 id="gl-steps-title" tabindex="-1">Une visite à Library, étape par étape</h4>');
    expect(html).toContain('<li data-state="unknown">Largeur libre de porte\u00a0: UNKNOWN.</li>');
    expect(html).toContain('>Enregistrer ces étapes en texte</button>');
    expect(html).not.toMatch(/inconnu/i);
  });
  it('passes the HTML audit in both languages, for a chosen place and for none', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const index of [0, 1, 2, null]) {
        const steps = index === null ? [] : visitSteps(places[index] as Place, { today, seen, must: ['ramp'] });
        expect(auditHtml(`<div lang="${lang}"><h3>t</h3>${walk({ lang, placeIndex: index, steps })}</div>`, 'steps'), `${lang} ${index}`).toEqual([]);
      }
    }
  });
});

describe('renderStepsCompare', () => {
  const pair = (a: Place, b: Place) => pairSteps(visitSteps(a, { today }), visitSteps(b, { today }));
  const compare = (o: Partial<Parameters<typeof renderStepsCompare>[0]> = {}): string => renderStepsCompare({ lang: 'en', places, placeIndex: 0, otherIndex: 2, paired: pair(lib, full), ...o });
  it('is nothing until a place is chosen, or when there is no second place', () => {
    expect(compare({ placeIndex: null })).toBe('');
    expect(compare({ placeIndex: 7 })).toBe('');
    expect(compare({ places: [lib], otherIndex: null })).toBe('');
  });
  it('offers every other place, and not the place itself', () => {
    const html = compare({ otherIndex: null, paired: [] });
    expect(html).toBe(
      `<label for="${STEPS_IDS.other}">Compare with another place</label><select id="${STEPS_IDS.other}" class="gl-select"><option value="" selected>No other place</option>` +
        '<option value="1">Café &lt;b&gt;</option><option value="2">Full</option></select>',
    );
    expect(compare({ otherIndex: 0 })).toBe(html);
    expect(compare({ otherIndex: 9 })).toBe(html);
  });
  it('heads the two visits with both names and counts where the records differ', () => {
    const html = compare();
    expect(html).toContain('<option value="2" selected>Full</option>');
    expect(html).toContain('<h5 id="gl-steps-compare-title">Library and Full, side by side</h5><p role="status" data-gl-steps-compare>Features where the records differ between the two places: 5 of 8.</p>');
  });
  it('has one table for each step, with a caption, column headers for both places and a row header for each feature', () => {
    const html = compare();
    expect(html.match(/<table class="gl-compare" data-step="/g)).toHaveLength(4);
    expect(html).toContain('<caption>Getting in: what the records report for each place</caption><thead><tr><th scope="col">Feature</th><th scope="col">Library</th><th scope="col">Full</th></tr></thead>');
    expect(html).toContain('<tr data-differs="false"><th scope="row">Step-free entrance</th><td data-state="available">Reported as available</td><td data-state="available">Reported as available</td></tr>');
    expect(html.match(/role="region" aria-label="[^"]+" tabindex="0"/g)).toHaveLength(4);
  });
  it('marks the cells that differ, and keeps unknown as unknown', () => {
    const html = compare();
    expect(html).toContain('<tr data-differs="true"><th scope="row">Automatic door</th><td data-state="not-available"><strong>Reported as not available</strong></td><td data-state="available"><strong>Reported as available</strong></td></tr>');
    expect(html).toContain('<tr data-differs="true"><th scope="row">Ramp</th><td data-state="disagree"><strong>Unknown, because the sources disagree</strong></td>');
    expect(html).toContain('<td data-state="unknown"><strong>Unknown</strong></td>');
  });
  it('says so when the records report the same, and counts what is unknown for both', () => {
    expect(compareStatusText(pair(full, full), 'en')).toBe('The records report the same for both places.');
    expect(compareStatusText(pair(cafe, cafe), 'en')).toBe('The records report the same for both places. Features that are Unknown for both places: 8.');
    expect(compareStatusText(pair(lib, cafe), 'en')).toBe('Features where the records differ between the two places: 4 of 8. Features that are Unknown for both places: 4.');
  });
  it('escapes the names of both places', () => {
    const html = compare({ otherIndex: 1, paired: pair(lib, cafe) });
    expect(html).toContain('<h5 id="gl-steps-compare-title">Library and Café &lt;b&gt;, side by side</h5>');
    expect(html).toContain('<th scope="col">Café &lt;b&gt;</th>');
    expect(html).not.toContain('<b>');
  });
  it('never says which place is better', () => {
    for (const lang of ['en', 'fr'] as const) expect(compare({ lang })).not.toMatch(/better|best|mieux|meilleur|recommend|recommand/i);
  });
  it('is French with the token, and passes the HTML audit in both languages', () => {
    const html = compare({ lang: 'fr', otherIndex: 1, paired: pair(lib, cafe) });
    expect(html).toContain('<h5 id="gl-steps-compare-title">Library et Café &lt;b&gt;, côte à côte</h5>');
    expect(html).toContain('Caractéristiques où les fiches diffèrent entre les deux lieux\u00a0: 4 sur 8. Caractéristiques qui sont UNKNOWN pour les deux lieux\u00a0: 4.');
    expect(html).toContain('<caption>Entrer\u00a0: ce que les fiches signalent pour chaque lieu</caption>');
    expect(html).toContain('<td data-state="unknown">UNKNOWN</td>');
    for (const lang of ['en', 'fr'] as const) {
      for (const otherIndex of [1, 2, null]) {
        const page = `<div lang="${lang}"><h3>t</h3><h4>t</h4>${compare({ lang, otherIndex, paired: otherIndex === null ? [] : pair(lib, places[otherIndex] as Place) })}</div>`;
        expect(auditHtml(page, 'steps-compare'), `${lang} ${otherIndex}`).toEqual([]);
      }
    }
  });
});

describe('two visits side by side as text', () => {
  const paired = pairSteps(visitSteps(lib, { today }), visitSteps(full, { today }));
  it('names both places on every line', () => {
    const text = compareToText(lib, full, paired, 'en');
    expect(text.startsWith('Library and Full, side by side\nFeatures where the records differ between the two places: 5 of 8.\n\nArriving\n- Step-free entrance: Library: reported as available. Full: reported as available.\n')).toBe(true);
    expect(text).toContain('\n\nGetting in\n');
    expect(text).toContain('- Ramp: Library: Unknown, because the sources disagree. Full: reported as available.\n');
    expect(text.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(11);
  });
  it('is French with French spacing', () => {
    const text = compareToText(lib, cafe, pairSteps(visitSteps(lib, { today }), visitSteps(cafe, { today })), 'fr');
    expect(text).toContain('- Rampe\u00a0: Library\u00a0: UNKNOWN, car les sources ne concordent pas. Café <b>\u00a0: UNKNOWN.\n');
    expect(frenchIssues(text)).toEqual([]);
  });
});

describe('the steps as text', () => {
  it('follows the page: title, status, each step with a number, then the three lists', () => {
    const text = stepsToText(lib, libSteps, 'en', today);
    expect(text.startsWith('A visit to Library, step by step\nMade on 2026-11-19 from the loaded records.\n\nFeatures on this visit that are still Unknown: 4 of 8.\nThe information first runs short at this step: Getting in.\n\n1. Arriving\nEvery feature of this step is reported as available.\n- Step-free entrance: reported as available. Source: City open data, dated 2026-10-01.\n')).toBe(true);
    expect(text).toContain('\n\n2. Getting in\nA feature of this step is reported as not available.\n');
    expect(text).toContain('\n\n4. Washroom stop\nPart of this step is still Unknown.\n- Clear door width: Unknown.\n');
    expect(text).toContain('\n\nMust-haves the records do not report as available\n- Grab bar: Unknown.\n');
    expect(text).toContain('\n\nWhere what you saw differs from the records\n- Automatic door: reported as not available.');
    expect(text.endsWith('\n- Is there an accessible washroom? Is it on the same floor as the entrance?\n')).toBe(true);
  });
  it('has no extra lists for a place where everything is reported', () => {
    const text = stepsToText(full, visitSteps(full, { today }), 'en', today);
    expect(text).not.toContain('Questions you could ask');
    expect(text).not.toContain('Must-haves');
    expect(text.split('\n').filter((l) => /^\d\. /.test(l))).toEqual(['1. Arriving', '2. Getting in', '3. Moving inside', '4. Washroom stop']);
  });
  it('is French with French spacing, and has a file name for each language', () => {
    const text = stepsToText(lib, libSteps, 'fr', today);
    expect(text.startsWith('Une visite à Library, étape par étape\nCréé le 2026-11-19 à partir des fiches chargées.\n')).toBe(true);
    expect(frenchIssues(text)).toEqual([]);
    expect(stepsFilename('en')).toBe('visit-step-by-step-en.txt');
    expect(stepsFilename('fr')).toBe('visit-step-by-step-fr.txt');
  });
});

describe('renderStepsOverview', () => {
  const rows = (lang: Lang = 'en', sort = VISIT_SORT) => sortOverview(stepOverview(places), sort, lang);
  const table = (o: Partial<Parameters<typeof renderStepsOverview>[0]> = {}): string => renderStepsOverview({ lang: 'en', rows: rows(), scope: 'all', sort: VISIT_SORT, canExport: true, ...o });
  it('says what a cell means, and that it is not what the records report', () => {
    expect(table()).toContain('<h4>How much is known, place by place</h4><p>Each cell says how many features of a step have a usable record. It does not say what the records report.</p>');
  });
  it('has labelled lists to narrow and to order, showing the choices made', () => {
    const html = table({ scope: 'saved', sort: 'getting-in' });
    expect(html).toContain(`<label for="${STEPS_IDS.scope}">Places to list</label>`);
    expect(html).toContain('<option value="saved" selected>Saved places</option>');
    expect(html).toContain(`<label for="${STEPS_IDS.sort}">Order by</label>`);
    expect(html).toContain('<option value="getting-in" selected>Most known for: Getting in</option>');
    expect(html.match(/<option value="[a-z-]+"( selected)?>Most known for/g)).toHaveLength(5);
  });
  it('has a row header for each place, a cell for each step and for the whole visit, and a labelled button', () => {
    const html = table();
    expect(html).toContain('<th scope="col">Place</th><th scope="col">Arriving</th><th scope="col">Getting in</th><th scope="col">Moving inside</th><th scope="col">Washroom stop</th><th scope="col">Whole visit</th><th scope="col">Steps</th>');
    expect(html).toContain(
      '<tr><th scope="row">Library</th><td data-unknown="0">2 of 2 known</td><td data-unknown="2">2 of 4 known</td><td data-unknown="1">1 of 2 known</td><td data-unknown="3">0 of 3 known</td><td data-unknown="4">4 of 8 known</td>' +
        `<td><button type="button" class="gl-btn" id="${stepsSeeId(0)}" aria-label="See the steps of a visit to Library">See the steps</button></td></tr>`,
    );
    expect(html).toContain('<th scope="row">Café &lt;b&gt;</th>');
    expect(html).toContain('aria-label="See the steps of a visit to Café &lt;b&gt;"');
  });
  it('keeps the order it was given', () => {
    const html = table({ rows: rows('en', 'name'), sort: 'name' });
    expect(html.indexOf('>Café &lt;b&gt;</th>')).toBeLessThan(html.indexOf('>Full</th>'));
    expect(html.indexOf('>Full</th>')).toBeLessThan(html.indexOf('>Library</th>'));
    expect(table().indexOf('>Full</th>')).toBeLessThan(table().indexOf('>Library</th>'));
  });
  it('sums the places listed', () => {
    expect(table()).toContain('<p role="status">Places listed: 3. Places where nothing is Unknown: 1. Places where everything is Unknown: 1.</p>');
  });
  it('counts a record that says not available as known', () => {
    expect(knownOf({ available: 1, notAvailable: 2, unknown: 3 })).toBe(3);
    expect(cellText({ available: 1, notAvailable: 2, unknown: 3 }, 'en')).toBe('3 of 6 known');
    expect(cellText({ available: 0, notAvailable: 0, unknown: 2 }, 'fr')).toBe('0 sur 2 connues');
  });
  it('says so when the choice of places leaves none, and still lets the person choose again', () => {
    const html = table({ rows: [], scope: 'plan' });
    expect(html).toContain('<p class="gl-note" data-gl-steps-empty>Your plan has no places.</p>');
    expect(html).toContain(`<select id="${STEPS_IDS.scope}"`);
    expect(html).not.toContain('<table');
    expect(table({ rows: [], scope: 'saved' })).toContain('You have no saved places.');
  });
  it('shows a limited number of rows and says how many are left out', () => {
    const many = stepOverview(Array.from({ length: MAX_OVERVIEW_ROWS + 3 }, (_, i) => ({ id: `p${i}`, name: `Place ${i}`, claims: [] })));
    const html = table({ rows: many });
    expect(html.match(/<tr><th scope="row">/g)).toHaveLength(MAX_OVERVIEW_ROWS);
    expect(html).toContain('<p class="gl-note" data-gl-steps-more>3 more places are not shown. The saved table has every place.</p>');
    expect(table({ rows: many, limit: MAX_OVERVIEW_ROWS + 2 })).toContain('1 more place is not shown.');
    expect(table()).not.toContain('data-gl-steps-more');
  });
  it('offers to save the table only when the host can save files', () => {
    expect(table()).toContain(`id="${STEPS_IDS.exportTable}">Save the table of steps for a spreadsheet</button>`);
    expect(table({ canExport: false })).not.toContain(STEPS_IDS.exportTable);
  });
  it('is French and passes the HTML audit in both languages', () => {
    const html = table({ lang: 'fr', rows: rows('fr') });
    expect(html).toContain('<p role="status">Lieux affichés\u00a0: 3. Lieux où rien n’est UNKNOWN\u00a0: 1. Lieux où tout est UNKNOWN\u00a0: 1.</p>');
    expect(html).toContain('<option value="washroom-stop">Le plus connu pour\u00a0: Arrêt aux toilettes</option>');
    for (const lang of ['en', 'fr'] as const) {
      expect(auditHtml(`<div lang="${lang}"><h3>t</h3>${table({ lang, rows: rows(lang) })}</div>`, 'overview'), lang).toEqual([]);
      expect(auditHtml(`<div lang="${lang}"><h3>t</h3>${table({ lang, rows: [], scope: 'saved' })}</div>`, 'overview-empty'), lang).toEqual([]);
    }
  });
});

describe('the buttons to see the steps', () => {
  it('round-trip the position of the place', () => {
    for (const index of [0, 12, 4999]) expect(parseStepsSeeId(stepsSeeId(index))).toBe(index);
  });
  it('are not confused with the other controls', () => {
    for (const id of [...Object.values(STEPS_IDS), 'gl-steps-see-', 'gl-steps-see-x', 'gl-steps-see-123456', 'gl-seen-rm-1', '']) expect(parseStepsSeeId(id), id).toBeNull();
  });
});

describe('the table for a spreadsheet', () => {
  const rows = sortOverview(stepOverview(places), VISIT_SORT, 'en');
  it('has three counts for each step and for the whole visit', () => {
    const lines = overviewToCsv(rows, 'en').split('\r\n');
    expect(lines[0]?.split(',')).toHaveLength(16);
    expect(lines[0]?.startsWith('Place,Arriving: reported as available,Arriving: reported as not available,Arriving: Unknown,Getting in: reported as available,')).toBe(true);
    expect(lines[0]?.endsWith(',Whole visit: reported as available,Whole visit: reported as not available,Whole visit: Unknown')).toBe(true);
    expect(lines.slice(1)).toEqual(['Full,2,0,0,4,0,0,2,0,0,3,0,0,8,0,0', 'Library,2,0,0,1,1,2,1,0,1,0,0,3,3,1,4', 'Café <b>,0,0,2,0,0,4,0,0,2,0,0,3,0,0,8', '']);
  });
  it('writes every row, also past what the page shows', () => {
    const many = stepOverview(Array.from({ length: MAX_OVERVIEW_ROWS + 3 }, (_, i) => ({ id: `p${i}`, name: `Place ${i}`, claims: [] })));
    expect(overviewToCsv(many, 'en').trimEnd().split('\r\n')).toHaveLength(MAX_OVERVIEW_ROWS + 4);
  });
  it('quotes a name with a comma and guards one a spreadsheet could run', () => {
    const risky = stepOverview([{ id: 'a', name: 'Hall, east', claims: [] }, { id: 'b', name: '=SUM(A1)', claims: [] }]);
    const csv = overviewToCsv(risky, 'en');
    expect(csv).toContain('\r\n"Hall, east",0,0,2,');
    expect(csv).toContain("\r\n'=SUM(A1),0,0,2,");
  });
  it('is French with the token, and has a file name for each language', () => {
    const head = overviewToCsv(rows, 'fr').split('\r\n')[0] ?? '';
    expect(head.startsWith('Lieu,Arriver\u00a0: signalé comme disponible,Arriver\u00a0: signalé comme non disponible,Arriver\u00a0: UNKNOWN,')).toBe(true);
    expect(overviewFilename('en')).toBe('visit-steps-by-place-en.csv');
    expect(overviewFilename('fr')).toBe('visit-steps-by-place-fr.csv');
  });
  it('is only a header for no places', () => {
    expect(overviewToCsv([], 'en').split('\r\n')).toHaveLength(2);
  });
});

describe('STEPS_UI', () => {
  const texts = (lang: Lang): string[] => {
    const ui = STEPS_UI[lang];
    return [
      ui.heading, ui.intro, ui.place, ui.choosePlace, ui.noPlaces, ui.title('Library'), ...Object.values(ui.states), ui.source('City open data', '2026-10-01'), ui.must, ui.seen('2026-11-15', 'it was there'),
      ...Object.values(ui.outcomes), ui.counts(1, 2, 3), ui.visitStatus(0, 8), ui.visitStatus(3, 8), ui.firstOpen('Getting in'), ui.mustOpenHeading, ui.differsHeading, ui.askHeading, ui.exportSteps,
      ui.madeOn('2026-11-19'), ui.shown('Library'), ui.compareLabel, ui.compareNone, ui.compareHeading('Library', 'Hall'), ui.compareSame, ui.compareDiffer(3, 8), ui.compareBothUnknown(2), ui.compareCaption('Getting in'), ui.colFeature, ui.overviewHeading, ui.overviewIntro, ui.scopeLabel, ...Object.values(ui.scopes), ...Object.values(ui.scopeEmpty), ui.sortLabel, ui.sortName, ui.sortVisit,
      ui.sortStep('Getting in'), ui.cell(2, 4), ui.colPlace, ui.colVisit, ui.colSee, ui.see, ui.seeLabel('Library'), ui.caption, ui.totals(3, 1, 1), ui.more(1), ui.more(4), ui.exportTable, ...Object.values(ui.csv),
    ];
  };
  it('has the same keys in both languages, at every level', () => {
    const keys = (x: object): string[] => Object.entries(x).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? keys(v).map((s) => `${k}.${s}`) : [k]));
    expect(keys(STEPS_UI.fr)).toEqual(keys(STEPS_UI.en));
  });
  it('passes the copy rules and the shared audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of texts(lang)) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(findBannedCopy(text, 'steps'), text).toEqual([]);
        expect(plainLanguageIssues(text), text).toEqual([]);
        expect(readabilityIssues(text, lang), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
  it('gives no advice about health or about what a person may get, and does not say a visit will go well', () => {
    for (const lang of ['en', 'fr'] as const) for (const text of texts(lang)) expect(text).not.toMatch(/doctor|médecin|eligib|admissib|you can go|vous pouvez y aller|should|devriez/i);
  });
});
