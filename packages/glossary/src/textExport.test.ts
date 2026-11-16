import { describe, expect, it } from 'vitest';
import {
  TEXT_MIME,
  comparisonToText,
  frenchIssues,
  lintCopy,
  savedToText,
  textFilename,
  toExportFile,
  type FeatureClaim,
  type Place,
} from './index';

const prov = { source: 'Example source', licence: 'CC0-1.0', date: '2026-01-01' } as const;
const claim = (termId: string, status: FeatureClaim['status']): FeatureClaim => ({ termId, status, provenance: prov });
const a: Place = { id: 'a', name: 'Alpha Hall', claims: [claim('ramp', 'present')] };
const b: Place = { id: 'b', name: 'Beta Hall', claims: [claim('ramp', 'absent')] };

describe('savedToText', () => {
  it('lists saved names in the order saved and skips unknown ids', () => {
    const t = savedToText([a, b], ['b', 'gone', 'a'], 'en');
    expect(t).toBe('Saved places (2)\n\n- Beta Hall\n- Alpha Hall\n');
  });

  it('adds the data source when given', () => {
    const t = savedToText([a], ['a'], 'en', prov);
    expect(t).toContain('Example source');
    expect(t).toContain('CC0-1.0');
    expect(t).toContain('2026-01-01');
  });

  it('is French with French typography', () => {
    const t = savedToText([a], ['a'], 'fr', prov);
    expect(t.startsWith('Lieux enregistrés (1)')).toBe(true);
    expect(frenchIssues(t)).toEqual([]);
  });
});

describe('comparisonToText', () => {
  it('shows each place’s status and keeps unknown as Unknown', () => {
    const t = comparisonToText(a, b, ['ramp', 'elevator'], 'en');
    expect(t).toContain('Alpha Hall: Reported as available');
    expect(t).toContain('Beta Hall: Reported as not available');
    expect(t).toMatch(/Alpha Hall: Unknown/);
    expect(t).not.toMatch(/accessible overall|is accessible/i);
  });

  it('keeps unknown as Inconnu in French, with a non-breaking space before the colon', () => {
    const t = comparisonToText(a, b, ['elevator'], 'fr');
    expect(t).toContain('Inconnu');
    expect(t).toContain('Alpha Hall : Inconnu');
    expect(frenchIssues(t)).toEqual([]);
  });

  it('passes the copy rules in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(lintCopy(comparisonToText(a, b, ['ramp', 'elevator'], lang, prov))).toEqual([]);
      expect(lintCopy(savedToText([a, b], ['a', 'b'], lang, prov))).toEqual([]);
    }
  });
});

describe('export files', () => {
  it('names files by kind and language', () => {
    expect(textFilename('saved', 'en')).toBe('saved-places-en.txt');
    expect(textFilename('comparison', 'fr')).toBe('comparison-fr.txt');
  });

  it('bundles text, filename and mime type', () => {
    expect(toExportFile('saved', 'x', 'en')).toEqual({ text: 'x', filename: 'saved-places-en.txt', mime: TEXT_MIME });
  });
});
