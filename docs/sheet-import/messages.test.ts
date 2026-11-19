import { describe, expect, it } from 'vitest';
import { FAILURES, ISSUE_CODES } from './lintkit.js';
import {
  actionLabel,
  fieldLabel,
  missingColumnsText,
  planSummaryText,
  provenanceLine,
  repeatedColumnsText,
  rowIssueText,
  rowNoteText,
  sheetFailureText,
  tierNoteText,
  unkeptColumnsText,
} from './messages.js';

describe('sheet failure words', () => {
  it('has a different sentence for each failure in each language', () => {
    for (const lang of ['en', 'fr'] as const) {
      const texts = FAILURES.map((code) => sheetFailureText(code, lang));
      expect(new Set(texts).size).toBe(FAILURES.length);
    }
  });
  it('names the row limit', () => expect(sheetFailureText('too-many-rows', 'en')).toContain('500'));
});

describe('column words', () => {
  it('lists missing columns by their plain names', () => {
    expect(missingColumnsText(['source', 'licence', 'observedOn'], 'en')).toBe(
      'The sheet has no column for source, licence and date seen. Every place needs a source, a licence, a date and coordinates.',
    );
    expect(missingColumnsText(['latitude', 'longitude'], 'fr')).toContain('latitude et longitude');
  });
  it('lists unkept and repeated columns, or says nothing', () => {
    expect(unkeptColumnsText(['Note', 'Phone'], 'en')).toBe('Columns that are not kept: Note and Phone.');
    expect(unkeptColumnsText(['Note'], 'fr')).toBe('Colonnes non conservées : Note.');
    expect(unkeptColumnsText([], 'en')).toBe('');
    expect(repeatedColumnsText([], 'fr')).toBe('');
    expect(repeatedColumnsText(['lat'], 'en')).toContain('lat.');
  });
  it('says the tier stays UNKNOWN whether or not the sheet has a tier column', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(tierNoteText(true, lang)).toContain('UNKNOWN');
      expect(tierNoteText(false, lang)).toContain('UNKNOWN');
      expect(tierNoteText(true, lang)).not.toBe(tierNoteText(false, lang));
    }
  });
  it('labels every field', () => {
    expect(fieldLabel('observedOn', 'en')).toBe('date seen');
    expect(fieldLabel('status', 'fr')).toBe('état');
  });
});

describe('row words', () => {
  it('has a different sentence for each issue in each language', () => {
    for (const lang of ['en', 'fr'] as const) {
      const texts = ISSUE_CODES.map((code) => rowIssueText({ field: 'id', code }, lang));
      expect(new Set(texts).size).toBe(ISSUE_CODES.length);
    }
  });
  it('names the two open licences when the licence is wrong', () => {
    expect(rowIssueText({ field: 'licence', code: 'licence-not-open' }, 'en')).toBe('The licence is not CC0-1.0 or ODbL-1.0.');
  });
  it('shows the unrecognised status as written and says it is kept as UNKNOWN', () => {
    expect(rowNoteText({ code: 'status-unrecognised', value: 'maybe' }, 'en')).toBe('The status “maybe” is not yes, limited, no or unknown, so it is kept as UNKNOWN.');
    expect(rowNoteText({ code: 'status-unrecognised', value: 'bof' }, 'fr')).toContain('«\u202fbof\u202f»');
    expect(rowNoteText({ code: 'status-empty' }, 'fr')).toContain('UNKNOWN');
  });
});

describe('plan words', () => {
  it('labels each action', () => {
    expect(actionLabel('add', 'en')).toBe('Will be added');
    expect(actionLabel('over-limit', 'fr')).toBe('Non ajouté : la liste de l’appareil est pleine');
    expect(actionLabel('rejected', 'en')).toBe('Not brought in');
  });
  it('summarises the counts and leaves the limit out when it is not reached', () => {
    const text = planSummaryText({ rows: 4, add: 2, replace: 1, same: 0, overLimit: 0, rejected: 1 }, 'en');
    expect(text).toBe('Lines read: 4. To add: 2. To replace: 1. Already saved: 0. With a problem: 1. Nothing is saved until you confirm, and nothing is uploaded.');
  });
  it('mentions the device limit when lines go over it', () => {
    expect(planSummaryText({ rows: 3, add: 1, replace: 0, same: 0, overLimit: 2, rejected: 0 }, 'en')).toContain('Over the device limit: 2.');
  });
  it('writes the French spacing before each colon', () => {
    expect(planSummaryText({ rows: 2, add: 2, replace: 0, same: 0, overLimit: 0, rejected: 0 }, 'fr')).toMatch(/^Lignes lues\u00a0: 2\. À ajouter\u00a0: 2\./);
  });
});

describe('provenanceLine', () => {
  it('gives source, licence, date and tier for a record', () => {
    expect(provenanceLine({ source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-01' }, 'en')).toBe('Source: own visit. Licence: CC0-1.0. Seen on 2026-11-01. Tier: UNKNOWN.');
    expect(provenanceLine({ source: 'visite', licence: 'ODbL-1.0', observedOn: '2026-11-01' }, 'fr')).toBe('Source : visite. Licence : ODbL-1.0. Vu le 2026-11-01. Niveau : UNKNOWN.');
  });
});

describe('French quotation marks', () => {
  it('puts a narrow no-break space inside « » around a quoted status', () => {
    expect(rowNoteText({ code: 'status-unrecognised', value: 'bof' }, 'fr')).toContain('« bof »');
  });
});
