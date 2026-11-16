import { describe, expect, it } from 'vitest';
import {
  MAX_SPEECH_CHUNK,
  SAY_UI,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  parseSayId,
  plainLanguageIssues,
  sayButton,
  sayId,
  speechChunks,
  speechSentences,
  speechText,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' };
const claim = (termId: string, status: FeatureClaim['status'], p?: Provenance): FeatureClaim => (p === undefined ? { termId, status } : { termId, status, provenance: p });
const place: Place = {
  id: 'lib',
  name: 'Library',
  claims: [claim('ramp', 'present', prov), claim('elevator', 'absent', prov)],
};

describe('speechSentences', () => {
  it('names the place, then each chosen feature with its status and source', () => {
    const s = speechSentences(place, ['ramp', 'elevator'], 'en');
    expect(s[0]).toBe('Library.');
    expect(s[1]).toMatch(/^Ramp: .+\.$/);
    expect(s[2]).toBe('Source: City open data.');
    expect(s[3]).toMatch(/^Elevator: .+\.$/);
    expect(s[4]).toBe('Source: City open data.');
  });
  it('says unknown where the sources say nothing, with no source line', () => {
    const s = speechSentences(place, ['parking'], 'en');
    expect(s.join(' ')).toMatch(/unknown/i);
    expect(s.some((x) => x.startsWith('Source'))).toBe(false);
  });
  it('counts unknown features', () => {
    const s = speechSentences({ id: 'x', name: 'Pool', claims: [] }, ['ramp', 'elevator'], 'en');
    expect(s[s.length - 1]).toBe('2 features are unknown.');
    expect(speechSentences({ id: 'x', name: 'Pool', claims: [] }, ['ramp'], 'en').at(-1)).toBe('1 feature is unknown.');
  });
  it('says no features were chosen', () => {
    expect(speechSentences(place, [], 'en')).toEqual(['Library.', SAY_UI.en.noFeatures]);
  });
  it('does not add a full stop twice', () => {
    expect(speechSentences({ id: 'x', name: 'St. Mary’s Hall.', claims: [] }, [], 'en')[0]).toBe('St. Mary’s Hall.');
  });
  it('treats a conflict as unknown', () => {
    const conflicted: Place = { id: 'c', name: 'Hall', claims: [claim('ramp', 'present', prov), claim('ramp', 'absent', prov)] };
    const s = speechSentences(conflicted, ['ramp'], 'en');
    expect(s.join(' ')).toMatch(/unknown|conflict/i);
    expect(s.some((x) => x.startsWith('Source'))).toBe(false);
  });
  it('is clean French', () => {
    for (const sentence of speechSentences(place, ['ramp', 'parking'], 'fr')) expect(frenchIssues(sentence), sentence).toEqual([]);
  });
  it('never says a place is accessible or checked', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const text = speechText(place, ['ramp', 'elevator', 'parking'], lang);
      expect(lintClaims(text), text).toEqual([]);
      expect(lintCopy(text), text).toEqual([]);
    }
  });
});

describe('speechChunks', () => {
  it('joins short sentences into one piece', () => {
    expect(speechChunks(['One.', 'Two.', 'Three.'])).toEqual(['One. Two. Three.']);
  });
  it('starts a new piece when the limit would be passed', () => {
    const a = 'a'.repeat(100) + '.';
    const chunks = speechChunks([a, a, a], 230);
    expect(chunks).toHaveLength(2);
    expect(chunks.every((c) => c.length <= 230)).toBe(true);
  });
  it('cuts one very long sentence', () => {
    const chunks = speechChunks(['x'.repeat(MAX_SPEECH_CHUNK * 2 + 10)]);
    expect(chunks).toHaveLength(3);
    expect(chunks.join('')).toBe('x'.repeat(MAX_SPEECH_CHUNK * 2 + 10));
  });
  it('skips empty sentences and tidies spaces', () => {
    expect(speechChunks(['', '  a   b  ', '   '])).toEqual(['a b']);
    expect(speechChunks([])).toEqual([]);
  });
  it('keeps every word, in order', () => {
    const words = Array.from({ length: 60 }, (_, i) => `Sentence number ${i}.`);
    expect(speechChunks(words, 100).join(' ')).toBe(words.join(' '));
  });
});

describe('button and ids', () => {
  it('round-trips ids', () => {
    expect(parseSayId(sayId(12))).toBe(12);
    for (const id of ['', 'gl-say-', 'gl-say-x', 'gl-save-1']) expect(parseSayId(id)).toBeNull();
  });
  it.each(['en', 'fr'] as Lang[])('is valid markup in %s', (lang) => {
    expect(auditHtml(`<div lang="${lang}">${sayButton(3, 'Café <Nord>', lang)}</div>`, 'say')).toEqual([]);
    expect(sayButton(3, '<b>', lang)).not.toContain('<b>');
  });
  it('names the place for assistive technology', () => {
    expect(sayButton(0, 'Library', 'en')).toContain('aria-label="Read Library aloud"');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = SAY_UI[lang];
    for (const t of [ui.say, ui.sayLabel('Library'), ui.source('City open data'), ui.noFeatures, ui.unknownCount(1), ui.unknownCount(4)]) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});
