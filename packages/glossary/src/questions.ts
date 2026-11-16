import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { htmlLang } from './locale';
import { claimFreshness, type Place } from './places';
import { mergeClaims } from './status';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * Questions a person can ask a place about a feature the data cannot answer.
 * They ask for facts about the building. They never say who may use a feature.
 */
const RAW_QUESTIONS: Readonly<Record<string, Readonly<Record<Lang, string>>>> = {
  'step-free-entrance': {
    en: 'Is there an entrance with no steps? Where is it?',
    fr: 'Y a-t-il une entrée sans marche? Où se trouve-t-elle?',
  },
  'automatic-door': {
    en: 'Does the main door open automatically? How do I start it?',
    fr: 'La porte principale s’ouvre-t-elle automatiquement? Comment la faire fonctionner?',
  },
  'clear-door-width': {
    en: 'How wide is the clear opening of the door?',
    fr: 'Quelle est la largeur libre de l’ouverture de la porte?',
  },
  ramp: {
    en: 'Is there a ramp? How long is it?',
    fr: 'Y a-t-il une rampe? Quelle est sa longueur?',
  },
  elevator: {
    en: 'Is there an elevator? Which floors does it reach?',
    fr: 'Y a-t-il un ascenseur? Quels étages dessert-il?',
  },
  'grab-bar': {
    en: 'Are there grab bars in the washroom? Where are they?',
    fr: 'Y a-t-il des barres d’appui dans les toilettes? Où sont-elles?',
  },
  'accessible-washroom': {
    en: 'Is there an accessible washroom? Is it on the same floor as the entrance?',
    fr: 'Y a-t-il une toilette accessible? Est-elle au même étage que l’entrée?',
  },
  'accessible-parking': {
    en: 'Is there accessible parking? How far is it from the entrance?',
    fr: 'Y a-t-il du stationnement accessible? À quelle distance de l’entrée se trouve-t-il?',
  },
};

/** French questions already carry the right spaces before ? and :. */
export const QUESTIONS: Readonly<Record<string, Readonly<Record<Lang, string>>>> = Object.fromEntries(
  Object.entries(RAW_QUESTIONS).map(([id, q]) => [id, { en: q.en, fr: fixFrench(q.fr) }]),
);

export type QuestionReason = 'unknown' | 'conflict' | 'old' | 'aging';

export interface PlaceQuestion {
  readonly termId: string;
  readonly term: string;
  readonly question: string;
  readonly reason: QuestionReason;
}

export const QUESTION_UI = {
  en: {
    summary: (n: number): string => `Questions to ask this place (${n})`,
    reason: {
      unknown: 'No information',
      conflict: 'Sources disagree',
      old: 'Information is old',
      aging: 'Information is getting old',
    },
    title: 'Questions to ask',
  },
  fr: {
    summary: (n: number): string => `Questions à poser à ce lieu (${n})`,
    reason: {
      unknown: 'Aucune information',
      conflict: 'Les sources ne concordent pas',
      old: 'L’information est ancienne',
      aging: 'L’information commence à dater',
    },
    title: 'Questions à poser',
  },
} as const;

/**
 * Features where the data gives no answer, the sources disagree, or the answer is old.
 * Features with a recent, sourced answer need no question. Order follows `termIds`.
 */
export function questionsFor(
  place: Place,
  termIds: readonly string[],
  today: string,
  lang: Lang,
): readonly PlaceQuestion[] {
  const out: PlaceQuestion[] = [];
  for (const claim of mergeClaims(termIds, place.claims)) {
    const q = QUESTIONS[claim.termId]?.[lang];
    if (q === undefined) continue;
    let reason: QuestionReason | null = null;
    if (claim.conflict) reason = 'conflict';
    else if (claim.status === 'unknown') reason = 'unknown';
    else {
      const f = claimFreshness(claim, today);
      if (f === 'old' || f === 'aging') reason = f;
    }
    if (reason === null) continue;
    out.push({
      termId: claim.termId,
      term: lookupTerm(claim.termId, lang).term,
      question: lang === 'fr' ? fixFrench(q) : q,
      reason,
    });
  }
  return out;
}

export function reasonText(reason: QuestionReason, lang: Lang): string {
  return QUESTION_UI[lang].reason[reason];
}

/** A collapsed list. Empty string when there is nothing to ask. */
export function renderQuestions(questions: readonly PlaceQuestion[], lang: Lang): string {
  if (questions.length === 0) return '';
  const items = questions
    .map(
      (q) =>
        `<li data-reason="${q.reason}">${escapeHtml(q.question)}` +
        `<span class="gl-note">${escapeHtml(lang === 'fr' ? fixFrench(`${q.term} : ${reasonText(q.reason, lang)}`) : `${q.term}: ${reasonText(q.reason, lang)}`)}</span></li>`,
    )
    .join('');
  const summary = QUESTION_UI[lang].summary(questions.length);
  return (
    `<details class="gl-questions" lang="${htmlLang(lang)}"><summary>${escapeHtml(lang === 'fr' ? fixFrench(summary) : summary)}</summary>` +
    `<ul class="gl-features">${items}</ul></details>`
  );
}

export function questionsToText(questions: readonly PlaceQuestion[], lang: Lang): string[] {
  if (questions.length === 0) return [];
  return [QUESTION_UI[lang].title + (lang === 'fr' ? ' :' : ':'), ...questions.map((q) => `- ${q.question}`)];
}

