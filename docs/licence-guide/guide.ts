/** Puts the guide together for a set of records: the mix, its duties, the credits and a text file. */
import { creditBlock, withoutSource } from './credit.js';
import { allLicenceFacts, notAdviceText, type LicenceFacts } from './facts.js';
import { dutyText, mixExplanation, mixLabel, mixSummaryText, osmNoteText } from './messages.js';
import { mixOf, type LicensedRecord, type Mix } from './mix.js';
import { licenceQuestions, type Question } from './questions.js';
import { pick, type PreLang } from '../presubmit/text.js';

export interface LicenceGuide {
  mix: Mix;
  label: string;
  explanation: string;
  summary: string;
  duties: string[];
  credits: string;
  /** Records that cannot be credited because their source is empty. */
  missingSource: number;
  facts: LicenceFacts[];
  questions: Question[];
  notAdvice: string;
  osmNote: string;
}

export function buildLicenceGuide(records: readonly LicensedRecord[], lang: PreLang): LicenceGuide {
  const mix = mixOf(records);
  return {
    mix,
    label: mixLabel(mix.kind, lang),
    explanation: mixExplanation(mix.kind, lang),
    summary: mixSummaryText(mix, lang),
    duties: mix.duties.map((duty) => dutyText(duty, lang)),
    credits: creditBlock(records, lang),
    missingSource: withoutSource(records).length,
    facts: allLicenceFacts(lang),
    questions: licenceQuestions(lang),
    notAdvice: notAdviceText(lang),
    osmNote: osmNoteText(lang),
  };
}

export function guideText(guide: LicenceGuide, today: string, lang: PreLang): string {
  const lines: string[] = [pick(lang, `Licences for these records, ${today}`, `Licences de ces fiches, ${today}`), guide.notAdvice, '', guide.label, guide.summary, guide.explanation];
  for (const duty of guide.duties) lines.push(`- ${duty}`);
  if (guide.credits !== '') lines.push('', guide.credits);
  lines.push('', guide.osmNote);
  return `${lines.join('\n')}\n`;
}

export function guideFilename(today: string): string {
  return `licences-${today}.txt`;
}
