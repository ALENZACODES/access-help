import { describe, expect, it } from 'vitest';
import {
  QUESTIONS,
  QUESTION_UI,
  PLAIN_TERMS as TERMS,
  frenchIssues,
  lintCopy,
  plainLanguageIssues,
  questionsFor,
  questionsToText,
  renderQuestions,
  auditHtml,
  type FeatureClaim,
  type Place,
} from './index';

const today = '2026-11-15';
const prov = (date: string, source = 'City open data') => ({ source, licence: 'CC0-1.0', date }) as const;
const claim = (termId: string, status: FeatureClaim['status'], date = '2026-06-01', source?: string): FeatureClaim => ({
  termId,
  status,
  provenance: prov(date, source),
});
const place = (claims: FeatureClaim[]): Place => ({ id: 'p', name: 'Hall', claims });
const ids = TERMS.map((t) => t.id);

describe('question wording', () => {
  it('has a question for every glossary term in both languages', () => {
    for (const id of ids) {
      expect(QUESTIONS[id]?.en, id).toBeTruthy();
      expect(QUESTIONS[id]?.fr, id).toBeTruthy();
    }
  });

  it('asks about the building, never about the person', () => {
    for (const q of Object.values(QUESTIONS)) {
      for (const lang of ['en', 'fr'] as const) {
        expect(q[lang]).toMatch(/\?$| \?$/);
        expect(q[lang]).not.toMatch(/\b(you|your|vous|votre|eligible|admissible|disabilit|handicap)\b/i);
      }
    }
  });

  it('is clean under the copy, plain-language and French rules', () => {
    for (const q of Object.values(QUESTIONS)) {
      for (const lang of ['en', 'fr'] as const) {
        expect(lintCopy(q[lang])).toEqual([]);
        expect(plainLanguageIssues(q[lang])).toEqual([]);
      }
      expect(frenchIssues(q.fr)).toEqual([]);
    }
  });
});

describe('questionsFor', () => {
  it('asks about features with no information', () => {
    const qs = questionsFor(place([]), ['ramp', 'elevator'], today, 'en');
    expect(qs.map((q) => [q.termId, q.reason])).toEqual([
      ['ramp', 'unknown'],
      ['elevator', 'unknown'],
    ]);
    expect(qs[0]?.question).toBe('Is there a ramp? How long is it?');
  });

  it('skips features with a recent, sourced answer, whether present or absent', () => {
    const p = place([claim('ramp', 'present'), claim('elevator', 'absent')]);
    expect(questionsFor(p, ['ramp', 'elevator'], today, 'en')).toEqual([]);
  });

  it('treats a claim with no valid source as unknown', () => {
    const noSource: FeatureClaim = { termId: 'ramp', status: 'present' };
    expect(questionsFor(place([noSource]), ['ramp'], today, 'en')[0]?.reason).toBe('unknown');
  });

  it('asks when sources disagree', () => {
    const p = place([claim('ramp', 'present'), claim('ramp', 'absent', '2026-06-01', 'Other source')]);
    expect(questionsFor(p, ['ramp'], today, 'en')[0]?.reason).toBe('conflict');
  });

  it('asks again when the newest source is getting old or old', () => {
    expect(questionsFor(place([claim('ramp', 'present', '2025-03-01')]), ['ramp'], today, 'en')[0]?.reason).toBe('aging');
    expect(questionsFor(place([claim('ramp', 'present', '2023-03-01')]), ['ramp'], today, 'en')[0]?.reason).toBe('old');
  });

  it('keeps the order of the requested features and skips ids with no question', () => {
    const qs = questionsFor(place([]), ['elevator', 'made-up', 'ramp'], today, 'en');
    expect(qs.map((q) => q.termId)).toEqual(['elevator', 'ramp']);
  });

  it('asks in French with correct spacing', () => {
    const qs = questionsFor(place([]), ids, today, 'fr');
    expect(qs).toHaveLength(ids.length);
    for (const q of qs) expect(frenchIssues(q.question)).toEqual([]);
  });
});

describe('renderQuestions', () => {
  it('is empty when there is nothing to ask', () => {
    expect(renderQuestions([], 'en')).toBe('');
  });

  it('is a collapsed list with a count and a reason for each question', () => {
    const html = renderQuestions(questionsFor(place([]), ['ramp', 'elevator'], today, 'en'), 'en');
    expect(html).toContain('<details class="gl-questions"');
    expect(html).toContain('Questions to ask this place (2)');
    expect(html).toContain('data-reason="unknown"');
    expect(html).toContain('Ramp: No information');
  });

  it('escapes the markup of every part', () => {
    const html = renderQuestions(
      [{ termId: 'ramp', term: 'Ra<mp>', question: 'Why <b>?', reason: 'unknown' }],
      'en',
    );
    expect(html).not.toContain('<b>');
    expect(html).toContain('Ra&lt;mp&gt;');
  });

  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = renderQuestions(questionsFor(place([]), ids, today, lang), lang);
      expect(auditHtml(`q.${lang}`, html).filter((f) => f.severity === 'error')).toEqual([]);
    }
  });

  it('uses the French plural-free summary with correct spacing', () => {
    expect(frenchIssues(QUESTION_UI.fr.summary(3))).toEqual([]);
  });
});

describe('questionsToText', () => {
  it('is empty with no questions and a titled list otherwise', () => {
    expect(questionsToText([], 'en')).toEqual([]);
    const lines = questionsToText(questionsFor(place([]), ['ramp'], today, 'en'), 'en');
    expect(lines).toEqual(['Questions to ask:', '- Is there a ramp? How long is it?']);
  });

  it('puts a non-breaking space before the French colon', () => {
    expect(questionsToText(questionsFor(place([]), ['ramp'], today, 'fr'), 'fr')[0]).toBe('Questions à poser :');
  });
});
