import { describe, expect, it } from 'vitest';
import {
  MAX_PLAN_PLACES,
  PLAN_UI,
  askId,
  auditHtml,
  buildPlan,
  frenchIssues,
  isAsked,
  lintCopy,
  parseAskId,
  parsePlan,
  placeProgressText,
  planToText,
  planTotals,
  progressText,
  renderPlan,
  serialisePlan,
  setAsked,
  type FeatureClaim,
  type Place,
} from './index';

const today = '2026-11-15';
const yes = (termId: string): FeatureClaim => ({
  termId,
  status: 'present',
  provenance: { source: 'City open data', licence: 'CC0-1.0', date: '2026-06-01' },
});
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp')] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
  { id: 'done', name: 'Done hall', claims: [yes('ramp'), yes('elevator')] },
];
const terms = ['ramp', 'elevator'];

describe('setAsked / isAsked', () => {
  it('ticks and unticks, without changing the input', () => {
    const one = setAsked({}, 'a', 'ramp', true);
    expect(isAsked(one, 'a', 'ramp')).toBe(true);
    const none = setAsked(one, 'a', 'ramp', false);
    expect(isAsked(none, 'a', 'ramp')).toBe(false);
    expect(isAsked(one, 'a', 'ramp')).toBe(true);
  });

  it('removes the place when its last tick is removed', () => {
    expect(setAsked({ a: ['ramp'] }, 'a', 'ramp', false)).toEqual({});
  });

  it('returns the same object when nothing changes', () => {
    const plan = { a: ['ramp'] };
    expect(setAsked(plan, 'a', 'ramp', true)).toBe(plan);
    expect(setAsked(plan, 'a', 'elevator', false)).toBe(plan);
  });

  it('does not read names from the prototype', () => {
    expect(isAsked({}, 'constructor', 'ramp')).toBe(false);
    expect(isAsked({}, '__proto__', 'ramp')).toBe(false);
  });

  it('keeps the newest places when over the cap', () => {
    let plan: Record<string, readonly string[]> = {};
    for (let i = 0; i < MAX_PLAN_PLACES + 3; i += 1) plan = { ...setAsked(plan, `p${i}`, 'ramp', true) };
    expect(Object.keys(plan)).toHaveLength(MAX_PLAN_PLACES);
    expect(isAsked(plan, 'p0', 'ramp')).toBe(false);
    expect(isAsked(plan, `p${MAX_PLAN_PLACES + 2}`, 'ramp')).toBe(true);
  });
});

describe('serialisePlan / parsePlan', () => {
  it('round-trips', () => {
    const plan = { a: ['ramp', 'elevator'], b: ['grab-bar'] };
    expect(parsePlan(serialisePlan(plan))).toEqual(plan);
  });

  it('drops bad entries and duplicates', () => {
    expect(parsePlan('{"a":["ramp","ramp",3],"b":"x","c":[],"d":null}')).toEqual({ a: ['ramp'] });
  });

  it.each(['nope', '[]', '"x"', '5', 'null'])('rejects %s', (text) => {
    expect(parsePlan(text)).toBeNull();
  });
});

describe('askId / parseAskId', () => {
  it('round-trips ids with hyphens', () => {
    expect(parseAskId(askId(12, 'step-free-entrance'))).toEqual({ index: 12, termId: 'step-free-entrance' });
  });

  it.each(['gl-ask-', 'gl-ask-x-ramp', 'gl-ask-1-', 'gl-ask-1-RAMP', 'gl-save-1', 'gl-ask-1-ra mp'])('rejects %s', (id) => {
    expect(parseAskId(id)).toBeNull();
  });
});

describe('buildPlan', () => {
  it('has an entry for each saved place that has something to ask, in the order saved', () => {
    const e = buildPlan(places, ['cafe', 'lib', 'done'], terms, today, 'en', {});
    expect(e.map((x) => [x.placeId, x.index, x.items.map((i) => i.termId)])).toEqual([
      ['cafe', 1, ['ramp', 'elevator']],
      ['lib', 0, ['elevator']],
    ]);
  });

  it('skips saved ids that are not in the places', () => {
    expect(buildPlan(places, ['gone'], terms, today, 'en', {})).toEqual([]);
  });

  it('marks the questions that were ticked and counts them', () => {
    const e = buildPlan(places, ['cafe'], terms, today, 'en', { cafe: ['elevator'] });
    expect(e[0]?.items.map((i) => i.asked)).toEqual([false, true]);
    expect(e[0]?.asked).toBe(1);
  });

  it('ignores ticks for questions that no longer apply', () => {
    const e = buildPlan(places, ['lib'], terms, today, 'en', { lib: ['ramp'] });
    expect(e[0]?.items.map((i) => i.termId)).toEqual(['elevator']);
    expect(e[0]?.asked).toBe(0);
  });

  it('adds up totals', () => {
    const e = buildPlan(places, ['cafe', 'lib'], terms, today, 'en', { cafe: ['ramp', 'elevator'] });
    expect(planTotals(e)).toEqual({ asked: 2, total: 3 });
    expect(planTotals([])).toEqual({ asked: 0, total: 0 });
  });
});

describe('renderPlan', () => {
  const entries = buildPlan(places, ['cafe', 'lib'], terms, today, 'en', { cafe: ['ramp'] });

  it('says how to plan when nothing is saved', () => {
    expect(renderPlan([], 0, 'en')).toContain('Save a place to plan what to ask.');
  });

  it('says so when saved places have nothing to ask', () => {
    const html = renderPlan([], 1, 'en');
    expect(html).toContain('Nothing to ask');
    expect(html).not.toContain('<input');
  });

  it('makes one labelled group per place with one tick box per question', () => {
    const html = renderPlan(entries, 2, 'en');
    expect(html).toContain('<legend>Café Nord</legend>');
    expect(html.match(/type="checkbox"/g)).toHaveLength(3);
    expect(html).toMatch(/id="gl-ask-1-ramp" checked/);
    expect(html).not.toMatch(/id="gl-ask-1-elevator" checked/);
    expect(html).toContain('for="gl-ask-0-elevator"');
  });

  it('announces progress politely', () => {
    const html = renderPlan(entries, 2, 'en');
    expect(html).toContain('<p role="status" aria-live="polite">1 of 3 questions asked</p>');
    expect(html).toContain('Café Nord: 1 of 2 asked');
  });

  it('says the ticks are the person’s own record', () => {
    expect(renderPlan(entries, 2, 'en')).toContain('Your ticks stay on this device.');
  });

  it('escapes place names and questions', () => {
    const e = buildPlan([{ id: 'x', name: '<b>Bold</b>', claims: [] }], ['x'], ['ramp'], today, 'en', {});
    expect(renderPlan(e, 1, 'en')).not.toContain('<b>Bold');
  });

  it('passes the HTML audit in both languages, for every state', () => {
    for (const lang of ['en', 'fr'] as const) {
      const e = buildPlan(places, ['cafe', 'lib'], terms, today, lang, { cafe: ['ramp'] });
      for (const html of [renderPlan(e, 2, lang), renderPlan([], 0, lang), renderPlan([], 2, lang)]) {
        const wrapped = `<main lang="${lang === 'en' ? 'en-CA' : 'fr-CA'}">${html}</main>`;
        expect(auditHtml(`plan.${lang}`, wrapped).filter((f) => f.severity === 'error')).toEqual([]);
        expect(lintCopy(html.replace(/<[^>]+>/g, ' '))).toEqual([]);
      }
    }
  });
});

describe('progress wording', () => {
  it('pluralises English and French correctly', () => {
    expect(progressText(1, 3, 'en')).toBe('1 of 3 questions asked');
    expect(progressText(0, 3, 'fr')).toBe('0 question posée sur 3');
    expect(progressText(1, 3, 'fr')).toBe('1 question posée sur 3');
    expect(progressText(2, 3, 'fr')).toBe('2 questions posées sur 3');
  });

  it('keeps French spacing in the place line', () => {
    const t = placeProgressText('Café', 2, 5, 'fr');
    expect(t).toBe('Café : 2 questions posées sur 5');
    expect(frenchIssues(t)).toEqual([]);
  });

  it('has clean French strings', () => {
    for (const s of [PLAN_UI.fr.heading, PLAN_UI.fr.intro, PLAN_UI.fr.noSaved, PLAN_UI.fr.nothing, PLAN_UI.fr.exportPlan]) {
      expect(frenchIssues(s)).toEqual([]);
    }
  });
});

describe('planToText', () => {
  const entries = buildPlan(places, ['cafe', 'lib'], terms, today, 'en', { cafe: ['ramp'] });

  it('lists each place with [x] for asked and [ ] for not yet', () => {
    expect(planToText(entries, 'en')).toBe(
      [
        'Visit plan',
        '',
        'Café Nord:',
        '  [x] Is there a ramp? How long is it?',
        '  [ ] Is there an elevator? Which floors does it reach?',
        '',
        'Library:',
        '  [ ] Is there an elevator? Which floors does it reach?',
        '',
        '1 of 3 questions asked',
        '',
      ].join('\n'),
    );
  });

  it('is only a title for an empty plan', () => {
    expect(planToText([], 'en')).toBe('Visit plan\n');
  });

  it('is clean French', () => {
    const t = planToText(buildPlan(places, ['cafe'], terms, today, 'fr', {}), 'fr');
    expect(t).toContain('Café Nord :');
    expect(frenchIssues(t)).toEqual([]);
  });
});
