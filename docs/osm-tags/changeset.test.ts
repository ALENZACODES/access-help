import { describe, expect, it } from 'vitest';
import { changesetDraft, changesetText } from './changeset.js';
import { obs, unknownObs } from './fixtures.js';

describe('changeset draft', () => {
  it('drafts a comment and a source for one observation', () => {
    const draft = changesetDraft([obs()], 'en');
    expect(draft.comment).toBe('Wheelchair access for 1 place, seen in person on 2026-11-10.');
    expect(draft.source).toBe('own visit');
    expect(draft).toMatchObject({ withStatus: 1, withoutStatus: 0, tooLong: false });
  });
  it('gives a span of days for several observations', () => {
    const draft = changesetDraft([obs(), obs({ id: 'b', observedOn: '2026-11-12' }), obs({ id: 'c', observedOn: '2026-11-08' })], 'en');
    expect(draft.comment).toBe('Wheelchair access for 3 places, seen in person from 2026-11-08 to 2026-11-12.');
  });
  it('does not count an UNKNOWN observation, and says how many were left out', () => {
    const draft = changesetDraft([obs(), unknownObs()], 'en');
    expect(draft.comment).toContain('for 1 place');
    expect(draft.withoutStatus).toBe(1);
  });
  it('drafts nothing when no observation has a status', () => {
    const draft = changesetDraft([unknownObs()], 'en');
    expect(draft).toMatchObject({ comment: '', source: '', withStatus: 0, withoutStatus: 1, tooLong: false });
    expect(changesetText(draft)).toBe('');
    expect(changesetDraft([], 'en').comment).toBe('');
  });
  it('names each source once, whatever its case', () => {
    const draft = changesetDraft([obs(), obs({ id: 'b', source: 'Own Visit' }), obs({ id: 'c', source: 'field notes' })], 'en');
    expect(draft.source).toBe('own visit and field notes');
  });
  it('leaves the day out when no date is a day', () => {
    expect(changesetDraft([obs({ observedOn: 'soon' })], 'en').comment).toBe('Wheelchair access for 1 place.');
  });
  it('says when the draft is longer than OpenStreetMap keeps', () => {
    const draft = changesetDraft([obs({ source: 'x'.repeat(300) })], 'en');
    expect(draft.sourceLength).toBe(300);
    expect(draft.tooLong).toBe(true);
  });
  it('writes the two lines an editor asks for', () => {
    expect(changesetText(changesetDraft([obs()], 'en'))).toBe('comment=Wheelchair access for 1 place, seen in person on 2026-11-10.\nsource=own visit');
    expect(changesetText(changesetDraft([obs({ source: ' ' })], 'en'))).toBe('comment=Wheelchair access for 1 place, seen in person on 2026-11-10.');
  });
  it('writes French', () => {
    expect(changesetDraft([obs()], 'fr').comment).toBe('Accès en fauteuil roulant pour 1 lieu, vu sur place le 2026-11-10.');
    expect(changesetDraft([obs(), obs({ id: 'b', observedOn: '2026-11-12' })], 'fr').comment).toBe('Accès en fauteuil roulant pour 2 lieux, vu sur place du 2026-11-10 au 2026-11-12.');
  });
  it('counts the comment length as a reader sees it', () => {
    const draft = changesetDraft([obs()], 'fr');
    expect(draft.commentLength).toBe([...draft.comment].length);
  });
});
