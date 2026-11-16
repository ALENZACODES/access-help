import { describe, expect, it } from 'vitest';
import {
  CLOSED_TOUR,
  TOUR_IDS,
  TOUR_STEPS,
  TOUR_UI,
  auditHtml,
  closeTour,
  frenchIssues,
  isLastStep,
  lintClaims,
  lintCopy,
  nextStep,
  plainLanguageIssues,
  prevStep,
  readabilityIssues,
  renderTour,
  renderTourButton,
  startTour,
  stepHeading,
  type Lang,
  type TourState,
} from './index';

const at = (index: number): TourState => ({ open: true, index });

describe('the tour state', () => {
  it('starts at the first step and closes', () => {
    expect(startTour()).toEqual({ open: true, index: 0 });
    expect(closeTour()).toEqual(CLOSED_TOUR);
  });
  it('moves on one step at a time', () => {
    expect(nextStep(at(0))).toEqual(at(1));
    expect(nextStep(at(3))).toEqual(at(4));
  });
  it('finishes after the last step', () => {
    expect(isLastStep(at(TOUR_STEPS.length - 1))).toBe(true);
    expect(nextStep(at(TOUR_STEPS.length - 1))).toEqual(CLOSED_TOUR);
  });
  it('goes back and stops at the first step', () => {
    expect(prevStep(at(2))).toEqual(at(1));
    expect(prevStep(at(0))).toEqual(at(0));
  });
  it('stays closed when closed', () => {
    expect(nextStep(CLOSED_TOUR)).toBe(CLOSED_TOUR);
    expect(prevStep(CLOSED_TOUR)).toBe(CLOSED_TOUR);
  });
  it('visits every step exactly once from start to finish', () => {
    let s = startTour();
    const seen: number[] = [];
    while (s.open) {
      seen.push(s.index);
      s = nextStep(s);
    }
    expect(seen).toEqual(TOUR_STEPS.map((_, i) => i));
  });
});

describe('TOUR_UI', () => {
  it('has copy for every step in both languages', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      for (const step of TOUR_STEPS) {
        const copy = TOUR_UI[lang].steps[step.id as keyof typeof TOUR_UI.en.steps];
        expect(copy.title.length, `${lang} ${step.id}`).toBeGreaterThan(0);
        expect(copy.body.length, `${lang} ${step.id}`).toBeGreaterThan(0);
      }
    }
  });
  it('uses plain language: short sentences, easy words', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      for (const step of TOUR_STEPS) {
        const body = TOUR_UI[lang].steps[step.id as keyof typeof TOUR_UI.en.steps].body;
        expect(plainLanguageIssues(body), `${lang} ${step.id}`).toEqual([]);
        expect(readabilityIssues(body, lang), `${lang} ${step.id}`).toEqual([]);
        expect(lintCopy(body)).toEqual([]);
        expect(lintClaims(body)).toEqual([]);
      }
    }
  });
  it('is clean French', () => {
    for (const step of TOUR_STEPS) expect(frenchIssues(TOUR_UI.fr.steps[step.id as keyof typeof TOUR_UI.fr.steps].body)).toEqual([]);
  });
});

describe('stepHeading', () => {
  it('says which step and how many', () => {
    expect(stepHeading(at(1), 'en')).toBe('Step 2 of 5: Search by name');
    expect(stepHeading(at(0), 'fr')).toMatch(/^Étape 1 sur 5[  ]: Choisir/);
  });
  it('is clean French for every step', () => {
    for (let i = 0; i < TOUR_STEPS.length; i += 1) expect(frenchIssues(stepHeading(at(i), 'fr'))).toEqual([]);
  });
});

describe('renderTour', () => {
  it('is empty when closed', () => {
    expect(renderTour(CLOSED_TOUR, 'en')).toBe('');
  });
  it('is empty for a step that does not exist', () => {
    expect(renderTour(at(99), 'en')).toBe('');
  });
  it.each(['en', 'fr'] as Lang[])('is a labelled section in %s, valid on every step', (lang) => {
    for (let i = 0; i < TOUR_STEPS.length; i += 1) {
      const html = renderTour(at(i), lang);
      expect(html).toContain(`aria-labelledby="${TOUR_IDS.title}"`);
      expect(html).toContain(`id="${TOUR_IDS.title}" tabindex="-1"`);
      expect(html).toContain(`id="${TOUR_IDS.close}"`);
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, `tour.${i}`)).toEqual([]);
    }
  });
  it('has no Previous button on the first step', () => {
    expect(renderTour(at(0), 'en')).not.toContain(TOUR_IDS.prev);
    expect(renderTour(at(1), 'en')).toContain(TOUR_IDS.prev);
  });
  it('says Finish on the last step and Next before it', () => {
    expect(renderTour(at(TOUR_STEPS.length - 1), 'en')).toContain(`>${TOUR_UI.en.done}<`);
    expect(renderTour(at(0), 'en')).toContain(`>${TOUR_UI.en.next}<`);
  });
  it('has an open button', () => {
    const html = renderTourButton('fr');
    expect(html).toContain(`id="${TOUR_IDS.open}"`);
    expect(html).toContain(TOUR_UI.fr.open);
  });
});
