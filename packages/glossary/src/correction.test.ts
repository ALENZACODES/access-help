import { describe, expect, it } from 'vitest';
import {
  CORRECTION_UI,
  PLAIN_TERMS,
  auditHtml,
  composeCorrection,
  correctionFilename,
  fixFeatureId,
  fixId,
  fixNoteId,
  frenchIssues,
  knownFeature,
  lintClaims,
  lintCopy,
  parseFixId,
  plainLanguageIssues,
  readabilityIssues,
  renderCorrectionForm,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' };
const claim = (termId: string, status: FeatureClaim['status']): FeatureClaim => ({ termId, status, provenance: prov });
const place: Place = { id: 'Lib 1', name: 'Library', claims: [claim('ramp', 'present')] };
const today = '2026-11-15';

describe('composeCorrection', () => {
  it('returns null when nothing was written', () => {
    for (const note of ['', '   ', '\n\t']) expect(composeCorrection(place, 'ramp', note, 'en', today)).toBeNull();
  });
  it('says what the app shows, with the source, and keeps the words as written', () => {
    const text = composeCorrection(place, 'ramp', 'The ramp is behind the building.', 'en', today) ?? '';
    expect(text).toContain('Place: Library');
    expect(text).toContain('Feature: Ramp');
    expect(text).toMatch(/What this app shows: .+/);
    expect(text).toContain('Source: City open data.');
    expect(text).toContain('The ramp is behind the building.');
    expect(text).toContain('Written on: 2026-11-15');
    expect(text).toContain('This is my own report, in my own words.');
  });
  it('says Unknown, with no source, when the app has nothing', () => {
    const text = composeCorrection(place, 'elevator', 'There is a lift.', 'en', today) ?? '';
    expect(text).toMatch(/What this app shows: .*nknown/);
    expect(text).not.toContain('Source:');
  });
  it('can be about the place in general', () => {
    const text = composeCorrection(place, null, 'The name changed.', 'en', today) ?? '';
    expect(text).not.toContain('Feature:');
    expect(text).not.toContain('What this app shows');
    expect(text).toContain('The name changed.');
  });
  it('cuts a very long note to the note limit and removes control characters', () => {
    const text = composeCorrection(place, null, `a\u0007${'b'.repeat(800)}`, 'en', today) ?? '';
    expect(text).not.toContain('\u0007');
    expect(text.split('\n').find((l) => l.startsWith('ab'))?.length).toBeLessThanOrEqual(500);
  });
  it('writes French with its own spacing', () => {
    const text = composeCorrection(place, 'ramp', 'La rampe est derrière.', 'fr', today) ?? '';
    expect(text).toContain('Lieu\u00a0: Library');
    for (const line of text.split('\n').filter((l) => l !== 'La rampe est derrière.')) expect(frenchIssues(line), line).toEqual([]);
  });
  it('never calls anything accessible or checked in the fixed text', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const text = composeCorrection(place, 'ramp', 'x', lang, today) ?? '';
      const fixed = text.split('\n').filter((l) => l !== 'x').join('\n');
      expect(lintClaims(fixed), fixed).toEqual([]);
    }
  });
  it('names the file by place', () => {
    expect(correctionFilename(place, 'en')).toBe('report-lib-1-en.txt');
    expect(correctionFilename({ id: '***', name: 'x', claims: [] }, 'fr')).toBe('report-place-fr.txt');
  });
});

describe('ids and features', () => {
  it('round-trips the button id', () => {
    expect(parseFixId(fixId(9))).toBe(9);
    for (const id of ['', 'gl-fix-', 'gl-fixf-1', 'gl-fixn-1', 'gl-fix-x']) expect(parseFixId(id)).toBeNull();
  });
  it('has separate ids for the controls', () => {
    expect(new Set([fixId(1), fixFeatureId(1), fixNoteId(1)]).size).toBe(3);
  });
  it('only accepts known features', () => {
    expect(knownFeature('ramp')).toBe('ramp');
    for (const v of ['', 'teleporter', '__proto__', 'RAMP']) expect(knownFeature(v), v).toBeNull();
  });
});

describe('the form', () => {
  it.each(['en', 'fr'] as Lang[])('is valid markup in %s', (lang) => {
    expect(auditHtml(`<div lang="${lang}">${renderCorrectionForm(place, 2, lang)}</div>`, 'fix')).toEqual([]);
  });
  it('lists every feature and the place in general', () => {
    const html = renderCorrectionForm(place, 0, 'en');
    expect((html.match(/<option /g) ?? []).length).toBe(PLAIN_TERMS.length + 1);
    expect(html).toContain('The place in general');
  });
  it('labels each control and names the place', () => {
    const html = renderCorrectionForm(place, 4, 'en');
    expect(html).toContain('<label for="gl-fixf-4">');
    expect(html).toContain('<label for="gl-fixn-4">');
    expect(html).toContain('aria-label="Report a problem with the information about Library"');
  });
  it('escapes the name', () => {
    expect(renderCorrectionForm({ id: 'x', name: '<b>', claims: [] }, 0, 'en')).not.toContain('<b>');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = CORRECTION_UI[lang];
    const texts = [ui.summary, ui.summaryLabel('Library'), ui.featureLabel, ui.whole, ui.noteLabel, ui.make, ui.title, ui.place, ui.feature, ui.shows, ui.mine, ui.written, ui.ownWords];
    for (const t of texts) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      expect(readabilityIssues(t, lang), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
  it('has the same keys in both languages', () => {
    expect(Object.keys(CORRECTION_UI.fr)).toEqual(Object.keys(CORRECTION_UI.en));
  });
});
