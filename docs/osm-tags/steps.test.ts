import { describe, expect, it } from 'vitest';
import { obs, unknownObs } from './fixtures.js';
import { STEP_IDS, handSteps } from './steps.js';

describe('steps for adding by hand', () => {
  it('gives every step, in order, for an observation with a status', () => {
    expect(handSteps(obs(), 'en').map((s) => s.id)).toEqual([...STEP_IDS]);
  });
  it('starts from what the person saw, with the day', () => {
    expect(handSteps(obs(), 'en')[0]?.text).toBe('Add only what you saw yourself on 2026-11-10.');
  });
  it('gives the spot to open the editor at', () => {
    expect(handSteps(obs(), 'en')[1]?.text).toContain('at 43.85000, -79.43000.');
    expect(handSteps(obs(), 'en')[1]?.text).toContain('your own account');
  });
  it('tells the person to leave other tags alone', () => {
    expect(handSteps(obs(), 'en').find((s) => s.id === 'leave-rest')?.text).toBe('Leave every other tag as it is. Do not remove what someone else added.');
  });
  it('ends by saying the App does not save and cannot see', () => {
    expect(handSteps(obs(), 'en').at(-1)?.text).toBe('Save in the editor. The App does not do this for you and cannot see whether you did.');
  });
  it('gives one step for an UNKNOWN observation: go back and look', () => {
    const steps = handSteps(unknownObs(), 'en');
    expect(steps).toHaveLength(1);
    expect(steps[0]?.text).toContain('there is no wheelchair tag to add');
  });
  it('has French for every step and fills every placeholder', () => {
    const fr = handSteps(obs(), 'fr');
    expect(fr).toHaveLength(STEP_IDS.length);
    for (const step of fr) expect(step.text).not.toMatch(/\{\w+\}/);
    expect(fr[0]?.text).toBe('Ajoutez seulement ce que vous avez vu vous-même le 2026-11-10.');
  });
});
