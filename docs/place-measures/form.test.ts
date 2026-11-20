import { describe, expect, it } from 'vitest';
import { full, TODAY } from './fixtures.js';
import { FORM_FIELDS, emptyForm, formFrom, issuesFor, readForm, type MeasureForm } from './form.js';

const SEEN = { id: 'a1', observedOn: '2026-11-10' };
const form = (over: Partial<MeasureForm> = {}): MeasureForm => ({ ...emptyForm(TODAY), ...over });

describe('measuring form', () => {
  it('starts empty, dated today', () => {
    expect(emptyForm(TODAY)).toEqual({ measuredOn: TODAY, method: '', steps: '', stepHeight: '', doorWidth: '', doorOpening: '', ramp: '', toilet: '', toiletDoor: '' });
    expect(Object.keys(emptyForm(TODAY))).toEqual([...FORM_FIELDS]);
  });
  it('reads a full form', () => {
    const result = readForm(form({ measuredOn: '2026-11-12', method: 'tape', steps: '2', stepHeight: '14', doorWidth: '82,5', doorOpening: 'button', ramp: 'no', toilet: 'yes', toiletDoor: '86 cm' }), SEEN, TODAY);
    expect(result).toEqual({ ok: true, measures: full() });
  });
  it('leaves an empty field UNKNOWN', () => {
    const result = readForm(form({ doorWidth: '80' }), SEEN, TODAY);
    expect(result.ok && result.measures).toMatchObject({ steps: null, stepHeightCm: null, doorWidthCm: 80, doorOpening: null, ramp: null, toilet: null, toiletDoorCm: null, method: null });
  });
  it('reads inches into centimetres', () => {
    const result = readForm(form({ doorWidth: '32 in' }), SEEN, TODAY);
    expect(result.ok && result.measures.doorWidthCm).toBe(81.3);
  });
  it('takes zero steps as a fact', () => {
    const result = readForm(form({ steps: '0' }), SEEN, TODAY);
    expect(result.ok && result.measures.steps).toBe(0);
  });
  it('refuses a form with nothing measured', () => {
    expect(readForm(form(), SEEN, TODAY)).toEqual({ ok: false, issues: [{ field: 'steps', code: 'nothing-measured' }] });
    expect(readForm(form({ method: 'tape' }), SEEN, TODAY)).toMatchObject({ ok: false });
  });
  it('refuses a day that is not a day, is after today or is before the place was seen', () => {
    const codes = (measuredOn: string) => {
      const result = readForm(form({ measuredOn, steps: '1' }), SEEN, TODAY);
      return result.ok ? [] : result.issues.map((i) => i.code);
    };
    expect(codes('yesterday')).toEqual(['date-invalid']);
    expect(codes('2026-11-20')).toEqual(['date-future']);
    expect(codes('2026-11-09')).toEqual(['date-before-seen']);
    expect(codes('2026-11-10')).toEqual([]);
    expect(codes(TODAY)).toEqual([]);
  });
  it('does not compare with the seen day when that day is not a day', () => {
    expect(readForm(form({ measuredOn: '2020-01-01', steps: '1' }), { id: 'a1', observedOn: 'soon' }, TODAY).ok).toBe(true);
  });
  it('refuses steps that are not a whole number or are too many', () => {
    for (const steps of ['2.5', 'two', '-1', '1 000']) expect(readForm(form({ steps }), SEEN, TODAY)).toEqual({ ok: false, issues: [{ field: 'steps', code: 'not-a-whole-number' }] });
    expect(readForm(form({ steps: '61' }), SEEN, TODAY)).toEqual({ ok: false, issues: [{ field: 'steps', code: 'too-large' }] });
    expect(readForm(form({ steps: '60' }), SEEN, TODAY).ok).toBe(true);
  });
  it('refuses a length that cannot be read, is too small or too large', () => {
    expect(readForm(form({ doorWidth: 'wide' }), SEEN, TODAY)).toEqual({ ok: false, issues: [{ field: 'doorWidth', code: 'not-a-length' }] });
    expect(readForm(form({ doorWidth: '8' }), SEEN, TODAY)).toEqual({ ok: false, issues: [{ field: 'doorWidth', code: 'too-small' }] });
    expect(readForm(form({ doorWidth: '820' }), SEEN, TODAY)).toEqual({ ok: false, issues: [{ field: 'doorWidth', code: 'too-large' }] });
    expect(readForm(form({ doorWidth: '-82' }), SEEN, TODAY)).toEqual({ ok: false, issues: [{ field: 'doorWidth', code: 'too-small' }] });
  });
  it('catches a door typed in metres as centimetres', () => {
    expect(readForm(form({ doorWidth: '0.82' }), SEEN, TODAY)).toMatchObject({ ok: false, issues: [{ field: 'doorWidth', code: 'too-small' }] });
    expect(readForm(form({ doorWidth: '0.82 m' }), SEEN, TODAY).ok).toBe(true);
  });
  it('refuses a step height with zero steps', () => {
    expect(readForm(form({ steps: '0', stepHeight: '14' }), SEEN, TODAY)).toEqual({ ok: false, issues: [{ field: 'stepHeight', code: 'height-without-steps' }] });
  });
  it('takes a step height when the count is UNKNOWN', () => {
    const result = readForm(form({ stepHeight: '14' }), SEEN, TODAY);
    expect(result.ok && result.measures).toMatchObject({ steps: null, stepHeightCm: 14 });
  });
  it('refuses a toilet door width when there is no wheelchair toilet', () => {
    expect(readForm(form({ toilet: 'no', toiletDoor: '86' }), SEEN, TODAY)).toEqual({ ok: false, issues: [{ field: 'toiletDoor', code: 'toilet-door-without-toilet' }] });
  });
  it('reports every problem at once', () => {
    const result = readForm(form({ measuredOn: 'x', steps: 'x', doorWidth: 'x' }), SEEN, TODAY);
    expect(result.ok ? [] : result.issues.map((i) => i.field)).toEqual(['measuredOn', 'steps', 'doorWidth']);
  });
  it('ignores a choice it does not know', () => {
    const result = readForm(form({ steps: '1', ramp: 'maybe', doorOpening: 'magic', toilet: 'perhaps', method: 'laser' }), SEEN, TODAY);
    expect(result.ok && result.measures).toMatchObject({ ramp: null, doorOpening: null, toilet: null, method: null });
  });
  it('puts saved measures back into the form in either decimal style', () => {
    expect(formFrom(full(), '.')).toEqual({ measuredOn: '2026-11-12', method: 'tape', steps: '2', stepHeight: '14', doorWidth: '82.5', doorOpening: 'button', ramp: 'no', toilet: 'yes', toiletDoor: '86' });
    expect(formFrom(full(), ',').doorWidth).toBe('82,5');
  });
  it('reads back a form it filled from saved measures', () => {
    for (const decimal of ['.', ','] as const) expect(readForm(formFrom(full(), decimal), SEEN, TODAY)).toEqual({ ok: true, measures: full() });
  });
  it('finds the issues of one field', () => {
    const result = readForm(form({ steps: 'x', doorWidth: 'x' }), SEEN, TODAY);
    const issues = result.ok ? [] : result.issues;
    expect(issuesFor(issues, 'doorWidth')).toEqual([{ field: 'doorWidth', code: 'not-a-length' }]);
    expect(issuesFor(issues, 'ramp')).toEqual([]);
  });
});
