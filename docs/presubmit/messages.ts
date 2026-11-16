/** Words for the findings, counts and notes. Every string exists in English and French. */
import type { Counts } from './batch.js';
import type { Finding, FindingCode, Severity } from './rules.js';
import { MAX_TAG_VALUE, MIN_DECIMALS, NEAR_METRES, OLD_AFTER_DAYS } from './rules.js';
import { colon, fill, formatMetres, pick, plural, type PreLang } from './text.js';

export function severityLabel(severity: Severity | 'clear', lang: PreLang): string {
  switch (severity) {
    case 'fix':
      return pick(lang, 'Fix before you copy', 'À corriger avant de copier');
    case 'look':
      return pick(lang, 'Take a second look', 'À revoir');
    case 'note':
      return pick(lang, 'Good to know', 'Bon à savoir');
    case 'clear':
      return pick(lang, 'Nothing to look at', 'Rien à revoir');
  }
}

export function findingText(finding: Finding, lang: PreLang): string {
  const code: FindingCode = finding.code;
  switch (code) {
    case 'date-invalid':
      return pick(lang, 'The date is not a real day. Use YYYY-MM-DD.', 'La date n’est pas un vrai jour. Utilisez AAAA-MM-JJ.');
    case 'date-future':
      return fill(
        pick(lang, 'The date is {days} days after today.', 'La date est {days} jours après aujourd’hui.'),
        { days: finding.days ?? 0 },
      );
    case 'source-empty':
      return pick(lang, 'No source is written. Say how you know this.', 'Aucune source n’est écrite. Dites comment vous le savez.');
    case 'licence-not-open':
      return pick(lang, 'The licence is not CC0-1.0 or ODbL-1.0.', 'La licence n’est ni CC0-1.0 ni ODbL-1.0.');
    case 'name-too-long':
      return fill(
        pick(lang, 'The name is longer than {max} characters.', 'Le nom compte plus de {max} caractères.'),
        { max: MAX_TAG_VALUE },
      );
    case 'outside-ontario':
      return pick(
        lang,
        'The coordinates are outside a rough box around Ontario. Check latitude and longitude.',
        'Les coordonnées sont hors d’un cadre approximatif autour de l’Ontario. Vérifiez la latitude et la longitude.',
      );
    case 'low-precision':
      return fill(
        pick(
          lang,
          'The coordinates have {digits} decimals. {min} or more place a point to about a metre.',
          'Les coordonnées ont {digits} décimales. {min} ou plus placent un point à environ un mètre.',
        ),
        { digits: finding.digits ?? 0, min: MIN_DECIMALS },
      );
    case 'old-observation': {
      const days = finding.days ?? OLD_AFTER_DAYS;
      return fill(
        pick(lang, 'You saw this {days} days ago. Things change, so look again if you can.', 'Vous l’avez vu il y a {days} jours. Les choses changent, revoyez-le si vous le pouvez.'),
        { days },
      );
    }
    case 'name-shouting':
      return pick(lang, 'The name is all capitals. Write it as it appears on the sign.', 'Le nom est tout en majuscules. Écrivez-le comme sur l’enseigne.');
    case 'name-spacing':
      return pick(lang, 'The name has extra spaces. They are removed from the tag.', 'Le nom a des espaces en trop. Ils sont retirés de l’étiquette.');
    case 'name-contact':
      return pick(lang, 'The name looks like it has a web address, email or phone number. A name tag holds only the name.', 'Le nom semble contenir une adresse web, un courriel ou un numéro de téléphone. Une étiquette de nom ne contient que le nom.');
    case 'near-other':
      return fill(
        pick(lang, 'Another saved place is {distance} away ({other}). Is it the same place?', 'Un autre lieu enregistré est à {distance} ({other}). Est-ce le même lieu\u202f?'),
        { distance: formatMetres(finding.metres ?? NEAR_METRES, lang), other: finding.other ?? '' },
      );
    case 'name-missing':
      return pick(lang, 'No name saved. No name tag will be listed.', 'Aucun nom enregistré. Aucune étiquette de nom ne sera listée.');
    case 'status-unknown':
      return pick(lang, 'The status is UNKNOWN. No wheelchair tag will be listed.', 'L’état est UNKNOWN. Aucune étiquette wheelchair ne sera listée.');
  }
}

export function summaryText(counts: Counts, lang: PreLang): string {
  if (counts.total === 0) return pick(lang, 'You have no saved observations to check.', 'Vous n’avez aucune observation enregistrée à examiner.');
  const places = plural(lang, counts.total, pick(lang, 'place', 'lieu'), pick(lang, 'places', 'lieux'));
  const head = fill(pick(lang, '{total} saved {places}.', '{total} {places} enregistrés.'), { total: counts.total, places });
  const parts = [
    fill(pick(lang, '{n} to fix', '{n} à corriger'), { n: counts.fix }),
    fill(pick(lang, '{n} to look at again', '{n} à revoir'), { n: counts.look }),
    fill(pick(lang, '{n} with nothing to look at', '{n} sans rien à revoir'), { n: counts.clear + counts.note }),
  ];
  const tail = pick(
    lang,
    'These checks look for slips only. They do not say the map will take an edit.',
    'Ces vérifications ne cherchent que des oublis. Elles ne disent pas que la carte acceptera une modification.',
  );
  return `${head} ${parts.join(', ')}. ${tail}`;
}

export function licenceLine(licence: string, count: number, lang: PreLang): string {
  const places = plural(lang, count, pick(lang, 'place', 'lieu'), pick(lang, 'places', 'lieux'));
  return `${licence}${colon(lang)}${count} ${places}`;
}
