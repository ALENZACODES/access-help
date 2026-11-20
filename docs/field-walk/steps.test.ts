import { describe, expect, it } from 'vitest';
import { STEP_CHOICES, STEP_KIND, WALK_STEPS, applicableSteps, dropInapplicable, emptyAnswers, isWalkStep, stepAfter, stepApplies, stepBefore } from './steps.js';

const with_ = (over: Partial<ReturnType<typeof emptyAnswers>>) => ({ ...emptyAnswers(), ...over });

describe('walk steps', () => {
  it('lists eight questions, each with a kind', () => {
    expect(WALK_STEPS).toHaveLength(8);
    for (const step of WALK_STEPS) expect(['count', 'length', 'choice']).toContain(STEP_KIND[step]);
  });
  it('gives every choice question its values and no empty value', () => {
    for (const step of WALK_STEPS) {
      const choices = STEP_CHOICES[step];
      if (STEP_KIND[step] === 'choice') {
        expect(choices?.length).toBeGreaterThanOrEqual(2);
        expect(choices).not.toContain('');
      } else expect(choices).toBeUndefined();
    }
  });
  it('starts with every answer empty', () => {
    expect(Object.values(emptyAnswers())).toEqual(['', '', '', '', '', '', '', '']);
    expect(Object.keys(emptyAnswers())).toEqual([...WALK_STEPS]);
  });
  it('knows a step name from anything else', () => {
    expect(isWalkStep('ramp')).toBe(true);
    expect(isWalkStep('review')).toBe(false);
    expect(isWalkStep(3)).toBe(false);
    expect(isWalkStep(null)).toBe(false);
  });
});

describe('which questions apply', () => {
  it('asks seven questions before anything is answered: the method waits for a length', () => {
    expect(applicableSteps(emptyAnswers())).toEqual(['steps', 'stepHeight', 'ramp', 'doorWidth', 'doorOpening', 'toilet', 'toiletDoor']);
  });
  it('does not ask a step height where no step was counted', () => {
    expect(stepApplies('stepHeight', with_({ steps: '0' }))).toBe(false);
    expect(stepApplies('stepHeight', with_({ steps: ' 0 ' }))).toBe(false);
    expect(stepApplies('stepHeight', with_({ steps: '1' }))).toBe(true);
  });
  it('still asks the step height when the count was skipped', () => {
    expect(stepApplies('stepHeight', with_({ steps: '' }))).toBe(true);
  });
  it('does not ask for a toilet door where there is no wheelchair toilet', () => {
    expect(stepApplies('toiletDoor', with_({ toilet: 'no' }))).toBe(false);
    expect(stepApplies('toiletDoor', with_({ toilet: 'yes' }))).toBe(true);
    expect(stepApplies('toiletDoor', with_({ toilet: '' }))).toBe(true);
  });
  it('asks how lengths were taken only once there is a length', () => {
    expect(stepApplies('method', with_({ steps: '3', ramp: 'yes' }))).toBe(false);
    expect(stepApplies('method', with_({ doorWidth: '82' }))).toBe(true);
    expect(stepApplies('method', with_({ stepHeight: '14' }))).toBe(true);
    expect(stepApplies('method', with_({ toiletDoor: '86' }))).toBe(true);
  });
  it('always asks the other questions', () => {
    for (const step of ['steps', 'ramp', 'doorWidth', 'doorOpening', 'toilet'] as const) expect(stepApplies(step, with_({ steps: '0', toilet: 'no' }))).toBe(true);
  });
});

describe('moving between questions', () => {
  it('goes from the count straight to the ramp when there is no step', () => {
    expect(stepAfter('steps', with_({ steps: '0' }))).toBe('ramp');
    expect(stepAfter('steps', with_({ steps: '2' }))).toBe('stepHeight');
  });
  it('ends after the toilet when there is none and no length was taken', () => {
    expect(stepAfter('toilet', with_({ toilet: 'no' }))).toBeNull();
  });
  it('goes on to the method after the toilet when a length was taken', () => {
    expect(stepAfter('toilet', with_({ toilet: 'no', doorWidth: '82' }))).toBe('method');
    expect(stepAfter('method', with_({ doorWidth: '82' }))).toBeNull();
  });
  it('goes back past a question that does not apply', () => {
    expect(stepBefore('ramp', with_({ steps: '0' }))).toBe('steps');
    expect(stepBefore('ramp', with_({ steps: '2' }))).toBe('stepHeight');
    expect(stepBefore('method', with_({ toilet: 'no', doorWidth: '82' }))).toBe('toilet');
  });
  it('has nothing before the first question', () => {
    expect(stepBefore('steps', emptyAnswers())).toBeNull();
  });
  it('visits each applicable question exactly once going forward', () => {
    const answers = with_({ steps: '0', toilet: 'no', doorWidth: '90' });
    const seen = ['steps'];
    for (let step = stepAfter('steps', answers); step !== null; step = stepAfter(step, answers)) seen.push(step);
    expect(seen).toEqual(applicableSteps(answers));
  });
});

describe('dropInapplicable', () => {
  it('clears a step height once the count is zero', () => {
    expect(dropInapplicable(with_({ steps: '0', stepHeight: '14' })).stepHeight).toBe('');
  });
  it('clears a toilet door once there is no toilet', () => {
    expect(dropInapplicable(with_({ toilet: 'no', toiletDoor: '86' })).toiletDoor).toBe('');
  });
  it('clears the method when the last length goes', () => {
    expect(dropInapplicable(with_({ steps: '0', stepHeight: '14', method: 'tape' })).method).toBe('');
  });
  it('keeps the method while another length remains', () => {
    expect(dropInapplicable(with_({ steps: '0', stepHeight: '14', doorWidth: '82', method: 'tape' })).method).toBe('tape');
  });
  it('leaves applicable answers alone and does not change its input', () => {
    const input = with_({ steps: '2', stepHeight: '14', toilet: 'yes', toiletDoor: '86', method: 'estimate' });
    const copy = { ...input };
    expect(dropInapplicable(input)).toEqual(copy);
    expect(input).toEqual(copy);
  });
});
