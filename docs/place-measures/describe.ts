/**
 * Writes the measured facts as one short description for the map, and as the tags to type.
 * OpenStreetMap has a free-text key for wheelchair details and a yes/no key for a wheelchair
 * toilet. It has no settled keys for step counts and door widths at an entrance, so those go in
 * the description as plain words. UNKNOWN facts are left out and never guessed.
 */
import type { Measures } from './measures.js';
import { formatCm } from './units.js';
import { fill, pick, plural, type PreLang } from '../presubmit/text.js';

/** OpenStreetMap keeps at most 255 characters in a value. */
export const MAX_DESCRIPTION = 255;

function about(measures: Measures, lang: PreLang): string {
  return measures.method === 'estimate' ? pick(lang, 'about ', 'environ ') : '';
}

/** French "large de 80 cm" becomes "large d’environ 80 cm" for an estimate. English has no such join. */
function of(measures: Measures, lang: PreLang): string {
  if (lang !== 'fr') return about(measures, lang);
  return measures.method === 'estimate' ? 'd’environ ' : 'de ';
}

/** One sentence per measured fact, in a fixed order. Empty when nothing was measured. */
export function factSentences(measures: Measures, lang: PreLang): string[] {
  const out: string[] = [];
  const approx = about(measures, lang);
  if (measures.steps !== null) {
    if (measures.steps === 0) out.push(pick(lang, 'No step at the entrance.', 'Aucune marche à l’entrée.'));
    else {
      const steps = plural(lang, measures.steps, pick(lang, 'step', 'marche'), pick(lang, 'steps', 'marches'));
      const head = fill(pick(lang, '{n} {steps} at the entrance', '{n} {steps} à l’entrée'), { n: measures.steps, steps });
      out.push(
        measures.stepHeightCm === null
          ? `${head}.`
          : `${head}, ${fill(pick(lang, 'highest {approx}{height}', 'la plus haute {approx}{height}'), { approx, height: formatCm(measures.stepHeightCm, lang) })}.`,
      );
    }
  } else if (measures.stepHeightCm !== null) {
    out.push(fill(pick(lang, 'Highest step at the entrance {approx}{height}.', 'Marche la plus haute à l’entrée {approx}{height}.'), { approx, height: formatCm(measures.stepHeightCm, lang) }));
  }
  if (measures.ramp !== null) out.push(measures.ramp === 'yes' ? pick(lang, 'There is a ramp.', 'Il y a une rampe.') : pick(lang, 'No ramp.', 'Aucune rampe.'));
  if (measures.doorWidthCm !== null) {
    out.push(fill(pick(lang, 'Entrance door {approx}{width} wide.', 'Porte d’entrée large {of}{width}.'), { approx, of: of(measures, lang), width: formatCm(measures.doorWidthCm, lang) }));
  }
  if (measures.doorOpening !== null) {
    out.push(
      {
        automatic: pick(lang, 'The door opens by itself.', 'La porte s’ouvre toute seule.'),
        button: pick(lang, 'The door opens with a button.', 'La porte s’ouvre avec un bouton.'),
        manual: pick(lang, 'The door is opened by hand.', 'La porte s’ouvre à la main.'),
      }[measures.doorOpening],
    );
  }
  if (measures.toilet !== null) {
    if (measures.toilet === 'no') out.push(pick(lang, 'No wheelchair toilet.', 'Aucune toilette pour fauteuil roulant.'));
    else if (measures.toiletDoorCm === null) out.push(pick(lang, 'There is a wheelchair toilet.', 'Il y a une toilette pour fauteuil roulant.'));
    else {
      out.push(
        fill(pick(lang, 'There is a wheelchair toilet, door {approx}{width} wide.', 'Il y a une toilette pour fauteuil roulant, porte large {of}{width}.'), {
          approx,
          of: of(measures, lang),
          width: formatCm(measures.toiletDoorCm, lang),
        }),
      );
    }
  } else if (measures.toiletDoorCm !== null) {
    out.push(fill(pick(lang, 'Toilet door {approx}{width} wide.', 'Porte de la toilette large {of}{width}.'), { approx, of: of(measures, lang), width: formatCm(measures.toiletDoorCm, lang) }));
  }
  return out;
}

export function methodSentence(measures: Measures, lang: PreLang): string {
  const day = { day: measures.measuredOn };
  if (measures.method === 'tape') return fill(pick(lang, 'Measured with a tape on {day}.', 'Mesuré au ruban le {day}.'), day);
  if (measures.method === 'estimate') return fill(pick(lang, 'Estimated by eye on {day}.', 'Estimé à l’œil le {day}.'), day);
  return fill(pick(lang, 'Noted on {day}.', 'Noté le {day}.'), day);
}

export interface Description {
  text: string;
  length: number;
  /** True when the text is longer than OpenStreetMap keeps. */
  tooLong: boolean;
}

/** The description for the map. Empty when nothing was measured. */
export function describeMeasures(measures: Measures, lang: PreLang): Description {
  const facts = factSentences(measures, lang);
  const text = facts.length === 0 ? '' : [...facts, methodSentence(measures, lang)].join(' ');
  const length = [...text].length;
  return { text, length, tooLong: length > MAX_DESCRIPTION };
}

export interface MeasureTag {
  key: string;
  value: string;
}

/**
 * The tags to type for these measures: the description under the key for its language, and a
 * yes/no for the wheelchair toilet when it was noted. The wheelchair status is never among them.
 */
export function measureTags(measures: Measures, lang: PreLang): MeasureTag[] {
  const out: MeasureTag[] = [];
  const description = describeMeasures(measures, lang);
  if (description.text !== '' && !description.tooLong) out.push({ key: `wheelchair:description:${lang}`, value: description.text });
  if (measures.toilet !== null) out.push({ key: 'toilets:wheelchair', value: measures.toilet });
  return out;
}

export function measureTagText(tags: readonly MeasureTag[]): string {
  return tags.map((tag) => `${tag.key}=${tag.value}`).join('\n');
}
