import { describe, expect, it } from 'vitest';
import { changesetFailureText, entryIssueText, followUpText, restoreFailureText, restoreSummaryText, statusText } from './messages.js';

describe('messages', () => {
  it('words every entry issue differently and in both languages', () => {
    const codes = ['date-invalid', 'date-future', 'date-before-seen', 'date-before-marked', 'changeset-not-a-number', 'changeset-too-long', 'changeset-zero', 'note-too-long', 'ledger-full'] as const;
    for (const lang of ['en', 'fr'] as const) {
      const texts = codes.map((code) => entryIssueText({ field: 'markedOn', code }, lang));
      expect(new Set(texts).size).toBe(codes.length);
    }
  });
  it('says what a good changeset number looks like and that it can be left empty', () => {
    expect(entryIssueText({ field: 'changeset', code: 'changeset-not-a-number' }, 'en')).toContain('You can leave it empty');
    expect(entryIssueText({ field: 'changeset', code: 'changeset-not-a-number' }, 'fr')).toContain('Vous pouvez le laisser vide');
  });
  it('words changeset failures', () => {
    expect(changesetFailureText('zero', 'en')).toContain('Zero');
    expect(changesetFailureText('too-long', 'fr')).toContain('chiffres');
  });
  it('states what the person did, not what OpenStreetMap did', () => {
    expect(statusText('marked', 'en')).toBe('You marked this as submitted');
    expect(statusText('not-marked', 'fr')).toBe('Non marqué comme soumis');
  });
  it('words follow-ups with singular and plural days', () => {
    expect(followUpText({ recordId: 'a', reason: 'never-looked', days: 1 }, 'en')).toContain('1 day ago');
    expect(followUpText({ recordId: 'a', reason: 'never-looked', days: 45 }, 'en')).toContain('45 days ago');
    expect(followUpText({ recordId: 'a', reason: 'looked-long-ago', days: 0 }, 'fr')).toContain('0 jour');
    expect(followUpText({ recordId: 'a', reason: 'looked-long-ago', days: 90 }, 'fr')).toContain('90 jours');
  });
  it('makes a follow-up a suggestion, not a warning', () => {
    for (const reason of ['never-looked', 'looked-long-ago'] as const) {
      expect(followUpText({ recordId: 'a', reason, days: 40 }, 'en')).toMatch(/may want to/);
    }
  });
  it('words restore results', () => {
    expect(restoreFailureText('not-json', 'en')).toContain('not valid JSON');
    expect(restoreSummaryText(1, 2, 3, 4, 'en')).toBe('Restored: 1 added, 2 updated. 3 left out because the place is not saved here. 4 left out because they were not well formed.');
    expect(restoreSummaryText(0, 0, 0, 0, 'fr')).toContain('Restauré : 0 ajoutées');
  });
});
