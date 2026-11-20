import { describe, expect, it } from 'vitest';
import { TODAY, answered, complete, fresh, saved, short } from './fixtures.js';
import { answerStep, backToReview, beginWalk, checkAnswer, cleanWalk, goBack, goToStep, hasAnyAnswer, skipStep, walkProgress } from './walk.js';

describe('beginWalk', () => {
  it('starts at the first question with nothing answered', () => {
    const walk = fresh();
    expect(walk).toMatchObject({ version: 1, recordId: 'a1', startedOn: TODAY, at: 'steps', skipped: [] });
    expect(hasAnyAnswer(walk)).toBe(false);
  });
  it('fills in what is saved for the place, in centimetres', () => {
    const walk = beginWalk('a1', TODAY, saved({ ramp: 'yes' }));
    expect(walk.answers).toMatchObject({ steps: '2', stepHeight: '14', doorWidth: '82.5', ramp: 'yes', method: 'tape', toilet: '' });
    expect(walk.startedOn).toBe(TODAY);
  });
  it('does not carry a method when no length is saved', () => {
    const walk = beginWalk('a1', TODAY, saved({ stepHeightCm: null, doorWidthCm: null }));
    expect(walk.answers.method).toBe('');
  });
});

describe('checkAnswer', () => {
  it('keeps a whole number of steps, without leading zeros', () => {
    expect(checkAnswer('steps', ' 03 ')).toEqual({ ok: true, value: '3' });
    expect(checkAnswer('steps', '0')).toEqual({ ok: true, value: '0' });
  });
  it('refuses a count that is not a whole number', () => {
    for (const bad of ['2.5', '-1', 'two', '1e2', '1234']) expect(checkAnswer('steps', bad)).toEqual({ ok: false, issue: 'not-a-whole-number' });
  });
  it('refuses more steps than the App keeps', () => {
    expect(checkAnswer('steps', '61')).toEqual({ ok: false, issue: 'too-large' });
    expect(checkAnswer('steps', '60')).toEqual({ ok: true, value: '60' });
  });
  it('turns inches into centimetres', () => {
    expect(checkAnswer('doorWidth', '32 in')).toEqual({ ok: true, value: '81.3' });
  });
  it('reads a comma as a decimal mark', () => {
    expect(checkAnswer('doorWidth', '82,5')).toEqual({ ok: true, value: '82.5' });
  });
  it('holds each length to its own range', () => {
    expect(checkAnswer('stepHeight', '0.2')).toEqual({ ok: false, issue: 'too-small' });
    expect(checkAnswer('stepHeight', '61')).toEqual({ ok: false, issue: 'too-large' });
    expect(checkAnswer('doorWidth', '29')).toEqual({ ok: false, issue: 'too-small' });
    expect(checkAnswer('doorWidth', '401')).toEqual({ ok: false, issue: 'too-large' });
    expect(checkAnswer('toiletDoor', '251')).toEqual({ ok: false, issue: 'too-large' });
    expect(checkAnswer('toiletDoor', '250')).toEqual({ ok: true, value: '250' });
  });
  it('refuses a length it cannot read', () => {
    expect(checkAnswer('doorWidth', 'wide')).toEqual({ ok: false, issue: 'not-a-length' });
    expect(checkAnswer('doorWidth', '-82')).toEqual({ ok: false, issue: 'too-small' });
  });
  it('takes only the listed choices', () => {
    expect(checkAnswer('ramp', 'yes')).toEqual({ ok: true, value: 'yes' });
    expect(checkAnswer('ramp', 'maybe')).toEqual({ ok: false, issue: 'not-a-choice' });
    expect(checkAnswer('doorOpening', 'yes')).toEqual({ ok: false, issue: 'not-a-choice' });
    expect(checkAnswer('method', 'tape')).toEqual({ ok: true, value: 'tape' });
  });
  it('calls an empty answer empty, whatever the question', () => {
    for (const step of ['steps', 'doorWidth', 'ramp'] as const) expect(checkAnswer(step, '  ')).toEqual({ ok: false, issue: 'empty' });
  });
});

describe('answerStep', () => {
  it('keeps the answer and moves to the next question', () => {
    const walk = answered([['steps', '2']]);
    expect(walk.answers.steps).toBe('2');
    expect(walk.at).toBe('stepHeight');
  });
  it('passes over the step height when there is no step', () => {
    expect(answered([['steps', '0']]).at).toBe('ramp');
  });
  it('changes nothing on a bad answer', () => {
    const walk = fresh();
    expect(answerStep(walk, 'steps', 'a few')).toEqual({ ok: false, issue: 'not-a-whole-number' });
    expect(walk).toEqual(fresh());
  });
  it('reaches the review after the last question', () => {
    expect(complete().at).toBe('review');
    expect(short().at).toBe('review');
  });
  it('clears a height typed earlier when the count becomes zero', () => {
    const walk = answered([['steps', '0']], goToStep(complete(), 'steps'));
    expect(walk.answers.stepHeight).toBe('');
    expect(walk.answers.method).toBe('tape');
  });
  it('clears the method with the last length', () => {
    let walk = answered([['steps', '2'], ['stepHeight', '14']]);
    walk = skipStep(walk, 'ramp');
    walk = skipStep(walk, 'doorWidth');
    walk = skipStep(walk, 'doorOpening');
    walk = answered([['toilet', 'no'], ['method', 'tape']], walk);
    expect(walk.answers.method).toBe('tape');
    walk = answered([['steps', '0']], goToStep(walk, 'steps'));
    expect(walk.answers.method).toBe('');
  });
  it('takes a question off the skipped list once it is answered', () => {
    let walk = skipStep(fresh(), 'steps');
    expect(walk.skipped).toEqual(['steps']);
    walk = answered([['steps', '1']], goToStep(walk, 'steps'));
    expect(walk.skipped).toEqual([]);
  });
  it('does not change the walk it was given', () => {
    const walk = fresh();
    answerStep(walk, 'steps', '4');
    expect(walk.answers.steps).toBe('');
  });
});

describe('skipStep', () => {
  it('leaves the answer empty, notes the skip and moves on', () => {
    const walk = skipStep(fresh(), 'steps');
    expect(walk).toMatchObject({ at: 'stepHeight', skipped: ['steps'] });
    expect(walk.answers.steps).toBe('');
  });
  it('clears an answer that was there', () => {
    const walk = skipStep(goToStep(complete(), 'doorWidth'), 'doorWidth');
    expect(walk.answers.doorWidth).toBe('');
    expect(walk.skipped).toEqual(['doorWidth']);
  });
  it('does not list a question twice', () => {
    const once = skipStep(fresh(), 'steps');
    expect(skipStep(goToStep(once, 'steps'), 'steps').skipped).toEqual(['steps']);
  });
  it('forgets a skipped question that stops applying', () => {
    let walk = answered([['steps', '2']]);
    walk = skipStep(walk, 'stepHeight');
    expect(walk.skipped).toEqual(['stepHeight']);
    walk = answered([['steps', '0']], goToStep(walk, 'steps'));
    expect(walk.skipped).toEqual([]);
  });
  it('ends at the review when every question is skipped', () => {
    let walk = fresh();
    for (const step of ['steps', 'stepHeight', 'ramp', 'doorWidth', 'doorOpening', 'toilet', 'toiletDoor'] as const) walk = skipStep(walk, step);
    expect(walk.at).toBe('review');
    expect(hasAnyAnswer(walk)).toBe(false);
    expect(walk.skipped).toHaveLength(7);
  });
});

describe('going back and jumping', () => {
  it('goes back one applicable question', () => {
    expect(goBack(answered([['steps', '0']])).at).toBe('steps');
    expect(goBack(answered([['steps', '2'], ['stepHeight', '14']])).at).toBe('stepHeight');
  });
  it('stays on the first question', () => {
    expect(goBack(fresh()).at).toBe('steps');
  });
  it('goes from the review to the last applicable question', () => {
    expect(goBack(complete()).at).toBe('method');
    const noLengths = answered([['steps', '0'], ['ramp', 'yes']]);
    let walk = skipStep(noLengths, 'doorWidth');
    walk = skipStep(walk, 'doorOpening');
    walk = answered([['toilet', 'no']], walk);
    expect(walk.at).toBe('review');
    expect(goBack(walk).at).toBe('toilet');
  });
  it('keeps answers when going back', () => {
    expect(goBack(complete()).answers).toEqual(complete().answers);
  });
  it('jumps to a question that applies and not to one that does not', () => {
    expect(goToStep(complete(), 'ramp').at).toBe('ramp');
    expect(goToStep(short(), 'stepHeight').at).toBe('review');
    expect(goToStep(short(), 'toiletDoor').at).toBe('review');
  });
});

describe('backToReview', () => {
  it('returns to the review when every applicable question is answered or skipped', () => {
    expect(backToReview(answered([['doorWidth', '90']], goToStep(complete(), 'doorWidth'))).at).toBe('review');
    expect(backToReview(skipStep(goToStep(short(), 'doorOpening'), 'doorOpening')).at).toBe('review');
  });
  it('asks a question the change opened before going back', () => {
    const walk = answered([['steps', '3']], goToStep(short(), 'steps'));
    expect(backToReview(walk).at).toBe('stepHeight');
    const toilet = answered([['toilet', 'yes']], goToStep(short(), 'toilet'));
    expect(backToReview(toilet).at).toBe('toiletDoor');
  });
  it('asks how lengths were taken once a first length is given', () => {
    let walk = answered([['steps', '0'], ['ramp', 'yes']]);
    walk = skipStep(walk, 'doorWidth');
    walk = answered([['doorOpening', 'manual'], ['toilet', 'no']], walk);
    expect(walk.at).toBe('review');
    walk = answered([['doorWidth', '90']], goToStep(walk, 'doorWidth'));
    expect(backToReview(walk).at).toBe('method');
  });
  it('changes no answer', () => {
    const walk = goToStep(complete(), 'ramp');
    expect(backToReview(walk).answers).toEqual(walk.answers);
  });
});

describe('walkProgress', () => {
  it('counts seven questions to come at the start', () => {
    expect(walkProgress(fresh())).toEqual({ total: 7, answered: 0, skipped: 0, left: 7, position: 1 });
  });
  it('counts all eight answered at the end of a full walk', () => {
    expect(walkProgress(complete())).toEqual({ total: 8, answered: 8, skipped: 0, left: 0, position: null });
  });
  it('counts fewer questions when some do not apply, and the skipped one apart', () => {
    expect(walkProgress(short())).toEqual({ total: 6, answered: 5, skipped: 1, left: 0, position: null });
  });
  it('gives the position among applicable questions', () => {
    expect(walkProgress(answered([['steps', '0']])).position).toBe(2);
    expect(walkProgress(answered([['steps', '2']])).position).toBe(2);
    expect(walkProgress(goToStep(short(), 'toilet')).position).toBe(5);
  });
  it('always adds up', () => {
    for (const walk of [fresh(), complete(), short(), skipStep(fresh(), 'steps')]) {
      const p = walkProgress(walk);
      expect(p.answered + p.skipped + p.left).toBe(p.total);
    }
  });
});

describe('hasAnyAnswer', () => {
  it('does not count the method alone', () => {
    expect(hasAnyAnswer({ ...fresh(), answers: { ...fresh().answers, method: 'tape' } })).toBe(false);
    expect(hasAnyAnswer(answered([['steps', '0']]))).toBe(true);
  });
});

describe('cleanWalk', () => {
  it('reads back what it wrote', () => {
    for (const walk of [fresh(), complete(), short(), skipStep(fresh(), 'steps')]) expect(cleanWalk(JSON.parse(JSON.stringify(walk)))).toEqual(walk);
  });
  it('refuses anything that is not a walk', () => {
    for (const bad of [null, 3, 'walk', [], {}, { ...fresh(), version: 2 }, { ...fresh(), recordId: '' }, { ...fresh(), recordId: 7 }, { ...fresh(), startedOn: 'today' }, { ...fresh(), recordId: 'x'.repeat(201) }]) expect(cleanWalk(bad)).toBeNull();
  });
  it('drops an answer that no longer passes, leaving it unanswered', () => {
    const walk = cleanWalk({ ...complete(), answers: { ...complete().answers, doorWidth: '9000', ramp: 'perhaps', steps: 2 } });
    expect(walk?.answers).toMatchObject({ doorWidth: '', ramp: '', steps: '', stepHeight: '14' });
  });
  it('drops answers to questions that do not apply', () => {
    const walk = cleanWalk({ ...fresh(), answers: { ...fresh().answers, steps: '0', stepHeight: '14', toilet: 'no', toiletDoor: '86', method: 'tape' } });
    expect(walk?.answers).toMatchObject({ stepHeight: '', toiletDoor: '', method: '' });
  });
  it('keeps only skips that are real: applicable, unanswered, and known steps', () => {
    const walk = cleanWalk({ ...answered([['steps', '0']]), skipped: ['ramp', 'steps', 'stepHeight', 'nonsense', 4, 'ramp'] });
    expect(walk?.skipped).toEqual(['ramp']);
  });
  it('puts the walk back at the first question when its place is unusable', () => {
    expect(cleanWalk({ ...fresh(), at: 'somewhere' })?.at).toBe('steps');
    expect(cleanWalk({ ...answered([['steps', '0']]), at: 'stepHeight' })?.at).toBe('steps');
    expect(cleanWalk({ ...complete(), at: 'review' })?.at).toBe('review');
  });
  it('survives missing answers and a missing skipped list', () => {
    const walk = cleanWalk({ version: 1, recordId: 'a1', startedOn: TODAY, at: 'ramp' });
    expect(walk).toMatchObject({ at: 'ramp', skipped: [] });
    expect(hasAnyAnswer(walk!)).toBe(false);
  });
  it('ignores inherited keys in stored answers', () => {
    const answers = Object.create({ steps: '5' }) as Record<string, string>;
    expect(cleanWalk({ ...fresh(), answers })?.answers.steps).toBe('');
  });
});
