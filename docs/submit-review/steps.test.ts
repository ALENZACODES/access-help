import { describe, expect, it } from 'vitest';
import { reviewBatch } from './review.js';
import { STEP_IDS, cleanTicks, doneCount, heldBack, heldBackText, isStepId, nextStep, progressText, setTick, stepsFor } from './steps.js';

const record = {
  id: 'p1', lat: 43.856123, lon: -79.452341, name: 'A', wheelchair: 'yes' as const,
  source: 'own site visit', licence: 'ODbL-1.0', observedOn: '2026-11-01',
};

describe('stepsFor', () => {
  it('lists every step in order in both languages, each with a title and a body', () => {
    for (const lang of ['en', 'fr'] as const) {
      const steps = stepsFor(lang);
      expect(steps.map((s) => s.id)).toEqual([...STEP_IDS]);
      for (const step of steps) {
        expect(step.title.length).toBeGreaterThan(8);
        expect(step.body.length).toBeGreaterThan(30);
      }
    }
  });
  it('makes clear the person submits, not the App', () => {
    const submit = stepsFor('en').find((s) => s.id === 'submit');
    expect(submit?.body).toMatch(/your action, not the App/);
    expect(stepsFor('fr').find((s) => s.id === 'submit')?.body).toMatch(/pas celui de l’application/);
  });
  it('says UNKNOWN stays UNKNOWN in the first step', () => {
    expect(stepsFor('en')[0]?.body).toContain('UNKNOWN');
    expect(stepsFor('fr')[0]?.body).toContain('UNKNOWN');
  });
  it('does not ask for a password', () => {
    for (const step of stepsFor('en')) expect(step.body).not.toMatch(/enter your password/i);
  });
});

describe('ticks', () => {
  it('keeps only known step ids set to true', () => {
    expect(cleanTicks({ review: true, nope: true, submit: false, tags: 'yes' })).toEqual({ review: true });
    expect(cleanTicks(null)).toEqual({});
    expect(cleanTicks([])).toEqual({});
    expect(cleanTicks('review')).toEqual({});
  });
  it('sets and clears a tick without changing the original', () => {
    const start = {};
    const one = setTick(start, 'review', true);
    expect(one).toEqual({ review: true });
    expect(start).toEqual({});
    expect(setTick(one, 'review', false)).toEqual({});
  });
  it('counts and words progress', () => {
    expect(doneCount({ review: true, licence: true })).toBe(2);
    expect(progressText({ review: true }, 'en')).toBe('1 of 8 steps ticked');
    expect(progressText({}, 'fr')).toBe('0 sur 8 étapes cochées');
  });
  it('finds the next step to do', () => {
    expect(nextStep({})).toBe('review');
    expect(nextStep({ review: true, download: true })).toBe('licence');
    expect(nextStep(Object.fromEntries(STEP_IDS.map((id) => [id, true])))).toBeNull();
  });
  it('recognises step ids', () => {
    expect(isStepId('review')).toBe(true);
    expect(isStepId('x')).toBe(false);
    expect(isStepId(3)).toBe(false);
  });
});

describe('heldBack', () => {
  it('holds back nothing when no record has a blocker', () => {
    const batch = reviewBatch([record], { today: '2026-11-16' });
    for (const id of STEP_IDS) expect(heldBack(id, batch)).toBe(false);
  });
  it('holds back tags, changeset and submit while a record has a blocker', () => {
    const batch = reviewBatch([{ ...record, licence: 'x' }], { today: '2026-11-16' });
    expect(STEP_IDS.filter((id) => heldBack(id, batch))).toEqual(['tags', 'changeset', 'submit']);
  });
  it('with no records holds back the steps that need records', () => {
    const batch = reviewBatch([], { today: '2026-11-16' });
    expect(STEP_IDS.filter((id) => !heldBack(id, batch))).toEqual(['review', 'licence', 'editor']);
  });
  it('words the reason in both languages', () => {
    expect(heldBackText('en')).toContain('Fix them first');
    expect(heldBackText('fr')).toContain('Corrigez-les d’abord');
  });
});
